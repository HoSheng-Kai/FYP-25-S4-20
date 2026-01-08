import pool from '../../schema/database';

export type ListingStatus = 'available' | 'reserved' | 'sold';

export interface ListingForEdit {
  listing_id: number;
  product_id: number;
  serial_no: string;
  model: string | null;
  price: string | null;     // NUMERIC(10,2) comes back as string
  currency: string | null;  // enum 'SGD' | 'USD' | 'EUR'
  status: ListingStatus;
  created_on: Date;
}

export interface UpdateListingInput {
  listingId: number;
  userId: number;
  price?: number;
  currency?: string;
  status?: ListingStatus;
}

export interface ListingRow {
  listing_id: number;
  product_id: number;
  serial_no: string;
  model: string | null;
  price: string | null;
  currency: string | null;
  status: ListingStatus;
  created_on: Date; // you can treat this as updatedOn if you don't add updated_on column
}

export class ConsumerProductListing {

  // ======================================================
  // Load a listing for editing, enforcing:
  //  - user is the seller
  //  - user is CURRENT owner (ownership.end_on IS NULL)
  // ======================================================
  static async getListingForUser(
  listingId: number,
  userId: number
  ): Promise<ListingForEdit> {
    const client = await pool.connect();
    try {
      // 1) Listing + product
      const listingRes = await client.query(
        `
        SELECT
          pl.listing_id,
          pl.product_id,
          pl.seller_id,
          pl.price,
          pl.currency,
          pl.status,
          pl.created_on,
          p.serial_no,
          p.model
        FROM fyp_25_s4_20.product_listing pl
        JOIN fyp_25_s4_20.product p
          ON pl.product_id = p.product_id
        WHERE pl.listing_id = $1;
        `,
        [listingId]
      );

      if (listingRes.rows.length === 0) {
        throw new Error('Listing not found');
      }

      const row = listingRes.rows[0];

      // 2) Check seller is the same user
      if (row.seller_id !== userId) {
        throw new Error('You are not the seller of this listing');
      }

      // 3) Check current ownership IF ownership data exists
      const ownershipRes = await client.query(
        `
        SELECT owner_id
        FROM fyp_25_s4_20.ownership o
        WHERE o.product_id = $1
          AND o.end_on IS NULL
        LIMIT 1;
        `,
        [row.product_id]
      );

      // If there IS an active owner recorded, enforce that it's this user
      if (ownershipRes.rows.length > 0) {
        const currentOwnerId = ownershipRes.rows[0].owner_id;
        if (currentOwnerId !== userId) {
          throw new Error('You no longer own this product and cannot modify its listing');
        }
      }
      // If there is NO ownership record yet, we allow the seller to manage the listing

      return {
        listing_id: row.listing_id,
        product_id: row.product_id,
        serial_no: row.serial_no,
        model: row.model,
        price: row.price,
        currency: row.currency,
        status: row.status,
        created_on: row.created_on,
      };
    } finally {
      client.release();
    }
  }

  // ======================================================
  // CREATE a new listing for a product, enforcing:
  //  - user is CURRENT owner (ownership.end_on IS NULL) if ownership exists
  //  - user becomes seller_id
  //  - prevent duplicate active listing (latest listing is available/reserved)
  // ======================================================
  static async createListingForUser(args: {
    productId: number;
    userId: number;
    price: number;
    currency: string; // 'SGD' | 'USD' | 'EUR'
    status?: ListingStatus; // default 'available'
    notes?: string | null;  // optional notes
  }): Promise<ListingRow> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const status: ListingStatus = args.status ?? "available";
      const notes = args.notes ?? null;

      // 1) Ensure product exists
      const prodRes = await client.query(
        `
        SELECT product_id, serial_no, model
        FROM fyp_25_s4_20.product
        WHERE product_id = $1
        FOR UPDATE;
        `,
        [args.productId]
      );

      if (prodRes.rows.length === 0) {
        throw new Error("Product not found");
      }

      // 2) Ownership enforcement IF ownership exists
      const ownershipRes = await client.query(
        `
        SELECT owner_id
        FROM fyp_25_s4_20.ownership
        WHERE product_id = $1
          AND end_on IS NULL
        LIMIT 1;
        `,
        [args.productId]
      );

      if (ownershipRes.rows.length > 0) {
        const currentOwnerId = ownershipRes.rows[0].owner_id;
        if (currentOwnerId !== args.userId) {
          throw new Error("You do not own this product and cannot list it");
        }
      }

      // 3) Prevent duplicate active listing
      const latestListing = await client.query(
        `
        SELECT status
        FROM fyp_25_s4_20.product_listing
        WHERE product_id = $1
        ORDER BY created_on DESC
        LIMIT 1;
        `,
        [args.productId]
      );

      if (latestListing.rows.length > 0) {
        const latestStatus = latestListing.rows[0].status as ListingStatus;
        if (latestStatus === "available" || latestStatus === "reserved") {
          throw new Error("Active listing already exists for this product");
        }
      }

      // 4) Insert new listing
      const ins = await client.query(
        `
        INSERT INTO fyp_25_s4_20.product_listing
          (product_id, seller_id, price, currency, status, notes)
        VALUES
          ($1, $2, $3, $4::fyp_25_s4_20.currency, $5::fyp_25_s4_20.availability, $6)
        RETURNING
          listing_id,
          product_id,
          price,
          currency::text AS currency,
          status::text AS status,
          created_on;
        `,
        [args.productId, args.userId, args.price, args.currency, status, notes]
      );

