/**
 * @fileoverview Entidade de Domínio - Registro de Curso para Cadastro
 * Representa os dados de um curso preparado para cadastro no WooCommerce
 *
 * @description Esta entidade encapsula todas as informações necessárias
 * para cadastrar um curso no WooCommerce, permitindo edição e validação
 * antes da autorização final do usuário.
 */

/**
 * Status possíveis do registro de curso
 */
const RegistrationStatus = {
  PENDING_REVIEW: "pending_review", // Aguardando revisão do usuário
  APPROVED: "approved", // Aprovado pelo usuário
  REJECTED: "rejected", // Rejeitado pelo usuário
  REGISTERED: "registered", // Cadastrado com sucesso
  FAILED: "failed", // Falha no cadastro
};

/**
 * Entidade CourseRegistration
 * Representa um curso pendente de cadastro no WooCommerce
 */
class CourseRegistration {
  /**
   * @param {Object} props - Propriedades do registro
   * @param {string} props.id - ID único do registro
   * @param {string} props.scrapedCourseId - ID do curso scraped original
   * @param {string} props.name - Nome do curso
   * @param {string} props.slug - Slug para URL
   * @param {string} props.category - Categoria do curso
   * @param {string} props.description - Descrição completa
   * @param {string} props.shortDescription - Descrição curta
   * @param {string} props.duration - Carga horária
   * @param {string} props.price - Preço
   * @param {string} props.regularPrice - Preço regular
   * @param {string} props.salePrice - Preço promocional
   * @param {string} props.imageUrl - URL da imagem principal
   * @param {Array<string>} props.galleryImages - URLs das imagens da galeria
   * @param {string} props.status - Status de publicação (draft, publish)
   * @param {string} props.registrationStatus - Status do registro
   * @param {Object} props.metadata - Metadados adicionais
   * @param {Object} props.customFields - Campos customizados
   * @param {string} props.sourceUrl - URL de origem (scraping)
   * @param {Date} props.createdAt - Data de criação do registro
   * @param {Date} props.updatedAt - Data de atualização
   * @param {string} props.authorizedBy - Usuário que autorizou
   * @param {Date} props.authorizedAt - Data da autorização
   * @param {number} props.wooCommerceId - ID no WooCommerce após cadastro
   */
  constructor(props) {
    // Validação básica
    if (!props.name || props.name.trim() === "") {
      throw new Error("Nome do curso é obrigatório");
    }

    this.id = props.id || this.generateId();
    this.scrapedCourseId = props.scrapedCourseId;
    this.name = props.name.trim();
    this.slug = props.slug || this.generateSlug(props.name);
    this.category = props.category;
    this.description = props.description || "";
    this.shortDescription = props.shortDescription || "";
    this.duration = props.duration;
    this.price = props.price || "0";
    this.regularPrice = props.regularPrice || props.price || "0";
    this.salePrice = props.salePrice || "";
    this.imageUrl = props.imageUrl || "";
    this.galleryImages = props.galleryImages || [];
    this.status = props.status || "draft";
    this.registrationStatus =
      props.registrationStatus || RegistrationStatus.PENDING_REVIEW;
    this.metadata = props.metadata || {};
    this.customFields = props.customFields || {};
    this.sourceUrl = props.sourceUrl || "";
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
    this.authorizedBy = props.authorizedBy || null;
    this.authorizedAt = props.authorizedAt || null;
    this.wooCommerceId = props.wooCommerceId || null;
  }

