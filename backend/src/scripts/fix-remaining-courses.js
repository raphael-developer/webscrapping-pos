/**
 * Script para corrigir URLs e buscar descrições dos cursos restantes
 */

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "../../cursos-completo-novo.json");

// Mapeamento de correções de URL conhecidas
const URL_FIXES = {
  // URL com -1000-1000 duplicado
  "educacao-especial-e-inclusiva-1000-1000":
    "educacao-especial-e-inclusiva-1000",
  // URL sem carga horária
  "georreferenciamento-de-imoveis-rurais":
    "georreferenciamento-de-imoveis-rurais-720",
  // URL com dois-pontos (substituir : por -)
  "autismo:-direitos-fundamentais-e-aspectos-economicos-culturais-e-sociais-720":
    "autismo-direitos-fundamentais-e-aspectos-economicos-culturais-e-sociais-720",
};

// Cursos que são duplicados (existem em múltiplas categorias) - usar descrição já obtida
const DUPLICATE_COURSES = ["ABA - ANÁLISE DO COMPORTAMENTO APLICADA"];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchDescription(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();

    // Verifica se é página 404
    if (
      html.includes("404: This page could not be found") ||
      html.includes("NEXT_NOT_FOUND")
    ) {
      return { success: false, error: "404 - Página não encontrada" };
    }

    // Padrões de extração
    const patterns = [
      /\\"description\\":\\"(A Pós-Graduação[^\\]+)\\"/,
      /\\"description\\":\\"(O [Cc]urso[^\\]+)\\"/,
      /\\"description\\":\\"(Este curso[^\\]+)\\"/,
      /\\"description\\":\\"(O [Pp]rograma[^\\]+)\\"/,
      /\\"description\\":\\"(A [Ee]specializa[çc][ãa]o[^\\]+)\\"/,
      /\\"description\\":\\"([^\\]{100,})\\"/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let description = match[1]
          .replace(/\\u003c/g, "<")
          .replace(/\\u003e/g, ">")
          .replace(/\\u0026/g, "&")
          .replace(/\\n/g, " ")
          .replace(/\\r/g, "")
          .replace(/\\t/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (description.length >= 50) {
          return { success: true, description };
        }
      }
    }

    return { success: false, error: "Descrição não encontrada" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function fixUrl(url) {
  let fixed = url;

  // Remove "undefined" da área
  if (url.includes("/undefined/")) {
    // Tenta encontrar a área correta baseado no slug
    const slug = url.split("/").pop();
    // Por enquanto, marca como não corrigível
    return null;
  }

  // Aplica correções conhecidas
  for (const [wrong, correct] of Object.entries(URL_FIXES)) {
    if (url.includes(wrong)) {
      fixed = url.replace(wrong, correct);
      break;
    }
  }

  return fixed;
}

async function main() {
  console.log("=".repeat(60));
  console.log("CORREÇÃO DE CURSOS RESTANTES");
  console.log("=".repeat(60));

  const courses = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  const notFound = courses.filter(c => c.descriptionSource === "not_found");

  console.log(`\nCursos sem descrição: ${notFound.length}`);

  // Primeiro, copiar descrições de cursos duplicados
  console.log("\n--- Copiando descrições de cursos duplicados ---");
  for (const course of notFound) {
    if (DUPLICATE_COURSES.includes(course.title)) {
      // Buscar curso com mesmo título que tem descrição
      const source = courses.find(
        c =>
          c.title === course.title &&
          c.descriptionSource === "site_original" &&
          c.description?.length >= 50,
      );

      if (source) {
        const idx = courses.findIndex(c => c.id === course.id);
        if (idx >= 0) {
          courses[idx].description = source.description;
          courses[idx].descriptionSource = "site_original";
          courses[idx].descriptionFetchedAt = new Date().toISOString();
          courses[idx].descriptionGenerated = false;
          courses[idx].descriptionNote = "Copiado de curso duplicado";
          delete courses[idx].descriptionError;
          console.log(`  ✅ ${course.title} (copiado de ${source.category})`);
        }
      } else {
        console.log(`  ⚠️ ${course.title} - Não encontrou fonte`);
      }
    }
  }

  // Agora, tentar corrigir URLs e buscar
  console.log("\n--- Tentando corrigir URLs e buscar descrições ---");
  const stillNotFound = courses.filter(
    c => c.descriptionSource === "not_found",
  );

  for (const course of stillNotFound) {
    const title = course.title || "Sem nome";
    const fixedUrl = fixUrl(course.url);

    if (!fixedUrl) {
      console.log(
        `  ❌ ${title.substring(0, 40)}... - URL não corrigível (${course.url})`,
      );
      continue;
    }

    if (fixedUrl !== course.url) {
      console.log(`  🔧 Tentando URL corrigida: ${fixedUrl.split("/").pop()}`);
    }

    const result = await fetchDescription(fixedUrl);

    if (result.success) {
      const idx = courses.findIndex(c => c.id === course.id);
      if (idx >= 0) {
        courses[idx].description = result.description;
        courses[idx].descriptionSource = "site_original";
        courses[idx].descriptionFetchedAt = new Date().toISOString();
        courses[idx].descriptionGenerated = false;
        if (fixedUrl !== course.url) {
          courses[idx].urlOriginal = course.url;
          courses[idx].url = fixedUrl;
        }
        delete courses[idx].descriptionError;
      }
      console.log(`  ✅ ${title.substring(0, 40)}...`);
    } else {
      console.log(`  ❌ ${title.substring(0, 40)}... - ${result.error}`);
    }

    await sleep(500);
  }

  // Salvar resultados
  fs.writeFileSync(DATA_FILE, JSON.stringify(courses, null, 2));

  // Estatísticas finais
  const final = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  const withDesc = final.filter(c => c.descriptionSource === "site_original");
  const remaining = final.filter(c => c.descriptionSource === "not_found");

  console.log("\n" + "=".repeat(60));
  console.log("RESULTADO FINAL");
  console.log("=".repeat(60));
  console.log(
    `✅ Com descrição: ${withDesc.length} (${((withDesc.length / final.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `❌ Sem descrição: ${remaining.length} (${((remaining.length / final.length) * 100).toFixed(1)}%)`,
  );

  if (remaining.length > 0) {
    console.log("\n📋 Cursos ainda sem descrição:");
    remaining.forEach(c => console.log(`   - ${c.title} (${c.category})`));
  }
}

main().catch(console.error);
