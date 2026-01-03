import DistributorEntity from "../entities/Distributor";
import { Request, Response } from "express";
import { connection, airdropSol } from "../schema/solana";
import { PublicKey, Keypair } from '@solana/web3.js';
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import bs58 from 'bs58';
import crypto from 'crypto';
import pool from '../schema/database';
import idlJson from '../idl/product_registry.json';
import { blockchain_node, ownership } from "../db/table";

const PROGRAM_ID = new PublicKey((idlJson as any).address);
const PRODUCT_SEED = Buffer.from("product");
const TRANSFER_SEED = Buffer.from("transfer");

// Helper functions for smart contract
function sha256(input: string): Uint8Array {
    return new Uint8Array(crypto.createHash("sha256").update(input).digest());
}

function deriveProductPda(manufacturer: PublicKey, serialNo: string): [PublicKey, number, Uint8Array] {
    const serialHash = sha256(serialNo);
    const [pda, bump] = PublicKey.findProgramAddressSync(
        [PRODUCT_SEED, manufacturer.toBuffer(), Buffer.from(serialHash)],
        PROGRAM_ID
    );
    return [pda, bump, serialHash];
}

function deriveTransferPda(productPda: PublicKey, fromOwner: PublicKey, toOwner: PublicKey): [PublicKey, number] {
    const [pda, bump] = PublicKey.findProgramAddressSync(
        [TRANSFER_SEED, productPda.toBuffer(), fromOwner.toBuffer(), toOwner.toBuffer()],
        PROGRAM_ID
    );
    return [pda, bump];
}

class DistributorController {

