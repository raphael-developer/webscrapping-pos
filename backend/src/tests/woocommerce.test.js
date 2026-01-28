/**
 * @fileoverview Testes unitários para integração WooCommerce
 * Testa serviços de domínio, use cases e repositórios
 */

const CourseComparisonService = require("../domain/services/CourseComparisonService");
const ScrapedCourse = require("../domain/entities/ScrapedCourse");
const WooCommerceCourse = require("../domain/entities/WooCommerceCourse");
const ComparisonResultDTO = require("../application/dtos/ComparisonResultDTO");

describe("CourseComparisonService", () => {
  describe("normalizeForComparison", () => {
    it("deve remover acentos", () => {
      const result =
        CourseComparisonService.normalizeForComparison("Educação Física");
      expect(result).toBe("EDUCACAO FISICA");
    });

    it("deve converter para maiúsculas", () => {
      const result = CourseComparisonService.normalizeForComparison("teste");
      expect(result).toBe("TESTE");
    });

    it("deve remover caracteres especiais", () => {
      const result = CourseComparisonService.normalizeForComparison(
        "MBA - Gestão (Empresarial)",
      );
      expect(result).toBe("MBA GESTAO EMPRESARIAL");
    });

    it("deve normalizar espaços múltiplos", () => {
      const result =
        CourseComparisonService.normalizeForComparison("Curso   de   Teste");
      expect(result).toBe("CURSO DE TESTE");
    });

    it("deve retornar vazio para null/undefined", () => {
      expect(CourseComparisonService.normalizeForComparison(null)).toBe("");
      expect(CourseComparisonService.normalizeForComparison(undefined)).toBe(
        "",
      );
    });
  });

  describe("compare", () => {
    const scrapedCourses = [
      { title: "Curso de Enfermagem", category: "Saúde", slug: "enfermagem" },
      { title: "MBA Gestão", category: "MBA", slug: "mba-gestao" },
      { title: "Pedagogia", category: "Educação", slug: "pedagogia" },
    ];

    const wooCommerceCourses = [
      { name: "Curso de Enfermagem", mainCategory: "Saúde", id: 1 },
      { name: "MBA Gestão", mainCategory: "MBA", id: 2 },
      { name: "Direito Penal", mainCategory: "Jurídica", id: 3 },
    ];

    it("deve identificar cursos apenas no site", () => {
      const result = CourseComparisonService.compare(
        scrapedCourses,
        wooCommerceCourses,
      );

      expect(result.onlyInSite.length).toBe(1);
      expect(result.onlyInSite[0].slug).toBe("pedagogia");
    });

    it("deve identificar cursos apenas na API", () => {
      const result = CourseComparisonService.compare(
        scrapedCourses,
        wooCommerceCourses,
      );

      expect(result.onlyInAPI.length).toBe(1);
      expect(result.onlyInAPI[0].id).toBe(3);
    });

    it("deve identificar cursos em ambos", () => {
      const result = CourseComparisonService.compare(
        scrapedCourses,
        wooCommerceCourses,
      );

      expect(result.inBoth.length).toBe(2);
    });

    it("deve calcular estatísticas corretamente", () => {
      const result = CourseComparisonService.compare(
        scrapedCourses,
        wooCommerceCourses,
      );

      expect(result.statistics.totalScraped).toBe(3);
      expect(result.statistics.totalWooCommerce).toBe(3);
      expect(result.statistics.onlyInSiteCount).toBe(1);
      expect(result.statistics.onlyInAPICount).toBe(1);
      expect(result.statistics.matchedCount).toBe(2);
    });

    it("deve calcular porcentagem de correspondência", () => {
      const result = CourseComparisonService.compare(
        scrapedCourses,
        wooCommerceCourses,
      );

      // 2 matched / 3 scraped = 66.67%
      expect(parseFloat(result.statistics.matchPercentage)).toBeCloseTo(
        66.67,
        1,
      );
    });
  });

  describe("extractHours", () => {
    it("deve extrair horas de string", () => {
      expect(CourseComparisonService.extractHours("360 horas")).toBe(360);
      expect(CourseComparisonService.extractHours("720h")).toBe(720);
      expect(
        CourseComparisonService.extractHours("Carga: 480 horas/aula"),
      ).toBe(480);
    });

    it("deve retornar null para strings sem número", () => {
      expect(CourseComparisonService.extractHours("sem número")).toBe(null);
      expect(CourseComparisonService.extractHours(null)).toBe(null);
    });
  });

  describe("groupByCategory", () => {
    const courses = [
      { title: "Curso 1", category: "Saúde" },
      { title: "Curso 2", category: "Saúde" },
      { title: "Curso 3", category: "MBA" },
    ];

    it("deve agrupar cursos por categoria", () => {
      const grouped = CourseComparisonService.groupByCategory(courses);

      expect(Object.keys(grouped).length).toBe(2);
      expect(grouped["Saúde"].length).toBe(2);
      expect(grouped["MBA"].length).toBe(1);
    });
  });
});

