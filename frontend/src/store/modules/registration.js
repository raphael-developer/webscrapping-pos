/**
 * @fileoverview Store Vuex - Registro de Cursos no WooCommerce
 * Gerencia estado do cadastro assistido de cursos
 */

import api from '@/services/api';

// Status possíveis dos registros
export const RegistrationStatus = {
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REGISTERED: 'registered',
  FAILED: 'failed'
};

const state = {
  // Registros
  registrations: [],
  currentRegistration: null,
  
  // Loading states
  loading: false,
  preparing: false,
  saving: false,
  registering: false,
  
  // Estatísticas
  statistics: null,
  
  // Filtros
  filters: {
    status: null,
    category: null,
    search: ''
  },
  
  // Paginação
  pagination: {
    page: 1,
    perPage: 20,
    total: 0
  },
  
  // Erros
  error: null,
  
  // Seleção para ações em batch
  selectedIds: []
};

const getters = {
  // Registros filtrados
  filteredRegistrations: (state) => {
    let result = [...state.registrations];
    
    if (state.filters.status) {
      result = result.filter(r => r.registrationStatus === state.filters.status);
    }
    
    if (state.filters.category) {
      result = result.filter(r => 
        r.category?.toLowerCase() === state.filters.category.toLowerCase()
      );
    }
    
    if (state.filters.search) {
      const search = state.filters.search.toLowerCase();
      result = result.filter(r => 
        r.name?.toLowerCase().includes(search) ||
        r.description?.toLowerCase().includes(search)
      );
    }
    
    return result;
  },
  
  // Contagens por status
  pendingCount: (state) => 
    state.registrations.filter(r => r.registrationStatus === RegistrationStatus.PENDING_REVIEW).length,
  
  approvedCount: (state) =>
    state.registrations.filter(r => r.registrationStatus === RegistrationStatus.APPROVED).length,
  
  registeredCount: (state) =>
    state.registrations.filter(r => r.registrationStatus === RegistrationStatus.REGISTERED).length,
  
  failedCount: (state) =>
    state.registrations.filter(r => r.registrationStatus === RegistrationStatus.FAILED).length,
  
  // Categorias únicas nos registros
  availableCategories: (state) => {
    const categories = new Set();
    state.registrations.forEach(r => {
      if (r.category) categories.add(r.category);
    });
    return Array.from(categories).sort();
  },
  
  // Registros selecionados
  selectedRegistrations: (state) =>
    state.registrations.filter(r => state.selectedIds.includes(r.id)),
  
  // Verificar se todos estão selecionados
  allSelected: (state, getters) =>
    getters.filteredRegistrations.length > 0 && 
    getters.filteredRegistrations.every(r => state.selectedIds.includes(r.id)),
  
  // Verificar se pode fazer cadastro em batch
  canRegisterBatch: (state, getters) =>
    getters.selectedRegistrations.filter(r => 
      r.registrationStatus === RegistrationStatus.APPROVED
    ).length > 0
};

const mutations = {
  SET_REGISTRATIONS(state, registrations) {
    state.registrations = registrations;
  },
  
  SET_CURRENT_REGISTRATION(state, registration) {
    state.currentRegistration = registration;
  },
  
  UPDATE_REGISTRATION(state, updatedRegistration) {
    const index = state.registrations.findIndex(r => r.id === updatedRegistration.id);
    if (index !== -1) {
      state.registrations.splice(index, 1, updatedRegistration);
    }
    if (state.currentRegistration?.id === updatedRegistration.id) {
      state.currentRegistration = updatedRegistration;
    }
  },
  
  REMOVE_REGISTRATION(state, id) {
    state.registrations = state.registrations.filter(r => r.id !== id);
    if (state.currentRegistration?.id === id) {
      state.currentRegistration = null;
    }
    state.selectedIds = state.selectedIds.filter(i => i !== id);
  },
  
  ADD_REGISTRATIONS(state, registrations) {
    // Adicionar apenas novos (evitar duplicatas)
    const existingIds = new Set(state.registrations.map(r => r.id));
    const newRegistrations = registrations.filter(r => !existingIds.has(r.id));
    state.registrations.push(...newRegistrations);
  },
  
  SET_LOADING(state, loading) {
    state.loading = loading;
  },
  
  SET_PREPARING(state, preparing) {
    state.preparing = preparing;
  },
  
  SET_SAVING(state, saving) {
    state.saving = saving;
  },
  
  SET_REGISTERING(state, registering) {
    state.registering = registering;
  },
  
  SET_STATISTICS(state, statistics) {
    state.statistics = statistics;
  },
  
  SET_FILTERS(state, filters) {
    state.filters = { ...state.filters, ...filters };
  },
  
  RESET_FILTERS(state) {
    state.filters = {
      status: null,
      category: null,
      search: ''
    };
  },
  
  SET_PAGINATION(state, pagination) {
    state.pagination = { ...state.pagination, ...pagination };
  },
  
  SET_ERROR(state, error) {
    state.error = error;
  },
  
  CLEAR_ERROR(state) {
    state.error = null;
  },
  
  // Seleção
  SELECT_REGISTRATION(state, id) {
    if (!state.selectedIds.includes(id)) {
      state.selectedIds.push(id);
    }
  },
  
  DESELECT_REGISTRATION(state, id) {
    state.selectedIds = state.selectedIds.filter(i => i !== id);
  },
  
  SELECT_ALL(state, ids) {
    state.selectedIds = [...new Set([...state.selectedIds, ...ids])];
  },
  
  DESELECT_ALL(state) {
    state.selectedIds = [];
  },
  
  TOGGLE_SELECTION(state, id) {
    const index = state.selectedIds.indexOf(id);
    if (index === -1) {
      state.selectedIds.push(id);
    } else {
      state.selectedIds.splice(index, 1);
    }
  }
};

