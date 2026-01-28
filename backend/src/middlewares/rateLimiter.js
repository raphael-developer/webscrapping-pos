/**
 * Middleware de Rate Limiting
 * Protege a API contra abusos e sobrecarga
 */

const Logger = require("../utils/Logger");

/**
 * Implementação simples de rate limiting em memória
 * Para produção, considere usar Redis para compartilhar estado entre instâncias
 */
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minuto
    this.max = options.max || 100; // máximo de requests por janela
    this.message =
      options.message || "Muitas requisições. Tente novamente mais tarde.";
    this.statusCode = options.statusCode || 429;
    this.keyGenerator = options.keyGenerator || (req => req.ip || "unknown");
    this.skipFailedRequests = options.skipFailedRequests || false;
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skip = options.skip || (() => false);
    this.onLimitReached = options.onLimitReached || null;

    // Armazenamento em memória
    this.store = new Map();

    // Limpeza periódica de entradas expiradas
    this.cleanupInterval = setInterval(() => this.cleanup(), this.windowMs);
  }

  /**
   * Remove entradas expiradas
   */
  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.store) {
      if (now - data.windowStart > this.windowMs) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Obtém ou cria dados de rate limit para uma chave
   */
  getEntry(key) {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || now - entry.windowStart > this.windowMs) {
      entry = {
        count: 0,
        windowStart: now,
      };
      this.store.set(key, entry);
    }

    return entry;
  }

  /**
   * Incrementa o contador para uma chave
   */
  increment(key) {
    const entry = this.getEntry(key);
    entry.count++;
    return entry;
  }

  /**
   * Middleware Express
   */
  middleware() {
    return (req, res, next) => {
      // Verificar se deve pular
      if (this.skip(req, res)) {
        return next();
      }

      const key = this.keyGenerator(req);
      const entry = this.getEntry(key);

      // Headers de rate limit
      const remaining = Math.max(0, this.max - entry.count);
      const resetTime = entry.windowStart + this.windowMs;

      res.setHeader("X-RateLimit-Limit", this.max);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", Math.ceil(resetTime / 1000));

      if (entry.count >= this.max) {
        // Limite atingido
        Logger.warn(`Rate limit atingido para ${key}`, {
          ip: req.ip,
          path: req.path,
          method: req.method,
        });

        if (this.onLimitReached) {
          this.onLimitReached(req, res, {
            key,
            count: entry.count,
            remaining: 0,
          });
        }

        res.setHeader("Retry-After", Math.ceil(this.windowMs / 1000));
        return res.status(this.statusCode).json({
          success: false,
          message: this.message,
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: Math.ceil(this.windowMs / 1000),
        });
      }

      // Incrementar contador
      this.increment(key);

      // Hook para decrementar em caso de falha (se configurado)
      if (this.skipFailedRequests) {
        res.on("finish", () => {
          if (res.statusCode >= 400) {
            entry.count = Math.max(0, entry.count - 1);
          }
        });
      }

      next();
    };
  }

  /**
   * Limpa recursos ao encerrar
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Rate limiter padrão para rotas gerais
 */
const createGeneralLimiter = (options = {}) => {
  return new RateLimiter({
    windowMs: options.windowMs || 60000, // 1 minuto
    max: options.max || 100, // 100 requests por minuto
    message: "Muitas requisições. Por favor, aguarde um momento.",
    ...options,
  });
};

/**
 * Rate limiter mais restritivo para o scraper
 */
const createScraperLimiter = (options = {}) => {
  return new RateLimiter({
    windowMs: options.windowMs || 300000, // 5 minutos
    max: options.max || 3, // Apenas 3 scrapes por 5 minutos
    message:
      "Limite de scraping atingido. Aguarde antes de iniciar outro scraping.",
    keyGenerator: req => `scraper:${req.ip || "unknown"}`,
    onLimitReached: (req, res, info) => {
      Logger.warn("Tentativa de scraping bloqueada por rate limit", {
        ip: req.ip,
        count: info.count,
      });
    },
    ...options,
  });
};

/**
 * Rate limiter para endpoints de estatísticas (mais permissivo)
 */
const createStatsLimiter = (options = {}) => {
  return new RateLimiter({
    windowMs: options.windowMs || 60000, // 1 minuto
    max: options.max || 200, // 200 requests por minuto
    message: "Muitas requisições de estatísticas.",
    ...options,
  });
};

module.exports = {
  RateLimiter,
  createGeneralLimiter,
  createScraperLimiter,
  createStatsLimiter,
};
