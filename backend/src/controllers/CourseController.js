const CourseService = require("../services/CourseService");
const Logger = require("../utils/Logger");
const fs = require("fs").promises;
const path = require("path");

class CourseController {
  constructor() {
    this.courseService = new CourseService();
  }

  getCoursesFilePath() {
    return (
      process.env.COURSES_DATA_FILE ||
      path.join(__dirname, "../../cursos-completo-novo.json")
    );
  }

  getFallbackCoursesFilePath() {
    return path.join(__dirname, "../../cursos-completo-novo-old.json");
  }

  async loadCourses() {
    const primaryPath = this.getCoursesFilePath();
    const fallbackPath = this.getFallbackCoursesFilePath();

    try {
      const coursesData = await fs.readFile(primaryPath, "utf8");
      return JSON.parse(coursesData);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        try {
          const fallbackData = await fs.readFile(fallbackPath, "utf8");
          return JSON.parse(fallbackData);
        } catch (_) {
          return [];
        }
      }
      throw error;
    }
  }

  async getAllCourses(req, res) {
    try {
      const courses = await this.loadCourses();

      const { category, search } = req.query;

      let filteredCourses = courses;

      // Filtrar por categoria
      if (category) {
        const normalize = s =>
          (s || "")
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
        const target = normalize(category);
        filteredCourses = filteredCourses.filter(
          course => normalize(course.category) === target,
        );
      }

      // Filtrar por busca
      if (search) {
        filteredCourses = filteredCourses.filter(course =>
          course.name.toLowerCase().includes(search.toLowerCase()),
        );
      }

      Logger.info(`Retornando ${filteredCourses.length} cursos`);
      res.json(filteredCourses);
    } catch (error) {
      Logger.error("Erro no CourseController.getAllCourses:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  async getCourseById(req, res) {
    try {
      const { id } = req.params;
      const courses = await this.loadCourses();

      const course = courses.find(c => c.id === parseInt(id));

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Curso não encontrado",
        });
      }

      res.json({
        success: true,
        data: course,
        message: "Curso obtido com sucesso",
      });
    } catch (error) {
      Logger.error("Erro no CourseController.getCourseById:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  async getCoursesByCategory(req, res) {
    try {
      const { category } = req.params;
      const courses = await this.loadCourses();

      const normalize = s =>
        (s || "")
          .toString()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();
      const target = normalize(category);
      const filteredCourses = courses.filter(
        course => normalize(course.category) === target,
      );

      res.json({
        success: true,
        data: filteredCourses,
        message: "Cursos da categoria obtidos com sucesso",
      });
    } catch (error) {
      Logger.error("Erro no CourseController.getCoursesByCategory:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  async getAllCategories(req, res) {
    try {
      const courses = await this.loadCourses();

      const categories = [...new Set(courses.map(course => course.category))];

      res.json(categories);
    } catch (error) {
      Logger.error("Erro no CourseController.getAllCategories:", error);
      res.status(500).json(["Pós-graduação"]);
    }
  }

  async getStatistics(req, res) {
    try {
      const courses = await this.loadCourses();

      const categories = [...new Set(courses.map(course => course.category))];

      const stats = {
        totalCourses: courses.length,
        totalCategories: categories.length,
        categories: categories,
        coursesByCategory: categories.reduce((acc, category) => {
          acc[category] = courses.filter(
            course => course.category === category,
          ).length;
          return acc;
        }, {}),
      };

      res.json({
        success: true,
        data: stats,
        message: "Estatísticas obtidas com sucesso",
      });
    } catch (error) {
      Logger.error("Erro no CourseController.getStatistics:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  // Método para atualizar dados via scraping
  setCourseService(courseService) {
    this.courseService = courseService;
  }
}

module.exports = CourseController;
