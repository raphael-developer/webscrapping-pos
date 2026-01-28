/**
 * @fileoverview Rotas de Cursos
 * Define endpoints para operações de cursos
 */

const express = require("express");
const CourseController = require("../controllers/CourseController");

const router = express.Router();
const controller = new CourseController();

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Listar cursos
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoria
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por título
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Página atual
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Itens por página
 *     responses:
 *       200:
 *         description: Lista de cursos
 */
router.get("/", controller.getAllCourses);

/**
 * @swagger
 * /api/courses/categories:
 *   get:
 *     summary: Listar categorias
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: Lista de categorias
 */
router.get("/categories", controller.getCategories);

/**
 * @swagger
 * /api/courses/statistics:
 *   get:
 *     summary: Obter estatísticas
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: Estatísticas dos cursos
 */
router.get("/statistics", controller.getStatistics);

/**
 * @swagger
 * /api/courses/category/{category}:
 *   get:
 *     summary: Cursos por categoria
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cursos da categoria
 */
router.get("/category/:category", controller.getCoursesByCategory);

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Obter curso por ID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados do curso
 *       404:
 *         description: Curso não encontrado
 */
router.get("/:id", controller.getCourseById);

module.exports = router;
