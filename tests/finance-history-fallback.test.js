import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const repository=readFileSync(new URL('../src/finance/repository.js',import.meta.url),'utf8');
const historyQuery=repository.match(/const \{rows: history\} = await pool\.query\(([\s\S]*?), histValues\);/)?.[1]||'';

test('finance history can be reconstructed from archived entries when a monthly summary is missing',()=>{
  assert.match(historyQuery,/from public\.app_financial_history h/);
  assert.match(historyQuery,/union all/);
  assert.match(historyQuery,/e\.archived_month is not null/);
  assert.match(historyQuery,/jsonb_agg\(jsonb_build_object\('id',e\.id,'amount',e\.amount,'date',e\.entry_date/);
  assert.match(historyQuery,/not exists \(select 1 from public\.app_financial_history h where h\.month=e\.archived_month and h\.employee_id=e\.employee_id\)/);
});
