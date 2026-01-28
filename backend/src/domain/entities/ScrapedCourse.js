/**
 * @fileoverview Entidade de Domínio - Curso Scraped (do site)
 * Representa um curso coletado via web scraping
 */

class ScrapedCourse {
  /**
   * @param {Object} props - Propriedades do curso
   * @param {number} props.id - ID interno
   * @param {string} props.title - Título do curso
   * @param {string} props.category - Categoria do curso
   * @param {string} props.description - Descrição
   * @param {string} props.duration - Carga horária
   * @param {string} props.modality - Modalidade (EAD, etc)
   * @param {string} props.price - Preço
   * @param {string} props.url - URL do curso
   * @param {string} props.imageUrl - URL da imagem
   * @param {Date} props.createdAt - Data de criação
   * @param {Date} props.updatedAt - Data de atualização
   */
  constructor(props) {
    this.id = props.id;
    this.title = props.title || props.name;
    this.category = props.category;
    this.description = props.description;
    this.duration = props.duration;
    this.modality = props.modality;
    this.price = props.price;
    this.url = props.url;
    this.imageUrl = props.imageUrl;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;

    Object.freeze(this);
  }

  /**
   * Cria instância a partir de dados do JSON de cursos
   * @param {Object} rawData
   * @returns {ScrapedCourse}
   */
  static fromJSON(rawData) {
    return new ScrapedCourse({
      id: rawData.id,
      title: rawData.title || rawData.name,
      category: rawData.category,
      description: rawData.description,
      duration: rawData.duration,
      modality: rawData.modality,
      price: rawData.price,
      url: rawData.url,
      imageUrl: rawData.imageUrl,
      createdAt: rawData.createdAt ? new Date(rawData.createdAt) : null,
      updatedAt: rawData.updatedAt ? new Date(rawData.updatedAt) : null,
    });
  }

  /**
   * Normaliza o título do curso para comparação
   * @returns {string}
   */
  getNormalizedTitle() {
    return (this.title || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Converte para objeto JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      category: this.category,
      description: this.description,
      duration: this.duration,
      modality: this.modality,
      price: this.price,
      url: this.url,
      imageUrl: this.imageUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = ScrapedCourse;
