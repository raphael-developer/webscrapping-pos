<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h3 mb-4">
          <v-icon class="mr-2" size="40">mdi-radar</v-icon>
          Monitor de Scraping
        </h1>
      </v-col>
    </v-row>

    <!-- Status e Controles -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-cog</v-icon>
            Controles
          </v-card-title>
          <v-card-text>
            <div class="d-flex align-center flex-wrap gap-2">
              <v-btn
                color="primary"
                :loading="isStarting"
                :disabled="isScrapingInProgress"
                @click="startScraping"
                prepend-icon="mdi-play"
              >
                Iniciar Scraping
              </v-btn>

              <v-chip
                :color="statusColor"
                variant="elevated"
                class="ml-2"
              >
                <v-icon start :icon="statusIcon"></v-icon>
                {{ statusText }}
              </v-chip>

              <v-spacer></v-spacer>

              <v-btn
                variant="outlined"
                color="secondary"
                @click="refreshStatus"
                :loading="isRefreshing"
                prepend-icon="mdi-refresh"
              >
                Atualizar
              </v-btn>
            </div>

            <!-- Progresso -->
            <div v-if="isScrapingInProgress" class="mt-4">
              <v-progress-linear
                :model-value="progressPercent"
                color="primary"
                height="20"
                rounded
              >
                <template v-slot:default>
                  <strong>{{ progressPercent.toFixed(0) }}%</strong>
                </template>
              </v-progress-linear>
              <div class="text-caption mt-1 text-center">
                {{ progress.processedCategories }}/{{ progress.totalCategories }} categorias |
                {{ progress.processedCourses }} cursos processados
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-chart-bar</v-icon>
            Estatísticas Atuais
          </v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col cols="6">
                <div class="text-h4 text-primary">{{ statistics.totalCourses }}</div>
                <div class="text-caption">Total de Cursos</div>
              </v-col>
              <v-col cols="6">
                <div class="text-h4 text-secondary">{{ statistics.totalCategories }}</div>
                <div class="text-caption">Categorias</div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Relatório de Novos Cursos -->
    <v-row v-if="lastReport">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="success">mdi-new-box</v-icon>
            Último Relatório de Scraping
            <v-spacer></v-spacer>
            <v-chip size="small" color="info">
              {{ formatDate(lastReport.timestamp) }}
            </v-chip>
          </v-card-title>
          <v-card-text>
            <v-row class="mb-4">
              <v-col cols="6" sm="3">
                <v-card variant="tonal" color="primary">
                  <v-card-text class="text-center">
                    <div class="text-h5">{{ lastReport.totalCourses }}</div>
                    <div class="text-caption">Total Final</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6" sm="3">
                <v-card variant="tonal" color="success">
                  <v-card-text class="text-center">
                    <div class="text-h5">{{ lastReport.newCoursesCount }}</div>
                    <div class="text-caption">Novos Cursos</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6" sm="3">
                <v-card variant="tonal" color="warning">
                  <v-card-text class="text-center">
                    <div class="text-h5">{{ lastReport.keptFromPrevious || 0 }}</div>
                    <div class="text-caption">Mantidos</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6" sm="3">
                <v-card variant="tonal" :color="lastReport.saved ? 'success' : 'error'">
                  <v-card-text class="text-center">
                    <v-icon :color="lastReport.saved ? 'success' : 'error'">
                      {{ lastReport.saved ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                    </v-icon>
                    <div class="text-caption">{{ lastReport.saved ? 'Salvo' : 'Não Salvo' }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Lista de Novos Cursos -->
            <v-expansion-panels v-if="lastReport.newCourses && lastReport.newCourses.length > 0">
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
                  Ver {{ lastReport.newCourses.length }} cursos novos
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-list density="compact">
                    <v-list-item
                      v-for="(course, index) in lastReport.newCourses"
                      :key="index"
                    >
                      <template v-slot:prepend>
                        <v-icon color="success" size="small">mdi-new-box</v-icon>
                      </template>
                      <v-list-item-title>{{ course.title }}</v-list-item-title>
                      <v-list-item-subtitle>
                        {{ course.category }} | {{ course.duration }}
                      </v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>

            <!-- Status das Categorias -->
            <div class="mt-4">
              <h4 class="text-subtitle-1 mb-2">Status por Categoria</h4>
              <v-chip-group>
                <v-chip
                  v-for="cat in lastReport.categoriesStatus"
                  :key="cat.name"
                  :color="cat.status === 'ok' ? 'success' : 'warning'"
                  size="small"
                  variant="tonal"
                >
                  {{ cat.name }}: {{ cat.coursesCount }}
                </v-chip>
              </v-chip-group>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Logs em Tempo Real -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-console</v-icon>
            Logs em Tempo Real
            <v-spacer></v-spacer>
            <v-chip size="small" :color="isConnected ? 'success' : 'error'">
              {{ isConnected ? 'Conectado' : 'Desconectado' }}
            </v-chip>
            <v-btn
              icon
              variant="text"
              size="small"
              class="ml-2"
              @click="clearLogs"
              title="Limpar logs"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
            <v-tooltip location="bottom">
              <template v-slot:activator="{ props }">
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  @click="autoScroll = !autoScroll"
                  :color="autoScroll ? 'primary' : ''"
                  v-bind="props"
                >
                  <v-icon>{{ autoScroll ? 'mdi-arrow-down-bold' : 'mdi-arrow-down' }}</v-icon>
                </v-btn>
              </template>
              <span>{{ autoScroll ? 'Auto-scroll ativo: novos logs aparecem automaticamente' : 'Auto-scroll desativado: clique para ativar' }}</span>
            </v-tooltip>
          </v-card-title>
          <v-card-text>
            <div
              ref="logsContainer"
              class="logs-container"
              :class="{ 'dark-theme': isDarkTheme }"
            >
              <div
                v-for="(log, index) in logs"
                :key="index"
                class="log-line"
                :class="'log-' + log.level"
              >
                <span class="log-time">{{ formatTime(log.timestamp) }}</span>
                <span class="log-level">{{ log.level.toUpperCase() }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
              <div v-if="logs.length === 0" class="text-center text-grey pa-4">
                Nenhum log disponível. Inicie um scraping para ver os logs.
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useTheme } from 'vuetify'
import { io } from 'socket.io-client'
import api from '@/services/api'

const theme = useTheme()

// State
const isStarting = ref(false)
const isRefreshing = ref(false)
const isScrapingInProgress = ref(false)
const isConnected = ref(false)
const autoScroll = ref(true)
const logs = ref([])
const logsContainer = ref(null)
const socket = ref(null)

const statistics = ref({
  totalCourses: 0,
  totalCategories: 0,
})

const progress = ref({
  processedCourses: 0,
  processedCategories: 0,
  totalCourses: 0,
  totalCategories: 0,
})

const lastReport = ref(null)

// Computed
const isDarkTheme = computed(() => theme.global.current.value.dark)

const statusColor = computed(() => {
  if (isScrapingInProgress.value) return 'warning'
  if (lastReport.value?.saved) return 'success'
  return 'grey'
})

const statusIcon = computed(() => {
  if (isScrapingInProgress.value) return 'mdi-loading mdi-spin'
  if (lastReport.value?.saved) return 'mdi-check'
  return 'mdi-pause'
})

const statusText = computed(() => {
  if (isScrapingInProgress.value) return 'Em Andamento'
  if (lastReport.value?.saved) return 'Concluído'
  return 'Parado'
})

const progressPercent = computed(() => {
  if (!progress.value.totalCategories) return 0
  return (progress.value.processedCategories / progress.value.totalCategories) * 100
})

// Methods
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('pt-BR')
}

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString('pt-BR')
}

const clearLogs = () => {
  logs.value = []
}

const scrollToBottom = () => {
  if (autoScroll.value && logsContainer.value) {
    nextTick(() => {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight
    })
  }
}

const addLog = (log) => {
  logs.value.push(log)
  // Manter apenas os últimos 500 logs
  if (logs.value.length > 500) {
    logs.value = logs.value.slice(-500)
  }
  scrollToBottom()
}

const setupWebSocket = () => {
  const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000'
  socket.value = io(wsUrl)

  socket.value.on('connect', () => {
    isConnected.value = true
    socket.value.emit('subscribe-scraping-logs')
    addLog({
      level: 'info',
      message: '🔌 Conectado ao servidor WebSocket',
      timestamp: new Date().toISOString(),
    })
  })

  socket.value.on('disconnect', () => {
    isConnected.value = false
    addLog({
      level: 'warn',
      message: '🔌 Desconectado do servidor WebSocket',
      timestamp: new Date().toISOString(),
    })
  })

  socket.value.on('scraping-log', (logData) => {
    addLog(logData)
    // Atualizar status baseado nos logs
    if (logData.message?.includes('Processo finalizado')) {
      refreshStatus()
    }
  })
}

const closeWebSocket = () => {
  if (socket.value) {
    socket.value.emit('unsubscribe-scraping-logs')
    socket.value.disconnect()
    socket.value = null
  }
}

const refreshStatus = async () => {
  isRefreshing.value = true
  try {
    const response = await api.getScrapingStatus()
    const data = response.data.data

    isScrapingInProgress.value = data.isScrapingInProgress
    statistics.value = data.statistics || statistics.value
    progress.value = data.progress || progress.value
    lastReport.value = data.lastReport
  } catch (error) {
    console.error('Erro ao obter status:', error)
  } finally {
    isRefreshing.value = false
  }
}

const startScraping = async () => {
  isStarting.value = true
  try {
    await api.startScraping()
    isScrapingInProgress.value = true
    addLog({
      level: 'info',
      message: '🚀 Scraping iniciado com sucesso',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    if (error.response?.status === 409) {
      addLog({
        level: 'warn',
        message: '⚠️ Scraping já está em andamento',
        timestamp: new Date().toISOString(),
      })
    } else {
      addLog({
        level: 'error',
        message: `❌ Erro ao iniciar scraping: ${error.message}`,
        timestamp: new Date().toISOString(),
      })
    }
  } finally {
    isStarting.value = false
  }
}

// Lifecycle
onMounted(() => {
  setupWebSocket()
  refreshStatus()

  // Polling de status enquanto estiver em scraping
  const pollInterval = setInterval(() => {
    if (isScrapingInProgress.value) {
      refreshStatus()
    }
  }, 5000)

  onBeforeUnmount(() => {
    clearInterval(pollInterval)
    closeWebSocket()
  })
})

// Watch logs para auto-scroll
watch(logs, () => {
  scrollToBottom()
}, { deep: true })
</script>

<style scoped>
.logs-container {
  height: 400px;
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 8px;
  padding: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.5;
}

.logs-container.dark-theme {
  background: #0d0d0d;
}

.log-line {
  display: flex;
  gap: 8px;
  padding: 2px 0;
  color: #d4d4d4;
}

.log-time {
  color: #6a9955;
  flex-shrink: 0;
}

.log-level {
  width: 50px;
  flex-shrink: 0;
  font-weight: bold;
}

.log-message {
  word-break: break-word;
}

.log-info .log-level { color: #569cd6; }
.log-warn .log-level { color: #ce9178; }
.log-error .log-level { color: #f44747; }
.log-debug .log-level { color: #b5cea8; }

.log-error { color: #f44747; }
.log-warn { color: #ce9178; }
</style>
