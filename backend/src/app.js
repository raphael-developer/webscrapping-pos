require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const http = require("http");
const { Server } = require("socket.io");
const Logger = require("./utils/Logger");
const config = require("./config");
const {
  router: courseRoutes,
  courseController,
} = require("./routes/courseRoutes");
const createScraperRoutes = require("./routes/scraperRoutes");
const comparisonRoutes = require("./presentation/routes/comparisonRoutes");

class App {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: config.cors.origins,
        credentials: config.cors.credentials,
      },
    });
    this.port = config.server.port;
    this.isShuttingDown = false;
    this.connections = new Set();

    this.setupMiddlewares();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupErrorHandling();
    this.setupGracefulShutdown();
  }

  setupMiddlewares() {
    // Track connections for graceful shutdown
    this.server.on("connection", conn => {
      this.connections.add(conn);
      conn.on("close", () => this.connections.delete(conn));
    });

    // Segurança
    this.app.use(helmet());

    // CORS
    this.app.use(
      cors({
        origin: config.cors.origins,
        credentials: config.cors.credentials,
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

    // WooCommerce Comparison routes
    this.app.use("/api/comparison", comparisonRoutes);

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
        message: config.isProduction
          ? "Erro interno do servidor"
          : error.message,
        ...(config.isDevelopment && { stack: error.stack }),
      });
    });
  }

  setupGracefulShutdown() {
    const shutdown = async signal => {
      if (this.isShuttingDown) {
        Logger.warn(`Shutdown já em andamento, ignorando ${signal}`);
        return;
      }

      this.isShuttingDown = true;
      Logger.info(`${signal} recebido. Iniciando graceful shutdown...`);

      // Stop accepting new connections
      this.server.close(err => {
        if (err) {
          Logger.error("Erro ao fechar servidor:", err);
        }
      });

      // Close existing connections
      Logger.info(`Fechando ${this.connections.size} conexões ativas...`);
      for (const conn of this.connections) {
        conn.destroy();
      }

      // Close WebSocket connections
      if (this.io) {
        Logger.info("Fechando conexões WebSocket...");
        this.io.close();
      }

      // Give time for cleanup
      const timeout = setTimeout(() => {
        Logger.error("Forçando encerramento após timeout");
        process.exit(1);
      }, 10000); // 10 segundos de timeout

      try {
        // Cleanup resources
        Logger.info("Graceful shutdown concluído");
        clearTimeout(timeout);
        process.exit(0);
      } catch (error) {
        Logger.error("Erro durante shutdown:", error);
        clearTimeout(timeout);
        process.exit(1);
      }
    };

    // Listen for termination signals
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", error => {
      Logger.error("Exceção não capturada:", error);
      if (!this.isShuttingDown) {
        shutdown("uncaughtException");
      }
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      Logger.error("Rejeição não tratada:", { reason, promise });
    });
  }

  start() {
    // Validate configuration
    config.validate();

    this.server.listen(this.port, () => {
      Logger.info(`Servidor rodando na porta ${this.port}`);
      Logger.info(`Ambiente: ${config.env}`);
      Logger.info(`Health check: http://localhost:${this.port}/health`);
      Logger.info(`WebSocket habilitado para logs de scraping`);
    });
  }
}

// Inicializar aplicação
const app = new App();
app.start();

module.exports = app;
