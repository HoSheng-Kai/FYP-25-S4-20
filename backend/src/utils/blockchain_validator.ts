import { connection } from "../schema/solana";
import DistributorEntity from "../entities/Distributor";
import pool from '../schema/database';
import { blockchain_node, ownership } from '../db/table';

interface MemoData {
    from_user_id: number;
    from_public_key: string;
    to_user_id: number;
    to_public_key: string;
    product_id: number;
    created_on: number;
}

interface ValidationResult {
    isValid: boolean;
    errors: string[];
    blockchainData?: MemoData;
    databaseData?: blockchain_node;
}

interface OwnershipChainResult {
    isValid: boolean;
    errors: string[];
    chain: {
        tx_hash: string;
        from_user_id: number;
        to_user_id: number;
        product_id: number;
        blockchainVerified: boolean;
    }[];
    currentOwner?: {
        owner_id: number;
        owner_public_key: string;
        verified: boolean;
    };
}

interface ProductRegistrationMemoData {
    type: 'PRODUCT_REGISTRATION';
    timestamp: string;
    manufacturerId: number;
    serialNo: string;
    productName?: string;
    batchNo?: string;
    category?: string;
    manufactureDate?: string;
    description?: string;
    price?: number | null;
    currency?: string;
}

interface ProductRegistrationValidationResult {
    isValid: boolean;
    errors: string[];
    blockchainData?: ProductRegistrationMemoData;
    transactionInfo?: {
        signature: string;
        blockTime: number | null;
        slot: number;
    };
}

class BlockchainValidator {

    /**
     * Fetch and parse memo data from a Solana transaction
     */
    async getTransactionMemoData(txHash: string): Promise<MemoData | null> {
        try {
            const txDetails = await connection.getTransaction(txHash, {
                maxSupportedTransactionVersion: 0
            });

            if (!txDetails) {
                return null;
            }

            // Extract memo data from transaction
            // Memo program stores data in the instruction data field
            const instructions = txDetails.transaction.message.compiledInstructions;
            
            for (const instruction of instructions) {
                // Look for memo instruction (check program ID index)
                const programId = txDetails.transaction.message.staticAccountKeys[instruction.programIdIndex];
                
                if (programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') {
                    // Decode memo data
                    const memoData = Buffer.from(instruction.data).toString('utf8');
                    return JSON.parse(memoData) as MemoData;
                }
            }

            return null;
        } catch (error) {
            console.error('Error fetching transaction memo:', error);
            return null;
        }
    }

    /**
     * Validate a single blockchain node against Solana
     */
    async validateBlockchainNode(txHash: string): Promise<ValidationResult> {
        const result: ValidationResult = {
            isValid: true,
            errors: []
        };

        try {
            // Get data from PostgreSQL
            const dbResult = await pool.query(
                `SELECT * FROM blockchain_node WHERE tx_hash = $1`,
                [txHash]
            );

            if (dbResult.rows.length === 0) {
                result.isValid = false;
                result.errors.push('Transaction not found in database');
                return result;
            }

            const dbData: blockchain_node = dbResult.rows[0];
            result.databaseData = dbData;

            // Get data from Solana blockchain
            const blockchainData = await this.getTransactionMemoData(txHash);

            if (!blockchainData) {
                result.isValid = false;
                result.errors.push('Transaction not found on Solana blockchain or memo data invalid');
                return result;
            }

            result.blockchainData = blockchainData;

            // Compare database record with blockchain data
            if (dbData.from_user_id !== blockchainData.from_user_id) {
                result.isValid = false;
                result.errors.push(`from_user_id mismatch: DB=${dbData.from_user_id}, Blockchain=${blockchainData.from_user_id}`);
            }

            if (dbData.from_public_key !== blockchainData.from_public_key) {
                result.isValid = false;
                result.errors.push(`from_public_key mismatch: DB=${dbData.from_public_key}, Blockchain=${blockchainData.from_public_key}`);
            }

            if (dbData.to_user_id !== blockchainData.to_user_id) {
                result.isValid = false;
                result.errors.push(`to_user_id mismatch: DB=${dbData.to_user_id}, Blockchain=${blockchainData.to_user_id}`);
            }

            if (dbData.to_public_key !== blockchainData.to_public_key) {
                result.isValid = false;
                result.errors.push(`to_public_key mismatch: DB=${dbData.to_public_key}, Blockchain=${blockchainData.to_public_key}`);
            }

            if (dbData.product_id !== blockchainData.product_id) {
                result.isValid = false;
                result.errors.push(`product_id mismatch: DB=${dbData.product_id}, Blockchain=${blockchainData.product_id}`);
            }

            return result;

        } catch (error: any) {
            result.isValid = false;
            result.errors.push(`Validation error: ${error.message}`);
            return result;
        }
    }

