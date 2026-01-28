/**
 * @fileoverview Use Case - Sincronização de Cursos
 * Fornece informações para sincronizar cursos entre fontes
 */

const CourseComparisonService = require("../../domain/services/CourseComparisonService");

/**
 * Use Case para obter informações de sincronização
 */
class SyncCoursesUseCase {
  constructor(scrapedCourseRepository, wooCommerceRepository) {
    this.scrapedCourseRepository = scrapedCourseRepository;
    this.wooCommerceRepository = wooCommerceRepository;
  }

  /**
   * Gera plano de sincronização
   *
   * @returns {Promise<SyncPlanDTO>}
   */
  async execute() {
    const [
      scrapedCourses,
      wooCommerceCourses,
      scrapedCategories,
      wooCategories,
    ] = await Promise.all([
      this.scrapedCourseRepository.findAll(),
      this.wooCommerceRepository.findAllCourses(),
      this.scrapedCourseRepository.getCategories(),
      this.wooCommerceRepository.findAllCategories(),
    ]);

    const comparison = CourseComparisonService.compare(
      scrapedCourses,
      wooCommerceCourses,
    );

    // Identificar ações necessárias
    const actions = {
      toCreate: comparison.onlyInSite.map(course => ({
        action: "CREATE",
        priority: "HIGH",
        course: {
          name: course.title || course.name,
          category: course.category,
          slug: course.slug,
          duration: course.duration,
        },
      })),
      toReview: comparison.inBoth
        .filter(item => item.differences.length > 0)
        .map(item => ({
          action: "REVIEW",
          priority: "MEDIUM",
          course: item.scraped,
          differences: item.differences,
        })),
      toRemove: comparison.onlyInAPI.map(course => ({
        action: "REVIEW_REMOVAL",
        priority: "LOW",
        course: {
          id: course.id,
          name: course.name,
          permalink: course.permalink,
        },
        reason: "Curso presente na API mas não encontrado no site",
      })),
    };

    // Estatísticas de categorias
    const categoryStats = this.compareCategoryStats(
      scrapedCategories,
      wooCategories,
    );

    return {
      syncPlan: actions,
      statistics: {
        ...comparison.statistics,
        toCreate: actions.toCreate.length,
        toReview: actions.toReview.length,
        toRemove: actions.toRemove.length,
      },
      categoryComparison: categoryStats,
      metadata: {
        generatedAt: new Date().toISOString(),
        recommendedOrder: ["CREATE", "REVIEW", "REVIEW_REMOVAL"],
      },
    };
  }

  /**
   * Compara estatísticas de categorias
   */
  compareCategoryStats(scrapedCategories, wooCategories) {
    const normalizedScraped = scrapedCategories.map(c =>
      CourseComparisonService.normalizeForComparison(c.name || c),
    );

    const normalizedWoo = wooCategories.map(c =>
      CourseComparisonService.normalizeForComparison(c.name || c),
    );

    return {
      scrapedCount: scrapedCategories.length,
      wooCommerceCount: wooCategories.length,
      onlyInSite: scrapedCategories.filter(
        (_, i) => !normalizedWoo.includes(normalizedScraped[i]),
      ),
      onlyInAPI: wooCategories.filter(c => {
        const normalized = CourseComparisonService.normalizeForComparison(
          c.name || c,
        );
        return !normalizedScraped.includes(normalized);
      }),
    };
  }
}

module.exports = SyncCoursesUseCase;
