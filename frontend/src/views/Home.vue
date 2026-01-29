<template>
  <div>
    <!-- Hero Section -->
    <v-container fluid class="hero-section">
      <v-row align="center" justify="center" class="fill-height">
        <v-col cols="12" md="8" class="text-center">
          <h1 class="text-h2 font-weight-bold mb-4">
            Sistema de Cursos
          </h1>
          <p class="text-h5 mb-6">
            Gerencie cursos, monitore scraping e sincronize com WooCommerce
          </p>
          <v-btn
            size="large"
            color="white"
            variant="outlined"
            class="mr-3"
            @click="scrollToCourses"
          >
            <v-icon start>mdi-book-open-variant</v-icon>
            Ver Cursos
          </v-btn>
          <v-btn
            size="large"
            color="accent"
            @click="goToAdmin"
          >
            <v-icon start>mdi-cog</v-icon>
            Administração
          </v-btn>
        </v-col>
      </v-row>
    </v-container>

    <!-- Statistics -->
    <v-container class="py-8">
      <h2 class="text-h4 font-weight-bold mb-6 text-center">Estatísticas do Sistema</h2>
      
      <!-- Loading State -->
      <v-row v-if="loadingStats" justify="center">
        <v-col cols="12" class="text-center">
          <v-progress-circular indeterminate color="primary" size="48" />
          <p class="mt-3 text-body-1">Carregando estatísticas...</p>
        </v-col>
      </v-row>
      
      <!-- Stats Cards -->
      <v-row v-else>
        <v-col v-for="stat in statistics" :key="stat.title" cols="12" sm="6" md="3">
          <v-card 
            class="text-center pa-4 stat-card" 
            elevation="2" 
            :class="{ 'clickable': stat.route }" 
            @click="handleStatClick(stat)"
            :ripple="!!stat.route"
          >
            <v-icon size="48" :color="stat.color" class="mb-2">{{ stat.icon }}</v-icon>
            <h3 class="text-h4 font-weight-bold">{{ stat.value }}</h3>
            <p class="text-subtitle-1 mb-0">{{ stat.title }}</p>
            <v-chip 
              v-if="stat.route" 
              size="x-small" 
              color="grey-lighten-2" 
              class="mt-2"
            >
              <v-icon size="12" start>mdi-cursor-default-click</v-icon>
              Clique para ver
            </v-chip>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Navigation Cards - Quick Access -->
    <v-container class="py-6">
      <h2 class="text-h4 font-weight-bold mb-6 text-center">Acesso Rápido</h2>
      <v-row>
        <v-col cols="12" sm="6" md="4">
          <v-card class="nav-card pa-5" elevation="3" hover @click="goToAdmin">
            <div class="d-flex align-center mb-3">
              <v-avatar color="primary" size="56">
                <v-icon size="32" color="white">mdi-cog</v-icon>
              </v-avatar>
              <div class="ml-4">
                <h3 class="text-h6 font-weight-bold">Administração</h3>
                <p class="text-body-2 text-grey mb-0">Gerenciar cursos e configurações</p>
              </div>
            </div>
            <v-divider class="my-3" />
            <p class="text-body-2 mb-0">
              Visualize, edite e gerencie todos os cursos cadastrados no sistema.
            </p>
            <v-btn class="mt-3" color="primary" variant="tonal" block>
              Acessar <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="4">
          <v-card class="nav-card pa-5" elevation="3" hover @click="goToMonitor">
            <div class="d-flex align-center mb-3">
              <v-avatar color="warning" size="56">
                <v-icon size="32" color="white">mdi-radar</v-icon>
              </v-avatar>
              <div class="ml-4">
                <h3 class="text-h6 font-weight-bold">Monitor de Scraping</h3>
                <p class="text-body-2 text-grey mb-0">Acompanhe o processo de scraping</p>
              </div>
            </div>
            <v-divider class="my-3" />
            <p class="text-body-2 mb-0">
              Monitore em tempo real o processo de coleta de dados da Faculdade Única.
            </p>
            <v-btn class="mt-3" color="warning" variant="tonal" block>
              Acessar <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="4">
          <v-card class="nav-card pa-5" elevation="3" hover @click="goToComparison">
            <div class="d-flex align-center mb-3">
              <v-avatar color="success" size="56">
                <v-icon size="32" color="white">mdi-compare</v-icon>
              </v-avatar>
              <div class="ml-4">
                <h3 class="text-h6 font-weight-bold">Comparação WooCommerce</h3>
                <p class="text-body-2 text-grey mb-0">Sincronize com a loja virtual</p>
              </div>
            </div>
            <v-divider class="my-3" />
            <p class="text-body-2 mb-0">
              Compare e sincronize cursos com a loja WooCommerce. Exporte relatórios CSV.
            </p>
            <v-btn class="mt-3" color="success" variant="tonal" block>
              Acessar <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Categorias em Cards -->
    <div ref="coursesSection">
      <v-container class="py-6">
        <h2 class="text-h4 font-weight-bold mb-6 text-center">Categorias de Cursos</h2>
        
        <!-- Loading State -->
        <v-row v-if="loadingCategories" justify="center">
          <v-col cols="12" class="text-center">
            <v-progress-circular indeterminate color="primary" size="48" />
            <p class="mt-3 text-body-1">Carregando categorias...</p>
          </v-col>
        </v-row>

        <!-- Empty State -->
        <v-row v-else-if="categories.length === 0" justify="center">
          <v-col cols="12" md="6" class="text-center">
            <v-icon size="64" color="grey-lighten-1">mdi-folder-open-outline</v-icon>
            <p class="mt-3 text-body-1 text-grey">Nenhuma categoria encontrada</p>
            <v-btn color="primary" variant="outlined" @click="loadData">
              <v-icon start>mdi-refresh</v-icon>
              Tentar novamente
            </v-btn>
          </v-col>
        </v-row>

        <!-- Categories Grid -->
        <v-row v-else>
          <v-col
            v-for="category in categories"
            :key="category"
            cols="12" sm="6" md="4" lg="3"
          >
            <v-card class="category-card pa-4" elevation="2" hover @click="goToCategory(category)">
              <div class="d-flex align-center">
                <v-icon color="primary" size="28" class="mr-3">mdi-school</v-icon>
                <div>
                  <h3 class="text-subtitle-1 font-weight-medium">{{ category }}</h3>
                  <p class="text-caption text-grey mb-0">{{ getCategoryCount(category) }} cursos</p>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Ver todos os cursos -->
        <v-row v-if="categories.length > 0" class="mt-6" justify="center">
          <v-col cols="12" md="6" class="text-center">
            <v-btn size="large" color="primary" @click="goToAllCourses">
              <v-icon start>mdi-view-list</v-icon>
              Ver Todos os Cursos ({{ totalCourses }})
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <!-- Snackbar para erros -->
    <v-snackbar v-model="showError" color="error" :timeout="5000">
      {{ errorMessage }}
      <template v-slot:actions>
        <v-btn variant="text" @click="showError = false">Fechar</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import ApiService from '@/services/api'

