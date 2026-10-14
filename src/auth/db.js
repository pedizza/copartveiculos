import dotenv from "dotenv";
import pg from "pg";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { databaseTarget } from './database-target.js';

dotenv.config();

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL ou DIRECT_URL não configurada.");
}

// A cópia nunca deve se conectar ao banco de origem da Mega.
const sourceFingerprints = JSON.parse(readFileSync(new URL("../../seed/source-database-fingerprints.json", import.meta.url), "utf8"));
for (const value of [process.env.DATABASE_URL, process.env.DIRECT_URL].filter(Boolean)) {
  databaseTarget(value);
  const url = new URL(value);
  const fingerprint = createHash("sha256").update(`${url.hostname}|${decodeURIComponent(url.username)}|${url.pathname}`).digest("hex");
  if (sourceFingerprints.includes(fingerprint)) {
    throw new Error("Conexão bloqueada: configure o banco novo da COPAR, diferente do banco da Mega.");
  }
}

if (process.env.DATABASE_URL && process.env.DIRECT_URL &&
    databaseTarget(process.env.DATABASE_URL) !== databaseTarget(process.env.DIRECT_URL)) {
  throw new Error('DATABASE_URL e DIRECT_URL devem apontar para o mesmo banco novo da COPAR.');
}

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
