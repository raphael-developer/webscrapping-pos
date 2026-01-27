const ScraperService = require("../services/ScraperService");
const Logger = require("../utils/Logger");

class ScraperController {
  constructor(courseService, io) {
    this.scraperService = new ScraperService();
    this.courseService = courseService;
    this.io = io;
    this.isScrapingInProgress = false;
  }

  emitLog(level, message, data = {}) {
    if (this.io) {
      this.io.to("scraping-logs").emit("scraping-log", {
        level,
        message,
        data,
        timestamp: new Date().toISOString(),
      });
    }
    Logger[level](message, data);
  }

  async startScraping(req, res) {
    try {
      if (this.isScrapingInProgress) {
        return res.status(409).json({
          success: false,
          message: "Scraping já está em andamento",
        });
      }

      this.isScrapingInProgress = true;

      res.json({
        success: true,
        message: "Scraping iniciado. Processo executando em background.",
        status: "started",
      });

      this.performScraping();
    } catch (error) {
      this.isScrapingInProgress = false;
      Logger.error("Erro no ScraperController.startScraping:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao iniciar scraping",
      });
    }
  }

  async performScraping() {
    try {
      this.emitLog(
        "info",
        "🚀 Iniciando processo de scraping completo (100% precisão)",
      );

      const fs = require("fs");
      const fsp = require("fs").promises;
      const path = require("path");

      // ======= CONFIGURAÇÕES OTIMIZADAS PARA 100% DE PRECISÃO =======
      // Forçar as 11 categorias fixas (evita falhas de extração de categorias)
      process.env.SCRAPER_FORCE_CATEGORIES = "1";
      // Modo full de load more: expande TODOS os cursos de cada categoria
      process.env.SCRAPER_LOAD_MORE_MODE = "full";
      process.env.SCRAPER_LOAD_MORE_LIMIT = "500";
      process.env.SCRAPER_LOAD_MORE_MAX_MS = "180000";
      process.env.SCRAPER_LOAD_MORE_CLICKS = "40";
      // Timeouts adequados para scraping completo
      process.env.SCRAPER_TASK_TIMEOUT = "300000";
      process.env.SCRAPER_COURSES_TASK_TIMEOUT = "240000";
      process.env.SCRAPER_NAV_TIMEOUT = "60000";
      // Bloquear recursos desnecessários para melhor performance
      process.env.SCRAPER_BLOCK_RESOURCES = "1";
      // Headless em produção
      process.env.SCRAPER_FORCE_HEADLESS = "1";
      // Concurrency 1 para estabilidade
      process.env.SCRAPER_CONCURRENCY = "1";
      // ===============================================================

      const cursosFile =
        process.env.COURSES_DATA_FILE ||
        path.join(__dirname, "../../cursos-completo-novo.json");
      const fallbackFile = path.join(
        __dirname,
        "../../cursos-completo-novo-old.json",
      );

      if (!fs.existsSync(cursosFile) && fs.existsSync(fallbackFile)) {
        try {
          fs.copyFileSync(fallbackFile, cursosFile);
          this.emitLog(
            "info",
            "📋 Arquivo base criado a partir de cursos-completo-novo-old.json",
          );
        } catch (_) {}
      }

      this.emitLog("info", "⚙️ Inicializando ScraperService (modo full)...");
      await this.scraperService.initialize();
      this.emitLog("info", "✅ ScraperService inicializado com sucesso");

      const result = await this.scraperService.scrapeAllCourses();
      let newCourses = result && result.courses ? result.courses : [];

      // Carregar cursos existentes para fazer merge inteligente
      let existingCourses = [];
      try {
        if (fs.existsSync(cursosFile)) {
          const existingData = await fsp.readFile(cursosFile, "utf8");
          existingCourses = JSON.parse(existingData);
          if (!Array.isArray(existingCourses)) existingCourses = [];
        }
      } catch (e) {
        this.emitLog(
          "warn",
          `⚠️ Não foi possível ler cursos existentes: ${e.message}`,
        );
        existingCourses = [];
      }

      // Criar mapa de cursos existentes por chave única (título + categoria)
      const existingMap = new Map();
      for (const c of existingCourses) {
        const key =
          (c.title || c.name || "").toLowerCase().trim() +
          "|" +
          (c.category || "");
        if (key && key !== "|") {
          existingMap.set(key, c);
        }
      }

      // Merge: novos cursos têm prioridade, mas mantemos os existentes que não vieram no scrape
      const seen = new Set();
      const mergedCourses = [];

      // 1. Adicionar todos os novos cursos (atualizados)
      for (const c of newCourses) {
        const key =
          (c.title || c.name || "").toLowerCase().trim() +
          "|" +
          (c.category || "");
        if (!seen.has(key) && (c.title || c.name)) {
          seen.add(key);
          mergedCourses.push(c);
          existingMap.delete(key); // Remover do mapa para não duplicar
        }
      }

      // 2. Manter cursos existentes que não foram encontrados no novo scrape
      // (podem ser cursos de categorias que falharam)
      const keptFromExisting = [];
      for (const [key, c] of existingMap) {
        if (!seen.has(key)) {
          seen.add(key);
          mergedCourses.push(c);
          keptFromExisting.push(c.title);
        }
      }

      if (keptFromExisting.length > 0) {
        this.emitLog(
          "info",
          `📦 Mantidos ${keptFromExisting.length} cursos existentes não encontrados no novo scrape`,
        );
      }

      // Reindex IDs
      mergedCourses.forEach((c, i) => {
        c.id = i + 1;
        c.updatedAt = new Date().toISOString();
      });

      // Só salvar se tivermos um número razoável de cursos (proteção contra falhas totais)
      const minCoursesRequired = Math.min(existingCourses.length * 0.5, 400);
      if (
        mergedCourses.length < minCoursesRequired &&
        existingCourses.length > 0
      ) {
        this.emitLog(
          "warn",
          `⚠️ Scraping retornou poucos cursos (${mergedCourses.length}). Mantendo arquivo anterior com ${existingCourses.length} cursos.`,
        );
      } else {
        await fsp.writeFile(
          cursosFile,
          JSON.stringify(mergedCourses, null, 2),
          "utf8",
        );

        this.emitLog(
          "info",
          `💾 JSON atualizado em ${cursosFile} (${mergedCourses.length} cursos)`,
        );
      }

      this.emitLog(
        "info",
        `🎉 Scraping concluído com sucesso! Total de cursos: ${mergedCourses.length}`,
      );
    } catch (error) {
      this.emitLog("error", `❌ Erro durante o scraping: ${error.message}`);
    } finally {
      try {
        await this.scraperService.close();
      } catch (_) {}
      this.isScrapingInProgress = false;
      this.emitLog("info", "✅ Processo finalizado");
    }
  }

  async getScrapingStatus(req, res) {
    try {
      const stats = this.courseService.getStatistics();
      res.json({
        success: true,
        data: {
          isScrapingInProgress: this.isScrapingInProgress,
          statistics: stats,
          progress: this.scraperService.getProgress(),
        },
        message: "Status obtido com sucesso",
      });
    } catch (error) {
      Logger.error("Erro no getScrapingStatus:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao obter status",
      });
    }
  }
}

module.exports = ScraperController;
