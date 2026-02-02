/**
 * @fileoverview Script para atualizar TODOS os cursos com descrições reais do site
 * Processa em lotes para não sobrecarregar o servidor
 */

const fs = require("fs").promises;
const path = require("path");
const https = require("https");

// Configurações
const COURSES_FILE = path.join(__dirname, "../../cursos-completo-novo.json");
const BACKUP_FILE = path.join(
  __dirname,
  "../../backups/cursos-antes-descricoes.json",
);
const BATCH_SIZE = 10; // Cursos por lote
const DELAY_BETWEEN_BATCHES = 2000; // 2 segundos entre lotes
const DELAY_BETWEEN_REQUESTS = 500; // 500ms entre requisições

/**
 * Faz requisição HTTP simples com timeout
 */
function fetchHTML(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, res => {
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        // Seguir redirect
        fetchHTML(res.headers.location, timeout).then(resolve).catch(reject);
        return;
      }

      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => resolve(data));
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
  });
}

/**
 * Extrai a descrição do curso de uma página do site
 * O site usa Next.js e os dados do curso vêm em JSON dentro de self.__next_f.push
 * As strings JSON estão duplamente escapadas: \"description\":\"texto\"
 */
async function fetchCourseDescription(courseUrl) {
  try {
    const html = await fetchHTML(courseUrl);

    let description = "";
    let objective = "";

    // O HTML tem strings JSON duplamente escapadas: \\"description\\":\\"texto\\"
    // Padrão 1: Buscar "description" com "O curso de" (descrição principal)
    const descPatterns = [
      /\\"description\\":\\"(O curso de[^\\]+)\\"/,
      /\\"description\\":\\"(O curso[^\\]{50,400})\\"/,
    ];

    for (const pattern of descPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].length >= 50) {
        description = match[1]
          .replace(/\\n/g, " ")
          .replace(/\\u[\dA-Fa-f]{4}/g, match => {
            try {
              return String.fromCharCode(parseInt(match.slice(2), 16));
            } catch {
              return "";
            }
          })
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\")
          .replace(/\s+/g, " ")
          .trim();
        break;
      }
    }

    // Padrão 2: Buscar "objective" (às vezes tem informações úteis)
    if (!description) {
      const objPatterns = [/\\"objective\\":\\"([^\\]{30,})\\"/];

      for (const pattern of objPatterns) {
        const match = html.match(pattern);
        if (match && match[1] && match[1].length >= 30) {
          objective = match[1]
            .replace(/\\n/g, " ")
            .replace(/\\u[\dA-Fa-f]{4}/g, match => {
              try {
                return String.fromCharCode(parseInt(match.slice(2), 16));
              } catch {
                return "";
              }
            })
            .replace(/\s+/g, " ")
            .trim();
          break;
        }
      }
    }

    // Se não encontrou description mas tem objective, usar objective
    if (!description && objective && objective.length >= 30) {
      description = objective;
    }

    return {
      success: !!description,
      description,
      objective,
      source: "site_original",
    };
  } catch (error) {
    return {
      success: false,
      description: "",
      error: error.message,
    };
  }
}

/**
 * Delay helper
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Processa um único curso
 */
async function processCourse(course, index, total) {
  if (!course.url) {
    console.log(
      `  [${index + 1}/${total}] ⚠️  ${course.title.substring(0, 40)}... - Sem URL`,
    );
    return { ...course, descriptionSource: "missing_url" };
  }

  // Se já tem descrição do site, pular
  if (course.description && course.descriptionSource === "site_original") {
    console.log(
      `  [${index + 1}/${total}] ✓  ${course.title.substring(0, 40)}... - Já tem descrição`,
    );
    return course;
  }

  const result = await fetchCourseDescription(course.url);

  if (result.success && result.description) {
    console.log(
      `  [${index + 1}/${total}] ✅ ${course.title.substring(0, 40)}... - OK (${result.description.length} chars)`,
    );
    return {
      ...course,
      description: result.description,
      descriptionSource: "site_original",
      descriptionFetchedAt: new Date().toISOString(),
    };
  } else {
    console.log(
      `  [${index + 1}/${total}] ❌ ${course.title.substring(0, 40)}... - Falha: ${result.error || "Descrição não encontrada"}`,
    );
    return {
      ...course,
      descriptionSource: "not_found",
      descriptionError: result.error || "Descrição não encontrada",
    };
  }
}