  /**
   * Gera ID único para o registro
   * @returns {string}
   */
  generateId() {
    return `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gera slug a partir do nome
   * @param {string} name
   * @returns {string}
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  /**
   * Cria instância a partir de dados de curso scraped
   * @param {Object} scrapedCourse - Dados do curso scraped
   * @returns {CourseRegistration}
   */
  static fromScrapedCourse(scrapedCourse) {
    return new CourseRegistration({
      scrapedCourseId: scrapedCourse.id,
      name: scrapedCourse.title || scrapedCourse.name,
      slug: scrapedCourse.slug,
      category: scrapedCourse.category,
      description: scrapedCourse.description || "",
      shortDescription:
        scrapedCourse.shortDescription || scrapedCourse.duration || "",
      duration: scrapedCourse.duration,
      price: "0", // Preço default - usuário define
      imageUrl: scrapedCourse.image || scrapedCourse.imageUrl || "",
      sourceUrl: scrapedCourse.url || scrapedCourse.link || "",
      metadata: {
        originalData: scrapedCourse,
        scrapedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Atualiza dados do registro
   * @param {Object} updates - Campos a atualizar
   * @returns {CourseRegistration} - Nova instância com dados atualizados
   */
  update(updates) {
    return new CourseRegistration({
      ...this.toObject(),
      ...updates,
      updatedAt: new Date(),
    });
  }

  /**
   * Marca registro como aprovado
   * @param {string} userId - ID do usuário que aprovou
   * @returns {CourseRegistration}
   */
  approve(userId) {
    if (this.registrationStatus === RegistrationStatus.REGISTERED) {
      throw new Error("Curso já foi cadastrado");
    }

    return new CourseRegistration({
      ...this.toObject(),
      registrationStatus: RegistrationStatus.APPROVED,
      authorizedBy: userId,
      authorizedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Marca registro como rejeitado
   * @param {string} reason - Motivo da rejeição
   * @returns {CourseRegistration}
   */
  reject(reason) {
    return new CourseRegistration({
      ...this.toObject(),
      registrationStatus: RegistrationStatus.REJECTED,
      metadata: {
        ...this.metadata,
        rejectionReason: reason,
        rejectedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    });
  }

  /**
   * Marca registro como cadastrado no WooCommerce
   * @param {number} wooCommerceId - ID do produto criado
   * @returns {CourseRegistration}
   */
  markAsRegistered(wooCommerceId) {
    return new CourseRegistration({
      ...this.toObject(),
      registrationStatus: RegistrationStatus.REGISTERED,
      wooCommerceId: wooCommerceId,
      metadata: {
        ...this.metadata,
        registeredAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    });
  }

  /**
   * Marca registro como falha
   * @param {string} errorMessage - Mensagem de erro
   * @returns {CourseRegistration}
   */
  markAsFailed(errorMessage) {
    return new CourseRegistration({
      ...this.toObject(),
      registrationStatus: RegistrationStatus.FAILED,
      metadata: {
        ...this.metadata,
        lastError: errorMessage,
        failedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    });
  }

  /**
   * Verifica se registro está pendente de revisão
   * @returns {boolean}
   */
  isPendingReview() {
    return this.registrationStatus === RegistrationStatus.PENDING_REVIEW;
  }

  /**
   * Verifica se registro está aprovado para cadastro
   * @returns {boolean}
   */
  isApproved() {
    return this.registrationStatus === RegistrationStatus.APPROVED;
  }

  /**
   * Verifica se registro já foi cadastrado
   * @returns {boolean}
   */
  isRegistered() {
    return this.registrationStatus === RegistrationStatus.REGISTERED;
  }

  /**
   * Valida dados obrigatórios para cadastro
   * @returns {Object} - { isValid: boolean, errors: string[] }
   */
  validateForRegistration() {
    const errors = [];

    if (!this.name || this.name.trim() === "") {
      errors.push("Nome do curso é obrigatório");
    }

    if (!this.category) {
      errors.push("Categoria é obrigatória");
    }

    if (!this.description || this.description.length < 10) {
      errors.push("Descrição deve ter pelo menos 10 caracteres");
    }

    if (!this.slug) {
      errors.push("Slug é obrigatório");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Converte para formato de produto WooCommerce
   * @returns {Object}
   */
  toWooCommerceProduct() {
    const product = {
      name: this.name,
      slug: this.slug,
      type: "simple",
      status: this.status,
      description: this.description,
      short_description: this.shortDescription,
      regular_price: this.regularPrice,
      categories: [],
      meta_data: [
        { key: "_source_url", value: this.sourceUrl },
        { key: "_scraped_course_id", value: this.scrapedCourseId },
        { key: "_registration_id", value: this.id },
      ],
    };

    // Adicionar preço promocional se existir
    if (this.salePrice) {
      product.sale_price = this.salePrice;
    }

    // Adicionar imagem se existir
    if (this.imageUrl) {
      product.images = [{ src: this.imageUrl }];
    }

    // Adicionar campos customizados
    if (this.customFields) {
      Object.entries(this.customFields).forEach(([key, value]) => {
        product.meta_data.push({ key, value });
      });
    }

    return product;
  }

  /**
   * Converte para objeto simples
   * @returns {Object}
   */
  toObject() {
    return {
      id: this.id,
      scrapedCourseId: this.scrapedCourseId,
      name: this.name,
      slug: this.slug,
      category: this.category,
      description: this.description,
      shortDescription: this.shortDescription,
      duration: this.duration,
      price: this.price,
      regularPrice: this.regularPrice,
      salePrice: this.salePrice,
      imageUrl: this.imageUrl,
      galleryImages: this.galleryImages,
      status: this.status,
      registrationStatus: this.registrationStatus,
      metadata: this.metadata,
      customFields: this.customFields,
      sourceUrl: this.sourceUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      authorizedBy: this.authorizedBy,
      authorizedAt: this.authorizedAt,
      wooCommerceId: this.wooCommerceId,
    };
  }

  /**
   * Converte para JSON
   * @returns {Object}
   */
  toJSON() {
    return this.toObject();
  }
}

module.exports = { CourseRegistration, RegistrationStatus };
