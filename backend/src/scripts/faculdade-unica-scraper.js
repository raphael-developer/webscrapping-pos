const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

class FaculdadeUnicaScraper {
  constructor() {
    this.allCourses = [];
    this.categories = [];
    this.baseUrl = "https://www.faculdadeunica.com.br/pos-graduacao";
  }

  async init() {
    console.log("🚀 Iniciando browser headless para Faculdade Única...");
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
    console.log("🌐 Navegando para Faculdade Única...");
    await this.page.goto(this.baseUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await this.page.waitForTimeout(3000);
    console.log("📊 Extraindo categorias...");

    // Buscar pelos botões "ESCOLHER CURSO"
    const categories = await this.page.$$eval(
      "button.button-card.mt-3",
      buttons => {
        return buttons
          .map((button, index) => {
            // Buscar o card pai que contém a categoria
            const card =
              button.closest(".card") || button.closest('[class*="card"]');
            let title = "Categoria não identificada";

            if (card) {
              // Procurar título da categoria no card
              const titleElement =
                card.querySelector("h3") ||
                card.querySelector("h2") ||
                card.querySelector('[class*="title"]') ||
                card.querySelector(".card-title");

              if (titleElement) {
                title = titleElement.textContent?.trim();
              } else {
                // Se não encontrar título específico, pegar texto do card
                const cardText = card.textContent?.trim();
                const lines = cardText
                  .split("\n")
                  .filter(line => line.trim() && !line.includes("ESCOLHER"));
                title = lines[0]?.trim() || `Categoria ${index + 1}`;
              }
            }

            return {
              index,
              title,
              buttonText: button.textContent?.trim(),
              selector: `button.button-card.mt-3:nth-child(${index + 1})`,
            };
          })
          .filter(cat => cat.title && cat.buttonText?.includes("ESCOLHER"));
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
      // Voltar para a página principal primeiro
      await this.page.goto(this.baseUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      await this.page.waitForTimeout(2000);

      // Clicar no botão "ESCOLHER CURSO" da categoria
      const buttons = await this.page.$$("button.button-card.mt-3");
      if (buttons[category.index]) {
        await buttons[category.index].click();
        console.log(`   ✅ Clicou em "ESCOLHER CURSO" para ${category.title}`);

        // Aguardar carregamento AJAX (não navegação)
        await this.page.waitForTimeout(5000);

        // Contar cursos e carregar todos via AJAX
        let coursesCount = await this.loadAllCoursesInCategory();

        console.log(`📚 ${category.title}: ${coursesCount} cursos encontrados`);

        return {
          category: category.title,
          coursesCount,
          courses: [],
        };
      }

      return {
        category: category.title,
        coursesCount: 0,
        courses: [],
        error: "Botão não encontrado",
      };
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
          '[class*="course"], .course-card, [class*="card"]',
          courses => {
            return courses.filter(course => {
              const text = course.textContent?.toLowerCase();
              return (
                text &&
                (text.includes("pós") ||
                  text.includes("graduação") ||
                  text.includes("mba"))
              );
            }).length;
          }
        );

        console.log(`   📊 Cursos visíveis: ${currentCourses}`);

        // Procurar pelo botão "Carregar mais cursos"
        const loadMoreButton = await this.page.$(
          "button.cta-return-course-api"
        );

        if (!loadMoreButton) {
          console.log(
            `   ⚠️ Botão "Carregar mais" não encontrado. Total: ${currentCourses}`
          );
          totalCourses = currentCourses;
          break;
        }

        // Verificar se o botão está visível e clicável
        const isVisible = await this.page.evaluate(el => {
          const style = window.getComputedStyle(el);
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            el.offsetHeight > 0
          );
        }, loadMoreButton);

        if (!isVisible) {
          console.log(
            `   ✅ Botão "Carregar mais" não está mais visível. Total: ${currentCourses}`
          );
          totalCourses = currentCourses;
          break;
        }

        console.log(
          `   🔄 Clicando em "Carregar mais cursos" (${
            clickCount + 1
          }/${maxClicks})`
        );
        await loadMoreButton.click();

        // Aguardar resposta AJAX
        await this.page.waitForTimeout(2000);

        // Verificar se novos cursos foram carregados
        const newCoursesCount = await this.page.$$eval(
          '[class*="course"], .course-card, [class*="card"]',
          courses => {
            return courses.filter(course => {
              const text = course.textContent?.toLowerCase();
              return (
                text &&
                (text.includes("pós") ||
                  text.includes("graduação") ||
                  text.includes("mba"))
              );
            }).length;
          }
        );

        if (newCoursesCount === currentCourses) {
          console.log(
            `   ✅ Não há mais cursos para carregar. Total: ${newCoursesCount}`
          );
          totalCourses = newCoursesCount;
          break;
        }

        totalCourses = newCoursesCount;
        clickCount++;
      }

      return totalCourses;
    } catch (error) {
      console.log(`⚠️ Erro ao carregar cursos: ${error.message}`);
      return (
        (await this.page.$$eval(
          '[class*="course"], .course-card, [class*="card"]',
          courses => {
            return courses.filter(course => {
              const text = course.textContent?.toLowerCase();
              return (
                text &&
                (text.includes("pós") ||
                  text.includes("graduação") ||
                  text.includes("mba"))
              );
            }).length;
          }
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
        if (result) {
          results.push(result);
          totalCourses += result.coursesCount || 0;
        }
      }

      console.log(`\n🎉 RESULTADO FINAL - FACULDADE ÚNICA:`);
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
        "resultado-faculdade-unica.json"
      );
      fs.writeFileSync(
        outputFile,
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            site: "Faculdade Única",
            url: this.baseUrl,
            totalCategories: categories.length,
            totalCourses,
            categories: results,
          },
          null,
          2
        )
      );

      console.log(`\n💾 Resultados salvos em: ${outputFile}`);

      if (totalCourses >= 800) {
        console.log(
          `🎯 META ATINGIDA! Encontrados ${totalCourses} cursos (meta: 878+)`
        );
      }
    } catch (error) {
      console.error("❌ Erro durante o scraping:", error);
    } finally {
      await this.browser.close();
    }
  }
}

// Executar
console.log("🏫 SCRAPER FACULDADE ÚNICA - SITE CORRETO!");
const scraper = new FaculdadeUnicaScraper();
scraper.scrapeAll();
