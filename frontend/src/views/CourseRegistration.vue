<template>
  <v-container fluid class="course-registration-page pa-6">
    <!-- Header da página -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">
          <v-icon class="mr-2" color="primary">mdi-plus-circle</v-icon>
          Cadastro de Cursos no WooCommerce
        </h1>
        <p class="text-body-1 text-grey-darken-1">
          Gerencie e autorize o cadastro de novos cursos identificados pelo scraping
        </p>
      </div>
      
      <div class="d-flex gap-3">
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-refresh"
          :loading="preparing"
          @click="prepareNewCourses"
        >
          Buscar Cursos Ausentes
        </v-btn>
      </div>
    </div>

    <!-- Cards de Estatísticas -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" color="warning" variant="tonal">
          <v-card-text class="d-flex align-center">
            <v-avatar color="warning" size="48" class="mr-4">
              <v-icon size="24">mdi-clock-outline</v-icon>
            </v-avatar>
            <div>
              <p class="text-h4 font-weight-bold mb-0">{{ pendingCount }}</p>
              <p class="text-caption text-grey-darken-1 mb-0">Aguardando Revisão</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" color="success" variant="tonal">
          <v-card-text class="d-flex align-center">
            <v-avatar color="success" size="48" class="mr-4">
              <v-icon size="24">mdi-check-circle</v-icon>
            </v-avatar>
            <div>
              <p class="text-h4 font-weight-bold mb-0">{{ approvedCount }}</p>
              <p class="text-caption text-grey-darken-1 mb-0">Aprovados</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" color="primary" variant="tonal">
          <v-card-text class="d-flex align-center">
            <v-avatar color="primary" size="48" class="mr-4">
              <v-icon size="24">mdi-cloud-upload</v-icon>
            </v-avatar>
            <div>
              <p class="text-h4 font-weight-bold mb-0">{{ registeredCount }}</p>
              <p class="text-caption text-grey-darken-1 mb-0">Cadastrados</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" color="error" variant="tonal">
          <v-card-text class="d-flex align-center">
            <v-avatar color="error" size="48" class="mr-4">
              <v-icon size="24">mdi-alert-circle</v-icon>
            </v-avatar>
            <div>
              <p class="text-h4 font-weight-bold mb-0">{{ failedCount }}</p>
              <p class="text-caption text-grey-darken-1 mb-0">Com Erro</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filtros e Ações -->
    <v-card class="mb-6" elevation="2">
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="searchQuery"
              prepend-inner-icon="mdi-magnify"
              label="Buscar cursos..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
              @update:model-value="debouncedSearch"
            />
          </v-col>
          
          <v-col cols="12" md="3">
            <v-select
              v-model="selectedStatus"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              @update:model-value="applyFilters"
            />
          </v-col>
          
          <v-col cols="12" md="3">
            <v-select
              v-model="selectedCategory"
              :items="availableCategories"
              label="Categoria"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              @update:model-value="applyFilters"
            />
          </v-col>
          
          <v-col cols="12" md="2" class="d-flex justify-end">
            <v-btn
              v-if="selectedIds.length > 0"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-check-all"
              :disabled="!canRegisterBatch"
              :loading="registering"
              @click="registerSelectedBatch"
            >
              Cadastrar ({{ selectedIds.length }})
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Mensagem de erro -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      closable
      class="mb-6"
      @click:close="clearError"
    >
      {{ error }}
    </v-alert>

    <!-- Loading -->
    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <!-- Lista de Registros -->
    <v-card v-else elevation="2">
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <span>
          <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
          {{ filteredRegistrations.length }} curso(s) encontrado(s)
        </span>
        
        <v-checkbox
          v-model="selectAllToggle"
          label="Selecionar todos"
          hide-details
          density="compact"
          @update:model-value="toggleSelectAll"
        />
      </v-card-title>
      
      <v-divider />
      
      <v-list v-if="filteredRegistrations.length > 0" lines="three">
        <template v-for="(registration, index) in filteredRegistrations" :key="registration.id">
          <v-list-item
            :class="{ 'bg-blue-lighten-5': selectedIds.includes(registration.id) }"
          >
            <template v-slot:prepend>
              <v-checkbox
                :model-value="selectedIds.includes(registration.id)"
                hide-details
                density="compact"
                class="mr-2"
                @update:model-value="toggleSelection(registration.id)"
              />
              <v-avatar size="56" :color="getStatusColor(registration.registrationStatus)" variant="tonal">
                <v-img
                  v-if="registration.imageUrl"
                  :src="registration.imageUrl"
                  cover
                >
                  <template v-slot:error>
                    <v-icon size="28">mdi-school</v-icon>
                  </template>
                </v-img>
                <v-icon v-else size="28">mdi-school</v-icon>
              </v-avatar>
            </template>
            
            <v-list-item-title class="font-weight-bold text-body-1 mb-1">
              {{ registration.name }}
            </v-list-item-title>
            
            <v-list-item-subtitle class="d-flex align-center flex-wrap gap-2">
              <v-chip size="small" :color="getStatusColor(registration.registrationStatus)" label>
                {{ getStatusLabel(registration.registrationStatus) }}
              </v-chip>
              <v-chip size="small" color="grey" variant="outlined" label>
                {{ registration.category || 'Sem categoria' }}
              </v-chip>
              <v-chip 
                v-if="needsDataCompletion(registration)" 
                size="small" 
                color="orange" 
                variant="tonal"
                prepend-icon="mdi-alert"
              >
                Dados incompletos
              </v-chip>
              <span v-if="registration.duration" class="text-caption text-grey">
                <v-icon size="14" class="mr-1">mdi-clock</v-icon>
                {{ registration.duration }}
              </span>
            </v-list-item-subtitle>

            <template v-slot:append>
              <div class="d-flex gap-1">
                <!-- Botão de visualizar/editar -->
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  color="primary"
                  @click="openEditDialog(registration)"
                >
                  <v-icon>mdi-pencil</v-icon>
                  <v-tooltip activator="parent">Editar</v-tooltip>
                </v-btn>
                
                <!-- Botão de aprovar (apenas para pendentes) -->
                <v-btn
                  v-if="registration.registrationStatus === 'pending_review'"
                  icon
                  size="small"
                  variant="text"
                  color="success"
                  :loading="saving && currentActionId === registration.id"
                  @click="approveRegistration(registration)"
                >
                  <v-icon>mdi-check</v-icon>
                  <v-tooltip activator="parent">Aprovar</v-tooltip>
                </v-btn>
                
                <!-- Botão de cadastrar (apenas para aprovados) -->
                <v-btn
                  v-if="registration.registrationStatus === 'approved'"
                  icon
                  size="small"
                  variant="text"
                  color="primary"
                  :loading="registering && currentActionId === registration.id"
                  @click="registerInWooCommerce(registration)"
                >
                  <v-icon>mdi-cloud-upload</v-icon>
                  <v-tooltip activator="parent">Cadastrar no WooCommerce</v-tooltip>
                </v-btn>
                
                <!-- Botão de rejeitar -->
                <v-btn
                  v-if="registration.registrationStatus !== 'registered'"
                  icon
                  size="small"
                  variant="text"
                  color="error"
                  @click="openRejectDialog(registration)"
                >
                  <v-icon>mdi-close</v-icon>
                  <v-tooltip activator="parent">Rejeitar</v-tooltip>
                </v-btn>
                
                <!-- Link externo se cadastrado -->
                <v-btn
                  v-if="registration.wooCommerceId"
                  icon
                  size="small"
                  variant="text"
                  color="grey"
                  :href="`https://unicaposead.com/?p=${registration.wooCommerceId}`"
                  target="_blank"
                >
                  <v-icon>mdi-open-in-new</v-icon>
                  <v-tooltip activator="parent">Ver no site</v-tooltip>
                </v-btn>
              </div>
            </template>
          </v-list-item>
          
          <v-divider v-if="index < filteredRegistrations.length - 1" />
        </template>
      </v-list>
      
      <!-- Estado vazio -->
      <v-card-text v-else class="text-center py-12">
        <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-inbox-outline</v-icon>
        <p class="text-h6 text-grey mb-2">Nenhum curso encontrado</p>
        <p class="text-body-2 text-grey-darken-1 mb-4">
          Clique em "Buscar Cursos Ausentes" para identificar novos cursos
        </p>
        <v-btn
          color="primary"
          prepend-icon="mdi-refresh"
          :loading="preparing"
          @click="prepareNewCourses"
        >
          Buscar Cursos Ausentes
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Dialog de Edição -->
    <v-dialog v-model="editDialog" max-width="900" persistent scrollable>
      <CourseRegistrationForm
        v-if="editingRegistration"
        :registration="editingRegistration"
        :saving="saving"
        @save="saveRegistration"
        @approve="approveAndSave"
        @cancel="closeEditDialog"
      />
    </v-dialog>

    <!-- Dialog de Rejeição -->
    <v-dialog v-model="rejectDialog" max-width="500">
      <v-card>
        <v-card-title class="bg-error text-white">
          <v-icon class="mr-2">mdi-close-circle</v-icon>
          Rejeitar Cadastro
        </v-card-title>
        
        <v-card-text class="pt-4">
          <p class="mb-4">
            Tem certeza que deseja rejeitar o cadastro de
            <strong>"{{ rejectingRegistration?.name }}"</strong>?
          </p>
          
          <v-textarea
            v-model="rejectReason"
            label="Motivo da rejeição *"
            variant="outlined"
            rows="3"
            :rules="[v => !!v || 'Informe o motivo']"
          />
        </v-card-text>
        
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="closeRejectDialog">Cancelar</v-btn>
          <v-btn
            color="error"
            :disabled="!rejectReason"
            :loading="saving"
            @click="confirmReject"
          >
            Rejeitar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar de feedback -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="4000"
      location="bottom right"
    >
      {{ snackbar.message }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Fechar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import CourseRegistrationForm from '@/components/CourseRegistrationForm.vue'

const store = useStore()

// Estado local
const searchQuery = ref('')
const selectedStatus = ref(null)
const selectedCategory = ref(null)
const selectAllToggle = ref(false)
const editDialog = ref(false)
const editingRegistration = ref(null)
const rejectDialog = ref(false)
const rejectingRegistration = ref(null)
const rejectReason = ref('')
const currentActionId = ref(null)
const snackbar = ref({ show: false, message: '', color: 'success' })

// Debounce timer
let searchTimer = null

// Computed do store
const loading = computed(() => store.state.registration.loading)
const preparing = computed(() => store.state.registration.preparing)
const saving = computed(() => store.state.registration.saving)
const registering = computed(() => store.state.registration.registering)
const error = computed(() => store.state.registration.error)
const registrations = computed(() => store.state.registration.registrations)
const selectedIds = computed(() => store.state.registration.selectedIds)
const filteredRegistrations = computed(() => store.getters['registration/filteredRegistrations'])
const pendingCount = computed(() => store.getters['registration/pendingCount'])
const approvedCount = computed(() => store.getters['registration/approvedCount'])
const registeredCount = computed(() => store.getters['registration/registeredCount'])
const failedCount = computed(() => store.getters['registration/failedCount'])
const availableCategories = computed(() => store.getters['registration/availableCategories'])
const canRegisterBatch = computed(() => store.getters['registration/canRegisterBatch'])

// Opções de status
const statusOptions = [
  { title: 'Aguardando Revisão', value: 'pending_review' },
  { title: 'Aprovados', value: 'approved' },
  { title: 'Rejeitados', value: 'rejected' },
  { title: 'Cadastrados', value: 'registered' },
  { title: 'Com Erro', value: 'failed' }
]

// Métodos auxiliares
const getStatusColor = (status) => {
  const colors = {
    pending_review: 'warning',
    approved: 'success',
    rejected: 'grey',
    registered: 'primary',
    failed: 'error'
  }
  return colors[status] || 'grey'
}

const getStatusLabel = (status) => {
  const labels = {
    pending_review: 'Aguardando Revisão',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    registered: 'Cadastrado',
    failed: 'Erro'
  }
  return labels[status] || status
}

// Verificar se registro precisa de dados adicionais
const needsDataCompletion = (registration) => {
  // Campos obrigatórios para cadastro no WooCommerce
  if (!registration.description || registration.description.length < 10) return true
  if (!registration.category) return true
  return false
}

// Ações
const prepareNewCourses = async () => {
  try {
    const result = await store.dispatch('registration/prepareCoursesForRegistration')
    const prepared = result.statistics?.preparedForRegistration || 0
    const needsCompletion = result.statistics?.needsCompletion || 0
    
    if (prepared > 0) {
      let message = `${prepared} curso(s) preparado(s) para revisão`
      if (needsCompletion > 0) {
        message += `. ${needsCompletion} precisam de dados adicionais.`
      }
      showSnackbar(message, 'success')
    } else {
      showSnackbar('Nenhum curso novo encontrado para preparar', 'info')
    }
    
    await loadRegistrations()
  } catch (err) {
    showSnackbar('Erro ao buscar cursos ausentes', 'error')
  }
}

const loadRegistrations = async () => {
  try {
    await store.dispatch('registration/fetchPendingRegistrations')
  } catch (err) {
    console.error('Erro ao carregar registros:', err)
  }
}

const debouncedSearch = (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    store.dispatch('registration/setFilters', { search: value })
  }, 300)
}

