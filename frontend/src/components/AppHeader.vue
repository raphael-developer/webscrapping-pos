<template>
  <v-app-bar
    app
    color="primary"
    dark
    elevation="4"
  >
    <v-app-bar-nav-icon @click="toggleDrawer"></v-app-bar-nav-icon>
    
    <v-toolbar-title>
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
      class="mr-4"
      style="max-width: 300px;"
      @keyup.enter="performSearch"
    ></v-text-field>

    <v-btn icon>
      <v-icon>mdi-bell</v-icon>
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

const performSearch = () => {
  if (search.value.trim()) {
    router.push({ name: 'Home', query: { search: search.value } })
  }
}
</script>