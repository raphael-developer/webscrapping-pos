require("dotenv").config();
const puppeteer = require("puppeteer");
const Logger = require("../utils/Logger");

async function scrapeUnicaCoursesWithCategories() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    Logger.info("Acessando site da Faculdade Única...");
    await page.goto("https://www.faculdadeunica.com.br/pos-graduacao", {
      waitUntil: "networkidle2",
    });

    await page.waitForTimeout(3000);

    // Primeiro, identificar todas as categorias
    const categories = await page.evaluate(() => {
      const categoryElements = document.querySelectorAll(
        '.category-card, .card-category, [class*="category"], [class*="area"]'
      );
      const categories = [];

      categoryElements.forEach(el => {
        const title = el
          .querySelector("h3, h4, h5, .title, .category-title")
          ?.textContent?.trim();
        const button = el.querySelector("button.button-card");

        if (title && button) {
          categories.push({
            name: title,
            element: el,
          });
        }
      });

      return categories.map(cat => cat.name);
    });

    Logger.info(`Encontradas ${categories.length} categorias:`, categories);

    const allCourses = [];
    let courseId = 1;

    // Para cada categoria, clicar e coletar cursos
    for (const categoryName of categories) {
      try {
        Logger.info(`Processando categoria: ${categoryName}`);

        // Encontrar e clicar no botão da categoria
        await page.evaluate(catName => {
          const categoryCards = document.querySelectorAll(
            '.category-card, .card-category, [class*="category"], [class*="area"]'
          );

          for (const card of categoryCards) {
            const title = card
              .querySelector("h3, h4, h5, .title, .category-title")
              ?.textContent?.trim();
            if (title === catName) {
              const button = card.querySelector("button.button-card");
              if (button) {
                button.click();
                return true;
              }
            }
          }
          return false;
        }, categoryName);

        await page.waitForTimeout(2000);

        // Coletar cursos da categoria
        let hasMoreCourses = true;

        while (hasMoreCourses) {
          // Coletar cursos visíveis
          const courses = await page.evaluate(category => {
            const courseElements = document.querySelectorAll(
              '.course-card, .card-course, [class*="course"]'
            );
            const courses = [];

            courseElements.forEach(el => {
              const name = el
                .querySelector("h3, h4, h5, .course-title, .title")
                ?.textContent?.trim();
              const description = el
                .querySelector(".description, .course-description, p")
                ?.textContent?.trim();
              const link = el.querySelector("a")?.href;

              if (name && link) {
                courses.push({
                  name: name,
                  description: description || "",
                  link: link,
                  category: category,
                });
              }
            });

            return courses;
          }, categoryName);

          // Adicionar cursos encontrados
          courses.forEach(course => {
            if (!allCourses.find(c => c.name === course.name)) {
              allCourses.push({
                id: courseId++,
                ...course,
              });
            }
          });

          // Verificar se há botão "Carregar mais" — usar evaluate para buscar por texto (fallback para .load-more)
          const clicked = await page.evaluate(() => {
            const candidates = Array.from(
              document.querySelectorAll("button, .load-more")
            );
            const btn = candidates.find(el => {
              const txt = (el.textContent || "").trim().toUpperCase();
              return (
                /CARREGAR MAIS/.test(txt) ||
                /VER MAIS/.test(txt) ||
                el.classList.contains("load-more")
              );
            });
            if (btn) {
              btn.click();
              return true;
            }
            return false;
          });

          if (clicked) {
            await page.waitForTimeout(2000);
          } else {
            hasMoreCourses = false;
          }
        }

        Logger.info(
          `Categoria ${categoryName}: ${
            allCourses.filter(c => c.category === categoryName).length
          } cursos`
        );
      } catch (error) {
        Logger.error(`Erro ao processar categoria ${categoryName}:`, error);
      }
    }

    Logger.info(`Total de cursos coletados: ${allCourses.length}`);

    // Salvar dados
    const fs = require("fs").promises;
    await fs.writeFile(
      "cursos-por-categorias.json",
      JSON.stringify(allCourses, null, 2)
    );

    return allCourses;
  } catch (error) {
    Logger.error("Erro no scraping:", error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  scrapeUnicaCoursesWithCategories();
}

module.exports = scrapeUnicaCoursesWithCategories;
