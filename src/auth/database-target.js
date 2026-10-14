// Compare targets without logging URLs, users or passwords.
export function databaseTarget(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('URL de banco inválida. Revise o .env local.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Use uma URL PostgreSQL para o banco COPAR.');
  const user = decodeURIComponent(url.username);
  const direct = /^db\.([a-z0-9]+)\.supabase\.co$/.exec(url.hostname);
  const pooled = url.hostname.endsWith('.pooler.supabase.com') && /^postgres\.([a-z0-9]+)$/.exec(user);
  if (direct || pooled) return `supabase:${(direct || pooled)[1]}:${url.pathname}`;
  return `${url.hostname}:${url.port || '5432'}:${user}:${url.pathname}`;
}