    async registerProduct(req: Request, res: Response) {
        const { manufacturer_id, serial_no, product_name, batch_no, category, manufacture_date, description, product_id, tx_hash, product_pda } = req.body;

        // If product_id is provided, register existing product; otherwise require manufacturer_id and serial_no
        if (!product_id && (!manufacturer_id || !serial_no)) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: provide either product_id (for existing product) or manufacturer_id + serial_no (for new product)"
            });
        }

        try {
            let manufacturer: any;
            let actualSerialNo: string;
            let actualProductName: string | null = product_name || null;
            let actualBatchNo: string | null = batch_no || null;
            let actualCategory: string | null = category || null;
            let actualManufactureDate: string | null = manufacture_date || null;
            let actualDescription: string | null = description || null;
            let existingProductId: number | null = null;
            let actualManufacturerId: number;

            if (product_id) {
                // Registering an existing product from database
                const existingProduct = await DistributorEntity.getProductById(product_id);
                if (!existingProduct) {
                    return res.status(404).json({
                        success: false,
                        error: `Product not found: ${product_id}`
                    });
                }

                // Check if already registered on-chain (has both pda and tx_hash)
                if (existingProduct.product_pda && existingProduct.tx_hash) {
                    return res.status(409).json({
                        success: false,
                        error: "Product already registered on-chain",
                        product_pda: existingProduct.product_pda
                    });
                }

                existingProductId = product_id;
                actualSerialNo = existingProduct.serial_no;
                actualManufacturerId = existingProduct.registered_by;

                // Get manufacturer from the product's registered_by field
                manufacturer = await DistributorEntity.getUserById(existingProduct.registered_by);
                if (!manufacturer) {
                    return res.status(404).json({
                        success: false,
                        error: `Manufacturer not found for product: ${product_id}`
                    });
                }
            } else {
                // Registering a new product
                actualSerialNo = serial_no;
                actualManufacturerId = manufacturer_id;

                manufacturer = await DistributorEntity.getUserById(manufacturer_id);
                if (!manufacturer) {
                    return res.status(404).json({
                        success: false,
                        error: `Manufacturer not found: ${manufacturer_id}`
                    });
                }
            }

            // If tx_hash and product_pda provided, just confirm/update the database (like ProductController.confirmProductOnChain)
            if (tx_hash && product_pda) {
                let finalProductId: number;

                if (existingProductId) {
                    await DistributorEntity.updateProductPda(existingProductId, product_pda, tx_hash);
                    finalProductId = existingProductId;
                } else {
                    finalProductId = await DistributorEntity.upsertProduct({
                        manufacturer_id: actualManufacturerId,
                        serial_no: actualSerialNo,
                        product_name: actualProductName,
                        batch_no: actualBatchNo,
                        category: actualCategory,
                        manufacture_date: actualManufactureDate,
                        description: actualDescription,
                        product_pda: product_pda,
                        tx_hash: tx_hash
                    });
                }

                return res.json({
                    success: true,
                    data: {
                        product_id: finalProductId,
                        manufacturer: manufacturer.username,
                        serial_no: actualSerialNo,
                        product_pda: product_pda,
                        tx_hash: tx_hash,
                        confirmed: true
                    }
                });
            }

            // No tx_hash provided - do full blockchain registration
            // 2. Create keypair from DB private key
            const manufacturerKeypair = Keypair.fromSecretKey(bs58.decode(manufacturer.private_key));

            // 3. Derive product PDA
            const [productPdaDerived, bump, serialHash] = deriveProductPda(manufacturerKeypair.publicKey, actualSerialNo);

            // 4. Check if product already exists on-chain
            const existingAccount = await connection.getAccountInfo(productPdaDerived);
            if (existingAccount) {
                // If registering existing product, update the database with the PDA
                if (existingProductId) {
                    await DistributorEntity.updateProductPda(existingProductId, productPdaDerived.toBase58(), null);
                    return res.status(409).json({
                        success: false,
                        error: "Product already registered on-chain (database updated with PDA)",
                        product_id: existingProductId,
                        product_pda: productPdaDerived.toBase58()
                    });
                }
                return res.status(409).json({
                    success: false,
                    error: "Product already registered on-chain",
                    product_pda: productPdaDerived.toBase58()
                });
            }

            // 5. Airdrop SOL if needed
            const minBalance = 0.05 * 1e9;

            let balance = await connection.getBalance(manufacturerKeypair.publicKey);
            if (balance < minBalance) {
                try {
                    await airdropSol(manufacturer.private_key, 0.1 * 1e9);
                    balance = await connection.getBalance(manufacturerKeypair.publicKey);
                } catch (e: any) {}
            }
            if (balance < minBalance) {
                return res.status(400).json({
                    success: false,
                    error: "Insufficient SOL balance for manufacturer",
                    details: `Balance: ${balance / 1e9} SOL. Fund wallet: ${manufacturerKeypair.publicKey.toBase58()}`
                });
            }

            // 6. Create metadata
            const metadata = {
                serialNo: actualSerialNo,
                productName: actualProductName,
                category: actualCategory,
                batchNo: actualBatchNo,
                manufactureDate: actualManufactureDate,
                description: actualDescription
            };

            const metadataJson = JSON.stringify(metadata);
            const metadataHash = new Uint8Array(crypto.createHash("sha256").update(metadataJson).digest());
            const metadataHashHex = Buffer.from(metadataHash).toString("hex");

            const baseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
            const metadataUri = `${baseUrl}/metadata/${metadataHashHex}.json`;

            // 7. Create Anchor provider and program
            const wallet = {
                publicKey: manufacturerKeypair.publicKey,
                signTransaction: async (tx: any) => { tx.sign(manufacturerKeypair); return tx; },
                signAllTransactions: async (txs: any) => { txs.forEach((tx: any) => tx.sign(manufacturerKeypair)); return txs; },
            };
            const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
            const program = new Program(idlJson as unknown as Idl, provider);

            // 8. Call register_product on smart contract
            const txResult = await program.methods
                .registerProduct(
                    Array.from(serialHash),
                    Array.from(metadataHash),
                    metadataUri
                )
                .accounts({
                    product: productPdaDerived,
                    manufacturer: manufacturerKeypair.publicKey,
                })
                .signers([manufacturerKeypair])
                .rpc();

            // 9. Insert/update product in database
            let finalProductId: number;

            if (existingProductId) {
                // Update existing product with blockchain data
                await DistributorEntity.updateProductPda(existingProductId, productPdaDerived.toBase58(), txResult);
                finalProductId = existingProductId;
            } else {
                // Insert new product
                finalProductId = await DistributorEntity.upsertProduct({
                    manufacturer_id: actualManufacturerId,
                    serial_no: actualSerialNo,
                    product_name: actualProductName,
                    batch_no: actualBatchNo,
                    category: actualCategory,
                    manufacture_date: actualManufactureDate,
                    description: actualDescription,
                    product_pda: productPdaDerived.toBase58(),
                    tx_hash: txResult
                });
            }

            // 10. Create initial blockchain_node and ownership records (for ownership transfer to work)
            const currentDate = new Date();

            // Get the block slot from the confirmed transaction
            const txInfo = await connection.getTransaction(txResult, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
            const blockSlot = txInfo?.slot ?? 0;

            // Create blockchain_node for the registration transaction
            const blockchainNodeData: blockchain_node = {
                tx_hash: txResult,
                prev_tx_hash: null!, // First transaction, no previous
                from_user_id: actualManufacturerId,
                from_public_key: manufacturer.public_key,
                to_user_id: actualManufacturerId, // Manufacturer is initial owner
                to_public_key: manufacturer.public_key,
                product_id: finalProductId,
                block_slot: blockSlot,
                created_on: currentDate
            };

            await DistributorEntity.createBlockchainNode(blockchainNodeData);

            // Create initial ownership record (manufacturer owns the product initially)
            const initialOwnership: ownership = {
                owner_id: actualManufacturerId,
                owner_public_key: manufacturer.public_key,
                product_id: finalProductId,
                start_on: currentDate,
                end_on: null,
                tx_hash: txResult
            };

            await DistributorEntity.createOwnership(initialOwnership);

            res.json({
                success: true,
                data: {
                    product_id: finalProductId,
                    manufacturer: manufacturer.username,
                    serial_no: actualSerialNo,
                    product_pda: productPdaDerived.toBase58(),
                    tx_hash: txResult,
                    metadata_uri: metadataUri,
                    metadata_hash: metadataHashHex,
                    initial_owner: {
                        user_id: actualManufacturerId,
                        username: manufacturer.username,
                        public_key: manufacturer.public_key
                    }
                }
            });

        } catch (error: any) {
            console.error("Register product failed:", error);
            res.status(500).json({
                success: false,
                error: "Failed to register product on-chain",
                details: error.message,
                logs: error.logs || null
            });
        }
    }

    async updateOwnership(req: Request, res: Response) {
        const { from_user_id, to_user_id, product_id } = req.body;

        if (!from_user_id || !to_user_id || !product_id) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: from_user_id, to_user_id, product_id"
            });
        }

        try {

            // 1. Get users and product from database
            const fromUser = await DistributorEntity.getUserById(from_user_id);
            const toUser = await DistributorEntity.getUserById(to_user_id);
            const product = await DistributorEntity.getProductById(product_id);

            if (!fromUser || !toUser || !product) {
                return res.status(404).json({
                    success: false,
                    error: `Missing data: fromUser=${!!fromUser}, toUser=${!!toUser}, product=${!!product}`
                });
            }


            // 2. Create keypairs
            const fromKeypair = Keypair.fromSecretKey(bs58.decode(fromUser.private_key));
            const toKeypair = Keypair.fromSecretKey(bs58.decode(toUser.private_key));
            const toPublicKey = new PublicKey(toUser.public_key);


            // 3. Get or derive product PDA
            let productPda: PublicKey;

            if (product.product_pda) {
                productPda = new PublicKey(product.product_pda);
            } else {
                const manufacturer = await DistributorEntity.getUserById(product.registered_by);
                if (!manufacturer) {
                    return res.status(404).json({
                        success: false,
                        error: `Manufacturer not found for product ${product_id}`
                    });
                }
                const manufacturerPubkey = new PublicKey(manufacturer.public_key);
                const [derivedPda] = deriveProductPda(manufacturerPubkey, product.serial_no);
                productPda = derivedPda;
            }

            // 4. Check if product exists on-chain
            const productAccount = await connection.getAccountInfo(productPda);
            if (!productAccount) {
                return res.status(400).json({
                    success: false,
                    error: "Product not found on-chain. Register the product first.",
                    productPda: productPda.toBase58()
                });
            }

            // 5. Airdrop SOL if needed
            const minBalance = 0.05 * 1e9;

            let fromBalance = await connection.getBalance(fromKeypair.publicKey);
            if (fromBalance < minBalance) {
                try {
                    await airdropSol(fromUser.private_key, 0.5 * 1e9);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    fromBalance = await connection.getBalance(fromKeypair.publicKey);
                } catch (e: any) {}
            }
            if (fromBalance < minBalance) {
                return res.status(400).json({
                    success: false,
                    error: "Insufficient SOL balance for from_user",
                    details: `Balance: ${fromBalance / 1e9} SOL. Fund wallet: ${fromKeypair.publicKey.toBase58()}`
                });
            }

            let toBalance = await connection.getBalance(toKeypair.publicKey);
            if (toBalance < minBalance) {
                try {
                    await airdropSol(toUser.private_key, 0.5 * 1e9);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    toBalance = await connection.getBalance(toKeypair.publicKey);
                } catch (e: any) {}
            }
            if (toBalance < minBalance) {
                return res.status(400).json({
                    success: false,
                    error: "Insufficient SOL balance for to_user",
                    details: `Balance: ${toBalance / 1e9} SOL. Fund wallet: ${toKeypair.publicKey.toBase58()}`
                });
            }

            // 6. Create Anchor provider and program for from_user
            const fromWallet = {
                publicKey: fromKeypair.publicKey,
                signTransaction: async (tx: any) => { tx.sign(fromKeypair); return tx; },
                signAllTransactions: async (txs: any) => { txs.forEach((tx: any) => tx.sign(fromKeypair)); return txs; },
            };
            const fromProvider = new AnchorProvider(connection, fromWallet as any, { commitment: "confirmed" });
            const fromProgram = new Program(idlJson as unknown as Idl, fromProvider);

            // 7. Derive transfer PDA
            const [transferPda] = deriveTransferPda(productPda, fromKeypair.publicKey, toPublicKey);

            // STEP 1: Propose Transfer
            const proposeTx = await fromProgram.methods
                .proposeTransfer()
                .accounts({
                    fromOwner: fromKeypair.publicKey,
                    product: productPda,
                    toOwner: toPublicKey,
                    transferRequest: transferPda,
                })
                .signers([fromKeypair])
                .rpc();

            // STEP 2: Accept Transfer (using to_user's keypair)
            const toWallet = {
                publicKey: toKeypair.publicKey,
                signTransaction: async (tx: any) => { tx.sign(toKeypair); return tx; },
                signAllTransactions: async (txs: any) => { txs.forEach((tx: any) => tx.sign(toKeypair)); return txs; },
            };
            const toProvider = new AnchorProvider(connection, toWallet as any, { commitment: "confirmed" });
            const toProgram = new Program(idlJson as unknown as Idl, toProvider);

            const acceptTx = await toProgram.methods
                .acceptTransfer()
                .accounts({
                    toOwner: toKeypair.publicKey,
                    transferRequest: transferPda,
                })
                .signers([toKeypair])
                .rpc();

            // STEP 3: Execute Transfer
            const executeTx = await fromProgram.methods
                .executeTransfer()
                .accounts({
                    fromOwner: fromKeypair.publicKey,
                    product: productPda,
                    transferRequest: transferPda,
                })
                .signers([fromKeypair])
                .rpc();

            // Update database
            let latest_block = await DistributorEntity.viewLatestBlockchainNode(product_id);
            let prev_owner_hash = null;
            let current_date = new Date();

            if (latest_block != null) {
                prev_owner_hash = latest_block.tx_hash;
                let prev_owner = await DistributorEntity.getOwnership(prev_owner_hash);
                if (prev_owner) {
                    prev_owner.end_on = current_date;
                    await DistributorEntity.updateOwnership(prev_owner);
                }
            }

            // Get the block slot from the execute transaction
            const txInfo = await connection.getTransaction(executeTx, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
            const blockSlot = txInfo?.slot ?? 0;

            const blockchain_node_data: blockchain_node = {
                tx_hash: executeTx,
                prev_tx_hash: prev_owner_hash!,
                from_user_id: from_user_id,
                from_public_key: fromUser.public_key,
                to_user_id: to_user_id,
                to_public_key: toUser.public_key,
                product_id: product_id,
                block_slot: blockSlot,
                created_on: current_date
            };

            await DistributorEntity.createBlockchainNode(blockchain_node_data);

            const new_ownership: ownership = {
                owner_id: to_user_id,
                owner_public_key: toUser.public_key,
                product_id: product_id,
                start_on: new Date(),
                end_on: null,
                tx_hash: executeTx,
            };

            await DistributorEntity.createOwnership(new_ownership);


            res.json({
                success: true,
                data: {
                    from_user: fromUser.username,
                    to_user: toUser.username,
                    product_serial: product.serial_no,
                    product_pda: productPda.toBase58(),
                    transfer_pda: transferPda.toBase58(),
                    transactions: {
                        propose: proposeTx,
                        accept: acceptTx,
                        execute: executeTx
                    }
                }
            });

        } catch (error: any) {
            console.error("Transfer failed:", error);
            res.status(500).json({
                success: false,
                error: "Smart contract transfer failed",
                details: error.message,
                logs: error.logs || null
            });
        }
    }

    async getOwnershipHistory(req: Request, res: Response) {
        const { product_id } = req.body;

        if (!product_id) {
            return res.status(400).json({
                success: false,
                error: "Missing required field: product_id"
            });
        }

        try {
            // 1. Get product from database
            const product = await DistributorEntity.getProductById(product_id);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    error: `Product not found: ${product_id}`
                });
            }

            // 2. Get or derive product PDA
            let productPda: PublicKey;

            if (product.product_pda) {
                productPda = new PublicKey(product.product_pda);
            } else {
                const manufacturer = await DistributorEntity.getUserById(product.registered_by);
                if (!manufacturer) {
                    return res.status(404).json({
                        success: false,
                        error: `Manufacturer not found for product ${product_id}`
                    });
                }
                const manufacturerPubkey = new PublicKey(manufacturer.public_key);
                const [derivedPda] = deriveProductPda(manufacturerPubkey, product.serial_no);
                productPda = derivedPda;
            }

            // 3. Get all transaction signatures for this product PDA
            const signatures = await connection.getSignaturesForAddress(productPda, {
                limit: 1000
            });

            // 4. Instruction discriminators from IDL
            const REGISTER_PRODUCT_DISCRIMINATOR = Buffer.from([224, 97, 195, 220, 124, 218, 78, 43]);
            const PROPOSE_TRANSFER_DISCRIMINATOR = Buffer.from([140, 86, 133, 124, 253, 226, 251, 195]);
            const EXECUTE_TRANSFER_DISCRIMINATOR = Buffer.from([233, 126, 160, 184, 235, 206, 31, 119]);

            // 5. Fetch and parse each transaction to build ownership history
            const ownershipHistory: {
                owner: string;
                owner_username: string | null;
                event: string;
                tx_hash: string;
                block_time: Date | null;
                slot: number;
            }[] = [];

            // Track current owner as we process transactions
            let currentOwnerPubkey: string | null = null;

            for (const sig of signatures.reverse()) { // oldest first
                const tx = await connection.getTransaction(sig.signature, {
                    commitment: "confirmed",
                    maxSupportedTransactionVersion: 0
                });

                if (!tx || !tx.meta) continue;

                const blockTime = tx.blockTime ? new Date(tx.blockTime * 1000) : null;
                const accountKeys = tx.transaction.message.getAccountKeys();

                // Get compiled instructions
                const message = tx.transaction.message;
                const instructions = message.compiledInstructions;

                for (const ix of instructions) {
                    const programId = accountKeys.get(ix.programIdIndex);
                    if (!programId || programId.toBase58() !== PROGRAM_ID.toBase58()) continue;

                    const ixData = Buffer.from(ix.data);
                    const discriminator = ixData.subarray(0, 8);

                    // Register Product: accounts = [product, manufacturer, system_program]
                    if (discriminator.equals(REGISTER_PRODUCT_DISCRIMINATOR)) {
                        const manufacturerIndex = ix.accountKeyIndexes[1];
                        const manufacturerPubkey = accountKeys.get(manufacturerIndex)?.toBase58();

                        if (manufacturerPubkey) {
                            currentOwnerPubkey = manufacturerPubkey;
                            const ownerInfo = await DistributorEntity.getUserByPublicKey(manufacturerPubkey);
                            ownershipHistory.push({
                                owner: manufacturerPubkey,
                                owner_username: ownerInfo?.username || null,
                                event: "registered",
                                tx_hash: sig.signature,
                                block_time: blockTime,
                                slot: tx.slot
                            });
                        }
                    }

                    // Propose Transfer: accounts = [from_owner, product, to_owner, transfer_request, system_program]
                    if (discriminator.equals(PROPOSE_TRANSFER_DISCRIMINATOR)) {
                        const toOwnerIndex = ix.accountKeyIndexes[2];
                        const toOwnerPubkey = accountKeys.get(toOwnerIndex)?.toBase58();

                        if (toOwnerPubkey) {
                            const ownerInfo = await DistributorEntity.getUserByPublicKey(toOwnerPubkey);
                            ownershipHistory.push({
                                owner: toOwnerPubkey,
                                owner_username: ownerInfo?.username || null,
                                event: "transfer_proposed",
                                tx_hash: sig.signature,
                                block_time: blockTime,
                                slot: tx.slot
                            });
                        }
                    }

                    // Execute Transfer: accounts = [from_owner, product, transfer_request]
                    // The new owner is already recorded in propose, mark transfer as complete
                    if (discriminator.equals(EXECUTE_TRANSFER_DISCRIMINATOR)) {
                        // Update the last "transfer_proposed" entry to "transferred"
                        for (let i = ownershipHistory.length - 1; i >= 0; i--) {
                            if (ownershipHistory[i].event === "transfer_proposed") {
                                ownershipHistory[i].event = "transferred";
                                ownershipHistory[i].tx_hash = sig.signature; // Update to execute tx
                                ownershipHistory[i].block_time = blockTime;
                                ownershipHistory[i].slot = tx.slot;
                                currentOwnerPubkey = ownershipHistory[i].owner;
                                break;
                            }
                        }
                    }
                }
            }

            // 6. Mark current owner
            if (ownershipHistory.length > 0) {
                const lastOwner = ownershipHistory[ownershipHistory.length - 1];
                if (lastOwner.event === "registered" || lastOwner.event === "transferred") {
                    lastOwner.event = lastOwner.event === "registered" ? "registered (current owner)" : "transferred (current owner)";
                }
            }

            // Remove any pending "transfer_proposed" that weren't executed
            const finalHistory = ownershipHistory.filter(h => h.event !== "transfer_proposed");

            res.json({
                success: true,
                data: {
                    product_id: product.product_id,
                    serial_no: product.serial_no,
                    product_pda: productPda.toBase58(),
                    total_transactions: signatures.length,
                    ownership_history: finalHistory
                }
            });

        } catch (error: any) {
            console.error("Get ownership history failed:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get ownership history",
                details: error.message
            });
        }
    }

    async checkOwnership(req: Request, res: Response) {
        const { product_id } = req.body;

        if (!product_id) {
            return res.status(400).json({
                success: false,
                error: "Missing required field: product_id"
            });
        }

        try {
            // 1. Get product from database
            const product = await DistributorEntity.getProductById(product_id);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    error: `Product not found: ${product_id}`
                });
            }

            // 2. Get or derive product PDA
            let productPda: PublicKey;

            if (product.product_pda) {
                productPda = new PublicKey(product.product_pda);
            } else {
                const manufacturer = await DistributorEntity.getUserById(product.registered_by);
                if (!manufacturer) {
                    return res.status(404).json({
                        success: false,
                        error: `Manufacturer not found for product ${product_id}`
                    });
                }
                const manufacturerPubkey = new PublicKey(manufacturer.public_key);
                const [derivedPda] = deriveProductPda(manufacturerPubkey, product.serial_no);
                productPda = derivedPda;
            }

            // 3. Fetch on-chain account
            const accountInfo = await connection.getAccountInfo(productPda);
            if (!accountInfo) {
                return res.status(404).json({
                    success: false,
                    error: "Product not found on blockchain",
                    product_pda: productPda.toBase58()
                });
            }

            // 4. Decode the Product account
            const data = Buffer.from(accountInfo.data);
            const PRODUCT_DATA_SIZE = 342;
            const MAX_METADATA_URI_LEN = 200;

            if (data.length !== PRODUCT_DATA_SIZE) {
                return res.status(500).json({
                    success: false,
                    error: `Unexpected account size: ${data.length}, expected ${PRODUCT_DATA_SIZE}`
                });
            }

            let offset = 8; // skip discriminator
            const manufacturer = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
            const currentOwner = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
            const serialHash = data.subarray(offset, offset + 32).toString("hex"); offset += 32;
            const metadataHash = data.subarray(offset, offset + 32).toString("hex"); offset += 32;

            const uriLen = data.readUInt32LE(offset);
            const metadataUri = data.subarray(offset + 4, offset + 4 + uriLen).toString("utf8");
            offset += 4 + MAX_METADATA_URI_LEN;

            const active = data.readUInt8(offset) === 1;

            // 5. Look up owner in database
            const ownerInfo = await DistributorEntity.getUserByPublicKey(currentOwner.toBase58());
            const manufacturerInfo = await DistributorEntity.getUserByPublicKey(manufacturer.toBase58());

            res.json({
                success: true,
                data: {
                    product_id: product.product_id,
                    serial_no: product.serial_no,
                    product_pda: productPda.toBase58(),
                    on_chain: {
                        manufacturer: {
                            public_key: manufacturer.toBase58(),
                            user_id: manufacturerInfo?.user_id || null,
                            username: manufacturerInfo?.username || null
                        },
                        current_owner: {
                            public_key: currentOwner.toBase58(),
                            user_id: ownerInfo?.user_id || null,
                            username: ownerInfo?.username || null
                        },
                        serial_hash: serialHash,
                        metadata_hash: metadataHash,
                        metadata_uri: metadataUri,
                        active: active
                    }
                }
            });

        } catch (error: any) {
            console.error("Check ownership failed:", error);
            res.status(500).json({
                success: false,
                error: "Failed to check ownership",
                details: error.message
            });
        }
    }
}

export default new DistributorController();
