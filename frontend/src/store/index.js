// Mutations e actions globais para loading e error
const state = {
  loading: false,
  error: null,
};

const mutations = {
  setLoading(state, value) {
    state.loading = value;
  },
  setError(state, error) {
    state.error = error;
  },
  clearError(state) {
    state.error = null;
  },
};

const actions = {
  setLoading({ commit }, value) {
    commit("setLoading", value);
  },
  setError({ commit }, error) {
    commit("setError", error);
  },
  clearError({ commit }) {
    commit("clearError");
  },
};
import { createStore } from "vuex";
import courses from "./modules/courses";
import categories from "./modules/categories";
import scraper from "./modules/scraper";

export default createStore({
  state,
  mutations,
  actions,
  modules: {
    courses,
    categories,
    scraper,
  },
});