      const row = ins.rows[0];

      await client.query("COMMIT");

      return {
        listing_id: row.listing_id,
        product_id: row.product_id,
        serial_no: prodRes.rows[0].serial_no,
        model: prodRes.rows[0].model,
        price: row.price,
        currency: row.currency,
        status: row.status as ListingStatus,
        created_on: row.created_on,
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
  // Update listing fields (price / currency / status) for a user.
  // ======================================================
  static async updateListingForUser(
    input: UpdateListingInput
  ): Promise<ListingForEdit> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1) Ensure user is allowed
      const existing = await this.getListingForUser(input.listingId, input.userId);

      // 2) Resolve new values
      const newPrice =
        typeof input.price === 'number' ? input.price : existing.price;
      const newCurrency =
        typeof input.currency === 'string' ? input.currency : existing.currency;
      const newStatus = input.status ?? existing.status;

      // 3) Update listing
      const updatedRes = await client.query(
        `
        UPDATE fyp_25_s4_20.product_listing
        SET price = $1,
            currency = $2,
            status = $3
        WHERE listing_id = $4
        RETURNING
          listing_id,
          product_id,
          price,
          currency,
          status,
          created_on;
        `,
        [newPrice, newCurrency, newStatus, input.listingId]
      );

      const updated = updatedRes.rows[0];

      // 4) Fetch product info for UI
      const prodRes = await client.query(
        `
        SELECT serial_no, model
        FROM fyp_25_s4_20.product
        WHERE product_id = $1;
        `,
        [updated.product_id]
      );

      const prod = prodRes.rows[0];

      await client.query('COMMIT');

      return {
        listing_id: updated.listing_id,
        product_id: updated.product_id,
        serial_no: prod.serial_no,
        model: prod.model,
        price: updated.price,
        currency: updated.currency,
        status: updated.status,
        created_on: updated.created_on,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async getListingForEdit(
    listingId: number,
    userId: number
  ): Promise<ListingForEdit> {
    const r = await pool.query(
      `
      SELECT
        pl.listing_id,
        pl.product_id,
        p.serial_no,
        p.model,
        pl.price,
        pl.currency,
        pl.status,
        pl.created_on
      FROM fyp_25_s4_20.product_listing pl
      JOIN fyp_25_s4_20.product p
        ON p.product_id = pl.product_id
      WHERE pl.listing_id = $1
        AND pl.seller_id = $2
      LIMIT 1;
      `,
      [listingId, userId]
    );

    if (r.rows.length === 0) {
      // distinguish not found vs not owner
      const exists = await pool.query(
        `SELECT listing_id FROM fyp_25_s4_20.product_listing WHERE listing_id = $1`,
        [listingId]
      );

      if (exists.rows.length === 0) {
        throw new Error("Listing not found");
      }

      throw new Error("Not owner of this listing");
    }

    return r.rows[0] as ListingForEdit;
  }

  // ======================================================
  // Delete a listing for the user, with permission checks.
  // ======================================================
  static async deleteListingForUser(listingId: number, userId: number): Promise<void> {
    // Delete only if the listing belongs to this user
    const del = await pool.query(
      `
      DELETE FROM fyp_25_s4_20.product_listing
      WHERE listing_id = $1
        AND seller_id = $2
      RETURNING listing_id;
      `,
      [listingId, userId]
    );

    if (del.rows.length > 0) return;

    // If nothing deleted, decide why (not found vs not owner)
    const exists = await pool.query(
      `SELECT listing_id FROM fyp_25_s4_20.product_listing WHERE listing_id = $1`,
      [listingId]
    );

    if (exists.rows.length === 0) throw new Error("Listing not found");
    throw new Error("Not owner of this listing");
  }

  static async updateListingAvailabilityForUser(args: {
    listingId: number;
    userId: number;
    status: ListingStatus;
  }): Promise<ListingRow> {
    // Only update if listing belongs to this user
    const upd = await pool.query(
      `
      UPDATE fyp_25_s4_20.product_listing pl
      SET status = $3::fyp_25_s4_20.availability
      WHERE pl.listing_id = $1
        AND pl.seller_id = $2
      RETURNING
        pl.listing_id,
        pl.product_id,
        pl.price,
        pl.currency::text AS currency,
        pl.status::text AS status,
        pl.created_on;
      `,
      [args.listingId, args.userId, args.status]
    );

    if (upd.rows.length === 0) {
      // Decide why: not found vs not owner
      const exists = await pool.query(
        `SELECT listing_id FROM fyp_25_s4_20.product_listing WHERE listing_id = $1`,
        [args.listingId]
      );
      if (exists.rows.length === 0) throw new Error("Listing not found");
      throw new Error("Not owner of this listing");
    }

    const row = upd.rows[0];

    // Pull product details for UI response (serial/model)
    const p = await pool.query(
      `
      SELECT p.serial_no, p.model
      FROM fyp_25_s4_20.product p
      WHERE p.product_id = $1
      LIMIT 1;
      `,
      [row.product_id]
    );

    return {
      listing_id: row.listing_id,
      product_id: row.product_id,
      serial_no: p.rows[0]?.serial_no ?? "",
      model: p.rows[0]?.model ?? null,
      price: row.price ?? null,
      currency: row.currency ?? null,
      status: row.status as ListingStatus,
      created_on: row.created_on,
    };
  }
}
