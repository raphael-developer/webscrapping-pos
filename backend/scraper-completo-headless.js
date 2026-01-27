const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

async function scrapeCompleto() {
  const browser = await puppeteer.launch({
    headless: "new", // Modo headless para funcionar no servidor
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

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    console.log("Iniciando scraping completo...");

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

    for (const categoria of categorias) {
      console.log(`\n=== PROCESSANDO: ${categoria.nome} ===`);
      try {
        await page.goto(categoria.url, {
          waitUntil: "networkidle2",
          timeout: 60000,
        });
        await page.waitForTimeout(3000);

        // Contador inicial de cursos
        let cursosAntes = 0;
        let cursosDepois = 0;

        // Verificar quantos cursos há inicialmente
        cursosAntes = await page.evaluate(() => {
          return document.querySelectorAll('a[href*="/pos-graduacao/"]').length;
        });
        console.log(`Cursos iniciais: ${cursosAntes}`);

        // Clicar no botão "Carregar mais cursos" até não existir mais
        let tentativas = 0;
        let semMudanca = 0;
        while (tentativas < 100 && semMudanca < 3) {
          const carregouMais = await page.evaluate(async () => {
            const btn = document.querySelector("button.cta-return-course-api");
            if (btn && !btn.disabled && btn.offsetParent !== null) {
              btn.click();
              return true;
            }
            return false;
          });

          if (!carregouMais) {
            console.log(
              `Botão "Carregar mais" não encontrado ou desabilitado (tentativa ${tentativas})`
            );
            break;
          }

          await page.waitForTimeout(3000); // Aguardar carregamento AJAX

          // Verificar se o número de cursos aumentou
          cursosDepois = await page.evaluate(() => {
            return document.querySelectorAll('a[href*="/pos-graduacao/"]')
              .length;
          });

          if (cursosDepois > cursosAntes) {
            console.log(
              `Tentativa ${
                tentativas + 1
              }: ${cursosAntes} → ${cursosDepois} cursos`
            );
            cursosAntes = cursosDepois;
            semMudanca = 0;
          } else {
            semMudanca++;
            console.log(
              `Tentativa ${
                tentativas + 1
              }: Sem mudança (${cursosDepois} cursos)`
            );
          }

          tentativas++;
        }

        console.log(
          `Total de tentativas: ${tentativas}, cursos finais: ${cursosDepois}`
        );

        // Scroll até o final para garantir carregamento
        await page.evaluate(async () => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(2000);

        // Agora sim, coletar todos os links de cursos
        let cursosCategoria = [];
        const cursosPagina = await page.evaluate(nomeCategoria => {
          const cursos = [];
          const links = document.querySelectorAll('a[href*="/pos-graduacao/"]');
          console.log(`Encontrados ${links.length} links com /pos-graduacao/`);

          links.forEach(link => {
            const href = link.href;
            const texto = link.textContent?.trim() || "";

            // Filtros mais rigorosos para garantir que são cursos reais
            if (
              href &&
              texto &&
              texto.length > 5 &&
              href.includes("/pos-graduacao/") &&
              !href.endsWith("/pos-graduacao") &&
              !texto.toLowerCase().includes("ver todos") &&
              !texto.toLowerCase().includes("ver mais") &&
              !texto.toLowerCase().includes("saiba mais") &&
              !texto.toLowerCase().includes("escolher curso") &&
              !texto.toLowerCase().includes("matricule-se") &&
              href.split("/").length > 5 // URLs de cursos específicos têm mais segmentos
            ) {
              cursos.push({
                name: texto.toUpperCase(),
                description: `Curso de pós-graduação em ${texto}`,
                link: href,
                category: nomeCategoria,
              });
            }
          });
          return cursos;
        }, categoria.nome);

        // Adicionar cursos únicos desta categoria
        cursosPagina.forEach(curso => {
          if (
            !cursosCategoria.find(
              c => c.name === curso.name || c.link === curso.link
            )
          ) {
            cursosCategoria.push(curso);
          }
        });

        // Remover duplicatas
        const cursosUnicos = cursosCategoria.filter(
          (curso, index, self) =>
            index ===
            self.findIndex(c => c.name === curso.name || c.link === curso.link)
        );

        console.log(
          `✅ Encontrados ${cursosUnicos.length} cursos únicos em ${categoria.nome}`
        );

        // Adicionar à lista geral
        cursosUnicos.forEach(curso => {
          if (
            !todosCursos.find(
              c => c.name === curso.name || c.link === curso.link
            )
          ) {
            todosCursos.push({
              id: courseId++,
              ...curso,
            });
          }
        });

        if (cursosUnicos.length > 0) {
          console.log("Primeiros cursos:");
          cursosUnicos.slice(0, 3).forEach(curso => {
            console.log(`  - ${curso.name}`);
          });
        }
      } catch (error) {
        console.error(`❌ Erro ao processar ${categoria.nome}:`, error.message);
      }
    }

    console.log(`\n🎉 RESULTADO FINAL`);
    console.log(`📚 Total de cursos coletados: ${todosCursos.length}`);

    // Salvar arquivo de backup primeiro
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const arquivoBackup = path.join(
      __dirname,
      `cursos-backup-${timestamp}.json`
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

    if (todosCursos.length < 600) {
      console.warn(
        "\n⚠️ ATENÇÃO: Foram coletados menos de 600 cursos. Pode haver um problema no scraping."
      );
    } else if (todosCursos.length >= 878) {
      console.log(
        `\n🎯 META ATINGIDA! Coletados ${todosCursos.length} cursos (meta: 878+)`
      );

      // Substituir o arquivo principal se conseguimos mais de 878 cursos
      const arquivoFinal = path.join(__dirname, "cursos-completo-novo.json");
      fs.writeFileSync(arquivoFinal, JSON.stringify(todosCursos, null, 2));
      console.log(`✅ Arquivo principal atualizado: ${arquivoFinal}`);
    } else {
      console.log(`\n📈 Progresso: ${todosCursos.length}/878 cursos coletados`);
    }
  } catch (error) {
    console.error("❌ Erro durante o scraping:", error);
  } finally {
    await browser.close();
  }
}

scrapeCompleto()
  .then(() => {
    console.log("🏁 Scraping completo finalizado!");
  })
  .catch(error => {
    console.error("❌ Erro no scraping:", error);
  });
