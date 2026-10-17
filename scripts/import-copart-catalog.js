import fs from "node:fs/promises";
import dotenv from "dotenv";

dotenv.config();

const inputPath = process.argv[2] || "seed/catalog.json";
const allowedCategories = new Set(["Carros", "Picapes", "SUVs", "Utilitários", "Caminhões", "Tratores"]);
let pool;

try {
  const records = JSON.parse(await fs.readFile(inputPath, "utf8"));
  if (!Array.isArray(records) || records.length === 0) throw new Error("Arquivo de catálogo vazio ou inválido.");
  if (records.some((item) => !allowedCategories.has(item.category))) {
    throw new Error("Importação recusada: arquivo contém categoria fora do catálogo COPART autorizado.");
  }
  if (records.some((item) => !item.title || !item.slug || !item.image_url || !Array.isArray(item.gallery_images))) {
    throw new Error("Importação recusada: há veículos sem nome, slug ou fotos.");
  }

  ({ pool } = await import("../src/auth/db.js"));
  const { ensureAdminSchema } = await import("../src/admin/repository.js");
  await ensureAdminSchema();

  const client = await pool.connect();
  let inserted = 0;
  let alreadyPresent = 0;
  try {
    await client.query("begin");
    for (const item of records) {
      const result = await client.query(
        `insert into public.app_catalog_items (
          title, slug, category, sections, price, location, year_label, image_url,
          gallery_images, whatsapp, badge, gallery_count, description, is_published
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,null,$10,$11,$12,true)
        on conflict (slug) do nothing
        returning id`,
        [
          item.title,
          item.slug,
          item.category,
          item.sections,
          item.price,
          item.location || "Sob consulta",
          item.year_label,
          item.image_url,
          JSON.stringify(item.gallery_images),
          item.badge || item.category,
          item.gallery_images.length,
          item.description || ""
        ]
      );
      if (result.rowCount) inserted += 1;
      else alreadyPresent += 1;
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  console.log(`COPART: ${inserted} veículo(s) incluído(s), ${alreadyPresent} já existente(s); registros existentes foram preservados.`);
} catch (error) {
  console.error("Importação não concluída:", error.message);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
