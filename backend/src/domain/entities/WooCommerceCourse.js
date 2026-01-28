/**
 * @fileoverview Entidade de Domínio - Curso do WooCommerce
 * Representa um curso como produto no WooCommerce
 *
 * @description Esta entidade é agnóstica a frameworks e representa
 * a estrutura de dados de um curso no contexto do domínio da aplicação.
 */

class WooCommerceCourse {
  /**
   * @param {Object} props - Propriedades do curso
   * @param {number} props.id - ID único no WooCommerce
   * @param {string} props.name - Nome do curso
   * @param {string} props.slug - Slug único do curso
   * @param {string} props.permalink - URL completa do curso
   * @param {string} props.status - Status de publicação
   * @param {string} props.price - Preço do curso
   * @param {string} props.description - Descrição completa
   * @param {string} props.shortDescription - Descrição resumida (grade curricular)
   * @param {Array} props.categories - Categorias do curso
   * @param {Array} props.images - Imagens do curso
   * @param {string} props.duration - Carga horária extraída
   * @param {Date} props.dateCreated - Data de criação
   * @param {Date} props.dateModified - Data de modificação
   */
  constructor(props) {
    this.id = props.id;
    this.name = props.name;
    this.slug = props.slug;
    this.permalink = props.permalink;
    this.status = props.status;
    this.price = props.price;
    this.description = props.description;
    this.shortDescription = props.shortDescription;
    this.categories = props.categories || [];
    this.images = props.images || [];
    this.duration = props.duration;
    this.dateCreated = props.dateCreated;
    this.dateModified = props.dateModified;

    Object.freeze(this);
  }

  /**
   * Cria uma instância a partir dos dados brutos da API WooCommerce
   * @param {Object} rawData - Dados brutos da API
   * @returns {WooCommerceCourse}
   */
  static fromWooCommerceAPI(rawData) {
    // Extrair carga horária da descrição curta (se disponível)
    const duration = WooCommerceCourse.extractDuration(
      rawData.short_description || "",
    );

    // Extrair categoria principal (excluindo "Todos os cursos" e "Premium")
    const mainCategory = WooCommerceCourse.extractMainCategory(
      rawData.categories || [],
    );

    return new WooCommerceCourse({
      id: rawData.id,
      name: rawData.name,
      slug: rawData.slug,
      permalink: rawData.permalink,
      status: rawData.status,
      price: rawData.price,
      description: rawData.description,
      shortDescription: rawData.short_description,
      categories: rawData.categories || [],
      images: (rawData.images || []).map(img => ({
        id: img.id,
        src: img.src,
        thumbnail: img.thumbnail,
        alt: img.alt,
      })),
      duration,
      mainCategory,
      dateCreated: rawData.date_created ? new Date(rawData.date_created) : null,
      dateModified: rawData.date_modified
        ? new Date(rawData.date_modified)
        : null,
    });
  }

  /**
   * Extrai a carga horária da descrição
   * @param {string} description
   * @returns {string|null}
   */
  static extractDuration(description) {
    // Procura por padrões como "720h", "720 horas", "TOTAL 720h"
    const patterns = [/TOTAL.*?(\d+)\s*h/i, /(\d+)\s*horas?/i, /(\d+)h/i];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        return `${match[1]} horas`;
      }
    }
    return null;
  }

  /**
   * Extrai a categoria principal do curso
   * @param {Array} categories
   * @returns {string|null}
   */
  static extractMainCategory(categories) {
    // Categorias a ignorar para determinar a categoria principal
    const ignoredSlugs = [
      "todos",
      "todos-os-cursos",
      "premium",
      "pos-graduacao",
    ];

    const mainCat = categories.find(
      cat => !ignoredSlugs.includes(cat.slug.toLowerCase()),
    );

    return mainCat ? mainCat.name : null;
  }

  /**
   * Normaliza o nome do curso para comparação
   * @returns {string}
   */
  getNormalizedName() {
    return this.name
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Converte para objeto JSON simples
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      permalink: this.permalink,
      status: this.status,
      price: this.price,
      categories: this.categories,
      images: this.images,
      duration: this.duration,
      mainCategory: this.mainCategory,
      dateCreated: this.dateCreated,
      dateModified: this.dateModified,
    };
  }
}

module.exports = WooCommerceCourse;
