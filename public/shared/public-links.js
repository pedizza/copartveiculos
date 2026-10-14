export function publicOrigin(configured = globalThis.location?.origin || 'http://localhost:3000') {
  try {
    const url = new URL(configured);
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return url.origin;
  } catch (_) { /* Reject invalid configuration without exposing its value. */ }
  throw new Error('Configure APP_URL com a URL válida da COPAR.');
}
export const clientLink = (page, token, origin) => `${publicOrigin(origin)}/${page}?token=${encodeURIComponent(token || '')}`;
