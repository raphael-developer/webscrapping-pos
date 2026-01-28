# API de Web Scraping - Faculdade Única

## Visão Geral

API RESTful para scraping e gerenciamento de cursos da Faculdade Única. A aplicação coleta dados de cursos de pós-graduação, armazena localmente e disponibiliza através de endpoints HTTP.

## Tecnologias

- **Backend**: Node.js + Express
- **Scraping**: Puppeteer + Puppeteer Cluster
- **Frontend**: Vue 3 + Vuetify
- **Real-time**: Socket.IO
- **Logging**: Winston

## Instalação

```bash
# Backend
cd backend
npm install
cp .env.example .env  # Configure as variáveis de ambiente
npm start

# Frontend
cd frontend
npm install
npm run dev
```

## Estrutura do Projeto

```
├── backend/
│   ├── src/
│   │   ├── config/          # Configurações centralizadas
│   │   ├── controllers/     # Controladores das rotas
│   │   ├── middlewares/     # Middlewares (validação, rate limit)
│   │   ├── models/          # Modelos de dados
│   │   ├── routes/          # Definição de rotas
│   │   ├── services/        # Lógica de negócio
│   │   ├── utils/           # Utilitários (Logger, Errors)
│   │   ├── tests/           # Testes unitários
│   │   └── app.js           # Aplicação principal
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/      # Componentes Vue
    │   ├── views/           # Páginas
    │   ├── store/           # Vuex store
    │   ├── router/          # Vue Router
    │   └── services/        # Serviços de API
    └── package.json
```

## Endpoints da API

### Cursos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/courses` | Lista todos os cursos |
| GET | `/api/courses/:id` | Obtém curso por ID |
| GET | `/api/courses/categories` | Lista categorias |
| GET | `/api/courses/category/:category` | Cursos por categoria |
| GET | `/api/courses/statistics` | Estatísticas gerais |

### Scraper

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/scraper/start` | Inicia scraping |
| GET | `/api/scraper/status` | Status do scraping |
| GET | `/api/scraper/report` | Relatório de cursos novos |

### Comparação WooCommerce

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/comparison` | Comparar cursos scraped vs WooCommerce |
| GET | `/api/comparison/missing` | Cursos ausentes no WooCommerce |
| GET | `/api/comparison/missing/report` | Relatório de cursos ausentes |
| GET | `/api/comparison/missing/export` | Exportar ausentes em CSV |
| GET | `/api/comparison/sync` | Plano de sincronização |
| GET | `/api/comparison/woocommerce/stats` | Estatísticas do WooCommerce |
| GET | `/api/comparison/scraped/stats` | Estatísticas dos cursos scraped |
| POST | `/api/comparison/refresh` | Limpar cache |

### Health Check

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Status do servidor |

## Parâmetros de Query

### GET /api/courses

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `search` | string | Busca por título |
| `category` | string | Filtrar por categoria |
| `limit` | number | Limitar resultados (1-1000) |
| `page` | number | Paginação |

## WebSocket

Conecte ao servidor WebSocket para receber logs em tempo real:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  socket.emit('subscribe-scraping-logs');
});

socket.on('scraping-log', (data) => {
  console.log(data.level, data.message);
});
```

## Configuração

Veja o arquivo `.env.example` para todas as variáveis disponíveis.

### Principais configurações:

```env
# Servidor
PORT=3000

# Scraper
SCRAPER_CONCURRENCY=1
SCRAPER_FORCE_HEADLESS=1
SCRAPER_BLOCK_RESOURCES=1

# WooCommerce API
WOOCOMMERCE_URL=https://unicaposead.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxx

# Rate Limiting
RATE_LIMIT_MAX=100
```

## Arquitetura Clean para WooCommerce

A integração WooCommerce segue Clean Architecture:

```
backend/src/
├── domain/                    # Regras de Negócio Puras
│   ├── entities/              # Entidades de domínio
│   │   ├── WooCommerceCourse.js
│   │   └── ScrapedCourse.js
│   ├── repositories/          # Interfaces de repositório
│   │   ├── IWooCommerceRepository.js
│   │   └── IScrapedCourseRepository.js
│   └── services/              # Serviços de domínio
│       └── CourseComparisonService.js
├── application/               # Casos de Uso
│   ├── use-cases/
│   │   ├── CompareCourseUseCase.js
│   │   ├── GetMissingCoursesUseCase.js
│   │   └── SyncCoursesUseCase.js
│   └── dtos/
│       └── ComparisonResultDTO.js
├── infrastructure/            # Implementações Externas
│   ├── woocommerce/
│   │   ├── WooCommerceClient.js
│   │   └── WooCommerceRepository.js
│   └── repositories/
│       └── ScrapedCourseRepository.js
└── presentation/              # Interface HTTP
    ├── controllers/
    │   └── ComparisonController.js
    └── routes/
        └── comparisonRoutes.js
```

### Princípios SOLID Aplicados

- **S**ingle Responsibility: Cada classe tem uma única responsabilidade
- **O**pen/Closed: Extensível via interfaces, fechado para modificação
- **L**iskov Substitution: Repositórios podem ser substituídos por mocks
- **I**nterface Segregation: Interfaces específicas para cada contexto
- **D**ependency Inversion: Use cases dependem de abstrações, não implementações

## Testes

```bash
cd backend
npm test
```

## Scripts Disponíveis

### Backend

```bash
npm start          # Inicia o servidor
npm run dev        # Modo desenvolvimento (hot reload)
npm test           # Executa testes
npm run scrape     # Executa scraping via CLI
```

### Frontend

```bash
npm run dev        # Servidor de desenvolvimento
npm run build      # Build para produção
npm run preview    # Preview do build
```

## Categorias Suportadas

- Ciências da Saúde
- Educação
- Empresarial, TI e Negócios
- Engenharias
- Estética
- Gastronomia
- Jurídica
- MBA Executivo
- Meio Ambiente
- Psicologia
- Serviço Social

## Licença

Projeto privado - Todos os direitos reservados.
