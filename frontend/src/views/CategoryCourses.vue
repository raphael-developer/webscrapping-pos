<template>
  <v-container>
    <!-- Header com contagem -->
    <v-row class="mb-4">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between flex-wrap">
          <div>
            <v-btn variant="text" icon="mdi-arrow-left" @click="$router.push('/')" class="mr-2" />
            <span class="text-h3 font-weight-bold">{{ categoryName }}</span>
          </div>
          <v-chip color="primary" size="large" class="mt-2 mt-md-0">
            <v-icon start>mdi-school</v-icon>
            {{ filteredCourses.length }} cursos
          </v-chip>
        </div>
        <p class="text-subtitle-1 text-grey mt-2 mb-0">
          {{ filteredCourses.length }} cursos disponíveis nesta categoria
        </p>
      </v-col>
    </v-row>

    <!-- Loading -->
    <v-row v-if="loading" justify="center" class="py-12">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4 text-body-1">Carregando cursos...</p>
      </v-col>
    </v-row>

    <!-- Grid de cursos -->
    <v-row v-else-if="filteredCourses.length > 0">
      <v-col
        v-for="course in filteredCourses"
        :key="course.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <CourseCard :course="course" />
      </v-col>
    </v-row>

    <!-- Estado vazio -->
    <v-row v-else justify="center" class="py-12">
      <v-col cols="12" md="6" class="text-center">
        <v-icon size="80" color="grey-lighten-1">mdi-book-search-outline</v-icon>
        <h3 class="text-h5 mt-4 mb-2">Nenhum curso encontrado</h3>
        <p class="text-body-1 text-grey">Não há cursos disponíveis nesta categoria</p>
        <v-btn color="primary" variant="outlined" class="mt-4" @click="$router.push('/')">
          <v-icon start>mdi-home</v-icon>
          Voltar ao Início
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { computed, watch, onMounted } from 'vue'
import CourseCard from '@/components/CourseCard.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()

const loading = ref(true)

const categoryName = computed(() => decodeURIComponent(String(route.params.category || '')))
const courses = computed(() => Array.isArray(store.state.courses.courses) ? store.state.courses.courses : [])

function normalize(str) {
  return str
    ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
    : ''
}

const filteredCourses = computed(() => {
  const target = normalize(categoryName.value)
  return courses.value.filter(course => normalize(course?.category) === target)
})

const fetchCourses = async () => {
  loading.value = true
  try {
    await store.dispatch('courses/fetchCourses')
    console.log(`Categoria "${categoryName.value}": ${filteredCourses.value.length} cursos de ${courses.value.length} total`)
  } catch (error) {
    console.error('Erro ao carregar cursos:', error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchCourses)
watch(() => route.params.category, fetchCourses)
</script>