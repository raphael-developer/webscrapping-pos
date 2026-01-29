import ApiService from "@/services/api";

const state = {
  categories: [],
  currentCategory: null,
};

const mutations = {
  SET_CATEGORIES(state, categories) {
    state.categories = categories;
  },
  SET_CURRENT_CATEGORY(state, category) {
    state.currentCategory = category;
  },
};

const actions = {
  async fetchCategories({ commit, dispatch }) {
    try {
      dispatch("setLoading", true, { root: true });
      dispatch("clearError", null, { root: true });

      const response = await ApiService.getCategories();
      
      // Suporta múltiplos formatos de resposta:
      // 1. Array direto: ["cat1", "cat2"]
      // 2. Objeto com success: { success: true, data: [...], total: N }
      // 3. Objeto com categories: { categories: [...] }
      let categories = [];
      
      if (Array.isArray(response.data)) {
        categories = response.data;
      } else if (response.data?.success && Array.isArray(response.data.data)) {
        categories = response.data.data;
      } else if (response.data?.categories && Array.isArray(response.data.categories)) {
        categories = response.data.categories;
      } else {
        console.warn("Formato de categorias inesperado:", response.data);
        categories = [];
      }
      
      commit("SET_CATEGORIES", categories);
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      dispatch("setError", error.message, { root: true });
      throw error;
    } finally {
      dispatch("setLoading", false, { root: true });
    }
  },

  setCurrentCategory({ commit }, category) {
    commit("SET_CURRENT_CATEGORY", category);
  },
};

const getters = {
  allCategories: state => state.categories,
  currentCategory: state => state.currentCategory,
  categoriesCount: state => state.categories.length,
  categoryBySlug: state => slug => {
    return state.categories.find(cat => cat.slug === slug);
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
