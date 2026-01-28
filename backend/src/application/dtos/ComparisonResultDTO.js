/**
 * @fileoverview DTO - Resultado da Comparação
 * Data Transfer Object para resultado de comparação
 */

/**
 * @typedef {Object} CourseDTO
 * @property {string} name - Nome do curso
 * @property {string} category - Categoria
 * @property {string} slug - Slug URL
 * @property {string} [duration] - Carga horária
 * @property {string} [source] - Fonte do dado
 */

/**
 * @typedef {Object} DifferenceDTO
 * @property {string} field - Campo com diferença
 * @property {any} scraped - Valor do scraping
 * @property {any} wooCommerce - Valor do WooCommerce
 */

/**
 * @typedef {Object} MatchedCourseDTO
 * @property {CourseDTO} scraped - Curso do scraping
 * @property {CourseDTO} wooCommerce - Curso do WooCommerce
 * @property {DifferenceDTO[]} differences - Lista de diferenças
 */

/**
 * @typedef {Object} ComparisonStatisticsDTO
 * @property {number} totalScraped - Total de cursos scraped
 * @property {number} totalWooCommerce - Total de cursos no WooCommerce
 * @property {number} onlyInSiteCount - Cursos só no site
 * @property {number} onlyInAPICount - Cursos só na API
 * @property {number} matchedCount - Cursos correspondentes
 * @property {string} matchPercentage - Porcentagem de correspondência
 * @property {string} timestamp - Timestamp da comparação
 */

/**
 * @typedef {Object} ComparisonMetadataDTO
 * @property {string} executedAt - Data/hora da execução
 * @property {string} [filterCategory] - Categoria filtrada
 * @property {Object} sources - Informações das fontes
 */

/**
 * @typedef {Object} ComparisonResultDTO
 * @property {CourseDTO[]} onlyInSite - Cursos só no site
 * @property {CourseDTO[]} onlyInAPI - Cursos só na API
 * @property {MatchedCourseDTO[]} inBoth - Cursos em ambos
 * @property {ComparisonStatisticsDTO} statistics - Estatísticas
 * @property {ComparisonMetadataDTO} metadata - Metadados
 */

/**
 * Classe factory para criar DTOs de comparação
 */
class ComparisonResultDTO {
  /**
   * Cria DTO simplificado para resposta da API
   * @param {ComparisonResultDTO} result
   * @returns {Object}
   */
  static toSimpleResponse(result) {
    return {
      summary: {
        totalScraped: result.statistics.totalScraped,
        totalWooCommerce: result.statistics.totalWooCommerce,
        onlyInSite: result.statistics.onlyInSiteCount,
        onlyInAPI: result.statistics.onlyInAPICount,
        matched: result.statistics.matchedCount,
        matchPercentage: result.statistics.matchPercentage,
      },
      executedAt: result.metadata?.executedAt || result.statistics.timestamp,
    };
  }

  /**
   * Cria DTO detalhado para resposta da API
   * @param {ComparisonResultDTO} result
   * @returns {Object}
   */
  static toDetailedResponse(result) {
    return {
      ...ComparisonResultDTO.toSimpleResponse(result),
      onlyInSite: result.onlyInSite.map(course => ({
        name: course.title || course.name,
        category: course.category,
        slug: course.slug,
        url: course.url,
      })),
      onlyInAPI: result.onlyInAPI.map(course => ({
        id: course.id,
        name: course.name,
        category: course.mainCategory,
        permalink: course.permalink,
      })),
      withDifferences: result.inBoth
        .filter(item => item.differences.length > 0)
        .map(item => ({
          name: item.scraped.title || item.scraped.name,
          differences: item.differences,
        })),
    };
  }

  /**
   * Cria DTO para exportação CSV
   * @param {CourseDTO[]} courses
   * @returns {string}
   */
  static toCSV(courses) {
    const headers = ["Nome", "Categoria", "Slug", "URL", "Motivo"];
    const rows = courses.map(course =>
      [
        course.title || course.name || "",
        course.category || "",
        course.slug || "",
        course.url || "",
        course.reason || "",
      ]
        .map(field => `"${String(field).replace(/"/g, '""')}"`)
        .join(","),
    );

    return [headers.join(","), ...rows].join("\n");
  }
}

module.exports = ComparisonResultDTO;
