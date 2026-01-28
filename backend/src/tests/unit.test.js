/**
 * Testes unitários para a API de Cursos
 * Execute com: npm test
 */

const assert = require("assert");
const Course = require("../models/Course");
const Category = require("../models/Category");
const { validators } = require("../middlewares/validation");

// Cores para output no terminal
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

// Contadores de testes
let passed = 0;
let failed = 0;
const errors = [];

/**
 * Função auxiliar para executar testes
 */
function test(description, fn) {
  try {
    fn();
    passed++;
    console.log(`${colors.green}✓${colors.reset} ${description}`);
  } catch (error) {
    failed++;
    errors.push({ description, error: error.message });
    console.log(`${colors.red}✗${colors.reset} ${description}`);
    console.log(`  ${colors.red}→ ${error.message}${colors.reset}`);
  }
}

/**
 * Função para agrupar testes
 */
function describe(groupName, fn) {
  console.log(`\n${colors.bold}${groupName}${colors.reset}`);
  fn();
}

// ==========================================
// TESTES DO MODEL COURSE
// ==========================================

describe("Course Model", () => {
  test("deve criar um curso com dados válidos", () => {
    const course = new Course({
      id: 1,
      title: "Teste de Curso",
      category: "Educação",
      description: "Descrição do curso",
      duration: "720 horas",
      modality: "EAD",
      price: "R$ 199,90",
      url: "https://example.com/curso",
      imageUrl: "https://example.com/image.jpg",
    });

    assert.strictEqual(course.title, "Teste de Curso");
    assert.strictEqual(course.category, "Educação");
  });

  test("deve validar curso com campos obrigatórios", () => {
    const valid = Course.validate({
      title: "Curso Teste",
      category: "Educação",
      url: "https://example.com",
    });

    assert.strictEqual(valid.isValid, true);
    assert.strictEqual(valid.errors.length, 0);
  });

  test("deve retornar erros para curso sem título", () => {
    const valid = Course.validate({
      category: "Educação",
      url: "https://example.com",
    });

    assert.strictEqual(valid.isValid, false);
    assert.ok(valid.errors.includes("Título é obrigatório"));
  });

  test("deve retornar erros para curso sem categoria", () => {
    const valid = Course.validate({
      title: "Curso Teste",
      url: "https://example.com",
    });

    assert.strictEqual(valid.isValid, false);
    assert.ok(valid.errors.includes("Categoria é obrigatória"));
  });

  test("deve retornar erros para curso sem URL", () => {
    const valid = Course.validate({
      title: "Curso Teste",
      category: "Educação",
    });

    assert.strictEqual(valid.isValid, false);
    assert.ok(valid.errors.includes("URL é obrigatória"));
  });

  test("deve converter para JSON corretamente", () => {
    const course = new Course({
      id: 1,
      title: "Teste",
      category: "Cat",
      description: "Desc",
      duration: "100h",
      modality: "EAD",
      price: "100",
      url: "http://test.com",
      imageUrl: "http://img.com",
    });

    const json = course.toJSON();
    assert.strictEqual(typeof json.id, "number");
    assert.strictEqual(typeof json.title, "string");
    assert.ok(json.createdAt);
  });
});

// ==========================================
// TESTES DO MODEL CATEGORY
// ==========================================

describe("Category Model", () => {
  test("deve criar uma categoria com dados válidos", () => {
    const category = new Category({
      id: 1,
      name: "Educação",
      slug: "educacao",
      description: "Cursos de Educação",
    });

    assert.strictEqual(category.name, "Educação");
    assert.strictEqual(category.slug, "educacao");
  });

  test("deve gerar slug correto a partir do nome", () => {
    assert.strictEqual(Category.createSlug("Educação"), "educacao");
    assert.strictEqual(
      Category.createSlug("Ciências da Saúde"),
      "ciencias-da-saude",
    );
    assert.strictEqual(Category.createSlug("MBA Executivo"), "mba-executivo");
    assert.strictEqual(
      Category.createSlug("Empresarial, TI e Negócios"),
      "empresarial-ti-e-negocios",
    );
  });

  test("deve converter para JSON corretamente", () => {
    const category = new Category({
      id: 1,
      name: "Teste",
      slug: "teste",
      description: "Desc",
    });

    const json = category.toJSON();
    assert.strictEqual(json.id, 1);
    assert.strictEqual(json.name, "Teste");
    assert.strictEqual(json.coursesCount, 0);
  });
});

