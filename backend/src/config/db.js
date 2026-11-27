import mysql from 'mysql2/promise';
import { env } from './env.js';

// One pool for this process. The in-memory queue assumes a single server.
let pool;

export function createPool(database = env.dbName) {
  const nextPool = mysql.createPool({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: 'Z',
    dateStrings: true,
    charset: 'utf8mb4',
  });

  nextPool.on('connection', (connection) => {
    connection.query("SET time_zone = '+00:00'");
  });

  return nextPool;
}

export function getPool() {
  if (!pool) pool = createPool();
  return pool;
}

export async function checkDatabase() {
  await getPool().query('SELECT 1');
}
