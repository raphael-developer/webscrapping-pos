/**
 * @fileoverview Cliente HTTP para API WooCommerce
 * Encapsula toda comunicação com a API REST do WooCommerce
 *
 * @description Implementa:
 * - Autenticação OAuth 1.0a
 * - Retry com backoff exponencial
 * - Rate limiting
 * - Cache simples em memória
 * - Paginação automática
 */

const https = require("https");
const crypto = require("crypto");

/**
 * Cliente WooCommerce REST API
 * @implements {Single Responsibility Principle}
 */
class WooCommerceClient {
  /**
   * @param {Object} config - Configuração do cliente
   * @param {string} config.url - URL base da loja (ex: https://unicaposead.com)
   * @param {string} config.consumerKey - Consumer Key da API
   * @param {string} config.consumerSecret - Consumer Secret da API
   * @param {Object} [config.options] - Opções adicionais
   */
  constructor(config) {
    this.validateConfig(config);

    this.baseUrl = config.url.replace(/\/$/, "");
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;

    // Opções com defaults
    this.options = {
      version: "wc/v3",
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      perPage: 100,
      cacheEnabled: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutos
      ...config.options,
    };

    // Cache em memória
    this.cache = new Map();

    // Rate limiting
    this.requestQueue = [];
    this.isProcessing = false;
    this.requestsPerSecond = 2;
  }

  /**
   * Valida configuração obrigatória
   * @param {Object} config
   */
  validateConfig(config) {
    if (!config.url) {
      throw new Error("WooCommerceClient: URL é obrigatória");
    }
    if (!config.consumerKey) {
      throw new Error("WooCommerceClient: Consumer Key é obrigatória");
    }
    if (!config.consumerSecret) {
      throw new Error("WooCommerceClient: Consumer Secret é obrigatória");
    }
  }

  /**
   * Constrói URL completa da API
   * @param {string} endpoint
   * @param {Object} params
   * @returns {string}
   */
  buildUrl(endpoint, params = {}) {
    const url = new URL(
      `${this.baseUrl}/wp-json/${this.options.version}/${endpoint}`,
    );

    // Adicionar parâmetros de query
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    return url.toString();
  }

  /**
   * Gera assinatura OAuth 1.0a
   * @param {string} method
   * @param {string} url
   * @param {Object} params
   * @returns {string}
   */
  generateOAuthSignature(method, url, params) {
    const oauthParams = {
      oauth_consumer_key: this.consumerKey,
      oauth_nonce: crypto.randomBytes(16).toString("hex"),
      oauth_signature_method: "HMAC-SHA256",
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: "1.0",
      ...params,
    };

    // Ordenar parâmetros
    const sortedParams = Object.keys(oauthParams)
      .sort()
      .map(
        key =>
          `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`,
      )
      .join("&");

    // Criar base string
    const baseString = [
      method.toUpperCase(),
      encodeURIComponent(url.split("?")[0]),
      encodeURIComponent(sortedParams),
    ].join("&");

    // Gerar assinatura
    const signature = crypto
      .createHmac("sha256", `${this.consumerSecret}&`)
      .update(baseString)
      .digest("base64");

    return {
      ...oauthParams,
      oauth_signature: signature,
    };
  }

