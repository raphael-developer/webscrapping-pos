import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  timeout: 10000,
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
  // Courses
  getCourses: (params = {}) => api.get("/courses", { params }),
  getCourse: id => api.get(`/courses/${id}`),
  getCoursesByCategory: category => api.get(`/courses/category/${category}`),
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
};