const applyFilters = () => {
  store.dispatch('registration/setFilters', {
    status: selectedStatus.value,
    category: selectedCategory.value
  })
}

const toggleSelection = (id) => {
  store.dispatch('registration/toggleSelection', id)
}

const toggleSelectAll = (value) => {
  if (value) {
    store.dispatch('registration/selectAll')
  } else {
    store.dispatch('registration/deselectAll')
  }
}

const clearError = () => {
  store.commit('registration/CLEAR_ERROR')
}

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

// Dialog de edição
const openEditDialog = (registration) => {
  editingRegistration.value = { ...registration }
  editDialog.value = true
}

const closeEditDialog = () => {
  editDialog.value = false
  editingRegistration.value = null
}

const saveRegistration = async (data) => {
  try {
    await store.dispatch('registration/updateRegistration', {
      id: editingRegistration.value.id,
      data
    })
    showSnackbar('Registro salvo com sucesso')
    closeEditDialog()
  } catch (err) {
    showSnackbar('Erro ao salvar registro', 'error')
  }
}

const approveAndSave = async (data) => {
  try {
    // Primeiro salva
    await store.dispatch('registration/updateRegistration', {
      id: editingRegistration.value.id,
      data
    })
    // Depois aprova
    await store.dispatch('registration/approveRegistration', {
      id: editingRegistration.value.id
    })
    showSnackbar('Curso aprovado com sucesso!')
    closeEditDialog()
  } catch (err) {
    showSnackbar('Erro ao aprovar curso', 'error')
  }
}

