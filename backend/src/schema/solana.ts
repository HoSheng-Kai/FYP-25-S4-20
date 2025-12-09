import dotenv from 'dotenv';
dotenv.config();

import bs58 from 'bs58';

import { Connection, LAMPORTS_PER_SOL, Keypair, PublicKey } from '@solana/web3.js';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// Create Solana connection
const connection = new Connection(
  process.env.RPC_URL || 'http://localhost:8899',
  'confirmed'
);

// Test connection on startup
connection.getVersion()
  .then(version => {
    console.log('Solana connected:', version['solana-core']);
  })
  .catch(err => {
    console.error('Solana connection error:', err);
  });

async function airdropSol(wallet_private_key: string, amount: number) {
    const senderKeypair = Keypair.fromSecretKey(bs58.decode(wallet_private_key));
    
    console.log('Requesting airdrop for:', senderKeypair.publicKey.toBase58());
    console.log('Amount (lamports):', amount);
    
    try {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        
        // Request airdrop
        const signature = await connection.requestAirdrop(
            senderKeypair.publicKey,
            amount
        );
                
        const strategy = {
            signature,
            blockhash,
            lastValidBlockHeight
        };
        
        const confirmation = await Promise.race([
            connection.confirmTransaction(strategy, 'confirmed'),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Airdrop timeout after 30s')), 30000)
            )
        ]);
        
        const balance = await connection.getBalance(senderKeypair.publicKey);
        
        return balance;
    } catch (error) {
        console.error('Airdrop error:', error);
        throw error;
    }
}


export {connection, airdropSol, MEMO_PROGRAM_ID}