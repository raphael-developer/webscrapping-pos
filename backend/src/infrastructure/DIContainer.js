/**
 * @fileoverview Container de Injeção de Dependência
 * Gerencia a criação e injeção de dependências seguindo o princípio IoC
 *
 * @description Este container implementa:
 * - Inversão de Controle (IoC)
 * - Registro de dependências por interface
 * - Lazy instantiation
 * - Singleton pattern para repositórios
 */

const config = require("../config");

// Interfaces (contratos)
const IScrapedCourseRepository = require("../domain/repositories/IScrapedCourseRepository");
const IWooCommerceRepository = require("../domain/repositories/IWooCommerceRepository");
const IScrapingRepository = require("../domain/repositories/IScrapingRepository");
const ICourseStorageRepository = require("../domain/repositories/ICourseStorageRepository");

// Implementações de Infraestrutura
const ScrapedCourseRepository = require("../infrastructure/repositories/ScrapedCourseRepository");
const WooCommerceRepository = require("../infrastructure/woocommerce/WooCommerceRepository");

// Use Cases
const GetCoursesUseCase = require("../application/use-cases/GetCoursesUseCase");
const GetStatisticsUseCase = require("../application/use-cases/GetStatisticsUseCase");
const CompareCourseUseCase = require("../application/use-cases/CompareCourseUseCase");
const GetMissingCoursesUseCase = require("../application/use-cases/GetMissingCoursesUseCase");
const SyncCoursesUseCase = require("../application/use-cases/SyncCoursesUseCase");
const ExecuteScrapingUseCase = require("../application/use-cases/ExecuteScrapingUseCase");

/**
 * Container de Injeção de Dependência
 */
class DIContainer {
  constructor() {
    this.instances = new Map();
    this.factories = new Map();
  }

  /**
   * Registra uma factory para uma dependência
   * @param {string} name - Nome da dependência
   * @param {Function} factory - Factory function
   * @param {boolean} [singleton=true] - Se deve ser singleton
   */
  register(name, factory, singleton = true) {
    this.factories.set(name, { factory, singleton });
  }

  /**
   * Resolve uma dependência
   * @param {string} name - Nome da dependência
   * @returns {*}
   */
  resolve(name) {
    // Verificar se já existe instância singleton
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    const registration = this.factories.get(name);
    if (!registration) {
      throw new Error(`Dependency not registered: ${name}`);
    }

    const instance = registration.factory(this);

    // Armazenar se for singleton
    if (registration.singleton) {
      this.instances.set(name, instance);
    }

    return instance;
  }

  /**
   * Verifica se uma dependência está registrada
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.factories.has(name);
  }

  /**
   * Limpa instâncias em cache (útil para testes)
   */
  clearInstances() {
    this.instances.clear();
  }

  /**
   * Limpa todos os registros
   */
  clearAll() {
    this.instances.clear();
    this.factories.clear();
  }
}

/**
 * Cria e configura o container padrão da aplicação
 * @param {Object} [io] - Instância Socket.IO para eventos
 * @returns {DIContainer}
 */
function createContainer(io = null) {
  const container = new DIContainer();

  // ===== REPOSITÓRIOS =====

  // Repositório de Cursos Scraped
  container.register("scrapedCourseRepository", () => {
    return ScrapedCourseRepository.create();
  });

  // Repositório WooCommerce
  container.register("wooCommerceRepository", () => {
    return WooCommerceRepository.create({
      url: config.woocommerce.url,
      consumerKey: config.woocommerce.consumerKey,
      consumerSecret: config.woocommerce.consumerSecret,
      options: {
        timeout: config.woocommerce.timeout,
        cacheEnabled: true,
      },
    });
  });

  // Repositório de Storage (persistência)
  container.register("courseStorageRepository", () => {
    // Re-utiliza o ScrapedCourseRepository que já tem métodos de save
    return ScrapedCourseRepository.create();
  });

  // ===== USE CASES =====

  // GetCourses
  container.register(
    "getCoursesUseCase",
    c => {
      return new GetCoursesUseCase(c.resolve("scrapedCourseRepository"));
    },
    false,
  );

  // GetStatistics
  container.register(
    "getStatisticsUseCase",
    c => {
      return new GetStatisticsUseCase(c.resolve("scrapedCourseRepository"));
    },
    false,
  );

  // CompareCourses
  container.register(
    "compareCourseUseCase",
    c => {
      return new CompareCourseUseCase(
        c.resolve("scrapedCourseRepository"),
        c.resolve("wooCommerceRepository"),
      );
    },
    false,
  );

  // GetMissingCourses
  container.register(
    "getMissingCoursesUseCase",
    c => {
      return new GetMissingCoursesUseCase(
        c.resolve("scrapedCourseRepository"),
        c.resolve("wooCommerceRepository"),
      );
    },
    false,
  );

  // SyncCourses
  container.register(
    "syncCoursesUseCase",
    c => {
      return new SyncCoursesUseCase(
        c.resolve("scrapedCourseRepository"),
        c.resolve("wooCommerceRepository"),
      );
    },
    false,
  );

  // ===== EVENT EMITTER (para WebSocket) =====
  if (io) {
    container.register("eventEmitter", () => ({
      emit: (event, data) => {
        io.to("scraping-logs").emit(event, data);
      },
    }));
  }

  return container;
}

// Singleton global do container
let globalContainer = null;

/**
 * Obtém o container global (cria se não existir)
 * @param {Object} [io] - Socket.IO instance
 * @returns {DIContainer}
 */
function getContainer(io = null) {
  if (!globalContainer) {
    globalContainer = createContainer(io);
  }
  return globalContainer;
}

/**
 * Reseta o container global (útil para testes)
 */
function resetContainer() {
  if (globalContainer) {
    globalContainer.clearAll();
  }
  globalContainer = null;
}

module.exports = {
  DIContainer,
  createContainer,
  getContainer,
  resetContainer,
};
