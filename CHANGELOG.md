# [1.1.0] - 2025-09-12

### 🐞 Correções Críticas de Categoria e Dados

- Corrigido bug em que cursos de "Administração" e outros apareciam em categorias erradas (ex: "Ciências da Saúde") devido a filtro inadequado e dados inconsistentes.
- Backend agora filtra cursos por categoria usando igualdade com normalização (remove acentos, minúsculas, trim), evitando mistura de categorias por substring.
- Criado script `backend/src/scripts/fix-categories-from-slug.js` que ajusta o campo `category` de cada curso no JSON com base no slug do link, garantindo consistência dos dados.
- Executado o script, corrigindo 48 registros e ajustando a distribuição de cursos por categoria.
- Frontend já utilizava filtro robusto, mas agora recebe dados corretos do backend e JSON.
- Todos os detalhes de erros, causas, sintomas e correções estão documentados em `changelog-errors-2025-09-12.md`.

#### Como validar:
- Acesse uma categoria (ex: "Ciências da Saúde") e confira que apenas cursos daquela categoria aparecem.
- O endpoint `/api/courses/category/:category` e o filtro na tela agora são exatos e normalizados.

#### Arquivos afetados:
- `backend/src/controllers/CourseController.js`
- `backend/src/scripts/fix-categories-from-slug.js`
- `backend/cursos-completo-novo.json`
- `frontend/src/views/CategoryCourses.vue`

---

# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [1.0.0] - 2024-12-19

### 🎉 Lançamento Inicial

#### ✨ Funcionalidades Implementadas

##### Backend (Node.js + Express)
- **Arquitetura MVC Completa**
  - Controllers: `CourseController.js`, `ScraperController.js`
  - Services: `CourseService.js`, `ScraperService.js`
  - Models: `Course.js`, `Category.js`
  - Routes: `courseRoutes.js`, `scraperRoutes.js`

- **Sistema de Web Scraping Avançado**
  - Puppeteer Cluster para scraping concorrente
  - Múltiplos scrapers especializados:
    - `scraper-completo.js` - Scraping completo de todas as categorias
    - `scraper-categorias.js` - Scraping por categorias específicas
    - `scraper-novo.js` - Scraper otimizado para site novo
    - `scraper-simples.js` - Scraper básico
    - `atualizar-categorias.js` - Atualizador de categorias
  - Processamento de conteúdo AJAX dinâmico
  - Sistema de retry e tratamento de erros

- **API REST Completa**
  - `GET /api/courses` - Listar todos os cursos
  - `GET /api/courses/:id` - Obter curso por ID
  - `GET /api/courses/category/:category` - Cursos por categoria
  - `GET /api/courses/categories` - Listar categorias
  - `GET /api/courses/statistics` - Estatísticas dos cursos
  - `POST /api/scraper/start` - Iniciar scraping
  - `GET /api/scraper/status` - Status do scraping

- **Sistema de Logging Estruturado**
  - Winston para logging profissional
  - Logs separados por nível (error.log, combined.log)
  - Logging de todas as operações críticas

- **Configuração e Segurança**
  - Helmet para headers de segurança
  - CORS configurado
  - Compression habilitado
  - Variáveis de ambiente (.env)
  - Scripts de gerenciamento de portas

##### Frontend (Vue.js 3 + Vuetify)
- **Interface Moderna e Responsiva**
  - Vue.js 3 com Composition API
  - Vuetify 3 para Material Design
  - Design responsivo para todos os dispositivos

- **Componentes Desenvolvidos**
  - `AppHeader.vue` - Cabeçalho da aplicação
  - `AppNavigation.vue` - Navegação principal
  - `CourseCard.vue` - Card de exibição de cursos

- **Páginas/Views Implementadas**
  - `Home.vue` - Página inicial com grid de cursos
  - `CourseDetail.vue` - Detalhes completos do curso
  - `CategoryCourses.vue` - Cursos por categoria
  - `Admin.vue` - Painel administrativo
  - `NotFound.vue` - Página de erro 404

- **Gerenciamento de Estado**
  - Vuex 4 para estado global
  - Store modularizado
  - Estado reativo para cursos e categorias

- **Roteamento**
  - Vue Router 4
  - Rotas dinâmicas para categorias e detalhes
  - Navegação programática

- **Serviços e Integração**
  - Axios para comunicação com API
  - Serviço de API centralizado
  - Interceptors para tratamento de erros

