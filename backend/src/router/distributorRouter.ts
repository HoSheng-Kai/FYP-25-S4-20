import express from "express";
import DistributorController from '../controller/DistributorController';

const router = express.Router();

// Register product on blockchain
router.post('/register-product', DistributorController.registerProduct.bind(DistributorController));

// Transfer ownership (3-step: propose, accept, execute)
router.post('/update-ownership', DistributorController.updateOwnership.bind(DistributorController));

// Check ownership on blockchain
router.post('/check-ownership', DistributorController.checkOwnership.bind(DistributorController));

// Get ownership history from database
router.post('/ownership-history', DistributorController.getOwnershipHistory.bind(DistributorController));

// Get all products for a user (owned or manufactured)
router.post('/products-by-user', DistributorController.getProductsByUser.bind(DistributorController));

// Cancel a pending transfer
router.post('/cancel-transfer', DistributorController.cancelTransfer.bind(DistributorController));

// End tracking for a product (no further transfers allowed)
router.post('/end-tracking', DistributorController.endTracking.bind(DistributorController));

router.get("/product/:productId", DistributorController.getProductInfo.bind(DistributorController));

export default router;
