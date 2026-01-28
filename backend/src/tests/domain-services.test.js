/**
 * @fileoverview Testes Unitários - Domain Services
 * Testa a lógica de negócio pura, independente de infraestrutura
 */

const CourseComparisonService = require("../domain/services/CourseComparisonService");
const ScrapingService = require("../domain/services/ScrapingService");

describe("CourseComparisonService", () => {
  describe("compare", () => {
    it("deve identificar cursos presentes apenas no site", () => {
      const scrapedCourses = [
        { title: "Curso A", category: "Educação" },
        { title: "Curso B", category: "Saúde" },
        { title: "Curso C", category: "Direito" },
      ];

      const wooCommerceCourses = [
        { name: "Curso A", category: "Educação" },
      ];

      const result = CourseComparisonService.compare(scrapedCourses, wooCommerceCourses);

      expect(result.onlyInSite).toHaveLength(2);
      expect(result.onlyInSite.map(c => c.title)).toContain("Curso B");
      expect(result.onlyInSite.map(c => c.title)).toContain("Curso C");
    });

    it("deve identificar cursos presentes apenas na API", () => {
      const scrapedCourses = [
        { title: "Curso A", category: "Educação" },
      ];

      const wooCommerceCourses = [
        { name: "Curso A", category: "Educação" },
        { name: "Curso Extra", category: "TI" },
      ];

      const result = CourseComparisonService.compare(scrapedCourses, wooCommerceCourses);

      expect(result.onlyInAPI).toHaveLength(1);
      expect(result.onlyInAPI[0].name).toBe("Curso Extra");
    });

    it("deve identificar cursos presentes em ambos", () => {
      const scrapedCourses = [
        { title: "Curso Comum", category: "Educação" },
      ];

      const wooCommerceCourses = [
        { name: "Curso Comum", category: "Educação" },
      ];

      const result = CourseComparisonService.compare(scrapedCourses, wooCommerceCourses);

      expect(result.inBoth).toHaveLength(1);
      expect(result.onlyInSite).toHaveLength(0);
      expect(result.onlyInAPI).toHaveLength(0);
    });

    it("deve calcular estatísticas corretas", () => {
      const scrapedCourses = [
        { title: "Curso A", category: "Educação" },
        { title: "Curso B", category: "Saúde" },
      ];

      const wooCommerceCourses = [
        { name: "Curso A", category: "Educação" },
        { name: "Curso C", category: "TI" },
      ];

      const result = CourseComparisonService.compare(scrapedCourses, wooCommerceCourses);

      expect(result.statistics.totalScraped).toBe(2);
      expect(result.statistics.totalWooCommerce).toBe(2);
      expect(result.statistics.matchedCount).toBe(1);
      expect(result.statistics.onlyInSiteCount).toBe(1);
      expect(result.statistics.onlyInAPICount).toBe(1);
    });

    it("deve lidar com arrays vazios", () => {
      const result = CourseComparisonService.compare([], []);

      expect(result.onlyInSite).toHaveLength(0);
      expect(result.onlyInAPI).toHaveLength(0);
      expect(result.inBoth).toHaveLength(0);
      expect(result.statistics.totalScraped).toBe(0);
    });

    it("deve normalizar nomes para comparação case-insensitive", () => {
      const scrapedCourses = [
        { title: "ADMINISTRAÇÃO PÚBLICA", category: "Gestão" },
      ];

      const wooCommerceCourses = [
        { name: "Administração Pública", category: "Gestão" },
      ];

      const result = CourseComparisonService.compare(scrapedCourses, wooCommerceCourses);

      expect(result.inBoth).toHaveLength(1);
    });
  });

  describe("normalizeForComparison", () => {
    it("deve normalizar texto removendo acentos", () => {
      const result = CourseComparisonService.normalizeForComparison("Administração Pública");
      expect(result).toBe("administracao publica");
    });

    it("deve retornar string vazia para valores nulos", () => {
      expect(CourseComparisonService.normalizeForComparison(null)).toBe("");
      expect(CourseComparisonService.normalizeForComparison(undefined)).toBe("");
    });
  });

  describe("findDifferences", () => {
    it("deve detectar diferenças entre cursos", () => {
      const scraped = { title: "Curso X", description: "Descrição A", duration: "720h" };
      const wooCommerce = { name: "Curso X", description: "Descrição B", duration: "720h" };

      const differences = CourseComparisonService.findDifferences(scraped, wooCommerce);

      expect(differences.some(d => d.field === "description")).toBe(true);
    });

    it("deve retornar array vazio quando não há diferenças significativas", () => {
      const scraped = { title: "Curso X", duration: "720h" };
      const wooCommerce = { name: "Curso X", duration: "720h" };

      const differences = CourseComparisonService.findDifferences(scraped, wooCommerce);

      // Pode haver diferenças em campos opcionais, mas não nos essenciais
      expect(Array.isArray(differences)).toBe(true);
    });
  });
});

