// import DistributorEntity from '../entities/Distributor';
import DistributorEntity from "../entities/Distributor";

import { Request, Response } from "express";

import {connection, airdropSol, MEMO_PROGRAM_ID} from "../schema/solana";
const {Transaction, LAMPORTS_PER_SOL, TransactionInstruction, Keypair, PublicKey } = require('@solana/web3.js');

import bs58 from 'bs58';
import { blockchain_node, ownership } from "../db/table";

class DistributorController {
    async updateOwnership(req: Request, res: Response){
        // Information needed: from, to, product
        // send transaction to solana
        // record tx_hash, block_slot and created_on to postgres (blockchain_node)
        // update ownership postgres
        // update blockchain node

        const from_user = {
            user_id: req.body.from_user_id,
            private_key: req.body.from_private_key,
            public_key: req.body.from_public_key
        };

        const to_user = {
            user_id: req.body.to_user_id,
            public_key: req.body.to_public_key,
            // private_key: req.body.to_private_key
        };

        const product = {
            product_id: req.body.product_id
        };

        let send_this = {
            from_user_id: req.body.from_user_id,
            from_public_key: req.body.from_public_key,
            to_user_id: req.body.to_user_id,
            to_public_key: req.body.to_public_key,
            product_id: req.body.product_id,
            created_on: Date.now()
        };

        // Need for solana transaction
        let from_public_key = new PublicKey(from_user.public_key)

        try{
            const balance = await connection.getBalance(from_public_key);
            const needAmount = 0.01 * LAMPORTS_PER_SOL;

            if (balance < needAmount) {
                await airdropSol(from_user.private_key, needAmount);
            }

            // TODO: Create and send transaction to Solana
            const transaction = new Transaction();

            const memoInstruction = new TransactionInstruction({
                keys: [{ pubkey: from_public_key, isSigner: true, isWritable: true }],
                data: Buffer.from(JSON.stringify(send_this), 'utf8'),
                programId: MEMO_PROGRAM_ID
            });

            transaction.add(memoInstruction);

            // Get blockhash and sign
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = from_public_key;

            const fromPublicKey = new PublicKey(from_public_key);
            const fromKeypair = Keypair.fromSecretKey(
                bs58.decode(from_user.private_key)
            );

            transaction.sign(fromKeypair);
            
            // Send transaction
            const signature = await connection.sendRawTransaction(transaction.serialize());

            await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            });
            
            // Get block details
            const txDetails = await connection.getTransaction(signature, {
                maxSupportedTransactionVersion: 0
            });

            /////////////////////////////
            // INSERTING INTO DATABASE //
            /////////////////////////////

            // // Get previous hash here
            let latest_block = await DistributorEntity.viewLatestBlockchainNode(product.product_id);
            let prev_owner_hash = null;
            let current_date = new Date();

            // Have previous owner, update end date
            if(latest_block != null){
                prev_owner_hash = latest_block.tx_hash;

                let prev_owner = await DistributorEntity.getOwnership(prev_owner_hash);
                prev_owner.end_on = current_date;
                
                await DistributorEntity.updateOwnership(prev_owner);
            }

            // Create new blockchain_node
            const blockchain_node_data: blockchain_node = {
                tx_hash: signature,
                prev_tx_hash: prev_owner_hash,
                from_user_id: req.body.from_user_id,
                from_public_key: req.body.from_public_key,
                to_user_id: req.body.to_user_id,
                to_public_key: req.body.to_public_key,
                product_id: req.body.product_id,
                block_slot: txDetails?.slot,
                created_on: current_date
            };

            await DistributorEntity.createBlockchainNode(blockchain_node_data)

            // Create new ownership
            const new_ownership: ownership = {
                owner_id: req.body.to_user_id,
                owner_public_key: req.body.to_public_key,
                product_id: req.body.product_id,
                start_on: new Date(),
                end_on: null,
                tx_hash: signature,
            };

            await DistributorEntity.createOwnership(new_ownership);

            res.json({
                success: true
            });
            
        }catch(error: any){
            console.error('Full error:', error);
            console.error('Stack trace:', error.stack);
            res.status(500).json({
                success: false,
                error: 'Failed to update ownership',
                details: error.message
            })
        }
    }
}

export default new DistributorController();