// Aprovar diretamente
const approveRegistration = async (registration) => {
  currentActionId.value = registration.id
  try {
    await store.dispatch('registration/approveRegistration', {
      id: registration.id
    })
    showSnackbar('Curso aprovado!')
  } catch (err) {
    showSnackbar('Erro ao aprovar curso', 'error')
  } finally {
    currentActionId.value = null
  }
}

// Cadastrar no WooCommerce
const registerInWooCommerce = async (registration) => {
  currentActionId.value = registration.id
  try {
    const result = await store.dispatch('registration/registerInWooCommerce', {
      id: registration.id
    })
    if (result.success) {
      showSnackbar(`Curso "${registration.name}" cadastrado no WooCommerce!`)
    } else {
      showSnackbar(result.message, 'error')
    }
  } catch (err) {
    showSnackbar('Erro ao cadastrar no WooCommerce', 'error')
  } finally {
    currentActionId.value = null
  }
}

// Cadastrar em batch
const registerSelectedBatch = async () => {
  try {
    const result = await store.dispatch('registration/registerBatch')
    showSnackbar(result.message, result.success ? 'success' : 'warning')
    store.dispatch('registration/deselectAll')
  } catch (err) {
    showSnackbar('Erro ao cadastrar cursos', 'error')
  }
}

// Dialog de rejeição
const openRejectDialog = (registration) => {
  rejectingRegistration.value = registration
  rejectReason.value = ''
  rejectDialog.value = true
}

const closeRejectDialog = () => {
  rejectDialog.value = false
  rejectingRegistration.value = null
  rejectReason.value = ''
}

const confirmReject = async () => {
  try {
    await store.dispatch('registration/rejectRegistration', {
      id: rejectingRegistration.value.id,
      reason: rejectReason.value
    })
    showSnackbar('Registro rejeitado')
    closeRejectDialog()
  } catch (err) {
    showSnackbar('Erro ao rejeitar', 'error')
  }
}

// Watch selectAllToggle sync
watch(selectedIds, (ids) => {
  const filtered = filteredRegistrations.value
  selectAllToggle.value = filtered.length > 0 && filtered.every(r => ids.includes(r.id))
})

// Carregar dados ao montar
onMounted(() => {
  loadRegistrations()
})
</script>

<style scoped>
.course-registration-page {
  max-width: 1400px;
  margin: 0 auto;
}

.stat-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}
</style>
