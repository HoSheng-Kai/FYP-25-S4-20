import { Router } from 'express';
import productController from '../controller/ProductController';

const router = Router();

// Example:
// GET /api/products/verify?serial=NIKE-AIR-001
router.get('/verify', productController.verifyProduct.bind(productController));

// New: transaction history
// GET /api/products/history?serial=NIKE-AIR-001
router.get('/history', productController.getTransactionHistory.bind(productController));

export default router;
