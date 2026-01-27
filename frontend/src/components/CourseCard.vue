<template>
  <v-card
    class="course-card"
    elevation="2"
    hover
    @click="goToCourse"
  >
    <v-img
      :src="course.image || 'https://via.placeholder.com/300x200'"
      height="200"
      cover
    >
      <template v-slot:placeholder>
        <v-row class="fill-height ma-0" align="center" justify="center">
          <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
        </v-row>
      </template>
    </v-img>

    <v-card-title class="text-h6">
      {{ course.name }}
    </v-card-title>

    <v-card-subtitle>
      <v-chip size="small" color="primary" variant="outlined">
        {{ course.category }}
      </v-chip>
    </v-card-subtitle>

    <v-card-text>
      <p class="text-body-2">{{ truncatedDescription }}</p>
      
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
      >
        <v-icon :color="isFavorite ? 'red' : 'grey'">
          {{ isFavorite ? 'mdi-heart' : 'mdi-heart-outline' }}
        </v-icon>
      </v-btn>

      <v-btn
        variant="text"
        color="primary"
        @click.stop="shareCourse"
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
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  course: {
    type: Object,
    required: true
  }
})

const isFavorite = ref(false)

const truncatedDescription = computed(() => {
  if (!props.course.description) return 'Descrição não disponível'
  return props.course.description.length > 100
    ? props.course.description.substring(0, 100) + '...'
    : props.course.description
})

const goToCourse = () => {
  router.push({ name: 'CourseDetail', params: { id: props.course.id } })
}

const toggleFavorite = () => {
  isFavorite.value = !isFavorite.value
}

const shareCourse = () => {
  if (navigator.share) {
    navigator.share({
      title: props.course.name,
      text: props.course.description,
      url: window.location.origin + `/course/${props.course.id}`
    })
  } else {
    navigator.clipboard.writeText(window.location.origin + `/course/${props.course.id}`)
  }
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
</style>