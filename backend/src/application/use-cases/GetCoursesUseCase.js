/**
 * @fileoverview Use Case - Obter Cursos
 * Orquestra a busca de cursos com filtros
 *
 * @description Seguindo Clean Architecture, este use case:
 * - Depende apenas de interfaces (não de implementações)
 * - Contém regras de negócio de aplicação
 * - É completamente testável em isolamento
 */

/**
 * Use Case para obter cursos com filtros opcionais
 */
class GetCoursesUseCase {
  /**
   * @param {IScrapedCourseRepository} courseRepository
   */
  constructor(courseRepository) {
    this.courseRepository = courseRepository;
  }

  /**
   * Executa busca de cursos
   *
   * @param {Object} filters - Filtros opcionais
   * @param {string} [filters.category] - Filtrar por categoria
   * @param {string} [filters.search] - Busca por título
   * @param {number} [filters.limit] - Limite de resultados
   * @param {number} [filters.page] - Página atual (para paginação)
   * @param {number} [filters.pageSize] - Tamanho da página
   * @returns {Promise<Object>}
   */
  async execute(filters = {}) {
    let courses;

    // Aplicar filtros
    if (filters.category) {
      courses = await this.courseRepository.findByCategory(filters.category);
    } else if (filters.search) {
      courses = await this.courseRepository.findByTitle(filters.search);
    } else {
      courses = await this.courseRepository.findAll();
    }

    // Paginação
    const page = Math.max(1, parseInt(filters.page) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(filters.pageSize) || 50),
    );
    const totalItems = courses.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedCourses = courses.slice(startIndex, startIndex + pageSize);

    // Limite simples (alternativa à paginação)
    const finalCourses = filters.limit
      ? paginatedCourses.slice(0, parseInt(filters.limit))
      : paginatedCourses;

    return {
      courses: finalCourses.map(course => this.toDTO(course)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: {
        category: filters.category || null,
        search: filters.search || null,
      },
    };
  }

  /**
   * Converte entidade para DTO
   * @param {ScrapedCourse} course
   * @returns {Object}
   */
  toDTO(course) {
    return {
      id: course.id,
      name: course.title,
      title: course.title,
      category: course.category,
      description: course.description,
      duration: course.duration,
      modality: course.modality,
      price: course.price,
      url: course.url,
      imageUrl: course.imageUrl,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  }
}

module.exports = GetCoursesUseCase;
