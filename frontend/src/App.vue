<template>
  <v-app class="app-container">
    <AppNavigation :drawer="drawer" @update:drawer="drawer = $event" />
    
    <AppHeader @toggle-drawer="toggleDrawer" />

    <v-main class="main-content">
      <div class="content-wrapper">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </v-main>

    <!-- Global Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      location="top right"
      variant="elevated"
      class="custom-snackbar"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ snackbar.icon }}</v-icon>
        {{ snackbar.message }}
      </div>
      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="snackbar.show = false"
        >
          Fechar
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Loading Overlay -->
    <v-overlay
      v-model="isLoading"
      class="align-center justify-center"
      persistent
    >
      <div class="text-center">
        <v-progress-circular
          indeterminate
          size="64"
          color="primary"
        ></v-progress-circular>
        <p class="mt-4 text-h6">Carregando...</p>
      </div>
    </v-overlay>
  </v-app>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useStore } from 'vuex'
import AppNavigation from '@/components/AppNavigation.vue'
import AppHeader from '@/components/AppHeader.vue'

const store = useStore()

const drawer = ref(false)
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  icon: 'mdi-check-circle',
  timeout: 4000
})

const isLoading = computed(() => false)
const error = computed(() => null)

watch(error, (newError) => {
  if (newError) {
    showSnackbar(newError, 'error')
  }
})

const initializeApp = async () => {
  // TODO: Implementar actions do store
  console.log('App inicializada')
}

const showSnackbar = (message, type = 'success') => {
  const config = {
    success: { color: 'success', icon: 'mdi-check-circle' },
    error: { color: 'error', icon: 'mdi-alert-circle' },
    warning: { color: 'warning', icon: 'mdi-alert' },
    info: { color: 'info', icon: 'mdi-information' }
  }
  
  snackbar.value = {
    show: true,
    message,
    ...config[type],
    timeout: 4000
  }
}

const toggleDrawer = () => {
  // Implementar toggle do drawer se necessário
  drawer.value = !drawer.value
}

onMounted(() => {
  initializeApp()
})
</script>

<style scoped>
.app-container {
  background: linear-gradient(135deg, rgb(var(--v-theme-background)) 0%, rgba(var(--v-theme-primary), 0.02) 100%);
  min-height: 100vh;
}

.main-content {
  background: transparent;
}

.content-wrapper {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.custom-snackbar {
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* Page Transitions */
.page-enter-active,
.page-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Global Styles */
:deep(.v-card) {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.v-card:hover) {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

:deep(.v-btn) {
  border-radius: 12px;
  text-transform: none;
  font-weight: 500;
}

:deep(.v-text-field .v-field) {
  border-radius: 12px;
}

:deep(.v-chip) {
  border-radius: 8px;
}
</style>