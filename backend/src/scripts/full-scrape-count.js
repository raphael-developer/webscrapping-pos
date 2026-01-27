#!/usr/bin/env node
require("dotenv").config();
// Forçar modo headful (janela visível) – respeita se SCRAPER_FORCE_HEADLESS=1 estiver setado
process.env.SCRAPER_HEADFUL = "1";
// Reduzir concorrência para evitar instabilidade visual durante observação
process.env.SCRAPER_CONCURRENCY = process.env.SCRAPER_CONCURRENCY || "1";

const fs = require("fs").promises;
const path = require("path");
const Logger = require("../utils/Logger");
const ScraperService = require("../services/ScraperService");

async function main() {
  const scraper = new ScraperService();
  try {
    Logger.info(
      "Inicializando ScraperService em modo headful para contagem completa..."
    );
    await scraper.initialize();

    const result = await scraper.scrapeAllCourses();
    const { courses, categories, totalCourses } = result;

    // Algumas páginas podem carregar incrementalmente; garantir dedupe final
    const seen = new Set();
    const finalCourses = [];
    for (const c of courses) {
      const key =
        (c.title || c.name || "").toLowerCase().trim() +
        "|" +
        (c.category || "");
      if (!seen.has(key) && c.title) {
        seen.add(key);
        finalCourses.push(c);
      }
    }

    // Reindex IDs
    finalCourses.forEach((c, i) => {
      c.id = i + 1;
    });

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const outFile = path.join(process.cwd(), `full-scrape-courses-${ts}.json`);
    await fs.writeFile(
      outFile,
      JSON.stringify(
        {
          total: finalCourses.length,
          categories: categories
            .map(c => c.name || c.title || c.slug)
            .filter(Boolean),
          courses: finalCourses,
        },
        null,
        2
      )
    );

    console.log(`TOTAL_COURSES=${finalCourses.length}`);
    console.log(`ARQUIVO=${outFile}`);
    Logger.info(
      `Scraping completo finalizado. Total=${finalCourses.length}. Arquivo: ${outFile}`
    );
  } catch (err) {
    Logger.error("Erro no full-scrape-count:", err);
    console.error("ERRO_FULL_SCRAPE", err.message);
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

module.exports = main;
