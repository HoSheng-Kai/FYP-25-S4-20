import express from "express";
import DistributorController from '../controller/DistributorController';

const router = express.Router();

// Register product on blockchain
router.post('/register-product', DistributorController.registerProduct.bind(DistributorController));

// Transfer ownership - 3-step wallet-based flow (no private keys required)
// Step 1: Seller proposes transfer (after signing with wallet)
router.post('/propose-transfer', DistributorController.proposeTransfer.bind(DistributorController));

// Step 2: Buyer accepts transfer (after signing with wallet)
router.post('/accept-transfer', DistributorController.acceptTransfer.bind(DistributorController));

// Step 3: Seller executes transfer (after signing with wallet) - updates ownership in DB
router.post('/execute-transfer', DistributorController.executeTransfer.bind(DistributorController));

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
