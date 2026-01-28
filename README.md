# Web Scraping Faculdade Única

Sistema completo de web scraping para coletar e exibir todos os cursos de pós-graduação da Faculdade Única, desenvolvido com arquitetura MVC, SOLID e boas práticas.

## 🏗️ Arquitetura

### Backend (Node.js)
- **Arquitetura MVC** com separação clara de responsabilidades
- **Puppeteer Cluster** para scraping eficiente com concorrência
- **Express.js** para API REST
- **Socket.IO** para logs em tempo real
- **Winston** para logging estruturado
- **Rate Limiting** para proteção contra abusos
- **Validação de entrada** em todas as rotas
- **Graceful Shutdown** para encerramento seguro
- **Princípios SOLID** aplicados em todas as classes

### Frontend (Vue.js)
- **Vue 3** com Composition API
- **Vuetify 3** para interface Material Design
- **Vuex** para gerenciamento de estado
- **Vue Router** para navegação
- **Axios** para comunicação com API
- **Socket.IO Client** para logs em tempo real

## 📁 Estrutura do Projeto

```
webScrapping2/
├── backend/
│   ├── src/
│   │   ├── config/          # Configurações centralizadas
│   │   ├── controllers/     # Controllers MVC
│   │   ├── middlewares/     # Middlewares (validação, rate limit)
│   │   ├── models/          # Modelos de dados
│   │   ├── routes/          # Definição de rotas
│   │   ├── services/        # Lógica de negócio
│   │   ├── tests/           # Testes unitários
│   │   ├── utils/           # Utilitários (Logger, Errors)
│   │   └── scripts/         # Scripts auxiliares
│   ├── backups/             # Backups automáticos
│   ├── logs/                # Arquivos de log
│   ├── scraping-history/    # Histórico de scrapes
│   ├── scraping-reports/    # Relatórios de scrapes
│   ├── API.md               # Documentação da API
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes Vue
│   │   ├── views/           # Páginas/Views
│   │   ├── store/           # Vuex store
│   │   ├── router/          # Vue Router
│   │   ├── services/        # Serviços de API
│   │   └── plugins/         # Plugins Vue
│   ├── public/              # Arquivos públicos
│   └── package.json
└── README.md
```

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Backend
```bash
cd backend
npm install
cp .env.example .env  # Configure as variáveis
npm run dev           # Desenvolvimento
npm start             # Produção
```

### Frontend
```bash
cd frontend
npm install
npm run dev           # Desenvolvimento
npm run build         # Build produção
```

### Executar Scraping
```bash
cd backend
npm run scrape         # Scraping básico
npm run full:scrape    # Scraping completo
```

## 🔧 Configuração

Veja o arquivo `backend/.env.example` para todas as opções disponíveis.

### Principais configurações:
```env
# Servidor
PORT=3000
NODE_ENV=development

# Scraper
SCRAPER_CONCURRENCY=1
SCRAPER_FORCE_HEADLESS=1
SCRAPER_BLOCK_RESOURCES=1

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_SCRAPER_MAX=5
```

## 📊 Funcionalidades

### Backend
- ✅ Scraping inteligente de todas as categorias
- ✅ Detecção automática de cursos novos
- ✅ Processamento de conteúdo AJAX dinâmico
- ✅ API REST completa com validação
- ✅ WebSocket para logs em tempo real
- ✅ Rate limiting para proteção
- ✅ Sistema de logging estruturado
- ✅ Backup automático antes de alterações
- ✅ Tratamento de erros robusto
- ✅ Graceful shutdown
- ✅ Arquitetura escalável

### Frontend
- ✅ Interface responsiva com Vuetify
- ✅ Listagem de todos os cursos
- ✅ Filtros por categoria e busca
- ✅ Paginação inteligente
- ✅ Detalhes completos dos cursos
- ✅ Sistema de favoritos
- ✅ Compartilhamento de cursos
- ✅ Painel administrativo

## 🎯 Endpoints da API

### Cursos
- `GET /api/courses` - Listar todos os cursos
- `GET /api/courses/:id` - Obter curso por ID
- `GET /api/courses/category/:category` - Cursos por categoria
- `GET /api/courses/categories` - Listar categorias
- `GET /api/courses/statistics` - Estatísticas

### Scraper
- `POST /api/scraper/start` - Iniciar scraping
- `GET /api/scraper/status` - Status do scraping

## 🏛️ Princípios Aplicados

### SOLID
- **S** - Single Responsibility: Cada classe tem uma responsabilidade específica
- **O** - Open/Closed: Extensível sem modificar código existente
- **L** - Liskov Substitution: Subclasses substituíveis
- **I** - Interface Segregation: Interfaces específicas
- **D** - Dependency Inversion: Dependências abstraídas

### Clean Code
- Nomes descritivos e significativos
- Funções pequenas e focadas
- Comentários apenas quando necessário
- Tratamento adequado de erros
- Testes implícitos na estrutura

### Design Patterns
- **MVC** - Separação de responsabilidades
- **Service Layer** - Lógica de negócio isolada
- **Repository Pattern** - Abstração de dados
- **Observer Pattern** - Vuex para estado reativo

## 🔍 Como Funciona o Scraping

1. **Inicialização**: Puppeteer Cluster com múltiplas instâncias
2. **Descoberta**: Identifica todas as categorias na página inicial
3. **Navegação**: Para cada categoria, simula cliques para carregar conteúdo AJAX
4. **Extração**: Coleta dados dos cursos usando seletores inteligentes
5. **Processamento**: Valida e estrutura os dados coletados
6. **Armazenamento**: Mantém em memória para servir via API

## 🎨 Interface do Usuário

### Página Inicial
- Grid responsivo de cursos
- Filtros por categoria e busca
- Estatísticas em tempo real
- Paginação inteligente

### Detalhes do Curso
- Informações completas
- Cursos relacionados
- Ações (favoritar, compartilhar)
- Link para site oficial

### Painel Admin
- Controle do scraping
- Estatísticas detalhadas
- Logs em tempo real
- Status do sistema

## 🛠️ Tecnologias Utilizadas

### Backend
- Node.js + Express.js
- Puppeteer + Puppeteer Cluster
- Winston (Logging)
- Helmet (Segurança)
- CORS + Compression

### Frontend
- Vue.js 2
- Vuetify (Material Design)
- Vuex (Estado)
- Vue Router (Navegação)
- Axios (HTTP)
- Lodash (Utilitários)

## 📈 Performance

- **Concorrência**: Múltiplas instâncias do Puppeteer
- **Cache**: Dados mantidos em memória
- **Compressão**: Gzip habilitado
- **Lazy Loading**: Componentes carregados sob demanda
- **Paginação**: Renderização otimizada

## 🔒 Segurança

- Helmet para headers de segurança
- CORS configurado adequadamente
- Validação de entrada
- Sanitização de dados
- Rate limiting implícito

## 📝 Logs

Sistema de logging estruturado com níveis:
- **Error**: Erros críticos
- **Warn**: Avisos importantes
- **Info**: Informações gerais
- **Debug**: Detalhes de desenvolvimento

## 🚀 Deploy

### Backend
```bash
npm start
```

### Frontend
```bash
npm run build
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 👨‍💻 Desenvolvedor

Desenvolvido seguindo as melhores práticas de desenvolvimento web moderno, com foco em:
- Código limpo e manutenível
- Arquitetura escalável
- Performance otimizada
- Experiência do usuário excepcional