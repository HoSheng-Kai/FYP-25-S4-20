import { Request, Response } from "express";
import BlockchainValidator from "../utils/blockchain_validator";

class ValidationController {
    
    /**
     * POST /api/validate/transaction
     * Validate a single blockchain transaction
     * Body: { tx_hash: string }
     */
    async validateTransaction(req: Request, res: Response) {
        try {
            const { tx_hash } = req.body;

            if (!tx_hash) {
                return res.status(400).json({
                    success: false,
                    error: 'tx_hash is required'
                });
            }

            const result = await BlockchainValidator.validateBlockchainNode(tx_hash);

            res.json({
                success: true,
                validation: result
            });

        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: 'Validation failed',
                details: error.message
            });
        }
    }

    /**
     * POST /api/validate/ownership
     * Validate an ownership record against blockchain
     * Body: { ownership_id: number }
     */
    async validateOwnership(req: Request, res: Response) {
        try {
            const { ownership_id } = req.body;

            if (!ownership_id) {
                return res.status(400).json({
                    success: false,
                    error: 'ownership_id is required'
                });
            }

            const result = await BlockchainValidator.validateOwnership(ownership_id);

            res.json({
                success: true,
                validation: result
            });

        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: 'Validation failed',
                details: error.message
            });
        }
    }

    /**
     * GET /api/validate/product/:productId/chain
     * Validate the entire ownership chain for a product
     */
    async validateProductChain(req: Request, res: Response) {
        try {
            const productId = parseInt(req.params.productId);

            if (isNaN(productId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid product_id is required'
                });
            }

            const result = await BlockchainValidator.validateProductOwnershipChain(productId);

            res.json({
                success: true,
                product_id: productId,
                validation: result
            });

        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: 'Chain validation failed',
                details: error.message
            });
        }
    }

    /**
     * POST /api/validate/verify-owner
     * Quick check if a user owns a product (with blockchain verification)
     * Body: { product_id: number, user_id: number, user_public_key: string }
     */
    async verifyOwner(req: Request, res: Response) {
        try {
            const { product_id, user_id, user_public_key } = req.body;

            if (!product_id || !user_id || !user_public_key) {
                return res.status(400).json({
                    success: false,
                    error: 'product_id, user_id, and user_public_key are required'
                });
            }

            const result = await BlockchainValidator.verifyCurrentOwner(
                product_id,
                user_id,
                user_public_key
            );

            res.json({
                success: true,
                product_id,
                user_id,
                ...result
            });

        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: 'Verification failed',
                details: error.message
            });
        }
    }

    /**
     * GET /api/validate/product/:productId/current-owner
     * Get and verify the current owner of a product
     */
    async getCurrentOwner(req: Request, res: Response) {
        try {
            const productId = parseInt(req.params.productId);

            if (isNaN(productId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid product_id is required'
                });
            }

            const chainResult = await BlockchainValidator.validateProductOwnershipChain(productId);

            if (!chainResult.currentOwner) {
                return res.status(404).json({
                    success: false,
                    error: 'No current owner found for this product'
                });
            }

            res.json({
                success: true,
                product_id: productId,
                currentOwner: chainResult.currentOwner,
                chainValid: chainResult.isValid,
                chainErrors: chainResult.errors
            });

        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: 'Failed to get current owner',
                details: error.message
            });
        }
    }

    /**
     * POST /api/validate/product-registration
     * Validate a product registration transaction on the blockchain
     * Body: { tx_hash: string, manufacturerId?: number, serialNo?: string, productName?: string }
     */
    async validateProductRegistration(req: Request, res: Response) {
        try {
            const { tx_hash, manufacturerId, serialNo, productName } = req.body;

            if (!tx_hash) {
                return res.status(400).json({
                    success: false,
                    error: 'tx_hash is required'
                });
            }

            const expectedData = {
                ...(manufacturerId !== undefined && { manufacturerId }),
                ...(serialNo !== undefined && { serialNo }),
                ...(productName !== undefined && { productName })
            };

            const result = await BlockchainValidator.validateProductRegistration(
                tx_hash,
                Object.keys(expectedData).length > 0 ? expectedData : undefined
            );

            res.json({
                success: true,
                validation: result
            });

        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: 'Product registration validation failed',
                details: error.message
            });
        }
    }
}

export default new ValidationController();
