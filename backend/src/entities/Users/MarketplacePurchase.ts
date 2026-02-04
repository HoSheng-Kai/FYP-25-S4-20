import pool from "../../schema/database";

export type PurchaseStatus =
  | "pending_seller"
  | "rejected"
  | "accepted_waiting_payment"
  | "paid_pending_transfer"
  | "completed"
  | "cancelled";

export type PurchaseRequestRow = {
  request_id: number;
  product_id: number;
  listing_id: number | null;
  seller_id: number;
  buyer_id: number;
  offered_price: string; // NUMERIC comes back as string
  offered_currency: string; // 'SGD' | 'USD' | 'EUR'
  status: PurchaseStatus;
  payment_tx_hash: string | null;
  transfer_pda: string | null;
  product_pda: string | null;
  created_on: Date;
  updated_on: Date;
};

export type PurchaseDetails = PurchaseRequestRow & {
  serial_no: string;
  model: string | null;
  seller_username: string;
  buyer_username: string;
};

export class MarketplacePurchase {
  // ======================================================
  // Helpers
  // ======================================================
  static async getRequestById(requestId: number): Promise<PurchaseRequestRow | null> {
    const r = await pool.query(
      `SELECT * FROM fyp_25_s4_20.purchase_request WHERE request_id = $1`,
      [requestId]
    );
    return (r.rows[0] as PurchaseRequestRow) ?? null;
  }

  static async hasActiveRequest(productId: number): Promise<boolean> {
    const r = await pool.query(
      `
      SELECT 1
      FROM fyp_25_s4_20.purchase_request
      WHERE product_id = $1
        AND status IN ('pending_seller','accepted_waiting_payment','paid_pending_transfer')
      LIMIT 1;
      `,
      [productId]
    );
    return r.rowCount > 0;
  }

  // ======================================================
  // 1) Buyer proposes purchase for a listing
  // - listing must be available
  // - buyer cannot be seller
  // - seller must be current owner
  // - reserve listing
  // - create purchase_request pending_seller
  // ======================================================
  static async propose(args: {
    listingId: number;
    buyerId: number;
    // optional: allow negotiating
    offeredPrice?: number;
    offeredCurrency?: string;
  }): Promise<PurchaseDetails> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Lock listing row
      const listingRes = await client.query(
        `
        SELECT
          pl.listing_id, pl.product_id, pl.seller_id,
          pl.price, pl.currency::text AS currency, pl.status::text AS status
        FROM fyp_25_s4_20.product_listing pl
        WHERE pl.listing_id = $1
        FOR UPDATE;
        `,
        [args.listingId]
      );

      if (listingRes.rows.length === 0) throw new Error("Listing not found");

      const listing = listingRes.rows[0] as {
        listing_id: number;
        product_id: number;
        seller_id: number;
        price: string | null;
        currency: string | null;
        status: string;
      };

      if (listing.status !== "available") throw new Error("Listing is not available");
      if (listing.seller_id === args.buyerId) throw new Error("Buyer cannot be the seller");

      // Product checks
      const productRes = await client.query(
        `
        SELECT product_id, serial_no, model, track
        FROM fyp_25_s4_20.product
        WHERE product_id = $1;
        `,
        [listing.product_id]
      );

      if (productRes.rows.length === 0) throw new Error("Product not found");
      const product = productRes.rows[0] as {
        product_id: number;
        serial_no: string;
        model: string | null;
        track: boolean;
      };
      if (product.track === false) throw new Error("Product is not tracked. Purchase not allowed.");

      // Seller must be current owner
      const ownRes = await client.query(
        `
        SELECT owner_id
        FROM fyp_25_s4_20.ownership
        WHERE product_id = $1 AND end_on IS NULL
        LIMIT 1;
        `,
        [listing.product_id]
      );

      if (ownRes.rows.length > 0) {
        const currentOwnerId = ownRes.rows[0].owner_id as number;
        if (currentOwnerId !== listing.seller_id) {
          throw new Error("Seller is not the current owner of this product");
        }
      } else {
        // If no ownership record exists, you can decide what to do.
        // Most marketplace flows require ownership record.
        // We'll allow (consistent with your listing code), but you can tighten it:
        // throw new Error("No ownership record for this product");
      }

      // One active request per product
      const activeReq = await client.query(
        `
        SELECT 1
        FROM fyp_25_s4_20.purchase_request
        WHERE product_id = $1
          AND status IN ('pending_seller','accepted_waiting_payment','paid_pending_transfer')
        LIMIT 1
        FOR UPDATE;
        `,
        [listing.product_id]
      );
      if (activeReq.rowCount > 0) throw new Error("Product already has an active purchase request");