describe("ScrapedCourse Entity", () => {
  describe("fromJSON", () => {
    it("deve criar entidade a partir de JSON", () => {
      const json = {
        title: "Teste",
        category: "Educação",
        slug: "teste",
        duration: "360h",
        url: "https://example.com/teste",
      };

      const course = ScrapedCourse.fromJSON(json);

      expect(course.title).toBe("Teste");
      expect(course.category).toBe("Educação");
      expect(course.slug).toBe("teste");
    });

    it("deve normalizar título", () => {
      const course = ScrapedCourse.fromJSON({
        title: "  Curso com Espaços  ",
        category: "Teste",
      });

      expect(course.getNormalizedTitle()).toBe("CURSO COM ESPACOS");
    });
  });
});

describe("WooCommerceCourse Entity", () => {
  describe("fromWooCommerceAPI", () => {
    it("deve criar entidade a partir de dados da API", () => {
      const apiData = {
        id: 123,
        name: "MBA Gestão Empresarial",
        slug: "mba-gestao",
        permalink: "https://example.com/produto/mba-gestao",
        status: "publish",
        price: "1500.00",
        categories: [{ id: 1, name: "MBA", slug: "mba" }],
        short_description: "<p>Duração: 360 horas</p>",
      };

      const course = WooCommerceCourse.fromWooCommerceAPI(apiData);

      expect(course.id).toBe(123);
      expect(course.name).toBe("MBA Gestão Empresarial");
      expect(course.mainCategory).toBe("MBA");
      expect(course.duration).toBe("360 horas");
    });

    it("deve extrair duração da descrição", () => {
      const result = WooCommerceCourse.extractDuration(
        "<p>Carga horária: 720h</p>",
      );
      expect(result).toBe("720h");
    });

    it("deve extrair categoria principal", () => {
      const categories = [
        { id: 1, name: "Saúde", slug: "saude" },
        { id: 2, name: "Enfermagem", slug: "enfermagem", parent: 1 },
      ];

      const result = WooCommerceCourse.extractMainCategory(categories);
      expect(result).toBe("Saúde");
    });
  });
});

describe("ComparisonResultDTO", () => {
  const mockResult = {
    onlyInSite: [
      {
        title: "Curso 1",
        category: "Saúde",
        slug: "curso-1",
        url: "http://test.com",
      },
    ],
    onlyInAPI: [
      {
        id: 1,
        name: "Curso 2",
        mainCategory: "MBA",
        permalink: "http://api.com",
      },
    ],
    inBoth: [
      {
        scraped: { title: "Curso 3" },
        wooCommerce: { name: "Curso 3" },
        differences: [],
      },
    ],
    statistics: {
      totalScraped: 2,
      totalWooCommerce: 2,
      onlyInSiteCount: 1,
      onlyInAPICount: 1,
      matchedCount: 1,
      matchPercentage: "50.00",
      timestamp: "2024-01-01",
    },
    metadata: {
      executedAt: "2024-01-01T00:00:00.000Z",
    },
  };

  describe("toSimpleResponse", () => {
    it("deve retornar resposta simplificada", () => {
      const response = ComparisonResultDTO.toSimpleResponse(mockResult);

      expect(response.summary).toBeDefined();
      expect(response.summary.totalScraped).toBe(2);
      expect(response.executedAt).toBeDefined();
      expect(response.onlyInSite).toBeUndefined();
    });
  });

  describe("toDetailedResponse", () => {
    it("deve retornar resposta detalhada", () => {
      const response = ComparisonResultDTO.toDetailedResponse(mockResult);

      expect(response.summary).toBeDefined();
      expect(response.onlyInSite).toBeDefined();
      expect(response.onlyInSite.length).toBe(1);
      expect(response.onlyInAPI).toBeDefined();
    });
  });

  describe("toCSV", () => {
    it("deve gerar CSV válido", () => {
      const courses = [
        {
          title: "Curso 1",
          category: "Saúde",
          slug: "curso-1",
          url: "http://test.com",
          reason: "Teste",
        },
      ];

      const csv = ComparisonResultDTO.toCSV(courses);

      expect(csv).toContain("Nome,Categoria,Slug,URL,Motivo");
      expect(csv).toContain("Curso 1");
      expect(csv).toContain("Saúde");
    });

    it("deve escapar aspas corretamente", () => {
      const courses = [
        { title: 'Curso "Especial"', category: "Teste", slug: "teste" },
      ];

      const csv = ComparisonResultDTO.toCSV(courses);

      expect(csv).toContain('""Especial""');
    });
  });
});

// Rodar testes
if (typeof jest === "undefined") {
  // Runner simples para executar sem Jest
  console.log("Executando testes WooCommerce...\n");

  const tests = [
    () => {
      const result =
        CourseComparisonService.normalizeForComparison("Educação Física");
      console.assert(
        result === "EDUCACAO FISICA",
        `Esperado 'EDUCACAO FISICA', recebido '${result}'`,
      );
      console.log("✓ normalizeForComparison remove acentos");
    },
    () => {
      const scraped = [{ title: "Curso A" }, { title: "Curso B" }];
      const woo = [{ name: "Curso A" }];
      const result = CourseComparisonService.compare(scraped, woo);
      console.assert(
        result.onlyInSite.length === 1,
        "Deve ter 1 curso apenas no site",
      );
      console.assert(result.inBoth.length === 1, "Deve ter 1 curso em ambos");
      console.log("✓ compare identifica diferenças corretamente");
    },
  ];

  tests.forEach(test => {
    try {
      test();
    } catch (e) {
      console.error("✗ Teste falhou:", e.message);
    }
  });

  console.log("\nTestes concluídos!");
}

module.exports = {
  // Export para Jest
};
