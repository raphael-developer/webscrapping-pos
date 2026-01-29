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

    <v-text-field
      v-model="search"
      hide-details
      placeholder="Buscar cursos..."
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      class="mr-4 search-field"
      style="max-width: 300px;"
      clearable
      @keyup.enter="performSearch"
      @click:prepend-inner="performSearch"
      @click:clear="clearSearch"
    ></v-text-field>

    <v-btn icon @click="performSearch" title="Buscar">
      <v-icon>mdi-magnify</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const search = ref('')

const emit = defineEmits(['toggle-drawer'])

const toggleDrawer = () => {
  emit('toggle-drawer')
}

const goHome = () => {
  router.push({ name: 'Home' })
}

const performSearch = () => {
  if (search.value && search.value.trim()) {
    router.push({ name: 'AllCourses', query: { search: search.value.trim() } })
  }
}

const clearSearch = () => {
  search.value = ''
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  opacity: 0.9;
}

.search-field {
  transition: all 0.2s;
}

.search-field:focus-within {
  max-width: 350px !important;
}
</style>