const store = useStore()
const router = useRouter()
const coursesSection = ref(null)

// Reactive data
const loadingStats = ref(true)
const loadingCategories = ref(true)
const showError = ref(false)
const errorMessage = ref('')
const statsData = ref({
  totalCourses: 0,
  totalCategories: 0,
  coursesByCategory: {}
})

// Computed properties
const courses = computed(() => store.state.courses?.courses || [])
const categories = computed(() => store.state.categories?.categories || [])
const totalCourses = computed(() => statsData.value.totalCourses || courses.value.length)

// Calcular modalidades únicas dinamicamente
const uniqueModalities = computed(() => {
  if (!Array.isArray(courses.value) || courses.value.length === 0) return 1
  const modalities = new Set(courses.value.map(c => c.modality || 'EAD'))
  return modalities.size || 1
})

const statistics = computed(() => [
  { 
    title: 'Total de Cursos', 
    value: totalCourses.value, 
    icon: 'mdi-book-multiple', 
    color: 'primary',
    route: { name: 'AllCourses' },
    description: 'Ver todos os cursos'
  },
  { 
    title: 'Categorias', 
    value: statsData.value.totalCategories || categories.value.length, 
    icon: 'mdi-folder-multiple', 
    color: 'success',
    route: null,
    action: 'scrollToCategories',
    description: 'Ver categorias'
  },
  { 
    title: 'Modalidades', 
    value: uniqueModalities.value, 
    icon: 'mdi-school', 
    color: 'warning',
    route: null,
    description: null
  },
  { 
    title: 'Status', 
    value: totalCourses.value > 0 ? 'Online' : 'Offline', 
    icon: totalCourses.value > 0 ? 'mdi-check-circle' : 'mdi-alert-circle', 
    color: totalCourses.value > 0 ? 'info' : 'error',
    route: { name: 'ScrapingMonitor' },
    description: 'Ver monitor'
  }
])

