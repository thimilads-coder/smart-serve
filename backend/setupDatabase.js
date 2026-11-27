import fs from 'fs';
import mysql from 'mysql2/promise';
import { env } from './config/env.js';

const name = env.dbName;
if (!/^[A-Za-z0-9_]+$/.test(name)) {
  console.error('DB_NAME may only contain letters, numbers, and underscores.');
  process.exit(1);
}

const connection = await mysql.createConnection({
  host: env.dbHost,
  port: env.dbPort,
  user: env.dbUser,
  password: env.dbPassword,
  multipleStatements: true,
  timezone: 'Z',
});

const sql = fs.readFileSync(new URL('../database/schema.sql', import.meta.url), 'utf8');

try {
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.query(`USE \`${name}\``);
  await connection.query(sql);
  console.log(`Database ${name} is ready.`);
} catch (error) {
  console.error('Could not create the database tables.');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
