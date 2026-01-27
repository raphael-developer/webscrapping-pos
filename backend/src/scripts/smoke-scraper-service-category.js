#!/usr/bin/env node
require("dotenv").config();

// Smoke test focado no fluxo real (ScraperService + cluster) para uma categoria.
// Uso:
//   node src/scripts/smoke-scraper-service-category.js "Empresarial, TI e Negócios"
//   node src/scripts/smoke-scraper-service-category.js --slug empresarial-ti-e-negocios

const Logger = require("../utils/Logger");
const ScraperService = require("../services/ScraperService");

function parseArgs() {
  const args = process.argv.slice(2);
  const slugIdx = args.indexOf("--slug");
  const slug = slugIdx >= 0 ? args[slugIdx + 1] : null;
  const name = slug ? null : args.join(" ").trim();
  return { slug, name };
}

async function main() {
  // defaults seguros para smoke
  process.env.SCRAPER_CONCURRENCY = process.env.SCRAPER_CONCURRENCY || "1";
  process.env.SCRAPER_CATEGORY_ATTEMPTS =
    process.env.SCRAPER_CATEGORY_ATTEMPTS || "1";
  process.env.SCRAPER_ENABLE_ARTIFACTS =
    process.env.SCRAPER_ENABLE_ARTIFACTS || "0";
  process.env.SCRAPER_LOAD_MORE_MODE =
    process.env.SCRAPER_LOAD_MORE_MODE || "off";

  const { slug, name } = parseArgs();
  if (!slug && !name) {
    console.error(
      "Uso: node src/scripts/smoke-scraper-service-category.js <Nome da categoria> | --slug <slug>",
    );
    process.exit(2);
  }

  const scraper = new ScraperService();
  try {
    Logger.info("Inicializando ScraperService (smoke)...");
    await scraper.initialize();

    Logger.info("Coletando categorias...");
    const categories = await scraper.scrapeCategories();

    const find = (categories || []).find(c => {
      const cSlug = (c.slug || "").toLowerCase();
      const cName = (c.name || c.title || "").toLowerCase();
      if (slug) return cSlug === String(slug).toLowerCase();
      return cName.includes(String(name).toLowerCase());
    });

    if (!find) {
      console.error(
        `Categoria não encontrada. Disponíveis: ${(categories || [])
          .map(c => `${c.name || c.title} (${c.slug})`)
          .join(", ")}`,
      );
      process.exit(3);
    }

    Logger.info(
      `Scraping categoria: ${find.name || find.title} (${find.slug})`,
    );
    const before = Array.isArray(scraper.courses) ? scraper.courses.length : 0;
    await scraper.scrapeCategoryPages(find);
    const after = Array.isArray(scraper.courses) ? scraper.courses.length : 0;
    const delta = Math.max(0, after - before);

    console.log(`SMOKE_CATEGORY=${find.slug}`);
    console.log(`SMOKE_COURSES=${delta}`);
  } catch (err) {
    Logger.error("Erro no smoke:", err);
    console.error("SMOKE_ERROR", err.message);
    process.exitCode = 1;
  } finally {
    try {
      await scraper.close();
    } catch (_) {}
  }
}

if (require.main === module) {
  main();
}
