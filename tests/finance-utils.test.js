import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeFinanceEntries } from '../public/shared/finance-utils.js';

test('calcula diário, semanal e mensal por funcionário sem misturar pessoas', () => {
  const staff = [{id:'a',full_name:'Ana'},{id:'b',full_name:'Bia'}];
  const entries = [
    {employee_id:'a',amount:100,entry_date:'2026-10-21'},
    {employee_id:'a',amount:-20,entry_date:'2026-10-21',is_adjustment:true},
    {employee_id:'a',amount:50,entry_date:'2026-10-19'},
    {employee_id:'a',amount:200,entry_date:'2026-10-18'},
    {employee_id:'a',amount:25,entry_date:'2026-10-22'},
    {employee_id:'b',amount:80,entry_date:'2026-10-21'}
  ];
  assert.deepEqual(summarizeFinanceEntries(entries,staff,'2026-10-21'),[
    {id:'a',full_name:'Ana',daily:80,weekly:130,monthly:330},
    {id:'b',full_name:'Bia',daily:80,weekly:80,monthly:80}
  ]);
});
