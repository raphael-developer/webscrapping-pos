/**
 * @fileoverview Use Case - Executar Scraping
 * Orquestra o processo completo de web scraping
 *
 * @description Este use case coordena:
 * - Extração de dados via repositório de scraping
 * - Processamento via serviço de domínio
 * - Persistência via repositório de storage
 * - Emissão de eventos para monitoramento
 */

const ScrapingService = require("../../domain/services/ScrapingService");

/**
 * Use Case para executar processo de scraping
 */
class ExecuteScrapingUseCase {
  /**
   * @param {IScrapingRepository} scrapingRepository - Implementação de scraping
   * @param {IScrapedCourseRepository} courseRepository - Repositório de cursos existentes
   * @param {ICourseStorageRepository} storageRepository - Repositório para persistência
   * @param {Object} [eventEmitter] - Emissor de eventos opcional (para logs em tempo real)
   */
  constructor(
    scrapingRepository,
    courseRepository,
    storageRepository,
    eventEmitter = null,
  ) {
    this.scrapingRepository = scrapingRepository;
    this.courseRepository = courseRepository;
    this.storageRepository = storageRepository;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Executa o processo de scraping
   *
   * @param {Object} options - Opções de execução
   * @param {string} options.baseUrl - URL base para scraping
   * @param {boolean} [options.forceCategories=true] - Força scraping por categorias
   * @param {boolean} [options.createBackup=true] - Criar backup antes de salvar
   * @returns {Promise<Object>} - Relatório do scraping
   */
  async execute(options = {}) {
    const startTime = Date.now();
    const {
      baseUrl = "https://faculdadeunica.com.br",
      forceCategories = true,
      createBackup = true,
    } = options;

    try {
      this.emit("info", "🚀 Iniciando processo de scraping");

      // 1. Verificar acessibilidade do site
      const isAccessible = await this.scrapingRepository.isAccessible(baseUrl);
      if (!isAccessible) {
        throw new Error(`Site não acessível: ${baseUrl}`);
      }
      this.emit("info", "✅ Site acessível");

      // 2. Carregar cursos existentes para comparação
      const existingCourses = await this.courseRepository.findAll();
      this.emit(
        "info",
        `📊 ${existingCourses.length} cursos existentes carregados`,
      );

      // 3. Extrair categorias
      const categories =
        await this.scrapingRepository.extractCategories(baseUrl);
      this.emit("info", `📁 ${categories.length} categorias encontradas`);

      // 4. Extrair cursos de cada categoria
      let allCourses = [];
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        this.emit(
          "info",
          `🔍 [${i + 1}/${categories.length}] Extraindo: ${category.name}`,
        );

        const courses = await this.scrapingRepository.extractCoursesByCategory(
          category.url,
          { categoryName: category.name },
        );

        // Processar e validar cada curso
        const processedCourses = courses
          .map(course => ScrapingService.processCourseData(course))
          .filter(course => course !== null);

        allCourses = allCourses.concat(processedCourses);

        this.emit(
          "info",
          `✅ ${processedCourses.length} cursos válidos extraídos de ${category.name}`,
        );
      }

      // 5. Detectar mudanças
      const changes = ScrapingService.detectChanges(
        allCourses,
        existingCourses,
      );
      this.emit("info", `📈 Detecção de mudanças concluída:`);
      this.emit("info", `   - Novos: ${changes.newCourses.length}`);
      this.emit("info", `   - Atualizados: ${changes.updatedCourses.length}`);
      this.emit(
        "info",
        `   - Sem alteração: ${changes.unchangedCourses.length}`,
      );

      // 6. Criar backup se solicitado
      if (createBackup && existingCourses.length > 0) {
        const backupPath = await this.storageRepository.createBackup();
        this.emit("info", `💾 Backup criado: ${backupPath}`);
      }

      // 7. Salvar dados atualizados
      const mergedCourses = this.mergeCourses(existingCourses, changes);
      await this.storageRepository.saveAll(mergedCourses);
      this.emit("info", `✅ ${mergedCourses.length} cursos salvos`);

      // 8. Calcular estatísticas finais
      const statistics = ScrapingService.calculateStatistics(
        changes,
        startTime,
      );

      // 9. Gerar relatório
      const report = {
        success: true,
        statistics,
        changes: {
          newCourses: changes.newCourses,
          updatedCourses: changes.updatedCourses.map(c => ({
            title: c.title,
            changes: c.previousData ? "Dados atualizados" : "N/A",
          })),
          removedCourses: changes.removedCourses.map(c => c.title),
        },
        categories: categories.map(c => c.name),
        timestamp: new Date().toISOString(),
      };

      this.emit("info", "🎉 Processo de scraping concluído com sucesso!");

      return report;
    } catch (error) {
      this.emit("error", `❌ Erro no scraping: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mescla cursos existentes com mudanças detectadas
   * @private
   */
  mergeCourses(existingCourses, changes) {
    const coursesMap = new Map();

    // Adicionar cursos não alterados (mantém ID original)
    for (const course of changes.unchangedCourses) {
      const key = ScrapingService.generateCourseKey(course);
      if (key) coursesMap.set(key, course);
    }

    // Adicionar cursos atualizados (mantém ID, atualiza dados)
    for (const course of changes.updatedCourses) {
      const key = ScrapingService.generateCourseKey(course);
      if (key)
        coursesMap.set(key, { ...course, updatedAt: new Date().toISOString() });
    }

    // Gerar IDs para novos cursos
    let maxId = existingCourses.reduce((max, c) => Math.max(max, c.id || 0), 0);
    for (const course of changes.newCourses) {
      maxId++;
      const key = ScrapingService.generateCourseKey(course);
      if (key) {
        coursesMap.set(key, {
          ...course,
          id: maxId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return Array.from(coursesMap.values());
  }

  /**
   * Emite evento de log
   * @private
   */
  emit(level, message) {
    if (this.eventEmitter && typeof this.eventEmitter.emit === "function") {
      this.eventEmitter.emit("scraping-log", {
        level,
        message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Obtém progresso atual
   */
  getProgress() {
    return this.scrapingRepository.getProgress();
  }

  /**
   * Cancela operação em andamento
   */
  async cancel() {
    await this.scrapingRepository.cancel();
    this.emit("warn", "⚠️ Scraping cancelado pelo usuário");
  }
}

module.exports = ExecuteScrapingUseCase;
