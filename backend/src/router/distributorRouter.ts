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

export default router;
