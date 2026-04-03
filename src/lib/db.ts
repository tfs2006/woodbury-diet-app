import { Pool } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';

function getMissingDatabaseEnvVars() {
  return ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].filter(
    (name) => !process.env[name]
  );
}

const missingDatabaseEnvVars = !process.env.DATABASE_URL ? getMissingDatabaseEnvVars() : [];

if (isProduction && !process.env.DATABASE_URL && missingDatabaseEnvVars.length > 0) {
  throw new Error(`Missing required database environment variables: ${missingDatabaseEnvVars.join(', ')}`);
}

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: isProduction ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
      }
    : {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'woodbury_diet',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        ssl: isProduction ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
      }
);

export default pool;
