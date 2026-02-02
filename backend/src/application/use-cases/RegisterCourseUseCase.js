/**
 * @fileoverview Use Case - Aprovar e Registrar Curso no WooCommerce
 * Gerencia a autorização e cadastro de cursos
 *
 * @description Este use case garante que apenas cursos explicitamente
 * autorizados pelo usuário sejam cadastrados no WooCommerce.
 */

const CourseRegistrationService = require("../../domain/services/CourseRegistrationService");
const {
  RegistrationStatus,
} = require("../../domain/entities/CourseRegistration");

/**
 * Use Case para aprovar e registrar curso no WooCommerce
 *
 * @implements {Single Responsibility Principle}
 * @implements {Dependency Inversion Principle}
 */
class RegisterCourseUseCase {
  /**
   * @param {ICourseRegistrationRepository} registrationRepository
   * @param {IWooCommerceRepository} wooCommerceRepository
   */
  constructor(registrationRepository, wooCommerceRepository) {
    this.registrationRepository = registrationRepository;
    this.wooCommerceRepository = wooCommerceRepository;
  }

  /**
   * Atualiza dados de um registro de cadastro
   *
   * @param {string} registrationId - ID do registro
   * @param {Object} updates - Dados atualizados
   * @returns {Promise<Object>}
   */
  async updateRegistration(registrationId, updates) {
    const registration =
      await this.registrationRepository.findById(registrationId);

    if (!registration) {
      throw new Error(`Registro não encontrado: ${registrationId}`);
    }

    if (registration.isRegistered()) {
      throw new Error("Não é possível editar um curso já cadastrado");
    }

    // Campos permitidos para atualização
    const allowedFields = [
      "name",
      "slug",
      "category",
      "description",
      "shortDescription",
      "duration",
      "price",
      "regularPrice",
      "salePrice",
      "imageUrl",
      "galleryImages",
      "status",
      "customFields",
      "metadata",
    ];

    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    const updatedRegistration = registration.update(filteredUpdates);
    await this.registrationRepository.update(
      registrationId,
      updatedRegistration.toObject(),
    );

    return {
      success: true,
      data: updatedRegistration.toObject(),
      message: "Registro atualizado com sucesso",
    };
  }

  /**
   * Aprova um registro para cadastro (autorização do usuário)
   *
   * @param {string} registrationId - ID do registro
   * @param {string} userId - ID do usuário que está aprovando
   * @returns {Promise<Object>}
   */
  async approveRegistration(registrationId, userId) {
    const registration =
      await this.registrationRepository.findById(registrationId);

    if (!registration) {
      throw new Error(`Registro não encontrado: ${registrationId}`);
    }

    // Validar dados antes de aprovar
    const validation = registration.validateForRegistration();
    if (!validation.isValid) {
      return {
        success: false,
        message: "Registro contém dados inválidos",
        errors: validation.errors,
      };
    }

    const approvedRegistration = registration.approve(userId);
    await this.registrationRepository.update(
      registrationId,
      approvedRegistration.toObject(),
    );

    return {
      success: true,
      data: approvedRegistration.toObject(),
      message: "Registro aprovado. Pronto para cadastro no WooCommerce.",
    };
  }

  /**
   * Rejeita um registro
   *
   * @param {string} registrationId - ID do registro
   * @param {string} reason - Motivo da rejeição
   * @returns {Promise<Object>}
   */
  async rejectRegistration(registrationId, reason) {
    const registration =
      await this.registrationRepository.findById(registrationId);

    if (!registration) {
      throw new Error(`Registro não encontrado: ${registrationId}`);
    }

    const rejectedRegistration = registration.reject(reason);
    await this.registrationRepository.update(
      registrationId,
      rejectedRegistration.toObject(),
    );

    return {
      success: true,
      data: rejectedRegistration.toObject(),
      message: "Registro rejeitado",
    };
  }

