import { Request, Response } from 'express';
import { Product } from '../entities/Product';
import { ProductHistory } from '../entities/ProductHistory';

class ProductController {
  async verifyProduct(req: Request, res: Response): Promise<void> {
    try {
      const serial = req.query.serial as string | undefined;

      if (!serial) {
        res.status(400).json({
          success: false,
          error: "Missing 'serial' query parameter",
          example: "/api/products/verify?serial=NIKE-AIR-001"
        });
        return;
      }

      const product = await Product.findBySerialNo(serial);

      if (!product) {
        res.status(404).json({
          success: false,
          error: "Product not found",
          details: "Serial number does not exist in the database"
        });
        return;
      }

      // Authenticity logic based on schema ENUM
      const isAuthentic = 
        product.status === "verified"
          ? true
          : product.status === "suspicious"
          ? false
          : null; // registered = not verified yet

      res.json({
        success: true,
        data: {
          serial: product.serial_no,
          model: product.model,
          status: product.status,
          registeredOn: product.registered_on,

          registeredBy: product.registered_by,
          currentOwner: product.current_owner,
          latestListing: product.latest_listing,

          isAuthentic
        }
      });

    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err)
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
          example: "/api/products/history?serial=NIKE-AIR-001"
        });
        return;
      }

      const result = await ProductHistory.getBySerial(serial);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Product not found',
          details: 'No product registered with this serial number'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          serial: result.serial_no,
          model: result.model,
          status: result.status,
          registeredOn: result.registered_on,
          registeredBy: result.registered_by,
          history: result.history
        }
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transaction history',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  }
}

export default new ProductController();