/**
 * Processa um lote de cursos
 */
async function processBatch(courses, startIndex, total) {
  const results = [];

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    const result = await processCourse(course, startIndex + i, total);
    results.push(result);

    if (i < courses.length - 1) {
      await delay(DELAY_BETWEEN_REQUESTS);
    }
  }

  return results;
}

/**
 * Função principal
 */
async function main() {
  console.log("=".repeat(60));
  console.log("🔄 ATUALIZANDO DESCRIÇÕES DE TODOS OS CURSOS");
  console.log("=".repeat(60));
  console.log();

  // Carregar cursos
  console.log("📂 Carregando cursos...");
  const coursesData = await fs.readFile(COURSES_FILE, "utf-8");
  const courses = JSON.parse(coursesData);
  console.log(`   Total: ${courses.length} cursos`);

  // Criar backup
  console.log("\n💾 Criando backup...");
  const backupDir = path.dirname(BACKUP_FILE);
  await fs.mkdir(backupDir, { recursive: true });
  await fs.writeFile(BACKUP_FILE, coursesData);
  console.log(`   Backup salvo em: ${BACKUP_FILE}`);

  // Contar cursos sem descrição
  const withoutDescription = courses.filter(
    c => !c.description || c.description.length < 50,
  );
  console.log(
    `\n📊 Cursos sem descrição adequada: ${withoutDescription.length}`,
  );
  console.log(
    `   Cursos já com descrição: ${courses.length - withoutDescription.length}`,
  );

  // Processar em lotes
  console.log("\n🚀 Iniciando processamento...\n");

  const updatedCourses = [];
  const totalBatches = Math.ceil(courses.length / BATCH_SIZE);

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, courses.length);
    const batch = courses.slice(start, end);

    console.log(
      `\n📦 Lote ${batchIndex + 1}/${totalBatches} (cursos ${start + 1}-${end}):`,
    );

    const batchResults = await processBatch(batch, start, courses.length);
    updatedCourses.push(...batchResults);

    // Contar resultados
    for (const course of batchResults) {
      if (course.descriptionSource === "site_original" && course.description) {
        successCount++;
      } else if (course.description && course.description.length >= 50) {
        skippedCount++;
      } else {
        failCount++;
      }
    }

    // Salvar progresso a cada 5 lotes
    if ((batchIndex + 1) % 5 === 0 || batchIndex === totalBatches - 1) {
      const tempFile = COURSES_FILE.replace(".json", "-temp.json");
      await fs.writeFile(tempFile, JSON.stringify(updatedCourses, null, 2));
      console.log(
        `   💾 Progresso salvo: ${updatedCourses.length}/${courses.length}`,
      );
    }

    // Delay entre lotes
    if (batchIndex < totalBatches - 1) {
      console.log(`   ⏳ Aguardando ${DELAY_BETWEEN_BATCHES / 1000}s...`);
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }

  // Salvar resultado final
  console.log("\n\n" + "=".repeat(60));
  console.log("💾 SALVANDO RESULTADO FINAL...");
  await fs.writeFile(COURSES_FILE, JSON.stringify(updatedCourses, null, 2));

  // Estatísticas finais
  console.log("\n📊 ESTATÍSTICAS FINAIS:");
  console.log("=".repeat(60));
  console.log(`   ✅ Descrições obtidas: ${successCount}`);
  console.log(`   ⏭️  Já tinham descrição: ${skippedCount}`);
  console.log(`   ❌ Falhas: ${failCount}`);
  console.log(`   📁 Arquivo atualizado: ${COURSES_FILE}`);
  console.log("=".repeat(60));

  // Resumo
  const finalCourses = JSON.parse(await fs.readFile(COURSES_FILE, "utf-8"));
  const withDesc = finalCourses.filter(
    c => c.description && c.description.length >= 50,
  ).length;
  console.log(
    `\n✨ Resultado: ${withDesc}/${finalCourses.length} cursos com descrição`,
  );
}

// Executar
main().catch(console.error);
