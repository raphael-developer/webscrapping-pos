/**
 * @fileoverview Serviço de Domínio - Validação de Cadastro de Cursos
 * Contém regras de negócio puras para validação de cadastro
 *
 * @description Este serviço é completamente independente de frameworks,
 * APIs externas ou infraestrutura. Trabalha apenas com entidades de domínio.
 */

const { CourseRegistration, RegistrationStatus } = require('../entities/CourseRegistration');

/**
 * Serviço de validação e preparação de cadastro de cursos
 */
class CourseRegistrationService {
  
  /**
   * Prepara cursos ausentes para cadastro
   * Converte lista de cursos scraped ausentes em registros de cadastro
   * 
   * @param {Array<Object>} missingCourses - Cursos ausentes no WooCommerce
   * @returns {Array<CourseRegistration>}
   */
  static prepareMissingCoursesForRegistration(missingCourses) {
    return missingCourses.map(course => CourseRegistration.fromScrapedCourse(course));
  }

  /**
   * Valida um lote de registros de cadastro
   * @param {Array<CourseRegistration>} registrations
   * @returns {Object} - { valid: [], invalid: [], summary: {} }
   */
  static validateBatch(registrations) {
    const valid = [];
    const invalid = [];

    for (const registration of registrations) {
      const validation = registration.validateForRegistration();
      
      if (validation.isValid) {
        valid.push(registration);
      } else {
        invalid.push({
          registration,
          errors: validation.errors
        });
      }
    }

    return {
      valid,
      invalid,
      summary: {
        total: registrations.length,
        validCount: valid.length,
        invalidCount: invalid.length,
        validPercentage: registrations.length > 0 
          ? ((valid.length / registrations.length) * 100).toFixed(1)
          : 0
      }
    };
  }

  /**
   * Verifica se um registro pode ser cadastrado
   * @param {CourseRegistration} registration
   * @returns {Object} - { canRegister: boolean, reason: string }
   */
  static canRegister(registration) {
    // Verificar status do registro
    if (registration.isRegistered()) {
      return { 
        canRegister: false, 
        reason: 'Curso já foi cadastrado no WooCommerce' 
      };
    }

    if (!registration.isApproved()) {
      return { 
        canRegister: false, 
        reason: 'Cadastro não foi autorizado pelo usuário' 
      };
    }

    // Validar dados obrigatórios
    const validation = registration.validateForRegistration();
    if (!validation.isValid) {
      return { 
        canRegister: false, 
        reason: `Dados inválidos: ${validation.errors.join(', ')}` 
      };
    }

    return { canRegister: true, reason: null };
  }

  /**
   * Normaliza nome de categoria para comparação
   * @param {string} categoryName
   * @returns {string}
   */
  static normalizeCategory(categoryName) {
    if (!categoryName) return '';
    return categoryName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /**
   * Agrupa registros por categoria
   * @param {Array<CourseRegistration>} registrations
   * @returns {Object} - Objeto com categorias como chaves
   */
  static groupByCategory(registrations) {
    return registrations.reduce((groups, registration) => {
      const category = registration.category || 'Sem Categoria';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(registration);
      return groups;
    }, {});
  }

  /**
   * Agrupa registros por status
   * @param {Array<CourseRegistration>} registrations
   * @returns {Object}
   */
  static groupByStatus(registrations) {
    return registrations.reduce((groups, registration) => {
      const status = registration.registrationStatus;
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(registration);
      return groups;
    }, {});
  }

  /**
   * Calcula estatísticas de um lote de registros
   * @param {Array<CourseRegistration>} registrations
   * @returns {Object}
   */
  static calculateStatistics(registrations) {
    const byStatus = this.groupByStatus(registrations);
    const byCategory = this.groupByCategory(registrations);

    return {
      total: registrations.length,
      byStatus: {
        pendingReview: (byStatus[RegistrationStatus.PENDING_REVIEW] || []).length,
        approved: (byStatus[RegistrationStatus.APPROVED] || []).length,
        rejected: (byStatus[RegistrationStatus.REJECTED] || []).length,
        registered: (byStatus[RegistrationStatus.REGISTERED] || []).length,
        failed: (byStatus[RegistrationStatus.FAILED] || []).length
      },
      byCategory: Object.entries(byCategory).map(([name, courses]) => ({
        name,
        count: courses.length
      })).sort((a, b) => b.count - a.count),
      categories: Object.keys(byCategory).length
    };
  }

  /**
   * Filtra registros por critérios
   * @param {Array<CourseRegistration>} registrations
   * @param {Object} criteria
   * @returns {Array<CourseRegistration>}
   */
  static filter(registrations, criteria = {}) {
    return registrations.filter(reg => {
      // Filtrar por status
      if (criteria.status && reg.registrationStatus !== criteria.status) {
        return false;
      }

      // Filtrar por categoria
      if (criteria.category) {
        const normalizedCategory = this.normalizeCategory(criteria.category);
        const regCategory = this.normalizeCategory(reg.category);
        if (regCategory !== normalizedCategory) {
          return false;
        }
      }

      // Filtrar por busca (nome ou descrição)
      if (criteria.search) {
        const searchLower = criteria.search.toLowerCase();
        const nameMatch = reg.name.toLowerCase().includes(searchLower);
        const descMatch = reg.description.toLowerCase().includes(searchLower);
        if (!nameMatch && !descMatch) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Ordena registros
   * @param {Array<CourseRegistration>} registrations
   * @param {string} sortBy - Campo para ordenação
   * @param {string} order - 'asc' ou 'desc'
   * @returns {Array<CourseRegistration>}
   */
  static sort(registrations, sortBy = 'name', order = 'asc') {
    return [...registrations].sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];

      // Tratamento especial para strings
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      // Tratamento para datas
      if (valueA instanceof Date) {
        valueA = valueA.getTime();
        valueB = valueB.getTime();
      }

      if (order === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });
  }

  /**
   * Verifica duplicatas potenciais
   * @param {CourseRegistration} registration
   * @param {Array<Object>} existingCourses - Cursos já no WooCommerce
   * @returns {Object} - { hasDuplicate: boolean, matches: [] }
   */
  static checkForDuplicates(registration, existingCourses) {
    const normalizedName = registration.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();

    const matches = existingCourses.filter(course => {
      const existingName = (course.name || course.title || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim();

      // Verificar correspondência exata ou parcial (similaridade > 80%)
      return existingName === normalizedName || 
             this.calculateSimilarity(normalizedName, existingName) > 0.8;
    });

    return {
      hasDuplicate: matches.length > 0,
      matches: matches.map(m => ({
        id: m.id,
        name: m.name || m.title,
        similarity: this.calculateSimilarity(normalizedName, 
          (m.name || m.title || '').toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
        )
      }))
    };
  }

  /**
   * Calcula similaridade entre duas strings (Levenshtein normalizado)
   * @param {string} str1
   * @param {string} str2
   * @returns {number} - Valor entre 0 e 1
   */
  static calculateSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLen);
  }

  /**
   * Calcula distância de Levenshtein
   * @param {string} str1
   * @param {string} str2
   * @returns {number}
   */
  static levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1
          );
        }
      }
    }

    return dp[m][n];
  }
}

module.exports = CourseRegistrationService;
