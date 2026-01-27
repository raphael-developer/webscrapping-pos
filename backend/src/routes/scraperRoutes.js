const express = require("express");
const ScraperController = require("../controllers/ScraperController");

const router = express.Router();

const createScraperRoutes = (courseService, io) => {
  const scraperController = new ScraperController(courseService, io);

  // POST /api/scraper/start - Iniciar scraping
  router.post("/start", (req, res) =>
    scraperController.startScraping(req, res)
  );

  // POST /api/scraper/test - Teste de scraping com logs (desenvolvimento)
  router.post("/test", (req, res) => scraperController.testScraping(req, res));

  // GET /api/scraper/status - Obter status do scraping
  router.get("/status", (req, res) =>
    scraperController.getScrapingStatus(req, res)
  );

  return router;
};

module.exports = createScraperRoutes;
