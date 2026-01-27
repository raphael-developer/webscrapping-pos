const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

async function testScrapingLogs() {
  console.log("🚀 Iniciando teste de scraping com logs...");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath:
      "/home/raphael/.cache/puppeteer/chrome/linux-140.0.7339.82/chrome-linux64/chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--window-size=1920,1080",
    ],
  });

  try {
    // Simular o processo que seria feito pelo ScraperService
    const emitLog = (level, message, data = {}) => {
      if (global.scrapingIO) {
        global.scrapingIO.to("scraping-logs").emit("scraping-log", {
          level,
          message,
          data,
          timestamp: new Date().toISOString(),
        });
      }
      console.log(`[${level.toUpperCase()}] ${message}`, data);
    };

    // Simular logs do processo de scraping
    emitLog("info", "🚀 Iniciando processo de scraping de teste");

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    emitLog("info", "⚙️ Inicializando ScraperService...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    emitLog("info", "✅ ScraperService inicializado com sucesso");

    emitLog("info", "🔍 Obtendo categorias...");
    await new Promise(resolve => setTimeout(resolve, 1500));
    emitLog("info", "✅ Encontradas 11 categorias");

    const categorias = [
      "Ciências da Saúde",
      "Educação",
      "Empresarial, TI e Negócios",
      "Engenharias",
      "Estética",
    ];

    let totalCursos = 0;

    for (let i = 0; i < categorias.length; i++) {
      const categoria = categorias[i];
      emitLog("info", `🎯 Processando categoria: ${categoria}`);

      await page.goto("https://www.faculdadeunica.com.br/pos-graduacao", {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simular cliques no botão "Carregar mais"
      const cliques = Math.floor(Math.random() * 5) + 2; // 2 a 6 cliques
      for (let j = 1; j <= cliques; j++) {
        emitLog(
          "info",
          `🔄 Clicando em "Carregar mais cursos" (${j}/${cliques})`
        );
        await new Promise(resolve => setTimeout(resolve, 1000));

        const cursosNovos = Math.floor(Math.random() * 20) + 10; // 10 a 29 cursos
        totalCursos += cursosNovos;
        emitLog(
          "info",
          `✅ Tentativa ${j}: +${cursosNovos} cursos (total: ${totalCursos})`
        );
      }

      const cursosCategoria = Math.floor(Math.random() * 50) + 30; // 30 a 79 cursos
      emitLog(
        "info",
        `✅ Encontrados ${cursosCategoria} cursos em ${categoria}`
      );
      emitLog(
        "info",
        `✅ Categoria ${categoria} processada (${i + 1}/${categorias.length})`
      );
    }

    emitLog("info", "💾 Atualizando dados no banco...");
    await new Promise(resolve => setTimeout(resolve, 1000));

    emitLog(
      "info",
      `🎉 Scraping concluído com sucesso! Total: ${totalCursos} cursos`
    );
    emitLog("info", "🔄 Finalizando ScraperService...");
    await new Promise(resolve => setTimeout(resolve, 500));
    emitLog("info", "✅ ScraperService finalizado");

    console.log("✅ Teste concluído!");
  } catch (error) {
    console.error("❌ Erro durante o teste:", error);
  } finally {
    await browser.close();
  }
}

// Executar apenas se for script principal
if (require.main === module) {
  testScrapingLogs()
    .then(() => {
      console.log("🏁 Teste finalizado!");
      process.exit(0);
    })
    .catch(error => {
      console.error("❌ Erro no teste:", error);
      process.exit(1);
    });
}

module.exports = { testScrapingLogs };
