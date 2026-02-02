const { Cluster } = require("puppeteer-cluster");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const Course = require("../models/Course");
const Category = require("../models/Category");
const Logger = require("../utils/Logger");

// Add stealth plugin to avoid bot detection, but disable specific evasions if needed
const stealth = StealthPlugin();
// Desabilitar a evasão 'sourceurl' (presente no stack de erros) para reduzir interferência
try {
  stealth.enabledEvasions.delete("sourceurl");
} catch (_) {}
puppeteer.use(stealth);

class ScraperService {
  constructor() {
    this.cluster = null;
    this.courses = [];
    this.categories = [];
    // Fallback para a URL alvo caso não seja definida por env
    this.baseUrl =
      process.env.TARGET_URL ||
      "https://www.faculdadeunica.com.br/pos-graduacao";

    // Normalizar host para evitar redirecionamentos/lentidão e padronizar URLs
    // (o site funciona sem www: https://faculdadeunica.com.br/...)
    this.baseUrl = this.normalizeUnicaUrl(this.baseUrl);
    this.initialized = false;
    this.processedCourses = 0;
    this.processedCategories = 0;
  }

  normalizeUnicaUrl(urlStr) {
    try {
      const u = new URL(urlStr);
      if (u.hostname === "www.faculdadeunica.com.br") {
        u.hostname = "faculdadeunica.com.br";
      }
      return u.toString();
    } catch (_) {
      return urlStr;
    }
  }

  buildExpectedCategories() {
    const expectedNames = [
      "Ciências da Saúde",
      "Educação",
      "Empresarial, TI e Negócios",
      "Engenharias",
      "Estética",
      "Gastronomia",
      "Jurídica",
      "MBA Executivo",
      "Meio Ambiente",
      "Psicologia",
      "Serviço Social",
    ];
    const base = (() => {
      try {
        return new URL(this.baseUrl).origin;
      } catch {
        return "https://www.faculdadeunica.com.br";
      }
    })();
    return expectedNames.map((name, index) => {
      const slug = Category.createSlug(name);
      return new Category({
        id: index + 1,
        name,
        slug,
        description: `Cursos de ${name}`,
        url: this.normalizeUnicaUrl(`${base}/pos-graduacao/${slug}`),
      });
    });
  }

  getScraperArtifactsDir() {
    return (
      process.env.SCRAPER_ARTIFACTS_DIR ||
      process.env.SCRAPER_ERRORS_DIR ||
      "logs/scraper-artifacts"
    );
  }

  shouldSaveScraperArtifact(stage) {
    const enabled = String(process.env.SCRAPER_SAVE_ARTIFACTS || "") === "1";
    if (!enabled) return false;

    const stages = String(process.env.SCRAPER_ARTIFACTS_STAGES || "").trim();
    if (!stages) return true;

    const allowed = stages
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    return allowed.includes(stage);
  }

  pruneScraperArtifacts(dir, stage, maxSnapshots) {
    const fs = require("fs");
    const prefix = `error-scraper-${stage}-`;

    let files;
    try {
      files = fs.readdirSync(dir);
    } catch (_) {
      return;
    }

    const tsList = [];
    for (const file of files) {
      if (!file.startsWith(prefix)) continue;
      const dot = file.lastIndexOf(".");
      if (dot <= prefix.length) continue;
      const tsStr = file.slice(prefix.length, dot);
      if (!/^\d+$/.test(tsStr)) continue;
      tsList.push(Number(tsStr));
    }

    const uniqueSorted = Array.from(new Set(tsList)).sort((a, b) => a - b);
    const keep = new Set(uniqueSorted.slice(-maxSnapshots));

    for (const file of files) {
      if (!file.startsWith(prefix)) continue;
      const dot = file.lastIndexOf(".");
      if (dot <= prefix.length) continue;
      const tsStr = file.slice(prefix.length, dot);
      if (!/^\d+$/.test(tsStr)) continue;
      const ts = Number(tsStr);
      if (keep.has(ts)) continue;
      try {
        fs.unlinkSync(`${dir}/${file}`);
      } catch (_) {}
    }
  }

  async maybeSaveScraperArtifact(page, stage) {
    if (!this.shouldSaveScraperArtifact(stage)) return;

    const fs = require("fs");
    const path = require("path");

    const ts = Date.now();
    const dir = this.getScraperArtifactsDir();
    const maxSnapshots = Math.max(
      0,
      parseInt(process.env.SCRAPER_ARTIFACTS_MAX || "10") || 10,
    );
    const baseName = `error-scraper-${stage}-${ts}`;

    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (_) {
      return;
    }

    try {
      await page
        .screenshot({
          path: path.join(dir, `${baseName}.png`),
          fullPage: false,
        })
        .catch(() => {});
    } catch (_) {}

    try {
      const html = await page.content();
      fs.writeFileSync(path.join(dir, `${baseName}.html`), html);
    } catch (_) {}

    if (maxSnapshots > 0) {
      try {
        this.pruneScraperArtifacts(dir, stage, maxSnapshots);
      } catch (_) {}
    }
  }

  emitLog(level, message, data = {}) {
    if (global.scrapingIO) {
      global.scrapingIO.to("scraping-logs").emit("scraping-log", {
        level,
        message,
        data,
        timestamp: new Date().toISOString(),
      });
    }
    Logger[level](message, data);
  }

