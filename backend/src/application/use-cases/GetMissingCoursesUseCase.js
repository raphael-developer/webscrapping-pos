/**
 * @fileoverview Use Case - Obter Cursos Ausentes
 * Retorna cursos presentes no site mas não na API WooCommerce
 *
 * @description Use case específico para identificar cursos que precisam
 * ser adicionados à plataforma WooCommerce
 */

const CourseComparisonService = require("../../domain/services/CourseComparisonService");

/**
 * Use Case para encontrar cursos faltantes na API WooCommerce
 *
 * @implements {Single Responsibility Principle}
 */
class GetMissingCoursesUseCase {
  /**
   * @param {IScrapedCourseRepository} scrapedCourseRepository
   * @param {IWooCommerceRepository} wooCommerceRepository
   */
  constructor(scrapedCourseRepository, wooCommerceRepository) {
    this.scrapedCourseRepository = scrapedCourseRepository;
    this.wooCommerceRepository = wooCommerceRepository;
  }

  /**
   * Executa busca por cursos ausentes na API
   *
   * @param {Object} options - Opções de filtro
   * @param {string} [options.category] - Filtrar por categoria
   * @param {boolean} [options.groupByCategory] - Agrupar resultado por categoria
   * @returns {Promise<MissingCoursesDTO>}
   */
  async execute(options = {}) {
    const { category, groupByCategory = false } = options;

    // Buscar cursos das fontes
    let scrapedCourses, wooCommerceCourses;

    if (category) {
      [scrapedCourses, wooCommerceCourses] = await Promise.all([
        this.scrapedCourseRepository.findByCategory(category),
        this.wooCommerceRepository.findByCategory(category),
      ]);
    } else {
      [scrapedCourses, wooCommerceCourses] = await Promise.all([
        this.scrapedCourseRepository.findAll(),
        this.wooCommerceRepository.findAllCourses(),
      ]);
    }

    // Comparar para encontrar ausentes
    const comparison = CourseComparisonService.compare(
      scrapedCourses,
      wooCommerceCourses,
    );

    let missingCourses = comparison.onlyInSite;

    // Agrupar por categoria se solicitado
    if (groupByCategory) {
      missingCourses = CourseComparisonService.groupByCategory(missingCourses);
    }

    return {
      missingCourses,
      totalMissing: comparison.onlyInSite.length,
      totalScraped: scrapedCourses.length,
      totalInWooCommerce: wooCommerceCourses.length,
      metadata: {
        executedAt: new Date().toISOString(),
        filterCategory: category || null,
        groupedByCategory: groupByCategory,
      },
    };
  }

  /**
   * Gera relatório de cursos ausentes para exportação
   *
   * @returns {Promise<Object>}
   */
  async generateReport() {
    const result = await this.execute({ groupByCategory: true });

    return {
      title: "Relatório de Cursos Ausentes no WooCommerce",
      generatedAt: new Date().toISOString(),
      summary: {
        totalMissing: result.totalMissing,
        totalScraped: result.totalScraped,
        totalInWooCommerce: result.totalInWooCommerce,
        percentageMissing:
          result.totalScraped > 0
            ? ((result.totalMissing / result.totalScraped) * 100).toFixed(2)
            : 0,
      },
      byCategory: result.missingCourses,
    };
  }
}

module.exports = GetMissingCoursesUseCase;
