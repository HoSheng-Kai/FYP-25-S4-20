require('dotenv').config();
const { Pool } = require('pg');

console.log('=== DEBUG INFO ===');
console.log('DB_PASSWORD from .env:', process.env.DB_PASSWORD);
console.log('DB_PASSWORD length:', process.env.DB_PASSWORD?.length);
console.log('Expected length: 8 (for "admin123")');

// Test with HARDCODED password (not from .env)
const pool = new Pool({
  host: '127.0.0.1',
  port: 9876,
  database: 'fyp_db',
  user: 'admin',
  password: 'admin123', // HARDCODED - bypasses .env completely
});

async function test() {
  try {
    console.log('\nTesting with HARDCODED password "admin123"...');
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Connected:', res.rows[0].now);

    const users = await pool.query('SELECT * FROM fyp_25_s4_20.users');
    console.log('✅ Found', users.rows.length, 'users');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

test();