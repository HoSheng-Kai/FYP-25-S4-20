import dotenv from 'dotenv';
dotenv.config();

import bs58 from 'bs58';

import { Connection, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';

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
    
    // Request 2 SOL
    const signature = await connection.requestAirdrop(
        senderKeypair.publicKey,
        amount * LAMPORTS_PER_SOL
    );
    
    // Wait for confirmation
    await connection.confirmTransaction(signature);
    
    const balance = await connection.getBalance(senderKeypair.publicKey);
    console.log('New balance:', balance / LAMPORTS_PER_SOL, 'SOL');
}


export {connection, airdropSol}