/**
 * @fileoverview Repositório de Cursos Scraped
 * Implementação concreta do IScrapedCourseRepository
 *
 * @description Acessa dados do arquivo JSON local de cursos scraped
 */

const fs = require("fs").promises;
const path = require("path");
const ScrapedCourse = require("../../domain/entities/ScrapedCourse");

/**
 * Implementação do repositório de cursos scraped
 * @implements {IScrapedCourseRepository}
 */
class ScrapedCourseRepository {
  /**
   * @param {string} filePath - Caminho para o arquivo JSON de cursos
   */
  constructor(filePath) {
    this.filePath = filePath;
    this.dataCache = null;
    this.lastModified = null;
  }

  /**
   * Factory method para criar instância com caminho padrão
   * @param {string} [customPath] - Caminho customizado opcional
   * @returns {ScrapedCourseRepository}
   */
  static create(customPath) {
    const defaultPath = path.join(
      __dirname,
      "../../../cursos-completo-novo.json",
    );
    return new ScrapedCourseRepository(customPath || defaultPath);
  }

  /**
   * Carrega dados do arquivo com cache inteligente
   * @returns {Promise<Object>}
   */
  async loadData() {
    try {
      // Verificar se arquivo foi modificado
      const stats = await fs.stat(this.filePath);

      if (this.dataCache && this.lastModified === stats.mtime.getTime()) {
        return this.dataCache;
      }

      const content = await fs.readFile(this.filePath, "utf-8");
      this.dataCache = JSON.parse(content);
      this.lastModified = stats.mtime.getTime();

      return this.dataCache;
    } catch (error) {
      if (error.code === "ENOENT") {
        console.warn(
          `[ScrapedCourseRepository] Arquivo não encontrado: ${this.filePath}`,
        );
        return { courses: [], categories: [] };
      }
      throw error;
    }
  }

  /**
   * Busca todos os cursos
   * @returns {Promise<Array<ScrapedCourse>>}
   */
  async findAll() {
    const data = await this.loadData();
    const courses = data.courses || data || [];

    return courses.map(course => ScrapedCourse.fromJSON(course));
  }

  /**
   * Busca curso por ID
   * @param {string} id
   * @returns {Promise<ScrapedCourse|null>}
   */
  async findById(id) {
    const courses = await this.findAll();
    const course = courses.find(c => c.id === id || c.slug === id);
    return course || null;
  }

  /**
   * Busca cursos por categoria
   * @param {string} categoryName
   * @returns {Promise<Array<ScrapedCourse>>}
   */
  async findByCategory(categoryName) {
    const courses = await this.findAll();
    return courses.filter(
      course =>
        this.normalizeString(course.category) ===
        this.normalizeString(categoryName),
    );
  }

  /**
   * Busca cursos por nome (pesquisa parcial)
   * @param {string} name
   * @returns {Promise<Array<ScrapedCourse>>}
   */
  async findByName(name) {
    const courses = await this.findAll();
    const normalizedSearch = this.normalizeString(name);

    return courses.filter(course => {
      const courseTitle = this.normalizeString(course.title);
      return courseTitle.includes(normalizedSearch);
    });
  }

  /**
   * Conta total de cursos
   * @returns {Promise<number>}
   */
  async count() {
    const courses = await this.findAll();
    return courses.length;
  }

  /**
   * Obtém todas as categorias únicas
   * @returns {Promise<Array>}
   */
  async getCategories() {
    const data = await this.loadData();

    // Se há categorias definidas no arquivo
    if (data.categories && Array.isArray(data.categories)) {
      return data.categories;
    }

    // Extrair categorias únicas dos cursos
    const courses = await this.findAll();
    const categorySet = new Set();

    courses.forEach(course => {
      if (course.category) {
        categorySet.add(course.category);
      }
    });

    return Array.from(categorySet).map(name => ({ name }));
  }

  /**
   * Obtém estatísticas gerais
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    const [courses, categories] = await Promise.all([
      this.findAll(),
      this.getCategories(),
    ]);

    // Contagem por categoria
    const countByCategory = {};
    courses.forEach(course => {
      const cat = course.category || "Sem categoria";
      countByCategory[cat] = (countByCategory[cat] || 0) + 1;
    });

    return {
      totalCourses: courses.length,
      totalCategories: categories.length,
      categories: categories.map(cat => ({
        name: cat.name || cat,
        count: countByCategory[cat.name || cat] || 0,
      })),
    };
  }

  /**
   * Normaliza string para comparação
   * @param {string} str
   * @returns {string}
   */
  normalizeString(str) {
    if (!str) return "";
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  /**
   * Invalida cache
   */
  clearCache() {
    this.dataCache = null;
    this.lastModified = null;
  }
}

module.exports = ScrapedCourseRepository;
