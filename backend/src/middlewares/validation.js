/**
 * Middleware de validação de entrada para rotas da API
 * Utiliza funções de validação para sanitizar e validar dados de entrada
 */

const Logger = require("../utils/Logger");

/**
 * Validadores comuns
 */
const validators = {
  /**
   * Valida se é um ID numérico positivo
   */
  isValidId: value => {
    const id = parseInt(value, 10);
    return !isNaN(id) && id > 0;
  },

  /**
   * Valida string não vazia
   */
  isNonEmptyString: value => {
    return typeof value === "string" && value.trim().length > 0;
  },

  /**
   * Valida limite de paginação
   */
  isValidLimit: (value, max = 1000) => {
    if (value === undefined || value === null) return true;
    const limit = parseInt(value, 10);
    return !isNaN(limit) && limit > 0 && limit <= max;
  },

  /**
   * Sanitiza string para busca (remove caracteres especiais perigosos)
   */
  sanitizeSearchString: value => {
    if (typeof value !== "string") return "";
    return value
      .trim()
      .replace(/[<>\"\'\\]/g, "") // Remove caracteres potencialmente perigosos
      .substring(0, 200); // Limita tamanho
  },

  /**
   * Sanitiza nome de categoria
   */
  sanitizeCategory: value => {
    if (typeof value !== "string") return "";
    return decodeURIComponent(value)
      .trim()
      .replace(/[<>\"\'\\]/g, "")
      .substring(0, 100);
  },
};

/**
 * Middleware para validar parâmetro ID
 */
const validateId = (req, res, next) => {
  const { id } = req.params;

  if (!validators.isValidId(id)) {
    Logger.warn(`Tentativa de acesso com ID inválido: ${id}`);
    return res.status(400).json({
      success: false,
      message: "ID inválido. Deve ser um número positivo.",
      code: "INVALID_ID",
    });
  }

  req.params.id = parseInt(id, 10);
  next();
};

/**
 * Middleware para validar parâmetro de categoria
 */
const validateCategory = (req, res, next) => {
  const { category } = req.params;

  if (!category || typeof category !== "string") {
    return res.status(400).json({
      success: false,
      message: "Categoria é obrigatória.",
      code: "MISSING_CATEGORY",
    });
  }

  req.params.category = validators.sanitizeCategory(category);
  next();
};

/**
 * Middleware para validar query params de listagem de cursos
 */
const validateCoursesQuery = (req, res, next) => {
  const { search, category, limit, page } = req.query;

  // Sanitizar search
  if (search !== undefined) {
    req.query.search = validators.sanitizeSearchString(search);
  }

  // Sanitizar category
  if (category !== undefined) {
    req.query.category = validators.sanitizeCategory(category);
  }

  // Validar limit
  if (limit !== undefined) {
    if (!validators.isValidLimit(limit)) {
      return res.status(400).json({
        success: false,
        message: "Limite inválido. Deve ser um número entre 1 e 1000.",
        code: "INVALID_LIMIT",
      });
    }
    req.query.limit = parseInt(limit, 10);
  }

  // Validar page
  if (page !== undefined) {
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: "Página inválida. Deve ser um número positivo.",
        code: "INVALID_PAGE",
      });
    }
    req.query.page = pageNum;
  }

  next();
};

/**
 * Middleware para validar requisições de scraping
 */
const validateScrapingRequest = (req, res, next) => {
  // Por enquanto, scraping não tem parâmetros obrigatórios
  // Mas podemos validar headers ou tokens no futuro
  next();
};

/**
 * Middleware genérico para limpar query params desconhecidos
 */
const cleanQueryParams = allowedParams => {
  return (req, res, next) => {
    const cleaned = {};
    for (const param of allowedParams) {
      if (req.query[param] !== undefined) {
        cleaned[param] = req.query[param];
      }
    }
    req.query = cleaned;
    next();
  };
};

module.exports = {
  validators,
  validateId,
  validateCategory,
  validateCoursesQuery,
  validateScrapingRequest,
  cleanQueryParams,
};
