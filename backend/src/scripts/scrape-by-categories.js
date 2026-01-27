#!/usr/bin/env node
require("dotenv").config();

// Forçar modo headful para visualização
process.env.SCRAPER_HEADFUL = "1";

const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");

class CategoryScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.allCourses = [];
    this.categories = [];
    this.baseUrl = "https://www.faculdadeunica.com.br/pos-graduacao";
  }

  async init() {
    console.log("🚀 Iniciando browser em modo headful...");
    browser = await puppeteer.launch({
      headless: "new",
      executablePath:
        "/home/raphael/.cache/puppeteer/chrome/linux-140.0.7339.82/chrome-linux64/chrome",
      defaultViewport: null,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920,1080",
      ],
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
  }

  async navigateToBase() {
    console.log("📍 Navegando para página principal...");
    await this.page.goto(this.baseUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await this.page.waitForTimeout(3000);
  }

  async extractCategories(page) {
    Logger.info("🔍 Extraindo categorias da página inicial...");

    // Aguardar as categorias carregarem
    await page.waitForSelector(".categories__wrapper__cards", {
      timeout: 10000,
    });
    await page.waitForTimeout(2000);

    const categories = await page.$$eval(
      ".categories__wrapper__cards",
      cards => {
        return cards
          .map((card, index) => {
            // Procurar por diferentes estruturas possíveis
            const titleElement =
              card.querySelector("h3") ||
              card.querySelector(".category-title") ||
              card.querySelector('[class*="title"]');

            const linkElement = card.querySelector("a") || card;

            const title = titleElement
              ? titleElement.textContent.trim()
              : card.textContent.split("\n")[1]?.trim() ||
                `Categoria ${index + 1}`;

            const href = linkElement.href || "";

            return {
              title: title,
              href: href,
              index: index,
            };
          })
          .filter(
            cat => cat.title && cat.title !== "Escola" && cat.title.length > 2
          );
      }
    );

    Logger.info(
      `✅ Encontradas ${categories.length} categorias: ${categories
        .map(c => c.title)
        .join(", ")}`
    );
    return categories;
  }
  async scrapeCategory(categoryInfo) {
    console.log(`\n🎯 Iniciando scraping da categoria: ${categoryInfo.name}`);

    // Voltar à página principal
    await this.page.goto(this.baseUrl, { waitUntil: "networkidle2" });
    await this.page.waitForTimeout(2000);
    await this.autoScroll();

    // Clicar no botão "ESCOLHER CURSO" da categoria
    const clicked = await this.page.evaluate(categoryIndex => {
      const cards = document.querySelectorAll(".card.card-area-course");
      const targetCard = cards[categoryIndex];

      if (targetCard) {
        const button = targetCard.querySelector("button.button-card");
        if (button) {
          button.click();
          return true;
        }
      }
      return false;
    }, categoryInfo.index);

    if (!clicked) {
      console.log(
        `❌ Não foi possível clicar na categoria ${categoryInfo.name}`
      );
      return [];
    }

    // Aguardar carregamento da página da categoria
    await this.page.waitForTimeout(3000);

    // Carregar todos os cursos da categoria
    await this.loadAllCoursesInCategory();

    // Extrair cursos
    const courses = await this.extractCoursesFromPage(categoryInfo.name);
    console.log(
      `✅ Categoria ${categoryInfo.name}: ${courses.length} cursos encontrados`
    );

    return courses;
  }

  async loadAllCoursesInCategory() {
    console.log("⏳ Carregando todos os cursos da categoria...");

    let clickCount = 0;
    const maxClicks = 50; // Limite de segurança

    while (clickCount < maxClicks) {
      // Scroll até o final da página
      await this.autoScroll();
      await this.page.waitForTimeout(1000);

      // Tentar clicar no botão "Carregar mais cursos"
      const clicked = await this.page.evaluate(() => {
        const button = document.querySelector("button.cta-return-course-api");
        if (button && button.offsetParent !== null && !button.disabled) {
          button.click();
          return true;
        }
        return false;
      });

      if (!clicked) {
        console.log(
          `🏁 Botão "Carregar mais cursos" não encontrado/inativo após ${clickCount} cliques`
        );
        break;
      }

      clickCount++;
      console.log(`🔄 Clique ${clickCount} em "Carregar mais cursos"`);

      // Aguardar carregamento AJAX
      try {
        await this.page.waitForFunction(
          () =>
            !document.querySelector("button.cta-return-course-api[disabled]"),
          { timeout: 10000 }
        );
      } catch (e) {
        // Timeout é normal quando não há mais conteúdo
      }

      await this.page.waitForTimeout(2000);
    }

    console.log(`✅ Finalizou carregamento com ${clickCount} cliques`);
  }

  async extractCoursesFromPage(categoryName) {
    return await this.page.evaluate(category => {
      const courseElements = document.querySelectorAll(
        'a[href*="/pos-graduacao/"]'
      );
      const courses = [];
      const seen = new Set();

      courseElements.forEach(element => {
        const href = element.href;
        const title = (element.textContent || "").trim();

        if (href && title && title.length > 5 && !href.includes("#")) {
          const cleanTitle = title.replace(/Matricule-se.*$/i, "").trim();
          const key = cleanTitle.toLowerCase();

          if (!seen.has(key) && cleanTitle.length > 3) {
            seen.add(key);
            courses.push({
              title: cleanTitle,
              url: href,
              category: category,
            });
          }
        }
      });

      return courses;
    }, categoryName);
  }

  async autoScroll() {
    await this.page.evaluate(async () => {
      await new Promise(resolve => {
        let totalHeight = 0;
        const distance = 400;
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

  async scrapeAllCategories() {
    const allCourses = [];

    for (let i = 0; i < this.categories.length; i++) {
      const category = this.categories[i];
      try {
        const courses = await this.scrapeCategory(category);
        allCourses.push(...courses);

        console.log(
          `📊 Progresso: ${i + 1}/${
            this.categories.length
          } categorias processadas`
        );
        console.log(`📈 Total de cursos até agora: ${allCourses.length}`);
      } catch (error) {
        console.error(`❌ Erro na categoria ${category.name}:`, error.message);
      }
    }

    return allCourses;
  }

  async saveResults(courses) {
    // Remover duplicatas finais
    const uniqueCourses = [];
    const seen = new Set();

    courses.forEach((course, index) => {
      const key = `${course.title.toLowerCase()}|${course.category}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCourses.push({
          id: uniqueCourses.length + 1,
          ...course,
        });
      }
    });

    const result = {
      total: uniqueCourses.length,
      categories: [...new Set(uniqueCourses.map(c => c.category))],
      courses: uniqueCourses,
      scrapedAt: new Date().toISOString(),
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `category-scrape-${timestamp}.json`;
    const filepath = path.join(process.cwd(), filename);

    await fs.writeFile(filepath, JSON.stringify(result, null, 2));

    console.log(`\n🎉 SCRAPING CONCLUÍDO!`);
    console.log(`📊 Total de cursos: ${uniqueCourses.length}`);
    console.log(`📁 Arquivo salvo: ${filename}`);
    console.log(`TOTAL_COURSES=${uniqueCourses.length}`);

    return result;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      await this.navigateToBase();
      await this.extractCategories();

      if (this.categories.length === 0) {
        throw new Error("Nenhuma categoria encontrada");
      }

      const allCourses = await this.scrapeAllCategories();
      await this.saveResults(allCourses);
    } catch (error) {
      console.error("❌ Erro durante scraping:", error);
      throw error;
    } finally {
      await this.close();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const scraper = new CategoryScraper();
  scraper.run().catch(console.error);
}

module.exports = CategoryScraper;
