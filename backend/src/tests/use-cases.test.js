/**
 * @fileoverview Testes Unitários - Use Cases
 * Testa a orquestração de lógica de aplicação com mocks de repositórios
 */

const GetCoursesUseCase = require("../application/use-cases/GetCoursesUseCase");
const GetStatisticsUseCase = require("../application/use-cases/GetStatisticsUseCase");
const CompareCourseUseCase = require("../application/use-cases/CompareCourseUseCase");
const GetMissingCoursesUseCase = require("../application/use-cases/GetMissingCoursesUseCase");

// Mock de ScrapedCourseRepository
const createMockScrapedRepository = (courses = []) => ({
  findAll: jest.fn().mockResolvedValue(courses),
  findById: jest.fn().mockImplementation(id => 
    Promise.resolve(courses.find(c => c.id === id) || null)
  ),
  findByCategory: jest.fn().mockImplementation(category =>
    Promise.resolve(courses.filter(c => c.category === category))
  ),
  findByTitle: jest.fn().mockImplementation(title =>
    Promise.resolve(courses.filter(c => 
      c.title.toLowerCase().includes(title.toLowerCase())
    ))
  ),
  findAllCategories: jest.fn().mockResolvedValue(
    [...new Set(courses.map(c => c.category))]
  ),
  count: jest.fn().mockResolvedValue(courses.length),
});

// Mock de WooCommerceRepository
const createMockWooCommerceRepository = (courses = []) => ({
  findAllCourses: jest.fn().mockResolvedValue(courses),
  findById: jest.fn().mockImplementation(id =>
    Promise.resolve(courses.find(c => c.id === id) || null)
  ),
  findByCategory: jest.fn().mockImplementation(category =>
    Promise.resolve(courses.filter(c => c.category === category))
  ),
  count: jest.fn().mockResolvedValue(courses.length),
});

describe("GetCoursesUseCase", () => {
  const sampleCourses = [
    { id: 1, title: "Curso A", category: "Educação", duration: "720h", modality: "EAD" },
    { id: 2, title: "Curso B", category: "Saúde", duration: "800h", modality: "EAD" },
    { id: 3, title: "Curso C", category: "Educação", duration: "360h", modality: "EAD" },
  ];

  it("deve retornar todos os cursos sem filtros", async () => {
    const mockRepo = createMockScrapedRepository(sampleCourses);
    const useCase = new GetCoursesUseCase(mockRepo);

    const result = await useCase.execute();

    expect(result.courses).toHaveLength(3);
    expect(mockRepo.findAll).toHaveBeenCalled();
  });

  it("deve filtrar cursos por categoria", async () => {
    const mockRepo = createMockScrapedRepository(sampleCourses);
    const useCase = new GetCoursesUseCase(mockRepo);

    const result = await useCase.execute({ category: "Educação" });

    expect(mockRepo.findByCategory).toHaveBeenCalledWith("Educação");
  });

  it("deve filtrar cursos por busca de título", async () => {
    const mockRepo = createMockScrapedRepository(sampleCourses);
    const useCase = new GetCoursesUseCase(mockRepo);

    const result = await useCase.execute({ search: "Curso A" });

    expect(mockRepo.findByTitle).toHaveBeenCalledWith("Curso A");
  });

  it("deve aplicar paginação corretamente", async () => {
    const mockRepo = createMockScrapedRepository(sampleCourses);
    const useCase = new GetCoursesUseCase(mockRepo);

    const result = await useCase.execute({ page: 1, pageSize: 2 });

    expect(result.courses).toHaveLength(2);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.pageSize).toBe(2);
    expect(result.pagination.totalItems).toBe(3);
    expect(result.pagination.totalPages).toBe(2);
    expect(result.pagination.hasNextPage).toBe(true);
  });

  it("deve aplicar limite de resultados", async () => {
    const mockRepo = createMockScrapedRepository(sampleCourses);
    const useCase = new GetCoursesUseCase(mockRepo);

    const result = await useCase.execute({ limit: 1 });

    expect(result.courses).toHaveLength(1);
  });

  it("deve converter entidades para DTO corretamente", async () => {
    const mockRepo = createMockScrapedRepository(sampleCourses);
    const useCase = new GetCoursesUseCase(mockRepo);

    const result = await useCase.execute({ limit: 1 });
    const course = result.courses[0];

    expect(course).toHaveProperty("id");
    expect(course).toHaveProperty("name");
    expect(course).toHaveProperty("title");
    expect(course).toHaveProperty("category");
  });
});

describe("GetStatisticsUseCase", () => {
  const sampleCourses = [
    { id: 1, title: "Curso A", category: "Educação", duration: "720", modality: "EAD" },
    { id: 2, title: "Curso B", category: "Saúde", duration: "800", modality: "EAD" },
    { id: 3, title: "Curso C", category: "Educação", duration: "300", modality: "Presencial" },
  ];

  it("deve calcular estatísticas gerais", async () => {
    const mockRepo = createMockScrapedRepository(sampleCourses);
    const useCase = new GetStatisticsUseCase(mockRepo);

    const result = await useCase.execute();

    expect(result.totalCourses).toBe(3);
    expect(result.totalCategories).toBe(2);
    expect(result.categories).toContain("Educação");
    expect(result.categories).toContain("Saúde");
  });

  it("deve calcular cursos por categoria", async () => {
    const mockRepo = createMockScrapedRepository(sampleCourses);
    const useCase = new GetStatisticsUseCase(mockRepo);

    const result = await useCase.execute();

    expect(result.coursesByCategory["Educação"]).toBe(2);
    expect(result.coursesByCategory["Saúde"]).toBe(1);
  });

  it("deve calcular distribuição de modalidades", async () => {
    const mockRepo = createMockScrapedRepository(sampleCourses);
    const useCase = new GetStatisticsUseCase(mockRepo);

    const result = await useCase.execute();

    expect(result.modalityCounts["EAD"]).toBe(2);
    expect(result.modalityCounts["Presencial"]).toBe(1);
  });

  it("deve calcular distribuição de duração", async () => {
    const mockRepo = createMockScrapedRepository(sampleCourses);
    const useCase = new GetStatisticsUseCase(mockRepo);

    const result = await useCase.execute();

    expect(result.durationDistribution.short.count).toBe(1); // 300h
    expect(result.durationDistribution.medium.count).toBe(1); // 720h
    expect(result.durationDistribution.long.count).toBe(1); // 800h
  });

  it("deve lidar com lista vazia de cursos", async () => {
    const mockRepo = createMockScrapedRepository([]);
    const useCase = new GetStatisticsUseCase(mockRepo);

    const result = await useCase.execute();

    expect(result.totalCourses).toBe(0);
    expect(result.totalCategories).toBe(0);
    expect(result.averageCoursesPerCategory).toBe(0);
  });
});

