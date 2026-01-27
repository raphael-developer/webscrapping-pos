<template>
  <v-container>
    <v-row v-if="loading" justify="center">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate size="64"></v-progress-circular>
      </v-col>
    </v-row>

    <div v-else-if="course">
      <v-row>
        <v-col cols="12" md="8">
          <v-card>
            <v-img
              :src="course.image || 'https://via.placeholder.com/800x400'"
              height="300"
              cover
            ></v-img>

            <v-card-title class="text-h4">{{ course.name }}</v-card-title>
            
            <v-card-subtitle>
              <v-chip color="primary" class="mr-2">{{ course.category }}</v-chip>
              <v-chip color="success" variant="outlined">{{ course.modality || 'Online' }}</v-chip>
            </v-card-subtitle>

            <v-card-text>
              <p class="text-body-1">{{ course.description }}</p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card>
            <v-card-title>Informações do Curso</v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item>
                  <v-list-item-title>Duração</v-list-item-title>
                  <v-list-item-subtitle>{{ course.duration || 'Consulte' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Modalidade</v-list-item-title>
                  <v-list-item-subtitle>{{ course.modality || 'Online' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Categoria</v-list-item-title>
                  <v-list-item-subtitle>{{ course.category }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>

              <v-btn
                color="primary"
                block
                size="large"
                class="mt-4"
                :href="course.url"
                target="_blank"
              >
                Inscrever-se
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <v-alert v-else type="error" class="mt-4">
      Curso não encontrado
    </v-alert>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'

const route = useRoute()
const store = useStore()

const course = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    course.value = await store.dispatch('courses/fetchCourse', route.params.id)
  } catch (error) {
    console.error('Erro ao carregar curso:', error)
  } finally {
    loading.value = false
  }
})
</script>