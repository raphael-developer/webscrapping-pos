/**
 * @fileoverview Controller - Registro de Cursos no WooCommerce
 * Camada de apresentação para endpoints de cadastro assistido
 *
 * @description Responsável por:
 * - Validar entrada
 * - Chamar use cases
 * - Formatar resposta
 *
 * Não contém lógica de negócio - apenas orquestra chamadas
 */

const PrepareCoursesForRegistrationUseCase = require("../../application/use-cases/PrepareCoursesForRegistrationUseCase");
const RegisterCourseUseCase = require("../../application/use-cases/RegisterCourseUseCase");
const CourseRegistrationRepository = require("../../infrastructure/repositories/CourseRegistrationRepository");
const WooCommerceRepository = require("../../infrastructure/woocommerce/WooCommerceRepository");
const ScrapedCourseRepository = require("../../infrastructure/repositories/ScrapedCourseRepository");
const config = require("../../config");

/**
 * Controller para registro de cursos no WooCommerce
 */
class RegistrationController {
  constructor() {
    // Dependency Injection: Criar repositórios com configuração
    this.wooCommerceRepository = WooCommerceRepository.create({
      url: config.woocommerce.url,
      consumerKey: config.woocommerce.consumerKey,
      consumerSecret: config.woocommerce.consumerSecret,
      options: {
        timeout: config.woocommerce.timeout,
        cacheEnabled: true,
      },
    });

    this.scrapedCourseRepository = ScrapedCourseRepository.create();
    this.registrationRepository = CourseRegistrationRepository.create();

    // Inicializar repositório de registros
    this.registrationRepository.initialize().catch(err => {
      console.error(
        "[RegistrationController] Erro ao inicializar repositório:",
        err.message,
      );
    });
  }

