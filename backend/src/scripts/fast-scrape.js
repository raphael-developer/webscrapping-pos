const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

class FastScraper {
  constructor() {
    this.allCourses = [];
    this.categories = [];
    this.baseUrl = "https://cursos.alura.com.br";
  }

  async init() {
    console.log("🚀 Iniciando browser headless...");
    this.browser = await puppeteer.launch({
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
    await this.page.setViewport({ width: 1920, height: 1080 });
    console.log("✅ Browser iniciado");
  }

  async extractCategories() {
    console.log("🌐 Navegando para o site...");
    await this.page.goto(this.baseUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await this.page.waitForTimeout(3000);
    console.log("📊 Extraindo categorias...");

    const categories = await this.page.$$eval(
      ".categories__wrapper__cards",
      cards => {
        return cards
          .map((card, index) => {
            const titleElement =
              card.querySelector("h3") ||
              card.querySelector('[class*="title"]');
            let title = titleElement?.textContent?.trim();

            if (!title) {
              // Pegar o segundo linha do texto se não tem h3
              const lines = card.textContent
                ?.trim()
                .split("\n")
                .filter(line => line.trim());
              title =
                lines && lines.length > 1
                  ? lines[1].trim()
                  : `Categoria ${index + 1}`;
            }

            return {
              index,
              title,
              url: this.baseUrl,
              selector: `.categories__wrapper__cards:nth-child(${index + 1})`,
            };
          })
          .filter(cat => cat.title && !cat.title.includes("Matrícule-se"));
      }
    );

    this.categories = categories;
    console.log(`✅ Encontradas ${categories.length} categorias:`);
    categories.forEach((cat, i) => {
      console.log(`${i + 1}. ${cat.title}`);
    });

    return categories;
  }

  async scrapeCategory(category) {
    console.log(`\n🎯 Processando categoria: ${category.title}`);

    try {
      // Clicar na categoria
      const categoryElement = await this.page.$(
        `.categories__wrapper__cards:nth-child(${category.index + 1})`
      );
      if (categoryElement) {
        await categoryElement.click();
        await this.page.waitForTimeout(2000);
        await this.page.waitForNavigation({
          waitUntil: "networkidle2",
          timeout: 30000,
        });

        // Contar cursos na página atual
        let coursesCount = await this.loadAllCoursesInCategory();

        console.log(`📚 ${category.title}: ${coursesCount} cursos encontrados`);

        // Voltar para a página principal
        await this.page.goto(this.baseUrl, { waitUntil: "networkidle2" });
        await this.page.waitForTimeout(2000);

        return {
          category: category.title,
          coursesCount,
          courses: [], // Por enquanto só contando
        };
      }
    } catch (error) {
      console.error(
        `❌ Erro ao processar categoria ${category.title}:`,
        error.message
      );
      return {
        category: category.title,
        coursesCount: 0,
        courses: [],
        error: error.message,
      };
    }
  }

  async loadAllCoursesInCategory() {
    let totalCourses = 0;
    let clickCount = 0;
    const maxClicks = 50; // Limite de segurança

    try {
      while (clickCount < maxClicks) {
        // Contar cursos atuais
        const currentCourses = await this.page.$$eval(
          '[class*="course"]',
          courses => courses.length
        );

        // Procurar pelo botão "Carregar mais"
        const loadMoreButton = await this.page.$(
          'button:contains("Carregar mais"), button:contains("Ver mais"), .load-more, [class*="load-more"]'
        );

        if (!loadMoreButton) {
          // Tentar scroll para baixo para carregar mais
          await this.page.evaluate(() =>
            window.scrollTo(0, document.body.scrollHeight)
          );
          await this.page.waitForTimeout(1000);

          const newCourses = await this.page.$$eval(
            '[class*="course"]',
            courses => courses.length
          );
          if (newCourses === currentCourses) {
            break; // Não há mais cursos para carregar
          }
          totalCourses = newCourses;
        } else {
          await loadMoreButton.click();
          await this.page.waitForTimeout(1500);
          clickCount++;
          totalCourses = await this.page.$$eval(
            '[class*="course"]',
            courses => courses.length
          );
        }
      }

      return totalCourses;
    } catch (error) {
      console.log(`⚠️ Erro ao carregar cursos: ${error.message}`);
      return (
        (await this.page.$$eval(
          '[class*="course"]',
          courses => courses.length
        )) || 0
      );
    }
  }

  async scrapeAll() {
    await this.init();

    try {
      const categories = await this.extractCategories();
      let totalCourses = 0;
      const results = [];

      for (const category of categories) {
        const result = await this.scrapeCategory(category);
        results.push(result);
        totalCourses += result.coursesCount;
      }

      console.log(`\n🎉 RESULTADO FINAL:`);
      console.log(`📊 Total de categorias: ${categories.length}`);
      console.log(`📚 Total de cursos: ${totalCourses}`);

      results.forEach(result => {
        console.log(`   ${result.category}: ${result.coursesCount} cursos`);
      });

      // Salvar resultado
      const outputFile = path.join(
        __dirname,
        "..",
        "..",
        "resultado-scraping-categorias.json"
      );
      fs.writeFileSync(
        outputFile,
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            totalCategories: categories.length,
            totalCourses,
            categories: results,
          },
          null,
          2
        )
      );

      console.log(`\n💾 Resultados salvos em: ${outputFile}`);
    } catch (error) {
      console.error("❌ Erro durante o scraping:", error);
    } finally {
      await this.browser.close();
    }
  }
}

// Executar
const scraper = new FastScraper();
scraper.scrapeAll();
