/**
 * @fileoverview Use Case - Preparar Cursos Ausentes para Cadastro
 * Identifica cursos ausentes e prepara registros para revisão do usuário
 *
 * @description Seguindo Clean Architecture, este use case:
 * - Depende apenas de interfaces (não de implementações)
 * - Contém regras de negócio de aplicação
 * - É completamente testável em isolamento
 */

const { CourseRegistration } = require('../../domain/entities/CourseRegistration');
const CourseRegistrationService = require('../../domain/services/CourseRegistrationService');
const CourseComparisonService = require('../../domain/services/CourseComparisonService');

/**
 * Use Case para preparar cursos ausentes para cadastro
 * 
 * @implements {Single Responsibility Principle}
 * @implements {Dependency Inversion Principle}
 */
class PrepareCoursesForRegistrationUseCase {
  /**
   * @param {IScrapedCourseRepository} scrapedCourseRepository
   * @param {IWooCommerceRepository} wooCommerceRepository
   * @param {ICourseRegistrationRepository} registrationRepository
   */
  constructor(scrapedCourseRepository, wooCommerceRepository, registrationRepository) {
    this.scrapedCourseRepository = scrapedCourseRepository;
    this.wooCommerceRepository = wooCommerceRepository;
    this.registrationRepository = registrationRepository;
  }

  /**
   * Executa preparação de cursos ausentes para cadastro
   * 
   * @param {Object} options - Opções de filtro
   * @param {string} [options.category] - Filtrar por categoria
   * @param {boolean} [options.skipExisting=true] - Pular cursos já em registro
   * @returns {Promise<Object>}
   */
  async execute(options = {}) {
    const { category, skipExisting = true } = options;

    // 1. Buscar cursos de ambas as fontes
    let scrapedCourses, wooCommerceCourses;
    
    if (category) {
      [scrapedCourses, wooCommerceCourses] = await Promise.all([
        this.scrapedCourseRepository.findByCategory(category),
        this.wooCommerceRepository.findByCategory(category)
      ]);
    } else {
      [scrapedCourses, wooCommerceCourses] = await Promise.all([
        this.scrapedCourseRepository.findAll(),
        this.wooCommerceRepository.findAllCourses()
      ]);
    }

    // 2. Comparar para encontrar ausentes
    const comparison = CourseComparisonService.compare(scrapedCourses, wooCommerceCourses);
    let missingCourses = comparison.onlyInSite;

    // 3. Limpar registros obsoletos (cursos que não são mais ausentes)
    const existingRegistrations = await this.registrationRepository.findAll();
    const missingCourseIds = new Set(missingCourses.map(c => c.id));
    const obsoleteRegistrations = existingRegistrations.filter(r => 
      r.registrationStatus === 'pending_review' && 
      !missingCourseIds.has(r.scrapedCourseId)
    );

    // Remover registros obsoletos
    for (const obsolete of obsoleteRegistrations) {
      await this.registrationRepository.delete(obsolete.id);
    }

    // 4. Filtrar cursos que já têm registro pendente
    const existingScrapedIds = new Set(
      existingRegistrations
        .filter(r => !obsoleteRegistrations.some(o => o.id === r.id))
        .map(r => r.scrapedCourseId)
    );

    if (skipExisting) {
      missingCourses = missingCourses.filter(course => 
        !existingScrapedIds.has(course.id)
      );
    }

    // 5. Preparar registros de cadastro
    const registrations = CourseRegistrationService.prepareMissingCoursesForRegistration(
      missingCourses
    );

    // 6. Salvar TODOS os registros (validação rigorosa só na hora de aprovar)
    // Cursos com dados incompletos ficam pendentes para o usuário completar
    const savedRegistrations = await this.registrationRepository.saveMany(registrations);

    // 7. Identificar quais têm dados incompletos (para informar o usuário)
    const validation = CourseRegistrationService.validateBatch(registrations);

    return {
      success: true,
      data: {
        prepared: savedRegistrations.map(r => r.toObject()),
        needsCompletion: validation.invalid.map(item => ({
          id: item.registration.id,
          name: item.registration.name,
          missingFields: item.errors
        })),
        cleaned: obsoleteRegistrations.map(r => ({
          id: r.id,
          name: r.name,
          reason: 'Curso agora identificado como existente no WooCommerce'
        }))
      },
      statistics: {
        totalMissing: comparison.onlyInSite.length,
        preparedForRegistration: savedRegistrations.length,
        needsCompletion: validation.invalid.length,
        skippedExisting: existingScrapedIds.size,
        cleanedObsolete: obsoleteRegistrations.length
      },
      metadata: {
        executedAt: new Date().toISOString(),
        filterCategory: category || null,
        sources: {
          scraped: scrapedCourses.length,
          wooCommerce: wooCommerceCourses.length
        }
      }
    };
  }

  /**
   * Prepara um único curso para cadastro
   * 
   * @param {string} scrapedCourseId - ID do curso scraped
   * @returns {Promise<Object>}
   */
  async prepareSingleCourse(scrapedCourseId) {
    // 1. Buscar curso scraped
    const scrapedCourse = await this.scrapedCourseRepository.findById(scrapedCourseId);
    if (!scrapedCourse) {
      throw new Error(`Curso scraped não encontrado: ${scrapedCourseId}`);
    }

    // 2. Verificar se já existe registro
    const existingRegistration = await this.registrationRepository.findByScrapedCourseId(scrapedCourseId);
    if (existingRegistration) {
      return {
        success: false,
        message: 'Já existe um registro para este curso',
        existingRegistration: existingRegistration.toObject()
      };
    }

    // 3. Verificar se curso já existe no WooCommerce
    const wooCommerceCourses = await this.wooCommerceRepository.findAllCourses();
    const duplicateCheck = CourseRegistrationService.checkForDuplicates(
      CourseRegistration.fromScrapedCourse(scrapedCourse),
      wooCommerceCourses
    );

    if (duplicateCheck.hasDuplicate) {
      return {
        success: false,
        message: 'Curso possivelmente já existe no WooCommerce',
        potentialDuplicates: duplicateCheck.matches
      };
    }

    // 4. Criar e salvar registro
    const registration = CourseRegistration.fromScrapedCourse(scrapedCourse);
    const savedRegistration = await this.registrationRepository.save(registration);

    return {
      success: true,
      data: savedRegistration.toObject(),
      message: 'Curso preparado para revisão'
    };
  }
}

module.exports = PrepareCoursesForRegistrationUseCase;