  /**
   * GET /api/registration/prepare
   * Prepara cursos ausentes para cadastro
   */
  prepareCourses = async (req, res, next) => {
    try {
      const { category, skipExisting } = req.query;

      const useCase = new PrepareCoursesForRegistrationUseCase(
        this.scrapedCourseRepository,
        this.wooCommerceRepository,
        this.registrationRepository,
      );

      const result = await useCase.execute({
        category,
        skipExisting: skipExisting !== "false",
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/registration/prepare/:scrapedCourseId
   * Prepara um único curso para cadastro
   */
  prepareSingleCourse = async (req, res, next) => {
    try {
      const { scrapedCourseId } = req.params;

      const useCase = new PrepareCoursesForRegistrationUseCase(
        this.scrapedCourseRepository,
        this.wooCommerceRepository,
        this.registrationRepository,
      );

      const result = await useCase.prepareSingleCourse(scrapedCourseId);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/registration
   * Lista registros (todos ou filtrados por status)
   */
  listPending = async (req, res, next) => {
    try {
      const { status, category, search, sortBy, order } = req.query;

      const useCase = new RegisterCourseUseCase(
        this.registrationRepository,
        this.wooCommerceRepository,
      );

      const result = await useCase.listPendingRegistrations({
        status,
        category,
        search,
        sortBy,
        order,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/registration/approved
   * Lista registros aprovados (prontos para cadastro)
   */
  listApproved = async (req, res, next) => {
    try {
      const useCase = new RegisterCourseUseCase(
        this.registrationRepository,
        this.wooCommerceRepository,
      );

      const result = await useCase.listApprovedRegistrations();

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/registration/:id
   * Obtém detalhes de um registro
   */
  getDetails = async (req, res, next) => {
    try {
      const { id } = req.params;

      const useCase = new RegisterCourseUseCase(
        this.registrationRepository,
        this.wooCommerceRepository,
      );

      const result = await useCase.getRegistrationDetails(id);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/registration/:id
   * Atualiza dados de um registro
   */
  updateRegistration = async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Validação básica
      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Nenhum dado para atualizar",
        });
      }

      const useCase = new RegisterCourseUseCase(
        this.registrationRepository,
        this.wooCommerceRepository,
      );

      const result = await useCase.updateRegistration(id, updates);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/registration/:id/approve
   * Aprova um registro para cadastro
   */
  approve = async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.body.userId || "admin"; // Em produção, pegar do token JWT

      const useCase = new RegisterCourseUseCase(
        this.registrationRepository,
        this.wooCommerceRepository,
      );

      const result = await useCase.approveRegistration(id, userId);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/registration/:id/reject
   * Rejeita um registro
   */
  reject = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "Motivo da rejeição é obrigatório",
        });
      }

      const useCase = new RegisterCourseUseCase(
        this.registrationRepository,
        this.wooCommerceRepository,
      );

      const result = await useCase.rejectRegistration(id, reason);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/registration/:id/fetch-description
   * Busca descrição real do site para um registro
   */
  fetchSiteDescription = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { updateRecord } = req.body; // Se true, atualiza o registro automaticamente

      // Buscar registro
      const registration = await this.registrationRepository.findById(id);
      if (!registration) {
        return res.status(404).json({
          success: false,
          message: "Registro não encontrado",
        });
      }

      // Verificar se tem URL de origem
      if (!registration.sourceUrl) {
        return res.status(400).json({
          success: false,
          message: "Registro não possui URL de origem",
        });
      }

      // Buscar descrição do site
      const {
        fetchCourseDescription,
      } = require("../../scripts/fetch-course-description");
      const siteData = await fetchCourseDescription(registration.sourceUrl);

      if (!siteData.success) {
        return res.status(500).json({
          success: false,
          message: "Erro ao buscar descrição do site",
          error: siteData.error,
        });
      }

      // Atualizar registro se solicitado
      if (updateRecord && siteData.description) {
        const useCase = new RegisterCourseUseCase(
          this.registrationRepository,
          this.wooCommerceRepository,
        );

        const updatedRegistration = await useCase.updateRegistration(id, {
          description: siteData.description,
          metadata: {
            ...registration.metadata,
            descriptionGenerated: false,
            descriptionFetchedAt: new Date().toISOString(),
            descriptionSource: "site_original",
          },
        });

        return res.json({
          success: true,
          message: "Descrição atualizada com sucesso",
          data: {
            description: siteData.description,
            objective: siteData.objective,
            registration: updatedRegistration.data,
          },
        });
      }

      res.json({
        success: true,
        data: {
          description: siteData.description,
          objective: siteData.objective,
          workload: siteData.workload,
          source: siteData.source,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/registration/:id/register
   * Cadastra um curso aprovado no WooCommerce
   */
  registerInWooCommerce = async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.body.userId || "admin";

      const useCase = new RegisterCourseUseCase(
        this.registrationRepository,
        this.wooCommerceRepository,
      );

      const result = await useCase.registerInWooCommerce(id, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/registration/register-batch
   * Cadastra múltiplos cursos aprovados no WooCommerce
   */
  registerBatch = async (req, res, next) => {
    try {
      const { registrationIds, userId = "admin" } = req.body;

      if (
        !registrationIds ||
        !Array.isArray(registrationIds) ||
        registrationIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Lista de IDs de registros é obrigatória",
        });
      }

      const useCase = new RegisterCourseUseCase(
        this.registrationRepository,
        this.wooCommerceRepository,
      );

      const result = await useCase.registerBatch(registrationIds, userId);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/registration/:id
   * Remove um registro
   */
  deleteRegistration = async (req, res, next) => {
    try {
      const { id } = req.params;

      const useCase = new RegisterCourseUseCase(
        this.registrationRepository,
        this.wooCommerceRepository,
      );

      const result = await useCase.deleteRegistration(id);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/registration/statistics
   * Obtém estatísticas dos registros
   */
  getStatistics = async (req, res, next) => {
    try {
      const statistics = await this.registrationRepository.getStatistics();

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/registration/export
   * Exporta registros para backup
   */
  exportBackup = async (req, res, next) => {
    try {
      const backup = await this.registrationRepository.exportBackup();

      res.json({
        success: true,
        data: backup,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/registration/import
   * Importa registros de backup
   */
  importBackup = async (req, res, next) => {
    try {
      const { backup, overwrite = false } = req.body;

      if (!backup || !backup.data) {
        return res.status(400).json({
          success: false,
          message: "Dados de backup inválidos",
        });
      }

      const result = await this.registrationRepository.importBackup(
        backup,
        overwrite,
      );

      res.json({
        success: true,
        data: result,
        message: `Importados ${result.imported} registros, ${result.skipped} ignorados`,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = RegistrationController;