    /**
     * Validate ownership record against blockchain
     */
    async validateOwnership(ownershipId: number): Promise<ValidationResult> {
        const result: ValidationResult = {
            isValid: true,
            errors: []
        };

        try {
            // Get ownership record
            const ownershipResult = await pool.query(
                `SELECT * FROM ownership WHERE ownership_id = $1`,
                [ownershipId]
            );

            if (ownershipResult.rows.length === 0) {
                result.isValid = false;
                result.errors.push('Ownership record not found');
                return result;
            }

            const ownershipData: ownership = ownershipResult.rows[0];

            // Validate the linked blockchain node
            const nodeValidation = await this.validateBlockchainNode(ownershipData.tx_hash);

            if (!nodeValidation.isValid) {
                result.isValid = false;
                result.errors.push(...nodeValidation.errors);
                return result;
            }

            // Verify ownership matches blockchain transaction receiver
            if (nodeValidation.blockchainData) {
                if (ownershipData.owner_id !== nodeValidation.blockchainData.to_user_id) {
                    result.isValid = false;
                    result.errors.push(
                        `Owner mismatch: Ownership owner_id=${ownershipData.owner_id}, ` +
                        `Blockchain to_user_id=${nodeValidation.blockchainData.to_user_id}`
                    );
                }

                if (ownershipData.owner_public_key !== nodeValidation.blockchainData.to_public_key) {
                    result.isValid = false;
                    result.errors.push('Owner public key does not match blockchain transaction receiver');
                }
            }

            return result;

        } catch (error: any) {
            result.isValid = false;
            result.errors.push(`Validation error: ${error.message}`);
            return result;
        }
    }

