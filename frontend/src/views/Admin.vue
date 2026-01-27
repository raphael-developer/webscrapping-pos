<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h3 mb-6">Painel Administrativo</h1>
      </v-col>
    </v-row>

    <!-- Scraper Controls -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Controle do Scraper</v-card-title>
          <v-card-text>
            <v-btn
              color="primary"
              :loading="scraping"
              :disabled="scraping"
              @click="startScraping"
              class="mr-2"
            >
              Iniciar Scraping
            </v-btn>
            <v-chip
              :color="statusColor"
              variant="outlined"
            >
              {{ scrapingStatus }}
            </v-chip>

            <!-- Instruções para o Console -->
            <v-alert
              type="info"
              variant="outlined"
              class="mt-4"
              density="compact"
            >
              <strong>💡 Dica:</strong> Abra a aba <strong>Console</strong> do DevTools (F12) para acompanhar os logs detalhados do scraping em tempo real!
            </v-alert>

            <div v-if="scrapingStatus === 'Fazendo scraping...' || scrapingStatus === 'Scraping já em andamento'">
              <template v-if="progress.totalCourses > 0">
                <v-progress-linear
                  :value="(progress.processedCourses / (progress.totalCourses || 1)) * 100"
                  color="primary"
                  class="my-4"
                ></v-progress-linear>
                <div class="text-caption grey--text">Processados {{ progress.processedCourses }} de {{ progress.totalCourses }} cursos</div>
              </template>
              <template v-else>
                <v-progress-linear
                  indeterminate
                  color="primary"
                  class="my-4"
                ></v-progress-linear>
                <div class="text-caption grey--text">O scraping está em andamento. Aguarde a conclusão para ver os dados atualizados.</div>
              </template>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Estatísticas</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item>
                <v-list-item-title>Total de Cursos</v-list-item-title>
                <v-list-item-subtitle>{{ statistics?.totalCourses ?? 0 }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Categorias</v-list-item-title>
                <v-list-item-subtitle>{{ statistics?.totalCategories ?? 0 }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useStore } from 'vuex'
import { io } from 'socket.io-client'

const store = useStore()

const scraping = ref(false)
const scrapingStatus = ref('Parado')
const statistics = ref({
  totalCourses: 0,
  totalCategories: 0
})
const progress = ref({ processedCourses: 0, totalCourses: 0 })
const socket = ref(null)

const statusColor = computed(() => {
  switch (scrapingStatus.value) {
    case 'Fazendo scraping...':
    case 'Executando': return 'warning'
    case 'Concluído': return 'success'
    case 'Erro': return 'error'
    default: return 'grey'
  }
})

const pollingInterval = ref(null)

const setupWebSocket = () => {
  // Conectar ao WebSocket
  socket.value = io('http://localhost:3000')
  
  socket.value.on('connect', () => {
    console.log('🔌 WebSocket conectado para logs de scraping')
    socket.value.emit('subscribe-scraping-logs')
  })
  
  socket.value.on('disconnect', () => {
    console.log('🔌 WebSocket desconectado')
  })
  
  socket.value.on('scraping-log', (logData) => {
    // Emitir logs no console do DevTools com estilo
    const styles = {
      info: 'color: #2196F3; font-weight: bold;',
      warn: 'color: #FF9800; font-weight: bold;',
      error: 'color: #F44336; font-weight: bold;',
      success: 'color: #4CAF50; font-weight: bold;'
    }
    
    const style = styles[logData.level] || 'color: #666;'
    console.log(`%c[SCRAPING ${logData.timestamp}] ${logData.message}`, style, logData.data)
  })
}

const closeWebSocket = () => {
  if (socket.value) {
    socket.value.emit('unsubscribe-scraping-logs')
    socket.value.disconnect()
    socket.value = null
  }
}

const startPolling = () => {
  // já tem polling
  if (pollingInterval.value) return
  pollingInterval.value = setInterval(async () => {
    try {
      const status = await fetchScrapingStatus()
      // se não estiver mais em progresso, parar polling
      if (!status?.isScrapingInProgress) {
        stopPolling()
      }
    } catch (e) {
      // ignore, continua tentando
    }
  }, 5000)
}

const stopPolling = () => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
}

const startScraping = async () => {
  if (scraping.value) return;
  
  // Log inicial no console
  console.log('%c🚀 INICIANDO SCRAPING', 'color: #4CAF50; font-size: 16px; font-weight: bold;')
  console.log('%cAbra a aba Console do DevTools para acompanhar os logs em tempo real!', 'color: #2196F3; font-size: 14px;')
  
  scraping.value = true
  scrapingStatus.value = 'Fazendo scraping...'
  
  try {
    await store.dispatch('scraper/startScraping')
    scrapingStatus.value = 'Concluído'
    await loadStatistics()
    // iniciar polling para acompanhar caso o backend demore a finalizar
    startPolling()
    
    console.log('%c✅ SCRAPING CONCLUÍDO!', 'color: #4CAF50; font-size: 16px; font-weight: bold;')
  } catch (error) {
    if (error?.response?.status === 409) {
      scrapingStatus.value = 'Scraping já em andamento'
      console.log('%c⚠️ SCRAPING JÁ EM ANDAMENTO', 'color: #FF9800; font-size: 14px; font-weight: bold;')
    } else {
      scrapingStatus.value = 'Erro'
      console.log('%c❌ ERRO NO SCRAPING', 'color: #F44336; font-size: 14px; font-weight: bold;', error)
    }
    // Atualiza status do backend após erro
    try {
      const status = await fetchScrapingStatus()
      // se backend realmente em progresso, iniciar polling
      if (status?.isScrapingInProgress) startPolling()
    } catch {}
    console.error('Erro no scraping:', error)
  } finally {
    scraping.value = false
  }
}

// Busca status real do backend
const fetchScrapingStatus = async () => {
  try {
    const status = await store.dispatch('scraper/fetchScrapingStatus')
    // atualizar estatísticas parciais se existirem
    if (status?.statistics) {
      statistics.value = status.statistics
    }
    if (status?.progress) {
      progress.value = {
        processedCourses: status.progress.processedCourses || 0,
        totalCourses: status.progress.totalCourses || 0
      }
    }
    if (status?.isScrapingInProgress) {
      scrapingStatus.value = 'Fazendo scraping...'
      scraping.value = true
    } else {
      scrapingStatus.value = 'Parado'
      scraping.value = false
    }
    return status
  } catch (e) {
    scrapingStatus.value = 'Erro ao buscar status'
    scraping.value = false
    return null
  }
}


const loadStatistics = async () => {
  try {
    const stats = await store.dispatch('courses/fetchStatistics')
    statistics.value = stats
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error)
  }
}

onMounted(() => {
  setupWebSocket()
  loadStatistics()
  // buscar status inicial e iniciar polling se necessário
  fetchScrapingStatus().then(status => {
    if (status?.isScrapingInProgress) startPolling()
  })
})

onBeforeUnmount(() => {
  stopPolling()
  closeWebSocket()
})
</script>