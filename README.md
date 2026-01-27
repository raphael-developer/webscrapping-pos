# Web Scraping Faculdade Única

Sistema completo de web scraping para coletar e exibir todos os cursos de pós-graduação da Faculdade Única, desenvolvido com arquitetura MVC, SOLID e boas práticas.

## 🏗️ Arquitetura

### Backend (Node.js)
- **Arquitetura MVC** com separação clara de responsabilidades
- **Puppeteer Cluster** para scraping eficiente com concorrência
- **Express.js** para API REST
- **Winston** para logging estruturado
- **Princípios SOLID** aplicados em todas as classes

### Frontend (Vue.js)
- **Vue.js 2** com Composition API
- **Vuetify** para interface Material Design
- **Vuex** para gerenciamento de estado
- **Vue Router** para navegação
- **Axios** para comunicação com API

## 📁 Estrutura do Projeto

```
webScrapping2/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Controllers MVC
│   │   ├── services/        # Lógica de negócio
│   │   ├── models/          # Modelos de dados
│   │   ├── routes/          # Definição de rotas
│   │   ├── utils/           # Utilitários
│   │   ├── config/          # Configurações
│   │   └── scripts/         # Scripts auxiliares
│   ├── logs/                # Arquivos de log
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
- Node.js 16+
- npm ou yarn

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run serve
```

### Executar Scraping
```bash
cd backend
npm run scrape
```

## 🔧 Configuração

### Backend (.env)
```env
PORT=3000
NODE_ENV=development
SCRAPER_CONCURRENCY=5
SCRAPER_MAX_RETRIES=3
SCRAPER_TIMEOUT=30000
TARGET_URL=https://www.faculdadeunica.com.br/pos-graduacao
```

### Frontend (.env)
```env
VUE_APP_API_URL=http://localhost:3000/api
VUE_APP_TITLE=Faculdade Única - Cursos
```

## 📊 Funcionalidades

### Backend
- ✅ Scraping de todas as categorias de cursos
- ✅ Processamento de conteúdo AJAX dinâmico
- ✅ API REST completa com filtros
- ✅ Sistema de logging estruturado
- ✅ Tratamento de erros robusto
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