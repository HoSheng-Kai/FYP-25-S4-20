import { Request, Response } from 'express';
import { Product } from '../entities/Product';

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
}

export default new ProductController();
