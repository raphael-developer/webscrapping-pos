#!/usr/bin/env node
require("dotenv").config();
const fs = require("fs").promises;
const path = require("path");
const puppeteer = require("puppeteer");
const Logger = require("../utils/Logger");

/*
  Script: scrape-count.js
  Objetivo: Obter a contagem e lista atual de cursos da página de pós-graduação.
  Uso:
    node src/scripts/scrape-count.js          (headless)
    node src/scripts/scrape-count.js --headful (tenta abrir UI se DISPLAY disponível)

  Saída:
    - Arquivo JSON: scraped-courses-<timestamp>.json
    - Linha no stdout: TOTAL_COURSES=<n>
*/

const TARGET_URL =
  process.env.TARGET_URL || "https://unicaposead.com/area/pos-graduacao/";

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    headful: args.includes("--headful"),
  };
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 600;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

function normalizeTitle(t) {
  return (t || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/Matricule-se.*$/i, "")
    .trim();
}

function dedupe(courses) {
  const byKey = new Map();
  for (const c of courses) {
    const key = c.slug || c.cleanTitle || c.title;
    if (!byKey.has(key)) byKey.set(key, c);
  }
  return Array.from(byKey.values());
}

async function extractCourses(page) {
  // Executa no contexto da página
  const raw = await page.evaluate(() => {
    const anchors = Array.from(
      document.querySelectorAll('a[href*="/pos-graduacao/"]')
    );
    return anchors.map(a => ({
      href: a.href,
      text: (a.textContent || "").trim(),
    }));
  });

  const courses = raw
    .filter(r => r.href && r.text && !r.href.includes("#"))
    .map(r => {
      const title = normalizeTitle(r.text);
      const cleanTitle = title
        .toUpperCase()
        .replace(/[^A-Z0-9ÁÉÍÓÚÃÕÂÊÎÔÛÇ\s]/g, "")
        .trim();
      const slug = (() => {
        try {
          const u = new URL(r.href);
          // slug = path depois de /pos-graduacao/
          const ix = u.pathname.indexOf("/pos-graduacao/");
          if (ix >= 0) {
            return u.pathname
              .substring(ix + "/pos-graduacao/".length)
              .replace(/\/$/, "");
          }
          return u.pathname.replace(/\/$/, "");
        } catch {
          return null;
        }
      })();
      return {
        title,
        cleanTitle,
        slug,
        url: r.href,
        category: "Pós-graduação",
      };
    })
    .filter(c => c.title && c.title.length > 4);

  return dedupe(courses);
}

async function run() {
  const { headful } = parseArgs();
  const forceHeadfulEnv = String(process.env.SCRAPER_HEADFUL || "") === "1";
  const wantHeadful = headful || forceHeadfulEnv; // permitir forçar sem DISPLAY; se faltar X vai quebrar (intencional p/ ver)
  const headless = wantHeadful ? false : "new";
  Logger.info(
    `Iniciando scraping em ${TARGET_URL} (modo=${
      headless === false ? "HEADFUL" : "HEADLESS"
    })`
  );

  const browser = await puppeteer.launch({
    headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--no-zygote",
      "--disable-gpu",
      "--single-process",
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    process.env.SCRAPER_USER_AGENT ||
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36"
  );

  let courses = [];
  try {
    await page.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 120000 });
    await page.waitForTimeout(2000);
    try {
      await autoScroll(page);
    } catch (_) {}
    // Pequena espera adicional para carregamento dinâmico
    await page.waitForTimeout(1000);

    courses = await extractCourses(page);
    Logger.info(`Cursos coletados (bruto dedup): ${courses.length}`);

    // Ordenar alfabeticamente para consistência
    courses.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

    // Adicionar IDs sequenciais
    courses = courses.map((c, i) => ({ id: i + 1, ...c }));

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const outFile = path.join(process.cwd(), `scraped-courses-${ts}.json`);
    await fs.writeFile(outFile, JSON.stringify(courses, null, 2));
    console.log(`TOTAL_COURSES=${courses.length}`);
    console.log(`ARQUIVO=${outFile}`);
    Logger.info(`Arquivo salvo em ${outFile}`);
  } catch (err) {
    Logger.error("Falha durante scraping (scrape-count):", err);
    console.error("ERRO_SCRAPER", err.message);
    process.exitCode = 1;
  } finally {
    try {
      await browser.close();
    } catch (_) {}
  }
}

if (require.main === module) {
  run();
}

module.exports = run;