// Métodos
const scrollToCourses = () => {
  if (coursesSection.value) {
    coursesSection.value.scrollIntoView({ behavior: 'smooth' })
  }
}

const scrollToCategories = () => {
  if (coursesSection.value) {
    coursesSection.value.scrollIntoView({ behavior: 'smooth' })
  }
}

const handleStatClick = (stat) => {
  if (stat.route) {
    router.push(stat.route)
  } else if (stat.action === 'scrollToCategories') {
    scrollToCategories()
  }
}

const goToCategory = (category) => {
  router.push({ name: 'CategoryCourses', params: { category } })
}

const goToAdmin = () => {
  router.push({ name: 'Admin' })
}

const goToAllCourses = () => {
  router.push({ name: 'AllCourses' })
}

const goToMonitor = () => {
  router.push({ name: 'ScrapingMonitor' })
}

const goToComparison = () => {
  router.push({ name: 'WooCommerceComparison' })
}

const getCategoryCount = (category) => {
  return statsData.value.coursesByCategory?.[category] || 
         courses.value.filter(c => c.category === category).length
}

const loadData = async () => {
  loadingStats.value = true
  loadingCategories.value = true
  showError.value = false

  try {
    // Carregar estatísticas diretamente da API
    const statsResponse = await ApiService.getStatistics()
    if (statsResponse.data?.success && statsResponse.data?.data) {
      statsData.value = statsResponse.data.data
    } else if (statsResponse.data) {
      statsData.value = statsResponse.data
    }
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error)
    errorMessage.value = 'Erro ao carregar estatísticas. Verifique se o servidor está rodando.'
    showError.value = true
  } finally {
    loadingStats.value = false
  }

  try {
    // Carregar categorias via store
    await store.dispatch('categories/fetchCategories')
  } catch (error) {
    console.error('Erro ao carregar categorias:', error)
  } finally {
    loadingCategories.value = false
  }

  try {
    // Carregar cursos via store (para ter dados locais)
    await store.dispatch('courses/fetchCourses')
  } catch (error) {
    console.error('Erro ao carregar cursos:', error)
  }
}

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.hero-section {
  background: linear-gradient(135deg, #1976D2 0%, #7B1FA2 100%);
  color: white;
  min-height: 350px;
  display: flex;
  align-items: center;
}

.stat-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card.clickable {
  cursor: pointer;
}

.stat-card.clickable:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
}

.stat-card.clickable:active {
  transform: translateY(-2px);
}

.nav-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;
}

.nav-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
}

.category-card {
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.category-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(118, 75, 162, 0.25);
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-color: rgba(var(--v-theme-primary), 0.4);
}

.category-card:active {
  transform: translateY(-1px);
}
</style>