/**
 * Script para atualizar descrições dos cursos que falharam na primeira tentativa
 * Usa um padrão de extração mais abrangente
 */

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "../../cursos-completo-novo.json");
const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES = 2000;
const DELAY_BETWEEN_REQUESTS = 500;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchDescription(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();

    // Padrão mais abrangente - captura qualquer descrição no JSON
    // Procura por "description":"..." no formato double-escaped do Next.js
    const patterns = [
      // Padrão 1: descrição que começa com "A Pós-Graduação"
      /\\"description\\":\\"(A Pós-Graduação[^\\]+)\\"/,
      // Padrão 2: descrição que começa com "O curso"
      /\\"description\\":\\"(O [Cc]urso[^\\]+)\\"/,
      // Padrão 3: descrição que começa com "Este curso"
      /\\"description\\":\\"(Este curso[^\\]+)\\"/,
      // Padrão 4: descrição que começa com "O programa"
      /\\"description\\":\\"(O [Pp]rograma[^\\]+)\\"/,
      // Padrão 5: descrição que começa com "A especialização"
      /\\"description\\":\\"(A [Ee]specializa[çc][ãa]o[^\\]+)\\"/,
      // Padrão 6: descrição genérica com pelo menos 100 caracteres (não vazia)
      /\\"description\\":\\"([^\\]{100,})\\"/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        // Decodifica caracteres especiais
        let description = match[1]
          .replace(/\\u003c/g, "<")
          .replace(/\\u003e/g, ">")
          .replace(/\\u0026/g, "&")
          .replace(/\\n/g, " ")
          .replace(/\\r/g, "")
          .replace(/\\t/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        // Ignora descrições muito curtas ou genéricas
        if (description.length >= 50) {
          return { success: true, description };
        }
      }
    }

    return {
      success: false,
      error: "Descrição não encontrada com nenhum padrão",
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("ATUALIZAÇÃO DE DESCRIÇÕES - CURSOS RESTANTES");
  console.log("=".repeat(60));

  // Carrega os cursos
  const courses = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

  // Filtra apenas os cursos que não têm descrição (not_found ou vazia)
  const coursesToUpdate = courses.filter(
    c =>
      c.descriptionSource === "not_found" ||
      !c.description ||
      c.description.length < 50,
  );

  console.log(`\nTotal de cursos: ${courses.length}`);
  console.log(`Cursos para atualizar: ${coursesToUpdate.length}`);

  if (coursesToUpdate.length === 0) {
    console.log("\nNenhum curso precisa de atualização!");
    return;
  }

  let updated = 0;
  let failed = 0;

  // Processa em batches
  for (let i = 0; i < coursesToUpdate.length; i += BATCH_SIZE) {
    const batch = coursesToUpdate.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(coursesToUpdate.length / BATCH_SIZE);

    console.log(`\n--- Batch ${batchNum}/${totalBatches} ---`);

    for (const course of batch) {
      const title = course.title || course.name || "Sem nome";

      if (!course.url) {
        console.log(`  ❌ ${title.substring(0, 40)}... - Sem URL`);
        failed++;
        continue;
      }

      const result = await fetchDescription(course.url);

      if (result.success) {
        // Encontra o curso no array original e atualiza
        const idx = courses.findIndex(
          c => c.id === course.id || c.url === course.url,
        );
        if (idx >= 0) {
          courses[idx].description = result.description;
          courses[idx].descriptionSource = "site_original";
          courses[idx].descriptionFetchedAt = new Date().toISOString();
          courses[idx].descriptionGenerated = false;
          delete courses[idx].descriptionError;
        }
        console.log(`  ✅ ${title.substring(0, 40)}...`);
        updated++;
      } else {
        console.log(`  ❌ ${title.substring(0, 40)}... - ${result.error}`);
        failed++;
      }

      await sleep(DELAY_BETWEEN_REQUESTS);
    }

    // Salva progresso a cada 5 batches
    if (batchNum % 5 === 0) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(courses, null, 2));
      console.log(`\n💾 Progresso salvo! (${updated} atualizados)`);
    }

    if (i + BATCH_SIZE < coursesToUpdate.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  // Salva resultado final
  fs.writeFileSync(DATA_FILE, JSON.stringify(courses, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("RESULTADO FINAL");
  console.log("=".repeat(60));
  console.log(`✅ Atualizados: ${updated}`);
  console.log(`❌ Falhas: ${failed}`);

  // Estatísticas finais
  const finalCourses = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  const withDesc = finalCourses.filter(
    c => c.descriptionSource === "site_original",
  );
  const notFound = finalCourses.filter(
    c => c.descriptionSource === "not_found",
  );

  console.log("\n📊 Estatísticas Atualizadas:");
  console.log(`   Total de cursos: ${finalCourses.length}`);
  console.log(
    `   Com descrição do site: ${withDesc.length} (${((withDesc.length / finalCourses.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   Sem descrição: ${notFound.length} (${((notFound.length / finalCourses.length) * 100).toFixed(1)}%)`,
  );
}

main().catch(console.error);
