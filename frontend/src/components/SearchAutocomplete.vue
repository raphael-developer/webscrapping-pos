<template>
  <div class="search-autocomplete" ref="searchContainer">
    <v-text-field
      v-model="searchQuery"
      hide-details
      :placeholder="placeholder"
      prepend-inner-icon="mdi-magnify"
      variant="solo"
      density="comfortable"
      class="search-field"
      bg-color="white"
      color="primary"
      base-color="primary"
      clearable
      single-line
      :loading="isSearching"
      @input="onInput"
      @keyup.enter="onEnter"
      @keydown.down.prevent="onArrowDown"
      @keydown.up.prevent="onArrowUp"
      @keydown.escape="closeResults"
      @focus="onFocus"
      @click:clear="clearSearch"
    >
      <template v-slot:append-inner v-if="isSearching">
        <v-progress-circular size="20" width="2" indeterminate color="primary" />
      </template>
    </v-text-field>

    <!-- Dropdown de resultados -->
    <Teleport to="body">
      <v-card
        v-if="showResults && (filteredResults.length > 0 || searchQuery.length >= minChars)"
        class="search-results elevation-12"
        :style="dropdownStyle"
      >
      <!-- Loading -->
      <div v-if="isSearching" class="pa-4 text-center">
        <v-progress-circular size="24" indeterminate color="primary" />
        <p class="text-caption mt-2 mb-0">Buscando...</p>
      </div>

      <!-- Resultados -->
      <v-list v-else-if="filteredResults.length > 0" density="compact" class="py-0">
        <!-- Cursos -->
        <template v-if="courseResults.length > 0">
          <v-list-subheader class="text-primary font-weight-bold">
            <v-icon size="16" class="mr-1">mdi-book</v-icon>
            Cursos ({{ courseResults.length }})
          </v-list-subheader>
          <v-list-item
            v-for="(course, index) in courseResults.slice(0, 5)"
            :key="'course-' + course.id"
            :class="{ 'v-list-item--active': selectedIndex === index }"
            @click="selectCourse(course)"
            @mouseenter="selectedIndex = index"
          >
            <template v-slot:prepend>
              <v-avatar size="32" color="primary" variant="tonal">
                <v-icon size="18">mdi-school</v-icon>
              </v-avatar>
            </template>
            <v-list-item-title>
              <span v-html="highlightMatch(course.name || course.title)"></span>
            </v-list-item-title>
            <v-list-item-subtitle>{{ course.category }}</v-list-item-subtitle>
          </v-list-item>
        </template>

        <!-- Categorias -->
        <template v-if="categoryResults.length > 0">
          <v-divider v-if="courseResults.length > 0" />
          <v-list-subheader class="text-success font-weight-bold">
            <v-icon size="16" class="mr-1">mdi-folder</v-icon>
            Categorias ({{ categoryResults.length }})
          </v-list-subheader>
          <v-list-item
            v-for="(category, index) in categoryResults"
            :key="'category-' + category.name"
            :class="{ 'v-list-item--active': selectedIndex === courseResults.slice(0, 5).length + index }"
            @click="selectCategory(category)"
            @mouseenter="selectedIndex = courseResults.slice(0, 5).length + index"
          >
            <template v-slot:prepend>
              <v-avatar size="32" color="success" variant="tonal">
                <v-icon size="18">mdi-folder</v-icon>
              </v-avatar>
            </template>
            <v-list-item-title>
              <span v-html="highlightMatch(category.name)"></span>
            </v-list-item-title>
            <v-list-item-subtitle>{{ category.count }} cursos</v-list-item-subtitle>
          </v-list-item>
        </template>

        <!-- Ver todos os resultados -->
        <v-divider />
        <v-list-item @click="viewAllResults" class="text-primary">
          <template v-slot:prepend>
            <v-icon>mdi-magnify</v-icon>
          </template>
          <v-list-item-title class="font-weight-medium">
            Ver todos os resultados para "{{ searchQuery }}"
          </v-list-item-title>
        </v-list-item>
      </v-list>

      <!-- Sem resultados -->
      <div v-else-if="searchQuery.length >= minChars && !isSearching" class="pa-4 text-center">
        <v-icon size="48" color="grey-lighten-1">mdi-magnify-close</v-icon>
        <p class="text-body-2 text-grey mt-2 mb-0">
          Nenhum resultado para "{{ searchQuery }}"
        </p>
      </div>

      <!-- Mínimo de caracteres -->
      <div v-else-if="searchQuery.length > 0 && searchQuery.length < minChars" class="pa-3 text-center">
        <p class="text-caption text-grey mb-0">
          Digite pelo menos {{ minChars }} caracteres
        </p>
      </div>
    </v-card>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'

