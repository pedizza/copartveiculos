import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page=readFileSync(new URL('../public/admin.html',import.meta.url),'utf8');
const api=readFileSync(new URL('../api/admin.js',import.meta.url),'utf8');

test('contract form submits exactly the selected client id, without a duplicate hidden field',()=>{
  const form=page.match(/<form[^>]*id="contractForm"[\s\S]*?<\/form>/)?.[0]||'';
  assert.match(form,/<div class="admin-form__full" id="contractClientPicker">[\s\S]*SELECIONAR CADASTRO DO CLIENTE \(OPCIONAL\)[\s\S]*<select name="clientUserId" id="contractClientUserId" aria-describedby="contractManualClientHelp">[\s\S]*Sem cadastro — preencher dados manualmente/);
  assert.match(form,/id="contractManualClientHelp">Esta opção aparece para todos os logins/);
  assert.equal((form.match(/name="clientUserId"/g)||[]).length,1);
  assert.match(page,/new Option\(`\$\{user\.full_name \|\| "Cliente"\} • \$\{contact\}`,user\.id\)/);
  assert.match(page,/clientUserId: formData\.get\("clientUserId"\) \|\| contractClientUserId\.value \|\| null/);
});

test('contracts created from an admin employee panel use that employee scope',()=>{
  assert.match(page,/adminFetch\(scopedAdminUrl\("\/api\/admin\?action=contracts"\)/);
  assert.match(page,/adminFetch\(scopedAdminUrl\("\/api\/admin\/customers"\)/);
  assert.match(page,/data-save-client-owner=/);
  assert.match(api,/if \(requestedStaffId && admin\.role === "admin"\) await assertOwned\(\{role:"employee",id:scope\},"customers",resolvedClientUserId\)/);
  assert.match(api,/ownerId: scope \|\| admin\.id/);
  assert.match(api,/role: "customer",\s*ownerId: scope \|\| admin\.id/);
  assert.match(api,/if \(action === "customer-owner"\)[\s\S]*role='employee' and is_active=true/);
});
