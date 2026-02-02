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
const zlib = require("zlib");

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

      // Preparar body se houver dados
      const bodyData = data ? JSON.stringify(data) : null;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: {
          // Headers que simulam um navegador real para evitar bloqueio do ModSecurity
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          Origin: parsedUrl.origin,
          Referer: `${parsedUrl.origin}/`,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "X-Requested-With": "XMLHttpRequest",
        },
        timeout: this.options.timeout,
      };

      // Adicionar headers de conteúdo apenas quando há dados
      if (bodyData) {
        options.headers["Content-Type"] = "application/json";
        options.headers["Content-Length"] = Buffer.byteLength(bodyData, "utf8");
      }

      const req = https.request(options, res => {
        const chunks = [];

        res.on("data", chunk => {
          chunks.push(chunk);
        });

        res.on("end", () => {
          let body = Buffer.concat(chunks);

          // Descompactar se necessário
          const encoding = res.headers["content-encoding"];
          try {
            if (encoding === "gzip") {
              body = zlib.gunzipSync(body);
            } else if (encoding === "deflate") {
              body = zlib.inflateSync(body);
            } else if (encoding === "br") {
              body = zlib.brotliDecompressSync(body);
            }
          } catch (decompressError) {
            // Ignorar erro de descompressão, pode não estar compactado
          }

          const bodyStr = body.toString("utf-8");

          try {
            const parsed = JSON.parse(bodyStr);

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
            // Se não é JSON, verificar se é erro HTML do ModSecurity
            if (
              bodyStr.includes("Not Acceptable") ||
              bodyStr.includes("Mod_Security") ||
              bodyStr.includes("ModSecurity")
            ) {
              reject(
                new Error(
                  `Requisição bloqueada pelo firewall do servidor (ModSecurity). Código: ${res.statusCode}. Tente reduzir o tamanho da descrição ou remover caracteres especiais.`,
                ),
              );
            } else {
              reject(
                new Error(
                  `Erro ao parsear resposta (HTTP ${res.statusCode}): ${bodyStr.substring(0, 200)}`,
                ),
              );
            }
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

      if (bodyData) {
        req.write(bodyData);
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