      // Determine offered price/currency
      const price =
        typeof args.offeredPrice === "number" ? args.offeredPrice : Number(listing.price);
      const currency = args.offeredCurrency ?? listing.currency;

      if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid offered price");
      if (!currency) throw new Error("Missing currency");

      // Create request
      const ins = await client.query(
        `
        INSERT INTO fyp_25_s4_20.purchase_request
          (product_id, listing_id, seller_id, buyer_id, offered_price, offered_currency, status)
        VALUES
          ($1, $2, $3, $4, $5, $6::fyp_25_s4_20.currency, 'pending_seller')
        RETURNING *;
        `,
        [listing.product_id, listing.listing_id, listing.seller_id, args.buyerId, price, currency]
      );

      // Reserve listing
      await client.query(
        `
        UPDATE fyp_25_s4_20.product_listing
        SET status = 'reserved'
        WHERE listing_id = $1;
        `,
        [listing.listing_id]
      );

      // usernames
      const users = await client.query(
        `
        SELECT user_id, username
        FROM fyp_25_s4_20.users
        WHERE user_id IN ($1, $2);
        `,
        [listing.seller_id, args.buyerId]
      );

      const sellerUsername = users.rows.find((u: any) => u.user_id === listing.seller_id)?.username ?? "";
      const buyerUsername = users.rows.find((u: any) => u.user_id === args.buyerId)?.username ?? "";

      await client.query("COMMIT");

