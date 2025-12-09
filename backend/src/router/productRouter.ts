import { Router } from 'express';
import productController from '../controller/ProductController';

const router = Router();

// Example:
// GET /api/products/verify?serial=NIKE-AIR-001
router.get('/verify', productController.verifyBySerial.bind(productController));

// Example:
// GET /api/products/history?serial=NIKE-AIR-001
router.get('/history', productController.getTransactionHistory.bind(productController));

// Example:
// POST /api/products/register
router.post('/register', productController.registerProduct.bind(productController));

// Example:
// DELETE /api/products/:productId?manufacturerId=2
router.delete('/:productId', productController.deleteProduct.bind(productController));

// Example:
// GET /api/products/9/qrcode
router.get('/:productId/qrcode', productController.getQrCode.bind(productController));

// Example:
// GET /api/products/9/edit?manufacturerId=2
router.get('/:productId/edit', productController.getProductForEdit.bind(productController));

// Example:
// PUT /api/products/9
// Update product + regenerate QR
router.put('/:productId', productController.updateProduct.bind(productController));

// READ product listings for a manufacturer (includes products without listing)
router.get('/manufacturer/:manufacturerId/listings', productController.getManufacturerProductListings.bind(productController));

export default router;
