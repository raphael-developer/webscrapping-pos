require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const http = require("http");
const { Server } = require("socket.io");
const Logger = require("./utils/Logger");
const {
  router: courseRoutes,
  courseController,
} = require("./routes/courseRoutes");
const createScraperRoutes = require("./routes/scraperRoutes");

class App {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin:
          process.env.NODE_ENV === "production"
            ? ["https://yourdomain.com"]
            : [
                "http://localhost:8080",
                "http://localhost:8081",
                "http://localhost:3000",
              ],
        credentials: true,
      },
    });
    this.port = process.env.PORT || 3000;
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupErrorHandling();
  }

  setupMiddlewares() {
    // Segurança
    this.app.use(helmet());

    // CORS
    this.app.use(
      cors({
        origin:
          process.env.NODE_ENV === "production"
            ? ["https://yourdomain.com"]
            : [
                "http://localhost:8080",
                "http://localhost:8081",
                "http://localhost:3000",
              ],
        credentials: true,
      }),
    );

    // Compressão
    this.app.use(compression());

    // Parse JSON
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Logging de requisições
    this.app.use((req, res, next) => {
      Logger.info(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get("/health", (req, res) => {
      res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // API routes
    this.app.use("/api/courses", courseRoutes);
    this.app.use(
      "/api/scraper",
      createScraperRoutes(courseController.courseService, this.io),
    );

    // 404 handler
    this.app.use("*", (req, res) => {
      res.status(404).json({
        success: false,
        message: "Endpoint não encontrado",
      });
    });
  }

  setupWebSocket() {
    this.io.on("connection", socket => {
      Logger.info(`Cliente WebSocket conectado: ${socket.id}`);

      socket.on("disconnect", () => {
        Logger.info(`Cliente WebSocket desconectado: ${socket.id}`);
      });

      socket.on("subscribe-scraping-logs", () => {
        Logger.info(`Cliente ${socket.id} inscrito em logs de scraping`);
        socket.join("scraping-logs");
      });

      socket.on("unsubscribe-scraping-logs", () => {
        Logger.info(`Cliente ${socket.id} desinscrito de logs de scraping`);
        socket.leave("scraping-logs");
      });
    });

    // Tornar io disponível globalmente para emitir logs
    global.scrapingIO = this.io;
  }

  setupErrorHandling() {
    this.app.use((error, req, res, next) => {
      Logger.error("Erro não tratado:", error);

      res.status(error.status || 500).json({
        success: false,
        message:
          process.env.NODE_ENV === "production"
            ? "Erro interno do servidor"
            : error.message,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      });
    });
  }

  start() {
    this.server.listen(this.port, () => {
      Logger.info(`Servidor rodando na porta ${this.port}`);
      Logger.info(`Ambiente: ${process.env.NODE_ENV}`);
      Logger.info(`Health check: http://localhost:${this.port}/health`);
      Logger.info(`WebSocket habilitado para logs de scraping`);
    });
  }
}

// Inicializar aplicação
const app = new App();
app.start();

module.exports = app;
