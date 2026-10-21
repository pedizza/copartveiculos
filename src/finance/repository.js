import { pool } from '../auth/db.js';

let schemaPromise;
export const ensureFinanceSchema = async () => {
  if (!schemaPromise) schemaPromise = pool.query(`
    create table if not exists public.app_financial_entries (
      id uuid primary key default gen_random_uuid(),
      employee_id uuid not null references public.app_users(id),
      amount numeric(12,2) not null check (amount > 0),
      entry_date date not null default (timezone('America/Sao_Paulo', now())::date),
      description text not null default '',
      created_by uuid not null references public.app_users(id),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      archived_month text,
      is_adjustment boolean not null default false
    );
    alter table public.app_financial_entries add column if not exists is_adjustment boolean not null default false;
    do $$ begin
      if not exists (
        select 1 from pg_constraint
        where conrelid='public.app_financial_entries'::regclass
          and conname='app_financial_entries_amount_check'
          and pg_get_constraintdef(oid) like '%<> 0%'
      ) then
        alter table public.app_financial_entries drop constraint if exists app_financial_entries_amount_check;
        alter table public.app_financial_entries add constraint app_financial_entries_amount_check check (amount <> 0);
      end if;
    end $$;
    create index if not exists app_financial_entries_employee_date_idx on public.app_financial_entries(employee_id, entry_date) where archived_month is null;
    create table if not exists public.app_financial_history (
      id uuid primary key default gen_random_uuid(),
      month text not null,
      employee_id uuid not null references public.app_users(id),
      total numeric(12,2) not null default 0,
      entries jsonb not null default '[]'::jsonb,
      reset_by uuid not null references public.app_users(id),
      reset_at timestamptz not null default now(),
      unique(month, employee_id)
    );
    create index if not exists app_financial_history_month_idx on public.app_financial_history(month desc, employee_id);
  `).catch(error => { schemaPromise = null; throw error; });
  await schemaPromise;
};

export const currentMonthInSaoPaulo = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(date);

export const getFinanceData = async ({employeeId = null, month = currentMonthInSaoPaulo()} = {}) => {
  await ensureFinanceSchema();
  const values = [month];
  const employeeFilter = employeeId ? (values.push(employeeId), `and e.employee_id=$${values.length}`) : '';
  const {rows: entries} = await pool.query(`
    select e.id,e.employee_id,u.full_name as employee_name,e.amount::float8 as amount,
      e.entry_date::text as entry_date,e.description,e.is_adjustment,e.created_at,e.updated_at
    from public.app_financial_entries e join public.app_users u on u.id=e.employee_id
    where e.archived_month is null and to_char(e.entry_date,'YYYY-MM')=$1 ${employeeFilter}
    order by e.entry_date desc,e.created_at desc`, values);
  const histValues = employeeId ? [employeeId] : [];
  const historyFilter = employeeId ? 'where h.employee_id=$1' : '';
  const {rows: history} = await pool.query(`select h.id,h.month,h.employee_id,u.full_name as employee_name,h.total::float8 as total,h.entries,h.reset_at
    from public.app_financial_history h join public.app_users u on u.id=h.employee_id ${historyFilter}
    order by h.month desc,u.full_name`, histValues);
  const staff = employeeId
    ? (await pool.query("select id,full_name from public.app_users where id=$1 and role='employee'",[employeeId])).rows
    : (await pool.query("select id,full_name from public.app_users where role='employee' order by full_name")).rows;
  return {month, entries, history, staff};
};

export const addFinanceEntry = async ({employeeId, amount, entryDate, description, actorId}) => {
  await ensureFinanceSchema();
  const {rows} = await pool.query(`insert into public.app_financial_entries(employee_id,amount,entry_date,description,created_by)
    select u.id,$2,$3,$4,$5 from public.app_users u where u.id=$1 and u.role='employee'
    returning id,employee_id,amount::float8 as amount,entry_date::text as entry_date,description,created_at,updated_at`,
  [employeeId, amount, entryDate, description, actorId]);
  if (!rows[0]) throw Object.assign(new Error('Funcionário não encontrado.'), {status:404});
  return rows[0];
};