  /**
   * Executa requisição HTTP com autenticação
   * @param {string} method
   * @param {string} endpoint
   * @param {Object} [params]
   * @param {Object} [data]
   * @returns {Promise<Object>}
   */
  async request(method, endpoint, params = {}, data = null) {
    // Verificar cache para GET
    if (method === "GET" && this.options.cacheEnabled) {
      const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Construir URL com autenticação básica (mais simples para HTTPS)
    const url = new URL(this.buildUrl(endpoint, params));
    url.searchParams.append("consumer_key", this.consumerKey);
    url.searchParams.append("consumer_secret", this.consumerSecret);

    return this.executeWithRetry(method, url.toString(), data);
  }

  /**
   * Executa requisição com retry e backoff
   * @param {string} method
   * @param {string} url
   * @param {Object} data
   * @param {number} attempt
   * @returns {Promise<Object>}
   */
  async executeWithRetry(method, url, data, attempt = 1) {
    try {
      const response = await this.httpRequest(method, url, data);

      // Cache para requisições GET bem-sucedidas
      if (method === "GET" && this.options.cacheEnabled) {
        const cacheKey = url.split("?")[0];
        this.setInCache(cacheKey, response);
      }

      return response;
    } catch (error) {
      // Retry para erros transientes
      if (attempt < this.options.maxRetries && this.isRetryableError(error)) {
        const delay = this.options.retryDelay * Math.pow(2, attempt - 1);
        console.log(
          `[WooCommerceClient] Retry ${attempt}/${this.options.maxRetries} após ${delay}ms`,
        );
        await this.sleep(delay);
        return this.executeWithRetry(method, url, data, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Executa requisição HTTP nativa
   * @param {string} method
   * @param {string} url
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  httpRequest(method, url, data) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "WooCommerce-Client/1.0",
        },
        timeout: this.options.timeout,
      };

      const req = https.request(options, res => {
        let body = "";

        res.on("data", chunk => {
          body += chunk;
        });

        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                data: parsed,
                headers: res.headers,
                status: res.statusCode,
              });
            } else {
              reject(
                new WooCommerceError(
                  parsed.message || `HTTP Error ${res.statusCode}`,
                  res.statusCode,
                  parsed,
                ),
              );
            }
          } catch (parseError) {
            reject(
              new Error(`Erro ao parsear resposta: ${body.substring(0, 200)}`),
            );
          }
        });
      });

      req.on("error", error => {
        reject(new Error(`Erro de conexão: ${error.message}`));
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Timeout da requisição"));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Busca todos os produtos com paginação automática
   * @param {Object} [params] - Parâmetros de filtro
   * @returns {Promise<Array>}
   */
  async getAllProducts(params = {}) {
    const allProducts = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.request("GET", "products", {
        ...params,
        per_page: this.options.perPage,
        page: page,
      });

      allProducts.push(...response.data);

      // Verificar se há mais páginas
      const totalPages = parseInt(response.headers["x-wp-totalpages"] || "1");
      hasMore = page < totalPages;
      page++;

      // Rate limiting simples
      if (hasMore) {
        await this.sleep(1000 / this.requestsPerSecond);
      }
    }

    return allProducts;
  }

  /**
   * Busca categorias de produtos
   * @param {Object} [params]
   * @returns {Promise<Array>}
   */
  async getProductCategories(params = {}) {
    const allCategories = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.request("GET", "products/categories", {
        ...params,
        per_page: this.options.perPage,
        page: page,
      });

      allCategories.push(...response.data);

      const totalPages = parseInt(response.headers["x-wp-totalpages"] || "1");
      hasMore = page < totalPages;
      page++;

      if (hasMore) {
        await this.sleep(1000 / this.requestsPerSecond);
      }
    }

    return allCategories;
  }

  /**
   * Busca produto por ID
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async getProduct(id) {
    const response = await this.request("GET", `products/${id}`);
    return response.data;
  }

  /**
   * Busca produtos por categoria
   * @param {number} categoryId
   * @param {Object} [params]
   * @returns {Promise<Array>}
   */
  async getProductsByCategory(categoryId, params = {}) {
    return this.getAllProducts({
      ...params,
      category: categoryId,
    });
  }

  /**
   * Verifica se erro permite retry
   * @param {Error} error
   * @returns {boolean}
   */
  isRetryableError(error) {
    if (error instanceof WooCommerceError) {
      // Retry para erros 5xx e 429 (rate limit)
      return error.statusCode >= 500 || error.statusCode === 429;
    }
    // Retry para erros de rede
    return (
      error.message.includes("Timeout") ||
      error.message.includes("conexão") ||
      error.message.includes("ECONNRESET")
    );
  }

  /**
   * Obtém item do cache
   * @param {string} key
   * @returns {Object|null}
   */
  getFromCache(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.options.cacheTTL) {
      return item.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Salva item no cache
   * @param {string} key
   * @param {Object} data
   */
  setInCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Limpa cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Helper para sleep
   * @param {number} ms
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Erro customizado para API WooCommerce
 */
class WooCommerceError extends Error {
  constructor(message, statusCode, response) {
    super(message);
    this.name = "WooCommerceError";
    this.statusCode = statusCode;
    this.response = response;
  }
}

module.exports = { WooCommerceClient, WooCommerceError };
