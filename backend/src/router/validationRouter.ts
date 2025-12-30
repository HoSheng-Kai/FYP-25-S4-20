import { Router } from 'express';
import ValidationController from '../controller/ValidationController';

const router = Router();

// Validate a single blockchain transaction
router.post('/transaction', ValidationController.validateTransaction);

// Validate an ownership record
router.post('/ownership', ValidationController.validateOwnership);

// Validate entire ownership chain for a product
router.get('/product/:productId/chain', ValidationController.validateProductChain);

// Quick verify if user owns a product
router.post('/verify-owner', ValidationController.verifyOwner);

// Get and verify current owner of a product
router.get('/product/:productId/current-owner', ValidationController.getCurrentOwner);

// Validate a product registration transaction
router.post('/product-registration', ValidationController.validateProductRegistration);

export default router;

/*
Example usage in your main app.ts or index.ts:

import validationRoutes from './routes/validation';
app.use('/api/validate', validationRoutes);

API Endpoints:

1. POST /api/validate/transaction
   Body: { "tx_hash": "your_solana_signature" }
   
2. POST /api/validate/ownership  
   Body: { "ownership_id": 1 }

3. GET /api/validate/product/1/chain
   Validates entire ownership chain for product ID 1

4. POST /api/validate/verify-owner
   Body: { "product_id": 1, "user_id": 8, "user_public_key": "BJmn7rMx..." }

5. GET /api/validate/product/1/current-owner
   Gets current owner with blockchain verification
*/
