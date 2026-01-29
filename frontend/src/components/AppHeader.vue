<template>
  <v-app-bar
    app
    color="primary"
    dark
    elevation="4"
  >
    <v-app-bar-nav-icon @click="toggleDrawer"></v-app-bar-nav-icon>
    
    <v-toolbar-title class="cursor-pointer" @click="goHome">
      <v-icon class="mr-2">mdi-school</v-icon>
      Faculdade Única
    </v-toolbar-title>

    <v-spacer></v-spacer>

    <!-- Busca com Autocomplete -->
    <SearchAutocomplete
      placeholder="Buscar cursos ou categorias..."
      results-width="450px"
      :min-chars="2"
      :debounce-ms="300"
      class="header-search mx-2"
      @select-course="onSelectCourse"
      @select-category="onSelectCategory"
      @search="onSearch"
    />
  </v-app-bar>
</template>

<script setup>
import { useRouter } from 'vue-router'
import SearchAutocomplete from '@/components/SearchAutocomplete.vue'

const router = useRouter()

const emit = defineEmits(['toggle-drawer'])

const toggleDrawer = () => {
  emit('toggle-drawer')
}

const goHome = () => {
  router.push({ name: 'Home' })
}

const onSelectCourse = (course) => {
  console.log('Curso selecionado:', course.name)
}

const onSelectCategory = (category) => {
  console.log('Categoria selecionada:', category.name)
}

const onSearch = (query) => {
  console.log('Busca:', query)
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  opacity: 0.9;
}

.header-search {
  flex: 0 1 400px;
  min-width: 250px;
  max-width: 450px;
}

@media (max-width: 768px) {
  .header-search {
    flex: 1;
    min-width: 200px;
    max-width: 100%;
  }
}
</style>