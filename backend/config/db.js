import mysql from 'mysql2/promise';
import fs from 'fs';
import 'dotenv/config';

// Managed MySQL providers (Aiven, PlanetScale, TiDB Cloud) require TLS.
// DB_SSL=true turns it on. DB_SSL_CA may hold either the PEM text itself
// (handy for hosts whose dashboards only accept single-line values) or a
// path to the .pem file downloaded from the provider.
function sslOptions() {
  if (String(process.env.DB_SSL || '').toLowerCase() !== 'true') return undefined;
  const ca = process.env.DB_SSL_CA;
  if (!ca) return { rejectUnauthorized: true };
  const pem = ca.includes('BEGIN CERTIFICATE')
    ? ca.replace(/\\n/g, '\n')
    : fs.readFileSync(ca, 'utf8');
  return { ca: pem, rejectUnauthorized: true };
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'construction_erp',
  ssl: sslOptions(),
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  timezone: 'Z'
});

export async function dbHealth() {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return rows[0]?.ok === 1;
}
