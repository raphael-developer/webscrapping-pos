<template>
  <div>
    <!-- Hero Section -->
    <v-container fluid class="hero-section">
      <v-row align="center" justify="center" class="fill-height">
        <v-col cols="12" md="8" class="text-center">
          <h1 class="display-2 font-weight-bold mb-4">
            Encontre seu Curso Ideal
          </h1>
          <p class="headline mb-6">
            Explore nossa ampla gama de cursos de pós-graduação
          </p>
          <v-btn
            size="large"
            color="accent"
            @click="scrollToCourses"
          >
            Ver Cursos
          </v-btn>
        </v-col>
      </v-row>
    </v-container>

    <!-- Statistics -->
    <v-container class="py-8">
      <v-row>
        <v-col v-for="stat in statistics" :key="stat.title" cols="12" sm="6" md="3">
          <v-card class="text-center pa-4" elevation="2">
            <v-icon size="48" :color="stat.color" class="mb-2">{{ stat.icon }}</v-icon>
            <h3 class="text-h4 font-weight-bold">{{ stat.value }}</h3>
            <p class="text-subtitle-1">{{ stat.title }}</p>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Categorias em Cards -->
    <div ref="coursesSection">
      <v-container>
        <h2 class="text-h4 font-weight-bold mb-6 text-center">Categorias</h2>
        <v-row>
          <v-col
            v-for="category in categories"
            :key="category"
            cols="12" sm="6" md="4" lg="3"
          >
            <v-card class="category-card" elevation="2" hover @click="goToCategory(category)">
              <v-card-title class="text-h6 text-center">{{ category }}</v-card-title>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </div>
</template>

<script setup>

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'

const store = useStore()
const router = useRouter()
const coursesSection = ref(null)

// Reactive data


// Computed properties

const courses = computed(() => store.state.courses?.courses || [])
const categories = computed(() => store.state.categories?.categories || [])
const loading = computed(() => store.state.courses?.loading || false)

const statistics = computed(() => [
  { title: 'Total de Cursos', value: Array.isArray(courses.value) ? courses.value.length : 0, icon: 'mdi-book', color: 'primary' },
  { title: 'Categorias', value: Array.isArray(categories.value) ? categories.value.length : 0, icon: 'mdi-folder', color: 'success' },
  { title: 'Modalidades', value: 3, icon: 'mdi-school', color: 'warning' },
  { title: 'Avaliação', value: '4.8', icon: 'mdi-star', color: 'error' }
])


// Métodos
const scrollToCourses = () => {
  if (coursesSection.value && coursesSection.value.$el) {
    coursesSection.value.$el.scrollIntoView({ behavior: 'smooth' })
  } else if (coursesSection.value) {
    coursesSection.value.scrollIntoView({ behavior: 'smooth' })
  }
}

const goToCategory = (category) => {
  router.push({ name: 'CategoryCourses', params: { category } })
}

// Lifecycle
onMounted(async () => {
  try {
    await store.dispatch('courses/fetchCourses')
    await store.dispatch('categories/fetchCategories')
  } catch (error) {
    console.error('Erro ao carregar dados:', error)
  }
})
</script>

<style scoped>
.hero-section {
  background: linear-gradient(135deg, var(--app-primary) 0%, rgba(117,0,255,0.9) 100%);
  color: white;
  min-height: 400px;
  display: flex;
  align-items: center;
}

.category-card {
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.category-card:hover {
  box-shadow: 0 4px 24px rgba(118, 75, 162, 0.2);
  background: #f5f5f5;
}
</style>