      return {
        ...(ins.rows[0] as PurchaseRequestRow),
        serial_no: product.serial_no,
        model: product.model,
        seller_username: sellerUsername,
        buyer_username: buyerUsername,
      };
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      throw err;
    } finally {
      client.release();
    }
  }

  // ======================================================
  // 2) Seller accepts / rejects
  // ======================================================
  static async accept(args: {
    requestId: number;
    sellerId: number;
    transferPda?: string | null;
    productPda?: string | null;
  }): Promise<PurchaseRequestRow> {
    const pr = await this.getRequestById(args.requestId);
    if (!pr) throw new Error("Request not found");
    if (pr.seller_id !== args.sellerId) throw new Error("Not seller for this request");
    if (pr.status !== "pending_seller") throw new Error(`Invalid status: ${pr.status}`);

    // seller must still own
    const own = await pool.query(
      `
      SELECT owner_id
      FROM fyp_25_s4_20.ownership
      WHERE product_id = $1 AND end_on IS NULL
      LIMIT 1;
      `,
      [pr.product_id]
    );
    if (own.rows.length > 0 && own.rows[0].owner_id !== args.sellerId) {
      throw new Error("Seller is no longer the current owner");
    }

    const r = await pool.query(
      `
      UPDATE fyp_25_s4_20.purchase_request
      SET status = 'accepted_waiting_payment',
          transfer_pda = COALESCE($2, transfer_pda),
          product_pda = COALESCE($3, product_pda),
          updated_on = NOW()
      WHERE request_id = $1
      RETURNING *;
      `,
      [args.requestId, args.transferPda ?? null, args.productPda ?? null]
    );

    return r.rows[0] as PurchaseRequestRow;
  }

  static async reject(args: { requestId: number; sellerId: number; reason?: string }): Promise<PurchaseRequestRow> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const prRes = await client.query(
        `SELECT * FROM fyp_25_s4_20.purchase_request WHERE request_id = $1 FOR UPDATE`,
        [args.requestId]
      );
      if (prRes.rows.length === 0) throw new Error("Request not found");
      const pr = prRes.rows[0] as PurchaseRequestRow;

      if (pr.seller_id !== args.sellerId) throw new Error("Not seller for this request");
      if (pr.status !== "pending_seller") throw new Error(`Invalid status: ${pr.status}`);

      const updated = await client.query(
        `
        UPDATE fyp_25_s4_20.purchase_request
        SET status = 'rejected', updated_on = NOW()
        WHERE request_id = $1
        RETURNING *;
        `,
        [args.requestId]
      );

      // release listing back to available (only if it was reserved by this request)
      if (pr.listing_id) {
        await client.query(
          `
          UPDATE fyp_25_s4_20.product_listing
          SET status = 'available'
          WHERE listing_id = $1 AND status = 'reserved';
          `,
          [pr.listing_id]
        );
      }

      await client.query("COMMIT");
      return updated.rows[0] as PurchaseRequestRow;
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      throw err;
    } finally {
      client.release();
    }
  }

  // ======================================================
  // 3) Buyer pays: store payment tx hash
  // ======================================================
  static async pay(args: { requestId: number; buyerId: number; paymentTxHash: string }): Promise<PurchaseRequestRow> {
    const pr = await this.getRequestById(args.requestId);
    if (!pr) throw new Error("Request not found");
    if (pr.buyer_id !== args.buyerId) throw new Error("Not buyer for this request");
    if (pr.status !== "accepted_waiting_payment") throw new Error(`Invalid status: ${pr.status}`);

    const r = await pool.query(
      `
      UPDATE fyp_25_s4_20.purchase_request
      SET status = 'paid_pending_transfer',
          payment_tx_hash = $2,
          updated_on = NOW()
      WHERE request_id = $1
      RETURNING *;
      `,
      [args.requestId, args.paymentTxHash]
    );

    return r.rows[0] as PurchaseRequestRow;
  }

  // ======================================================
  // 3b) Buyer accepts on-chain (no payment step)
  // ======================================================
  static async buyerAccept(args: { requestId: number; buyerId: number }): Promise<PurchaseRequestRow> {
    const pr = await this.getRequestById(args.requestId);
    if (!pr) throw new Error("Request not found");
    if (pr.buyer_id !== args.buyerId) throw new Error("Not buyer for this request");
    if (pr.status !== "accepted_waiting_payment") throw new Error(`Invalid status: ${pr.status}`);

    const r = await pool.query(
      `
      UPDATE fyp_25_s4_20.purchase_request
      SET status = 'paid_pending_transfer',
          updated_on = NOW()
      WHERE request_id = $1
      RETURNING *;
      `,
      [args.requestId]
    );

    return r.rows[0] as PurchaseRequestRow;
  }

  // ======================================================
  // 3c) Buyer cancels request
  // ======================================================
  static async buyerCancel(args: { requestId: number; buyerId: number; reason?: string }): Promise<PurchaseRequestRow> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const prRes = await client.query(
        `SELECT * FROM fyp_25_s4_20.purchase_request WHERE request_id = $1 FOR UPDATE`,
        [args.requestId]
      );
      if (prRes.rows.length === 0) throw new Error("Request not found");
      const pr = prRes.rows[0] as PurchaseRequestRow;

      if (pr.buyer_id !== args.buyerId) throw new Error("Not buyer for this request");
      if (pr.status !== "pending_seller" && pr.status !== "accepted_waiting_payment") {
        throw new Error(`Invalid status: ${pr.status}`);
      }

      const updated = await client.query(
        `
        UPDATE fyp_25_s4_20.purchase_request
        SET status = 'cancelled', updated_on = NOW()
        WHERE request_id = $1
        RETURNING *;
        `,
        [args.requestId]
      );

      // release listing back to available (only if it was reserved by this request)
      if (pr.listing_id) {
        await client.query(
          `
          UPDATE fyp_25_s4_20.product_listing
          SET status = 'available'
          WHERE listing_id = $1 AND status = 'reserved';
          `,
          [pr.listing_id]
        );
      }

      await client.query("COMMIT");
      return updated.rows[0] as PurchaseRequestRow;
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      throw err;
    } finally {
      client.release();
    }
  }

  // ======================================================
  // 4) Finalize transfer:
  // - close seller ownership row
  // - insert buyer ownership row with transferTxHash
  // - request completed
  // - listing sold
  // ======================================================
  static async finalize(args: {
    requestId: number;
    sellerId: number;
    transferTxHash: string;
  }): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const prRes = await client.query(
        `SELECT * FROM fyp_25_s4_20.purchase_request WHERE request_id = $1 FOR UPDATE`,
        [args.requestId]
      );
      if (prRes.rows.length === 0) throw new Error("Request not found");
      const pr = prRes.rows[0] as PurchaseRequestRow;

      if (pr.seller_id !== args.sellerId) throw new Error("Not seller for this request");
      if (pr.status !== "paid_pending_transfer" && pr.status !== "accepted_waiting_payment") {
        throw new Error(`Invalid status: ${pr.status}`);
      }

      // seller must still be current owner
      const ownerRes = await client.query(
        `
        SELECT owner_id
        FROM fyp_25_s4_20.ownership
        WHERE product_id = $1 AND end_on IS NULL
        LIMIT 1
        FOR UPDATE;
        `,
        [pr.product_id]
      );
      if (ownerRes.rows.length > 0 && ownerRes.rows[0].owner_id !== args.sellerId) {
        throw new Error("Seller is no longer the current owner");
      }

      // seller public key (needed for blockchain_node)
      const sellerRes = await client.query(
        `SELECT public_key FROM fyp_25_s4_20.users WHERE user_id = $1`,
        [pr.seller_id]
      );
      const sellerPub = sellerRes.rows[0]?.public_key as string | undefined;
      if (!sellerPub) throw new Error("Seller missing public key");

      // buyer public key (needed for ownership + blockchain_node)
      const buyerRes = await client.query(
        `SELECT public_key FROM fyp_25_s4_20.users WHERE user_id = $1`,
        [pr.buyer_id]
      );
      const buyerPub = buyerRes.rows[0]?.public_key as string | undefined;
      if (!buyerPub) throw new Error("Buyer missing public key");

      // ✅ Ensure blockchain_node row exists for transferTxHash
      // If you already created it elsewhere, this will do nothing.
      await client.query(
        `
        INSERT INTO fyp_25_s4_20.blockchain_node
          (tx_hash, prev_tx_hash, from_user_id, from_public_key,
          to_user_id, to_public_key, product_id, block_slot, created_on, event)
        VALUES
          ($1, NULL, $2, $3, $4, $5, $6, $7, NOW(), 'TRANSFER')
        ON CONFLICT (tx_hash) DO NOTHING;
        `,
        [
          args.transferTxHash,
          pr.seller_id,
          sellerPub,
          pr.buyer_id,
          buyerPub,
          pr.product_id,
          Date.now() // use as dummy block_slot for now
        ]
      );

      // close current ownership
      await client.query(
        `
        UPDATE fyp_25_s4_20.ownership
        SET end_on = NOW()
        WHERE product_id = $1 AND end_on IS NULL;
        `,
        [pr.product_id]
      );

      // insert new ownership (FK now satisfied because blockchain_node exists)
      await client.query(
        `
        INSERT INTO fyp_25_s4_20.ownership
          (owner_id, owner_public_key, product_id, start_on, tx_hash)
        VALUES
          ($1, $2, $3, NOW(), $4);
        `,
        [pr.buyer_id, buyerPub, pr.product_id, args.transferTxHash]
      );

      // mark request completed + store transfer tx
      // (only works if you added transfer_tx_hash column; otherwise remove it)
      await client.query(
        `
        UPDATE fyp_25_s4_20.purchase_request
        SET status = 'completed',
            transfer_tx_hash = $2,
            updated_on = NOW()
        WHERE request_id = $1;
        `,
        [args.requestId, args.transferTxHash]
      );

      // mark listing sold
      if (pr.listing_id) {
        await client.query(
          `
          UPDATE fyp_25_s4_20.product_listing
          SET status = 'sold'
          WHERE listing_id = $1;
          `,
          [pr.listing_id]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      throw err;
    } finally {
      client.release();
    }
  }

  // ======================================================
  // Optional: list requests for buyer/seller UI
  // ======================================================
  static async findForBuyer(buyerId: number): Promise<PurchaseDetails[]> {
    const r = await pool.query(
      `
      SELECT
        pr.*,
        p.serial_no,
        p.model,
        us.username AS seller_username,
        ub.username AS buyer_username
      FROM fyp_25_s4_20.purchase_request pr
      JOIN fyp_25_s4_20.product p ON p.product_id = pr.product_id
      JOIN fyp_25_s4_20.users us ON us.user_id = pr.seller_id
      JOIN fyp_25_s4_20.users ub ON ub.user_id = pr.buyer_id
      WHERE pr.buyer_id = $1
      ORDER BY pr.created_on DESC;
      `,
      [buyerId]
    );
    return r.rows as PurchaseDetails[];
  }

  static async findForSeller(sellerId: number): Promise<PurchaseDetails[]> {
    const r = await pool.query(
      `
      SELECT
        pr.*,
        p.serial_no,
        p.model,
        us.username AS seller_username,
        ub.username AS buyer_username
      FROM fyp_25_s4_20.purchase_request pr
      JOIN fyp_25_s4_20.product p ON p.product_id = pr.product_id
      JOIN fyp_25_s4_20.users us ON us.user_id = pr.seller_id
      JOIN fyp_25_s4_20.users ub ON ub.user_id = pr.buyer_id
      WHERE pr.seller_id = $1
      ORDER BY pr.created_on DESC;
      `,
      [sellerId]
    );
    return r.rows as PurchaseDetails[];
  }
}