const actions = {
  /**
   * Busca registros pendentes de revisão
   */
  async fetchPendingRegistrations({ commit }, params = {}) {
    commit('SET_LOADING', true);
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.getPendingRegistrations(params);
      
      if (response.data.success) {
        commit('SET_REGISTRATIONS', response.data.data);
        if (response.data.statistics) {
          commit('SET_STATISTICS', response.data.statistics);
        }
      }
      
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },
  
  /**
   * Busca registros aprovados
   */
  async fetchApprovedRegistrations({ commit }) {
    commit('SET_LOADING', true);
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.getApprovedRegistrations();
      
      if (response.data.success) {
        // Mesclar com registros existentes
        const approved = response.data.data;
        commit('SET_REGISTRATIONS', approved);
      }
      
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },
  
  /**
   * Busca detalhes de um registro
   */
  async fetchRegistrationDetails({ commit }, id) {
    commit('SET_LOADING', true);
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.getRegistrationDetails(id);
      
      if (response.data.success) {
        commit('SET_CURRENT_REGISTRATION', response.data.data.registration);
      }
      
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },
  
  /**
   * Busca estatísticas
   */
  async fetchStatistics({ commit }) {
    try {
      const response = await api.getRegistrationStatistics();
      
      if (response.data.success) {
        commit('SET_STATISTICS', response.data.data);
      }
      
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  },
  
  /**
   * Prepara cursos ausentes para cadastro
   */
  async prepareCoursesForRegistration({ commit }, params = {}) {
    commit('SET_PREPARING', true);
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.prepareCoursesForRegistration(params);
      
      if (response.data.success) {
        // Adicionar novos registros preparados
        commit('ADD_REGISTRATIONS', response.data.data.prepared);
      }
      
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_PREPARING', false);
    }
  },
  
  /**
   * Atualiza um registro
   */
  async updateRegistration({ commit }, { id, data }) {
    commit('SET_SAVING', true);
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.updateRegistration(id, data);
      
      if (response.data.success) {
        commit('UPDATE_REGISTRATION', response.data.data);
      }
      
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_SAVING', false);
    }
  },
  
  /**
   * Aprova um registro para cadastro
   */
  async approveRegistration({ commit }, { id, userId = 'admin' }) {
    commit('SET_SAVING', true);
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.approveRegistration(id, userId);
      
      if (response.data.success) {
        commit('UPDATE_REGISTRATION', response.data.data);
      }
      
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_SAVING', false);
    }
  },
  
  /**
   * Rejeita um registro
   */
  async rejectRegistration({ commit }, { id, reason }) {
    commit('SET_SAVING', true);
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.rejectRegistration(id, reason);
      
      if (response.data.success) {
        commit('UPDATE_REGISTRATION', response.data.data);
      }
      
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_SAVING', false);
    }
  },
  
  /**
   * Cadastra um curso no WooCommerce
   */
  async registerInWooCommerce({ commit }, { id, userId = 'admin' }) {
    commit('SET_REGISTERING', true);
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.registerInWooCommerce(id, userId);
      
      if (response.data.success) {
        commit('UPDATE_REGISTRATION', response.data.data.registration);
      }
      
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_REGISTERING', false);
    }
  },
  
  /**
   * Cadastra múltiplos cursos no WooCommerce
   */
  async registerBatch({ commit, state }, userId = 'admin') {
    // Filtrar apenas aprovados dos selecionados
    const approvedIds = state.selectedIds.filter(id => {
      const reg = state.registrations.find(r => r.id === id);
      return reg && reg.registrationStatus === RegistrationStatus.APPROVED;
    });
    
    if (approvedIds.length === 0) {
      throw new Error('Nenhum registro aprovado selecionado');
    }
    
    commit('SET_REGISTERING', true);
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.registerBatch(approvedIds, userId);
      
      // Atualizar registros cadastrados com sucesso
      if (response.data.data?.successful) {
        for (const item of response.data.data.successful) {
          const reg = state.registrations.find(r => r.id === item.registrationId);
          if (reg) {
            commit('UPDATE_REGISTRATION', {
              ...reg,
              registrationStatus: RegistrationStatus.REGISTERED,
              wooCommerceId: item.wooCommerceId
            });
          }
        }
      }
      
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_REGISTERING', false);
    }
  },
  
  /**
   * Remove um registro
   */
  async deleteRegistration({ commit }, id) {
    commit('SET_SAVING', true);
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.deleteRegistration(id);
      
      if (response.data.success) {
        commit('REMOVE_REGISTRATION', id);
      }
      
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_SAVING', false);
    }
  },
  
  /**
   * Atualiza filtros
   */
  setFilters({ commit }, filters) {
    commit('SET_FILTERS', filters);
  },
  
  /**
   * Limpa filtros
   */
  resetFilters({ commit }) {
    commit('RESET_FILTERS');
  },
  
  /**
   * Seleciona/deseleciona registro
   */
  toggleSelection({ commit }, id) {
    commit('TOGGLE_SELECTION', id);
  },
  
  /**
   * Seleciona todos os registros filtrados
   */
  selectAll({ commit, getters }) {
    const ids = getters.filteredRegistrations.map(r => r.id);
    commit('SELECT_ALL', ids);
  },
  
  /**
   * Deseleciona todos
   */
  deselectAll({ commit }) {
    commit('DESELECT_ALL');
  },
  
  /**
   * Limpa estado
   */
  clearState({ commit }) {
    commit('SET_REGISTRATIONS', []);
    commit('SET_CURRENT_REGISTRATION', null);
    commit('SET_STATISTICS', null);
    commit('RESET_FILTERS');
    commit('DESELECT_ALL');
    commit('CLEAR_ERROR');
  }
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
};