  async initialize() {
    try {
      // enforce a minimum timeout (ms)
      const minTimeout = 240000;
      const envTimeout =
        parseInt(process.env.SCRAPER_CLUSTER_TIMEOUT) ||
        parseInt(process.env.SCRAPER_TIMEOUT) ||
        0;
      let effectiveTimeout = Math.max(envTimeout, minTimeout);
      // If debugging, allow much larger timeout to avoid cluster killing during interactive debug
      if (process.env.SCRAPER_DEBUG) {
        // During interactive debugging allow a longer timeout (15 minutes)
        effectiveTimeout = Math.max(effectiveTimeout, 900000);
      }

      // Determine headless option: if user requested debug (headful) but no $DISPLAY is set,
      // fallback to headless to avoid "Missing X server or $DISPLAY" crashes.
      const requestedDebug = !!process.env.SCRAPER_DEBUG;
      const hasDisplay = !!process.env.DISPLAY;
      const forceHeadless = !!process.env.SCRAPER_FORCE_HEADLESS;

      Logger.info(
        `Headless configuration: SCRAPER_DEBUG=${process.env.SCRAPER_DEBUG}, DISPLAY=${process.env.DISPLAY}, SCRAPER_FORCE_HEADLESS=${process.env.SCRAPER_FORCE_HEADLESS}`,
      );

      // Nova variável de controle explícita: SCRAPER_HEADFUL=1 força modo visível
      const explicitHeadful = String(process.env.SCRAPER_HEADFUL || "") === "1";
      let headlessOption = "new";
      if (explicitHeadful) {
        Logger.info("Running in headful mode (SCRAPER_HEADFUL=1)");
        headlessOption = false;
      } else if (requestedDebug && !forceHeadless) {
        if (hasDisplay) {
          Logger.info(
            "Running in headful mode (SCRAPER_DEBUG=1 and DISPLAY is set)",
          );
          headlessOption = false;
        } else {
          Logger.warn(
            "SCRAPER_DEBUG=1 mas DISPLAY não definido; permanecendo headless. Para ver o navegador use SCRAPER_HEADFUL=1 com ambiente gráfico ou xvfb-run.",
            { service: "unica-scraper" },
          );
          headlessOption = "new";
        }
      } else if (forceHeadless) {
        Logger.info("Running in headless mode (SCRAPER_FORCE_HEADLESS=1)");
        headlessOption = "new";
      } else {
        Logger.info("Running in headless mode (default)");
      }

      Logger.info(`Final headless option: ${headlessOption}`);

      // Construir lista de args sem duplicatas e com ajustes para headful
      const baseArgs = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-zygote",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=VizDisplayCompositor",
        "--lang=pt-BR,pt",
        "--window-size=1280,800",
        "--enable-logging",
        "--log-level=3",
      ];
      // Em headless ou se forçado software GL
      if (headlessOption !== false) {
        baseArgs.push("--disable-gpu", "--use-gl=swiftshader");
      }
      // Em alguns ambientes --single-process causa travas quando não root; evitar em headful
      if (process.env.PUPPETEER_SINGLE_PROCESS === "1") {
        baseArgs.push("--single-process");
      }
      const uniqueArgs = Array.from(new Set(baseArgs));

      const launchCommon = {
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: parseInt(process.env.SCRAPER_CONCURRENCY) || 1,
        timeout: effectiveTimeout,
        retryLimit: parseInt(process.env.SCRAPER_RETRY_LIMIT) || 3,
        retryDelay: parseInt(process.env.SCRAPER_RETRY_DELAY) || 2000,
        puppeteer,
        puppeteerOptions: {
          headless: headlessOption,
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
          protocolTimeout:
            parseInt(process.env.PUPPETEER_PROTOCOL_TIMEOUT) ||
            Math.max(effectiveTimeout, 300000),
          defaultViewport: { width: 1280, height: 800 },
          ignoreHTTPSErrors: true,
          args: uniqueArgs,
          env: Object.assign({}, process.env, { LIBGL_ALWAYS_SOFTWARE: "1" }),
          dumpio: false,
        },
      };

      const attemptLaunch = async opt => {
        return Cluster.launch(opt);
      };

      try {
        this.cluster = await attemptLaunch(launchCommon);
      } catch (launchErr) {
        const msg = (launchErr && launchErr.message) || "";
        const isHeadfulAttempt = headlessOption === false;
        if (
          isHeadfulAttempt &&
          /Failed to launch the browser process/i.test(msg)
        ) {
          Logger.error(
            "Falha ao lançar Chromium em modo headful. Aplicando fallback automático para headless 'new'.",
            launchErr,
          );
          try {
            const fallbackOpts = {
              concurrency: launchCommon.concurrency,
              maxConcurrency: launchCommon.maxConcurrency,
              timeout: launchCommon.timeout,
              retryLimit: launchCommon.retryLimit,
              retryDelay: launchCommon.retryDelay,
              puppeteer: launchCommon.puppeteer,
              puppeteerOptions: Object.assign(
                {},
                launchCommon.puppeteerOptions,
                {
                  headless: "new",
                  args: Array.from(
                    new Set(
                      (launchCommon.puppeteerOptions.args || []).concat([
                        "--disable-gpu",
                        "--use-gl=swiftshader",
                      ]),
                    ),
                  ),
                },
              ),
            };
            this.cluster = await attemptLaunch(fallbackOpts);
            Logger.warn(
              "Executando em headless por fallback. Para ver o navegador, instale dependências gráficas (ex: apt-get install -y libnss3 libatk-bridge2.0-0 libx11-xcb1 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 fonts-liberation) ou rode: xvfb-run -a -s '-screen 0 1280x800x24' SCRAPER_HEADFUL=1 node src/scripts/full-scrape-count.js",
              { service: "unica-scraper" },
            );
          } catch (fallbackErr) {
            Logger.error(
              "Fallback para headless também falhou ao iniciar o Chromium.",
              fallbackErr,
            );
            throw launchErr; // re-lançar erro original
          }
        } else {
          throw launchErr;
        }
      }

      // Configure task with safer per-page timeouts and defaults
      const pageTimeout = parseInt(process.env.SCRAPER_PAGE_TIMEOUT) || 180000; // ms

      const defaultTaskHardTimeout =
        parseInt(process.env.SCRAPER_TASK_TIMEOUT) || 300000; // watchdog por tarefa

      await this.cluster.task(async ({ page, data, worker }) => {
        let watchdogTimer;
        try {
          const taskHardTimeout =
            parseInt(data && data.taskTimeout) || defaultTaskHardTimeout;
          Logger.info(
            `TASK START: type=${data.type} url=${data.url} hardTimeout=${taskHardTimeout}`,
          );
          // set default timeouts for navigation and operations on the page
          page.setDefaultNavigationTimeout(pageTimeout);
          page.setDefaultTimeout(pageTimeout);
          try {
            const defaultUA =
              "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36";
            await page.setUserAgent(
              process.env.SCRAPER_USER_AGENT || defaultUA,
            );
          } catch (_) {}
          // Block common analytics/tracker requests to reduce noise and avoid unnecessary external calls
          try {
            const shouldBlock =
              String(process.env.SCRAPER_BLOCK_TRACKERS || "1") !== "0";
            await page.setRequestInterception(true);
            const blockedHosts = [
              "google-analytics.com",
              "www.google-analytics.com",
              "analytics.google.com",
              "www.googletagmanager.com",
              "googletagmanager.com",
              "doubleclick.net",
              "connect.facebook.net",
              "pixel.facebook.com",
            ];
            const blockResources =
              String(process.env.SCRAPER_BLOCK_RESOURCES || "1") !== "0";
            const blockedTypes = new Set(["image", "media"]);
            page.on("request", req => {
              try {
                const url = req.url();
                const hostname = (() => {
                  try {
                    return new URL(url).hostname;
                  } catch (e) {
                    return "";
                  }
                })();
                if (
                  shouldBlock &&
                  blockedHosts.some(h => hostname.includes(h))
                ) {
                  Logger.info(`BLOCKED tracker request: ${url}`);
                  return req.abort();
                }
                if (blockResources && blockedTypes.has(req.resourceType())) {
                  return req.abort();
                }
                return req.continue();
              } catch (e) {
                try {
                  req.continue();
                } catch (_) {}
              }
            });
          } catch (e) {
            Logger.info("Could not enable request interception", e);
          }

          // Attach debug event handlers to the page to capture console, responses and errors
          try {
            // Forward console messages from the page, but filter out noisy vendor messages
            page.on("console", msg => {
              try {
                const type = msg.type();
                const text = msg.text();
                // Filter out known noisy warnings coming from GL or XKB
                if (
                  /libEGL|xkbcomp|Could not resolve keysym|XF86RefreshRateToggle|XF86Accessibility|XF86DoNotDisturb/i.test(
                    text,
                  )
                ) {
                  return;
                }
                if (process.env.SCRAPER_DEBUG)
                  console.log(`[page:${type}] ${text}`);
              } catch (e) {
                // ignore any errors while processing console messages
              }
            });
          } catch (_) {}

          // Watchdog por tarefa: falhar rápido se demorar demais e deixar o cluster re-tentar
          const watchdog = new Promise((_, reject) => {
            watchdogTimer = setTimeout(async () => {
              try {
                Logger.error(
                  `TASK WATCHDOG TIMEOUT após ${taskHardTimeout}ms [${data.type}] ${data.url}`,
                );
                // snapshot rápido (se possível)
                try {
                  await page.screenshot({
                    path: `error-task-watchdog-${Date.now()}.png`,
                  });
                } catch (_) {}

                // Cancela o mais rápido possível (evita que scrapePage continue rodando em background)
                try {
                  if (typeof page.isClosed === "function" && !page.isClosed()) {
                    await page
                      .close({ runBeforeUnload: false })
                      .catch(() => {});
                  }
                } catch (_) {}
              } finally {
                reject(new Error(`TaskWatchdogTimeout:${taskHardTimeout}`));
              }
            }, taskHardTimeout);
          });

          const result = await Promise.race([
            this.scrapePage(page, data),
            watchdog,
          ]);

          clearTimeout(watchdogTimer);
          try {
            const len = Array.isArray(result) ? result.length : result ? 1 : 0;
            Logger.info(
              `TASK DONE: type=${data.type} url=${data.url} items=${len}`,
            );
          } catch (_) {}
          // Sem retries manuais aqui: deixar o cluster reexecutar a tarefa com uma nova page
          return result;
        } catch (err) {
          const msg = (err && err.message) || "";
          const isWatchdogTimeout =
            typeof msg === "string" && msg.startsWith("TaskWatchdogTimeout:");

          if (isWatchdogTimeout) {
            // Timeout por watchdog geralmente não melhora com retry; retornar vazio evita
            // que o puppeteer-cluster faça novas tentativas e alongue o scraping.
            Logger.warn(
              `Task watchdog estourou; retornando vazio sem retry (tipo=${data.type}, url=${data.url})`,
            );
            try {
              if (typeof page.isClosed === "function" && !page.isClosed()) {
                await page.close({ runBeforeUnload: false }).catch(() => {});
              }
            } catch (_) {}
            return [];
          }
          Logger.error(
            `Erro na task do cluster (tipo=${data.type}, url=${data.url}):`,
            err,
          );
          throw err;
        } finally {
          if (watchdogTimer) clearTimeout(watchdogTimer);
        }
      });

      Logger.info("Scraper inicializado com sucesso");
      this.initialized = true;
    } catch (error) {
      Logger.error("Erro ao inicializar scraper:", error);
      throw error;
    }
  }

  async scrapeAllCourses() {
    try {
      this.emitLog("info", "📊 Iniciando scraping de todos os cursos");

      // IMPORTANTE: Limpar arrays antes de iniciar novo scraping
      this.courses = [];
      this.categories = [];

      // Primeiro, obter todas as categorias
      this.emitLog("info", "🔍 Obtendo categorias...");
      let categories = [];
      const forceFixed =
        String(process.env.SCRAPER_FORCE_CATEGORIES || "0") !== "0";
      if (forceFixed) {
        this.emitLog(
          "info",
          "Usando lista fixa de categorias (SCRAPER_FORCE_CATEGORIES=1).",
        );
        this.categories = this.buildExpectedCategories();
        categories = this.categories;
      } else {
        try {
          categories = await this.scrapeCategories();
        } catch (_) {
          categories = [];
        }
        if (!Array.isArray(categories) || categories.length < 11) {
          this.emitLog(
            "warn",
            `Categorias incompletas (${Array.isArray(categories) ? categories.length : 0}); usando fallback fixo.`,
          );
          this.categories = this.buildExpectedCategories();
          categories = this.categories;
        }
      }
      this.processedCategories = 0;
      this.processedCourses = 0;

      this.emitLog("info", `✅ Encontradas ${categories.length} categorias`);

      // Para cada categoria, obter os cursos
      for (const category of categories) {
        this.emitLog("info", `🎯 Processando categoria: ${category.name}`);
        await this.scrapeCategoryPages(category);
        this.processedCategories++;
        this.emitLog(
          "info",
          `✅ Categoria ${category.name} processada (${this.processedCategories}/${categories.length})`,
        );
      }

      this.emitLog(
        "info",
        `🎉 Scraping de cursos concluído! Total de cursos: ${this.courses.length}`,
      );

      // NOVO: Buscar descrições reais de cada curso
      this.emitLog(
        "info",
        "📝 Buscando descrições reais dos cursos do site...",
      );
      await this.fetchAllDescriptions();

      this.emitLog(
        "info",
        `✅ Scraping completo! ${this.courses.length} cursos com descrições`,
      );
      return {
        courses: this.courses,
        categories: this.categories,
        totalCourses: this.courses.length,
      };
    } catch (error) {
      this.emitLog("error", `❌ Erro durante o scraping: ${error.message}`);
      Logger.error("Erro durante o scraping:", error);
      throw error;
    }
  }

  // Método para scraping de uma única categoria (usado para retries)
  async scrapeSingleCategory(categoryName) {
    try {
      Logger.info(
        `scrapeSingleCategory: Iniciando scraping de "${categoryName}"`,
      );

      // Encontrar ou criar categoria
      let category = this.categories.find(c => c.name === categoryName);
      if (!category) {
        const slug = Category.createSlug(categoryName);
        const base = new URL(this.baseUrl);
        category = new Category({
          id: this.categories.length + 1,
          name: categoryName,
          slug,
          description: `Cursos de ${categoryName}`,
          url: this.normalizeUnicaUrl(`${base.origin}/pos-graduacao/${slug}`),
        });
      }

      // Garantir cluster inicializado
      if (!this.cluster) {
        await this.initialize();
      }

      // Configurar para máxima robustez
      const categoryUrl = this.normalizeUnicaUrl(category.url);
      const coursesTaskTimeout =
        parseInt(process.env.SCRAPER_COURSES_TASK_TIMEOUT) || 240000;

      const coursesData = await this.cluster.execute({
        type: "courses",
        category: category.name,
        url: categoryUrl,
        categoryUrl: categoryUrl,
        taskTimeout: coursesTaskTimeout,
      });

      if (!coursesData || coursesData.length === 0) {
        Logger.warn(
          `scrapeSingleCategory: Nenhum curso encontrado para "${categoryName}"`,
        );
        return [];
      }

      // Mapear cursos
      const courses = coursesData.map((course, index) => {
        return new Course({
          id: index + 1,
          title: course.title,
          category: category.name,
          description: course.description,
          duration: course.duration,
          modality: course.modality,
          price: course.price,
          url: course.url,
          imageUrl: course.imageUrl,
        });
      });

      Logger.info(
        `scrapeSingleCategory: ${courses.length} cursos extraídos de "${categoryName}"`,
      );
      return courses;
    } catch (error) {
      Logger.error(
        `Erro em scrapeSingleCategory para "${categoryName}":`,
        error,
      );
      return [];
    }
  }

  getProgress() {
    return {
      processedCourses: this.processedCourses,
      processedCategories: this.processedCategories,
      totalCourses: this.courses.length,
      totalCategories: this.categories.length,
    };
  }

  async scrapeCategories() {
    try {
      const minTimeout = 120000;
      const envTimeout = parseInt(process.env.SCRAPER_TIMEOUT) || 0;
      const effectiveTimeout = Math.max(envTimeout, minTimeout);
      Logger.info(
        `Executando scrapeCategories (delegando timeout/retries ao cluster)`,
      );
      const categoriesData = await this.cluster.execute({
        type: "categories",
        url: this.baseUrl,
      });

      this.categories = categoriesData.map((cat, index) => {
        const slug = Category.createSlug(cat.name);
        let derivedUrl = null;
        try {
          const base = new URL(this.baseUrl);
          derivedUrl = `${base.origin}/pos-graduacao/${slug}`;
        } catch (_) {
          derivedUrl = `https://www.faculdadeunica.com.br/pos-graduacao/${slug}`;
        }
        return new Category({
          id: index + 1,
          name: cat.name,
          slug,
          description: cat.description || "",
          url: this.normalizeUnicaUrl(cat.url || derivedUrl),
        });
      });

      Logger.info(`Categorias extraídas: ${this.categories.length}`);

      if (!this.categories || this.categories.length < 11) {
        const fallback = this.buildExpectedCategories();
        Logger.warn(
          `Categorias incompletas detectadas. Usando fallback com ${fallback.length} categorias.`,
        );
        this.categories = fallback;
      }

      return this.categories;
    } catch (error) {
      Logger.error("Erro ao obter categorias:", error);
      this.categories = this.buildExpectedCategories();
      return this.categories;
    }
  }

  async scrapeCategoryPages(category) {
    try {
      // retry simples
      let attempts = 0;
      const maxAttempts = parseInt(process.env.SCRAPER_CATEGORY_ATTEMPTS) || 2;
      let coursesData = [];
      let categoryUrl = this.normalizeUnicaUrl(category.url);
      if (!categoryUrl) {
        try {
          const slug = Category.createSlug(category.name || "");
          const base = new URL(this.baseUrl);
          categoryUrl = `${base.origin}/pos-graduacao/${slug}`;
        } catch (_) {}
      }
      categoryUrl = this.normalizeUnicaUrl(categoryUrl);
      while (attempts < maxAttempts) {
        try {
          this.emitLog(
            "info",
            `🔄 Coletando cursos da categoria ${category.name} (tentativa ${
              attempts + 1
            })`,
          );
          const coursesTaskTimeout =
            parseInt(process.env.SCRAPER_COURSES_TASK_TIMEOUT) || 180000;
          coursesData = await this.cluster.execute({
            type: "courses",
            category: category.name,
            // Navegar direto para a página da categoria quando disponível
            url: categoryUrl || this.baseUrl,
            categoryUrl: categoryUrl || null,
            taskTimeout: coursesTaskTimeout,
          });
          break;
        } catch (e) {
          attempts++;
          this.emitLog(
            "warn",
            `⚠️ Erro ao obter cursos (tentativa ${attempts}) da categoria ${category.name}: ${e.message}`,
          );
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      // Fallback específico para categorias problemáticas (Estética/Gastronomia)
      if (
        (!coursesData || coursesData.length === 0) &&
        ["Estética", "Gastronomia"].includes(category.name)
      ) {
        // Mantido apenas como opção de debug. Por padrão, não tenta URL alternativa
        // para evitar atrasos e warns desnecessários.
        const enableAlt =
          String(process.env.SCRAPER_ENABLE_ALT_URL_FALLBACK || "0") === "1";
        if (enableAlt) {
          try {
            const altUrl = (() => {
              if (!categoryUrl) return null;
              const u = new URL(categoryUrl);
              u.hostname = u.hostname.startsWith("www.")
                ? u.hostname.replace(/^www\./, "")
                : `www.${u.hostname}`;
              return u.toString();
            })();
            if (altUrl && altUrl !== categoryUrl) {
              this.emitLog(
                "warn",
                `⚠️ Tentando URL alternativa para ${category.name}: ${altUrl}`,
              );
              const altTaskTimeout =
                parseInt(process.env.SCRAPER_ALT_URL_TASK_TIMEOUT) ||
                parseInt(process.env.SCRAPER_COURSES_TASK_TIMEOUT) ||
                90000;
              coursesData = await this.cluster.execute({
                type: "courses",
                category: category.name,
                url: altUrl,
                categoryUrl: altUrl,
                taskTimeout: altTaskTimeout,
              });
            }
          } catch (_) {}
        }
      }

      if (!coursesData || coursesData.length === 0) {
        this.emitLog(
          "info",
          `ℹ️ Categoria ${category.name} retornou 0 cursos nesta tentativa (será verificado pelo controller)`,
        );
        return;
      }

      const categoryObj = this.categories.find(
        cat => cat.name === category.name,
      );
      if (categoryObj) {
        categoryObj.coursesCount = coursesData.length;
      }

      this.emitLog(
        "info",
        `✅ Encontrados ${coursesData.length} cursos em ${category.name}`,
      );

      // mapear cada curso e incrementar processedCourses por item com logs
      const courses = [];
      for (let index = 0; index < coursesData.length; index++) {
        const course = coursesData[index];
        const courseObj = new Course({
          id: this.courses.length + courses.length + 1,
          title: course.title,
          category: category.name,
          description: course.description,
          duration: course.duration,
          modality: course.modality,
          price: course.price,
          url: course.url,
          imageUrl: course.imageUrl,
        });
        courses.push(courseObj);
        this.processedCourses += 1; // incrementa por cada curso processado
        Logger.info(
          `Curso processado: ${courseObj.title} (total processed: ${this.processedCourses})`,
        );
      }

      this.courses.push(...courses);
    } catch (error) {
      Logger.error(
        `Erro ao obter cursos da categoria ${category.name}:`,
        error,
      );
    }
  }

  async scrapePage(page, data) {
    // Use a safe goto with explicit timeout; page defaults are configured in cluster.task
    try {
      const timingEnabled = String(process.env.SCRAPER_TIMING || "") === "1";
      const t0 = Date.now();
      const tlog = msg => {
        if (!timingEnabled) return;
        try {
          Logger.info(
            `TIMING[${data && data.type}] +${Date.now() - t0}ms ${msg}`,
            { url: data && data.url },
          );
        } catch (_) {}
      };

      // NOTE: request interception is intentionally NOT re-enabled here.
      // The cluster.task already enables `page.setRequestInterception(true)` and
      // registers a single request handler per page. Enabling interception twice
      // caused the Puppeteer error "Request is already handled!" when both
      // handlers attempted to call `req.continue()`/`req.abort()` on the same
      // intercepted request. Keep interception centralized in cluster.task.

      // Forçar idioma antes do goto para toda a navegação
      try {
        await page.setExtraHTTPHeaders({ "Accept-Language": "pt-BR,pt;q=0.9" });
      } catch (_) {}

      const navTimeout =
        parseInt(process.env.SCRAPER_NAV_TIMEOUT) ||
        parseInt(process.env.SCRAPER_PAGE_TIMEOUT) ||
        120000;
      const waitUntil =
        process.env.SCRAPER_GOTO_WAIT_UNTIL || "domcontentloaded";
      try {
        tlog(`goto start (waitUntil=${waitUntil}, timeout=${navTimeout})`);
        await page.goto(data.url, {
          waitUntil,
          timeout: navTimeout,
        });
        tlog("goto done");
      } catch (err) {
        if (err && err.name === "TimeoutError") {
          Logger.warn(
            `Navegação com timeout, continuando extração: ${data.url}`,
          );
          tlog("goto timeout (continuando)");
        } else {
          throw err;
        }
      }
      // Pequeno idle adicional, mas com timeout curto
      try {
        tlog("waitForNetworkIdle start");
        await page.waitForNetworkIdle({ idleTime: 800, timeout: 4000 });
        tlog("waitForNetworkIdle done");
      } catch (_) {}

      // Artefatos de debug (desligado por padrão; habilite com SCRAPER_SAVE_ARTIFACTS=1)
      tlog("artifact(after-goto) start");
      await this.maybeSaveScraperArtifact(page, "after-goto");
      tlog("artifact(after-goto) done");

      // Tentar dispensar banners de cookies imediatamente
      tlog("tryDismissBanners start");
      await this.tryDismissBanners(page);
      tlog("tryDismissBanners done");

      // Segurança: se algum clique/redirecionamento levou para domínio externo, voltar para a URL alvo
      try {
        const currentUrl = page.url();
        const host = new URL(currentUrl).hostname;
        if (!/faculdadeunica\.com\.br$/i.test(host)) {
          Logger.warn(
            `Navegação inesperada para domínio externo: ${currentUrl}`,
          );
          await page
            .goto(data.url, {
              waitUntil:
                process.env.SCRAPER_GOTO_WAIT_UNTIL || "domcontentloaded",
              timeout:
                parseInt(process.env.SCRAPER_NAV_TIMEOUT) ||
                parseInt(process.env.SCRAPER_PAGE_TIMEOUT) ||
                120000,
            })
            .catch(() => {});
        }
      } catch (_) {}

      // Scroll até o fim para carregar AJAX/lazyload
      try {
        tlog("scroll start");
        await page.mouse.move(200, 200);
        await page.waitForTimeout(300);
        await page.keyboard.press("End").catch(() => {});
        await page.waitForTimeout(500);
        const maxScrollMs =
          parseInt(process.env.SCRAPER_SCROLL_MAX_MS) || 12000;
        const maxSteps =
          parseInt(process.env.SCRAPER_SCROLL_MAX_STEPS) ||
          (data && data.type === "courses" ? 25 : 80);

        await page.evaluate(
          async ({ maxScrollMs, maxSteps }) => {
            const start = Date.now();
            await new Promise(resolve => {
              let steps = 0;
              let lastScrollHeight = 0;
              const distance = 600;
              const timer = setInterval(() => {
                try {
                  window.scrollBy(0, distance);
                  steps += 1;
                  const h = document.body ? document.body.scrollHeight : 0;
                  const timeUp = Date.now() - start > maxScrollMs;
                  const stepsUp = steps >= maxSteps;
                  const stable = h && h === lastScrollHeight;
                  lastScrollHeight = h;
                  if (timeUp || stepsUp || stable) {
                    clearInterval(timer);
                    resolve();
                  }
                } catch (_) {
                  clearInterval(timer);
                  resolve();
                }
              }, 200);
            });
          },
          { maxScrollMs, maxSteps },
        );

        await page.waitForTimeout(data && data.type === "courses" ? 400 : 1000);
        tlog("scroll done");
      } catch (_) {}
    } catch (err) {
      // Rethrow navigation errors so caller/retry logic can act on them
      Logger.error(`Erro na navegação para ${data.url}:`, err);
      throw err;
    }

    try {
      if (data.type === "categories") {
        const timingEnabled = String(process.env.SCRAPER_TIMING || "") === "1";
        const t0 = Date.now();
        const tlog = msg => {
          if (!timingEnabled) return;
          try {
            Logger.info(
              `TIMING[${data && data.type}] +${Date.now() - t0}ms ${msg}`,
              { url: data && data.url },
            );
          } catch (_) {}
        };
        await this.tryDismissBanners(page);
        // Evitar waits longos: a extração por HTML lida com o DOM atual.
        await page
          .waitForSelector("button.button-card", { timeout: 8000 })
          .catch(() => {});
        tlog("waitForSelector(button.button-card) done");
        if (typeof page.isClosed === "function" && page.isClosed()) {
          throw new Error("Page closed before extraction");
        }

        // snapshot adicional antes da extração (opcional)
        tlog("artifact(before-extract-categories) start");
        await this.maybeSaveScraperArtifact(page, "before-extract-categories");
        tlog("artifact(before-extract-categories) done");

        tlog("extractCategories start");
        return await this.extractCategories(page);
      } else if (data.type === "courses") {
        const timingEnabled = String(process.env.SCRAPER_TIMING || "") === "1";
        const t0 = Date.now();
        const tlog = msg => {
          if (!timingEnabled) return;
          try {
            Logger.info(
              `TIMING[${data && data.type}] +${Date.now() - t0}ms ${msg}`,
              { url: data && data.url },
            );
          } catch (_) {}
        };
        tlog("extractCourses start");
        return await this.extractCourses(
          page,
          data.category,
          data.categoryUrl || data.url,
        );
      }
    } catch (error) {
      // Salvar screenshot e HTML para debug
      try {
        const ts = Date.now();
        await page.screenshot({
          path: `error-scraper-${ts}.png`,
          fullPage: true,
        });
        const html = await page.content();
        const fs = require("fs");
        fs.writeFileSync(`error-scraper-${ts}.html`, html);
        Logger.error(
          `Screenshot e HTML salvos para debug: error-scraper-${ts}.png/.html`,
        );
      } catch (e2) {
        Logger.error("Falha ao salvar screenshot/HTML", e2);
      }
      Logger.error(`Erro ao extrair dados da página ${data.url}:`, error);
      throw error;
    }
  }

  async waitForAnySelector(page, selectors, timeout) {
    const start = Date.now();
    const remaining = () => Math.max(0, timeout - (Date.now() - start));
    for (const selector of selectors) {
      try {
        if (typeof page.isClosed === "function" && page.isClosed()) {
          throw new Error("Page closed while waiting for selectors");
        }
        await page.waitForSelector(selector, { timeout: remaining() });
        return selector;
      } catch (e) {
        if (e.message && e.message.includes("Page closed")) throw e;
        /* tenta próximo */
      }
    }
    // se nenhum específico aparecer, espera por texto comum em botões/abas
    try {
      await page.waitForFunction(
        () => {
          const txts = ["Categoria", "Cursos", "Pos", "Pós", "Pós-Graduação"];
          const els = Array.from(document.querySelectorAll("body *"));
          return els.some(el =>
            txts.some(t => (el.textContent || "").includes(t)),
          );
        },
        { timeout: remaining() },
      );
    } catch (_) {}
  }

  async tryDismissBanners(page) {
    try {
      // tenta clicar em botões de cookie/consent conhecidos
      const clicked = await page.evaluate(() => {
        const tryClick = el => {
          try {
            el.click();
            return true;
          } catch {
            return false;
          }
        };

        // Nunca clicar em links (<a>) aqui: alguns widgets (ex: social) possuem "OK" e redirecionam.
        const candidates = [
          "#onetrust-accept-btn-handler",
          "#accept-cookies",
          ".accept-cookies",
          "button.cookie-accept",
          'button[aria-label="accept"]',
          // HubSpot cookie banner observado no HTML salvo
          "#hs-eu-confirmation-button",
        ];
        for (const sel of candidates) {
          const el = document.querySelector(sel);
          if (el && tryClick(el)) return true;
        }

        // fallback por texto SOMENTE dentro de containers típicos de cookie/consent
        const containers = [
          "#onetrust-banner-sdk",
          ".ot-sdk-container",
          ".cookie",
          "#hs-eu-cookie-confirmation",
          ".hs-eu-cookie-confirmation",
        ];
        const byText = ["aceitar", "accept", "concordo"];
        for (const csel of containers) {
          const root = document.querySelector(csel);
          if (!root) continue;
          const buttons = Array.from(root.querySelectorAll("button"));
          const found = buttons.find(b =>
            byText.some(t => (b.textContent || "").toLowerCase().includes(t)),
          );
          if (found && tryClick(found)) return true;
        }
        return false;
      });
      if (clicked) {
        await page.waitForTimeout(500);
      }
    } catch (_) {}
  }

  // helper that wraps a promise with a timeout and provides better error message
  async executeWithTimeout(fn, timeoutMs) {
    const minTimeout = 120000;
    const envTimeout = parseInt(process.env.SCRAPER_TIMEOUT) || 0;
    timeoutMs = timeoutMs || Math.max(envTimeout, minTimeout);
    return new Promise((resolve, reject) => {
      let finished = false;
      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          const err = new Error(`Timeout hit: ${timeoutMs}`);
          Logger.error("executeWithTimeout: timeout", { timeoutMs });
          reject(err);
        }
      }, timeoutMs);

      Promise.resolve()
        .then(() => fn())
        .then(result => {
          if (!finished) {
            finished = true;
            clearTimeout(timer);
            resolve(result);
          }
        })
        .catch(err => {
          if (!finished) {
            finished = true;
            clearTimeout(timer);
            reject(err);
          }
        });
    });
  }

  async getPageContentWithTimeout(page, timeoutMs, label) {
    const ms = Math.max(500, parseInt(timeoutMs) || 4000);
    const tag = label || "page.content";
    const start = Date.now();
    try {
      if (typeof page.isClosed === "function" && page.isClosed()) return "";
      const res = await Promise.race([
        page.content(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout: ${tag} ${ms}ms`)), ms),
        ),
      ]);
      return typeof res === "string" ? res : "";
    } catch (e) {
      Logger.warn(
        `getPageContentWithTimeout falhou (${tag}) em ${Date.now() - start}ms: ${e.message}`,
      );
      return "";
    }
  }

  async extractCategories(page) {
    try {
      if (typeof page.isClosed === "function" && page.isClosed()) {
        return [];
      }

      const timingEnabled = String(process.env.SCRAPER_TIMING || "") === "1";
      const t0 = Date.now();
      const tlog = msg => {
        if (!timingEnabled) return;
        try {
          Logger.info(`TIMING[categories] +${Date.now() - t0}ms ${msg}`, {
            url: page.url(),
          });
        } catch (_) {}
      };

      tlog("page.content(categories) start");
      const html = await this.getPageContentWithTimeout(
        page,
        parseInt(process.env.SCRAPER_CONTENT_TIMEOUT) || 5000,
        "categories.page.content",
      );
      tlog(`page.content(categories) done (len=${html.length})`);
      if (!html) return [];

      const cheerio = require("cheerio");
      const $ = cheerio.load(html);
      const results = [];
      const seen = new Set();

      $("a[href*='/pos-graduacao/']")
        .toArray()
        .forEach(el => {
          const a = $(el);
          const btnText = (a.find("button").text() || "").toUpperCase();
          if (!btnText.includes("ESCOLHER")) return;

          const href = (a.attr("href") || "").trim();
          if (!href) return;

          const title = (
            a.find("h3").first().text() ||
            a.find("h2").first().text() ||
            a.find("h5").first().text() ||
            a.attr("title") ||
            a.text()
          )
            .replace(/ESCOLHER CURSO/gi, "")
            .replace(/\s+/g, " ")
            .trim();

          if (!title || title.length < 2) return;
          const key = title.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);

          let absUrl = href;
          try {
            absUrl = new URL(href, page.url()).href;
          } catch (_) {}

          results.push({
            name: title,
            description: `Cursos de ${title}`,
            url: absUrl,
          });
        });

      Logger.info(
        `extractCategories(html): encontradas ${results.length} categorias`,
      );
      return results;
    } catch (error) {
      Logger.error("Error in extractCategories:", error);
      return []; // Return empty array instead of throwing to allow retries
    }
  }

  async extractCourses(page, categoryName, categoryUrl) {
    try {
      const slug = Category.createSlug(categoryName || "");
      // se não veio a URL, deduzir uma padrão
      if (!categoryUrl) {
        try {
          const base = new URL(this.baseUrl || page.url());
          categoryUrl = new URL(`/pos-graduacao/${slug}`, base).href;
        } catch (_) {}
      }

      const timingEnabled = String(process.env.SCRAPER_TIMING || "") === "1";
      const t0 = Date.now();
      const tlog = msg => {
        if (!timingEnabled) return;
        try {
          Logger.info(`TIMING[courses] +${Date.now() - t0}ms ${msg}`, {
            url: page.url(),
          });
        } catch (_) {}
      };
      // A task do cluster já navega direto para a URL da categoria; evitar navegações/clicks aqui
      tlog("extractCourses entered");

      // Extração resiliente (sem evaluate/$$eval): usa o HTML atual da página.
      // Alguns ambientes com puppeteer-cluster podem travar em Runtime.callFunctionOn;
      // `page.content()` costuma ser bem mais estável.
      try {
        const cheerio = require("cheerio");
        const loadMoreMode = String(
          process.env.SCRAPER_LOAD_MORE_MODE || "fast",
        ).toLowerCase();
        const quickWaitMs = parseInt(process.env.SCRAPER_QUICK_WAIT_MS) || 8000;
        const quickPollMs = parseInt(process.env.SCRAPER_QUICK_POLL_MS) || 400;

        const parseCoursesFromHtml = (html, baseHref) => {
          if (!html) return [];
          const $ = cheerio.load(html);
          const results = [];
          const seen = new Set();
          const anchors = $(".title-card a[href*='/pos-graduacao/']").toArray();

          for (const el of anchors) {
            const a = $(el);
            const href = (a.attr("href") || "").trim();
            if (!href) continue;
            let abs = href;
            try {
              abs = new URL(href, baseHref).href;
            } catch (_) {}
            if (!abs || seen.has(abs)) continue;

            const title = (a.find("h3").first().text() || a.text() || "")
              .replace(/\s+/g, " ")
              .trim();
            if (!title) continue;

            const duration = (
              a.find(".subTitle-name-course").first().text() || ""
            )
              .replace(/\s+/g, " ")
              .trim();

            const card = a.closest(".card");
            const img = card.find("img").first();
            const imageUrl = (
              img.attr("src") ||
              img.attr("data-src") ||
              ""
            ).trim();

            results.push({
              title,
              description: "",
              duration,
              modality: "EAD",
              price: "",
              url: abs,
              imageUrl,
            });
            seen.add(abs);
          }
          return results;
        };

        const startQuick = Date.now();
        let coursesFromHtml = [];
        let lastUrl = "";
        while (Date.now() - startQuick < quickWaitMs) {
          if (typeof page.isClosed === "function" && page.isClosed()) return [];
          lastUrl = page.url();
          tlog("page.content(courses) start");
          const html = await this.getPageContentWithTimeout(
            page,
            parseInt(process.env.SCRAPER_CONTENT_TIMEOUT) || 5000,
            "courses.page.content",
          );
          tlog(`page.content(courses) done (len=${html.length})`);
          coursesFromHtml = parseCoursesFromHtml(html, lastUrl);
          tlog(`parseCoursesFromHtml => ${coursesFromHtml.length}`);
          if (coursesFromHtml.length > 0) break;
          await page.waitForTimeout(quickPollMs).catch(() => {});
        }

        if (coursesFromHtml.length > 0) {
          // Se o modo for off, já devolve o que está visível.
          if (loadMoreMode === "off") {
            Logger.info(
              `extractCourses(html): ${coursesFromHtml.length} cursos (sem loadMore) para categoria ${categoryName}`,
            );
            return coursesFromHtml;
          }

          // Tenta expandir clicando no botão via ElementHandle (sem evaluate)
          const maxMs =
            parseInt(process.env.SCRAPER_LOAD_MORE_MAX_MS) || 180000;
          const startTs = Date.now();
          const maxLoops =
            loadMoreMode === "full"
              ? parseInt(process.env.SCRAPER_LOAD_MORE_LIMIT) || 500
              : parseInt(process.env.SCRAPER_LOAD_MORE_CLICKS) || 8;
          // Aumentar espera entre cliques para dar tempo à API responder
          const loadMoreWaitMs =
            parseInt(process.env.SCRAPER_LOAD_MORE_WAIT_MS) || 1500;
          // Número de rodadas estáveis antes de desistir (mais tolerante)
          const stableThreshold =
            parseInt(process.env.SCRAPER_STABLE_THRESHOLD) || 4;

          let stableRounds = 0;
          let clickCount = 0;
          for (let i = 0; i < maxLoops; i++) {
            if (typeof page.isClosed === "function" && page.isClosed()) break;
            if (Date.now() - startTs > maxMs) {
              tlog(`loadMore timeout reached after ${clickCount} clicks`);
              break;
            }

            // Scroll para garantir que o botão esteja visível
            try {
              await page.evaluate(() =>
                window.scrollTo(0, document.body.scrollHeight),
              );
            } catch (_) {}
            await page.waitForTimeout(300).catch(() => {});

            const btn = await page
              .$("button.cta-return-course-api")
              .catch(() => null);
            if (!btn) {
              // Botão pode não ter aparecido ainda; aguardar e tentar novamente
              await page.waitForTimeout(500).catch(() => {});
              const retryBtn = await page
                .$("button.cta-return-course-api")
                .catch(() => null);
              if (!retryBtn) {
                tlog(`loadMore button not found after ${clickCount} clicks`);
                break;
              }
            }

            const btnToClick = await page
              .$("button.cta-return-course-api")
              .catch(() => null);
            if (!btnToClick) break;

            try {
              await btnToClick.click({ delay: 50 });
              clickCount++;
              tlog(`loadMore click ${clickCount}`);
            } catch (clickErr) {
              tlog(`loadMore click failed: ${clickErr.message}`);
              break;
            }

            // Esperar resposta da API com tempo adequado
            await page.waitForTimeout(loadMoreWaitMs).catch(() => {});

            tlog("page.content(courses-loadmore) start");
            const html = await this.getPageContentWithTimeout(
              page,
              parseInt(process.env.SCRAPER_CONTENT_TIMEOUT) || 8000,
              "courses.page.content.loadmore",
            );
            tlog(`page.content(courses-loadmore) done (len=${html.length})`);
            const next = parseCoursesFromHtml(html, page.url());

            if (next.length <= coursesFromHtml.length) {
              stableRounds += 1;
              tlog(
                `loadMore stable round ${stableRounds}/${stableThreshold} (count=${next.length})`,
              );
              if (stableRounds >= stableThreshold) {
                tlog(
                  `loadMore finished: no new courses after ${stableThreshold} attempts`,
                );
                break;
              }
              // Esperar um pouco mais antes de tentar novamente
              await page.waitForTimeout(800).catch(() => {});
            } else {
              stableRounds = 0;
              coursesFromHtml = next;
              tlog(`loadMore got ${next.length} courses`);
            }
          }

          Logger.info(
            `extractCourses: ${coursesFromHtml.length} cursos após ${clickCount} cliques para categoria ${categoryName}`,
          );

          Logger.info(
            `extractCourses: ${coursesFromHtml.length} cursos após ${clickCount} cliques para categoria ${categoryName}`,
          );
          return coursesFromHtml;
        }
      } catch (e) {
        Logger.warn(`extractCourses(html) falhou: ${e.message}`);
      }

      // Se não conseguiu extrair por HTML, não insistir com evaluate/$$eval em ambiente instável
      return [];

      // Tentar identificar os cards/listas de cursos
      const courseCandidateSelectors = [
        ".title-card a[href*='/pos-graduacao/']",
        ".course-item",
        ".curso-card",
        "[data-course]",
        "a.cta-button-color",
      ];
      const courseSelectorTimeout =
        parseInt(process.env.SCRAPER_COURSE_SELECTOR_TIMEOUT) || 8000;
      try {
        await page.waitForSelector(".title-card a[href*='/pos-graduacao/']", {
          timeout: courseSelectorTimeout,
        });
      } catch (_) {
        try {
          await page.evaluate(() =>
            window.scrollTo(0, document.body.scrollHeight),
          );
        } catch (_) {}
        try {
          await page.waitForTimeout(2000);
          await page.evaluate(() =>
            window.scrollTo(0, document.body.scrollHeight),
          );
        } catch (_) {}
        await page
          .waitForSelector(".title-card a[href*='/pos-graduacao/']", {
            timeout: courseSelectorTimeout,
          })
          .catch(() => {});
      }
      await this.waitForAnySelector(
        page,
        courseCandidateSelectors,
        courseSelectorTimeout,
      ).catch(() => {});
      await page.waitForTimeout(1000).catch(() => {});

      // Garantir que a página está pronta antes de evaluate
      try {
        if (typeof page.isClosed === "function" && page.isClosed()) return [];
        await page
          .waitForFunction(
            () =>
              document.readyState === "interactive" ||
              document.readyState === "complete",
            { timeout: 15000 },
          )
          .catch(() => {});
      } catch (_) {}

      // Botão "Carregar mais cursos" – agora robusto até exaustão ou limite
      try {
        const loadMoreMode = String(
          process.env.SCRAPER_LOAD_MORE_MODE || "fast",
        ).toLowerCase();

        // Por padrão, priorizar velocidade e evitar travar por centenas de cliques.
        // - fast: poucos cliques (best-effort)
        // - full: tenta expandir até exaustão respeitando SCRAPER_LOAD_MORE_MAX_MS
        // - off: não clica
        if (loadMoreMode === "off") {
          // skip
        } else {
          // Garantir filtro "TODOS" ativo
          try {
            await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll("button"));
              const target = buttons.find(b =>
                (b.textContent || "").toUpperCase().includes("TODOS"),
              );
              if (target) target.click();
            });
            await page.waitForTimeout(800);
          } catch (_) {}

          const maxMs =
            parseInt(process.env.SCRAPER_LOAD_MORE_MAX_MS) || 120000;
          const startTs = Date.now();
          const maxLoops =
            loadMoreMode === "full"
              ? parseInt(process.env.SCRAPER_LOAD_MORE_LIMIT) || 300
              : parseInt(process.env.SCRAPER_LOAD_MORE_CLICKS) || 8;
          let lastCount = 0;
          let stableRounds = 0;
          for (let i = 0; i < maxLoops; i++) {
            if (typeof page.isClosed === "function" && page.isClosed()) break;
            const elapsed = Date.now() - startTs;
            const remaining = maxMs - elapsed;
            if (remaining <= 0) {
              Logger.info(
                `LoadMore: atingiu limite de tempo (${maxMs}ms) – encerrando.`,
              );
              break;
            }
            // garantir que o botão esteja visível antes do clique
            try {
              await page.evaluate(() =>
                window.scrollTo(0, document.body.scrollHeight),
              );
            } catch (_) {}
            await page.waitForTimeout(500);

            // Contar itens antes
            const before = await page
              .evaluate(() => {
                const cards = document.querySelectorAll(".title-card").length;
                const buttons = document.querySelectorAll(
                  "a.cta-button-color[href]",
                ).length;
                return Math.max(cards, buttons);
              })
              .catch(() => 0);

            const clicked = await page
              .evaluate(() => {
                const btn = document.querySelector(
                  "button.cta-return-course-api",
                );
                if (btn && !btn.disabled && btn.offsetParent !== null) {
                  try {
                    btn.scrollIntoView({
                      behavior: "instant",
                      block: "center",
                    });
                  } catch (_) {}
                  btn.click();
                  return true;
                }
                return false;
              })
              .catch(() => false);
            if (!clicked) {
              Logger.info(
                `LoadMore: botão não encontrado ou inativo (iter=${i}) – encerrando.`,
              );
              break;
            }
            if (loadMoreMode === "full") {
              Logger.info(`LoadMore: clique ${i + 1} executado.`);
            }

            // Espera aumentar a lista ou fallback
            try {
              await page.waitForFunction(
                prev => {
                  const cards = document.querySelectorAll(".title-card").length;
                  const buttons = document.querySelectorAll(
                    "a.cta-button-color[href]",
                  ).length;
                  return Math.max(cards, buttons) > prev;
                },
                { timeout: Math.min(60000, Math.max(1000, remaining)) },
                before,
              );
            } catch (_) {
              // No modo fast, não insistir demais.
              await page.waitForTimeout(loadMoreMode === "full" ? 2500 : 1200);
            }
            // Pequeno scroll para forçar lazy-load
            try {
              await page.evaluate(() =>
                window.scrollTo(0, document.body.scrollHeight),
              );
            } catch (_) {}
            await page.waitForTimeout(400);

            let after = before;
            for (let w = 0; w < (loadMoreMode === "full" ? 3 : 1); w++) {
              after = await page
                .evaluate(() => {
                  const cards = document.querySelectorAll(".title-card").length;
                  const buttons = document.querySelectorAll(
                    "a.cta-button-color[href]",
                  ).length;
                  return Math.max(cards, buttons);
                })
                .catch(() => before);
              if (after > before) break;
              await page.waitForTimeout(2000 + w * 1500);
            }

            if (after <= before || after === lastCount) {
              const stillHasButton = await page
                .evaluate(() => {
                  const btn = document.querySelector(
                    "button.cta-return-course-api",
                  );
                  return !!(btn && !btn.disabled && btn.offsetParent !== null);
                })
                .catch(() => false);
              stableRounds += 1;
              if (loadMoreMode === "full") {
                Logger.info(
                  `LoadMore: sem aumento (before=${before}, after=${after}) – tent=${stableRounds}, btn=${stillHasButton}`,
                );
                if (!stillHasButton || stableRounds >= 6) {
                  Logger.info(
                    "LoadMore: encerrando após múltiplas tentativas sem aumento.",
                  );
                  break;
                }
              } else {
                // modo fast: se não aumentou, para rápido
                break;
              }
            } else {
              stableRounds = 0;
            }
            lastCount = after;
          }
        }
      } catch (e) {
        Logger.warn(`LoadMore: falhou loop de expansão: ${e.message}`);
      }

      // Extrair por padrão pelos links que expandem além da categoria
      const baseUrl = (() => {
        try {
          return new URL(page.url());
        } catch {
          return null;
        }
      })();
      const basePath = baseUrl ? baseUrl.pathname.replace(/\/$/, "") : "";

      let courses = [];
      try {
        courses = await page.evaluate(
          params => {
            const basePath = params.basePath;
            const categoryName = params.categoryName;
            const cards = Array.from(document.querySelectorAll(".title-card"));
            const buttons = Array.from(
              document.querySelectorAll("a.cta-button-color[href]"),
            );
            const items = [];
            const seen = new Set();
            const totalCards = cards.length;

            // Categorias problemáticas que não seguem o padrão de URL
            const problematicCategories = [
              "gastronomia",
              "estetica",
              "estética",
            ];
            const isProblematic = problematicCategories.some(cat => {
              const lowerCat = (categoryName || "").toLowerCase();
              const lowerPath = (basePath || "").toLowerCase();
              return lowerCat.includes(cat) || lowerPath.includes(cat);
            });

            for (const card of cards) {
              const titleAnchor = card.querySelector(
                "a[href*='/pos-graduacao/']",
              );
              const buttonAnchor =
                card
                  .closest(".card")
                  ?.querySelector("a.cta-button-color[href]") ||
                card.querySelector("a.cta-button-color[href]") ||
                null;
              const href =
                (buttonAnchor && buttonAnchor.getAttribute("href")) ||
                (titleAnchor && titleAnchor.getAttribute("href")) ||
                "";
              let abs = href;
              try {
                abs = new URL(href, location.href).href;
              } catch {}
              const pathname = (() => {
                try {
                  return new URL(abs).pathname;
                } catch {
                  return "";
                }
              })();
              if (!pathname.includes("/pos-graduacao/")) continue;

              // Para categorias problemáticas, aceitar qualquer curso com /pos-graduacao/
              // Para outras, verificar se começa com basePath
              if (
                !isProblematic &&
                basePath &&
                !pathname.startsWith(basePath + "/")
              ) {
                if (totalCards > 0) {
                  // relaxa o filtro para não perder cursos com URL inesperada
                } else {
                  continue;
                }
              }
              if (seen.has(abs)) continue;
              // Extrair título próximo
              const durationEl = card.querySelector(".subTitle-name-course");
              const titleEl = card.querySelector("h3") || titleAnchor || card;
              let title = (titleEl?.textContent || "")
                .replace(/\s+/g, " ")
                .trim();
              if (!title || title.length < 3) {
                const slugPart = pathname
                  .split("/")
                  .pop()
                  ?.replace(/[-_]+/g, " ")
                  .trim();
                title = (slugPart || "").toUpperCase();
              }
              if (!title || title.length < 3) continue;
              const duration = (durationEl?.textContent || "")
                .replace(/\s+/g, " ")
                .trim();
              const img =
                card.querySelector("img") ||
                (card.parentElement &&
                  card.parentElement.querySelector("img")) ||
                null;
              const imageUrl = img?.src || "";
              items.push({
                title,
                description: "",
                duration,
                modality: "EAD",
                price: "",
                url: abs,
                imageUrl,
              });
              seen.add(abs);
            }

            for (const btn of buttons) {
              const href = btn.getAttribute("href") || "";
              let abs = href;
              try {
                abs = new URL(href, location.href).href;
              } catch {}
              if (seen.has(abs)) continue;
              const pathname = (() => {
                try {
                  return new URL(abs).pathname;
                } catch {
                  return "";
                }
              })();
              if (!pathname.includes("/pos-graduacao/")) continue;

              // Para categorias problemáticas, aceitar qualquer curso
              if (
                !isProblematic &&
                basePath &&
                !pathname.startsWith(basePath + "/")
              ) {
                if (totalCards === 0) continue;
              }
              const card =
                btn.closest(".card") ||
                btn.closest(".items-center") ||
                btn.parentElement;
              const durationEl = card?.querySelector(".subTitle-name-course");
              const titleEl = card?.querySelector("h3") || card || btn;
              let title = (titleEl?.textContent || "")
                .replace(/\s+/g, " ")
                .trim();
              if (!title || title.length < 3) {
                const slugPart = pathname
                  .split("/")
                  .pop()
                  ?.replace(/[-_]+/g, " ")
                  .trim();
                title = (slugPart || "").toUpperCase();
              }
              if (!title || title.length < 3) continue;
              const duration = (durationEl?.textContent || "")
                .replace(/\s+/g, " ")
                .trim();
              items.push({
                title,
                description: "",
                duration,
                modality: "EAD",
                price: "",
                url: abs,
                imageUrl: "",
              });
              seen.add(abs);
            }
            return items;
          },
          { basePath: basePath, categoryName: categoryName },
        );
      } catch (e) {
        Logger.warn(`extractCourses: evaluate falhou: ${e.message}`);
        courses = [];
      }

      // Se nada foi encontrado, tentar fallback nos seletores genéricos
      if (!courses || courses.length === 0) {
        const alt = await page
          .$$eval(".course-item, .curso-card, [data-course]", els => {
            return els
              .map(element => {
                const title = element
                  .querySelector(".course-title, .titulo, h3, h4")
                  ?.textContent?.trim();
                const description = element
                  .querySelector(".course-description, .descricao, p")
                  ?.textContent?.trim();
                const duration = element
                  .querySelector(".duration, .duracao, .tempo")
                  ?.textContent?.trim();
                const price = element
                  .querySelector(".price, .preco, .valor")
                  ?.textContent?.trim();
                const url = (element.querySelector("a") || {}).href || "";
                const imageUrl = (element.querySelector("img") || {}).src || "";
                return title
                  ? {
                      title,
                      description: description || "",
                      duration: duration || "",
                      modality: "EAD",
                      price: price || "",
                      url,
                      imageUrl,
                    }
                  : null;
              })
              .filter(Boolean);
          })
          .catch(() => []);
        return alt || [];
      }

      Logger.info(
        `extractCourses: ${courses.length} cursos extraídos para categoria ${categoryName}`,
      );
      return courses;
    } catch (err) {
      Logger.error(
        `Erro em extractCourses para categoria ${categoryName}:`,
        err,
      );
      return [];
    }
  }

  async close() {
    if (this.cluster) {
      await this.cluster.close();
      Logger.info("Cluster do Puppeteer fechado");
      this.initialized = false;
    }
  }

  /**
   * Busca descrições reais de todos os cursos acessando cada página individual
   * Usa fetch HTTP simples para ser mais rápido que Puppeteer
   */
  async fetchAllDescriptions() {
    const BATCH_SIZE = parseInt(process.env.SCRAPER_DESC_BATCH_SIZE) || 15;
    const DELAY_BETWEEN_BATCHES =
      parseInt(process.env.SCRAPER_DESC_BATCH_DELAY) || 1500;
    const DELAY_BETWEEN_REQUESTS =
      parseInt(process.env.SCRAPER_DESC_REQUEST_DELAY) || 300;
    const RETRIES = parseInt(process.env.SCRAPER_DESC_RETRIES) || 2;

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    const fetchDescription = async (url, attempt = 1) => {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "pt-BR,pt;q=0.9",
          },
        });

        if (!response.ok) {
          return { success: false, error: `HTTP ${response.status}` };
        }

        const html = await response.text();

        // Padrão 1: objective (descrição curta/objetivo) - MELHOR OPÇÃO
        let match = html.match(/objective\\\":\\\"([^\\]+)/);
        if (match && match[1] && match[1].length >= 30) {
          const desc = match[1]
            .replace(/\\n/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          return { success: true, description: desc };
        }

        // Padrão 2: description longa do curso
        match = html.match(
          /\\\"description\\\":\\\"\\s*((?:A Pós-Graduação|O curso|Este curso|O programa|A especialização|No curso)[^\\]+)/,
        );
        if (match && match[1] && match[1].length >= 50) {
          const desc = match[1]
            .replace(/\\n/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          return { success: true, description: desc };
        }

        // Padrão 3: qualquer description longa
        match = html.match(/\\\"description\\\":\\\"\\s*([^\\]{50,})/);
        if (match && match[1]) {
          const desc = match[1]
            .replace(/\\n/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (
            desc.length >= 50 &&
            !desc.includes("Pós-Graduação EAD é no Centro")
          ) {
            return { success: true, description: desc };
          }
        }

        // Retry se não encontrou
        if (attempt < RETRIES) {
          await sleep(1000);
          return fetchDescription(url, attempt + 1);
        }

        return { success: false, error: "Descrição não encontrada" };
      } catch (error) {
        if (attempt < RETRIES) {
          await sleep(1000);
          return fetchDescription(url, attempt + 1);
        }
        return { success: false, error: error.message };
      }
    };

    let success = 0;
    let failed = 0;
    const totalBatches = Math.ceil(this.courses.length / BATCH_SIZE);

    for (let i = 0; i < this.courses.length; i += BATCH_SIZE) {
      const batch = this.courses.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      this.emitLog(
        "info",
        `📝 Buscando descrições: batch ${batchNum}/${totalBatches}`,
      );

      for (const course of batch) {
        if (!course.url) {
          failed++;
          continue;
        }

        // Tentar corrigir URLs com categoria incorreta
        let urlToFetch = course.url;

        // Verificar se é URL com categoria diferente do esperado
        const urlObj = new URL(urlToFetch);
        const pathParts = urlObj.pathname.split("/").filter(Boolean);

        // URLs podem ter categoria errada - tentar buscar mesmo assim
        const result = await fetchDescription(urlToFetch);

        if (result.success) {
          course.description = result.description;
          course.descriptionSource = "site_original";
          course.descriptionFetchedAt = new Date().toISOString();
          course.descriptionGenerated = false;
          success++;
        } else {
          // Se falhou, tentar com outras categorias conhecidas
          const categorySlugMap = {
            "ciencias-da-saude": "ciencias-da-saude",
            educacao: "educacao",
            "empresarial-ti-e-negocios": "empresarial-ti-e-negocios",
            engenharias: "engenharias",
            estetica: "estetica",
            gastronomia: "gastronomia",
            juridica: "juridica",
            "mba-executivo": "mba-executivo",
            "meio-ambiente": "meio-ambiente",
            psicologia: "psicologia",
            "servico-social": "servico-social",
            undefined: "undefined", // Algumas URLs usam undefined
          };

          let foundInAltCategory = false;
          const slug = pathParts[pathParts.length - 1]; // último segmento é o slug do curso

          for (const altCategory of Object.values(categorySlugMap)) {
            if (foundInAltCategory) break;

            const altUrl = `https://faculdadeunica.com.br/pos-graduacao/${altCategory}/${slug}`;
            if (altUrl === urlToFetch) continue;

            const altResult = await fetchDescription(altUrl);
            if (altResult.success) {
              course.url = altUrl; // Atualizar URL correta
              course.description = altResult.description;
              course.descriptionSource = "site_original";
              course.descriptionFetchedAt = new Date().toISOString();
              course.descriptionGenerated = false;
              foundInAltCategory = true;
              success++;
              Logger.info(
                `Descrição encontrada em categoria alternativa: ${course.title} -> ${altCategory}`,
              );
            }

            await sleep(DELAY_BETWEEN_REQUESTS);
          }

          if (!foundInAltCategory) {
            course.descriptionSource = "not_found";
            course.descriptionError = result.error;
            failed++;
            Logger.warn(`Descrição não encontrada: ${course.title}`);
          }
        }

        await sleep(DELAY_BETWEEN_REQUESTS);
      }

      if (i + BATCH_SIZE < this.courses.length) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    const total = success + failed;
    const rate = total > 0 ? ((success / total) * 100).toFixed(1) : 0;

    this.emitLog(
      "info",
      `📊 Descrições: ${success} ✅ | ${failed} ❌ | Taxa: ${rate}%`,
    );
    Logger.info(
      `fetchAllDescriptions: ${success}/${total} descrições obtidas (${rate}%)`,
    );

    return { success, failed, rate };
  }
}
module.exports = ScraperService;
