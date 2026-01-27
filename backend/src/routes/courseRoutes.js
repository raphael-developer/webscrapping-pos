const express = require('express');
const CourseController = require('../controllers/CourseController');

const router = express.Router();
const courseController = new CourseController();

// GET /api/courses - Obter todos os cursos com filtros opcionais
router.get('/', (req, res) => courseController.getAllCourses(req, res));

// GET /api/courses/categories - Obter todas as categorias
router.get('/categories', (req, res) => courseController.getAllCategories(req, res));

// GET /api/courses/statistics - Obter estatísticas
router.get('/statistics', (req, res) => courseController.getStatistics(req, res));

// GET /api/courses/category/:category - Obter cursos por categoria
router.get('/category/:category', (req, res) => courseController.getCoursesByCategory(req, res));

// GET /api/courses/:id - Obter curso por ID
router.get('/:id', (req, res) => courseController.getCourseById(req, res));

module.exports = { router, courseController };