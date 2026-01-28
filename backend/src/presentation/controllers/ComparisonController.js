/**
 * @fileoverview Controller - Comparação de Cursos
 * Camada de apresentação para endpoints de comparação
 *
 * @description Responsável por:
 * - Validar entrada
 * - Chamar use cases
 * - Formatar resposta
 */

const CompareCourseUseCase = require("../../application/use-cases/CompareCourseUseCase");
const GetMissingCoursesUseCase = require("../../application/use-cases/GetMissingCoursesUseCase");
const SyncCoursesUseCase = require("../../application/use-cases/SyncCoursesUseCase");
const ComparisonResultDTO = require("../../application/dtos/ComparisonResultDTO");
const WooCommerceRepository = require("../../infrastructure/woocommerce/WooCommerceRepository");
const ScrapedCourseRepository = require("../../infrastructure/repositories/ScrapedCourseRepository");
const config = require("../../config");

/**
 * Controller para comparação de cursos
 */
class ComparisonController {
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
  }

  /**
   * GET /api/comparison
   * Retorna comparação completa entre cursos scraped e WooCommerce
   */
  compare = async (req, res, next) => {
    try {
      const { category, detailed } = req.query;

      const useCase = new CompareCourseUseCase(
        this.scrapedCourseRepository,
        this.wooCommerceRepository,
      );

      let result;
      if (category) {
        result = await useCase.executeByCategory(category);
      } else {
        result = await useCase.execute();
      }

      // Formatar resposta baseado no parâmetro detailed
      const response =
        detailed === "true"
          ? ComparisonResultDTO.toDetailedResponse(result)
          : ComparisonResultDTO.toSimpleResponse(result);

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/comparison/missing
   * Retorna cursos presentes no site mas não na API WooCommerce
   */
  getMissing = async (req, res, next) => {
    try {
      const { category, groupByCategory } = req.query;

      const useCase = new GetMissingCoursesUseCase(
        this.scrapedCourseRepository,
        this.wooCommerceRepository,
      );

      const result = await useCase.execute({
        category,
        groupByCategory: groupByCategory === "true",
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/comparison/missing/report
   * Gera relatório completo de cursos ausentes
   */
  getMissingReport = async (req, res, next) => {
    try {
      const useCase = new GetMissingCoursesUseCase(
        this.scrapedCourseRepository,
        this.wooCommerceRepository,
      );

      const report = await useCase.generateReport();

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/comparison/missing/export
   * Exporta cursos ausentes em formato CSV
   */
  exportMissingCSV = async (req, res, next) => {
    try {
      const useCase = new GetMissingCoursesUseCase(
        this.scrapedCourseRepository,
        this.wooCommerceRepository,
      );

      const result = await useCase.execute();
      const csv = ComparisonResultDTO.toCSV(result.missingCourses);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=cursos-ausentes.csv",
      );
      res.send(csv);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/comparison/sync
   * Retorna plano de sincronização
   */
  getSyncPlan = async (req, res, next) => {
    try {
      const useCase = new SyncCoursesUseCase(
        this.scrapedCourseRepository,
        this.wooCommerceRepository,
      );

      const result = await useCase.execute();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/comparison/woocommerce/stats
   * Retorna estatísticas do WooCommerce
   */
  getWooCommerceStats = async (req, res, next) => {
    try {
      const stats = await this.wooCommerceRepository.getStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/comparison/scraped/stats
   * Retorna estatísticas dos cursos scraped
   */
  getScrapedStats = async (req, res, next) => {
    try {
      const stats = await this.scrapedCourseRepository.getStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/comparison/refresh
   * Força refresh do cache
   */
  refreshCache = async (req, res, next) => {
    try {
      this.wooCommerceRepository.clearCache();
      this.scrapedCourseRepository.clearCache();

      res.json({
        success: true,
        message: "Cache limpo com sucesso",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = ComparisonController;