// ==========================================
// TESTES DOS VALIDATORS
// ==========================================

describe("Validators", () => {
  test("isValidId deve aceitar IDs numéricos positivos", () => {
    assert.strictEqual(validators.isValidId("1"), true);
    assert.strictEqual(validators.isValidId("100"), true);
    assert.strictEqual(validators.isValidId("999999"), true);
  });

  test("isValidId deve rejeitar IDs inválidos", () => {
    assert.strictEqual(validators.isValidId("0"), false);
    assert.strictEqual(validators.isValidId("-1"), false);
    assert.strictEqual(validators.isValidId("abc"), false);
    assert.strictEqual(validators.isValidId(""), false);
    assert.strictEqual(validators.isValidId(null), false);
  });

  test("isNonEmptyString deve validar strings não vazias", () => {
    assert.strictEqual(validators.isNonEmptyString("teste"), true);
    assert.strictEqual(validators.isNonEmptyString("  teste  "), true);
    assert.strictEqual(validators.isNonEmptyString(""), false);
    assert.strictEqual(validators.isNonEmptyString("   "), false);
    assert.strictEqual(validators.isNonEmptyString(null), false);
  });

  test("isValidLimit deve validar limites de paginação", () => {
    assert.strictEqual(validators.isValidLimit(undefined), true);
    assert.strictEqual(validators.isValidLimit("50"), true);
    assert.strictEqual(validators.isValidLimit("1000"), true);
    assert.strictEqual(validators.isValidLimit("0"), false);
    assert.strictEqual(validators.isValidLimit("1001"), false);
    assert.strictEqual(validators.isValidLimit("-1"), false);
  });

  test("sanitizeSearchString deve limpar strings de busca", () => {
    assert.strictEqual(validators.sanitizeSearchString("teste"), "teste");
    assert.strictEqual(validators.sanitizeSearchString("  teste  "), "teste");
    assert.strictEqual(validators.sanitizeSearchString("<script>"), "script");
    assert.strictEqual(
      validators.sanitizeSearchString('teste"malicioso'),
      "testemalicioso",
    );
  });

  test("sanitizeCategory deve limpar nomes de categoria", () => {
    assert.strictEqual(validators.sanitizeCategory("Educação"), "Educação");
    assert.strictEqual(
      validators.sanitizeCategory("Ci%C3%AAncias%20da%20Sa%C3%BAde"),
      "Ciências da Saúde",
    );
  });
});

// ==========================================
// RESUMO DOS TESTES
// ==========================================

console.log("\n" + "=".repeat(50));
console.log(`${colors.bold}RESUMO DOS TESTES${colors.reset}`);
console.log("=".repeat(50));
console.log(`${colors.green}Passou: ${passed}${colors.reset}`);
console.log(`${colors.red}Falhou: ${failed}${colors.reset}`);
console.log("=".repeat(50));

if (failed > 0) {
  console.log(`\n${colors.red}${colors.bold}ERROS:${colors.reset}`);
  errors.forEach((e, i) => {
    console.log(`${i + 1}. ${e.description}`);
    console.log(`   ${colors.red}→ ${e.error}${colors.reset}`);
  });
  process.exit(1);
} else {
  console.log(
    `\n${colors.green}${colors.bold}Todos os testes passaram! ✓${colors.reset}\n`,
  );
  process.exit(0);
}
