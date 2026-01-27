const ScraperService = require("../services/ScraperService");
const Logger = require("../utils/Logger");

class ScraperController {
  constructor(courseService, io) {
    this.scraperService = new ScraperService();
    this.courseService = courseService;
    this.io = io;
    this.isScrapingInProgress = false;
    this.lastScrapingReport = null;
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
    const fs = require("fs");
    const fsp = require("fs").promises;
    const path = require("path");
    
    const cursosFile =
      process.env.COURSES_DATA_FILE ||
      path.join(__dirname, "../../cursos-completo-novo.json");
    const historyDir = path.join(__dirname, "../../scraping-history");
    const reportsDir = path.join(__dirname, "../../scraping-reports");
    
    // Criar diretórios se não existirem
    await fsp.mkdir(historyDir, { recursive: true }).catch(() => {});
    await fsp.mkdir(reportsDir, { recursive: true }).catch(() => {});

    try {
      this.emitLog(
        "info",
        "🚀 Iniciando processo de scraping INTELIGENTE (detecção de cursos novos)",
      );

      // ======= CONFIGURAÇÕES OTIMIZADAS PARA 100% DE PRECISÃO =======
      process.env.SCRAPER_FORCE_CATEGORIES = "1";
      process.env.SCRAPER_LOAD_MORE_MODE = "full";
      process.env.SCRAPER_LOAD_MORE_LIMIT = "500";
      process.env.SCRAPER_LOAD_MORE_MAX_MS = "180000";
      process.env.SCRAPER_LOAD_MORE_CLICKS = "50";
      process.env.SCRAPER_TASK_TIMEOUT = "300000";
      process.env.SCRAPER_COURSES_TASK_TIMEOUT = "240000";
      process.env.SCRAPER_NAV_TIMEOUT = "60000";
      process.env.SCRAPER_BLOCK_RESOURCES = "1";
      process.env.SCRAPER_FORCE_HEADLESS = "1";
      process.env.SCRAPER_CONCURRENCY = "1";
      process.env.SCRAPER_LOAD_MORE_WAIT_MS = "2000"; // Mais tempo entre cliques
      process.env.SCRAPER_STABLE_THRESHOLD = "5"; // Mais tentativas antes de desistir

      // ======= BACKUP AUTOMÁTICO ANTES DE QUALQUER OPERAÇÃO =======
      const backupDir = path.join(__dirname, "../../backups");
      await fsp.mkdir(backupDir, { recursive: true }).catch(() => {});
      
      // Carregar cursos existentes ANTES do scraping
      let existingCourses = [];
      try {
        if (fs.existsSync(cursosFile)) {
          const existingData = await fsp.readFile(cursosFile, "utf8");
          existingCourses = JSON.parse(existingData);
          if (!Array.isArray(existingCourses)) existingCourses = [];
          
          // Criar backup antes de qualquer modificação
          if (existingCourses.length > 0) {
            const backupFile = path.join(backupDir, `backup-${Date.now()}.json`);
            await fsp.writeFile(backupFile, existingData, "utf8");
            this.emitLog("info", `💾 Backup criado: ${existingCourses.length} cursos salvos`);
            
            // Manter apenas os últimos 10 backups
            const backups = await fsp.readdir(backupDir);
            const sortedBackups = backups.filter(f => f.startsWith("backup-")).sort().reverse();
            for (const old of sortedBackups.slice(10)) {
              await fsp.unlink(path.join(backupDir, old)).catch(() => {});
            }
          }
        }
      } catch (e) {
        this.emitLog("warn", `⚠️ Não foi possível ler cursos existentes: ${e.message}`);
      }

      // Criar mapa de cursos existentes
      const existingMap = new Map();
      for (const c of existingCourses) {
        const key = this.createCourseKey(c);
        if (key) existingMap.set(key, c);
      }

      this.emitLog("info", `📊 Cursos existentes no sistema: ${existingCourses.length}`);

      // ======= MÍNIMOS ESPERADOS POR CATEGORIA (baseado em dados históricos) =======
      const categoryMinimums = {
        "Ciências da Saúde": 140,
        "Educação": 300,
        "Empresarial, TI e Negócios": 85,
        "Engenharias": 8,
        "Estética": 5,
        "Gastronomia": 4,
        "Jurídica": 35,
        "MBA Executivo": 40,
        "Meio Ambiente": 25,
        "Psicologia": 12,
        "Serviço Social": 15
      };

      // ======= SCRAPING COM MÚLTIPLAS TENTATIVAS =======
      this.emitLog("info", "⚙️ Inicializando ScraperService...");
      await this.scraperService.initialize();
      this.emitLog("info", "✅ ScraperService inicializado");

      // Primeira tentativa
      let result = await this.scraperService.scrapeAllCourses();
      let scrapedCourses = result?.courses || [];
      
      // Verificar se todas as categorias foram extraídas COM MÍNIMO ESPERADO
      const categoriesExpected = [
        "Ciências da Saúde", "Educação", "Empresarial, TI e Negócios",
        "Engenharias", "Estética", "Gastronomia", "Jurídica",
        "MBA Executivo", "Meio Ambiente", "Psicologia", "Serviço Social"
      ];
      
      const categoriesIncomplete = categoriesExpected.filter(cat => {
        const coursesInCat = scrapedCourses.filter(c => c.category === cat).length;
        const minimum = categoryMinimums[cat] || 1;
        return coursesInCat < minimum * 0.8; // Aceita 80% do mínimo
      });

      // Se alguma categoria está incompleta, tentar novamente (até 3x por categoria)
      const MAX_RETRIES = 3;
      for (const incompleteCat of categoriesIncomplete) {
        const minimum = categoryMinimums[incompleteCat] || 1;
        let currentCount = scrapedCourses.filter(c => c.category === incompleteCat).length;
        
        this.emitLog("warn", `⚠️ ${incompleteCat}: apenas ${currentCount} cursos (mínimo esperado: ${minimum})`);
        
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          if (currentCount >= minimum * 0.8) break;
          
          this.emitLog("info", `🔄 Tentativa ${attempt}/${MAX_RETRIES}: ${incompleteCat}`);
          try {
            await this.scraperService.close().catch(() => {});
            await new Promise(r => setTimeout(r, 2000)); // Aguardar 2s entre tentativas
            await this.scraperService.initialize();
            
            const retryResult = await this.scraperService.scrapeSingleCategory(incompleteCat);
            if (retryResult && retryResult.length > currentCount) {
              // Remover cursos antigos dessa categoria e adicionar novos
              scrapedCourses = scrapedCourses.filter(c => c.category !== incompleteCat);
              scrapedCourses.push(...retryResult);
              currentCount = retryResult.length;
              this.emitLog("info", `✅ Tentativa ${attempt} bem-sucedida: ${incompleteCat} (${retryResult.length} cursos)`);
            }
          } catch (e) {
            this.emitLog("warn", `⚠️ Tentativa ${attempt} falhou para ${incompleteCat}: ${e.message}`);
          }
        }
        
        if (currentCount < minimum * 0.8) {
          this.emitLog("error", `❌ FALHA: ${incompleteCat} - não atingiu mínimo após ${MAX_RETRIES} tentativas`);
        }
      }

      // ======= ANÁLISE INTELIGENTE: DETECTAR CURSOS NOVOS =======
      const seen = new Set();
      const finalCourses = [];
      const newCoursesFound = []; // Cursos que não existiam antes
      const updatedCourses = []; // Cursos atualizados
      
      for (const c of scrapedCourses) {
        const key = this.createCourseKey(c);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        
        const existingCourse = existingMap.get(key);
        if (!existingCourse) {
          // CURSO NOVO!
          c.isNew = true;
          c.discoveredAt = new Date().toISOString();
          newCoursesFound.push(c);
        }
        
        finalCourses.push(c);
        existingMap.delete(key);
      }

      // Manter cursos existentes de categorias que falharam
      const keptCourses = [];
      for (const [key, c] of existingMap) {
        if (!seen.has(key)) {
          seen.add(key);
          finalCourses.push(c);
          keptCourses.push(c);
        }
      }

      if (keptCourses.length > 0) {
        this.emitLog("info", `📦 Mantidos ${keptCourses.length} cursos de scrapes anteriores`);
      }

      // Reindex e atualizar timestamps
      const now = new Date().toISOString();
      finalCourses.forEach((c, i) => {
        c.id = i + 1;
        c.updatedAt = now;
        if (!c.createdAt) c.createdAt = now;
      });

      // ======= RELATÓRIO DE CURSOS NOVOS =======
      const report = {
        timestamp: now,
        totalCourses: finalCourses.length,
        previousTotal: existingCourses.length,
        newCoursesCount: newCoursesFound.length,
        newCourses: newCoursesFound.map(c => ({
          title: c.title,
          category: c.category,
          url: c.url,
          duration: c.duration,
          discoveredAt: c.discoveredAt
        })),
        categoriesStatus: categoriesExpected.map(cat => {
          const count = finalCourses.filter(c => c.category === cat).length;
          const minimum = categoryMinimums[cat] || 1;
          return {
            name: cat,
            coursesCount: count,
            minimum: minimum,
            status: count >= minimum * 0.8 ? "ok" : "incomplete"
          };
        }),
        keptFromPrevious: keptCourses.length
      };

      this.lastScrapingReport = report;

      // ======= NOTIFICAR SOBRE CURSOS NOVOS =======
      if (newCoursesFound.length > 0) {
        this.emitLog("info", "");
        this.emitLog("info", "🎉🎉🎉 CURSOS NOVOS DETECTADOS! 🎉🎉🎉");
        this.emitLog("info", `📢 Quantidade: ${newCoursesFound.length} curso(s) novo(s)`);
        this.emitLog("info", "");
        
        for (const curso of newCoursesFound) {
          this.emitLog("info", `🆕 NOVO: "${curso.title}" [${curso.category}]`);
        }
        
        this.emitLog("info", "");
      } else {
        this.emitLog("info", "ℹ️ Nenhum curso novo detectado nesta verificação");
      }

      // ======= VALIDAÇÃO E SALVAMENTO =======
      const minRequired = Math.max(existingCourses.length * 0.7, 500);
      
      if (finalCourses.length < minRequired && existingCourses.length > 0) {
        this.emitLog(
          "error",
          `❌ PROTEÇÃO ATIVADA: Scraping retornou apenas ${finalCourses.length} cursos (mínimo: ${Math.floor(minRequired)}). Arquivo NÃO foi alterado.`
        );
        report.saved = false;
        report.reason = "protection_triggered";
      } else {
        // Salvar arquivo principal
        await fsp.writeFile(cursosFile, JSON.stringify(finalCourses, null, 2), "utf8");
        report.saved = true;
        
        // Salvar histórico (para auditoria)
        const historyFile = path.join(historyDir, `courses-${now.replace(/[:.]/g, "-")}.json`);
        await fsp.writeFile(historyFile, JSON.stringify(finalCourses, null, 2), "utf8").catch(() => {});
        
        this.emitLog("info", `💾 Arquivo salvo: ${finalCourses.length} cursos`);
      }

      // Salvar relatório
      const reportFile = path.join(reportsDir, `report-${now.replace(/[:.]/g, "-")}.json`);
      await fsp.writeFile(reportFile, JSON.stringify(report, null, 2), "utf8").catch(() => {});

      // ======= RESUMO FINAL =======
      this.emitLog("info", "");
      this.emitLog("info", "═══════════════════════════════════════════════");
      this.emitLog("info", "📊 RESUMO DO SCRAPING");
      this.emitLog("info", "═══════════════════════════════════════════════");
      this.emitLog("info", `   Total de cursos: ${finalCourses.length}`);
      this.emitLog("info", `   Cursos anteriores: ${existingCourses.length}`);
      this.emitLog("info", `   🆕 Cursos NOVOS: ${newCoursesFound.length}`);
      this.emitLog("info", `   Mantidos de scrapes anteriores: ${keptCourses.length}`);
      this.emitLog("info", "═══════════════════════════════════════════════");

    } catch (error) {
      this.emitLog("error", `❌ Erro durante o scraping: ${error.message}`);
      Logger.error("Erro completo:", error);
    } finally {
      try {
        await this.scraperService.close();
      } catch (_) {}
      this.isScrapingInProgress = false;
      this.emitLog("info", "✅ Processo finalizado");
    }
  }

  createCourseKey(course) {
    const title = (course.title || course.name || "").toLowerCase().trim();
    const category = (course.category || "").toLowerCase().trim();
    if (!title) return null;
    return `${title}|${category}`;
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
          lastReport: this.lastScrapingReport,
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

  // Endpoint para obter relatório de cursos novos
  async getNewCoursesReport(req, res) {
    try {
      if (!this.lastScrapingReport) {
        return res.json({
          success: true,
          data: null,
          message: "Nenhum scraping realizado ainda",
        });
      }
      
      res.json({
        success: true,
        data: this.lastScrapingReport,
        message: "Relatório obtido com sucesso",
      });
    } catch (error) {
      Logger.error("Erro no getNewCoursesReport:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao obter relatório",
      });
    }
  }
}

module.exports = ScraperController;
