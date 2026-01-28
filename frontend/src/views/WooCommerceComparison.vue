<template>
  <v-container fluid>
    <!-- Header -->
    <v-row class="mb-4">
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center">
          <div>
            <h1 class="text-h4 font-weight-bold">
              <v-icon class="mr-2" color="primary">mdi-compare</v-icon>
              Comparação WooCommerce
            </h1>
            <p class="text-subtitle-1 text-medium-emphasis">
              Compare cursos do site com a API WooCommerce
            </p>
          </div>
          <div>
            <v-btn
              color="primary"
              :loading="loading"
              @click="runComparison"
              prepend-icon="mdi-sync"
            >
              Executar Comparação
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Snackbar de feedback -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="top"
    >
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Fechar</v-btn>
      </template>
    </v-snackbar>

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      closable
      class="mb-4"
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <!-- Loading State -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="text-h6 mt-4">Comparando cursos...</p>
        <p class="text-caption text-medium-emphasis">
          Isso pode levar alguns minutos
        </p>
      </v-col>
    </v-row>

    <!-- Results -->
    <template v-else-if="comparisonResult">
      <!-- Statistics Cards -->
      <v-row class="mb-4">
        <v-col cols="12" md="3">
          <v-card color="blue" variant="tonal">
            <v-card-text class="text-center">
              <v-icon size="48" class="mb-2">mdi-web</v-icon>
              <div class="text-h3 font-weight-bold">
                {{ comparisonResult.summary?.totalScraped || 0 }}
              </div>
              <div class="text-subtitle-1">Cursos no Site</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card color="purple" variant="tonal">
            <v-card-text class="text-center">
              <v-icon size="48" class="mb-2">mdi-cart</v-icon>
              <div class="text-h3 font-weight-bold">
                {{ comparisonResult.summary?.totalWooCommerce || 0 }}
              </div>
              <div class="text-subtitle-1">Cursos no WooCommerce</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card color="orange" variant="tonal">
            <v-card-text class="text-center">
              <v-icon size="48" class="mb-2">mdi-alert-circle</v-icon>
              <div class="text-h3 font-weight-bold">
                {{ comparisonResult.summary?.onlyInSite || 0 }}
              </div>
              <div class="text-subtitle-1">Ausentes no WooCommerce</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card color="green" variant="tonal">
            <v-card-text class="text-center">
              <v-icon size="48" class="mb-2">mdi-check-circle</v-icon>
              <div class="text-h3 font-weight-bold">
                {{ comparisonResult.summary?.matchPercentage || 0 }}%
              </div>
              <div class="text-subtitle-1">Correspondência</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Tabs for Details -->
      <v-card>
        <v-tabs v-model="activeTab" color="primary">
          <v-tab value="missing">
            <v-icon start>mdi-alert-circle-outline</v-icon>
            Ausentes ({{ comparisonResult.onlyInSite?.length || 0 }})
          </v-tab>
          <v-tab value="extra">
            <v-icon start>mdi-plus-circle-outline</v-icon>
            Extras na API ({{ comparisonResult.onlyInAPI?.length || 0 }})
          </v-tab>
          <v-tab value="differences">
            <v-icon start>mdi-swap-horizontal</v-icon>
            Com Diferenças ({{ comparisonResult.withDifferences?.length || 0 }})
          </v-tab>
        </v-tabs>

        <v-divider />

        <v-card-text>
          <v-tabs-window v-model="activeTab">
            <!-- Missing Courses Tab -->
            <v-tabs-window-item value="missing">
              <div class="d-flex justify-space-between align-center mb-4">
                <v-text-field
                  v-model="searchMissing"
                  prepend-inner-icon="mdi-magnify"
                  label="Buscar curso"
                  density="compact"
                  hide-details
                  clearable
                  class="max-width-300"
                />
                <v-btn
                  variant="outlined"
                  color="primary"
                  @click="exportCSV"
                  :loading="exporting"
                  :disabled="!comparisonResult?.onlyInSite?.length"
                  prepend-icon="mdi-download"
                >
                  Exportar CSV
                </v-btn>
              </div>

              <v-data-table
                :headers="missingHeaders"
                :items="filteredMissing"
                :items-per-page="10"
                :search="searchMissing"
                class="elevation-0"
              >
                <template v-slot:item.name="{ item }">
                  <div class="font-weight-medium">
                    {{ item.name }}
                  </div>
                </template>

                <template v-slot:item.category="{ item }">
                  <v-chip size="small" color="primary" variant="tonal">
                    {{ item.category }}
                  </v-chip>
                </template>

                <template v-slot:item.url="{ item }">
                  <v-btn
                    v-if="item.url"
                    :href="item.url"
                    target="_blank"
                    icon="mdi-open-in-new"
                    size="small"
                    variant="text"
                  />
                </template>
              </v-data-table>
            </v-tabs-window-item>

            <!-- Extra in API Tab -->
            <v-tabs-window-item value="extra">
              <v-data-table
                :headers="extraHeaders"
                :items="comparisonResult.onlyInAPI || []"
                :items-per-page="10"
                class="elevation-0"
              >
                <template v-slot:item.name="{ item }">
                  <div class="font-weight-medium">
                    {{ item.name }}
                  </div>
                </template>

                <template v-slot:item.category="{ item }">
                  <v-chip size="small" color="secondary" variant="tonal">
                    {{ item.category }}
                  </v-chip>
                </template>

                <template v-slot:item.permalink="{ item }">
                  <v-btn
                    v-if="item.permalink"
                    :href="item.permalink"
                    target="_blank"
                    icon="mdi-open-in-new"
                    size="small"
                    variant="text"
                  />
                </template>
              </v-data-table>
            </v-tabs-window-item>

            <!-- Differences Tab -->
            <v-tabs-window-item value="differences">
              <v-expansion-panels v-if="comparisonResult.withDifferences?.length">
                <v-expansion-panel
                  v-for="item in comparisonResult.withDifferences"
                  :key="item.name"
                >
                  <v-expansion-panel-title>
                    <div class="d-flex align-center">
                      <v-icon color="warning" class="mr-2">mdi-alert</v-icon>
                      <span class="font-weight-medium">{{ item.name }}</span>
                      <v-chip
                        size="x-small"
                        color="warning"
                        class="ml-2"
                      >
                        {{ item.differences.length }} diferença(s)
                      </v-chip>
                    </div>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-table density="compact">
                      <thead>
                        <tr>
                          <th>Campo</th>
                          <th>Site (Scraped)</th>
                          <th>WooCommerce</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="diff in item.differences" :key="diff.field">
                          <td>{{ diff.field }}</td>
                          <td class="text-error">{{ diff.scraped }}</td>
                          <td class="text-success">{{ diff.wooCommerce }}</td>
                        </tr>
                      </tbody>
                    </v-table>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>

              <v-alert v-else type="success" variant="tonal">
                Todos os cursos correspondentes estão sincronizados!
              </v-alert>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-card-text>
      </v-card>
    </template>

    <!-- Empty State -->
    <v-row v-else>
      <v-col cols="12">
        <v-card class="text-center py-12">
          <v-icon size="96" color="grey-lighten-1">mdi-compare-horizontal</v-icon>
          <h2 class="text-h5 mt-4 mb-2">Nenhuma comparação executada</h2>
          <p class="text-body-1 text-medium-emphasis mb-4">
            Clique no botão acima para comparar os cursos do site com o WooCommerce
          </p>
          <v-btn color="primary" @click="runComparison" prepend-icon="mdi-play">
            Iniciar Comparação
          </v-btn>
        </v-card>
      </v-col>
    </v-row>

    <!-- Snackbar de Feedback -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="bottom right"
    >
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">
          Fechar
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import api from '@/services/api';

