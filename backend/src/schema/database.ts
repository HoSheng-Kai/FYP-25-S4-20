import dotenv from 'dotenv';
dotenv.config();

const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: `-c search_path=${process.env.DB_SCHEMA}`
});

// Test connection
pool.on('connect', () => {
  console.log('Database connected');
});

pool.on('error', (err: any) => {
  console.error('Database connection error:', err);
});

export default pool;