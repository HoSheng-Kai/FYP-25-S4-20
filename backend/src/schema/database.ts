import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: `-c search_path=${process.env.DB_SCHEMA}`
});

// Test connection
pool.on('connect', async (client: any) => {
  try {
    await client.query('SET search_path TO fyp_25_s4_20, public');
    console.log('Client connected with schema: fyp_25_s4_20');
  } catch (err) {
    console.error('Failed to set search_path:', err);
  }
});


pool.on('error', (err: any) => {
  console.error('Database connection error:', err);
});

export default pool;