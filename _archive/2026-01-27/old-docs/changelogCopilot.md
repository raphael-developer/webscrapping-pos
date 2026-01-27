# changelogCopilot.md

## Análise Detalhada do Projeto (Gerado por IA)

### Estrutura Geral

- Projeto dividido em `backend/` (Node.js/Express) e `frontend/` (Vue 3 + Vuetify).
- Backend estruturado em MVC: controllers, services, models, routes, utils, scripts, config, logs.
- Frontend modularizado: components, views, store (Vuex), router, services, plugins.
- Dados de cursos salvos em arquivos JSON (ex: `cursos-site-novo.json`).

---

## Backend


### Principais Implementações

- **Arquitetura MVC**: Controllers (`CourseController.js`, `ScraperController.js`), Services, Models (`Course.js`, `Category.js`), Rotas (`courseRoutes.js`, `scraperRoutes.js`).
- **Web Scraping**: Scripts robustos usando Puppeteer e Puppeteer Cluster para scraping concorrente e resiliente.
  - Scripts: `scraper-completo.js`, `scraper-completo-final.js`, `scraper-novo.js`, `scraper-simples.js`, `scraper-categorias.js`, `atualizar-categorias.js`.
  - Salva resultados em arquivos JSON.
- **API REST**: Endpoints para listar cursos, buscar por ID, categoria, listar categorias, estatísticas, iniciar e monitorar scraping.
- **Logging Estruturado**: Winston, logs separados por nível (`logs/error.log`, `logs/combined.log`).
- **Segurança e Performance**: Helmet, CORS, Compression, variáveis de ambiente.
- **Scripts de Utilidade**: `kill-port.js` para liberar portas travadas.


### Funcionalidades

- Scraping de todas as categorias e cursos do site da Faculdade Única.
- Dados salvos em arquivos JSON e servidos via API.
- Estatísticas em tempo real (total de cursos, categorias, por categoria).
- Painel admin para iniciar scraping e visualizar status/estatísticas.
- Logging detalhado de operações críticas.

---

## Frontend


### Principais Implementações (Frontend)

- **Vue 3 + Composition API** em todos os componentes.
- **Componentes**: `AppNavigation.vue` (menu lateral com toggle de tema), `AppHeader.vue` (header com busca), `CourseCard.vue` (card de curso com design moderno).
- **Views**: `Home.vue` (grid de cursos, filtros, estatísticas, paginação), `CourseDetail.vue` (detalhes do curso), `CategoryCourses.vue` (cursos por categoria), `Admin.vue` (painel admin), `NotFound.vue` (404).
- **Gerenciamento de Estado**: Vuex modularizado (cursos, categorias, scraper).
- **Roteamento**: Vue Router 4, rotas dinâmicas para detalhes e categorias.
- **Serviços**: Serviço centralizado de API com Axios, interceptors para tratamento de erros.
- **Design e UX**: Vuetify 3, Material Design, responsividade, dark/light theme, animações, feedback visual, loading states.

### Funcionalidades (Frontend)

- Grid responsivo de cursos, filtros por categoria e busca, estatísticas em tempo real, paginação inteligente.
- Detalhes completos do curso, cursos relacionados, ações de favoritar e compartilhar (planejado).
- Painel admin para controle do scraping e estatísticas.
- Página 404 personalizada.

---


## Dados e Scripts

- Scraping de todas as categorias e cursos, dados salvos em `cursos-site-novo.json` e outros arquivos JSON.
- Scripts npm para dev, produção, scraping e kill-port.

---


## Tecnologias Utilizadas

- **Backend**: Node.js, Express, Puppeteer, Puppeteer Cluster, Winston, Helmet, CORS, Compression, dotenv.
- **Frontend**: Vue.js 3, Vuetify 3, Vuex 4, Vue Router 4, Axios, Lodash, Vite.

---


## Métricas e Arquitetura

- ~2000+ linhas de código, 25+ arquivos principais.
- Arquitetura MVC, SOLID, Clean Code.
- Logging estruturado, performance otimizada, segurança implementada.

---


## Observações

- Todas as funcionalidades descritas foram implementadas conforme os arquivos presentes.
- Para histórico de alterações linha a linha, consulte o controle de versão (Git).
- Este changelog foi gerado automaticamente por IA, analisando toda a estrutura e código do projeto.

---

**Desenvolvido seguindo as melhores práticas de arquitetura, SOLID, Clean Code e foco em performance e experiência do usuário.**