describe("CompareCourseUseCase", () => {
  const scrapedCourses = [
    { title: "Curso A", category: "Educação" },
    { title: "Curso B", category: "Saúde" },
    { title: "Curso Único Site", category: "TI" },
  ];

  const wooCommerceCourses = [
    { name: "Curso A", category: "Educação" },
    { name: "Curso B", category: "Saúde" },
    { name: "Curso Único API", category: "Direito" },
  ];

  it("deve executar comparação completa", async () => {
    const mockScrapedRepo = createMockScrapedRepository(scrapedCourses);
    const mockWooCommerceRepo = createMockWooCommerceRepository(wooCommerceCourses);

    const useCase = new CompareCourseUseCase(mockScrapedRepo, mockWooCommerceRepo);
    const result = await useCase.execute();

    expect(result.onlyInSite).toHaveLength(1);
    expect(result.onlyInAPI).toHaveLength(1);
    expect(result.inBoth).toHaveLength(2);
    expect(result.metadata).toBeDefined();
    expect(result.metadata.executedAt).toBeDefined();
  });

  it("deve incluir metadados na resposta", async () => {
    const mockScrapedRepo = createMockScrapedRepository(scrapedCourses);
    const mockWooCommerceRepo = createMockWooCommerceRepository(wooCommerceCourses);

    const useCase = new CompareCourseUseCase(mockScrapedRepo, mockWooCommerceRepo);
    const result = await useCase.execute();

    expect(result.metadata.sources.scraped.count).toBe(3);
    expect(result.metadata.sources.wooCommerce.count).toBe(3);
  });

  it("deve executar comparação filtrada por categoria", async () => {
    const filteredScraped = scrapedCourses.filter(c => c.category === "Educação");
    const filteredWooCommerce = wooCommerceCourses.filter(c => c.category === "Educação");

    const mockScrapedRepo = createMockScrapedRepository(scrapedCourses);
    mockScrapedRepo.findByCategory.mockResolvedValue(filteredScraped);

    const mockWooCommerceRepo = createMockWooCommerceRepository(wooCommerceCourses);
    mockWooCommerceRepo.findByCategory.mockResolvedValue(filteredWooCommerce);

    const useCase = new CompareCourseUseCase(mockScrapedRepo, mockWooCommerceRepo);
    const result = await useCase.executeByCategory("Educação");

    expect(result.metadata.filterCategory).toBe("Educação");
  });
});

describe("GetMissingCoursesUseCase", () => {
  const scrapedCourses = [
    { title: "Curso A", category: "Educação" },
    { title: "Curso B", category: "Saúde" },
    { title: "Curso Ausente", category: "TI" },
  ];

  const wooCommerceCourses = [
    { name: "Curso A", category: "Educação" },
    { name: "Curso B", category: "Saúde" },
  ];

  it("deve retornar cursos ausentes no WooCommerce", async () => {
    const mockScrapedRepo = createMockScrapedRepository(scrapedCourses);
    const mockWooCommerceRepo = createMockWooCommerceRepository(wooCommerceCourses);

    const useCase = new GetMissingCoursesUseCase(mockScrapedRepo, mockWooCommerceRepo);
    const result = await useCase.execute({});

    expect(result.missingCourses).toHaveLength(1);
    expect(result.missingCourses[0].title).toBe("Curso Ausente");
  });

  it("deve agrupar por categoria quando solicitado", async () => {
    const scrapedWithMultipleMissing = [
      { title: "Ausente 1", category: "TI" },
      { title: "Ausente 2", category: "TI" },
      { title: "Ausente 3", category: "Saúde" },
    ];

    const mockScrapedRepo = createMockScrapedRepository(scrapedWithMultipleMissing);
    const mockWooCommerceRepo = createMockWooCommerceRepository([]);

    const useCase = new GetMissingCoursesUseCase(mockScrapedRepo, mockWooCommerceRepo);
    const result = await useCase.execute({ groupByCategory: true });

    expect(result.groupedByCategory).toBeDefined();
    expect(result.groupedByCategory["TI"]).toHaveLength(2);
    expect(result.groupedByCategory["Saúde"]).toHaveLength(1);
  });

  it("deve incluir estatísticas", async () => {
    const mockScrapedRepo = createMockScrapedRepository(scrapedCourses);
    const mockWooCommerceRepo = createMockWooCommerceRepository(wooCommerceCourses);

    const useCase = new GetMissingCoursesUseCase(mockScrapedRepo, mockWooCommerceRepo);
    const result = await useCase.execute({});

    expect(result.statistics).toBeDefined();
    expect(result.statistics.totalMissing).toBe(1);
  });
});
