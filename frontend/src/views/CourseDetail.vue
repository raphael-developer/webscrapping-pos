<template>
  <v-container>
    <!-- Loading -->
    <v-row v-if="loading" justify="center" class="py-12">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate size="64" color="primary"></v-progress-circular>
        <p class="mt-4 text-body-1">Carregando curso...</p>
      </v-col>
    </v-row>

    <!-- Curso encontrado -->
    <div v-else-if="course">
      <!-- Botão voltar -->
      <v-row class="mb-4">
        <v-col cols="12">
          <v-btn variant="text" @click="goBack" prepend-icon="mdi-arrow-left">
            Voltar
          </v-btn>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="8">
          <v-card>
            <v-img
              :src="courseImage"
              height="300"
              cover
              @error="onImageError"
            >
              <template v-slot:placeholder>
                <v-row class="fill-height ma-0" align="center" justify="center">
                  <v-progress-circular indeterminate color="primary"></v-progress-circular>
                </v-row>
              </template>
            </v-img>

            <v-card-title class="text-h4">{{ course.name || course.title }}</v-card-title>
            
            <v-card-subtitle>
              <v-chip color="primary" class="mr-2">{{ course.category }}</v-chip>
              <v-chip color="success" variant="outlined">{{ course.modality || 'EAD' }}</v-chip>
            </v-card-subtitle>

            <v-card-text>
              <p class="text-body-1">{{ courseDescription }}</p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card>
            <v-card-title>Informações do Curso</v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="primary">mdi-clock-outline</v-icon>
                  </template>
                  <v-list-item-title>Duração</v-list-item-title>
                  <v-list-item-subtitle>{{ course.duration || 'Consulte' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="primary">mdi-school</v-icon>
                  </template>
                  <v-list-item-title>Modalidade</v-list-item-title>
                  <v-list-item-subtitle>{{ course.modality || 'EAD' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="primary">mdi-folder</v-icon>
                  </template>
                  <v-list-item-title>Categoria</v-list-item-title>
                  <v-list-item-subtitle>{{ course.category }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="course.price">
                  <template v-slot:prepend>
                    <v-icon color="primary">mdi-currency-brl</v-icon>
                  </template>
                  <v-list-item-title>Investimento</v-list-item-title>
                  <v-list-item-subtitle>{{ course.price }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>

              <v-btn
                color="primary"
                block
                size="large"
                class="mt-4"
                :href="course.url"
                target="_blank"
                prepend-icon="mdi-open-in-new"
              >
                Ver no Site Oficial
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Erro / Não encontrado -->
    <v-row v-else justify="center" class="py-12">
      <v-col cols="12" md="6" class="text-center">
        <v-icon size="80" color="error">mdi-alert-circle-outline</v-icon>
        <h2 class="text-h5 mt-4 mb-2">Curso não encontrado</h2>
        <p class="text-body-1 text-grey mb-4">
          {{ error || 'O curso solicitado não existe ou foi removido.' }}
        </p>
        <v-btn color="primary" @click="goBack" prepend-icon="mdi-arrow-left">
          Voltar
        </v-btn>
        <v-btn color="secondary" variant="outlined" class="ml-2" @click="$router.push('/cursos')">
          Ver Todos os Cursos
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'

const route = useRoute()
const router = useRouter()
const store = useStore()

const course = ref(null)
const loading = ref(true)
const error = ref(null)
const imageError = ref(false)

// Imagem do curso com fallback
const courseImage = computed(() => {
  if (imageError.value) {
    return getCategoryPlaceholder(course.value?.category)
  }
  const img = course.value?.image || course.value?.imageUrl || ''
  if (img && img.trim()) {
    return img
  }
  return getCategoryPlaceholder(course.value?.category)
})

// Descrição do curso com fallback
const courseDescription = computed(() => {
  const desc = course.value?.description || ''
  if (desc && desc.trim()) {
    return desc
  }
  const title = course.value?.name || course.value?.title || 'Este curso'
  const category = course.value?.category || 'geral'
  return `Curso de pós-graduação em ${title} na área de ${category}. Modalidade ${course.value?.modality || 'EAD'}. Entre em contato para mais informações sobre grade curricular, investimento e início das aulas.`
})

// Placeholder baseado na categoria
const getCategoryPlaceholder = (category) => {
  const categoryImages = {
    'ciências da saúde': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=400&fit=crop',
    'educação': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=400&fit=crop',
    'direito': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=400&fit=crop',
    'jurídica': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=400&fit=crop',
    'tecnologia': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=400&fit=crop',
    'empresarial': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=400&fit=crop',
    'negócios': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=400&fit=crop',
    'engenharia': 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=400&fit=crop',
    'psicologia': 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&h=400&fit=crop',
    'mba': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop',
  }
  
  const normalizedCategory = (category || '').toLowerCase()
  for (const [key, url] of Object.entries(categoryImages)) {
    if (normalizedCategory.includes(key)) {
      return url
    }
  }
  return 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=400&fit=crop'
}

const onImageError = () => {
  imageError.value = true
}

// Buscar curso por ID do store ou API
const loadCourse = async () => {
  loading.value = true
  error.value = null
  imageError.value = false
  
  const courseId = parseInt(route.params.id)
  
  try {
    // Primeiro tenta buscar do store se já tem cursos carregados
    const coursesInStore = store.state.courses?.courses || []
    
    if (coursesInStore.length > 0) {
      // Busca no store local
      const foundCourse = coursesInStore.find(c => c.id === courseId)
      if (foundCourse) {
        course.value = foundCourse
        console.log('Curso encontrado no store:', foundCourse.name)
        return
      }
    }
    
    // Se não encontrou no store, carrega todos os cursos primeiro
    console.log('Carregando cursos da API...')
    await store.dispatch('courses/fetchCourses')
    
    // Agora tenta encontrar no store atualizado
    const updatedCourses = store.state.courses?.courses || []
    const foundCourse = updatedCourses.find(c => c.id === courseId)
    
    if (foundCourse) {
      course.value = foundCourse
      console.log('Curso encontrado após carregar:', foundCourse.name)
    } else {
      // Tenta buscar direto pela API de curso individual
      console.log('Buscando curso individual da API, id:', courseId)
      const result = await store.dispatch('courses/fetchCourseById', courseId)
      course.value = result
    }
    
  } catch (err) {
    console.error('Erro ao carregar curso:', err)
    error.value = err.message || 'Erro ao carregar curso'
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  loadCourse()
})
</script>