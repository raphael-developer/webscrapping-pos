/**
 * @fileoverview Rotas de Comparação
 * Define endpoints para comparação de cursos
 */

const express = require("express");
const ComparisonController = require("../controllers/ComparisonController");

const router = express.Router();
const controller = new ComparisonController();

/**
 * @swagger
 * /api/comparison:
 *   get:
 *     summary: Comparar cursos scraped vs WooCommerce
 *     tags: [Comparison]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoria
 *       - in: query
 *         name: detailed
 *         schema:
 *           type: boolean
 *         description: Retornar detalhes completos
 *     responses:
 *       200:
 *         description: Resultado da comparação
 */
router.get("/", controller.compare);

/**
 * @swagger
 * /api/comparison/missing:
 *   get:
 *     summary: Obter cursos ausentes no WooCommerce
 *     tags: [Comparison]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoria
 *       - in: query
 *         name: groupByCategory
 *         schema:
 *           type: boolean
 *         description: Agrupar por categoria
 *     responses:
 *       200:
 *         description: Lista de cursos ausentes
 */
router.get("/missing", controller.getMissing);

/**
 * @swagger
 * /api/comparison/missing/report:
 *   get:
 *     summary: Gerar relatório de cursos ausentes
 *     tags: [Comparison]
 *     responses:
 *       200:
 *         description: Relatório completo
 */
router.get("/missing/report", controller.getMissingReport);

/**
 * @swagger
 * /api/comparison/missing/export:
 *   get:
 *     summary: Exportar cursos ausentes em CSV
 *     tags: [Comparison]
 *     produces:
 *       - text/csv
 *     responses:
 *       200:
 *         description: Arquivo CSV
 */
router.get("/missing/export", controller.exportMissingCSV);

/**
 * @swagger
 * /api/comparison/sync:
 *   get:
 *     summary: Obter plano de sincronização
 *     tags: [Comparison]
 *     responses:
 *       200:
 *         description: Plano de sincronização com ações recomendadas
 */
router.get("/sync", controller.getSyncPlan);

/**
 * @swagger
 * /api/comparison/woocommerce/stats:
 *   get:
 *     summary: Estatísticas do WooCommerce
 *     tags: [Comparison]
 *     responses:
 *       200:
 *         description: Estatísticas de cursos e categorias
 */
router.get("/woocommerce/stats", controller.getWooCommerceStats);

/**
 * @swagger
 * /api/comparison/scraped/stats:
 *   get:
 *     summary: Estatísticas dos cursos scraped
 *     tags: [Comparison]
 *     responses:
 *       200:
 *         description: Estatísticas de cursos e categorias
 */
router.get("/scraped/stats", controller.getScrapedStats);

/**
 * @swagger
 * /api/comparison/refresh:
 *   post:
 *     summary: Limpar cache
 *     tags: [Comparison]
 *     responses:
 *       200:
 *         description: Cache limpo
 */
router.post("/refresh", controller.refreshCache);

module.exports = router;
