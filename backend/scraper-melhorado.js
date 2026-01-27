const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

async function scrapeCompleto() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath:
      "/home/raphael/.cache/puppeteer/chrome/linux-140.0.7339.82/chrome-linux64/chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--window-size=1920,1080",
    ],
  });

  try {
    console.log("🚀 Iniciando scraping completo melhorado...");

    // URLs diretas para cada categoria
    const categorias = [
      {
        nome: "Ciências da Saúde",
        url: "https://www.faculdadeunica.com.br/pos-graduacao/ciencias-da-saude",
      },
      {
        nome: "Educação",
        url: "https://www.faculdadeunica.com.br/pos-graduacao/educacao",
      },
      {
        nome: "Empresarial, TI e Negócios",
        url: "https://www.faculdadeunica.com.br/pos-graduacao/empresarial-ti-e-negocios",
      },
      {
        nome: "Engenharias",
        url: "https://www.faculdadeunica.com.br/pos-graduacao/engenharias",
      },
      {
        nome: "Estética",
        url: "https://www.faculdadeunica.com.br/pos-graduacao/estetica",
      },
      {
        nome: "Gastronomia",
        url: "https://www.faculdadeunica.com.br/pos-graduacao/gastronomia",
      },
      {
        nome: "Jurídica",
        url: "https://www.faculdadeunica.com.br/pos-graduacao/juridica",
      },
      {
        nome: "MBA Executivo",
        url: "https://www.faculdadeunica.com.br/pos-graduacao/mba-executivo",
      },
      {
        nome: "Meio Ambiente",
        url: "https://www.faculdadeunica.com.br/pos-graduacao/meio-ambiente",
      },
      {
        nome: "Psicologia",
        url: "https://www.faculdadeunica.com.br/pos-graduacao/psicologia",
      },
      {
        nome: "Serviço Social",
        url: "https://www.faculdadeunica.com.br/pos-graduacao/servico-social",
      },
    ];

    let todosCursos = [];
    let courseId = 1;
    const cursosVistos = new Set(); // Para evitar duplicatas

    for (const categoria of categorias) {
      console.log(`\n=== PROCESSANDO: ${categoria.nome} ===`);

      // Criar nova página para cada categoria para evitar erros
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      try {
        await page.goto(categoria.url, {
          waitUntil: "networkidle2",
          timeout: 60000,
        });
        await page.waitForTimeout(5000); // Aguardar mais tempo para carregamento

        // Verificar se estamos realmente na página da categoria
        const currentUrl = page.url();
        console.log(`📍 URL atual: ${currentUrl}`);

        // Contador inicial de cursos específicos da categoria
        let cursosAntes = 0;
        let cursosDepois = 0;

        // Clicar no botão "Carregar mais cursos" até não existir mais
        let tentativas = 0;
        let semMudanca = 0;
        while (tentativas < 100 && semMudanca < 5) {
          // Verificar quantos cursos há
          cursosAntes = await page.evaluate(categoriaSlug => {
            const links = document.querySelectorAll(
              'a[href*="/pos-graduacao/"]'
            );
            let count = 0;
            links.forEach(link => {
              const href = link.href;
              if (
                href.includes(`/pos-graduacao/${categoriaSlug}/`) ||
                (href.split("/").length > 5 && !href.endsWith("/pos-graduacao"))
              ) {
                count++;
              }
            });
            return count;
          }, categoria.url.split("/").pop());

          const carregouMais = await page.evaluate(async () => {
            const btn = document.querySelector("button.cta-return-course-api");
            if (btn && !btn.disabled && btn.offsetParent !== null) {
              console.log("Clicando no botão carregar mais...");
              btn.click();
              return true;
            }
            return false;
          });

          if (!carregouMais) {
            console.log(
              `⚠️ Botão "Carregar mais" não encontrado (tentativa ${tentativas})`
            );
            break;
          }

          await page.waitForTimeout(4000); // Aguardar mais tempo para AJAX

          // Verificar se o número de cursos aumentou
          cursosDepois = await page.evaluate(categoriaSlug => {
            const links = document.querySelectorAll(
              'a[href*="/pos-graduacao/"]'
            );
            let count = 0;
            links.forEach(link => {
              const href = link.href;
              if (
                href.includes(`/pos-graduacao/${categoriaSlug}/`) ||
                (href.split("/").length > 5 && !href.endsWith("/pos-graduacao"))
              ) {
                count++;
              }
            });
            return count;
          }, categoria.url.split("/").pop());

          if (cursosDepois > cursosAntes) {
            console.log(
              `✅ Tentativa ${
                tentativas + 1
              }: ${cursosAntes} → ${cursosDepois} cursos`
            );
            cursosAntes = cursosDepois;
            semMudanca = 0;
          } else {
            semMudanca++;
            console.log(
              `⏳ Tentativa ${
                tentativas + 1
              }: Sem mudança (${cursosDepois} cursos) - sem mudança: ${semMudanca}/5`
            );
          }

          tentativas++;
        }

        console.log(
          `📊 Total de tentativas: ${tentativas}, cursos finais: ${cursosDepois}`
        );

        // Scroll final
        await page.evaluate(async () => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(3000);

        // Coletar cursos específicos desta categoria
        const categoriaSlug = categoria.url.split("/").pop();
        const cursosPagina = await page.evaluate(
          (nomeCategoria, categoriaSlug) => {
            const cursos = [];
            const links = document.querySelectorAll(
              'a[href*="/pos-graduacao/"]'
            );
            console.log(
              `Verificando ${links.length} links para categoria ${nomeCategoria}`
            );

            links.forEach(link => {
              const href = link.href;
              const texto = link.textContent?.trim() || "";

              // Filtrar apenas cursos desta categoria específica
              const isCursoDestaCategoria =
                href.includes(`/pos-graduacao/${categoriaSlug}/`) ||
                (href.split("/").length > 5 &&
                  !href.endsWith("/pos-graduacao") &&
                  !href.includes("/pos-graduacao/ciencias-da-saude/") &&
                  !href.includes("/pos-graduacao/educacao/") &&
                  !href.includes("/pos-graduacao/empresarial-ti-e-negocios/") &&
                  !href.includes("/pos-graduacao/engenharias/") &&
                  !href.includes("/pos-graduacao/estetica/") &&
                  !href.includes("/pos-graduacao/gastronomia/") &&
                  !href.includes("/pos-graduacao/juridica/") &&
                  !href.includes("/pos-graduacao/mba-executivo/") &&
                  !href.includes("/pos-graduacao/meio-ambiente/") &&
                  !href.includes("/pos-graduacao/psicologia/") &&
                  !href.includes("/pos-graduacao/servico-social/")) ||
                href.includes(`/pos-graduacao/${categoriaSlug}/`);

              if (
                href &&
                texto &&
                texto.length > 3 &&
                isCursoDestaCategoria &&
                !texto.toLowerCase().includes("ver todos") &&
                !texto.toLowerCase().includes("ver mais") &&
                !texto.toLowerCase().includes("saiba mais") &&
                !texto.toLowerCase().includes("escolher curso") &&
                !texto.toLowerCase().includes("matricule-se") &&
                !texto.toLowerCase().includes("categoria")
              ) {
                cursos.push({
                  name: texto.toUpperCase().trim(),
                  description: `Curso de pós-graduação em ${texto}`,
                  link: href,
                  category: nomeCategoria,
                });
              }
            });

            console.log(
              `Encontrados ${cursos.length} cursos para ${nomeCategoria}`
            );
            return cursos;
          },
          categoria.nome,
          categoriaSlug
        );

        // Filtrar duplicatas locais
        const cursosUnicos = [];
        const linkVistos = new Set();

        cursosPagina.forEach(curso => {
          const key = `${curso.name}|${curso.link}`;
          if (!cursosVistos.has(key) && !linkVistos.has(curso.link)) {
            cursosUnicos.push(curso);
            cursosVistos.add(key);
            linkVistos.add(curso.link);
          }
        });

        console.log(
          `✅ ${cursosUnicos.length} cursos únicos em ${categoria.nome}`
        );

        // Adicionar à lista geral
        cursosUnicos.forEach(curso => {
          todosCursos.push({
            id: courseId++,
            ...curso,
          });
        });

        if (cursosUnicos.length > 0) {
          console.log("📝 Primeiros cursos únicos:");
          cursosUnicos.slice(0, 3).forEach(curso => {
            console.log(`  - ${curso.name}`);
          });
        }
      } catch (error) {
        console.error(`❌ Erro ao processar ${categoria.nome}:`, error.message);
      } finally {
        await page.close(); // Fechar página após cada categoria
      }
    }

    console.log(`\n🎉 RESULTADO FINAL`);
    console.log(`📚 Total de cursos coletados: ${todosCursos.length}`);

    // Salvar arquivo de backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const arquivoBackup = path.join(
      __dirname,
      `cursos-melhorado-${timestamp}.json`
    );
    fs.writeFileSync(arquivoBackup, JSON.stringify(todosCursos, null, 2));
    console.log(`💾 Backup salvo em: ${arquivoBackup}`);

    // Estatísticas
    const stats = {};
    todosCursos.forEach(curso => {
      stats[curso.category] = (stats[curso.category] || 0) + 1;
    });

    console.log("\n📊 ESTATÍSTICAS POR CATEGORIA:");
    Object.entries(stats)
      .sort(([, a], [, b]) => b - a)
      .forEach(([categoria, quantidade]) => {
        console.log(`  ${categoria}: ${quantidade} cursos`);
      });

    if (todosCursos.length >= 878) {
      console.log(
        `\n🎯 META ATINGIDA! Coletados ${todosCursos.length} cursos (meta: 878+)`
      );

      // Substituir o arquivo principal
      const arquivoFinal = path.join(__dirname, "cursos-completo-novo.json");
      fs.writeFileSync(arquivoFinal, JSON.stringify(todosCursos, null, 2));
      console.log(`✅ Arquivo principal atualizado: ${arquivoFinal}`);
    } else {
      console.log(`\n📈 Progresso: ${todosCursos.length}/878 cursos coletados`);
      console.log(`❗ Ainda faltam ${878 - todosCursos.length} cursos`);
    }
  } catch (error) {
    console.error("❌ Erro durante o scraping:", error);
  } finally {
    await browser.close();
  }
}

scrapeCompleto()
  .then(() => {
    console.log("🏁 Scraping melhorado finalizado!");
  })
  .catch(error => {
    console.error("❌ Erro no scraping:", error);
  });
