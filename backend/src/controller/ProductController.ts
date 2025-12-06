// src/controller/ProductController.ts
import { Request, Response } from 'express';
import { Product } from '../entities/Product';
import { ProductRegistration } from '../entities/ProductRegistration';
import { ProductHistory } from '../entities/ProductHistory';
import { ProductDeletion } from '../entities/ProductDeletion';
import { ProductQr } from '../entities/ProductQR'

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

  async getTransactionHistory(req: Request, res: Response): Promise<void> {
    try {
      const serial = req.query.serial as string | undefined;

      if (!serial) {
        res.status(400).json({
          success: false,
          error: "Missing 'serial' query parameter",
          example: '/api/products/history?serial=NIKE-AIR-001',
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

      res.json({
        success: true,
        data: {
          productId: result.product_id,
          serialNumber: result.serial_no,
          productName: result.model,
          batchNumber: result.batch_no,
          category: result.category,
          manufactureDate: result.manufacture_date,
          productDescription: result.description,
          status: result.status,
          registeredOn: result.registered_on,
          registeredBy: result.registered_by,
          history: result.history,
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
