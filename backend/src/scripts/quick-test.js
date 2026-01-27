const puppeteer = require("puppeteer");

(async () => {
  console.log("🚀 INICIANDO SCRAPER RÁPIDO...");

  let browser;
  try {
    console.log("🔧 Configurando browser...");
    browser = await puppeteer.launch({
      headless: "new",
      executablePath:
        "/home/raphael/.cache/puppeteer/chrome/linux-140.0.7339.82/chrome-linux64/chrome",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    console.log("📄 Criando página...");
    const page = await browser.newPage();

    console.log("🌐 Navegando para Alura...");
    await page.goto("https://cursos.alura.com.br", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    console.log("⏳ Aguardando carregamento...");
    await page.waitForTimeout(3000);

    console.log("🔍 Buscando categorias...");
    const categories = await page.$$eval(
      ".categories__wrapper__cards",
      cards => {
        return cards
          .map((card, index) => {
            const text = card.textContent?.trim();
            const lines = text.split("\n").filter(line => line.trim());
            const title = lines.length > 1 ? lines[1].trim() : `Cat-${index}`;
            return { index, title, text: text.substring(0, 50) };
          })
          .filter(cat => cat.title && !cat.title.includes("Matrícule"));
      }
    );

    console.log(`✅ ENCONTRADAS ${categories.length} CATEGORIAS:`);
    categories.forEach((cat, i) => {
      console.log(`${i + 1}. ${cat.title}`);
    });

    // Teste rápido: clicar na primeira categoria
    if (categories.length > 0) {
      console.log(`\n🎯 Testando categoria: ${categories[0].title}`);
      const firstCategory = await page.$(
        `.categories__wrapper__cards:nth-child(1)`
      );
      if (firstCategory) {
        await firstCategory.click();
        await page.waitForTimeout(3000);

        const coursesFound = await page.$$eval(
          '[class*="course"], .course-card, [data-course]',
          courses => courses.length
        );
        console.log(
          `📚 Cursos encontrados na primeira categoria: ${coursesFound}`
        );
      }
    }
  } catch (error) {
    console.error("❌ ERRO:", error.message);
  } finally {
    if (browser) {
      console.log("🔚 Fechando browser...");
      await browser.close();
    }
  }
})();
