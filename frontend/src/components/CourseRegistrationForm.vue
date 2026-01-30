<template>
  <v-card class="course-registration-form">
    <v-card-title class="bg-primary text-white d-flex align-center">
      <v-icon class="mr-2">mdi-pencil-box</v-icon>
      Editar Curso para Cadastro
    </v-card-title>
    
    <v-card-text class="pt-6">
      <v-form ref="formRef" v-model="isFormValid">
        <v-row>
          <!-- Coluna esquerda - Dados principais -->
          <v-col cols="12" md="7">
            <h3 class="text-subtitle-1 font-weight-bold mb-4">
              <v-icon class="mr-1" size="20">mdi-information</v-icon>
              Informações Básicas
            </h3>
            
            <!-- Nome do curso -->
            <v-text-field
              v-model="form.name"
              label="Nome do Curso *"
              variant="outlined"
              prepend-inner-icon="mdi-book"
              :rules="[rules.required, rules.minLength(3)]"
              class="mb-4"
            />
            
            <!-- Slug -->
            <v-text-field
              v-model="form.slug"
              label="Slug (URL)"
              variant="outlined"
              prepend-inner-icon="mdi-link"
              hint="Gerado automaticamente se vazio"
              persistent-hint
              class="mb-4"
            />
            
            <!-- Categoria -->
            <v-select
              v-model="form.category"
              :items="categoryOptions"
              label="Categoria *"
              variant="outlined"
              prepend-inner-icon="mdi-folder"
              :rules="[rules.required]"
              class="mb-4"
            />
            
            <!-- Descrição -->
            <v-textarea
              v-model="form.description"
              label="Descrição Completa *"
              variant="outlined"
              rows="5"
              :rules="[rules.required, rules.minLength(10)]"
              counter
              class="mb-4"
            />
            
            <!-- Descrição curta -->
            <v-textarea
              v-model="form.shortDescription"
              label="Descrição Curta (Grade curricular)"
              variant="outlined"
              rows="3"
              counter
              class="mb-4"
            />
            
            <v-divider class="my-4" />
            
            <h3 class="text-subtitle-1 font-weight-bold mb-4">
              <v-icon class="mr-1" size="20">mdi-currency-usd</v-icon>
              Preços
            </h3>
            
            <v-row>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="form.regularPrice"
                  label="Preço Regular"
                  variant="outlined"
                  prepend-inner-icon="mdi-currency-brl"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </v-col>
              
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="form.salePrice"
                  label="Preço Promocional"
                  variant="outlined"
                  prepend-inner-icon="mdi-sale"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </v-col>
              
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="form.duration"
                  label="Carga Horária"
                  variant="outlined"
                  prepend-inner-icon="mdi-clock"
                  placeholder="720 horas"
                />
              </v-col>
            </v-row>
          </v-col>
          
          <!-- Coluna direita - Imagem e opções -->
          <v-col cols="12" md="5">
            <h3 class="text-subtitle-1 font-weight-bold mb-4">
              <v-icon class="mr-1" size="20">mdi-image</v-icon>
              Imagem
            </h3>
            
            <!-- Preview da imagem -->
            <v-card variant="outlined" class="mb-4">
              <v-img
                :src="form.imageUrl || 'https://via.placeholder.com/400x200?text=Sem+Imagem'"
                height="200"
                cover
                class="bg-grey-lighten-3"
              >
                <template v-slot:error>
                  <div class="d-flex align-center justify-center fill-height bg-grey-lighten-3">
                    <v-icon size="64" color="grey-lighten-1">mdi-image-off</v-icon>
                  </div>
                </template>
              </v-img>
            </v-card>
            
            <v-text-field
              v-model="form.imageUrl"
              label="URL da Imagem"
              variant="outlined"
              prepend-inner-icon="mdi-link-variant"
              hint="URL completa da imagem do curso"
              persistent-hint
              class="mb-4"
            />
            
            <v-divider class="my-4" />
            
            <h3 class="text-subtitle-1 font-weight-bold mb-4">
              <v-icon class="mr-1" size="20">mdi-cog</v-icon>
              Opções de Publicação
            </h3>
            
            <!-- Status de publicação -->
            <v-radio-group
              v-model="form.status"
              inline
              class="mb-4"
            >
              <v-radio label="Rascunho" value="draft" />
              <v-radio label="Publicar Imediatamente" value="publish" />
            </v-radio-group>
            
            <v-divider class="my-4" />
            
            <h3 class="text-subtitle-1 font-weight-bold mb-4">
              <v-icon class="mr-1" size="20">mdi-tune</v-icon>
              Campos Customizados
            </h3>
            
            <!-- Campos customizados -->
            <div v-for="(field, index) in customFieldsList" :key="index" class="d-flex gap-2 mb-2">
              <v-text-field
                v-model="field.key"
                label="Chave"
                variant="outlined"
                density="compact"
                style="flex: 1"
              />
              <v-text-field
                v-model="field.value"
                label="Valor"
                variant="outlined"
                density="compact"
                style="flex: 2"
              />
              <v-btn
                icon
                size="small"
                color="error"
                variant="text"
                @click="removeCustomField(index)"
              >
                <v-icon>mdi-minus-circle</v-icon>
              </v-btn>
            </div>
            
            <v-btn
              variant="text"
              color="primary"
              prepend-icon="mdi-plus"
              size="small"
              @click="addCustomField"
            >
              Adicionar Campo
            </v-btn>
            
            <v-divider class="my-4" />
            
            <!-- Informações do registro -->
            <v-alert
              :color="getStatusColor(registration.registrationStatus)"
              variant="tonal"
              density="compact"
              class="mb-4"
            >
              <div class="d-flex align-center">
                <v-icon class="mr-2">{{ getStatusIcon(registration.registrationStatus) }}</v-icon>
                <span class="font-weight-medium">{{ getStatusLabel(registration.registrationStatus) }}</span>
              </div>
            </v-alert>
            
            <div class="text-caption text-grey">
              <p v-if="registration.sourceUrl">
                <v-icon size="14" class="mr-1">mdi-link</v-icon>
                <a :href="registration.sourceUrl" target="_blank" class="text-primary">
                  Ver página original
                </a>
              </p>
              <p>
                <v-icon size="14" class="mr-1">mdi-calendar</v-icon>
                Criado em: {{ formatDate(registration.createdAt) }}
              </p>
              <p v-if="registration.authorizedAt">
                <v-icon size="14" class="mr-1">mdi-check-circle</v-icon>
                Autorizado em: {{ formatDate(registration.authorizedAt) }}
              </p>
            </div>
          </v-col>
        </v-row>
      </v-form>
    </v-card-text>
    
    <v-divider />
    
    <v-card-actions class="pa-4">
      <v-btn variant="text" @click="$emit('cancel')">
        Cancelar
      </v-btn>
      
      <v-spacer />
      
      <v-btn
        v-if="registration.registrationStatus === 'pending_review'"
        color="success"
        variant="tonal"
        prepend-icon="mdi-check-circle"
        :disabled="!isFormValid"
        :loading="saving"
        @click="approveAndSave"
      >
        Salvar e Aprovar
      </v-btn>
      
      <v-btn
        color="primary"
        prepend-icon="mdi-content-save"
        :disabled="!isFormValid"
        :loading="saving"
        @click="save"
      >
        Salvar
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'

