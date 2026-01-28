/**
 * Índice de utilitários
 */

const Logger = require("./Logger");
const errors = require("./errors");

module.exports = {
  Logger,
  ...errors,
};
