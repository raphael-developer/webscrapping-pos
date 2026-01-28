/**
 * @fileoverview Serviço de Domínio - Comparação de Cursos
 * Contém a lógica de negócio pura para comparar cursos
 *
 * @description Este serviço é completamente independente de frameworks,
 * APIs externas ou infraestrutura. Trabalha apenas com entidades de domínio.
 */

/**
 * Resultado da comparação de cursos
 * @typedef {Object} ComparisonResult
 * @property {Array} onlyInSite - Cursos presentes no site mas não na API
 * @property {Array} onlyInAPI - Cursos presentes na API mas não no site
 * @property {Array} inBoth - Cursos presentes em ambos
 * @property {Object} statistics - Estatísticas da comparação
 */

class CourseComparisonService {
  /**
   * Compara cursos do site (scraped) com cursos da API (WooCommerce)
   *
   * @param {Array<ScrapedCourse>} scrapedCourses - Cursos do site
   * @param {Array<WooCommerceCourse>} wooCommerceCourses - Cursos da API
   * @returns {ComparisonResult}
   */
  static compare(scrapedCourses, wooCommerceCourses) {
    // Criar mapas normalizados para comparação eficiente
    const scrapedMap = new Map();
    const wooCommerceMap = new Map();

    // Indexar cursos scraped por nome normalizado
    for (const course of scrapedCourses) {
      const key = CourseComparisonService.normalizeForComparison(
        course.title || course.name,
      );
      if (key) {
        scrapedMap.set(key, course);
      }
    }

    // Indexar cursos WooCommerce por nome normalizado
    for (const course of wooCommerceCourses) {
      const key = CourseComparisonService.normalizeForComparison(course.name);
      if (key) {
        wooCommerceMap.set(key, course);
      }
    }

    // Encontrar cursos apenas no site (não estão na API)
    const onlyInSite = [];
    const inBoth = [];

    for (const [key, scrapedCourse] of scrapedMap) {
      const wooCommerceCourse = wooCommerceMap.get(key);

      if (wooCommerceCourse) {
        // Curso existe em ambos - verificar diferenças
        inBoth.push({
          scraped: scrapedCourse,
          wooCommerce: wooCommerceCourse,
          differences: CourseComparisonService.findDifferences(
            scrapedCourse,
            wooCommerceCourse,
          ),
        });
      } else {
        // Curso está no site mas não na API
        onlyInSite.push({
          ...scrapedCourse,
          normalizedName: key,
          reason: "Não encontrado na API WooCommerce",
        });
      }
    }

    // Encontrar cursos apenas na API (não estão no site)
    const onlyInAPI = [];
    for (const [key, wooCommerceCourse] of wooCommerceMap) {
      if (!scrapedMap.has(key)) {
        onlyInAPI.push({
          ...wooCommerceCourse,
          normalizedName: key,
          reason: "Não encontrado no site via scraping",
        });
      }
    }

    // Calcular estatísticas
    const statistics = {
      totalScraped: scrapedCourses.length,
      totalWooCommerce: wooCommerceCourses.length,
      onlyInSiteCount: onlyInSite.length,
      onlyInAPICount: onlyInAPI.length,
      matchedCount: inBoth.length,
      matchPercentage:
        scrapedCourses.length > 0
          ? ((inBoth.length / scrapedCourses.length) * 100).toFixed(2)
          : 0,
      timestamp: new Date().toISOString(),
    };

    return {
      onlyInSite,
      onlyInAPI,
      inBoth,
      statistics,
    };
  }

  /**
   * Normaliza string para comparação
   * Remove acentos, caracteres especiais e padroniza espaços
   *
   * @param {string} str
   * @returns {string}
   */
  static normalizeForComparison(str) {
    if (!str) return "";

    return str
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^A-Z0-9\s]/g, "") // Remove caracteres especiais
      .replace(/\s+/g, " ") // Normaliza espaços
      .trim();
  }

  /**
   * Encontra diferenças entre curso scraped e WooCommerce
   *
   * @param {Object} scraped
   * @param {Object} wooCommerce
   * @returns {Array<Object>}
   */
  static findDifferences(scraped, wooCommerce) {
    const differences = [];

    // Comparar categoria
    const scrapedCategory = CourseComparisonService.normalizeForComparison(
      scraped.category,
    );
    const wooCategory = wooCommerce.mainCategory
      ? CourseComparisonService.normalizeForComparison(wooCommerce.mainCategory)
      : "";

    if (scrapedCategory && wooCategory && scrapedCategory !== wooCategory) {
      differences.push({
        field: "category",
        scraped: scraped.category,
        wooCommerce: wooCommerce.mainCategory,
      });
    }

    // Comparar duração (carga horária)
    const scrapedDuration = CourseComparisonService.extractHours(
      scraped.duration,
    );
    const wooDuration = CourseComparisonService.extractHours(
      wooCommerce.duration,
    );

    if (scrapedDuration && wooDuration && scrapedDuration !== wooDuration) {
      differences.push({
        field: "duration",
        scraped: scraped.duration,
        wooCommerce: wooCommerce.duration,
      });
    }

    return differences;
  }

  /**
   * Extrai número de horas de uma string
   * @param {string} str
   * @returns {number|null}
   */
  static extractHours(str) {
    if (!str) return null;
    const match = str.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Agrupa cursos por categoria
   * @param {Array} courses
   * @returns {Object}
   */
  static groupByCategory(courses) {
    return courses.reduce((acc, course) => {
      const category =
        course.category || course.mainCategory || "Sem categoria";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(course);
      return acc;
    }, {});
  }
}

module.exports = CourseComparisonService;
