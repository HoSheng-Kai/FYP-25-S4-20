import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Pass custom PostgreSQL options such as setting search_path
  options: process.env.DB_SCHEMA ? `-c search_path=${process.env.DB_SCHEMA}` : undefined
});

// Test connection
pool.on('connect', () => {
  console.log('Database connected');
});

pool.on('error', (err: Error) => {
  console.error('Database connection error:', err);
});

export default pool;
