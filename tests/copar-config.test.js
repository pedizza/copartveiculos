import test from 'node:test';
import assert from 'node:assert/strict';
import { databaseTarget } from '../src/auth/database-target.js';
import { publicOrigin, clientLink } from '../public/shared/public-links.js';
import { resolveNowBankCallbackUrl } from '../src/config/nowbank.js';

test('links use the configured company domain', () => {
  assert.equal(publicOrigin('https://copar.example/path'), 'https://copar.example');
  assert.equal(clientLink('fatura', 'a&b', 'https://copar.example'), 'https://copar.example/fatura?token=a%26b');
  assert.throws(() => publicOrigin('invalid'));
  assert.throws(() => publicOrigin('file:///tmp/test'));
  assert.throws(() => publicOrigin('https://user:password@copar.example'));
});
test('production payment callback follows COPAR domain', () => {
  assert.equal(resolveNowBankCallbackUrl({appUrl: 'https://copar.example', appEnv: 'production', callbackUrl: ''}),
    'https://copar.example/api/webhooks/nowbank');
});
test('direct and pooled Supabase URLs identify the same project', () => {
  const target = databaseTarget('postgresql://postgres.testref:secret@aws-0-us-west-2.pooler.supabase.com:6543/postgres');
  assert.equal(target, databaseTarget('postgresql://postgres:secret@db.testref.supabase.co:5432/postgres'));
  assert.notEqual(target, databaseTarget('postgresql://postgres.otherref:secret@aws-0-us-west-2.pooler.supabase.com:5432/postgres'));
  assert.notEqual(databaseTarget('postgresql://test@localhost:5432/app'), databaseTarget('postgresql://test@localhost:5433/app'));
  assert.throws(() => databaseTarget('invalid'));
});
