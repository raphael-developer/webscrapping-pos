/**
 * Script para buscar descrições de TODOS os cursos do site Faculdade Única
 * Roda em batches para não sobrecarregar o servidor
 */

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "../../cursos-completo-novo.json");
const BACKUP_FILE = path.join(
  __dirname,
  "../../backups/cursos-antes-descricoes-" + Date.now() + ".json",
);
const BATCH_SIZE = 20;
const DELAY_BETWEEN_BATCHES = 500;
const DELAY_BETWEEN_REQUESTS = 100;

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

    // Padrão 1: objective (descrição curta/objetivo) - MELHOR OPÇÃO
    let match = html.match(/objective\\\":\\\"([^\\]+)/);
    if (match && match[1] && match[1].length >= 30) {
      return {
        success: true,
        description: match[1].replace(/\\n/g, " ").replace(/\s+/g, " ").trim(),
      };
    }

    // Padrão 2: description mais longa
    match = html.match(
      /\\\"description\\\":\\\"((?:A Pós-Graduação|O curso|Este curso|O programa|A especialização|No curso)[^\\]+)/,
    );
    if (match && match[1] && match[1].length >= 50) {
      return {
        success: true,
        description: match[1].replace(/\\n/g, " ").replace(/\s+/g, " ").trim(),
      };
    }

    // Verifica se é realmente 404 (página sem conteúdo de curso)
    if (!html.includes('"slug":') && !html.includes('"workload":')) {
      return { success: false, error: "Página não é um curso válido" };
    }

    return { success: false, error: "Descrição não encontrada no HTML" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("=".repeat(70));
  console.log("BUSCA DE DESCRIÇÕES - TODOS OS CURSOS");
  console.log("=".repeat(70));

  // Carrega e faz backup
  const courses = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(courses, null, 2));
  console.log(`\n📦 Backup criado: ${BACKUP_FILE}`);
  console.log(`📊 Total de cursos: ${courses.length}`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  const totalBatches = Math.ceil(courses.length / BATCH_SIZE);

  for (let i = 0; i < courses.length; i += BATCH_SIZE) {
    const batch = courses.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(
      `\n--- Batch ${batchNum}/${totalBatches} (cursos ${i + 1}-${Math.min(i + BATCH_SIZE, courses.length)}) ---`,
    );

    for (const course of batch) {
      const title = (course.title || "Sem título").substring(0, 45);

      // Pula se já tem descrição boa
      if (
        course.description &&
        course.description.length >= 50 &&
        course.descriptionSource === "site_original"
      ) {
        skipped++;
        continue;
      }

      if (!course.url) {
        console.log(`  ⏭️ ${title}... - Sem URL`);
        failed++;
        continue;
      }

      const result = await fetchDescription(course.url);

      if (result.success) {
        course.description = result.description;
        course.descriptionSource = "site_original";
        course.descriptionFetchedAt = new Date().toISOString();
        course.descriptionGenerated = false;
        console.log(`  ✅ ${title}...`);
        success++;
      } else {
        course.descriptionSource = "not_found";
        course.descriptionError = result.error;
        console.log(`  ❌ ${title}... - ${result.error}`);
        failed++;
      }

      await sleep(DELAY_BETWEEN_REQUESTS);
    }

    // Salva progresso a cada 5 batches
    if (batchNum % 5 === 0 || batchNum === totalBatches) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(courses, null, 2));
      console.log(
        `\n💾 Progresso salvo! (${success} ✅ | ${failed} ❌ | ${skipped} ⏭️)`,
      );
    }

    if (i + BATCH_SIZE < courses.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  // Salva resultado final
  fs.writeFileSync(DATA_FILE, JSON.stringify(courses, null, 2));

  console.log("\n" + "=".repeat(70));
  console.log("RESULTADO FINAL");
  console.log("=".repeat(70));
  console.log(`✅ Sucesso: ${success}`);
  console.log(`❌ Falha: ${failed}`);
  console.log(`⏭️ Pulados (já tinham): ${skipped}`);
  console.log(`📊 Taxa: ${((success / (success + failed)) * 100).toFixed(1)}%`);

  // Lista os que falharam
  const failedCourses = courses.filter(
    c => c.descriptionSource === "not_found",
  );
  if (failedCourses.length > 0 && failedCourses.length <= 20) {
    console.log("\n📋 Cursos sem descrição:");
    failedCourses.forEach(c => console.log(`   - ${c.title}`));
  }
}

main().catch(console.error);
