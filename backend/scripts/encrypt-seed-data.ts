import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import vault from 'node-vault';

const vaultClient = vault({
  endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
  token: process.env.VAULT_TOKEN
});

async function encrypt(plaintext: string): Promise<string> {
  const { data } = await vaultClient.write('transit/encrypt/my-app-key', {
    plaintext: Buffer.from(plaintext).toString('base64')
  });
  return data.ciphertext;
}

async function encryptSeedData() {
  const filePath = path.join(__dirname, '../docker/init/002_seed_date.sql');

  const content = fs.readFileSync(filePath, 'utf-8');

  // Match user value lines: ('username','password','email','role',
  // Captures: username, password, email, role
  const userLinePattern = /(\s*\('[^']+'),('[^']+'),('[^']+'),('[^']+',)$/gm;

  let result = content;
  const matches = [...content.matchAll(userLinePattern)];

  console.log(`Found ${matches.length} user entries to encrypt\n`);

  for (const match of matches) {
    const fullMatch = match[0];
    const prefix = match[1];        // ('username'
    const password = match[2];       // 'password'
    const email = match[3];          // 'email'
    const roleSuffix = match[4];     // 'role',

    // Extract actual values (remove quotes)
    const passwordValue = password.slice(1, -1);
    const emailValue = email.slice(1, -1);

    // Encrypt
    const encryptedPassword = await encrypt(passwordValue);
    const encryptedEmail = await encrypt(emailValue);

    // Build replacement
    const replacement = `${prefix},'${encryptedPassword}','${encryptedEmail}',${roleSuffix}`;

    result = result.replace(fullMatch, replacement);

    // Extract username for logging
    const usernameMatch = prefix.match(/\('([^']+)'/);
    const username = usernameMatch ? usernameMatch[1] : 'unknown';
    console.log(`Encrypted: ${username}`);
  }

  fs.writeFileSync(filePath, result);
  console.log(`\nEncrypted seed data saved to: ${filePath}`);
}

encryptSeedData().catch(console.error);
