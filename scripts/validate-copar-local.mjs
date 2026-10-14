// Uses an isolated temporary PostgreSQL cluster. Never uses DATABASE_URL from .env.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync, spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';

const bin = process.env.COPAR_POSTGRES_BIN || '/usr/lib/postgresql/18/bin';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'copar-validation-'));
const port = 25432;
const url = `postgresql://${os.userInfo().username}@127.0.0.1:${port}/postgres?sslmode=disable`;
const env = {...process.env, DATABASE_URL: url, DIRECT_URL: url, PORT: '23000',
  APP_URL: 'http://127.0.0.1:23000', APP_DOMAIN: '127.0.0.1', CORS_ORIGIN: 'http://127.0.0.1:23000',
  ADMIN_EMAIL: 'validation@copar.local', ADMIN_PASSWORD: randomBytes(24).toString('hex'),
  JWT_SECRET: randomBytes(32).toString('hex'), JWT_REFRESH_SECRET: randomBytes(32).toString('hex'),
  NOWBANK_CLIENT_ID: '', NOWBANK_CLIENT_SECRET: '', NOWHUBPAY_CLIENT_ID: '', NOWHUBPAY_CLIENT_SECRET: ''};
let started = false, server;
const run = (file, args, options = {}) => execFileSync(file, args, {env, encoding: 'utf8', ...options});
try {
  run(path.join(bin, 'initdb'), ['-D', dir, '-A', 'trust', '--no-locale']);
  run(path.join(bin, 'pg_ctl'), ['-D', dir, '-l', path.join(dir, 'postgres.log'), '-o', `-p ${port} -h 127.0.0.1 -k ${dir}`, '-w', 'start']);
  started = true;
  console.log(run(process.execPath, ['scripts/setup-copar-db.js']));
  assert.throws(() => run(process.execPath, ['scripts/setup-copar-db.js'], {stdio: 'pipe'}), 'Nonempty database must be refused');
  server = spawn(process.execPath, ['server.js'], {env, stdio: 'ignore'});
  const origin = env.APP_URL;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(origin)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  for (const page of ['/', '/catalogo', '/detalhe', '/admin', '/login', '/cadastro', '/rastreio', '/contrato', '/fatura']) {
    assert.equal((await fetch(origin + page)).status, 200, page);
  }
  const items = (await (await fetch(origin + '/api/catalog/items')).json()).items;
  assert.equal(items.length, 87);
  for (const item of items) {
    const detail = await fetch(origin + '/api/catalog/detail?slug=' + encodeURIComponent(item.slug));
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).item.id, item.id);
  }
  const seed = JSON.parse(fs.readFileSync('seed/catalog.json'));
  for (const image of new Set(seed.flatMap(item => [item.image_url, ...item.gallery_images]))) {
    const res = await fetch(origin + image);
    assert.equal(res.status, 200, image);
    assert.ok(res.headers.get('content-type').startsWith('image/'));
  }
  const login = await fetch(origin + '/api/admin/session', {method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD})});
  assert.equal(login.status, 200);
  const session = await login.json();
  assert.equal(session.user.role, 'admin');
  const dashboard = await fetch(origin + '/api/admin/dashboard', {headers: {Authorization: 'Bearer ' + session.accessToken}});
  assert.equal(dashboard.status, 200);
  assert.equal((await fetch(origin + '/api/contracts/public/nonexistent')).status, 404);
  assert.equal((await fetch(origin + '/api/tracking?code=NONEXISTENT')).status, 404);
  const customer = {fullName: 'Cliente temporário COPAR', email: 'customer@copar.local', whatsapp: '11999990000',
    cpf: '123.456.789-09', cep: '01001-000', address: 'Rua de Teste', number: '1', district: 'Centro',
    city: 'São Paulo', state: 'SP', password: randomBytes(24).toString('hex')};
  const register = await fetch(origin + '/api/auth/register', {method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(customer)});
  assert.equal(register.status, 200);
  const customerLogin = await fetch(origin + '/api/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({identifier: customer.email, password: customer.password})});
  assert.equal(customerLogin.status, 200);
  const customerSession = await customerLogin.json();
  const customerHeaders = {Authorization: 'Bearer ' + customerSession.accessToken};
  assert.equal((await fetch(origin + '/api/auth/me', {headers: customerHeaders})).status, 200);
  assert.equal((await fetch(origin + '/api/customer/tracking-dashboard', {headers: customerHeaders})).status, 200);
  assert.equal((await fetch(origin + '/api/admin/dashboard', {headers: customerHeaders})).status, 403);
  console.log('HTTP: cadastro, login e perfil de cliente, rastreio e bloqueio do painel aprovados em banco temporário.');
  console.log('HTTP: páginas, 87 detalhes, 202 imagens, login e dashboard administrativo aprovados.');
  console.log(run(process.execPath, ['tests/catalog-admin.mjs']));
  console.log(run(process.execPath, ['tests/staff-isolation.mjs']));
  console.log('Validação concluída em banco temporário; pagamento externo não acionado.');
} finally {
  if (server) {
    const exited = new Promise(resolve => server.once('exit', resolve));
    server.kill();
    await exited;
  }
  if (started) run(path.join(bin, 'pg_ctl'), ['-D', dir, '-m', 'fast', '-w', 'stop']);
  fs.rmSync(dir, {recursive: true, force: true});
}