#### 🛠️ Tecnologias e Dependências

##### Backend
- **Core**: Node.js, Express.js
- **Scraping**: Puppeteer, Puppeteer Cluster
- **Logging**: Winston
- **Segurança**: Helmet, CORS
- **Performance**: Compression
- **Desenvolvimento**: Nodemon, dotenv

##### Frontend
- **Core**: Vue.js 3, Vite
- **UI**: Vuetify 3, Material Design Icons
- **Estado**: Vuex 4
- **Roteamento**: Vue Router 4
- **HTTP**: Axios
- **Utilitários**: Lodash

#### 📁 Estrutura de Arquivos Criada
```
webScrapping2/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Controllers MVC
│   │   ├── services/        # Lógica de negócio
│   │   ├── models/          # Modelos de dados
│   │   ├── routes/          # Rotas da API
│   │   ├── scripts/         # Scripts de scraping
│   │   ├── utils/           # Utilitários (Logger)
│   │   ├── config/          # Configurações
│   │   ├── app.js           # Configuração do Express
│   │   └── server.js        # Servidor principal
│   ├── logs/                # Arquivos de log
│   ├── .env                 # Variáveis de ambiente
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes Vue
│   │   ├── views/           # Páginas/Views
│   │   ├── store/           # Vuex store
│   │   ├── router/          # Vue Router
│   │   ├── services/        # Serviços de API
│   │   ├── plugins/         # Plugins (Vuetify)
│   │   ├── App.vue          # Componente raiz
│   │   └── main.js          # Entry point
│   ├── public/              # Arquivos públicos
│   ├── .env                 # Variáveis de ambiente
│   └── package.json
├── kill-port.js             # Utilitário para gerenciar portas
└── README.md                # Documentação completa
```

#### 🎯 Funcionalidades Principais
- ✅ Scraping completo de todos os cursos da Faculdade Única
- ✅ Processamento de múltiplas categorias de cursos
- ✅ Interface web moderna e responsiva
- ✅ API REST completa com filtros e busca
- ✅ Sistema de logging estruturado
- ✅ Arquitetura MVC com princípios SOLID
- ✅ Tratamento robusto de erros
- ✅ Performance otimizada com concorrência
- ✅ Segurança implementada (Helmet, CORS)
- ✅ Documentação completa

#### 📊 Dados Coletados
- Múltiplos arquivos JSON com cursos coletados:
  - `cursos-faculdade-unica.json`
  - `cursos-por-categorias.json`
  - `cursos-site-novo.json`
  - `scraped-courses.json`
  - `todos-cursos-unica.json`

#### 🚀 Scripts de Execução
- `npm run dev` - Desenvolvimento com hot reload
- `npm start` - Produção
- `npm run scrape` - Executar scraping
- `npm run kill` - Matar processos em portas específicas

#### 🔧 Configurações
- Variáveis de ambiente configuradas
- CORS habilitado para desenvolvimento
- Logging estruturado em arquivos
- Compressão gzip habilitada
- Headers de segurança configurados

### 📈 Métricas do Projeto
- **Linhas de Código**: ~2000+ linhas
- **Arquivos Criados**: 25+ arquivos
- **Dependências**: 15+ pacotes backend, 10+ pacotes frontend
- **Funcionalidades**: 100% das especificações implementadas
- **Arquitetura**: MVC + SOLID + Clean Code

### 🎨 Design e UX
- Interface Material Design com Vuetify
- Design responsivo para mobile e desktop
- Navegação intuitiva
- Feedback visual para ações do usuário
- Loading states e tratamento de erros

### 🔒 Segurança e Performance
- Headers de segurança com Helmet
- CORS configurado adequadamente
- Compressão gzip para otimização
- Logging de segurança
- Validação de dados de entrada

---

## Próximas Versões Planejadas

### [1.1.0] - Melhorias Planejadas
- [ ] Sistema de cache Redis
- [ ] Testes automatizados (Jest/Cypress)
- [ ] Deploy automatizado
- [ ] Monitoramento de performance
- [ ] Notificações em tempo real

### [1.2.0] - Funcionalidades Avançadas
- [ ] Sistema de favoritos persistente
- [ ] Compartilhamento social
- [ ] Filtros avançados
- [ ] Exportação de dados
- [ ] Dashboard analytics

---

**Desenvolvido com ❤️ seguindo as melhores práticas de desenvolvimento web moderno**