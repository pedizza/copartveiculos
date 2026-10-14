import test from 'node:test';
import assert from 'node:assert/strict';
process.env.JWT_SECRET = 'copar-access-test-only';
process.env.JWT_REFRESH_SECRET = 'copar-refresh-test-only';
const {signRefreshToken, verifyRefreshToken} = await import('../src/auth/security.js');

test('sessions created in the same second have independent refresh tokens', context => {
  context.mock.method(Date, 'now', () => 1791982800000);
  const user = {id: '00000000-0000-4000-8000-000000000001'};
  const first = signRefreshToken(user);
  const second = signRefreshToken(user);
  assert.notEqual(first, second);
  assert.equal(verifyRefreshToken(first).sub, user.id);
  assert.equal(verifyRefreshToken(second).sub, user.id);
  assert.equal(verifyRefreshToken(first).iat, verifyRefreshToken(second).iat);
});
