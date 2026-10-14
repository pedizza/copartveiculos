import { listPublicCatalogItems, findPublicCatalogItemBySlug } from '../src/admin/repository.js';
import { handleOptions, sendJson, getQueryParam } from './_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') return sendJson(req, res, 405, {message: 'Método não permitido.'});
  try {
    if (getQueryParam(req, 'action') === 'detail') {
      const slug = String(getQueryParam(req, 'slug') || '').trim();
      if (!slug) return sendJson(req, res, 400, {message: 'Slug do item não informado.'});
      const item = await findPublicCatalogItemBySlug(slug);
      return sendJson(req, res, item ? 200 : 404, item ? {item} : {message: 'Item não encontrado.'});
    }
    const items = await listPublicCatalogItems(Object.fromEntries(
      ['section', 'category', 'search', 'excludeSlug', 'limit'].map(key => [key, getQueryParam(req, key) || null])
    ));
    return sendJson(req, res, 200, {items});
  } catch {
    return sendJson(req, res, 500, {message: 'Erro ao carregar catálogo.'});
  }
}
