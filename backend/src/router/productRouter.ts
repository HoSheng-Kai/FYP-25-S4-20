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

export default router;
