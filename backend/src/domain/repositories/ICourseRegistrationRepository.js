/**
 * @fileoverview Interface do Repositório de Registro de Cursos
 * Define o contrato para persistência de registros de cadastro
 *
 * @description Seguindo o Princípio da Inversão de Dependência (DIP),
 * a camada de aplicação depende desta abstração, não de implementações concretas.
 */

/**
 * @interface ICourseRegistrationRepository
 * @description Contrato para persistência de registros de cadastro
 */
class ICourseRegistrationRepository {
  /**
   * Salva um novo registro de cadastro
   * @param {CourseRegistration} registration
   * @returns {Promise<CourseRegistration>}
   */
  async save(registration) {
    throw new Error('Method not implemented: save');
  }

  /**
   * Atualiza um registro existente
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<CourseRegistration>}
   */
  async update(id, updates) {
    throw new Error('Method not implemented: update');
  }

  /**
   * Busca registro por ID
   * @param {string} id
   * @returns {Promise<CourseRegistration|null>}
   */
  async findById(id) {
    throw new Error('Method not implemented: findById');
  }

  /**
   * Busca todos os registros
   * @param {Object} options - Opções de filtro e paginação
   * @returns {Promise<Array<CourseRegistration>>}
   */
  async findAll(options) {
    throw new Error('Method not implemented: findAll');
  }

  /**
   * Busca registros por status
   * @param {string} status
   * @returns {Promise<Array<CourseRegistration>>}
   */
  async findByStatus(status) {
    throw new Error('Method not implemented: findByStatus');
  }

  /**
   * Busca registros pendentes de revisão
   * @returns {Promise<Array<CourseRegistration>>}
   */
  async findPendingReview() {
    throw new Error('Method not implemented: findPendingReview');
  }

  /**
   * Busca registros aprovados (prontos para cadastro)
   * @returns {Promise<Array<CourseRegistration>>}
   */
  async findApproved() {
    throw new Error('Method not implemented: findApproved');
  }

  /**
   * Busca registro por ID do curso scraped
   * @param {string} scrapedCourseId
   * @returns {Promise<CourseRegistration|null>}
   */
  async findByScrapedCourseId(scrapedCourseId) {
    throw new Error('Method not implemented: findByScrapedCourseId');
  }

  /**
   * Remove um registro
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    throw new Error('Method not implemented: delete');
  }

  /**
   * Remove múltiplos registros
   * @param {Array<string>} ids
   * @returns {Promise<number>} - Quantidade removida
   */
  async deleteMany(ids) {
    throw new Error('Method not implemented: deleteMany');
  }

  /**
   * Conta registros por status
   * @returns {Promise<Object>}
   */
  async countByStatus() {
    throw new Error('Method not implemented: countByStatus');
  }

  /**
   * Salva múltiplos registros em batch
   * @param {Array<CourseRegistration>} registrations
   * @returns {Promise<Array<CourseRegistration>>}
   */
  async saveMany(registrations) {
    throw new Error('Method not implemented: saveMany');
  }
}

module.exports = ICourseRegistrationRepository;
