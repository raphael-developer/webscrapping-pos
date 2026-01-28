/**
 * @fileoverview Serviço de Domínio - Scraping
 * Contém a lógica de negócio pura para o processo de scraping
 *
 * @description Este serviço é completamente independente de frameworks,
 * bibliotecas de scraping (Puppeteer) ou infraestrutura. Define apenas
 * regras de negócio para coleta e processamento de dados.
 */

/**
 * Resultado do processamento de scraping
 * @typedef {Object} ScrapingResult
 * @property {Array} courses - Cursos extraídos
 * @property {Array} categories - Categorias encontradas
 * @property {Object} statistics - Estatísticas do processo
 * @property {Array} errors - Erros encontrados
 */

/**
 * Configuração de scraping
 * @typedef {Object} ScrapingConfig
 * @property {boolean} forceCategories - Força scraping por categorias
 * @property {number} loadMoreLimit - Limite de cliques em "Ver mais"
 * @property {number} timeout - Timeout em ms
 * @property {number} concurrency - Concorrência máxima
 */

class ScrapingService {
  /**
   * Processa e valida dados extraídos de uma página
   *
   * @param {Object} rawData - Dados brutos extraídos
   * @returns {Object|null} - Dados processados ou null se inválido
   */
  static processCourseData(rawData) {
    if (!rawData || typeof rawData !== "object") {
      return null;
    }

    const title = ScrapingService.sanitizeText(rawData.title || rawData.name);
    if (!title || title.length < 3) {
      return null;
    }

    return {
      title: title,
      category: ScrapingService.sanitizeText(rawData.category) || "Geral",
      description: ScrapingService.sanitizeText(rawData.description) || "",
      duration: ScrapingService.extractDuration(rawData.duration),
      modality: ScrapingService.normalizeModality(rawData.modality),
      price: ScrapingService.extractPrice(rawData.price),
      url: ScrapingService.validateUrl(rawData.url),
      imageUrl: ScrapingService.validateUrl(rawData.imageUrl),
    };
  }

  /**
   * Sanitiza texto removendo caracteres indesejados
   * @param {string} text
   * @returns {string}
   */
  static sanitizeText(text) {
    if (!text || typeof text !== "string") return "";
    return text
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Extrai duração em formato padronizado
   * @param {string} duration
   * @returns {string}
   */
  static extractDuration(duration) {
    if (!duration) return "";
    const match = duration.match(/(\d+)\s*(horas?|h)/i);
    return match ? `${match[1]} horas` : duration;
  }

  /**
   * Normaliza modalidade do curso
   * @param {string} modality
   * @returns {string}
   */
  static normalizeModality(modality) {
    if (!modality) return "EAD";
    const normalized = modality.toUpperCase().trim();
    const modalityMap = {
      EAD: "EAD",
      ONLINE: "EAD",
      "À DISTÂNCIA": "EAD",
      PRESENCIAL: "Presencial",
      HÍBRIDO: "Híbrido",
      SEMIPRESENCIAL: "Híbrido",
    };
    return modalityMap[normalized] || "EAD";
  }

  /**
   * Extrai preço em formato numérico
   * @param {string} price
   * @returns {string}
   */
  static extractPrice(price) {
    if (!price) return "";
    // Remove caracteres não numéricos exceto vírgula e ponto
    const cleaned = price.replace(/[^\d.,]/g, "");
    return cleaned || "";
  }

  /**
   * Valida e normaliza URL
   * @param {string} url
   * @returns {string}
   */
  static validateUrl(url) {
    if (!url) return "";
    try {
      const parsed = new URL(url);
      return parsed.href;
    } catch {
      return "";
    }
  }

  /**
   * Detecta cursos novos comparando com existentes
   *
   * @param {Array} newCourses - Cursos recém-extraídos
   * @param {Array} existingCourses - Cursos já existentes
   * @returns {Object} - { newCourses, updatedCourses, unchangedCourses }
   */
  static detectChanges(newCourses, existingCourses) {
    const existingMap = new Map();
    for (const course of existingCourses) {
      const key = ScrapingService.generateCourseKey(course);
      if (key) existingMap.set(key, course);
    }

    const result = {
      newCourses: [],
      updatedCourses: [],
      unchangedCourses: [],
      removedCourses: [],
    };

    const processedKeys = new Set();

    for (const course of newCourses) {
      const key = ScrapingService.generateCourseKey(course);
      if (!key) continue;

      processedKeys.add(key);
      const existing = existingMap.get(key);

      if (!existing) {
        result.newCourses.push(course);
      } else if (ScrapingService.hasChanges(course, existing)) {
        result.updatedCourses.push({
          ...course,
          id: existing.id,
          previousData: existing,
        });
      } else {
        result.unchangedCourses.push(existing);
      }
    }

    // Detectar cursos removidos
    for (const [key, course] of existingMap) {
      if (!processedKeys.has(key)) {
        result.removedCourses.push(course);
      }
    }

    return result;
  }

  /**
   * Gera chave única para um curso baseado em título e categoria
   * @param {Object} course
   * @returns {string|null}
   */
  static generateCourseKey(course) {
    const title = (course.title || course.name || "").toLowerCase().trim();
    const category = (course.category || "").toLowerCase().trim();
    if (!title) return null;
    return `${title}|${category}`;
  }

  /**
   * Verifica se houve mudanças entre duas versões de um curso
   * @param {Object} newCourse
   * @param {Object} oldCourse
   * @returns {boolean}
   */
  static hasChanges(newCourse, oldCourse) {
    const fieldsToCompare = [
      "description",
      "duration",
      "price",
      "url",
      "imageUrl",
    ];
    return fieldsToCompare.some(
      field => newCourse[field] !== oldCourse[field] && newCourse[field],
    );
  }

  /**
   * Calcula estatísticas do processo de scraping
   *
   * @param {Object} changes - Resultado do detectChanges
   * @param {number} startTime - Timestamp de início
   * @returns {Object} - Estatísticas completas
   */
  static calculateStatistics(changes, startTime) {
    const endTime = Date.now();
    const durationMs = endTime - startTime;

    return {
      totalProcessed:
        changes.newCourses.length +
        changes.updatedCourses.length +
        changes.unchangedCourses.length,
      newCoursesCount: changes.newCourses.length,
      updatedCoursesCount: changes.updatedCourses.length,
      unchangedCoursesCount: changes.unchangedCourses.length,
      removedCoursesCount: changes.removedCourses.length,
      processingTimeMs: durationMs,
      processingTimeFormatted: ScrapingService.formatDuration(durationMs),
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Formata duração em milissegundos para formato legível
   * @param {number} ms
   * @returns {string}
   */
  static formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

module.exports = ScrapingService;
