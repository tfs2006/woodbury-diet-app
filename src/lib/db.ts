import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || '158.101.2.37',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'woodbury_diet',
  user: process.env.DB_USER || 'woodbury',
  password: process.env.DB_PASSWORD || 'WoodburyDiet2026!',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

export default pool;
