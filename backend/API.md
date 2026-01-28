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

# Rate Limiting
RATE_LIMIT_MAX=100
```

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
