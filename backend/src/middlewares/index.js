/**
 * Índice de middlewares
 * Facilita importação de todos os middlewares em um único lugar
 */

const validation = require("./validation");
const rateLimiter = require("./rateLimiter");

module.exports = {
  // Validation
  ...validation,

  // Rate Limiting
  ...rateLimiter,
};
