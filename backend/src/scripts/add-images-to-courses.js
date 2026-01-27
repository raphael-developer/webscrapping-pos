const fs = require("fs");
const path = require("path");

// Mapeamento de palavras-chave para imagens temáticas
const imageKeywords = require("./course-image-keywords");

function getImageUrl(curso) {
  const nome = (curso.name || "").toLowerCase();
  const categoria = (curso.category || "").toLowerCase();

  if (nome.includes("administra")) return imageKeywords.administracao;
  if (nome.includes("contabil")) return imageKeywords.contabilidade;
  if (nome.includes("recursos humanos")) return imageKeywords.recursos_humanos;
  if (nome.includes("educa")) return imageKeywords.educacao;
  if (
    nome.includes("direito") ||
    nome.includes("jurídic") ||
    nome.includes("juridic")
  )
    return imageKeywords.direito;
  if (nome.includes("saúde") || nome.includes("saude"))
    return imageKeywords.saude;
  if (nome.includes("engenharia")) return imageKeywords.engenharia;
  if (nome.includes("gastronom")) return imageKeywords.gastronomia;
  if (nome.includes("estética") || nome.includes("estetica"))
    return imageKeywords.estetica;
  if (nome.includes("psicolog")) return imageKeywords.psicologia;
  if (nome.includes("social")) return imageKeywords.social;
  if (nome.includes("meio ambiente")) return imageKeywords.meio_ambiente;
  if (nome.includes("mba")) return imageKeywords.mba;
  if (nome.includes("auditoria")) return imageKeywords.auditoria;
  if (nome.includes("gestão") || nome.includes("gestao"))
    return imageKeywords.gestao;
  if (nome.includes("supervisão") || nome.includes("supervisao"))
    return imageKeywords.supervisao;

  // Por categoria
  if (categoria.includes("administra")) return imageKeywords.administracao;
  if (categoria.includes("contabil")) return imageKeywords.contabilidade;
  if (categoria.includes("recursos humanos"))
    return imageKeywords.recursos_humanos;
  if (categoria.includes("educa")) return imageKeywords.educacao;
  if (
    categoria.includes("direito") ||
    categoria.includes("jurídic") ||
    categoria.includes("juridic")
  )
    return imageKeywords.direito;
  if (categoria.includes("saúde") || categoria.includes("saude"))
    return imageKeywords.saude;
  if (categoria.includes("engenharia")) return imageKeywords.engenharia;
  if (categoria.includes("gastronom")) return imageKeywords.gastronomia;
  if (categoria.includes("estética") || categoria.includes("estetica"))
    return imageKeywords.estetica;
  if (categoria.includes("psicolog")) return imageKeywords.psicologia;
  if (categoria.includes("social")) return imageKeywords.social;
  if (categoria.includes("meio ambiente")) return imageKeywords.meio_ambiente;
  if (categoria.includes("mba")) return imageKeywords.mba;
  if (categoria.includes("auditoria")) return imageKeywords.auditoria;
  if (categoria.includes("gestão") || categoria.includes("gestao"))
    return imageKeywords.gestao;
  if (categoria.includes("supervisão") || categoria.includes("supervisao"))
    return imageKeywords.supervisao;

  // Fallback
  return imageKeywords.generico;
}

function main() {
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "cursos-completo-novo.json"
  );
  const raw = fs.readFileSync(filePath, "utf8");
  const cursos = JSON.parse(raw);

  let alterados = 0;
  cursos.forEach(curso => {
    curso.image = getImageUrl(curso);
    alterados++;
  });

  fs.writeFileSync(filePath, JSON.stringify(cursos, null, 2));
  console.log(`Imagens adicionadas em ${alterados} cursos.`);
}

main();
