/**
 * @fileoverview Use Case - Obter Estatísticas
 * Retorna estatísticas agregadas dos cursos
 */

/**
 * Use Case para obter estatísticas dos cursos
 */
class GetStatisticsUseCase {
  /**
   * @param {IScrapedCourseRepository} courseRepository
   */
  constructor(courseRepository) {
    this.courseRepository = courseRepository;
  }

  /**
   * Executa cálculo de estatísticas
   * @returns {Promise<Object>}
   */
  async execute() {
    const [courses, categories] = await Promise.all([
      this.courseRepository.findAll(),
      this.courseRepository.findAllCategories(),
    ]);

    // Calcular cursos por categoria
    const coursesByCategory = {};
    for (const category of categories) {
      coursesByCategory[category] = courses.filter(
        course => course.category === category
      ).length;
    }

    // Calcular modalidades
    const modalityCounts = {};
    for (const course of courses) {
      const modality = course.modality || "EAD";
      modalityCounts[modality] = (modalityCounts[modality] || 0) + 1;
    }

    // Calcular durações
    const durationCounts = { short: 0, medium: 0, long: 0 };
    for (const course of courses) {
      const hours = parseInt(course.duration) || 0;
      if (hours <= 400) durationCounts.short++;
      else if (hours <= 720) durationCounts.medium++;
      else durationCounts.long++;
    }

    return {
      totalCourses: courses.length,
      totalCategories: categories.length,
      categories: categories,
      coursesByCategory,
      modalityCounts,
      durationDistribution: {
        short: { label: "Até 400h", count: durationCounts.short },
        medium: { label: "401h - 720h", count: durationCounts.medium },
        long: { label: "Acima de 720h", count: durationCounts.long },
      },
      averageCoursesPerCategory:
        categories.length > 0
          ? Math.round(courses.length / categories.length)
          : 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}

module.exports = GetStatisticsUseCase;
