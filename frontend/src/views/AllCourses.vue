<template>
  <v-container>
    <!-- Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between flex-wrap">
          <div>
            <h1 class="text-h3 font-weight-bold mb-2">Todos os Cursos</h1>
            <p class="text-subtitle-1 text-grey mb-0">
              Mostrando {{ filteredCourses.length }} de {{ courses.length }} cursos
            </p>
          </div>
          <v-chip color="primary" size="large" class="mt-2 mt-md-0">
            <v-icon start>mdi-book-multiple</v-icon>
            Total: {{ courses.length }} cursos
          </v-chip>
        </div>
      </v-col>
    </v-row>

    <!-- Filtros -->
    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Buscar cursos..."
          variant="outlined"
          density="comfortable"
          clearable
          hide-details
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-select
          v-model="selectedCategory"
          :items="categoryOptions"
          label="Filtrar por categoria"
          variant="outlined"
          density="comfortable"
          clearable
          hide-details
        />
      </v-col>
      <v-col cols="12" md="4" class="d-flex align-center">
        <v-btn-toggle v-model="viewMode" mandatory density="comfortable">
          <v-btn value="grid" icon="mdi-view-grid" />
          <v-btn value="list" icon="mdi-view-list" />
        </v-btn-toggle>
        <v-spacer />
        <v-chip color="primary" variant="outlined">
          {{ filteredCourses.length }} cursos
        </v-chip>
      </v-col>
    </v-row>

    <!-- Loading -->
    <v-row v-if="loading" justify="center" class="py-12">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4 text-body-1">Carregando cursos...</p>
      </v-col>
    </v-row>

    <!-- Grid View -->
    <v-row v-else-if="viewMode === 'grid'">
      <v-col
        v-for="course in paginatedCourses"
        :key="course.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <CourseCard :course="course" />
      </v-col>
    </v-row>

    <!-- List View -->
    <v-row v-else>
      <v-col cols="12">
        <v-card>
          <v-list lines="two">
            <v-list-item
              v-for="course in paginatedCourses"
              :key="course.id"
              :title="course.name || course.title"
              :subtitle="course.category"
              @click="goToCourse(course.id)"
              class="cursor-pointer"
            >
              <template v-slot:prepend>
                <v-avatar color="primary" size="48">
                  <v-icon color="white">mdi-school</v-icon>
                </v-avatar>
              </template>
              <template v-slot:append>
                <v-chip size="small" color="primary" variant="outlined">
                  {{ course.modality || 'EAD' }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-if="!loading && filteredCourses.length === 0" justify="center" class="py-12">
      <v-col cols="12" md="6" class="text-center">
        <v-icon size="80" color="grey-lighten-1">mdi-book-search-outline</v-icon>
        <h3 class="text-h5 mt-4 mb-2">Nenhum curso encontrado</h3>
        <p class="text-body-1 text-grey">Tente ajustar os filtros de busca</p>
        <v-btn color="primary" variant="outlined" class="mt-4" @click="clearFilters">
          <v-icon start>mdi-filter-remove</v-icon>
          Limpar Filtros
        </v-btn>
      </v-col>
    </v-row>

    <!-- Pagination -->
    <v-row v-if="totalPages > 1" justify="center" class="mt-6">
      <v-col cols="12" class="d-flex justify-center">
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="7"
          rounded="circle"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter, useRoute } from 'vue-router'
import CourseCard from '@/components/CourseCard.vue'

const store = useStore()
const router = useRouter()
const route = useRoute()

// State
const loading = ref(true)
const search = ref('')
const selectedCategory = ref(null)
const viewMode = ref('grid')
const currentPage = ref(1)
const itemsPerPage = 24

// Computed
const courses = computed(() => store.state.courses?.courses || [])
const categories = computed(() => store.state.categories?.categories || [])

const categoryOptions = computed(() => {
  return ['Todas as categorias', ...categories.value]
})

const filteredCourses = computed(() => {
  let result = [...courses.value]
  
  // Filtrar por busca
  if (search.value) {
    const searchLower = search.value.toLowerCase()
    result = result.filter(course => {
      const name = (course.name || course.title || '').toLowerCase()
      const category = (course.category || '').toLowerCase()
      return name.includes(searchLower) || category.includes(searchLower)
    })
  }
  
  // Filtrar por categoria
  if (selectedCategory.value && selectedCategory.value !== 'Todas as categorias') {
    result = result.filter(course => course.category === selectedCategory.value)
  }
  
  return result
})

const totalPages = computed(() => Math.ceil(filteredCourses.value.length / itemsPerPage))

const paginatedCourses = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredCourses.value.slice(start, end)
})

// Methods
const goToCourse = (id) => {
  router.push({ name: 'CourseDetail', params: { id } })
}

const clearFilters = () => {
  search.value = ''
  selectedCategory.value = null
  currentPage.value = 1
}

const loadData = async () => {
  loading.value = true
  try {
    await Promise.all([
      store.dispatch('courses/fetchCourses'),
      store.dispatch('categories/fetchCategories')
    ])
    
    console.log('Cursos carregados:', store.state.courses?.courses?.length || 0)
    console.log('Categorias carregadas:', store.state.categories?.categories?.length || 0)
    
    // Verificar se veio da URL com categoria
    if (route.query.category) {
      selectedCategory.value = route.query.category
    }
    if (route.query.search) {
      search.value = route.query.search
    }
  } catch (error) {
    console.error('Erro ao carregar dados:', error)
  } finally {
    loading.value = false
  }
}

// Reset page when filters change
watch([search, selectedCategory], () => {
  currentPage.value = 1
})

// Watch for URL query changes (from header search)
watch(() => route.query.search, (newSearch) => {
  if (newSearch) {
    search.value = newSearch
  }
}, { immediate: true })

watch(() => route.query.category, (newCategory) => {
  if (newCategory) {
    selectedCategory.value = newCategory
  }
}, { immediate: true })

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>
