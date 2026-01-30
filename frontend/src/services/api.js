import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  timeout: 30000,
});

// Interceptor para debug
api.interceptors.response.use(
  response => {
    console.log(
      `[API] ${response.config.method?.toUpperCase()} ${response.config.url}`,
      response.data,
    );
    return response;
  },
  error => {
    console.error(
      `[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      error.response?.data || error.message,
    );
    return Promise.reject(error);
  },
);

export default {
  // Courses (timeout maior para carregar todos os 880 cursos)
  getCourses: (params = {}) => api.get("/courses", { params, timeout: 60000 }),
  getCourse: id => api.get(`/courses/${id}`),
  getCoursesByCategory: category =>
    api.get(`/courses/category/${category}`, { timeout: 60000 }),
  getCategories: () => api.get("/courses/categories"),
  getStatistics: () => api.get("/courses/statistics"),

  // Scraper
  startScraping: () => api.post("/scraper/start"),
  getScrapingStatus: () => api.get("/scraper/status"),

  // WooCommerce Comparison (timeout maior pois busca dados externos)
  getComparison: (params = {}) =>
    api.get("/comparison", { params, timeout: 120000 }),
  getMissingCourses: (params = {}) =>
    api.get("/comparison/missing", { params, timeout: 120000 }),
  getMissingReport: () =>
    api.get("/comparison/missing/report", { timeout: 120000 }),
  exportMissingCSV: () =>
    api.get("/comparison/missing/export", {
      responseType: "blob",
      timeout: 120000,
    }),
  getSyncPlan: () => api.get("/comparison/sync", { timeout: 120000 }),
  getWooCommerceStats: () =>
    api.get("/comparison/woocommerce/stats", { timeout: 60000 }),
  getScrapedStats: () => api.get("/comparison/scraped/stats"),
  refreshComparisonCache: () => api.post("/comparison/refresh"),

  // ===== Registro de Cursos (Cadastro Assistido) =====
  // Preparação
  prepareCoursesForRegistration: (params = {}) =>
    api.get("/registration/prepare", { params, timeout: 120000 }),
  prepareSingleCourse: scrapedCourseId =>
    api.post(
      `/registration/prepare/${scrapedCourseId}`,
      {},
      { timeout: 60000 },
    ),

  // Listagem
  getPendingRegistrations: (params = {}) =>
    api.get("/registration", { params, timeout: 60000 }),
  getApprovedRegistrations: () =>
    api.get("/registration/approved", { timeout: 60000 }),
  getRegistrationStatistics: () =>
    api.get("/registration/statistics", { timeout: 30000 }),
  getRegistrationDetails: id =>
    api.get(`/registration/${id}`, { timeout: 30000 }),

  // Ações
  updateRegistration: (id, data) =>
    api.put(`/registration/${id}`, data, { timeout: 30000 }),
  approveRegistration: (id, userId = "admin") =>
    api.post(`/registration/${id}/approve`, { userId }, { timeout: 30000 }),
  rejectRegistration: (id, reason) =>
    api.post(`/registration/${id}/reject`, { reason }, { timeout: 30000 }),
  registerInWooCommerce: (id, userId = "admin") =>
    api.post(`/registration/${id}/register`, { userId }, { timeout: 60000 }),
  deleteRegistration: id =>
    api.delete(`/registration/${id}`, { timeout: 30000 }),

  // Batch
  registerBatch: (registrationIds, userId = "admin") =>
    api.post(
      "/registration/register-batch",
      { registrationIds, userId },
      { timeout: 180000 },
    ),

  // Backup
  exportRegistrations: () =>
    api.get("/registration/export", { timeout: 60000 }),
  importRegistrations: (backup, overwrite = false) =>
    api.post("/registration/import", { backup, overwrite }, { timeout: 60000 }),
};
