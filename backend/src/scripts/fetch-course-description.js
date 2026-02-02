/**
 * @fileoverview Script para buscar descrição real dos cursos do site
 * O site usa Next.js e embute os dados do curso em JSON dentro do HTML
 */

const https = require("https");

/**
 * Faz requisição HTTP simples
 * @param {string} url
 * @returns {Promise<string>}
 */
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

/**
 * Extrai a descrição do curso de uma página do site
 * @param {string} courseUrl - URL da página do curso
 * @returns {Promise<Object>} - Dados extraídos do curso
 */
async function fetchCourseDescription(courseUrl) {
  try {
    console.log(`Buscando descrição de: ${courseUrl}`);
    
    const html = await fetchHTML(courseUrl);
    
    // Extrair o nome do curso da URL para buscar a descrição específica
    const urlParts = courseUrl.split("/");
    const courseName = urlParts[urlParts.length - 1]
      .replace(/-\d+$/, "") // Remove sufixo numérico
      .replace(/-/g, " ")
      .toUpperCase();
    
    let description = "";
    let objective = "";
    let workload = "";
    
    // Método 1: Buscar descrição no formato "O curso de X tem como objetivo..."
    const descMatch = html.match(/O curso de [^"]*tem como objetivo[^"]*/);
    if (descMatch) {
      description = descMatch[0]
        .replace(/\\n/g, " ")
        .replace(/\\u[\dA-Fa-f]{4}/g, "") // Remove unicode escapes
        .replace(/\s+/g, " ")
        .trim();
      
      // Limpar o final se cortado
      if (description.endsWith("\\")) {
        description = description.slice(0, -1);
      }
    }
    
    // Método 2: Buscar objetivo
    const objMatch = html.match(/"objective":"([^"]+)"/);
    if (objMatch && objMatch[1] && objMatch[1].length > 20) {
      objective = objMatch[1]
        .replace(/\\n/g, " ")
        .trim();
    }
    
    // Método 3: Buscar carga horária
    const workloadMatch = html.match(/"workload":(\d+)/);
    if (workloadMatch && workloadMatch[1]) {
      workload = workloadMatch[1] + " horas";
    }

    return {
      success: true,
      url: courseUrl,
      description,
      objective,
      workload,
      source: "site_original"
    };
  } catch (error) {
    return {
      success: false,
      url: courseUrl,
      error: error.message,
    };
  }
}

/**
 * Busca descrições para múltiplos cursos
 * @param {Array<string>} urls - Lista de URLs
 * @returns {Promise<Array>}
 */
async function fetchMultipleCourseDescriptions(urls) {
  const results = [];
  
  for (const url of urls) {
    const result = await fetchCourseDescription(url);
    results.push(result);
    
    // Pequena pausa entre requisições
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

// Se executado diretamente, testar com um curso
if (require.main === module) {
  const testUrl = process.argv[2] || "https://faculdadeunica.com.br/pos-graduacao/psicologia/psicologia-aplicada-no-ambito-social-720";
  
  fetchCourseDescription(testUrl).then(result => {
    console.log("\n=== Resultado ===");
    console.log(JSON.stringify(result, null, 2));
  });
}

module.exports = {
  fetchCourseDescription,
  fetchMultipleCourseDescriptions,
};
