import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const adminPage=readFileSync(new URL('../public/admin.html',import.meta.url),'utf8');
const trackingPage=readFileSync(new URL('../public/rastreio.html',import.meta.url),'utf8');
const repository=readFileSync(new URL('../src/admin/repository.js',import.meta.url),'utf8');

test('admin generates a customer-shareable tracking link and labels its preview as internal',()=>{
  assert.match(adminPage,/data-copy-tracking-link="\$\{tracking\.id\}">Copiar link para o cliente/);
  assert.match(adminPage,/url\.searchParams\.set\("code",tracking\.tracking_code\)/);
  assert.match(adminPage,/Prévia interna \(admin\)/);
});

test('customer tracking link loads a public tracking result without admin authentication',()=>{
  assert.match(trackingPage,/const publicTrackingCode = new URLSearchParams\(location\.search\)\.get\("code"\)/);
  assert.match(trackingPage,/apiFetch\(`\/api\/tracking\?code=\$\{encodeURIComponent\(publicTrackingCode\)\}`\)/);
  assert.match(trackingPage,/if \(publicTrackingCode\) \{\s*renderPublicTracking\(\)/);
  const query=repository.match(/export const findPublicTrackingByCode[\s\S]*?\n\};/)?.[0]||'';
  assert.match(query,/t\.tracking_code/);
  assert.doesNotMatch(query,/t\.client_email|t\.notes|destination_address/);
});
