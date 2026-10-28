import { findPublicTrackingByCode } from '../src/admin/repository.js';
import { handleOptions, sendJson, getQueryParam } from './_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return sendJson(req, res, 405, {message: 'Método não permitido.'});
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  const code = String(getQueryParam(req, 'code') || '').trim().toUpperCase();
  if (!code) return sendJson(req, res, 400, {message: 'Código de rastreio não informado.'});
  try {
    const tracking = await findPublicTrackingByCode(code);
    return sendJson(req, res, tracking ? 200 : 404, tracking ? {tracking} : {message: 'Rastreio não encontrado.'});
  } catch {
    return sendJson(req, res, 500, {message: 'Erro ao consultar rastreio.'});
  }
}
