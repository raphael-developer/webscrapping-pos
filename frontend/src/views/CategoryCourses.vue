<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h3 mb-4">{{ categoryName }}</h1>
        <p class="text-subtitle-1 mb-6">Cursos disponíveis nesta categoria</p>
      </v-col>
    </v-row>

    <v-row>
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

    <v-row v-if="filteredCourses.length === 0" justify="center">
      <v-col cols="12" class="text-center">
        <v-alert type="info">
          Nenhum curso encontrado nesta categoria
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>

import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { computed, watch, onMounted } from 'vue'
import CourseCard from '@/components/CourseCard.vue'

const route = useRoute()

const store = useStore()
const categoryName = computed(() => decodeURIComponent(String(route.params.category || '')))
const courses = computed(() => Array.isArray(store.state.courses.courses) ? store.state.courses.courses : [])
function normalize(str) {
  return str
  ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
  .toLowerCase()
  .trim()
    : ''
}

const filteredCourses = computed(() => {
  const target = normalize(categoryName.value)
  return courses.value.filter(course => normalize(course?.category) === target)
})

const fetchCourses = async () => {
  try {
  await store.dispatch('courses/fetchCourses')
  } catch (error) {
    console.error('Erro ao carregar cursos:', error)
  }
}

onMounted(fetchCourses)
watch(() => route.params.category, fetchCourses)
</script>