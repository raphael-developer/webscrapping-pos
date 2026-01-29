<template>
  <v-card
    class="course-card"
    elevation="2"
    hover
    @click="goToCourse"
  >
    <v-img
      :src="courseImage"
      height="200"
      cover
      @error="onImageError"
    >
      <template v-slot:placeholder>
        <v-row class="fill-height ma-0" align="center" justify="center">
          <v-progress-circular indeterminate color="grey-lighten-5"></v-progress-circular>
        </v-row>
      </template>
      <template v-slot:error>
        <v-row class="fill-height ma-0 bg-grey-lighten-3" align="center" justify="center">
          <div class="text-center">
            <v-icon size="48" color="grey-lighten-1">mdi-image-off</v-icon>
            <div class="text-caption text-grey mt-1">Imagem indisponível</div>
          </div>
        </v-row>
      </template>
    </v-img>

    <v-card-title class="text-h6 text-truncate">
      {{ courseTitle }}
    </v-card-title>

    <v-card-subtitle>
      <v-chip size="small" color="primary" variant="outlined">
        {{ course.category || 'Geral' }}
      </v-chip>
    </v-card-subtitle>

    <v-card-text>
      <p class="text-body-2 course-description">{{ truncatedDescription }}</p>
      
      <div class="d-flex align-center mt-2">
        <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
        <span class="text-caption">{{ course.duration || 'Consulte' }}</span>
        
        <v-spacer></v-spacer>
        
        <v-icon size="small" class="mr-1">mdi-map-marker</v-icon>
        <span class="text-caption">{{ course.modality || 'Online' }}</span>
      </div>
    </v-card-text>

    <v-card-actions>
      <v-btn
        variant="text"
        color="primary"
        @click.stop="toggleFavorite"
        :title="isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'"
      >
        <v-icon :color="isFavorite ? 'red' : 'grey'">
          {{ isFavorite ? 'mdi-heart' : 'mdi-heart-outline' }}
        </v-icon>
      </v-btn>

      <v-btn
        variant="text"
        color="primary"
        @click.stop="shareCourse"
        title="Compartilhar curso"
      >
        <v-icon>mdi-share</v-icon>
      </v-btn>

      <v-spacer></v-spacer>

      <v-btn
        color="primary"
        variant="elevated"
        size="small"
        @click.stop="goToCourse"
      >
        Ver Detalhes
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  course: {
    type: Object,
    required: true
  }
})

const isFavorite = ref(false)
const imageHasError = ref(false)

// Gerar imagem placeholder baseada na categoria
const getCategoryPlaceholder = (category) => {
  const categoryImages = {
    'ciências da saúde': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=200&fit=crop',
    'educação': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=200&fit=crop',
    'direito': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=200&fit=crop',
    'tecnologia': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=200&fit=crop',
    'negócios': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=200&fit=crop',
    'engenharia': 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=200&fit=crop',
    'psicologia': 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=200&fit=crop',
  }
  
  const normalizedCategory = (category || '').toLowerCase()
  for (const [key, url] of Object.entries(categoryImages)) {
    if (normalizedCategory.includes(key)) {
      return url
    }
  }
  return 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=200&fit=crop'
}

// Computed para obter a URL da imagem (suporta image, imageUrl e fallback)
const courseImage = computed(() => {
  if (imageHasError.value) {
    return getCategoryPlaceholder(props.course.category)
  }
  
  const img = props.course.image || props.course.imageUrl || ''
  if (img && img.trim()) {
    return img
  }
  return getCategoryPlaceholder(props.course.category)
})

// Computed para obter o título (suporta name e title)
const courseTitle = computed(() => {
  return props.course.name || props.course.title || 'Curso sem título'
})

const truncatedDescription = computed(() => {
  const desc = props.course.description || ''
  if (!desc || !desc.trim()) {
    // Gerar descrição baseada no título e categoria
    const title = courseTitle.value
    const category = props.course.category || 'geral'
    return `Curso de pós-graduação em ${title} na área de ${category}. Modalidade ${props.course.modality || 'EAD'}.`
  }
  return desc.length > 100
    ? desc.substring(0, 100) + '...'
    : desc
})

const onImageError = () => {
  imageHasError.value = true
}

const goToCourse = () => {
  router.push({ name: 'CourseDetail', params: { id: props.course.id } })
}

// Persistir favoritos no localStorage
const getFavorites = () => {
  try {
    return JSON.parse(localStorage.getItem('favorites') || '[]')
  } catch {
    return []
  }
}

const saveFavorites = (favorites) => {
  localStorage.setItem('favorites', JSON.stringify(favorites))
}

onMounted(() => {
  const favorites = getFavorites()
  isFavorite.value = favorites.includes(props.course.id)
})

const toggleFavorite = () => {
  const favorites = getFavorites()
  const index = favorites.indexOf(props.course.id)
  
  if (index === -1) {
    favorites.push(props.course.id)
    isFavorite.value = true
  } else {
    favorites.splice(index, 1)
    isFavorite.value = false
  }
  
  saveFavorites(favorites)
}

const shareCourse = () => {
  const shareUrl = window.location.origin + `/course/${props.course.id}`
  const shareData = {
    title: courseTitle.value,
    text: truncatedDescription.value,
    url: shareUrl
  }
  
  if (navigator.share) {
    navigator.share(shareData).catch((err) => {
      // Fallback para clipboard se o share falhar
      if (err.name !== 'AbortError') {
        copyToClipboard(shareUrl)
      }
    })
  } else {
    copyToClipboard(shareUrl)
  }
}

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    // TODO: Mostrar snackbar de sucesso
    console.log('Link copiado para a área de transferência!')
  }).catch(() => {
    // Fallback para browsers antigos
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  })
}
</script>

<style scoped>
.course-card {
  transition: transform 0.2s ease-in-out;
  cursor: pointer;
}

.course-card:hover {
  transform: translateY(-4px);
}

.course-description {
  min-height: 40px;
  line-height: 1.4;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>