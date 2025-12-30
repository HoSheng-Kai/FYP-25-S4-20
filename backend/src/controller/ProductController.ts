// src/controller/ProductController.ts
import { Request, Response } from 'express';
import { ProductScan } from '../entities/Product';
import { ProductRegistration } from '../entities/ProductRegistration';
import { ProductConfirmation } from '../entities/ProductConfirmation';
import { ProductHistory, ProductHistoryResult } from '../entities/ProductHistory';
import { ProductDeletion } from '../entities/ProductDeletion';
import { ProductQr } from '../entities/ProductQr';
import { ProductUpdate } from '../entities/ProductUpdate';
import { ManufacturerProductListing } from '../entities/ManufacturerProductListing';
import { MarketplaceListing } from '../entities/MarketplaceListing';
import { ListingUpdate, ListingStatus } from '../entities/ListingUpdate';
import { QrCodeService } from '../service/QrCodeService';

import pool from '../schema/database';
import fs from "fs";
import path from "path";
import crypto from "crypto";


class ProductController {
    async registerProduct(req: Request, res: Response): Promise<void> {
    try {
      const {
        manufacturerId,
        serialNo,
        productName,
        batchNo,
        category,
        manufactureDate,
        description,
        price,
        currency
      } = (req.body || {}) as any;

      if (!manufacturerId || !serialNo) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          details: {
            required: ['manufacturerId', 'serialNo'],
            receivedBody: req.body ?? null,
          },
        });
        return;
      }

      if (typeof manufacturerId !== 'number') {
        res.status(400).json({
          success: false,
          error: 'manufacturerId must be a number',
        });
        return;
      }

      try {
        // ✅ DB-only registration (pending)
        const result = await ProductRegistration.registerProduct({
          manufacturerId,
          serialNo,
          productName,
          batchNo,
          category,
          manufactureDate,
          description,
          price,
          currency
        });

        res.status(201).json({
          success: true,
          data: result,
          blockchainStatus: 'pending'
        });
      } catch (err: any) {
        // ✅ clean typed 409 for "serial cannot be reused"
        if (err?.status === 409) {
          res.status(409).json({
            success: false,
            error: "Serial number already exists",
            details: err.reason ?? "SERIAL_LOCKED",
          });
          return;
        }

        // legacy unique violation
        if (err?.code === "23505") {
          res.status(409).json({
            success: false,
            error: "Serial number already exists",
            details: "Choose a unique serial_no",
          });
          return;
        }

        throw err;
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Failed to register product',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // GET /api/products/resume?serial=TEST-META-001
  async resumeRegistration(req: Request, res: Response): Promise<void> {
    try {
      const serial = req.query.serial as string | undefined;
      if (!serial?.trim()) {
        res.status(400).json({
          success: false,
          error: "Missing 'serial' query parameter",
          example: "/api/products/resume?serial=TEST-META-001",
        });
        return;
      }

      // Find the product record (registered/pending or already on-chain)
      const p = await pool.query(
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
          p.product_pda,
          p.tx_hash,
          u.public_key AS manufacturer_public_key
        FROM fyp_25_s4_20.product p
        LEFT JOIN fyp_25_s4_20.users u ON u.user_id = p.registered_by
        WHERE p.serial_no = $1
        LIMIT 1;
        `,
        [serial.trim()]
      );

      if (p.rows.length === 0) {
        res.status(404).json({ success: false, error: "Product not found in DB" });
        return;
      }

      const row = p.rows[0];

      res.status(200).json({
        success: true,
        data: {
          productId: row.product_id,
          serialNo: row.serial_no,
          productName: row.model,
          batchNo: row.batch_no,
          category: row.category,
          manufactureDate: row.manufacture_date,
          description: row.description,
          status: row.status,
          registeredOn: row.registered_on,

          manufacturerId: row.registered_by,
          manufacturerPublicKey: row.manufacturer_public_key,

          productPda: row.product_pda,
          txHash: row.tx_hash,

          blockchainStatus: row.tx_hash ? "on blockchain" : "pending",
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to resume registration",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // DELETE /api/products/:productId/cancel   body: { manufacturerId }
  async cancelPendingById(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    try {
      const productId = Number(req.params.productId);
      const { manufacturerId } = (req.body || {}) as any;

      if (!productId || !manufacturerId) {
        res.status(400).json({
          success: false,
          error: "Missing required fields",
          details: ["productId", "manufacturerId"],
          receivedBody: req.body ?? null,
        });
        return;
      }

      await client.query("BEGIN");

      // Lock row
      const check = await client.query(
        `
        SELECT product_id, registered_by, tx_hash
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

      // Must be the same manufacturer who created it
      if (prod.registered_by !== manufacturerId) {
        await client.query("ROLLBACK");
        res.status(403).json({
          success: false,
          error: "Not allowed",
          details: "You are not the manufacturer who registered this product",
        });
        return;
      }

      // If already confirmed, do NOT delete
      if (prod.tx_hash) {
        await client.query("ROLLBACK");
        res.status(409).json({
          success: false,
          error: "Cannot cancel",
          details: "Product already has tx_hash (already on-chain / confirmed)",
        });
        return;
      }

      // Delete metadata first (FK cascade exists in your schema, but safe anyway)
      await client.query(
        `DELETE FROM fyp_25_s4_20.product_metadata WHERE product_id = $1;`,
        [productId]
      );

      // Delete product (will cascade delete listing/ownership if any)
      await client.query(
        `DELETE FROM fyp_25_s4_20.product WHERE product_id = $1;`,
        [productId]
      );

      await client.query("COMMIT");

      res.status(200).json({
        success: true,
        data: { cancelled: true, productId },
      });
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      res.status(500).json({
        success: false,
        error: "Failed to cancel pending product",
        details: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  }

  // DELETE /api/products/cancel-by-serial
  async cancelBySerial(req: Request, res: Response) {
    const { manufacturerId, serialNo } = req.body ?? {};
    if (!manufacturerId || !serialNo) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    // Only cancel if tx_hash IS NULL (pending)
    const del = await pool.query(
      `
      DELETE FROM fyp_25_s4_20.product
      WHERE serial_no = $1 AND registered_by = $2 AND tx_hash IS NULL
      RETURNING product_id, serial_no;
      `,
      [serialNo, manufacturerId]
    );

    if (del.rows.length === 0) {
      return res.status(409).json({
        success: false,
        error: "Nothing to cancel (maybe already confirmed)",
      });
    }

    return res.json({ success: true, data: del.rows[0] });
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
        SELECT product_id, registered_by, tx_hash, product_pda
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
        res.status(403).json({
          success: false,
          error: "Not allowed",
          details: "You are not the manufacturer who registered this product",
        });
        return;
      }

      // idempotent confirm
      if (prod.tx_hash) {
        if (prod.tx_hash === txHash) {
          await client.query("COMMIT");
          res.status(200).json({
            success: true,
            data: { productId, txHash: prod.tx_hash, productPda: prod.product_pda, alreadyConfirmed: true },
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

      const updated = await client.query(
        `
        UPDATE fyp_25_s4_20.product
        SET tx_hash = $1,
            product_pda = COALESCE($2, product_pda)
        WHERE product_id = $3
        RETURNING product_id, serial_no, tx_hash, product_pda;
        `,
        [txHash, productPda ?? null, productId]
      );

      await client.query("COMMIT");

      res.status(200).json({
        success: true,
        data: { product: updated.rows[0], confirmed: true },
      });
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch {}
      res.status(500).json({
        success: false,
        error: "Failed to confirm product on blockchain",
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

      // 1) Must exist + must be confirmed
      const p = await pool.query(
        `
        SELECT product_id, registered_by, tx_hash
        FROM fyp_25_s4_20.product
        WHERE product_id = $1
        LIMIT 1;
        `,
        [productId]
      );

      if (p.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Product not found" });
      }

      const prod = p.rows[0];

      if (prod.registered_by !== manufacturerId) {
        return res.status(403).json({ success: false, error: "Not allowed" });
      }

      // ✅ MUST be confirmed before writing metadata file
      if (!prod.tx_hash) {
        return res.status(409).json({
          success: false,
          error: "Product not yet confirmed on-chain",
          details: "Confirm the product first, then finalize metadata",
        });
      }

      // 2) Block if already finalized (immutability)
      const existing = await pool.query(
        `SELECT 1 FROM fyp_25_s4_20.product_metadata WHERE product_id = $1 LIMIT 1;`,
        [productId]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: "Metadata already finalized",
          details: "Metadata is immutable once stored.",
        });
      }

      // 3) Hash JSON stable
      const jsonText = JSON.stringify(metadata);
      const hashHex = crypto.createHash("sha256").update(jsonText, "utf8").digest("hex");

      // 4) Write file by HASH (never overwrite)
      const dir = path.join(process.cwd(), "metadata");
      fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, `${hashHex}.json`);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, jsonText, "utf8");
      }

      // 5) Insert-only DB row (immutable)
      await pool.query(
        `
        INSERT INTO fyp_25_s4_20.product_metadata
          (product_id, metadata_json, metadata_sha256_hex)
        VALUES ($1, $2::jsonb, $3);
        `,
        [productId, jsonText, hashHex]
      );

      const baseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
      const metadataUri = `${baseUrl}/metadata/${hashHex}.json`;

      return res.json({
        success: true,
        metadataUri,
        metadataSha256Hex: hashHex,
      });
    } catch (e: any) {
      console.error("storeMetadataAfterConfirm error:", e);
      return res.status(500).json({
        success: false,
        error: e.message ?? "Failed to finalize metadata",
      });
    }
  }

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

  // GET /api/products/listings/:listingId/edit?userId=8
  async getListingForEdit(req: Request, res: Response): Promise<void> {
  try {
    const listingId = Number(req.params.listingId);
    const userIdParam = req.query.userId as string | undefined;

    if (Number.isNaN(listingId)) {
      res.status(400).json({ success: false, error: 'listingId must be a number' });
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
      res.status(400).json({ success: false, error: 'userId must be a number' });
      return;
    }

    try {
      const listing = await ListingUpdate.getListingForUser(listingId, userId);

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
      res.status(403).json({
        success: false,
        error: 'Cannot load listing for edit',
        details: err.message ?? String(err),
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Unexpected error while loading listing for edit',
      details: err instanceof Error ? err.message : String(err),
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
        const updated = await ListingUpdate.updateListingForUser({
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
        res.status(400).json({ success: false, error: 'listingId must be a number' });
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
        res.status(400).json({ success: false, error: 'userId must be a number' });
        return;
      }

      try {
        await ListingUpdate.deleteListingForUser(listingId, userId);
        res.json({ success: true, message: 'Listing deleted successfully' });
      } catch (err: any) {
        const msg = err.message ?? String(err);
        if (msg === 'Listing not found') {
          res.status(404).json({ success: false, error: 'Listing not found' });
        } else {
          res.status(403).json({
            success: false,
            error: 'Cannot delete listing',
            details: msg,
          });
        }
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Unexpected error while deleting listing',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // PATCH /api/products/listings/:listingId/availability
  async updateListingAvailability(req: Request, res: Response): Promise<void> {
    try {
      const listingId = Number(req.params.listingId);
      if (Number.isNaN(listingId)) {
        res.status(400).json({ success: false, error: 'listingId must be a number' });
        return;
      }

      const { userId, status } = req.body || {};
      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required in request body' });
        return;
      }

      const userIdNum = Number(userId);
      if (Number.isNaN(userIdNum)) {
        res.status(400).json({ success: false, error: 'userId must be a number' });
        return;
      }

      const allowedStatuses: ListingStatus[] = ['available', 'reserved', 'sold'];
      if (!status || !allowedStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: `Invalid status. Allowed: ${allowedStatuses.join(', ')}`,
        });
        return;
      }

      try {
        const updated = await ListingUpdate.updateListingForUser({
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
        res.status(403).json({
          success: false,
          error: 'Cannot update availability for this listing',
          details: err.message ?? String(err),
        });
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Unexpected error while updating listing availability',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

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

  // DELETE /api/products/:productId?manufacturerId=2
  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const productIdParam = req.params.productId;
      const manufacturerIdParam = req.query.manufacturerId as string | undefined;

      if (!productIdParam || !manufacturerIdParam) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          details: {
            path: 'productId (in URL path)',
            query: 'manufacturerId (as query parameter)',
            example: '/api/products/1?manufacturerId=2',
          },
        });
        return;
      }

      const productId = Number(productIdParam);
      const manufacturerId = Number(manufacturerIdParam);

      if (Number.isNaN(productId) || Number.isNaN(manufacturerId)) {
        res.status(400).json({
          success: false,
          error: 'productId and manufacturerId must be numbers',
        });
        return;
      }

      const result = await ProductDeletion.deleteProductIfAllowed(
        productId,
        manufacturerId
      );

      if (!result.success) {
        // decide status code based on reason
        if (result.reason === 'Product not found') {
          res.status(404).json({
            success: false,
            error: result.reason,
          });
        } else {
          res.status(409).json({
            success: false,
            error: 'Cannot delete product',
            details: result.reason,
          });
        }
        return;
      }

      res.json({
        success: true,
        message: 'Product registration deleted successfully',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete product',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export default new ProductController();