    /**
     * Validate the entire ownership chain for a product
     */
    async validateProductOwnershipChain(productId: number): Promise<OwnershipChainResult> {
        const result: OwnershipChainResult = {
            isValid: true,
            errors: [],
            chain: []
        };

        try {
            // Get all blockchain nodes for this product, ordered by block_slot
            const nodesResult = await pool.query(
                `SELECT * FROM blockchain_node 
                 WHERE product_id = $1 
                 ORDER BY block_slot ASC, created_on ASC`,
                [productId]
            );

            if (nodesResult.rows.length === 0) {
                result.isValid = false;
                result.errors.push('No blockchain records found for this product');
                return result;
            }

            const nodes: blockchain_node[] = nodesResult.rows;
            let expectedPrevHash: string | null = null;

            // Validate chain integrity
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                
                // Check prev_tx_hash chain
                if (node.prev_tx_hash !== expectedPrevHash) {
                    result.isValid = false;
                    result.errors.push(
                        `Chain broken at tx ${node.tx_hash}: ` +
                        `expected prev_hash=${expectedPrevHash}, got=${node.prev_tx_hash}`
                    );
                }

                // Validate against blockchain
                const nodeValidation = await this.validateBlockchainNode(node.tx_hash);

                result.chain.push({
                    tx_hash: node.tx_hash,
                    from_user_id: node.from_user_id,
                    to_user_id: node.to_user_id,
                    product_id: node.product_id,
                    blockchainVerified: nodeValidation.isValid
                });

                if (!nodeValidation.isValid) {
                    result.isValid = false;
                    result.errors.push(`Node ${node.tx_hash} failed validation: ${nodeValidation.errors.join(', ')}`);
                }

                // Verify transfer continuity (receiver of tx N should be sender of tx N+1)
                if (i > 0) {
                    const prevNode = nodes[i - 1];
                    if (node.from_user_id !== prevNode.to_user_id) {
                        result.isValid = false;
                        result.errors.push(
                            `Transfer continuity broken: tx ${prevNode.tx_hash} sent to user ${prevNode.to_user_id}, ` +
                            `but tx ${node.tx_hash} sent from user ${node.from_user_id}`
                        );
                    }
                }

                expectedPrevHash = node.tx_hash;
            }

            // Get and validate current owner
            const currentOwnerResult = await pool.query(
                `SELECT * FROM ownership 
                 WHERE product_id = $1 AND end_on IS NULL`,
                [productId]
            );

            if (currentOwnerResult.rows.length === 1) {
                const currentOwner: ownership = currentOwnerResult.rows[0];
                const lastNode = nodes[nodes.length - 1];

                // Current owner should match the last transaction's receiver
                const ownerValid = currentOwner.owner_id === lastNode.to_user_id &&
                                   currentOwner.owner_public_key === lastNode.to_public_key;

                result.currentOwner = {
                    owner_id: currentOwner.owner_id,
                    owner_public_key: currentOwner.owner_public_key,
                    verified: ownerValid
                };

                if (!ownerValid) {
                    result.isValid = false;
                    result.errors.push(
                        `Current owner mismatch: ownership shows user ${currentOwner.owner_id}, ` +
                        `but last blockchain tx shows user ${lastNode.to_user_id}`
                    );
                }
            } else if (currentOwnerResult.rows.length > 1) {
                result.isValid = false;
                result.errors.push('Multiple active ownership records found (data integrity issue)');
            } else {
                result.errors.push('No active ownership record found');
            }

            return result;

        } catch (error: any) {
            result.isValid = false;
            result.errors.push(`Chain validation error: ${error.message}`);
            return result;
        }
    }

    /**
     * Quick ownership verification - check if a user owns a product
     */
    async verifyCurrentOwner(productId: number, userId: number, userPublicKey: string): Promise<{
        isOwner: boolean;
        verified: boolean;
        message: string;
    }> {
        try {
            // Check database ownership
            const ownershipResult = await pool.query(
                `SELECT * FROM ownership 
                 WHERE product_id = $1 AND end_on IS NULL`,
                [productId]
            );

            if (ownershipResult.rows.length === 0) {
                return {
                    isOwner: false,
                    verified: false,
                    message: 'No active ownership found for this product'
                };
            }

            const ownership: ownership = ownershipResult.rows[0];

            if (ownership.owner_id !== userId || ownership.owner_public_key !== userPublicKey) {
                return {
                    isOwner: false,
                    verified: true,
                    message: 'User is not the current owner'
                };
            }

            // Verify against blockchain
            const validation = await this.validateBlockchainNode(ownership.tx_hash);

            if (!validation.isValid) {
                return {
                    isOwner: true,
                    verified: false,
                    message: 'Ownership record exists but blockchain verification failed'
                };
            }

            // Confirm blockchain shows this user as receiver
            if (validation.blockchainData?.to_user_id === userId &&
                validation.blockchainData?.to_public_key === userPublicKey) {
                return {
                    isOwner: true,
                    verified: true,
                    message: 'Ownership verified on blockchain'
                };
            }

            return {
                isOwner: true,
                verified: false,
                message: 'Database ownership does not match blockchain record'
            };

        } catch (error: any) {
            return {
                isOwner: false,
                verified: false,
                message: `Verification error: ${error.message}`
            };
        }
    }

    /**
     * Fetch and parse product registration memo data from a Solana transaction
     */
    async getProductRegistrationMemoData(txHash: string): Promise<{
        memoData: ProductRegistrationMemoData | null;
        transactionInfo: { signature: string; blockTime: number | null; slot: number } | null;
    }> {
        try {
            const txDetails = await connection.getTransaction(txHash, {
                maxSupportedTransactionVersion: 0
            });

            if (!txDetails) {
                return { memoData: null, transactionInfo: null };
            }

            const transactionInfo = {
                signature: txHash,
                blockTime: txDetails.blockTime,
                slot: txDetails.slot
            };

            const instructions = txDetails.transaction.message.compiledInstructions;
            
            for (const instruction of instructions) {
                const programId = txDetails.transaction.message.staticAccountKeys[instruction.programIdIndex];
                
                if (programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') {
                    const memoData = Buffer.from(instruction.data).toString('utf8');
                    const parsed = JSON.parse(memoData);
                    
                    if (parsed.type === 'PRODUCT_REGISTRATION') {
                        return { 
                            memoData: parsed as ProductRegistrationMemoData, 
                            transactionInfo 
                        };
                    }
                }
            }

            return { memoData: null, transactionInfo };
        } catch (error) {
            console.error('Error fetching product registration memo:', error);
            return { memoData: null, transactionInfo: null };
        }
    }

    /**
     * Validate a product registration transaction on the blockchain
     */
    async validateProductRegistration(txHash: string, expectedData?: {
        manufacturerId?: number;
        serialNo?: string;
        productName?: string;
    }): Promise<ProductRegistrationValidationResult> {
        const result: ProductRegistrationValidationResult = {
            isValid: true,
            errors: []
        };

        try {
            const { memoData, transactionInfo } = await this.getProductRegistrationMemoData(txHash);

            if (!transactionInfo) {
                result.isValid = false;
                result.errors.push('Transaction not found on Solana blockchain');
                return result;
            }

            result.transactionInfo = transactionInfo;

            if (!memoData) {
                result.isValid = false;
                result.errors.push('Transaction does not contain valid product registration memo data');
                return result;
            }

            if (memoData.type !== 'PRODUCT_REGISTRATION') {
                result.isValid = false;
                result.errors.push(`Invalid memo type: expected PRODUCT_REGISTRATION, got ${memoData.type}`);
                return result;
            }

            result.blockchainData = memoData;

            if (expectedData) {
                if (expectedData.manufacturerId !== undefined && 
                    memoData.manufacturerId !== expectedData.manufacturerId) {
                    result.isValid = false;
                    result.errors.push(
                        `manufacturerId mismatch: expected ${expectedData.manufacturerId}, got ${memoData.manufacturerId}`
                    );
                }

                if (expectedData.serialNo !== undefined && 
                    memoData.serialNo !== expectedData.serialNo) {
                    result.isValid = false;
                    result.errors.push(
                        `serialNo mismatch: expected ${expectedData.serialNo}, got ${memoData.serialNo}`
                    );
                }

                if (expectedData.productName !== undefined && 
                    memoData.productName !== expectedData.productName) {
                    result.isValid = false;
                    result.errors.push(
                        `productName mismatch: expected ${expectedData.productName}, got ${memoData.productName}`
                    );
                }
            }

            return result;

        } catch (error: any) {
            result.isValid = false;
            result.errors.push(`Validation error: ${error.message}`);
            return result;
        }
    }
}

export default new BlockchainValidator();