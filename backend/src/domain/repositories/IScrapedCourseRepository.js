/**
 * @fileoverview Interface do Repositório de Cursos Scraped
 * Define o contrato para acesso aos cursos coletados via scraping
 */

/**
 * @interface IScrapedCourseRepository
 */
class IScrapedCourseRepository {
  /**
   * Busca todos os cursos scraped
   * @returns {Promise<Array<ScrapedCourse>>}
   */
  async findAll() {
    throw new Error("Method not implemented: findAll");
  }

  /**
   * Busca curso por ID
   * @param {number} id
   * @returns {Promise<ScrapedCourse|null>}
   */
  async findById(id) {
    throw new Error("Method not implemented: findById");
  }

  /**
   * Busca cursos por categoria
   * @param {string} category
   * @returns {Promise<Array<ScrapedCourse>>}
   */
  async findByCategory(category) {
    throw new Error("Method not implemented: findByCategory");
  }

  /**
   * Busca cursos por título (busca parcial)
   * @param {string} title
   * @returns {Promise<Array<ScrapedCourse>>}
   */
  async findByTitle(title) {
    throw new Error("Method not implemented: findByTitle");
  }

  /**
   * Conta total de cursos
   * @returns {Promise<number>}
   */
  async count() {
    throw new Error("Method not implemented: count");
  }

  /**
   * Lista todas as categorias únicas
   * @returns {Promise<Array<string>>}
   */
  async findAllCategories() {
    throw new Error("Method not implemented: findAllCategories");
  }
}

module.exports = IScrapedCourseRepository;
