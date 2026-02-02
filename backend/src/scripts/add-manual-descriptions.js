/**
 * Script para adicionar descrições manualmente aos cursos restantes
 * Dados extraídos diretamente das imagens fornecidas pelo usuário
 */

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "../../cursos-completo-novo.json");

// Descrições extraídas manualmente do site
const MANUAL_DESCRIPTIONS = {
  "EDUCAÇÃO ESPECIAL E INCLUSIVA": {
    // Versão 720h (DESTAQUE): "Professores, pedagogos, psicólogos, psicopedagogos que desejam atuar na educação especial, e demais graduados em outras áreas que desejam adquirir conhecimento interdisciplinar no objeto de estudo."
    // Versão 1000h: "Atue no ensino de alunos que possuem alguma necessidade especial, criando um rico ambiente de aprendizado de apoio, a fim de incluí-los na sociedade."
    description:
      "Atue no ensino de alunos que possuem alguma necessidade especial, criando um rico ambiente de aprendizado de apoio, a fim de incluí-los na sociedade.",
    source: "manual_from_site",
  },
  "CONSERVAÇÃO E RESTAURO": {
    description:
      "Teoria e prática para dominar técnicas de avaliação de obras de arte e identificar maneiras e ferramentas de treinar a sensibilidade estética.",
    source: "manual_from_site",
  },
  // Para os demais cursos, vamos buscar via outros métodos ou deixar uma descrição genérica baseada no título
  "GEORREFERENCIAMENTO DE IMÓVEIS RURAIS": {
    description:
      "Especialização em técnicas de georreferenciamento e regularização fundiária de imóveis rurais, incluindo topografia, geodésia e legislação agrária.",
    source: "generated_from_title",
  },
  "GESTÃO ESTRATÉGICA EM NEGÓCIOS GASTRONÔMICOS": {
    description:
      "Capacitação em gestão estratégica para empreendimentos gastronômicos, abordando planejamento, marketing, finanças e operações em restaurantes e serviços de alimentação.",
    source: "generated_from_title",
  },
  "MBA EM EDUCAÇÃO": {
    description:
      "MBA voltado para profissionais da educação que buscam desenvolver competências gerenciais e estratégicas para atuar na gestão educacional.",
    source: "generated_from_title",
  },
  "MBA EM GASTRONOMIA": {
    description:
      "MBA para profissionais da gastronomia que desejam aprofundar conhecimentos em gestão, empreendedorismo e inovação no setor gastronômico.",
    source: "generated_from_title",
  },
  "MBA EM GESTÃO BANCÁRIA": {
    description:
      "MBA especializado em gestão de instituições financeiras, abordando produtos bancários, análise de crédito, investimentos e regulamentação do sistema financeiro.",
    source: "generated_from_title",
  },
  "PSICOLOGIA DO TRABALHO": {
    description:
      "Especialização em psicologia aplicada ao ambiente organizacional, abordando recrutamento e seleção, desenvolvimento de pessoas, clima organizacional e saúde do trabalhador.",
    source: "generated_from_title",
  },
  "AUTISMO: DIREITOS FUNDAMENTAIS E ASPECTOS ECONÔMICOS, CULTURAIS E SOCIAIS": {
    description:
      "Especialização voltada para o entendimento dos direitos das pessoas com Transtorno do Espectro Autista e as dimensões econômicas, culturais e sociais que impactam sua inclusão.",
    source: "generated_from_title",
  },
  "POLITICAS PÚBLICAS": {
    description:
      "Especialização em análise, formulação e avaliação de políticas públicas, preparando profissionais para atuar na gestão governamental e no terceiro setor.",
    source: "generated_from_title",
  },
  "SISTEMA ÚNICO DE ASSISTÊNCIA SOCIAL": {
    description:
      "Especialização sobre o SUAS - Sistema Único de Assistência Social, abordando políticas de proteção social, gestão de serviços e programas socioassistenciais.",
    source: "generated_from_title",
  },
};

async function main() {
  console.log("=".repeat(60));
  console.log("ADICIONANDO DESCRIÇÕES MANUAIS");
  console.log("=".repeat(60));

  const courses = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  const notFound = courses.filter(c => c.descriptionSource === "not_found");

  console.log(`\nCursos sem descrição: ${notFound.length}`);

  let updated = 0;

  for (const course of notFound) {
    const title = course.title;

    if (MANUAL_DESCRIPTIONS[title]) {
      const idx = courses.findIndex(c => c.id === course.id);
      if (idx >= 0) {
        courses[idx].description = MANUAL_DESCRIPTIONS[title].description;
        courses[idx].descriptionSource = MANUAL_DESCRIPTIONS[title].source;
        courses[idx].descriptionFetchedAt = new Date().toISOString();
        courses[idx].descriptionGenerated =
          MANUAL_DESCRIPTIONS[title].source === "generated_from_title";
        delete courses[idx].descriptionError;
        console.log(
          `  ✅ ${title.substring(0, 50)}... (${MANUAL_DESCRIPTIONS[title].source})`,
        );
        updated++;
      }
    } else {
      console.log(`  ⚠️ ${title} - Sem mapeamento`);
    }
  }

  // Salvar
  fs.writeFileSync(DATA_FILE, JSON.stringify(courses, null, 2));

  // Estatísticas finais
  const final = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  const withSite = final.filter(c => c.descriptionSource === "site_original");
  const withManual = final.filter(
    c => c.descriptionSource === "manual_from_site",
  );
  const withGenerated = final.filter(
    c => c.descriptionSource === "generated_from_title",
  );
  const remaining = final.filter(c => c.descriptionSource === "not_found");

  console.log("\n" + "=".repeat(60));
  console.log("RESULTADO FINAL");
  console.log("=".repeat(60));
  console.log(`✅ Descrição do site: ${withSite.length}`);
  console.log(`✅ Descrição manual do site: ${withManual.length}`);
  console.log(`⚠️ Descrição gerada do título: ${withGenerated.length}`);
  console.log(`❌ Sem descrição: ${remaining.length}`);
  console.log(
    `\n📊 Total com descrição: ${withSite.length + withManual.length + withGenerated.length} (${(((withSite.length + withManual.length + withGenerated.length) / final.length) * 100).toFixed(1)}%)`,
  );
}

main().catch(console.error);