const props = defineProps({
  placeholder: {
    type: String,
    default: 'Buscar cursos...'
  },
  maxWidth: {
    type: String,
    default: '300px'
  },
  resultsWidth: {
    type: String,
    default: '400px'
  },
  minChars: {
    type: Number,
    default: 2
  },
  debounceMs: {
    type: Number,
    default: 300
  }
})

const emit = defineEmits(['select-course', 'select-category', 'search'])

const router = useRouter()
const store = useStore()

const searchQuery = ref('')
const showResults = ref(false)
const isSearching = ref(false)
const selectedIndex = ref(-1)
const searchContainer = ref(null)
const dropdownPosition = ref({ top: 0, left: 0, width: 400 })
let debounceTimer = null

// Computed para estilo do dropdown (Teleport)
const dropdownStyle = computed(() => ({
  position: 'fixed',
  top: `${dropdownPosition.value.top}px`,
  left: `${dropdownPosition.value.left}px`,
  width: `${dropdownPosition.value.width}px`,
  maxWidth: props.resultsWidth,
  zIndex: 9999
}))

// Atualiza posição do dropdown
const updateDropdownPosition = () => {
  if (searchContainer.value) {
    const rect = searchContainer.value.getBoundingClientRect()
    dropdownPosition.value = {
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 400)
    }
  }
}

// Dados do store
const allCourses = computed(() => store.state.courses?.courses || [])
const allCategories = computed(() => store.state.categories?.categories || [])

// Resultados filtrados
const courseResults = computed(() => {
  if (searchQuery.value.length < props.minChars) return []
  
  const query = searchQuery.value.toLowerCase().trim()
  return allCourses.value.filter(course => {
    const name = (course.name || course.title || '').toLowerCase()
    const category = (course.category || '').toLowerCase()
    return name.includes(query) || category.includes(query)
  }).slice(0, 10) // Limita a 10 para performance
})

const categoryResults = computed(() => {
  if (searchQuery.value.length < props.minChars) return []
  
  const query = searchQuery.value.toLowerCase().trim()
  return allCategories.value
    .filter(cat => cat.toLowerCase().includes(query))
    .map(cat => ({
      name: cat,
      count: allCourses.value.filter(c => c.category === cat).length
    }))
})

const filteredResults = computed(() => {
  return [...courseResults.value, ...categoryResults.value]
})

// Highlight do texto encontrado
const highlightMatch = (text) => {
  if (!searchQuery.value || searchQuery.value.length < props.minChars) return text
  
  const query = searchQuery.value.trim()
  const regex = new RegExp(`(${query})`, 'gi')
  return text.replace(regex, '<mark class="highlight">$1</mark>')
}

// Debounce na busca
const onInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  updateDropdownPosition()
  
  if (searchQuery.value.length >= props.minChars) {
    isSearching.value = true
    showResults.value = true
    
    debounceTimer = setTimeout(() => {
      // A busca é feita via computed, então só precisamos parar o loading
      isSearching.value = false
    }, props.debounceMs)
  } else {
    showResults.value = searchQuery.value.length > 0
    isSearching.value = false
  }
  
  selectedIndex.value = -1
}

const onFocus = () => {
  updateDropdownPosition()
  if (searchQuery.value.length > 0) {
    showResults.value = true
  }
}

