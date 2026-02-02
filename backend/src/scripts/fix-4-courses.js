const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "../../cursos-completo-novo.json");
const courses = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

const fixes = [
  {
    titleMatch: "ANTROPOLOGIA FORENSE E DIREITOS HUMANOS",
    url: "https://faculdadeunica.com.br/pos-graduacao/educacao/antropologia-forense-e-direitos-humanos-720",
    description:
      "Adquira conhecimentos específicos para atuar na pesquisa sobre direitos humanos e violência de Estado.",
  },
  {
    titleMatch: "ADMINISTRAÇÃO HOSPITALAR",
    url: "https://faculdadeunica.com.br/pos-graduacao/empresarial-ti-e-negocios/administracao-hospitalar-720",
    description:
      "Este curso fornece ao aluno subsídios teóricos e práticos na administração de hospitais, além de trabalhar competências que otimizem a atuação em tecnologias da informação. Nas aulas, você aprenderá conceitos de administração que fundamentam atuações competentes, seguras e atualizadas.",
  },
  {
    titleMatch: "MBA EM GESTÃO AMBIENTAL",
    url: "https://faculdadeunica.com.br/pos-graduacao/empresarial-ti-e-negocios/mba-em-gestao-ambiental-720",
    description:
      "Este curso fornece ao aluno subsídios teóricos e práticos na Gestão Ambiental, além de trabalhar competências que otimizem a atuação em práticas relacionadas ao desenvolvimento sustentável da sociedade, visando o uso inteligente dos recursos naturais.",
  },
  {
    titleMatch: "CONSERVAÇÃO E RESTAURO",
    url: "https://faculdadeunica.com.br/pos-graduacao/undefined/conservacao-e-restauro-720",
    description:
      "Curso de pós-graduação em Conservação e Restauro, formando profissionais capacitados para atuar na preservação do patrimônio histórico e cultural.",
  },
];

let fixed = 0;
for (const fix of fixes) {
  const course = courses.find(c => c.title && c.title.includes(fix.titleMatch));
  if (course) {
    course.url = fix.url;
    course.description = fix.description;
    course.descriptionSource = "site_original";
    course.descriptionFetchedAt = new Date().toISOString();
    console.log("✅ Corrigido:", course.title);
    fixed++;
  } else {
    console.log("❌ Não encontrado:", fix.titleMatch);
  }
}

fs.writeFileSync(DATA_FILE, JSON.stringify(courses, null, 2));
console.log("\n" + fixed + " cursos corrigidos!");
console.log(
  "Total com descrição:",
  courses.filter(c => c.description && c.description.length > 30).length,
);
