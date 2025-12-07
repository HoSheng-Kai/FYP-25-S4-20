// import DistributorEntity from '../entities/Distributor';

import { Request, Response } from "express";

import {connection, airdropSol} from "../schema/solana";
const { Connection, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } = require('@solana/web3.js');

import bs58 from 'bs58';

class DistributorController {
    // async logoutAccount(req: Request, res: Response){
    //     try{
    //         let response: Boolean = await User.logoutAccount();

    //         res.json({
    //             success: response
    //         });
    //         }catch(error: any){
    //         res.status(500).json({
    //             success: false,
    //             error: 'Failed to logout account',
    //             details: error.message
    //         })
    //     }
    // }

    async updateOwnership(req: Request, res: Response){

        try {
            // Your wallet
            const privateKeyBase58 = '5Jn1PsY9FYjYtpjfLaivRW5dSdkCsDxDnmkCn8MXkGFmnPA3NqFSoEww45mm4ukeFwvGFwG9akagGF2cLCofGsnp';
            const senderKeypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
            
            // Check if you have money
            const balance = await connection.getBalance(senderKeypair.publicKey);
            const needAmount = 0.01 * LAMPORTS_PER_SOL;
            
            if (balance < needAmount) {
                airdropSol('5Jn1PsY9FYjYtpjfLaivRW5dSdkCsDxDnmkCn8MXkGFmnPA3NqFSoEww45mm4ukeFwvGFwG9akagGF2cLCofGsnp', 10);
            }
            
            // Where to send money
            const recipientPubkey = new PublicKey('pR9HgGJrxkFTVebFhYAoq4URkLti4tph9f7Sxvgrpzc');
            
            // Create and send transaction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: senderKeypair.publicKey,
                    toPubkey: recipientPubkey,
                    lamports: needAmount
                })
            );
            
            const txHash = await connection.sendTransaction(transaction, [senderKeypair]);
            
            return res.status(200).json({
                success: true,
                transactionHash: txHash
            });
            
        } catch (error: any) {
            return res.status(500).json({
                error: error.message
            });
        }
    }
}

export default new DistributorController();