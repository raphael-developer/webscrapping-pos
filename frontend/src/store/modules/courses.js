import ApiService from "@/services/api";

const state = {
  courses: [],
  currentCourse: null,
  filters: {
    category: "",
    search: "",
    limit: null,
  },
  pagination: {
    page: 1,
    itemsPerPage: 12,
    total: 0,
  },
};

const mutations = {
  SET_COURSES(state, courses) {
    state.courses = courses;
  },
  SET_CURRENT_COURSE(state, course) {
    state.currentCourse = course;
  },
  SET_FILTERS(state, filters) {
    state.filters = { ...state.filters, ...filters };
  },
  SET_PAGINATION(state, pagination) {
    state.pagination = { ...state.pagination, ...pagination };
  },
  CLEAR_FILTERS(state) {
    state.filters = {
      category: "",
      search: "",
      limit: null,
    };
  },
};

const actions = {
  async fetchStatistics() {
    // Busca estatísticas reais do backend
    try {
      const response = await ApiService.getStatistics();
      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        return { totalCourses: 0, totalCategories: 0 };
      }
    } catch (error) {
      return { totalCourses: 0, totalCategories: 0 };
    }
  },
  async fetchCourses({ commit, state, dispatch }) {
    try {
      dispatch("setLoading", true, { root: true });
      dispatch("clearError", null, { root: true });

      const response = await ApiService.getCourses(state.filters);
      // Se o backend retorna um array direto
      if (Array.isArray(response.data)) {
        commit("SET_COURSES", response.data);
        commit("SET_PAGINATION", { total: response.data.length });
      } else if (response.data && response.data.success) {
        commit("SET_COURSES", response.data.courses);
        commit("SET_PAGINATION", { total: response.data.total });
      } else {
        throw new Error(response.message || "Erro ao buscar cursos");
      }
    } catch (error) {
      dispatch("setError", error.message, { root: true });
      throw error;
    } finally {
      dispatch("setLoading", false, { root: true });
    }
  },

  async fetchCourseById({ commit, dispatch }, id) {
    try {
      dispatch("setLoading", true, { root: true });
      dispatch("clearError", null, { root: true });

      const response = await ApiService.getCourseById(id);

      if (response.success) {
        commit("SET_CURRENT_COURSE", response.data);
        return response.data;
      } else {
        throw new Error(response.message || "Erro ao buscar curso");
      }
    } catch (error) {
      dispatch("setError", error.message, { root: true });
      throw error;
    } finally {
      dispatch("setLoading", false, { root: true });
    }
  },

  async fetchCoursesByCategory({ commit, dispatch }, category) {
    try {
      dispatch("setLoading", true, { root: true });
      dispatch("clearError", null, { root: true });

      const response = await ApiService.getCoursesByCategory(category);

      if (response.success) {
        commit("SET_COURSES", response.data.courses);
        commit("SET_PAGINATION", {
          total: response.data.total,
        });
      } else {
        throw new Error(
          response.message || "Erro ao buscar cursos da categoria"
        );
      }
    } catch (error) {
      dispatch("setError", error.message, { root: true });
      throw error;
    } finally {
      dispatch("setLoading", false, { root: true });
    }
  },

  setFilters({ commit, dispatch }, filters) {
    commit("SET_FILTERS", filters);
    return dispatch("fetchCourses");
  },

  clearFilters({ commit, dispatch }) {
    commit("CLEAR_FILTERS");
    return dispatch("fetchCourses");
  },

  setPagination({ commit }, pagination) {
    commit("SET_PAGINATION", pagination);
  },
};

const getters = {
  allCourses: state => state.courses,
  currentCourse: state => state.currentCourse,
  filteredCourses: state => {
    let courses = [...state.courses];

    // Aplicar paginação
    const start = (state.pagination.page - 1) * state.pagination.itemsPerPage;
    const end = start + state.pagination.itemsPerPage;

    return courses.slice(start, end);
  },
  coursesCount: state => state.courses.length,
  filters: state => state.filters,
  pagination: state => state.pagination,
  coursesByCategory: state => {
    const grouped = {};
    state.courses.forEach(course => {
      if (!grouped[course.category]) {
        grouped[course.category] = [];
      }
      grouped[course.category].push(course);
    });
    return grouped;
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
