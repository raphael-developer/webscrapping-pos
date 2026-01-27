const Course = require('../models/Course');
const Category = require('../models/Category');
const Logger = require('../utils/Logger');

class CourseService {
  constructor() {
    this.courses = [];
    this.categories = [];
  }

  async getAllCourses(filters = {}) {
    try {
      let filteredCourses = [...this.courses];

      if (filters.category) {
        filteredCourses = filteredCourses.filter(course => 
          course.category.toLowerCase().includes(filters.category.toLowerCase())
        );
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredCourses = filteredCourses.filter(course =>
          course.title.toLowerCase().includes(searchTerm) ||
          course.description.toLowerCase().includes(searchTerm)
        );
      }

      if (filters.limit) {
        filteredCourses = filteredCourses.slice(0, parseInt(filters.limit));
      }

      return {
        courses: filteredCourses.map(course => course.toJSON()),
        total: filteredCourses.length,
        categories: this.categories.map(cat => cat.toJSON())
      };
    } catch (error) {
      Logger.error('Erro ao obter cursos:', error);
      throw error;
    }
  }

  async getCourseById(id) {
    try {
      const course = this.courses.find(course => course.id === parseInt(id));
      if (!course) {
        throw new Error('Curso não encontrado');
      }
      return course.toJSON();
    } catch (error) {
      Logger.error(`Erro ao obter curso ${id}:`, error);
      throw error;
    }
  }

  async getCoursesByCategory(categoryName) {
    try {
      const courses = this.courses.filter(course => 
        course.category.toLowerCase() === categoryName.toLowerCase()
      );
      
      return {
        courses: courses.map(course => course.toJSON()),
        total: courses.length,
        category: categoryName
      };
    } catch (error) {
      Logger.error(`Erro ao obter cursos da categoria ${categoryName}:`, error);
      throw error;
    }
  }

  async getAllCategories() {
    try {
      return this.categories.map(category => category.toJSON());
    } catch (error) {
      Logger.error('Erro ao obter categorias:', error);
      throw error;
    }
  }

  async updateCoursesData(scrapedData) {
    try {
      this.courses = scrapedData.courses || [];
      this.categories = scrapedData.categories || [];
      
      Logger.info(`Dados atualizados: ${this.courses.length} cursos, ${this.categories.length} categorias`);
      
      return {
        coursesCount: this.courses.length,
        categoriesCount: this.categories.length,
        updatedAt: new Date()
      };
    } catch (error) {
      Logger.error('Erro ao atualizar dados dos cursos:', error);
      throw error;
    }
  }

  getStatistics() {
    try {
      const stats = {
        totalCourses: this.courses.length,
        totalCategories: this.categories.length,
        coursesByCategory: {},
        lastUpdated: new Date()
      };

      this.categories.forEach(category => {
        const coursesInCategory = this.courses.filter(course => 
          course.category === category.name
        );
        stats.coursesByCategory[category.name] = coursesInCategory.length;
      });

      return stats;
    } catch (error) {
      Logger.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }
}

module.exports = CourseService;