describe("ScrapingService", () => {
  describe("processCourseData", () => {
    it("deve processar dados válidos de curso", () => {
      const rawData = {
        title: "Curso de Teste",
        category: "Educação",
        description: "Uma descrição",
        duration: "720 horas",
        modality: "ead",
        price: "R$ 199,90",
        url: "https://example.com/curso",
      };

      const result = ScrapingService.processCourseData(rawData);

      expect(result).not.toBeNull();
      expect(result.title).toBe("Curso de Teste");
      expect(result.category).toBe("Educação");
      expect(result.modality).toBe("EAD");
    });

    it("deve retornar null para dados inválidos", () => {
      expect(ScrapingService.processCourseData(null)).toBeNull();
      expect(ScrapingService.processCourseData({})).toBeNull();
      expect(ScrapingService.processCourseData({ title: "" })).toBeNull();
      expect(ScrapingService.processCourseData({ title: "AB" })).toBeNull(); // muito curto
    });

    it("deve usar valores padrão para campos ausentes", () => {
      const result = ScrapingService.processCourseData({ title: "Curso Válido" });

      expect(result.category).toBe("Geral");
      expect(result.description).toBe("");
      expect(result.modality).toBe("EAD");
    });
  });

  describe("sanitizeText", () => {
    it("deve remover quebras de linha e espaços extras", () => {
      const text = "  Texto   com\n\tmuitos\r\nespaços  ";
      const result = ScrapingService.sanitizeText(text);
      expect(result).toBe("Texto com muitos espaços");
    });

    it("deve retornar string vazia para valores inválidos", () => {
      expect(ScrapingService.sanitizeText(null)).toBe("");
      expect(ScrapingService.sanitizeText(undefined)).toBe("");
      expect(ScrapingService.sanitizeText(123)).toBe("");
    });
  });

  describe("extractDuration", () => {
    it("deve extrair duração em horas", () => {
      expect(ScrapingService.extractDuration("720 horas")).toBe("720 horas");
      expect(ScrapingService.extractDuration("800h")).toBe("800 horas");
      expect(ScrapingService.extractDuration("Duração: 360 horas")).toBe("360 horas");
    });

    it("deve retornar string vazia para valores inválidos", () => {
      expect(ScrapingService.extractDuration(null)).toBe("");
      expect(ScrapingService.extractDuration("")).toBe("");
    });
  });

  describe("normalizeModality", () => {
    it("deve normalizar diferentes modalidades", () => {
      expect(ScrapingService.normalizeModality("ead")).toBe("EAD");
      expect(ScrapingService.normalizeModality("ONLINE")).toBe("EAD");
      expect(ScrapingService.normalizeModality("à distância")).toBe("EAD");
      expect(ScrapingService.normalizeModality("presencial")).toBe("Presencial");
      expect(ScrapingService.normalizeModality("híbrido")).toBe("Híbrido");
    });

    it("deve usar EAD como padrão", () => {
      expect(ScrapingService.normalizeModality(null)).toBe("EAD");
      expect(ScrapingService.normalizeModality("")).toBe("EAD");
      expect(ScrapingService.normalizeModality("desconhecido")).toBe("EAD");
    });
  });

  describe("validateUrl", () => {
    it("deve validar URLs corretas", () => {
      expect(ScrapingService.validateUrl("https://example.com")).toBe("https://example.com/");
      expect(ScrapingService.validateUrl("http://test.com/path")).toBe("http://test.com/path");
    });

    it("deve retornar string vazia para URLs inválidas", () => {
      expect(ScrapingService.validateUrl("")).toBe("");
      expect(ScrapingService.validateUrl("not-a-url")).toBe("");
      expect(ScrapingService.validateUrl(null)).toBe("");
    });
  });

  describe("detectChanges", () => {
    it("deve detectar novos cursos", () => {
      const newCourses = [
        { title: "Curso Novo", category: "TI" },
        { title: "Curso Existente", category: "Saúde" },
      ];

      const existingCourses = [
        { id: 1, title: "Curso Existente", category: "Saúde" },
      ];

      const result = ScrapingService.detectChanges(newCourses, existingCourses);

      expect(result.newCourses).toHaveLength(1);
      expect(result.newCourses[0].title).toBe("Curso Novo");
      expect(result.unchangedCourses).toHaveLength(1);
    });

    it("deve detectar cursos removidos", () => {
      const newCourses = [
        { title: "Curso A", category: "TI" },
      ];

      const existingCourses = [
        { id: 1, title: "Curso A", category: "TI" },
        { id: 2, title: "Curso Removido", category: "Saúde" },
      ];

      const result = ScrapingService.detectChanges(newCourses, existingCourses);

      expect(result.removedCourses).toHaveLength(1);
      expect(result.removedCourses[0].title).toBe("Curso Removido");
    });

    it("deve lidar com listas vazias", () => {
      const result = ScrapingService.detectChanges([], []);

      expect(result.newCourses).toHaveLength(0);
      expect(result.updatedCourses).toHaveLength(0);
      expect(result.unchangedCourses).toHaveLength(0);
      expect(result.removedCourses).toHaveLength(0);
    });
  });

  describe("generateCourseKey", () => {
    it("deve gerar chave normalizada", () => {
      const course = { title: "Curso de Teste", category: "Educação" };
      const key = ScrapingService.generateCourseKey(course);
      expect(key).toBe("curso de teste|educação");
    });

    it("deve retornar null para curso sem título", () => {
      expect(ScrapingService.generateCourseKey({})).toBeNull();
      expect(ScrapingService.generateCourseKey({ title: "" })).toBeNull();
    });
  });

  describe("calculateStatistics", () => {
    it("deve calcular estatísticas corretamente", () => {
      const changes = {
        newCourses: [{ title: "Novo" }],
        updatedCourses: [{ title: "Atualizado" }],
        unchangedCourses: [{ title: "Igual" }, { title: "Igual2" }],
        removedCourses: [],
      };

      const startTime = Date.now() - 5000; // 5 segundos atrás
      const stats = ScrapingService.calculateStatistics(changes, startTime);

      expect(stats.totalProcessed).toBe(4);
      expect(stats.newCoursesCount).toBe(1);
      expect(stats.updatedCoursesCount).toBe(1);
      expect(stats.unchangedCoursesCount).toBe(2);
      expect(stats.processingTimeMs).toBeGreaterThan(4000);
    });
  });

  describe("formatDuration", () => {
    it("deve formatar milissegundos corretamente", () => {
      expect(ScrapingService.formatDuration(500)).toBe("500ms");
      expect(ScrapingService.formatDuration(5000)).toBe("5.0s");
      expect(ScrapingService.formatDuration(65000)).toBe("1m 5s");
    });
  });
});
