import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminSession, ADMIN_STORAGE_KEY} from '../public/shared/admin-session.js';

function setup(fetchImpl, onExpired) {
  const values = new Map();
  const storage = {getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)};
  return {values, session: createAdminSession({storage, fetchImpl, onExpired})};
}
const response = (status, body = {}) => new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
const auth = {user: {role: 'admin'}, accessToken: 'old', refreshToken: 'refresh'};

test('migrates existing COPART browser sessions without losing access', () => {
  const {session, values} = setup();
  values.set('agro_admin_auth', JSON.stringify(auth));
  assert.deepEqual(session.getAuth(), auth);
  assert.equal(values.has('agro_admin_auth'), false);
  assert.equal(values.has(ADMIN_STORAGE_KEY), true);
});
test('renews expired access and retries the original request', async () => {
  const calls = [];
  const {session} = setup(async (url, options) => {
    calls.push({url, options});
    if (url === '/api/auth/refresh') return response(200, {...auth, accessToken: 'new', refreshToken: 'rotated'});
    return options.headers.Authorization === 'Bearer new' ? response(200, {catalogItems: []}) : response(401);
  });
  session.setAuth(auth);
  assert.deepEqual(await session.request('/api/admin/dashboard'), {catalogItems: []});
  assert.deepEqual(calls.map(c => c.url), ['/api/admin/dashboard', '/api/auth/refresh', '/api/admin/dashboard']);
  assert.equal(session.getAuth().refreshToken, 'rotated');
});
test('simultaneous expired requests share one token renewal', async () => {
  let refreshes = 0;
  const {session} = setup(async (url, options) => {
    if (url === '/api/auth/refresh') {
      refreshes++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return response(200, {...auth, accessToken: 'new', refreshToken: 'rotated'});
    }
    return response(options.headers.Authorization === 'Bearer new' ? 200 : 401);
  });
  session.setAuth(auth);
  await Promise.all([session.request('/api/admin/dashboard'), session.request('/api/admin/contracts')]);
  assert.equal(refreshes, 1);
});
test('invalid refresh clears the session and returns to login', async () => {
  let expired = false;
  const {session} = setup(async () => response(401), () => {expired = true;});
  session.setAuth(auth);
  await assert.rejects(session.request('/api/admin/dashboard'), /sessão COPART expirou/);
  assert.equal(session.getAuth(), null);
  assert.equal(expired, true);
});
test('forbidden actions do not renew tokens or discard a valid session', async () => {
  let calls = 0;
  const {session} = setup(async () => {calls++; return response(403, {message: 'Acesso desativado.'});});
  session.setAuth(auth);
  await assert.rejects(session.request('/api/admin/dashboard'), /Acesso desativado/);
  assert.equal(calls, 1);
  assert.deepEqual(session.getAuth(), auth);
});
test('logout revokes the refresh token and clears browser storage', async () => {
  const {session, values} = setup(async (url, options) => {
    assert.equal(url, '/api/auth/logout');
    assert.equal(JSON.parse(options.body).refreshToken, auth.refreshToken);
    return response(200);
  });
  session.setAuth(auth);
  await session.logout();
  assert.equal(values.size, 0);
});
