<template>
  <v-navigation-drawer
    :model-value="drawer"
    @update:model-value="$emit('update:drawer', $event)"
    app
    temporary
    width="280"
  >
    <v-list>
      <v-list-item
        prepend-avatar="https://randomuser.me/api/portraits/men/85.jpg"
        title="Usuário"
        subtitle="user@email.com"
      ></v-list-item>
    </v-list>

    <v-divider></v-divider>

    <v-list density="compact" nav>
      <v-list-item
        v-for="item in menuItems"
        :key="item.title"
        :prepend-icon="item.icon"
        :title="item.title"
        :to="item.to"
        color="primary"
      ></v-list-item>
    </v-list>

    <template v-slot:append>
      <div class="pa-2">
        <v-btn
          block
          @click="toggleTheme"
          :prepend-icon="themeIcon"
        >
          {{ themeText }}
        </v-btn>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from 'vuetify'

const theme = useTheme()
const props = defineProps({
  drawer: Boolean
})

const menuItems = [
  { title: 'Início', icon: 'mdi-home', to: '/' },
  { title: 'Todos os Cursos', icon: 'mdi-book-multiple', to: '/cursos' },
  { title: 'Cadastro de Cursos', icon: 'mdi-plus-circle', to: '/registration' },
  { title: 'Administração', icon: 'mdi-cog', to: '/admin' },
  { title: 'Monitor Scraping', icon: 'mdi-chart-timeline-variant', to: '/monitor' },
  { title: 'Comparação WooCommerce', icon: 'mdi-compare', to: '/comparison' }
]

const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}

const themeIcon = computed(() => 
  theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'
)

const themeText = computed(() => 
  theme.global.current.value.dark ? 'Tema Claro' : 'Tema Escuro'
)
</script>