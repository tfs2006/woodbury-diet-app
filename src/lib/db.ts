import { Pool } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';

function getEnv(name: string) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : undefined;
}

function getMissingDatabaseEnvVars() {
  return ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].filter(
    (name) => !getEnv(name)
  );
}

const databaseUrl = getEnv('DATABASE_URL');
const dbHost = getEnv('DB_HOST');
const dbPort = getEnv('DB_PORT');
const dbName = getEnv('DB_NAME');
const dbUser = getEnv('DB_USER');
const dbPassword = getEnv('DB_PASSWORD');

const missingDatabaseEnvVars = !databaseUrl ? getMissingDatabaseEnvVars() : [];

if (isProduction && !databaseUrl && missingDatabaseEnvVars.length > 0) {
  throw new Error(`Missing required database environment variables: ${missingDatabaseEnvVars.join(', ')}`);
}

const pool = new Pool(
  databaseUrl
    ? {
        connectionString: databaseUrl,
        ssl: isProduction ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
      }
    : {
        host: dbHost || '127.0.0.1',
        port: parseInt(dbPort || '5432', 10),
        database: dbName || 'woodbury_diet',
        user: dbUser || 'postgres',
        password: dbPassword || 'postgres',
        ssl: isProduction ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
      }
);

export default pool;