const props = defineProps({
  registration: {
    type: Object,
    required: true
  },
  saving: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['save', 'approve', 'cancel'])

// Form ref
const formRef = ref(null)
const isFormValid = ref(false)

// Form data
const form = reactive({
  name: '',
  slug: '',
  category: '',
  description: '',
  shortDescription: '',
  duration: '',
  regularPrice: '',
  salePrice: '',
  imageUrl: '',
  status: 'draft',
  customFields: {}
})

// Campos customizados como lista para UI
const customFieldsList = ref([])

// Categorias disponíveis
const categoryOptions = [
  'Administração',
  'Direito',
  'Educação',
  'Engenharias',
  'Gestão',
  'Negócios',
  'Saúde',
  'TI e Tecnologia',
  'Outros'
]

// Regras de validação
const rules = {
  required: v => !!v || 'Campo obrigatório',
  minLength: (min) => v => (v && v.length >= min) || `Mínimo de ${min} caracteres`,
  maxLength: (max) => v => (v && v.length <= max) || `Máximo de ${max} caracteres`,
  email: v => /.+@.+\..+/.test(v) || 'E-mail inválido',
  url: v => !v || /^https?:\/\/.+/.test(v) || 'URL inválida'
}

// Helpers
const getStatusColor = (status) => {
  const colors = {
    pending_review: 'warning',
    approved: 'success',
    rejected: 'grey',
    registered: 'primary',
    failed: 'error'
  }
  return colors[status] || 'grey'
}

const getStatusIcon = (status) => {
  const icons = {
    pending_review: 'mdi-clock-outline',
    approved: 'mdi-check-circle',
    rejected: 'mdi-close-circle',
    registered: 'mdi-cloud-check',
    failed: 'mdi-alert-circle'
  }
  return icons[status] || 'mdi-help-circle'
}

const getStatusLabel = (status) => {
  const labels = {
    pending_review: 'Aguardando Revisão',
    approved: 'Aprovado para Cadastro',
    rejected: 'Rejeitado',
    registered: 'Cadastrado no WooCommerce',
    failed: 'Erro no Cadastro'
  }
  return labels[status] || status
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Campos customizados
const addCustomField = () => {
  customFieldsList.value.push({ key: '', value: '' })
}

const removeCustomField = (index) => {
  customFieldsList.value.splice(index, 1)
}

const customFieldsToObject = () => {
  const obj = {}
  customFieldsList.value.forEach(field => {
    if (field.key && field.value) {
      obj[field.key] = field.value
    }
  })
  return obj
}

// Ações
const save = () => {
  const data = {
    name: form.name,
    slug: form.slug || undefined,
    category: form.category,
    description: form.description,
    shortDescription: form.shortDescription,
    duration: form.duration,
    regularPrice: form.regularPrice,
    salePrice: form.salePrice,
    imageUrl: form.imageUrl,
    status: form.status,
    customFields: customFieldsToObject()
  }
  
  emit('save', data)
}

const approveAndSave = () => {
  const data = {
    name: form.name,
    slug: form.slug || undefined,
    category: form.category,
    description: form.description,
    shortDescription: form.shortDescription,
    duration: form.duration,
    regularPrice: form.regularPrice,
    salePrice: form.salePrice,
    imageUrl: form.imageUrl,
    status: form.status,
    customFields: customFieldsToObject()
  }
  
  emit('approve', data)
}

// Inicializar form com dados do registro
const initializeForm = () => {
  form.name = props.registration.name || ''
  form.slug = props.registration.slug || ''
  form.category = props.registration.category || ''
  form.description = props.registration.description || ''
  form.shortDescription = props.registration.shortDescription || ''
  form.duration = props.registration.duration || ''
  form.regularPrice = props.registration.regularPrice || ''
  form.salePrice = props.registration.salePrice || ''
  form.imageUrl = props.registration.imageUrl || ''
  form.status = props.registration.status || 'draft'
  
  // Converter customFields para lista
  customFieldsList.value = Object.entries(props.registration.customFields || {})
    .map(([key, value]) => ({ key, value }))
}

// Watch para atualizar quando registration mudar
watch(() => props.registration, () => {
  initializeForm()
}, { immediate: true })

onMounted(() => {
  initializeForm()
})
</script>

<style scoped>
.course-registration-form {
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.course-registration-form .v-card-text {
  overflow-y: auto;
  flex: 1;
}

.gap-2 {
  gap: 8px;
}
</style>
