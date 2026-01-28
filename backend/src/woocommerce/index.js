/**
 * @fileoverview Índice de exports da integração WooCommerce
 * Facilita imports usando Clean Architecture
 */

// Domain Layer
const WooCommerceCourse = require("./domain/entities/WooCommerceCourse");
const ScrapedCourse = require("./domain/entities/ScrapedCourse");
const CourseComparisonService = require("./domain/services/CourseComparisonService");

// Application Layer
const CompareCourseUseCase = require("./application/use-cases/CompareCourseUseCase");
const GetMissingCoursesUseCase = require("./application/use-cases/GetMissingCoursesUseCase");
const SyncCoursesUseCase = require("./application/use-cases/SyncCoursesUseCase");
const ComparisonResultDTO = require("./application/dtos/ComparisonResultDTO");

// Infrastructure Layer
const {
  WooCommerceClient,
  WooCommerceError,
} = require("./infrastructure/woocommerce/WooCommerceClient");
const WooCommerceRepository = require("./infrastructure/woocommerce/WooCommerceRepository");
const ScrapedCourseRepository = require("./infrastructure/repositories/ScrapedCourseRepository");

// Presentation Layer
const ComparisonController = require("./presentation/controllers/ComparisonController");
const comparisonRoutes = require("./presentation/routes/comparisonRoutes");

module.exports = {
  // Domain
  entities: {
    WooCommerceCourse,
    ScrapedCourse,
  },
  services: {
    CourseComparisonService,
  },

  // Application
  useCases: {
    CompareCourseUseCase,
    GetMissingCoursesUseCase,
    SyncCoursesUseCase,
  },
  dtos: {
    ComparisonResultDTO,
  },

  // Infrastructure
  clients: {
    WooCommerceClient,
    WooCommerceError,
  },
  repositories: {
    WooCommerceRepository,
    ScrapedCourseRepository,
  },

  // Presentation
  controllers: {
    ComparisonController,
  },
  routes: {
    comparisonRoutes,
  },
};