export const updateFinanceEntry = async ({id, amount, entryDate, description}) => {
  await ensureFinanceSchema();
  const client=await pool.connect();
  try {
    await client.query('begin');
    await client.query('lock table public.app_financial_entries in share row exclusive mode');
    const {rows:originals}=await client.query('select employee_id,amount,entry_date from public.app_financial_entries where id=$1 and archived_month is null and is_adjustment=false',[id]);
    if(!originals[0]) throw Object.assign(new Error('Lançamento não encontrado.'), {status:404});
    const original=originals[0];
    const dates=[...new Set([String(original.entry_date).slice(0,10),entryDate])];
    const balances={};
    for(const date of dates){const {rows} = await client.query('select coalesce(sum(amount),0)::float8 as balance from public.app_financial_entries where employee_id=$1 and entry_date=$2 and archived_month is null',[original.employee_id,date]);balances[date]=rows[0].balance;}
    const oldDate=String(original.entry_date).slice(0,10),oldAmount=Number(original.amount);
    const oldBalance=balances[oldDate]-oldAmount+(oldDate===entryDate?amount:0);
    const newBalance=oldDate===entryDate?oldBalance:balances[entryDate]+amount;
    if(oldBalance < -0.001 || newBalance < -0.001) throw Object.assign(new Error('Essa edição deixaria o saldo diário negativo. Corrija o saldo diário antes de alterar o lançamento.'),{status:400});
    const {rows}=await client.query(`update public.app_financial_entries set amount=$2,entry_date=$3,description=$4,updated_at=now()
      where id=$1 and archived_month is null and is_adjustment=false returning id,employee_id,amount::float8 as amount,entry_date::text as entry_date,description,created_at,updated_at`,[id,amount,entryDate,description]);
    await client.query('commit');
    return rows[0];
  } catch(error) { await client.query('rollback'); throw error; }
  finally { client.release(); }
};

export const deleteFinanceEntry = async id => {
  await ensureFinanceSchema();
  const client=await pool.connect();
  try {
    await client.query('begin');
    await client.query('lock table public.app_financial_entries in share row exclusive mode');
    const {rows:originals}=await client.query('select employee_id,amount,entry_date from public.app_financial_entries where id=$1 and archived_month is null and is_adjustment=false',[id]);
    if(!originals[0]) throw Object.assign(new Error('Lançamento não encontrado.'), {status:404});
    const original=originals[0];
    const {rows:balances}=await client.query('select coalesce(sum(amount),0)::float8 as balance from public.app_financial_entries where employee_id=$1 and entry_date=$2 and archived_month is null',[original.employee_id,original.entry_date]);
    if(Number(balances[0].balance)-Number(original.amount)<-0.001) throw Object.assign(new Error('A exclusão deixaria o saldo diário negativo. Corrija o saldo diário antes de excluir.'),{status:400});
    await client.query('delete from public.app_financial_entries where id=$1',[id]);
    await client.query('commit');
  } catch(error) { await client.query('rollback'); throw error; }
  finally { client.release(); }
};

export const correctDailyBalance = async ({employeeId, targetAmount, entryDate, actorId}) => {
  await ensureFinanceSchema();
  const client=await pool.connect();
  try {
    await client.query('begin');
    await client.query('lock table public.app_financial_entries in share row exclusive mode');
    const {rows:users}=await client.query("select id from public.app_users where id=$1 and role='employee'",[employeeId]);
    if(!users[0]) throw Object.assign(new Error('Funcionário não encontrado.'),{status:404});
    const {rows}=await client.query(`select coalesce(sum(amount),0)::numeric(12,2) as balance from public.app_financial_entries
      where employee_id=$1 and entry_date=$2 and archived_month is null`,[employeeId,entryDate]);
    const delta=Math.round((targetAmount-Number(rows[0].balance))*100)/100;
    if(delta!==0) await client.query(`insert into public.app_financial_entries(employee_id,amount,entry_date,description,created_by,is_adjustment)
      values($1,$2,$3,'Correção do saldo diário',$4,true)`,[employeeId,delta,entryDate,actorId]);
    await client.query('commit');
    return {previousBalance:Number(rows[0].balance),targetAmount,delta};
  } catch(error) { await client.query('rollback'); throw error; }
  finally { client.release(); }
};

export const resetFinanceMonth = async ({month, actorId}) => {
  await ensureFinanceSchema();
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('lock table public.app_financial_entries in share row exclusive mode');
    await client.query(`insert into public.app_financial_history(month,employee_id,total,entries,reset_by)
      select $1,u.id,coalesce(sum(e.amount),0),coalesce(jsonb_agg(jsonb_build_object('id',e.id,'amount',e.amount,'date',e.entry_date,'description',e.description,'isAdjustment',e.is_adjustment) order by e.entry_date,e.created_at) filter(where e.id is not null),'[]'::jsonb),$2
      from public.app_users u left join public.app_financial_entries e on e.employee_id=u.id and e.archived_month is null and to_char(e.entry_date,'YYYY-MM')=$1
      where u.role='employee' group by u.id
      on conflict(month,employee_id) do update set total=app_financial_history.total+excluded.total,entries=app_financial_history.entries||excluded.entries,reset_by=excluded.reset_by,reset_at=now()`,[month,actorId]);
    await client.query(`update public.app_financial_entries set archived_month=$1,updated_at=now() where archived_month is null and to_char(entry_date,'YYYY-MM')=$1`,[month]);
    await client.query('commit');
  } catch(error) { await client.query('rollback'); throw error; }
  finally { client.release(); }
};
