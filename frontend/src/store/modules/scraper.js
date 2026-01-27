import ApiService from "@/services/api";

const state = {
  isScrapingInProgress: false,
  statistics: {
    totalCourses: 0,
    totalCategories: 0,
    coursesByCategory: {},
    lastUpdated: null,
  },
};

// progresso parcial do scraping
state.progress = {
  processedCourses: 0,
  processedCategories: 0,
  totalCourses: 0,
  totalCategories: 0,
};

const mutations = {
  SET_SCRAPING_STATUS(state, status) {
    state.isScrapingInProgress = status;
  },
  SET_STATISTICS(state, statistics) {
    state.statistics = statistics;
  },
  SET_PROGRESS(state, progress) {
    state.progress = progress;
  },
};

const actions = {
  async startScraping({ commit, dispatch }) {
    try {
      dispatch("setLoading", true, { root: true });
      dispatch("clearError", null, { root: true });

      const response = await ApiService.startScraping();

      if (response.data && response.data.success) {
        commit("SET_SCRAPING_STATUS", true);
        return response.data;
      } else {
        throw new Error(
          response.data?.message ||
            response.message ||
            "Erro ao iniciar scraping"
        );
      }
    } catch (error) {
      dispatch("setError", error.message, { root: true });
      throw error;
    } finally {
      dispatch("setLoading", false, { root: true });
    }
  },

  async fetchScrapingStatus({ commit, dispatch }) {
    try {
      const response = await ApiService.getScrapingStatus();
      if (response.data && response.data.success) {
        commit("SET_SCRAPING_STATUS", response.data.data.isScrapingInProgress);
        commit("SET_STATISTICS", response.data.data.statistics);
        if (response.data.data.progress)
          commit("SET_PROGRESS", response.data.data.progress);
        return response.data.data;
      } else {
        throw new Error(
          response.data?.message ||
            response.message ||
            "Erro ao obter status do scraping"
        );
      }
    } catch (error) {
      dispatch("setError", error.message, { root: true });
      throw error;
    }
  },

  async fetchStatistics({ commit, dispatch }) {
    try {
      const response = await ApiService.getStatistics();

      if (response.success) {
        commit("SET_STATISTICS", response.data);
        return response.data;
      } else {
        throw new Error(response.message || "Erro ao obter estatísticas");
      }
    } catch (error) {
      dispatch("setError", error.message, { root: true });
      throw error;
    }
  },
};

const getters = {
  isScrapingInProgress: state => state.isScrapingInProgress,
  statistics: state => state.statistics,
  totalCourses: state => state.statistics.totalCourses,
  totalCategories: state => state.statistics.totalCategories,
  coursesByCategory: state => state.statistics.coursesByCategory,
  lastUpdated: state => state.statistics.lastUpdated,
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
