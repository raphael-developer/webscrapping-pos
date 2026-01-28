/**
 * @fileoverview Interface do Repositório de Scraping
 * Define o contrato para operações de scraping
 *
 * @description Seguindo o Princípio da Inversão de Dependência (DIP),
 * a camada de aplicação depende desta abstração, não de implementações concretas
 * como Puppeteer, Playwright, etc.
 */

/**
 * @interface IScrapingRepository
 * @description Contrato para implementações de scraping
 */
class IScrapingRepository {
  /**
   * Extrai cursos de uma URL específica
   * @param {string} url - URL para scraping
   * @param {Object} options - Opções de extração
   * @returns {Promise<Array<Object>>} - Cursos extraídos
   */
  async extractCoursesFromUrl(url, options = {}) {
    throw new Error("Method not implemented: extractCoursesFromUrl");
  }

  /**
   * Extrai todas as categorias disponíveis
   * @param {string} baseUrl - URL base do site
   * @returns {Promise<Array<{name: string, url: string}>>}
   */
  async extractCategories(baseUrl) {
    throw new Error("Method not implemented: extractCategories");
  }

  /**
   * Extrai cursos de uma categoria específica
   * @param {string} categoryUrl - URL da categoria
   * @param {Object} options - Opções de extração
   * @returns {Promise<Array<Object>>}
   */
  async extractCoursesByCategory(categoryUrl, options = {}) {
    throw new Error("Method not implemented: extractCoursesByCategory");
  }

  /**
   * Extrai detalhes de um curso específico
   * @param {string} courseUrl - URL do curso
   * @returns {Promise<Object|null>}
   */
  async extractCourseDetails(courseUrl) {
    throw new Error("Method not implemented: extractCourseDetails");
  }

  /**
   * Verifica se o site está acessível
   * @param {string} url - URL para verificar
   * @returns {Promise<boolean>}
   */
  async isAccessible(url) {
    throw new Error("Method not implemented: isAccessible");
  }

  /**
   * Obtém progresso atual do scraping
   * @returns {Object} - { processedCourses, totalCourses, processedCategories, totalCategories }
   */
  getProgress() {
    throw new Error("Method not implemented: getProgress");
  }

  /**
   * Cancela operação de scraping em andamento
   * @returns {Promise<void>}
   */
  async cancel() {
    throw new Error("Method not implemented: cancel");
  }
}

module.exports = IScrapingRepository;