const onEnter = () => {
  if (selectedIndex.value >= 0) {
    const totalCourses = Math.min(courseResults.value.length, 5)
    if (selectedIndex.value < totalCourses) {
      selectCourse(courseResults.value[selectedIndex.value])
    } else {
      const categoryIndex = selectedIndex.value - totalCourses
      if (categoryIndex < categoryResults.value.length) {
        selectCategory(categoryResults.value[categoryIndex])
      }
    }
  } else if (searchQuery.value.trim()) {
    viewAllResults()
  }
}

const onArrowDown = () => {
  const maxIndex = Math.min(courseResults.value.length, 5) + categoryResults.value.length
  if (selectedIndex.value < maxIndex - 1) {
    selectedIndex.value++
  }
}

const onArrowUp = () => {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

const closeResults = () => {
  showResults.value = false
  selectedIndex.value = -1
}

const clearSearch = () => {
  searchQuery.value = ''
  showResults.value = false
  selectedIndex.value = -1
}

const selectCourse = (course) => {
  emit('select-course', course)
  router.push({ name: 'CourseDetail', params: { id: course.id } })
  closeResults()
  searchQuery.value = ''
}

const selectCategory = (category) => {
  emit('select-category', category)
  router.push({ name: 'CategoryCourses', params: { category: category.name } })
  closeResults()
  searchQuery.value = ''
}

const viewAllResults = () => {
  emit('search', searchQuery.value)
  router.push({ name: 'AllCourses', query: { search: searchQuery.value.trim() } })
  closeResults()
}

// Fechar ao clicar fora (considerando que dropdown está no body via Teleport)
const handleClickOutside = (event) => {
  const isClickInContainer = searchContainer.value && searchContainer.value.contains(event.target)
  const isClickInDropdown = event.target.closest('.search-results')
  
  if (!isClickInContainer && !isClickInDropdown) {
    closeResults()
  }
}

// Atualiza posição ao fazer scroll ou resize
const handleScrollResize = () => {
  if (showResults.value) {
    updateDropdownPosition()
  }
}

// Carregar dados se não tiver
onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', handleScrollResize, true)
  window.addEventListener('resize', handleScrollResize)
  
  // Carrega cursos se não tiver
  if (allCourses.value.length === 0) {
    try {
      await store.dispatch('courses/fetchCourses')
    } catch (e) {
      console.error('Erro ao carregar cursos para busca:', e)
    }
  }
  
  // Carrega categorias se não tiver
  if (allCategories.value.length === 0) {
    try {
      await store.dispatch('categories/fetchCategories')
    } catch (e) {
      console.error('Erro ao carregar categorias para busca:', e)
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', handleScrollResize, true)
  window.removeEventListener('resize', handleScrollResize)
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<style scoped>
.search-autocomplete {
  position: relative;
  min-width: 280px;
  max-width: 450px;
  width: 100%;
}

.search-field {
  transition: all 0.3s ease;
}

.search-field :deep(.v-field) {
  border-radius: 24px;
  min-height: 44px;
}

.search-field :deep(.v-field__input) {
  padding-top: 8px;
  padding-bottom: 8px;
  font-size: 15px;
  color: #333 !important;
  min-height: 44px;
}

.search-field :deep(.v-field__input::placeholder) {
  color: #666 !important;
  opacity: 0.8;
}

.search-field :deep(.v-icon) {
  color: #1976d2 !important;
  opacity: 1;
}

.search-field:focus-within {
  transform: scale(1.02);
}
</style>

<style>
/* Estilos globais para o dropdown (Teleport renderiza fora do scoped) */
.search-results {
  max-height: 450px;
  overflow-y: auto;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.search-results .v-list-item--active {
  background-color: rgba(25, 118, 210, 0.12) !important;
}

.search-results .highlight {
  background-color: rgba(255, 235, 59, 0.6);
  padding: 1px 3px;
  border-radius: 3px;
  font-weight: 600;
  color: #333;
}

.search-results .v-list-subheader {
  min-height: 36px;
  font-size: 0.8rem;
  background-color: #fafafa;
}

.search-results .v-list-item {
  min-height: 52px;
}

.search-results .v-list-item:hover {
  background-color: rgba(25, 118, 210, 0.08);
}
</style>
