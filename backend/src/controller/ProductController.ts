// src/controller/ProductController.ts
import { Request, Response } from 'express';
import { ProductScan } from '../entities/Product';
// import { ProductRegistration } from '../entities/Manufacturer/ProductRegistration';
import { ProductHistory, ProductHistoryResult } from '../entities/ProductHistory';
// import { ProductDeletion } from '../entities/Manufacturer/ProductDeletion';
// import { ProductQr } from '../entities/ProductQr';
import { ProductUpdate } from '../entities/ProductUpdate';
import { ManufacturerProductListing } from '../entities/Manufacturer/ManufacturerProductListing';
import { MarketplaceListing } from '../entities/Users/MarketplaceListing';
import { ConsumerProductListing, ListingStatus } from '../entities/Users/ConsumerProductListing';
import { QrCodeService } from '../service/QrCodeService';

import pool from '../schema/database';
import fs from "fs";
import path from "path";
import crypto from "crypto";


class ProductController {

// ===========================
// Manufacturer
// ===========================

  // GET /api/products/verify?serial=NIKE-AIR-001
  async verifyProductBySerial(req: Request, res: Response): Promise<void> {
    try {
      const serial = req.query.serial as string | undefined;

      if (!serial) {
        res.status(400).json({
          success: false,
          error: "Missing 'serial' query parameter",
          example: '/api/products/verify?serial=NIKE-AIR-001',
        });
        return;
      }

      const result = await ProductScan.findBySerial(serial);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Product not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          productId: result.productId,
          productName: result.productName,
          serialNumber: result.serialNumber,
          batchNumber: result.batchNumber,
          category: result.category,
          manufactureDate: result.manufactureDate,
          productDescription: result.productDescription,
          status: result.status,
          registeredOn: result.registeredOn,

          manufacturer: result.manufacturer,
          currentOwner: result.currentOwner,
          
          lifecycleStatus: result.lifecycleStatus,
          blockchainStatus: result.blockchainStatus,
          isAuthentic: result.isAuthentic,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Failed to verify product',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // GET /api/products/history?serial=NIKE-AIR-001
  async getTransactionHistory(req: Request, res: Response) {
    try {
      const serial = req.query.serial as string | undefined;

      if (!serial) {
        res.status(400).json({
          success: false,
          error: "Missing 'serial' query parameter",
        });
        return;
      }

      const history = await ProductHistory.getBySerial(serial);

      if (!history) {
        res.status(404).json({
          success: false,
          error: 'Product not found',
        });
        return;
      }

      res.json({
        success: true,
        data: history,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transaction history',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // GET /api/products/manufacturer/:manufacturerId/listings
  async getManufacturerProductListings(req: Request, res: Response): Promise<void> {
    try {
      const manufacturerIdParam = req.params.manufacturerId;

      if (!manufacturerIdParam) {
        res.status(400).json({
          success: false,
          error: "Missing 'manufacturerId' path parameter",
          example: "/api/products/manufacturer/2/listings"
        });
        return;
      }

      const manufacturerId = Number(manufacturerIdParam);

      if (Number.isNaN(manufacturerId)) {
        res.status(400).json({
          success: false,
          error: "'manufacturerId' must be a number",
        });
        return;
      }

      const rows = await ManufacturerProductListing.findByManufacturer(manufacturerId);

      res.json({
        success: true,
        data: rows.map(row => ({
          productId: row.product_id,
          serialNumber: row.serial_no,
          productName: row.model,
          category: row.category,
          productStatus: row.product_status,       // registered / verified / suspicious
          lifecycleStatus: row.lifecycle_status,   // active / transferred
          blockchainStatus: row.blockchain_status, // on blockchain / pending
          registeredOn: row.registered_on,

          // latest listing (may be null if no listing)
          price: row.price,
          currency: row.currency,
          listingStatus: row.listing_status,
          listingCreatedOn: row.listing_created_on,
        })),
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch product listings for manufacturer',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ================================
  // Register Product Flow 
  // ================================

  // POST /api/products/draft
  async createDraft(req: Request, res: Response): Promise<void> {
    try {
      const {
        manufacturerId,
        serialNo,
        productName,
        batchNo,
        category,
        manufactureDate,
        description,
      } = req.body || {};

      if (!manufacturerId || !serialNo) {
        res.status(400).json({ success: false, error: "Missing manufacturerId or serialNo" });
        return;
      }

      const r = await pool.query(
        `
        INSERT INTO fyp_25_s4_20.product
          (registered_by, serial_no, status, model, batch_no, category, manufacture_date, description, stage, track)
        VALUES
          ($1, $2, 'registered', $3, $4, $5, $6, $7, 'draft', TRUE)
        ON CONFLICT (serial_no) DO NOTHING
        RETURNING product_id, serial_no, model, batch_no, category, manufacture_date, description, status, stage, registered_on;
        `,
        [manufacturerId, serialNo.trim(), productName ?? null, batchNo ?? null, category ?? null, manufactureDate ?? null, description ?? null]
      );

      if (r.rows.length === 0) {
        res.status(409).json({
          success: false,
          error: "Serial number already exists",
          details: "Choose a unique serialNo",
        });
        return;
      }

      res.status(201).json({ success: true, data: { product: r.rows[0] } });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to create draft product",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // PUT /api/products/:productId/draft
  async updateDraft(req: Request, res: Response): Promise<void> {
    try {
      const productId = Number(req.params.productId);
      if (Number.isNaN(productId)) {
        res.status(400).json({ success: false, error: "productId must be a number" });
        return;
      }

      const {
        manufacturerId,
        serialNo, // optional: allow editing serial while still draft (but must remain unique)
        productName,
        batchNo,
        category,
        manufactureDate,
        description,
      } = req.body || {};

      if (!manufacturerId) {
        res.status(400).json({ success: false, error: "manufacturerId is required" });
        return;
      }

      const r = await pool.query(
        `
        UPDATE fyp_25_s4_20.product
        SET
          serial_no = COALESCE($1, serial_no),
          model = COALESCE($2, model),
          batch_no = COALESCE($3, batch_no),
          category = COALESCE($4, category),
          manufacture_date = COALESCE($5, manufacture_date),
          description = COALESCE($6, description)
        WHERE product_id = $7
          AND registered_by = $8
          AND stage = 'draft'
          AND (tx_hash IS NULL OR tx_hash = '')
        RETURNING product_id, serial_no, model, batch_no, category, manufacture_date, description, status, stage, registered_on;
        `,
        [
          serialNo ? String(serialNo).trim() : null,
          productName ?? null,
          batchNo ?? null,
          category ?? null,
          manufactureDate ?? null,
          description ?? null,
          productId,
          manufacturerId,
        ]
      );

      if (r.rows.length === 0) {
        res.status(409).json({
          success: false,
          error: "Cannot update product",
          details: "Only draft products (not on-chain) can be updated by the registering manufacturer.",
        });
        return;
      }

      res.json({ success: true, data: { product: r.rows[0] } });
    } catch (err: any) {
      // unique serial conflict
      if (err?.code === "23505") {
        res.status(409).json({
          success: false,
          error: "Serial number already exists",
          details: "Choose a unique serialNo",
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: "Failed to update draft product",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // DELETE /api/products/:productId/draft   body: { manufacturerId }
  async deleteDraft(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    try {
      const productId = Number(req.params.productId);
      const { manufacturerId } = req.body || {};

      if (!productId || !manufacturerId) {
        res.status(400).json({ success: false, error: "Missing productId or manufacturerId" });
        return;
      }

      await client.query("BEGIN");

      // lock row
      const check = await client.query(
        `
        SELECT product_id, registered_by, stage, tx_hash
        FROM fyp_25_s4_20.product
        WHERE product_id = $1
        FOR UPDATE;
        `,
        [productId]
      );

      if (check.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ success: false, error: "Product not found" });
        return;
      }

      const p = check.rows[0];

      if (p.registered_by !== manufacturerId) {
        await client.query("ROLLBACK");
        res.status(403).json({ success: false, error: "Not allowed" });
        return;
      }

      if (p.stage !== "draft" || p.tx_hash) {
        await client.query("ROLLBACK");
        res.status(409).json({
          success: false,
          error: "Cannot delete product",
          details: "Only draft products (not confirmed / not on-chain) can be deleted.",
        });
        return;
      }

      await client.query(`DELETE FROM fyp_25_s4_20.product WHERE product_id = $1;`, [productId]);

      await client.query("COMMIT");
      res.json({ success: true, data: { deleted: true, productId } });
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch {}
      res.status(500).json({
        success: false,
        error: "Failed to delete draft product",
        details: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  }

  // POST /api/products/:productId/confirm-draft   body: { manufacturerId }
  async confirmDraft(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    try {
      const productId = Number(req.params.productId);
      const { manufacturerId } = req.body || {};

      if (!productId || !manufacturerId) {
        res.status(400).json({ success: false, error: "Missing productId or manufacturerId" });
        return;
      }

      await client.query("BEGIN");

      const r = await client.query(
        `
        UPDATE fyp_25_s4_20.product
        SET stage = 'confirmed'
        WHERE product_id = $1
          AND registered_by = $2
          AND stage = 'draft'
          AND (tx_hash IS NULL OR tx_hash = '')
        RETURNING product_id, serial_no, stage;
        `,
        [productId, manufacturerId]
      );

      if (r.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(409).json({
          success: false,
          error: "Cannot confirm",
          details: "Only draft products (owned by you) can be confirmed.",
        });
        return;
      }

      await client.query("COMMIT");
      res.json({ success: true, data: { product: r.rows[0], confirmedDraft: true } });
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch {}
      res.status(500).json({
        success: false,
        error: "Failed to confirm draft",
        details: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  }

  // POST /api/products/:productId/metadata-final
  async storeMetadataAfterConfirm(req: Request, res: Response) {
    try {
      const productId = Number(req.params.productId);
      const { manufacturerId, metadata } = req.body || {};

      if (!productId || !manufacturerId || !metadata) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
          details: ["productId (params)", "manufacturerId", "metadata"],
        });
      }

      const p = await pool.query(
        `
        SELECT product_id, registered_by, tx_hash, stage
        FROM fyp_25_s4_20.product
        WHERE product_id = $1
        LIMIT 1;
        `,
        [productId]
      );

      if (p.rows.length === 0) return res.status(404).json({ success: false, error: "Product not found" });

      const prod = p.rows[0];

      if (prod.registered_by !== manufacturerId) return res.status(403).json({ success: false, error: "Not allowed" });

      // ✅ must be confirmed first (draft still editable)
      if (prod.stage !== "confirmed") {
        return res.status(409).json({
          success: false,
          error: "Product must be confirmed before finalizing metadata",
          details: "Call /confirm-draft first. After on-chain, metadata is immutable.",
        });
      }

      // Block if already finalized
      const existing = await pool.query(
        `SELECT is_final FROM fyp_25_s4_20.product_metadata WHERE product_id = $1 LIMIT 1;`,
        [productId]
      );

      if (existing.rows.length > 0 && existing.rows[0].is_final === true) {
        return res.status(409).json({
          success: false,
          error: "Metadata already finalized",
          details: "Metadata is immutable once stored.",
        });
      }

      const jsonText = JSON.stringify(metadata);
      const hashHex = crypto.createHash("sha256").update(jsonText, "utf8").digest("hex");

      const dir = path.join(process.cwd(), "metadata");
      fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, `${hashHex}.json`);
      if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, jsonText, "utf8");

      const baseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
      const metadataUri = `${baseUrl}/metadata/${hashHex}.json`;

      // Upsert row, but lock as final=true
      await pool.query(
        `
        INSERT INTO fyp_25_s4_20.product_metadata
          (product_id, metadata_json, metadata_sha256_hex, is_final, metadata_uri)
        VALUES ($1, $2::jsonb, $3, TRUE, $4)
        ON CONFLICT (product_id)
        DO UPDATE SET
          metadata_json = EXCLUDED.metadata_json,
          metadata_sha256_hex = EXCLUDED.metadata_sha256_hex,
          is_final = TRUE,
          metadata_uri = EXCLUDED.metadata_uri;
        `,
        [productId, jsonText, hashHex, metadataUri]
      );

      return res.json({ success: true, metadataUri, metadataSha256Hex: hashHex });
    } catch (e: any) {
      console.error("storeMetadataAfterConfirm error:", e);
      return res.status(500).json({ success: false, error: e.message ?? "Failed to finalize metadata" });
    }
  }

  // POST /api/products/:productId/confirm
  async confirmProductOnChain(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    try {
      const productId = Number(req.params.productId);
      const { manufacturerId, txHash, productPda, blockSlot } = (req.body || {}) as any;

      if (!productId || !manufacturerId || !txHash) {
        res.status(400).json({
          success: false,
          error: "Missing required fields",
          details: ["productId", "manufacturerId", "txHash"],
          receivedBody: req.body ?? null,
        });
        return;
      }

      await client.query("BEGIN");

      const check = await client.query(
        `
        SELECT product_id, registered_by, tx_hash, product_pda, serial_no, stage
        FROM fyp_25_s4_20.product
        WHERE product_id = $1
        FOR UPDATE;
        `,
        [productId]
      );

      if (check.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ success: false, error: "Product not found" });
        return;
      }

      const prod = check.rows[0];

      if (prod.registered_by !== manufacturerId) {
        await client.query("ROLLBACK");
        res.status(403).json({ success: false, error: "Not allowed" });
        return;
      }

      // must be confirmed draft before on-chain
      if ((prod.tx_hash == null || prod.tx_hash === "") && prod.stage !== "confirmed") {
        await client.query("ROLLBACK");
        res.status(409).json({
          success: false,
          error: "Product not confirmed (draft is editable)",
          details: "Call /confirm-draft first, then register on-chain.",
        });
        return;
      }

      // idempotent confirm
      if (prod.tx_hash && prod.tx_hash !== "") {
        if (prod.tx_hash === txHash) {
          await client.query("COMMIT");
          res.status(200).json({
            success: true,
            data: {
              productId,
              txHash: prod.tx_hash,
              productPda: prod.product_pda,
              alreadyConfirmed: true,
            },
          });
          return;
        }

        await client.query("ROLLBACK");
        res.status(409).json({
          success: false,
          error: "Already on blockchain",
          details: `Existing tx_hash differs. existing=${prod.tx_hash} incoming=${txHash}`,
        });
        return;
      }

      // prevent ux_product_tx_hash collision
      const dup = await client.query(
        `
        SELECT product_id, serial_no
        FROM fyp_25_s4_20.product
        WHERE tx_hash = $1
          AND product_id <> $2
        LIMIT 1;
        `,
        [txHash, productId]
      );

      if (dup.rows.length > 0) {
        await client.query("ROLLBACK");
        res.status(409).json({
          success: false,
          error: "txHash already used",
          details: `txHash already linked to product_id=${dup.rows[0].product_id} (${dup.rows[0].serial_no})`,
        });
        return;
      }

      const updated = await client.query(
        `
        UPDATE fyp_25_s4_20.product
        SET tx_hash = $1,
            product_pda = COALESCE($2, product_pda),
            stage = 'onchain'
        WHERE product_id = $3
        RETURNING product_id, serial_no, tx_hash, product_pda, stage;
        `,
        [txHash, productPda ?? null, productId]
      );

      const serialNo = updated.rows[0]?.serial_no ?? "";

      const u = await client.query(
        `
        SELECT public_key
        FROM fyp_25_s4_20.users
        WHERE user_id = $1
        LIMIT 1;
        `,
        [manufacturerId]
      );

      const manufacturerPubKey: string | null = u.rows[0]?.public_key ?? null;
      if (!manufacturerPubKey) {
        await client.query("ROLLBACK");
        res.status(409).json({
          success: false,
          error: "Manufacturer public_key missing",
          details: "users.public_key is required for blockchain_node and ownership.",
        });
        return;
      }

      await client.query(
        `
        INSERT INTO fyp_25_s4_20.blockchain_node (
          tx_hash, prev_tx_hash,
          from_user_id, from_public_key,
          to_user_id, to_public_key,
          product_id, block_slot, created_on,
          event
        )
        VALUES ($1, NULL, $2, $3, $2, $3, $4, $5, NOW(), 'REGISTER')
        ON CONFLICT (tx_hash) DO NOTHING;
        `,
        [txHash, manufacturerId, manufacturerPubKey, productId, Number(blockSlot ?? 0)]
      );

      // active ownership (manufacturer becomes current owner on register)
      let ownershipRow: any = null;

      const ownershipIns = await client.query(
        `
        INSERT INTO fyp_25_s4_20.ownership (
          owner_id, owner_public_key, product_id, start_on, end_on, tx_hash
        )
        VALUES ($1, $2, $3, NOW(), NULL, $4)
        ON CONFLICT ON CONSTRAINT unique_active_ownership
        DO NOTHING
        RETURNING ownership_id, owner_id, product_id, start_on, end_on, tx_hash;
        `,
        [manufacturerId, manufacturerPubKey, productId, txHash]
      );

      if (ownershipIns.rows.length > 0) {
        ownershipRow = ownershipIns.rows[0];
      } else {
        const existingActive = await client.query(
          `
          SELECT ownership_id, owner_id, product_id, start_on, end_on, tx_hash
          FROM fyp_25_s4_20.ownership
          WHERE product_id = $1 AND end_on IS NULL
          LIMIT 1;
          `,
          [productId]
        );
        ownershipRow = existingActive.rows[0] ?? null;
      }

      // notification (idempotent)
      try {
        await client.query(
          `
          INSERT INTO fyp_25_s4_20.notification
            (user_id, title, message, is_read, created_on, product_id, tx_hash)
          VALUES
            ($1, $2, $3, FALSE, NOW(), $4, $5)
          ON CONFLICT ON CONSTRAINT notification_user_product_tx_uniq
          DO NOTHING;
          `,
          [
            manufacturerId,
            "Product Registration",
            `Your product ${serialNo} has been successfully registered on the blockchain.`,
            productId,
            txHash,
          ]
        );
      } catch (e) {
        console.warn("notification insert skipped:", e);
      }

      await client.query("COMMIT");

      res.status(200).json({
        success: true,
        data: {
          product: updated.rows[0],
          ownership: ownershipRow
            ? {
                ownershipId: ownershipRow.ownership_id,
                ownerId: ownershipRow.owner_id,
                productId: ownershipRow.product_id,
                startOn: ownershipRow.start_on,
                endOn: ownershipRow.end_on,
                txHash: ownershipRow.tx_hash,
              }
            : null,
          confirmed: true,
        },
      });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      res.status(500).json({
        success: false,
        error: "Failed to confirm product on blockchain",
        details: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  }

  // ================================
  // QR Code Handling
  // ================================

  // GET /api/products/:productId/qrcode
  async getProductQrCode(req: Request, res: Response): Promise<void> {
    console.log('GET /api/products/:productId/qrcode called with', req.params);
    try {
      const productId = Number(req.params.productId);

      if (Number.isNaN(productId)) {
        res.status(400).json({
          success: false,
          error: 'productId must be a number',
        });
        return;
      }

      // 1) Load product (including qr_code if already stored)
      const productRes = await pool.query(
        `
        SELECT
          product_id,
          serial_no,
          registered_by,
          qr_code
        FROM fyp_25_s4_20.product
        WHERE product_id = $1;
        `,
        [productId]
      );

      if (productRes.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Product not found',
        });
        return;
      }

      const product = productRes.rows[0];

      let qrBuffer: Buffer;

      if (product.qr_code) {
        // 2A) We already have QR bytes in DB
        qrBuffer = product.qr_code;
      } else {
        // 2B) No QR in DB yet – generate one now, store it, then return it

        // Build a payload – same logic as in ProductRegistration
        const payload = QrCodeService.buildPayload(
          product.product_id,
          product.serial_no,
          product.registered_by
        );

        qrBuffer = await QrCodeService.generatePngBuffer(payload);

        // Save into DB for future reuse
        await pool.query(
          `
          UPDATE fyp_25_s4_20.product
          SET qr_code = $1
          WHERE product_id = $2;
          `,
          [qrBuffer, product.product_id]
        );
      }

      // 3) Return as image/png
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', qrBuffer.length.toString());
      res.send(qrBuffer);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate QR code',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // PUT /api/products/:productId
  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const productId = Number(req.params.productId);

      if (Number.isNaN(productId)) {
        res.status(400).json({ success: false, error: "productId must be a number" });
        return;
      }

      const {
        manufacturerId,
        serialNo, // will be rejected if you try to change it
        productName,
        batchNo,
        category,
        manufactureDate,
        description,
      } = req.body || {};

      if (!manufacturerId || typeof manufacturerId !== "number") {
        res.status(400).json({ success: false, error: "manufacturerId is required in body (number)" });
        return;
      }

      const apiBase = process.env.API_BASE_URL || "http://localhost:3000";

      const updated = await ProductUpdate.updateProductWithQr({
        productId,
        manufacturerId,
        serialNo,
        productName,
        batchNo,
        category,
        manufactureDate,
        description,
      });

      res.json({
        success: true,
        data: {
          productId: updated.product_id,
          serialNumber: updated.serial_no,
          productName: updated.model,
          batchNumber: updated.batch_no,
          category: updated.category,
          manufactureDate: updated.manufacture_date,
          productDescription: updated.description,
          status: updated.status,
          registeredOn: updated.registered_on,
          qrPayload: updated.qr_payload,
          qrImageUrl: `${apiBase}/api/products/${updated.product_id}/qrcode`,
        },
      });
    } catch (err: any) {
      const status = err?.status ?? 500;
      res.status(status).json({
        success: false,
        error: "Failed to update product",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  
// ===========================
// User
// ===========================

  // GET /api/products/marketplace/listings
  async getMarketplaceListings(req: Request, res: Response): Promise<void> {
    try {
      const rows = await MarketplaceListing.findAvailable();

      res.json({
        success: true,
        data: rows.map((row) => ({
          listingId: row.listing_id,
          productId: row.product_id,
          serialNumber: row.serial_no,
          productName: row.model,
          productStatus: row.product_status,
          registeredOn: row.registered_on,

          price: row.price,
          currency: row.currency,
          listingStatus: row.listing_status,
          listingCreatedOn: row.listing_created_on,

          seller: {
            userId: row.seller_id,
            username: row.seller_username,
            role: row.seller_role,
          },

          blockchainStatus: row.blockchain_status,

          // simple rule
          isAuthentic: row.product_status === "verified" && row.blockchain_status === "on blockchain",
        })),
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch marketplace listings",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // POST /api/products/listings
  // body: { userId, productId, price, currency, status? }
  async createListing(req: Request, res: Response): Promise<void> {
    try {
      const { userId, productId, price, currency, status } = req.body || {};

      const userIdNum = Number(userId);
      const productIdNum = Number(productId);
      const priceNum = Number(price);

      if (Number.isNaN(userIdNum) || Number.isNaN(productIdNum) || Number.isNaN(priceNum)) {
        res.status(400).json({
          success: false,
          error: "userId, productId, price must be numbers",
        });
        return;
      }

      if (priceNum <= 0) {
        res.status(400).json({ success: false, error: "price must be > 0" });
        return;
      }

      const allowedCurrencies = ["SGD", "USD", "EUR"];
      if (!currency || !allowedCurrencies.includes(currency)) {
        res.status(400).json({
          success: false,
          error: `Invalid currency. Allowed: ${allowedCurrencies.join(", ")}`,
        });
        return;
      }

      const allowedStatuses: ListingStatus[] = ["available", "reserved", "sold"];
      if (status && !allowedStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
        });
        return;
      }

      try {
        const created = await ConsumerProductListing.createListingForUser({
          userId: userIdNum,
          productId: productIdNum,
          price: priceNum,
          currency,
          status,
        });

        res.status(201).json({
          success: true,
          data: {
            listingId: created.listing_id,
            productId: created.product_id,
            serialNumber: created.serial_no,
            productName: created.model,
            price: created.price,
            currency: created.currency,
            status: created.status,
            createdOn: created.created_on,
          },
        });
      } catch (err: any) {
        const msg = err?.message ?? String(err);

        if (msg === "Product not found") {
          res.status(404).json({ success: false, error: msg });
          return;
        }

        if (
          msg.includes("do not own") ||
          msg.includes("Active listing already exists")
        ) {
          res.status(409).json({
            success: false,
            error: "Cannot create listing",
            details: msg,
          });
          return;
        }

        res.status(400).json({
          success: false,
          error: "Failed to create listing",
          details: msg,
        });
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Unexpected error while creating listing",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // GET /api/products/:productId/edit?manufacturerId=2
  async getProductForEdit(req: Request, res: Response): Promise<void> {
    try {
      const productId = Number(req.params.productId);
      const manufacturerIdParam = req.query.manufacturerId as string | undefined;

      if (!Number.isFinite(productId) || productId <= 0) {
        res.status(400).json({ success: false, error: "productId must be a positive number" });
        return;
      }

      if (!manufacturerIdParam) {
        res.status(400).json({
          success: false,
          error: "Missing 'manufacturerId' query parameter",
        });
        return;
      }

      const manufacturerId = Number(manufacturerIdParam);

      if (!Number.isFinite(manufacturerId) || manufacturerId <= 0) {
        res.status(400).json({
          success: false,
          error: "'manufacturerId' must be a positive number",
        });
        return;
      }

      // Read product from DB (include tx_hash + track so we can enforce rules)
      const result = await pool.query(
        `
        SELECT
          p.product_id,
          p.serial_no,
          p.model,
          p.batch_no,
          p.category,
          p.manufacture_date,
          p.description,
          p.status,
          p.registered_on,
          p.registered_by,
          p.tx_hash,
          p.track
        FROM fyp_25_s4_20.product p
        WHERE p.product_id = $1
        LIMIT 1;
        `,
        [productId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: "Product not found" });
        return;
      }

      const p = result.rows[0];

      // Only the manufacturer who registered this product can edit
      if (p.registered_by !== manufacturerId) {
        res.status(403).json({
          success: false,
          error: "You are not allowed to edit this product",
        });
        return;
      }

      // ✅ If already confirmed on-chain, editing should be blocked
      if (p.tx_hash) {
        res.status(409).json({
          success: false,
          error: "Cannot edit",
          details: "Product is already confirmed on blockchain (tx_hash exists).",
        });
        return;
      }

      // OPTIONAL: block editing if not tracking anymore
      // if (p.track === false) {
      //   res.status(409).json({
      //     success: false,
      //     error: "Cannot edit",
      //     details: "This product is no longer tracked.",
      //   });
      //   return;
      // }

      const apiBase = process.env.API_BASE_URL || "http://localhost:3000";

      res.json({
        success: true,
        data: {
          productId: p.product_id,
          serialNumber: p.serial_no,
          productName: p.model,
          batchNumber: p.batch_no,
          category: p.category,
          manufactureDate: p.manufacture_date,
          productDescription: p.description,
          status: p.status,
          registeredOn: p.registered_on,

          // for QR display on the Edit page:
          qrImageUrl: `${apiBase}/api/products/${p.product_id}/qrcode`,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to load product for editing",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

   // GET /api/products/listings/:listingId/edit?userId=8
  async getListingForEdit(req: Request, res: Response): Promise<void> {
  try {
    const listingId = Number(req.params.listingId);
    const userIdParam = req.query.userId as string | undefined;

    if (Number.isNaN(listingId)) {
      res.status(400).json({ success: false, error: "listingId must be a number" });
      return;
    }
    if (!userIdParam) {
      res.status(400).json({
        success: false,
        error: "Missing 'userId' query parameter",
        example: `/api/products/listings/${listingId}/edit?userId=8`,
      });
      return;
    }

    const userId = Number(userIdParam);
    if (Number.isNaN(userId)) {
      res.status(400).json({ success: false, error: "userId must be a number" });
      return;
    }

    const listing = await ConsumerProductListing.getListingForEdit(listingId, userId);

    res.json({
      success: true,
      data: {
        listingId: listing.listing_id,
        productId: listing.product_id,
        serialNumber: listing.serial_no,
        productName: listing.model,
        price: listing.price,
        currency: listing.currency,
        status: listing.status,
        createdOn: listing.created_on,
      },
    });
  } catch (err: any) {
    const status = err?.status ?? 500;
    res.status(status).json({
      success: false,
      error: "Cannot load listing for edit",
      details: err?.message ?? String(err),
    });
  }
  }

  // PUT /api/products/listings/:listingId
  async updateListing(req: Request, res: Response): Promise<void> {
    try {
      const listingId = Number(req.params.listingId);
      if (Number.isNaN(listingId)) {
        res.status(400).json({ success: false, error: 'listingId must be a number' });
        return;
      }

      const { userId, price, currency, status } = req.body || {};
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required in request body' });
        return;
      }

      const userIdNum = Number(userId);
      if (Number.isNaN(userIdNum)) {
        res.status(400).json({ success: false, error: 'userId must be a number' });
        return;
      }

      try {
        const updated = await ConsumerProductListing.updateListingForUser({
          listingId,
          userId: userIdNum,
          price,
          currency,
          status,
        });

        res.json({
          success: true,
          data: {
            listingId: updated.listing_id,
            productId: updated.product_id,
            serialNumber: updated.serial_no,
            productName: updated.model,
            price: updated.price,
            currency: updated.currency,
            status: updated.status,
            updatedOn: updated.created_on,
          },
        });
      } catch (err: any) {
        res.status(403).json({
          success: false,
          error: 'Cannot update listing',
          details: err.message ?? String(err),
        });
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Unexpected error while updating listing',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // DELETE /api/products/listings/:listingId?userId=8
  async deleteListing(req: Request, res: Response): Promise<void> {
    try {
      const listingId = Number(req.params.listingId);
      const userIdParam = req.query.userId as string | undefined;

      if (Number.isNaN(listingId)) {
        res.status(400).json({ success: false, error: "listingId must be a number" });
        return;
      }

      if (!userIdParam) {
        res.status(400).json({
          success: false,
          error: "Missing 'userId' query parameter",
          example: `/api/products/listings/${listingId}?userId=8`,
        });
        return;
      }

      const userId = Number(userIdParam);
      if (Number.isNaN(userId)) {
        res.status(400).json({ success: false, error: "userId must be a number" });
        return;
      }

      try {
        await ConsumerProductListing.deleteListingForUser(listingId, userId);
        res.json({ success: true, message: "Listing deleted successfully" });
      } catch (err: any) {
        const msg = err.message ?? String(err);
        if (msg === "Listing not found") {
          res.status(404).json({ success: false, error: "Listing not found" });
        } else {
          res.status(403).json({
            success: false,
            error: "Cannot delete listing",
            details: msg,
          });
        }
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Unexpected error while deleting listing",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // PUT /api/products/listings/:listingId/availability
  async updateListingAvailability(req: Request, res: Response): Promise<void> {
    try {
      const listingId = Number(req.params.listingId);
      if (Number.isNaN(listingId)) {
        res.status(400).json({ success: false, error: "listingId must be a number" });
        return;
      }

      const { userId, status } = req.body || {};

      if (!userId) {
        res.status(400).json({ success: false, error: "userId is required in request body" });
        return;
      }

      const userIdNum = Number(userId);
      if (Number.isNaN(userIdNum)) {
        res.status(400).json({ success: false, error: "userId must be a number" });
        return;
      }

      const allowedStatuses: ListingStatus[] = ["available", "reserved", "sold"];
      if (!status || !allowedStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
        });
        return;
      }

      try {
        const updated = await ConsumerProductListing.updateListingAvailabilityForUser({
          listingId,
          userId: userIdNum,
          status,
        });

        res.json({
          success: true,
          data: {
            listingId: updated.listing_id,
            productId: updated.product_id,
            serialNumber: updated.serial_no,
            productName: updated.model,
            price: updated.price,
            currency: updated.currency,
            status: updated.status,
            updatedOn: updated.created_on,
          },
        });
      } catch (err: any) {
        const msg = err.message ?? String(err);
        if (msg === "Listing not found") {
          res.status(404).json({ success: false, error: "Listing not found" });
        } else {
          res.status(403).json({
            success: false,
            error: "Cannot update availability for this listing",
            details: msg,
          });
        }
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Unexpected error while updating listing availability",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export default new ProductController();
