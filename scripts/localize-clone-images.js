import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(await fs.readFile(path.join(root, 'seed/catalog.json'), 'utf8'));
const urls = [...new Set(catalog.flatMap(r => [r.image_url, ...(r.gallery_images || [])]).filter(Boolean))];
const replacements = new Map();
const failures = [];
const target = path.join(root, 'public/catalogo-assets/copar-import');
await fs.mkdir(target, {recursive:true});
async function localize(url) {
  if (url.startsWith('/')) {
    await fs.access(path.join(root, 'public', url));
    return url;
  }
  let bytes, mime;
  if (url.startsWith('data:')) {
    const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(url);
    if (!match) throw Error('Formato inline não suportado');
    mime = match[1]; bytes = Buffer.from(match[2], 'base64');
  } else {
    const response = await fetch(url, {signal:AbortSignal.timeout(45000)});
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    mime = (response.headers.get('content-type') || '').split(';')[0];
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (!mime.startsWith('image/') || !bytes.length) throw Error('Resposta não é imagem');
  const ext = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif','image/svg+xml':'svg'}[mime];
  if (!ext) throw Error(`Tipo não suportado: ${mime}`);
  const name = `${createHash('sha256').update(bytes).digest('hex')}.${ext}`;
  await fs.writeFile(path.join(target,name),bytes);
  return `/catalogo-assets/copar-import/${name}`;
}
let cursor = 0;
await Promise.all(Array.from({length:4},async()=>{
  while(cursor < urls.length) {
    const index=cursor++; const url=urls[index];
    try { replacements.set(url,await localize(url)); }
    catch(error) { failures.push({index,error:error.message}); }
  }
}));
if (failures.length) { console.error(JSON.stringify({failures})); process.exitCode=1; }
else {
  for (const item of catalog) {
    item.image_url = replacements.get(item.image_url) || item.image_url;
    item.gallery_images = (item.gallery_images || []).map(u => replacements.get(u) || u);
  }
  await fs.writeFile(path.join(root,'seed/catalog.json'),JSON.stringify(catalog,null,2)+'\n');
  const items=catalog.map(r=>({title:r.title,slug:r.slug,category:r.category,sections:r.sections,price:Number(r.price),location:r.location,yearLabel:r.year_label,imageUrl:r.image_url,galleryImages:r.gallery_images,whatsapp:r.whatsapp,badge:r.badge,galleryCount:r.gallery_count,description:r.description,isPublished:r.is_published}));
  await fs.writeFile(path.join(root,'src/admin/default-catalog.js'),`export const DEFAULT_CATALOG_ITEMS = ${JSON.stringify(items,null,2)};\n`);
  console.log(JSON.stringify({vehicles:catalog.length,uniqueImageReferences:urls.length,allImagesLocal:true}));
}
