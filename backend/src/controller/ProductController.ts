// src/controller/ProductController.ts
import { Request, Response } from 'express';
import { Product } from '../entities/Product';
import { ProductRegistration } from '../entities/ProductRegistration';
import { ProductHistory, ProductHistoryResult } from '../entities/ProductHistory';
import { ProductDeletion } from '../entities/ProductDeletion';
import { ProductQr } from '../entities/ProductQr';
import { ProductUpdate } from '../entities/ProductUpdate';
import { ManufacturerProductListing } from '../entities/ManufacturerProductListing';
import pool from '../schema/database';

type TransactionEventType = 'manufactured' | 'shipped' | 'transferred' | 'sold';

interface TransactionParty {
  userId: number | null;
  name: string | null;
  role: string | null;
}

interface TransactionEvent {
  type: TransactionEventType;
  from: TransactionParty | null;
  to: TransactionParty | null;
  dateTime: string;    // ISO string
  location: string | null; // placeholder – your schema has no location yet
}

function buildTransactionEvents(result: ProductHistoryResult): TransactionEvent[] {
  const events: TransactionEvent[] = [];

  // 1) manufactured event from registered_on + registered_by
  if (result.registered_by && result.registered_on) {
    events.push({
      type: 'manufactured',
      from: null,
      to: {
        userId: result.registered_by.user_id,
        name: result.registered_by.username,
        role: result.registered_by.role_id,
      },
      dateTime: result.registered_on.toISOString(),
      location: null,
    });
  }

  const chain = result.ownership_chain;

  for (let i = 0; i < chain.length; i++) {
    const curr = chain[i];
    const prev = i === 0 ? null : chain[i - 1];

    const fromUser: TransactionParty | null =
      prev != null
        ? {
            userId: prev.owner_id,
            name: prev.owner_username,
            role: prev.owner_role,
          }
        : result.registered_by
        ? {
            userId: result.registered_by.user_id,
            name: result.registered_by.username,
            role: result.registered_by.role_id,
          }
        : null;

    const toUser: TransactionParty = {
      userId: curr.owner_id,
      name: curr.owner_username,
      role: curr.owner_role,
    };

    let type: TransactionEventType;

    if (!fromUser) {
      type = 'manufactured';
    } else if (fromUser.role === 'manufacturer' && toUser.role === 'distributor') {
      type = 'shipped';
    } else if (toUser.role === 'consumer') {
      type = 'sold';
    } else {
      type = 'transferred';
    }

    events.push({
      type,
      from: fromUser,
      to: toUser,
      dateTime: curr.start_on.toISOString(),
      location: null, // fill later if you add location to schema
    });
  }

  // they should already be in order, but just in case:
  events.sort((a, b) => a.dateTime.localeCompare(b.dateTime));

  return events;
}


class ProductController {
  // POST /api/products/register
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
        currency,
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
        const result = await ProductRegistration.registerProduct({
          manufacturerId,
          serialNo,
          productName,
          batchNo,
          category,
          manufactureDate,
          description,
          price,
          currency,
        });

        res.status(201).json({
          success: true,
          data: result,
        });
      } catch (err: any) {
        if (err?.code === '23505') {
          res.status(409).json({
            success: false,
            error: 'Serial number already exists',
            details: 'Choose a unique serial_no',
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

  // GET /api/products/:productId/qrcode
  async getQrCode(req: Request, res: Response): Promise<void> {
    try {
      const productIdParam = req.params.productId;
      const productId = Number(productIdParam);

      if (Number.isNaN(productId)) {
        res.status(400).json({
          success: false,
          error: 'productId must be a number',
        });
        return;
      }

      const buffer = await ProductQr.getQrCodeById(productId);

      if (!buffer) {
        res.status(404).json({
          success: false,
          error: 'QR code not found for this product',
        });
        return;
      }

      res.setHeader('Content-Type', 'image/png');
      res.send(buffer);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch QR code',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // PUT /api/products/:productId
  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const productId = Number(req.params.productId);

      if (Number.isNaN(productId)) {
        res.status(400).json({
          success: false,
          error: 'productId must be a number',
        });
        return;
      }

      const {
        manufacturerId,
        serialNo,
        productName,
        batchNo,
        category,
        manufactureDate,
        description,
      } = req.body || {};

      if (!manufacturerId) {
        res.status(400).json({
          success: false,
          error: 'manufacturerId is required in body',
        });
        return;
      }

      const apiBase = process.env.API_BASE_URL || 'http://localhost:3000';

      try {
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

            // frontend can immediately refresh this image
            qrImageUrl: `${apiBase}/api/products/${updated.product_id}/qrcode`,
          },
        });
      } catch (err: any) {
        res.status(400).json({
          success: false,
          error: 'Failed to update product',
          details: err instanceof Error ? err.message : String(err),
        });
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Unexpected error while updating product',
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

      if (Number.isNaN(productId)) {
        res.status(400).json({ success: false, error: 'productId must be a number' });
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
      if (Number.isNaN(manufacturerId)) {
        res.status(400).json({
          success: false,
          error: "'manufacturerId' must be a number",
        });
        return;
      }

      // Read product from DB
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
          p.registered_by
        FROM fyp_25_s4_20.product p
        WHERE p.product_id = $1;
        `,
        [productId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      const p = result.rows[0];

      if (p.registered_by !== manufacturerId) {
        res.status(403).json({
          success: false,
          error: 'You are not allowed to edit this product',
        });
        return;
      }

      const apiBase = process.env.API_BASE_URL || 'http://localhost:3000';

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
        error: 'Failed to load product for editing',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // GET /api/products/verify?serial=NIKE-AIR-001
  async verifyBySerial(req: Request, res: Response): Promise<void> {
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

      const product = await Product.findBySerialNo(serial);

      if (!product) {
        res.status(404).json({
          success: false,
          error: 'Product not found',
          details: 'No product registered with this serial number',
        });
        return;
      }

      const isAuthentic =
        product.status === 'verified'
          ? true
          : product.status === 'suspicious'
          ? false
          : null;

      res.json({
        success: true,
        data: {
          productId: product.product_id,
          productName: product.model,
          serialNumber: product.serial_no,
          batchNumber: product.batch_no,
          category: product.category,
          manufactureDate: product.manufacture_date,
          productDescription: product.description,
          status: product.status,
          registeredOn: product.registered_on,
          registeredBy: product.registered_by,
          currentOwner: product.current_owner,
          price: product.latest_listing?.price ?? null,
          currency: product.latest_listing?.currency ?? null,
          isAuthentic,
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
  async getTransactionHistory(req: Request, res: Response): Promise<void> {
    try {
      const serial = req.query.serial as string | undefined;

      if (!serial) {
        res.status(400).json({
          success: false,
          error: "Missing 'serial' query parameter",
          example: "/api/products/history?serial=NIKE-AIR-001",
        });
        return;
      }

      const result = await ProductHistory.getBySerial(serial);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Product not found',
          details: 'No product registered with this serial number',
        });
        return;
      }

      const events = buildTransactionEvents(result);

      res.json({
        success: true,
        data: {
          productId: result.product_id,
          serialNumber: result.serial_no,
          productName: result.model,
          status: result.status,
          registeredOn: result.registered_on,
          // you can include registeredBy if needed in UI
          registeredBy: result.registered_by,
          events, // 👈 this is what your Transaction History Page will use
        },
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
