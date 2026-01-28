/**
 * Classes de erro customizadas para tratamento estruturado de erros
 */

/**
 * Erro base da aplicação
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Distingue de erros de programação
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV !== "production" && { stack: this.stack }),
    };
  }
}

/**
 * Erro de validação (400)
 */
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, "VALIDATION_ERROR");
    this.errors = errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}

/**
 * Erro de recurso não encontrado (404)
 */
class NotFoundError extends AppError {
  constructor(resource = "Recurso", id = null) {
    const message = id
      ? `${resource} com ID ${id} não encontrado`
      : `${resource} não encontrado`;
    super(message, 404, "NOT_FOUND");
    this.resource = resource;
    this.resourceId = id;
  }
}

/**
 * Erro de conflito/recurso em uso (409)
 */
class ConflictError extends AppError {
  constructor(message = "Recurso já está em uso") {
    super(message, 409, "CONFLICT");
  }
}

/**
 * Erro de operação já em progresso (409)
 */
class OperationInProgressError extends ConflictError {
  constructor(operation = "Operação") {
    super(`${operation} já está em andamento`);
    this.code = "OPERATION_IN_PROGRESS";
    this.operation = operation;
  }
}

/**
 * Erro de rate limit excedido (429)
 */
class RateLimitError extends AppError {
  constructor(retryAfter = 60) {
    super(
      "Limite de requisições excedido. Tente novamente mais tarde.",
      429,
      "RATE_LIMIT_EXCEEDED",
    );
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Erro de serviço indisponível (503)
 */
class ServiceUnavailableError extends AppError {
  constructor(service = "Serviço") {
    super(
      `${service} temporariamente indisponível`,
      503,
      "SERVICE_UNAVAILABLE",
    );
    this.service = service;
  }
}

/**
 * Erro de scraping
 */
class ScrapingError extends AppError {
  constructor(message, details = {}) {
    super(message, 500, "SCRAPING_ERROR");
    this.details = details;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: this.details,
    };
  }
}

/**
 * Erro de timeout no scraping
 */
class ScrapingTimeoutError extends ScrapingError {
  constructor(operation, timeoutMs) {
    super(`Timeout durante ${operation}: ${timeoutMs}ms`, {
      operation,
      timeoutMs,
    });
    this.code = "SCRAPING_TIMEOUT";
  }
}

/**
 * Erro de arquivo não encontrado
 */
class FileNotFoundError extends AppError {
  constructor(filePath) {
    super(`Arquivo não encontrado: ${filePath}`, 500, "FILE_NOT_FOUND");
    this.filePath = filePath;
  }
}

/**
 * Erro de configuração
 */
class ConfigurationError extends AppError {
  constructor(message, config = null) {
    super(message, 500, "CONFIGURATION_ERROR");
    this.config = config;
  }
}

/**
 * Verifica se é um erro operacional (tratável)
 */
function isOperationalError(error) {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Converte erros comuns para AppError
 */
function normalizeError(error) {
  if (error instanceof AppError) {
    return error;
  }

  // Erros comuns do Node.js
  if (error.code === "ENOENT") {
    return new FileNotFoundError(error.path);
  }

  if (error.code === "ECONNREFUSED") {
    return new ServiceUnavailableError("Serviço externo");
  }

  if (error.name === "TimeoutError") {
    return new ScrapingTimeoutError("operação", error.timeout || 0);
  }

  // Retorna erro genérico
  return new AppError(
    error.message || "Erro interno do servidor",
    500,
    "INTERNAL_ERROR",
  );
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  OperationInProgressError,
  RateLimitError,
  ServiceUnavailableError,
  ScrapingError,
  ScrapingTimeoutError,
  FileNotFoundError,
  ConfigurationError,
  isOperationalError,
  normalizeError,
};
