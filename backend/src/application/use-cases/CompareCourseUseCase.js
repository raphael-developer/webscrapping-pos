/**
 * @fileoverview Use Case - Comparar Cursos
 * Orquestra a comparação entre cursos do site e da API WooCommerce
 *
 * @description Seguindo Clean Architecture, este use case:
 * - Depende apenas de interfaces (não de implementações)
 * - Contém regras de negócio de aplicação
 * - É completamente testável em isolamento
 */

const CourseComparisonService = require("../../domain/services/CourseComparisonService");

/**
 * Use Case para comparar cursos entre fonte de scraping e WooCommerce API
 *
 * @implements {Single Responsibility Principle}
 * @implements {Dependency Inversion Principle}
 */
class CompareCourseUseCase {
  /**
   * @param {IScrapedCourseRepository} scrapedCourseRepository
   * @param {IWooCommerceRepository} wooCommerceRepository
   */
  constructor(scrapedCourseRepository, wooCommerceRepository) {
    this.scrapedCourseRepository = scrapedCourseRepository;
    this.wooCommerceRepository = wooCommerceRepository;
  }

  /**
   * Executa a comparação completa
   *
   * @returns {Promise<ComparisonResultDTO>}
   */
  async execute() {
    // 1. Buscar cursos de ambas as fontes em paralelo (otimização)
    const [scrapedCourses, wooCommerceCourses] = await Promise.all([
      this.scrapedCourseRepository.findAll(),
      this.wooCommerceRepository.findAllCourses(),
    ]);

    // 2. Executar comparação usando serviço de domínio
    const comparisonResult = CourseComparisonService.compare(
      scrapedCourses,
      wooCommerceCourses,
    );

    // 3. Enriquecer resultado com metadados
    return {
      ...comparisonResult,
      metadata: {
        executedAt: new Date().toISOString(),
        sources: {
          scraped: {
            source: "Local JSON file",
            count: scrapedCourses.length,
          },
          wooCommerce: {
            source: "WooCommerce REST API",
            count: wooCommerceCourses.length,
          },
        },
      },
    };
  }

  /**
   * Executa comparação filtrada por categoria
   *
   * @param {string} category - Nome da categoria para filtrar
   * @returns {Promise<ComparisonResultDTO>}
   */
  async executeByCategory(category) {
    const [scrapedCourses, wooCommerceCourses] = await Promise.all([
      this.scrapedCourseRepository.findByCategory(category),
      this.wooCommerceRepository.findByCategory(category),
    ]);

    const comparisonResult = CourseComparisonService.compare(
      scrapedCourses,
      wooCommerceCourses,
    );

    return {
      ...comparisonResult,
      metadata: {
        executedAt: new Date().toISOString(),
        filterCategory: category,
        sources: {
          scraped: {
            source: "Local JSON file",
            count: scrapedCourses.length,
          },
          wooCommerce: {
            source: "WooCommerce REST API",
            count: wooCommerceCourses.length,
          },
        },
      },
    };
  }
}

module.exports = CompareCourseUseCase;
