/**
 * @fileoverview Repositório de Registro de Cursos
 * Implementação concreta do ICourseRegistrationRepository
 *
 * @description Persiste registros de cadastro em arquivo JSON local.
 * Pode ser facilmente substituído por implementação com banco de dados.
 */

const fs = require("fs").promises;
const path = require("path");
const {
  CourseRegistration,
  RegistrationStatus,
} = require("../../domain/entities/CourseRegistration");

/**
 * Implementação do repositório de registros de cadastro
 * @implements {ICourseRegistrationRepository}
 */
class CourseRegistrationRepository {
  /**
   * @param {string} storagePath - Caminho para arquivo de armazenamento
   */
  constructor(storagePath) {
    this.storagePath =
      storagePath ||
      path.join(process.cwd(), "data", "course-registrations.json");
    this.registrations = new Map();
    this.initialized = false;
  }

  /**
   * Factory method para criar instância configurada
   * @param {Object} config
   * @returns {CourseRegistrationRepository}
   */
  static create(config = {}) {
    return new CourseRegistrationRepository(config.storagePath);
  }

  /**
   * Inicializa o repositório carregando dados do arquivo
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Garantir que diretório existe
      const dir = path.dirname(this.storagePath);
      await fs.mkdir(dir, { recursive: true });

      // Tentar carregar dados existentes
      const data = await fs.readFile(this.storagePath, "utf-8");
      const parsed = JSON.parse(data);

      // Reconstruir Map com entidades
      for (const item of parsed) {
        const registration = new CourseRegistration({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
          authorizedAt: item.authorizedAt ? new Date(item.authorizedAt) : null,
        });
        this.registrations.set(registration.id, registration);
      }

      console.log(
        `[CourseRegistrationRepository] Carregados ${this.registrations.size} registros`,
      );
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error(
          "[CourseRegistrationRepository] Erro ao carregar:",
          error.message,
        );
      }
      // Arquivo não existe - iniciar vazio
      this.registrations = new Map();
    }

    this.initialized = true;
  }

  /**
   * Persiste dados no arquivo
   */
  async persist() {
    try {
      const data = Array.from(this.registrations.values()).map(r =>
        r.toObject(),
      );
      await fs.writeFile(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(
        "[CourseRegistrationRepository] Erro ao persistir:",
        error.message,
      );
      throw error;
    }
  }

  /**
   * Salva um novo registro de cadastro
   * @param {CourseRegistration} registration
   * @returns {Promise<CourseRegistration>}
   */
  async save(registration) {
    await this.initialize();

    // Verificar se já existe registro para este curso scraped
    for (const existing of this.registrations.values()) {
      if (existing.scrapedCourseId === registration.scrapedCourseId) {
        throw new Error(
          `Já existe registro para curso scraped: ${registration.scrapedCourseId}`,
        );
      }
    }

    this.registrations.set(registration.id, registration);
    await this.persist();

    return registration;
  }

  /**
   * Atualiza um registro existente
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<CourseRegistration>}
   */
  async update(id, updates) {
    await this.initialize();

    const existing = this.registrations.get(id);
    if (!existing) {
      throw new Error(`Registro não encontrado: ${id}`);
    }

    // Mesclar dados existentes com atualizações
    const existingData = existing.toObject ? existing.toObject() : existing;

    const updated = new CourseRegistration({
      ...existingData,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    this.registrations.set(id, updated);
    await this.persist();

    return updated;
  }

  /**
   * Busca registro por ID
   * @param {string} id
   * @returns {Promise<CourseRegistration|null>}
   */
  async findById(id) {
    await this.initialize();
    return this.registrations.get(id) || null;
  }

  /**
   * Busca todos os registros
   * @param {Object} options - Opções de filtro e paginação
   * @returns {Promise<Array<CourseRegistration>>}
   */
  async findAll(options = {}) {
    await this.initialize();

    let results = Array.from(this.registrations.values());

    // Aplicar filtros
    if (options.status) {
      results = results.filter(r => r.registrationStatus === options.status);
    }

    if (options.category) {
      results = results.filter(
        r => r.category?.toLowerCase() === options.category.toLowerCase(),
      );
    }

    // Ordenação
    const sortBy = options.sortBy || "createdAt";
    const order = options.order || "desc";
    results.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return order === "desc" ? -comparison : comparison;
    });

    // Paginação
    if (options.page && options.limit) {
      const start = (options.page - 1) * options.limit;
      results = results.slice(start, start + options.limit);
    }

    return results;
  }

  /**
   * Busca registros por status
   * @param {string} status
   * @returns {Promise<Array<CourseRegistration>>}
   */
  async findByStatus(status) {
    await this.initialize();
    return Array.from(this.registrations.values()).filter(
      r => r.registrationStatus === status,
    );
  }

  /**
   * Busca registros pendentes de revisão
   * @returns {Promise<Array<CourseRegistration>>}
   */
  async findPendingReview() {
    return this.findByStatus(RegistrationStatus.PENDING_REVIEW);
  }

  /**
   * Busca registros aprovados (prontos para cadastro)
   * @returns {Promise<Array<CourseRegistration>>}
   */
  async findApproved() {
    return this.findByStatus(RegistrationStatus.APPROVED);
  }

  /**
   * Busca registro por ID do curso scraped
   * @param {string} scrapedCourseId
   * @returns {Promise<CourseRegistration|null>}
   */
  async findByScrapedCourseId(scrapedCourseId) {
    await this.initialize();
    for (const registration of this.registrations.values()) {
      if (registration.scrapedCourseId === scrapedCourseId) {
        return registration;
      }
    }
    return null;
  }

  /**
   * Remove um registro
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    await this.initialize();

    if (!this.registrations.has(id)) {
      return false;
    }

    this.registrations.delete(id);
    await this.persist();
    return true;
  }

  /**
   * Remove múltiplos registros
   * @param {Array<string>} ids
   * @returns {Promise<number>} - Quantidade removida
   */
  async deleteMany(ids) {
    await this.initialize();

    let count = 0;
    for (const id of ids) {
      if (this.registrations.has(id)) {
        this.registrations.delete(id);
        count++;
      }
    }

    if (count > 0) {
      await this.persist();
    }

    return count;
  }

  /**
   * Conta registros por status
   * @returns {Promise<Object>}
   */
  async countByStatus() {
    await this.initialize();

    const counts = {
      [RegistrationStatus.PENDING_REVIEW]: 0,
      [RegistrationStatus.APPROVED]: 0,
      [RegistrationStatus.REJECTED]: 0,
      [RegistrationStatus.REGISTERED]: 0,
      [RegistrationStatus.FAILED]: 0,
    };

    for (const registration of this.registrations.values()) {
      counts[registration.registrationStatus]++;
    }

    return counts;
  }

  /**
   * Salva múltiplos registros em batch
   * @param {Array<CourseRegistration>} registrations
   * @returns {Promise<Array<CourseRegistration>>}
   */
  async saveMany(registrations) {
    await this.initialize();

    const saved = [];
    const existingScrapedIds = new Set();

    // Coletar IDs de cursos scraped existentes
    for (const reg of this.registrations.values()) {
      existingScrapedIds.add(reg.scrapedCourseId);
    }

    for (const registration of registrations) {
      // Pular se já existe
      if (existingScrapedIds.has(registration.scrapedCourseId)) {
        continue;
      }

      this.registrations.set(registration.id, registration);
      existingScrapedIds.add(registration.scrapedCourseId);
      saved.push(registration);
    }

    if (saved.length > 0) {
      await this.persist();
    }

    return saved;
  }

  /**
   * Busca estatísticas gerais
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    await this.initialize();

    const counts = await this.countByStatus();
    const total = this.registrations.size;

    // Agrupar por categoria
    const byCategory = {};
    for (const reg of this.registrations.values()) {
      const cat = reg.category || "Sem Categoria";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    return {
      total,
      byStatus: counts,
      byCategory: Object.entries(byCategory)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Limpa todos os registros (usar com cuidado!)
   * @returns {Promise<void>}
   */
  async clear() {
    await this.initialize();
    this.registrations.clear();
    await this.persist();
  }

  /**
   * Exporta registros para backup
   * @returns {Promise<Object>}
   */
  async exportBackup() {
    await this.initialize();
    return {
      exportedAt: new Date().toISOString(),
      count: this.registrations.size,
      data: Array.from(this.registrations.values()).map(r => r.toObject()),
    };
  }

  /**
   * Importa registros de backup
   * @param {Object} backup - Dados do backup
   * @param {boolean} overwrite - Se deve sobrescrever existentes
   * @returns {Promise<Object>}
   */
  async importBackup(backup, overwrite = false) {
    await this.initialize();

    let imported = 0;
    let skipped = 0;

    for (const item of backup.data) {
      if (this.registrations.has(item.id) && !overwrite) {
        skipped++;
        continue;
      }

      const registration = new CourseRegistration({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        authorizedAt: item.authorizedAt ? new Date(item.authorizedAt) : null,
      });

      this.registrations.set(registration.id, registration);
      imported++;
    }

    await this.persist();

    return { imported, skipped };
  }
}

module.exports = CourseRegistrationRepository;
