/**
 * @fileoverview Rotas - Registro de Cursos no WooCommerce
 * Define endpoints RESTful para cadastro assistido
 *
 * @description Endpoints disponíveis:
 *
 * Preparação:
 * - GET  /api/registration/prepare          - Prepara cursos ausentes para cadastro
 * - POST /api/registration/prepare/:id      - Prepara um único curso
 *
 * Listagem:
 * - GET  /api/registration                  - Lista registros pendentes
 * - GET  /api/registration/approved         - Lista registros aprovados
 * - GET  /api/registration/statistics       - Estatísticas dos registros
 * - GET  /api/registration/:id              - Detalhes de um registro
 *
 * Ações:
 * - PUT    /api/registration/:id            - Atualiza um registro
 * - POST   /api/registration/:id/approve    - Aprova registro para cadastro
 * - POST   /api/registration/:id/reject     - Rejeita um registro
 * - POST   /api/registration/:id/register   - Cadastra no WooCommerce
 * - DELETE /api/registration/:id            - Remove um registro
 *
 * Batch:
 * - POST /api/registration/register-batch   - Cadastra múltiplos cursos
 *
 * Backup:
 * - GET  /api/registration/export           - Exporta registros
 * - POST /api/registration/import           - Importa registros
 */

const express = require("express");
const router = express.Router();
const RegistrationController = require("../controllers/RegistrationController");

// Instanciar controller
const controller = new RegistrationController();

// ===== Preparação =====
// Prepara cursos ausentes para cadastro
router.get("/prepare", controller.prepareCourses);

// Prepara um único curso
router.post("/prepare/:scrapedCourseId", controller.prepareSingleCourse);

// ===== Listagem =====
// Lista registros pendentes de revisão
router.get("/", controller.listPending);

// Lista registros aprovados
router.get("/approved", controller.listApproved);

// Obtém estatísticas
router.get("/statistics", controller.getStatistics);

// Obtém detalhes de um registro (DEVE vir depois das rotas específicas)
router.get("/:id", controller.getDetails);

// ===== Ações em registro individual =====
// Atualiza dados de um registro
router.put("/:id", controller.updateRegistration);

// Aprova um registro para cadastro
router.post("/:id/approve", controller.approve);

// Rejeita um registro
router.post("/:id/reject", controller.reject);

// Busca descrição real do site para um registro
router.post("/:id/fetch-description", controller.fetchSiteDescription);

// Cadastra um curso aprovado no WooCommerce
router.post("/:id/register", controller.registerInWooCommerce);

// Remove um registro
router.delete("/:id", controller.deleteRegistration);

// ===== Operações em batch =====
// Cadastra múltiplos cursos aprovados
router.post("/register-batch", controller.registerBatch);

// ===== Backup/Restore =====
// Exporta registros para backup
router.get("/export", controller.exportBackup);

// Importa registros de backup
router.post("/import", controller.importBackup);

module.exports = router;
