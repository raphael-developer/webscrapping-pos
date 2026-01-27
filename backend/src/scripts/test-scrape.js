const puppeteer = require("puppeteer");

async function testScraper() {
  console.log("🚀 Iniciando teste de scraping...");

  let browser = null;
  try {
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

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log("🌐 Navegando para o site...");
    await page.goto("https://cursos.alura.com.br", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    console.log("📍 Página carregada, aguardando 3 segundos...");
    await page.waitForTimeout(3000);

    // Vamos tentar diferentes seletores para encontrar as categorias
    console.log("🔍 Procurando por diferentes seletores...");

    const html = await page.content();
    console.log("📄 HTML length:", html.length);

    // Testar vários seletores possíveis
    const selectors = [
      ".card.card-area-course",
      ".card-area-course",
      ".category-card",
      ".course-card",
      "[data-course-area]",
      ".area-card",
    ];

    for (const selector of selectors) {
      const elements = await page.$$(selector);
      console.log(`🔍 ${selector}: ${elements.length} elementos`);
    }

    // Vamos ver quais classes card existem
    const allCards = await page.$$eval('[class*="card"]', cards => {
      return cards.map(card => ({
        classes: card.className,
        text: card.textContent?.trim().substring(0, 100),
      }));
    });

    console.log("🎯 Cards encontrados:", allCards.slice(0, 10));

    // Verificar se conseguimos ver as categorias
    const categoriesFound = await page.$$eval(
      ".card.card-area-course",
      cards => {
        return cards.map(card => {
          const title = card.querySelector("h3")?.textContent?.trim();
          const description = card.querySelector("p")?.textContent?.trim();
          return { title, description };
        });
      }
    );

    console.log(`✅ Encontradas ${categoriesFound.length} categorias:`);
    categoriesFound.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.title}`);
    });
  } catch (error) {
    console.error("❌ Erro durante o scraping:", error.message);
  } finally {
    if (browser) {
      console.log("🔚 Fechando navegador...");
      await browser.close();
    }
  }
}

testScraper();
