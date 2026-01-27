const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

async function scrapeCompleto() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized"],
  });

  const page = await browser.newPage();

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
          timeout: 30000,
        });
        await page.waitForTimeout(2000);

        // Clicar no botão "Carregar mais cursos" até não existir mais
        let tentativas = 0;
        while (true) {
          const carregouMais = await page.evaluate(async () => {
            const btn = document.querySelector("button.cta-return-course-api");
            if (btn && !btn.disabled && btn.offsetParent !== null) {
              btn.click();
              return true;
            }
            return false;
          });
          if (!carregouMais) break;
          await page.waitForTimeout(2000);
          tentativas++;
          if (tentativas > 50) break; // segurança para não travar
        }

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
          links.forEach(link => {
            const href = link.href;
            const texto = link.textContent?.trim() || "";
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
              href.split("/").length > 5
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
          `Encontrados ${cursosUnicos.length} cursos em ${categoria.nome}`
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
        console.error(`Erro ao processar ${categoria.nome}:`, error.message);
      }
    }

    console.log(`\n=== RESULTADO FINAL ===`);
    console.log(`Total de cursos coletados: ${todosCursos.length}`);

    // Salvar arquivo diretamente em cursos-completo-novo.json
    const arquivoFinal = path.join(__dirname, "cursos-completo-novo.json");
    fs.writeFileSync(arquivoFinal, JSON.stringify(todosCursos, null, 2));

    // Estatísticas
    const stats = {};
    todosCursos.forEach(curso => {
      stats[curso.category] = (stats[curso.category] || 0) + 1;
    });

    console.log("\n=== ESTATÍSTICAS POR CATEGORIA ===");
    Object.entries(stats)
      .sort(([, a], [, b]) => b - a)
      .forEach(([categoria, quantidade]) => {
        console.log(`${categoria}: ${quantidade} cursos`);
      });

    if (todosCursos.length < 600) {
      console.warn(
        "\nATENÇÃO: Foram coletados menos de 600 cursos. Verifique se todas as páginas e categorias foram processadas corretamente."
      );
    } else {
      console.log("\nQuantidade de cursos parece adequada.");
    }
  } catch (error) {
    console.error("Erro durante o scraping:", error);
  } finally {
    await browser.close();
  }
}

scrapeCompleto()
  .then(() => {
    console.log("Scraping completo finalizado!");
  })
  .catch(error => {
    console.error("Erro no scraping:", error);
  });
