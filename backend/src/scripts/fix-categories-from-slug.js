const fs = require("fs");
const path = require("path");

// Mapa de slug → nome de categoria
const slugToCategory = {
  "ciencias-da-saude": "Ciências da Saúde",
  educacao: "Educação",
  "empresarial-ti-e-negocios": "Empresarial, TI e Negócios",
  engenharias: "Engenharias",
  estetica: "Estética",
  gastronomia: "Gastronomia",
  juridica: "Jurídica",
  "mba-executivo": "MBA Executivo",
  "meio-ambiente": "Meio Ambiente",
  psicologia: "Psicologia",
  "servico-social": "Serviço Social",
};

function detectarCategoriaPeloLink(link) {
  try {
    const url = new URL(link);
    const partes = url.pathname.split("/").filter(Boolean);
    // Procurar o segmento logo após 'pos-graduacao'
    const idx = partes.findIndex(p => p === "pos-graduacao");
    if (idx >= 0 && partes[idx + 1]) {
      const slug = partes[idx + 1];
      return slugToCategory[slug] || null;
    }
  } catch (e) {
    // link inválido
  }
  return null;
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
  const totaisAntes = {};
  const totaisDepois = {};

  cursos.forEach(c => {
    totaisAntes[c.category] = (totaisAntes[c.category] || 0) + 1;
    const detectada = detectarCategoriaPeloLink(c.link);
    if (detectada && detectada !== c.category) {
      c.category = detectada;
      alterados++;
    }
  });

  cursos.forEach(c => {
    totaisDepois[c.category] = (totaisDepois[c.category] || 0) + 1;
  });

  fs.writeFileSync(filePath, JSON.stringify(cursos, null, 2));

  console.log(`Corrigidos ${alterados} registros com categoria divergente.`);
  console.log("Distribuição por categoria (antes):", totaisAntes);
  console.log("Distribuição por categoria (depois):", totaisDepois);
}

main();
