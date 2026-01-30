/**
 * @fileoverview Repositório WooCommerce
 * Implementação concreta do IWooCommerceRepository
 *
 * @description Encapsula acesso aos dados do WooCommerce,
 * convertendo dados brutos da API em entidades de domínio
 */

const { WooCommerceClient } = require("./WooCommerceClient");
const WooCommerceCourse = require("../../domain/entities/WooCommerceCourse");

/**
 * Implementação do repositório WooCommerce
 * @implements {IWooCommerceRepository}
 */
class WooCommerceRepository {
  /**
   * @param {WooCommerceClient} client - Cliente HTTP configurado
   */
  constructor(client) {
    if (!client) {
      throw new Error("WooCommerceRepository: Client é obrigatório");
    }
    this.client = client;
    this.categoriesCache = null;
  }

  /**
   * Factory method para criar instância configurada
   * @param {Object} config
   * @returns {WooCommerceRepository}
   */
  static create(config) {
    const client = new WooCommerceClient(config);
    return new WooCommerceRepository(client);
  }

  /**
   * Busca todos os cursos (produtos) do WooCommerce
   * @returns {Promise<Array<WooCommerceCourse>>}
   */
  async findAllCourses() {
    try {
      // Buscar categorias primeiro para enriquecer dados
      const categories = await this.findAllCategories();
      const categoryMap = new Map(categories.map(c => [c.id, c]));

      // Buscar todos os produtos
      const products = await this.client.getAllProducts({
        status: "publish",
      });

      // Converter para entidades de domínio
      return products.map(product => {
        // Enriquecer categorias com dados completos
        const enrichedProduct = {
          ...product,
          categories: product.categories.map(cat => ({
            ...cat,
            ...categoryMap.get(cat.id),
          })),
        };
        return WooCommerceCourse.fromWooCommerceAPI(enrichedProduct);
      });
    } catch (error) {
      console.error(
        "[WooCommerceRepository] Erro ao buscar cursos:",
        error.message,
      );
      throw error;
    }
  }

  /**
   * Busca curso por ID
   * @param {number} id
   * @returns {Promise<WooCommerceCourse|null>}
   */
  async findById(id) {
    try {
      const product = await this.client.getProduct(id);
      return WooCommerceCourse.fromWooCommerceAPI(product);
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Busca cursos por categoria
   * @param {string} categoryName - Nome da categoria
   * @returns {Promise<Array<WooCommerceCourse>>}
   */
  async findByCategory(categoryName) {
    try {
      // Encontrar ID da categoria pelo nome
      const categories = await this.findAllCategories();
      const category = categories.find(
        c =>
          this.normalizeString(c.name) === this.normalizeString(categoryName),
      );

      if (!category) {
        console.warn(
          `[WooCommerceRepository] Categoria não encontrada: ${categoryName}`,
        );
        return [];
      }

      const products = await this.client.getProductsByCategory(category.id);
      return products.map(p => WooCommerceCourse.fromWooCommerceAPI(p));
    } catch (error) {
      console.error(
        "[WooCommerceRepository] Erro ao buscar por categoria:",
        error.message,
      );
      throw error;
    }
  }

  /**
   * Busca cursos por nome (pesquisa)
   * @param {string} name
   * @returns {Promise<Array<WooCommerceCourse>>}
   */
  async findByName(name) {
    try {
      const response = await this.client.request("GET", "products", {
        search: name,
        status: "publish",
      });
      return response.data.map(p => WooCommerceCourse.fromWooCommerceAPI(p));
    } catch (error) {
      console.error(
        "[WooCommerceRepository] Erro ao buscar por nome:",
        error.message,
      );
      throw error;
    }
  }

  /**
   * Conta total de cursos
   * @returns {Promise<number>}
   */
  async count() {
    try {
      const response = await this.client.request("GET", "products", {
        per_page: 1,
        status: "publish",
      });
      return parseInt(response.headers["x-wp-total"] || "0");
    } catch (error) {
      console.error(
        "[WooCommerceRepository] Erro ao contar cursos:",
        error.message,
      );
      throw error;
    }
  }

  /**
   * Busca todas as categorias
   * @returns {Promise<Array>}
   */
  async findAllCategories() {
    // Usar cache para categorias
    if (this.categoriesCache) {
      return this.categoriesCache;
    }

    try {
      const categories = await this.client.getProductCategories();
      this.categoriesCache = categories;
      return categories;
    } catch (error) {
      console.error(
        "[WooCommerceRepository] Erro ao buscar categorias:",
        error.message,
      );
      throw error;
    }
  }

  /**
   * Busca estatísticas gerais
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    try {
      const [totalCourses, categories] = await Promise.all([
        this.count(),
        this.findAllCategories(),
      ]);

      return {
        totalCourses,
        totalCategories: categories.length,
        categories: categories.map(c => ({
          id: c.id,
          name: c.name,
          count: c.count,
        })),
      };
    } catch (error) {
      console.error(
        "[WooCommerceRepository] Erro ao buscar estatísticas:",
        error.message,
      );
      throw error;
    }
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
   * Limpa caches
   */
  clearCache() {
    this.categoriesCache = null;
    this.client.clearCache();
  }

  /**
   * Cria um novo produto (curso) no WooCommerce
   * @param {Object} productData - Dados do produto
   * @returns {Promise<WooCommerceCourse>}
   */
  async createProduct(productData) {
    try {
      const response = await this.client.request('POST', 'products', {}, productData);
      return WooCommerceCourse.fromWooCommerceAPI(response.data);
    } catch (error) {
      console.error('[WooCommerceRepository] Erro ao criar produto:', error.message);
      throw error;
    }
  }

  /**
   * Atualiza um produto existente no WooCommerce
   * @param {number} id - ID do produto
   * @param {Object} productData - Dados atualizados
   * @returns {Promise<WooCommerceCourse>}
   */
  async updateProduct(id, productData) {
    try {
      const response = await this.client.request('PUT', `products/${id}`, {}, productData);
      return WooCommerceCourse.fromWooCommerceAPI(response.data);
    } catch (error) {
      console.error('[WooCommerceRepository] Erro ao atualizar produto:', error.message);
      throw error;
    }
  }

  /**
   * Remove um produto do WooCommerce
   * @param {number} id - ID do produto
   * @param {boolean} force - Se deve deletar permanentemente
   * @returns {Promise<boolean>}
   */
  async deleteProduct(id, force = false) {
    try {
      await this.client.request('DELETE', `products/${id}`, { force });
      return true;
    } catch (error) {
      console.error('[WooCommerceRepository] Erro ao deletar produto:', error.message);
      throw error;
    }
  }
}

module.exports = WooCommerceRepository;