  /**
   * Cadastra um curso aprovado no WooCommerce
   * REQUER autorização prévia do usuário
   *
   * @param {string} registrationId - ID do registro
   * @param {string} userId - ID do usuário que está executando
   * @returns {Promise<Object>}
   */
  async registerInWooCommerce(registrationId, userId) {
    const registration =
      await this.registrationRepository.findById(registrationId);

    if (!registration) {
      throw new Error(`Registro não encontrado: ${registrationId}`);
    }

    // Verificar autorização
    const canRegister = CourseRegistrationService.canRegister(registration);
    if (!canRegister.canRegister) {
      return {
        success: false,
        message: canRegister.reason,
      };
    }

    try {
      // Converter para formato WooCommerce
      const productData = registration.toWooCommerceProduct();

      // Buscar ID da categoria no WooCommerce
      const categories = await this.wooCommerceRepository.findAllCategories();
      const category = categories.find(
        c => c.name.toLowerCase() === registration.category?.toLowerCase(),
      );

      if (category) {
        productData.categories = [{ id: category.id }];
      }

      // Criar produto no WooCommerce
      const createdProduct =
        await this.wooCommerceRepository.createProduct(productData);

      // Atualizar registro como cadastrado
      const registeredCourse = registration.markAsRegistered(createdProduct.id);
      await this.registrationRepository.update(
        registrationId,
        registeredCourse.toObject(),
      );

      return {
        success: true,
        data: {
          registration: registeredCourse.toObject(),
          wooCommerceProduct: {
            id: createdProduct.id,
            permalink: createdProduct.permalink,
            name: createdProduct.name,
          },
        },
        message: `Curso "${registration.name}" cadastrado com sucesso no WooCommerce`,
      };
    } catch (error) {
      // Marcar como falha
      const failedRegistration = registration.markAsFailed(error.message);
      await this.registrationRepository.update(
        registrationId,
        failedRegistration.toObject(),
      );

      return {
        success: false,
        message: `Erro ao cadastrar no WooCommerce: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Cadastra múltiplos cursos aprovados no WooCommerce
   *
   * @param {Array<string>} registrationIds - IDs dos registros
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>}
   */
  async registerBatch(registrationIds, userId) {
    const results = {
      successful: [],
      failed: [],
    };

    for (const id of registrationIds) {
      try {
        const result = await this.registerInWooCommerce(id, userId);

        if (result.success) {
          results.successful.push({
            registrationId: id,
            wooCommerceId: result.data.wooCommerceProduct.id,
            name: result.data.registration.name,
          });
        } else {
          results.failed.push({
            registrationId: id,
            reason: result.message,
          });
        }

        // Rate limiting - aguardar entre cadastros
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.failed.push({
          registrationId: id,
          reason: error.message,
        });
      }
    }

    return {
      success: results.failed.length === 0,
      data: results,
      summary: {
        total: registrationIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
      },
      message: `${results.successful.length}/${registrationIds.length} cursos cadastrados com sucesso`,
    };
  }

  /**
   * Lista registros pendentes de revisão
   *
   * @param {Object} options - Opções de filtro
   * @returns {Promise<Object>}
   */
  async listPendingRegistrations(options = {}) {
    const {
      status,
      category,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = options;

    // Buscar todos os registros (não apenas pending_review)
    let registrations = await this.registrationRepository.findAll();

    // Aplicar filtros
    registrations = CourseRegistrationService.filter(registrations, {
      status,
      category,
      search,
    });

    // Ordenar
    registrations = CourseRegistrationService.sort(
      registrations,
      sortBy,
      order,
    );

    // Calcular estatísticas
    const statistics = CourseRegistrationService.calculateStatistics(
      await this.registrationRepository.findAll(),
    );

    return {
      success: true,
      data: registrations.map(r => r.toObject()),
      statistics,
      metadata: {
        total: registrations.length,
        filters: { category, search, sortBy, order },
      },
    };
  }

  /**
   * Lista registros aprovados (prontos para cadastro)
   *
   * @returns {Promise<Object>}
   */
  async listApprovedRegistrations() {
    const registrations = await this.registrationRepository.findApproved();

    return {
      success: true,
      data: registrations.map(r => r.toObject()),
      total: registrations.length,
      message: `${registrations.length} curso(s) aprovado(s) aguardando cadastro`,
    };
  }

  /**
   * Busca um registro específico com detalhes
   *
   * @param {string} registrationId
   * @returns {Promise<Object>}
   */
  async getRegistrationDetails(registrationId) {
    const registration =
      await this.registrationRepository.findById(registrationId);

    if (!registration) {
      throw new Error(`Registro não encontrado: ${registrationId}`);
    }

    // Verificar validação
    const validation = registration.validateForRegistration();
    const canRegister = CourseRegistrationService.canRegister(registration);

    return {
      success: true,
      data: {
        registration: registration.toObject(),
        validation,
        canRegister,
      },
    };
  }

  /**
   * Remove um registro
   *
   * @param {string} registrationId
   * @returns {Promise<Object>}
   */
  async deleteRegistration(registrationId) {
    const registration =
      await this.registrationRepository.findById(registrationId);

    if (!registration) {
      throw new Error(`Registro não encontrado: ${registrationId}`);
    }

    if (registration.isRegistered()) {
      throw new Error(
        "Não é possível remover um curso já cadastrado no WooCommerce",
      );
    }

    await this.registrationRepository.delete(registrationId);

    return {
      success: true,
      message: "Registro removido com sucesso",
    };
  }
}

module.exports = RegisterCourseUseCase;
