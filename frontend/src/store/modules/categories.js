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
      // Se o backend retorna um array direto
      if (Array.isArray(response.data)) {
        commit("SET_CATEGORIES", response.data);
      } else if (response.data && response.data.success) {
        commit("SET_CATEGORIES", response.data.categories);
      } else {
        throw new Error(response.message || "Erro ao buscar categorias");
      }
    } catch (error) {
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
