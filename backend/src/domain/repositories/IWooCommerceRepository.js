/**
 * @fileoverview Interface do Repositório de Cursos WooCommerce
 * Define o contrato que qualquer implementação deve seguir
 *
 * @description Seguindo o Princípio da Inversão de Dependência (DIP),
 * a camada de aplicação depende desta abstração, não de implementações concretas.
 */

/**
 * @interface IWooCommerceRepository
 * @description Contrato para acesso a dados de cursos do WooCommerce
 */
class IWooCommerceRepository {
  /**
   * Busca todos os cursos publicados
   * @returns {Promise<Array<WooCommerceCourse>>}
   * @throws {Error} Se a implementação não for fornecida
   */
  async findAllCourses() {
    throw new Error("Method not implemented: findAllCourses");
  }

  /**
   * Busca curso por ID
   * @param {number} id
   * @returns {Promise<WooCommerceCourse|null>}
   */
  async findById(id) {
    throw new Error("Method not implemented: findById");
  }

  /**
   * Busca cursos por categoria
   * @param {string} categorySlug
   * @returns {Promise<Array<WooCommerceCourse>>}
   */
  async findByCategory(categorySlug) {
    throw new Error("Method not implemented: findByCategory");
  }

  /**
   * Busca cursos por nome (busca parcial)
   * @param {string} name
   * @returns {Promise<Array<WooCommerceCourse>>}
   */
  async findByName(name) {
    throw new Error("Method not implemented: findByName");
  }

  /**
   * Conta total de cursos
   * @returns {Promise<number>}
   */
  async count() {
    throw new Error("Method not implemented: count");
  }

  /**
   * Busca todas as categorias de cursos
   * @returns {Promise<Array<{id: number, name: string, slug: string, count: number}>>}
   */
  async findAllCategories() {
    throw new Error("Method not implemented: findAllCategories");
  }
}

module.exports = IWooCommerceRepository;
