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
      // O backend retorna { success: true, data: {...}, message: '...' }
      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      } else if (response.data && response.data.totalCourses !== undefined) {
        // Fallback se retornar diretamente
        return response.data;
      } else {
        console.warn("Formato de estatísticas inesperado:", response.data);
        return { totalCourses: 0, totalCategories: 0 };
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      return { totalCourses: 0, totalCategories: 0 };
    }
  },
  async fetchCourses({ commit, state, dispatch }) {
    try {
      dispatch("setLoading", true, { root: true });
      dispatch("clearError", null, { root: true });

      const response = await ApiService.getCourses(state.filters);
      
      // Suporta múltiplos formatos de resposta:
      // 1. Array direto: [...]
      // 2. Clean Architecture: { success: true, data: [...], pagination: {...} }
      // 3. Legacy: { success: true, courses: [...], total: N }
      let courses = [];
      let total = 0;
      
      if (Array.isArray(response.data)) {
        courses = response.data;
        total = response.data.length;
      } else if (response.data?.success && Array.isArray(response.data.data)) {
        courses = response.data.data;
        total = response.data.pagination?.total || courses.length;
      } else if (response.data?.success && Array.isArray(response.data.courses)) {
        courses = response.data.courses;
        total = response.data.total || courses.length;
      } else {
        console.warn("Formato de cursos inesperado:", response.data);
        courses = [];
        total = 0;
      }
      
      commit("SET_COURSES", courses);
      commit("SET_PAGINATION", { total });
    } catch (error) {
      console.error("Erro ao buscar cursos:", error);
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

      const response = await ApiService.getCourse(id);
      
      // Suporta múltiplos formatos de resposta:
      // 1. Clean Architecture: { success: true, data: {...} }
      // 2. Legacy: { success: true, course: {...} }
      let course = null;
      
      if (response.data?.success && response.data?.data) {
        course = response.data.data;
      } else if (response.data?.success && response.data?.course) {
        course = response.data.course;
      } else if (response.data?.id) {
        // Objeto direto
        course = response.data;
      } else {
        throw new Error("Curso não encontrado");
      }
      
      commit("SET_CURRENT_COURSE", course);
      return course;
    } catch (error) {
      console.error("Erro ao buscar curso:", error);
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
      
      // Suporta múltiplos formatos de resposta:
      // 1. Clean Architecture: { success: true, data: [...], pagination: {...} }
      // 2. Legacy: { success: true, courses: [...], total: N }
      let courses = [];
      let total = 0;
      
      if (response.data?.success && Array.isArray(response.data.data)) {
        courses = response.data.data;
        total = response.data.pagination?.total || courses.length;
      } else if (response.data?.success && Array.isArray(response.data.courses)) {
        courses = response.data.courses;
        total = response.data.total || courses.length;
      } else if (Array.isArray(response.data)) {
        courses = response.data;
        total = response.data.length;
      } else {
        console.warn("Formato de cursos por categoria inesperado:", response.data);
        courses = [];
        total = 0;
      }
      
      commit("SET_COURSES", courses);
      commit("SET_PAGINATION", { total });
    } catch (error) {
      console.error("Erro ao buscar cursos da categoria:", error);
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
