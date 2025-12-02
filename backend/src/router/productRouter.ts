import { Router } from 'express';
import productController from '../controller/ProductController';

const router = Router();

// Example:
// GET /api/products/verify?serial=NIKE-AIR-001
router.get('/verify', productController.verifyProduct.bind(productController));

export default router;
