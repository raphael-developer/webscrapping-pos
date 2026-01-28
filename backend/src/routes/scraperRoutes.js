const express = require("express");
const ScraperController = require("../controllers/ScraperController");
const { createScraperLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

const createScraperRoutes = (courseService, io) => {
  const scraperController = new ScraperController(courseService, io);
  const scraperLimiter = createScraperLimiter();

  // POST /api/scraper/start - Iniciar scraping (com rate limit restritivo)
  router.post("/start", scraperLimiter.middleware(), (req, res) =>
    scraperController.startScraping(req, res),
  );

  // POST /api/scraper/test - Teste de scraping com logs (desenvolvimento)
  router.post("/test", (req, res) => scraperController.testScraping(req, res));

  // GET /api/scraper/status - Obter status do scraping
  router.get("/status", (req, res) =>
    scraperController.getScrapingStatus(req, res),
  );

  // GET /api/scraper/report - Obter relatório de cursos novos
  router.get("/report", (req, res) =>
    scraperController.getNewCoursesReport(req, res),
  );

  return router;
};

module.exports = createScraperRoutes;
