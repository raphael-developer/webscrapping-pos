# Cleanup Report - 2025-10-04

Esta pasta contém arquivos arquivados durante a limpeza solicitada ("arquiva tudo"). Nada foi deletado permanentemente; você pode restaurar movendo de volta ao local original.

## Scripts de scraping arquivados (`scripts/`)
- scrape-diff.js
- scraper-categorias.js
- scraper-completo.js
- scraper-novo.js
- scraper-simples.js

Motivo: variantes antigas / não referenciadas em `package.json` ou pelo backend atual. O script ativo permanece: `src/scripts/scraper.js`.

## Artefatos de erro do scraper (`errors/`)
Lista parcial (20 primeiros):
```
error-page-closed-1757901611235.url
error-page-closed-1757904258534.url
error-page-closed-1757904708245.url
error-scraper-after-goto-1757895515021.html
error-scraper-after-goto-1757895515021.png
error-scraper-after-goto-1757897135252.html
error-scraper-after-goto-1757897135252.png
error-scraper-after-goto-1757898660743.html
error-scraper-after-goto-1757898660743.png
error-scraper-after-goto-1757900168708.html
error-scraper-after-goto-1757900168708.png
error-scraper-after-goto-1757900712701.html
error-scraper-after-goto-1757900712701.png
error-scraper-after-goto-1757900795342.html
error-scraper-after-goto-1757900795342.png
error-scraper-after-goto-1757901011539.html
error-scraper-after-goto-1757901011539.png
error-scraper-after-goto-1757904042005.html
error-scraper-after-goto-1757904042005.png
error-scraper-after-goto-1757904078650.html
```

Motivo: snapshots e dumps gerados para debugging do Puppeteer / watchdog.

## Itens mantidos
- `src/scripts/scraper.js` (script principal utilizado pelo npm script `scrape`)
- Scripts utilitários: `add-images-to-courses.js`, `atualizar-categorias.js`, `course-image-keywords.js`, `fix-categories-from-slug.js`, `pexels-images.json`
- Base de cursos: `cursos-completo-novo.json`

## Próximos passos sugeridos
1. Revisar se algum script arquivado ainda é necessário; caso não, pode ser removido definitivamente.
2. Adicionar um processo de rotação/limpeza automática para artefatos de erro (ex.: cron deletando arquivos *error-* mais antigos que X dias).
3. (Opcional) Criar testes unitários básicos para `CourseController` e `ScraperService`.
4. (Opcional) Adicionar script npm para restaurar rapidamente um arquivo específico do arquivo.

## Como restaurar um arquivo
Exemplo:
```bash
mv backend/_archive/2025-10-04/scripts/scraper-completo.js backend/src/scripts/
```

## Observação
Se futuramente quiser excluir tudo definitivamente, basta remover esta pasta `_archive/2025-10-04/`.
