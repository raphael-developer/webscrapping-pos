/**
 * Configuração centralizada da aplicação
 * Todas as variáveis de ambiente e constantes são gerenciadas aqui
 */

require("dotenv").config();

const config = {
  // Ambiente
  env: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV !== "production",
  isProduction: process.env.NODE_ENV === "production",

  // Servidor
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || "0.0.0.0",
  },

  // CORS
  cors: {
    origins:
      process.env.NODE_ENV === "production"
        ? (process.env.CORS_ORIGINS || "https://yourdomain.com").split(",")
        : [
            "http://localhost:8080",
            "http://localhost:8081",
            "http://localhost:3000",
            "http://localhost:5173",
          ],
    credentials: true,
  },

  // Arquivos de dados
  files: {
    coursesDataFile: process.env.COURSES_DATA_FILE || null,
    defaultCoursesFile: "cursos-completo-novo.json",
    backupDir: "backups",
    historyDir: "scraping-history",
    reportsDir: "scraping-reports",
    logsDir: "logs",
  },

  // Scraper
  scraper: {
    // Timeouts (em ms)
    clusterTimeout: parseInt(process.env.SCRAPER_CLUSTER_TIMEOUT, 10) || 240000,
    pageTimeout: parseInt(process.env.SCRAPER_PAGE_TIMEOUT, 10) || 180000,
    navTimeout: parseInt(process.env.SCRAPER_NAV_TIMEOUT, 10) || 60000,
    taskTimeout: parseInt(process.env.SCRAPER_TASK_TIMEOUT, 10) || 300000,
    coursesTaskTimeout:
      parseInt(process.env.SCRAPER_COURSES_TASK_TIMEOUT, 10) || 240000,

    // Concorrência
    concurrency: parseInt(process.env.SCRAPER_CONCURRENCY, 10) || 1,
    retryLimit: parseInt(process.env.SCRAPER_RETRY_LIMIT, 10) || 3,
    retryDelay: parseInt(process.env.SCRAPER_RETRY_DELAY, 10) || 2000,
    categoryAttempts: parseInt(process.env.SCRAPER_CATEGORY_ATTEMPTS, 10) || 2,

    // Load More
    loadMoreMode: process.env.SCRAPER_LOAD_MORE_MODE || "full",
    loadMoreLimit: parseInt(process.env.SCRAPER_LOAD_MORE_LIMIT, 10) || 500,
    loadMoreMaxMs: parseInt(process.env.SCRAPER_LOAD_MORE_MAX_MS, 10) || 180000,
    loadMoreClicks: parseInt(process.env.SCRAPER_LOAD_MORE_CLICKS, 10) || 50,
    loadMoreWaitMs: parseInt(process.env.SCRAPER_LOAD_MORE_WAIT_MS, 10) || 2000,
    stableThreshold: parseInt(process.env.SCRAPER_STABLE_THRESHOLD, 10) || 5,

    // Recursos e Debug
    blockResources: process.env.SCRAPER_BLOCK_RESOURCES === "1",
    blockTrackers: process.env.SCRAPER_BLOCK_TRACKERS !== "0",
    forceHeadless: process.env.SCRAPER_FORCE_HEADLESS === "1",
    forceCategories: process.env.SCRAPER_FORCE_CATEGORIES === "1",
    debug: process.env.SCRAPER_DEBUG === "1",
    timing: process.env.SCRAPER_TIMING === "1",

    // Artefatos de debug
    saveArtifacts: process.env.SCRAPER_SAVE_ARTIFACTS === "1",
    artifactsDir: process.env.SCRAPER_ARTIFACTS_DIR || "logs/scraper-artifacts",
    artifactsMax: parseInt(process.env.SCRAPER_ARTIFACTS_MAX, 10) || 10,

    // URL alvo
    targetUrl:
      process.env.TARGET_URL ||
      "https://www.faculdadeunica.com.br/pos-graduacao",
    userAgent:
      process.env.SCRAPER_USER_AGENT ||
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000, // 1 minuto
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // requests por janela
    scraperMax: parseInt(process.env.RATE_LIMIT_SCRAPER_MAX, 10) || 5, // scraping por janela
  },

  // Logging
  logging: {
    level:
      process.env.LOG_LEVEL ||
      (process.env.NODE_ENV === "production" ? "info" : "debug"),
    maxFiles: parseInt(process.env.LOG_MAX_FILES, 10) || 30,
    maxSize: process.env.LOG_MAX_SIZE || "10m",
  },

  // Mínimos esperados por categoria (baseado em dados históricos)
  categoryMinimums: {
    "Ciências da Saúde": 140,
    Educação: 300,
    "Empresarial, TI e Negócios": 85,
    Engenharias: 8,
    Estética: 5,
    Gastronomia: 4,
    Jurídica: 35,
    "MBA Executivo": 40,
    "Meio Ambiente": 25,
    Psicologia: 12,
    "Serviço Social": 15,
  },

  // Categorias esperadas
  expectedCategories: [
    "Ciências da Saúde",
    "Educação",
    "Empresarial, TI e Negócios",
    "Engenharias",
    "Estética",
    "Gastronomia",
    "Jurídica",
    "MBA Executivo",
    "Meio Ambiente",
    "Psicologia",
    "Serviço Social",
  ],
};

// Validação de configurações críticas
const validate = () => {
  const errors = [];

  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push("PORT deve ser um número entre 1 e 65535");
  }

  if (config.scraper.concurrency < 1 || config.scraper.concurrency > 10) {
    errors.push("SCRAPER_CONCURRENCY deve ser entre 1 e 10");
  }

  if (errors.length > 0) {
    console.error("Erros de configuração:", errors);
    if (config.isProduction) {
      process.exit(1);
    }
  }

  return errors.length === 0;
};

// Exportar função de validação
config.validate = validate;

// Função para obter caminho absoluto de arquivos de dados
config.getCoursesFilePath = basePath => {
  const path = require("path");
  return (
    config.files.coursesDataFile ||
    path.join(basePath, config.files.defaultCoursesFile)
  );
};

module.exports = config;