export default {
  name: 'WooCommerceComparison',

  data() {
    return {
      loading: false,
      exporting: false,
      error: null,
      comparisonResult: null,
      activeTab: 'missing',
      searchMissing: '',
      snackbar: {
        show: false,
        text: '',
        color: 'success',
      },
      missingHeaders: [
        { title: 'Nome', key: 'name', sortable: true },
        { title: 'Categoria', key: 'category', sortable: true },
        { title: 'Slug', key: 'slug', sortable: true },
        { title: 'Link', key: 'url', sortable: false, align: 'center' },
      ],
      extraHeaders: [
        { title: 'ID', key: 'id', sortable: true },
        { title: 'Nome', key: 'name', sortable: true },
        { title: 'Categoria', key: 'category', sortable: true },
        { title: 'Link', key: 'permalink', sortable: false, align: 'center' },
      ],
    };
  },

  computed: {
    filteredMissing() {
      return this.comparisonResult?.onlyInSite || [];
    },
  },

  methods: {
    async runComparison() {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.getComparison({ detailed: 'true' });

        if (response.data.success) {
          this.comparisonResult = response.data.data;
        } else {
          throw new Error(response.data.message || 'Erro ao executar comparação');
        }
      } catch (err) {
        console.error('Erro na comparação:', err);
        this.error = err.response?.data?.message || err.message || 'Erro ao conectar com a API';
      } finally {
        this.loading = false;
      }
    },

    async exportCSV() {
      if (!this.comparisonResult?.onlyInSite?.length) {
        this.snackbar = {
          show: true,
          text: 'Não há cursos ausentes para exportar. Execute a comparação primeiro.',
          color: 'warning',
        };
        return;
      }

      try {
        this.exporting = true;
        const response = await api.exportMissingCSV();

        // Verificar se a resposta é válida (blob tem propriedade size)
        if (!response.data || (response.data.size !== undefined && response.data.size === 0)) {
          throw new Error('Arquivo CSV vazio recebido');
        }

        // Criar blob e fazer download
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `cursos-ausentes-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        // Feedback de sucesso
        this.snackbar = {
          show: true,
          text: 'CSV exportado com sucesso!',
          color: 'success',
        };
      } catch (err) {
        console.error('Erro ao exportar:', err);
        this.snackbar = {
          show: true,
          text: err.response?.data?.message || err.message || 'Erro ao exportar CSV. Tente novamente.',
          color: 'error',
        };
      } finally {
        this.exporting = false;
      }
    },
  },
};
</script>

<style scoped>
.max-width-300 {
  max-width: 300px;
}
</style>
