const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const fs = require('fs');

// Generate keys for all users
const users = [
  'admin_user',
  'nike_manufacturer',
  'adidas_manufacturer',
  'global_distributor',
  'asia_distributor',
  'sports_retailer',
  'fashion_retailer',
  'john_consumer',
  'sarah_consumer',
  'mike_consumer'
];

let output = '-- Generated Solana Keypairs\n';
output += '-- Copy these into your seed data SQL file\n\n';

const keyPairs = [];

users.forEach(username => {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const privateKey = bs58.encode(keypair.secretKey);
  
  keyPairs.push({ username, privateKey, publicKey });
  
  output += `-- ${username}\n`;
  output += `Private Key: '${privateKey}'\n`;
  output += `Public Key:  '${publicKey}'\n`;
  output += `Length: private=${privateKey.length}, public=${publicKey.length}\n\n`;
});

// Add SQL format section
output += '\n\n-- SQL INSERT FORMAT (copy this into your INSERT VALUES):\n\n';
keyPairs.forEach((kp, index) => {
  output += `-- User ${index + 1}: ${kp.username}\n`;
  output += `private_key: '${kp.privateKey}',\n`;
  output += `public_key: '${kp.publicKey}'\n\n`;
});

// Verification test
output += '\n-- VERIFICATION TEST --\n';
const testKeypair = Keypair.generate();
const testPrivate = bs58.encode(testKeypair.secretKey);
const testPublic = testKeypair.publicKey.toBase58();

output += 'Generated:\n';
output += `Private: ${testPrivate}\n`;
output += `Public: ${testPublic}\n\n`;

// Decode and recreate
const decoded = bs58.decode(testPrivate);
const recreated = Keypair.fromSecretKey(decoded);

output += 'Recreated:\n';
output += `Public: ${recreated.publicKey.toBase58()}\n`;
output += `Match: ${recreated.publicKey.toBase58() === testPublic ? '✓ SUCCESS' : '✗ FAILED'}\n`;

// Write to file
fs.writeFileSync('solana_keys.txt', output);
console.log('✓ Keys generated and saved to solana_keys.txt');