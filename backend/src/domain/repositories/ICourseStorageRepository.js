/**
 * @fileoverview Interface do Repositório de Persistência de Cursos
 * Define o contrato para salvar/atualizar cursos
 */

/**
 * @interface ICourseStorageRepository
 * @description Contrato para persistência de cursos
 */
class ICourseStorageRepository {
  /**
   * Salva lista de cursos (substitui todos)
   * @param {Array} courses - Cursos para salvar
   * @returns {Promise<{savedCount: number, timestamp: Date}>}
   */
  async saveAll(courses) {
    throw new Error("Method not implemented: saveAll");
  }

  /**
   * Atualiza cursos existentes e adiciona novos
   * @param {Array} newCourses - Novos cursos para adicionar
   * @param {Array} updatedCourses - Cursos para atualizar
   * @returns {Promise<{addedCount: number, updatedCount: number}>}
   */
  async merge(newCourses, updatedCourses) {
    throw new Error("Method not implemented: merge");
  }

  /**
   * Cria backup dos dados atuais
   * @param {string} [suffix] - Sufixo opcional para o nome do backup
   * @returns {Promise<string>} - Caminho do arquivo de backup
   */
  async createBackup(suffix) {
    throw new Error("Method not implemented: createBackup");
  }

  /**
   * Restaura dados de um backup
   * @param {string} backupPath - Caminho do backup
   * @returns {Promise<void>}
   */
  async restoreFromBackup(backupPath) {
    throw new Error("Method not implemented: restoreFromBackup");
  }

  /**
   * Lista backups disponíveis
   * @returns {Promise<Array<{path: string, createdAt: Date, size: number}>>}
   */
  async listBackups() {
    throw new Error("Method not implemented: listBackups");
  }
}

module.exports = ICourseStorageRepository;
