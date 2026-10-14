import fs from 'node:fs/promises';
import dotenv from 'dotenv';
dotenv.config();
let pool;

const tables = ['app_users','app_refresh_tokens','app_catalog_items','app_drivers','app_yards','app_client_tracking','app_invoices','app_contracts'];
try {
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) throw Error('Configure DATABASE_URL e DIRECT_URL com o banco novo da COPAR.');
  ({ pool } = await import('../src/auth/db.js'));
  const { ensureAdminSchema, ensureDefaultAdminUser } = await import('../src/admin/repository.js');
  const { ensureInvoiceSchema } = await import('../src/invoices/repository.js');
  const { ensureContractSchema } = await import('../src/contracts/repository.js');
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw Error('Configure ADMIN_EMAIL e ADMIN_PASSWORD no .env.');
  // Recusa bancos que já contenham dados. Não apaga nenhum registro.
  const existingTables = (await pool.query("select tablename from pg_tables where schemaname = 'public'")).rows;
  for (const { tablename } of existingTables) {
    const quoted = '"' + tablename.replaceAll('"', '""') + '"';
    if ((await pool.query(`select exists(select 1 from public.${quoted}) as has_data`)).rows[0].has_data) {
      throw Error('O banco precisa estar vazio: foram encontrados registros em public. Nenhum dado foi alterado.');
    }
  }
  await pool.query(await fs.readFile(new URL('../supabase/001_init.sql',import.meta.url),'utf8'));
  await ensureAdminSchema();
  await ensureInvoiceSchema();
  await ensureContractSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [table,file] of [['app_catalog_items','catalog'],['app_yards','yards']]) {
      const records = JSON.parse(await fs.readFile(new URL(`../seed/${file}.json`,import.meta.url),'utf8'));
      for (const record of records) {
        await client.query(`insert into public.${table} select * from jsonb_populate_record(null::public.${table},$1::jsonb)`,[JSON.stringify(record)]);
      }
    }
    await client.query('COMMIT');
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  await ensureDefaultAdminUser();
  for (const table of tables) {
    const {rows} = await pool.query(`select count(*)::int as total from public.${table}`);
    console.log(`${table}: ${rows[0].total}`);
  }
  console.log('COPAR inicializada: catálogo e pátios importados; apenas um administrador novo.');
} catch(error) {
  console.error('Inicialização falhou:',error.code || error.message);
  process.exitCode=1;
} finally { await pool?.end(); }
