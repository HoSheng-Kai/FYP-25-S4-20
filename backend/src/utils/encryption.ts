// Use HashiCorp Vault, key management service (harder to attack by storing key in a separate system + key is never exposed)
// Uses AES-256-GCM algorithm to encrypt (industry standard)

import 'dotenv/config';
import vault from 'node-vault';

const vaultClient = vault({
  endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
  token: process.env.VAULT_TOKEN
});

export async function encrypt(plaintext: string): Promise<string> {
  try {
    const { data } = await vaultClient.write('transit/encrypt/my-app-key', {
      plaintext: Buffer.from(plaintext).toString('base64')
    });
    
    return data.ciphertext;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw error;
  }
}

export async function decrypt(ciphertext: string): Promise<string> {
  try {
    const { data } = await vaultClient.write('transit/decrypt/my-app-key', {
      ciphertext: ciphertext
    });

    return Buffer.from(data.plaintext, 'base64').toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error);
    throw error;
  }
}