/**
 * @fileoverview Controller - Cursos
 * Camada de apresentação para endpoints de cursos
 *
 * @description Responsável por:
 * - Validar entrada HTTP
 * - Chamar use cases apropriados
 * - Formatar resposta HTTP
 *
 * Segue Clean Architecture: não contém lógica de negócio
 */

const { getContainer } = require("../../infrastructure/DIContainer");

/**
 * Controller para operações de cursos
 */
class CourseController {
  /**
   * GET /api/courses
   * Retorna lista de cursos com filtros opcionais
   */
  getAllCourses = async (req, res, next) => {
    try {
      const { category, search, limit, page, pageSize } = req.query;

      const useCase = getContainer().resolve("getCoursesUseCase");
      const result = await useCase.execute({
        category,
        search,
        limit,
        page,
        pageSize,
      });

      res.json({
        success: true,
        data: result.courses,
        pagination: result.pagination,
        filters: result.filters,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/courses/:id
   * Retorna um curso específico
   */
  getCourseById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const repository = getContainer().resolve("scrapedCourseRepository");
      const course = await repository.findById(parseInt(id));

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Curso não encontrado",
        });
      }

      res.json({
        success: true,
        data: course,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/courses/category/:category
   * Retorna cursos de uma categoria específica
   */
  getCoursesByCategory = async (req, res, next) => {
    try {
      const { category } = req.params;
      const { limit, page, pageSize } = req.query;

      const useCase = getContainer().resolve("getCoursesUseCase");
      const result = await useCase.execute({
        category: decodeURIComponent(category),
        limit,
        page,
        pageSize,
      });

      res.json({
        success: true,
        data: result.courses,
        pagination: result.pagination,
        category: decodeURIComponent(category),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/courses/categories
   * Retorna lista de categorias disponíveis
   */
  getCategories = async (req, res, next) => {
    try {
      const repository = getContainer().resolve("scrapedCourseRepository");
      const categories = await repository.findAllCategories();

      res.json({
        success: true,
        data: categories,
        total: categories.length,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/courses/statistics
   * Retorna estatísticas dos cursos
   */
  getStatistics = async (req, res, next) => {
    try {
      const useCase = getContainer().resolve("getStatisticsUseCase");
      const statistics = await useCase.execute();

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = CourseController;
