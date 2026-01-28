#!/usr/bin/env node

/**
 * Script de limpeza de logs e arquivos antigos
 * Mantém apenas os N mais recentes de cada tipo
 *
 * Uso:
 *   node src/scripts/cleanup.js [--dry-run]
 *   npm run cleanup
 *   npm run cleanup:dry  # Preview sem apagar
 */

const fs = require("fs").promises;
const path = require("path");

// Configurações
const CONFIG = {
  // Número máximo de arquivos a manter por tipo
  maxBackups: parseInt(process.env.CLEANUP_MAX_BACKUPS, 10) || 10,
  maxHistoryFiles: parseInt(process.env.CLEANUP_MAX_HISTORY, 10) || 30,
  maxReportFiles: parseInt(process.env.CLEANUP_MAX_REPORTS, 10) || 30,
  maxLogFiles: parseInt(process.env.CLEANUP_MAX_LOGS, 10) || 30,
  maxArtifacts: parseInt(process.env.CLEANUP_MAX_ARTIFACTS, 10) || 20,

  // Diretórios (relativos ao backend)
  dirs: {
    backups: path.join(__dirname, "../../backups"),
    history: path.join(__dirname, "../../scraping-history"),
    reports: path.join(__dirname, "../../scraping-reports"),
    logs: path.join(__dirname, "../../logs"),
    artifacts: path.join(__dirname, "../../logs/scraper-artifacts"),
  },
};

// Cores para terminal
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

// Flags
const isDryRun = process.argv.includes("--dry-run");
const isVerbose =
  process.argv.includes("--verbose") || process.argv.includes("-v");

/**
 * Log formatado
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Lista arquivos de um diretório ordenados por data de modificação (mais novos primeiro)
 */
async function listFilesSortedByDate(dirPath, pattern = null) {
  try {
    const files = await fs.readdir(dirPath);
    const fileStats = await Promise.all(
      files
        .filter(f => !pattern || pattern.test(f))
        .map(async file => {
          try {
            const stat = await fs.stat(path.join(dirPath, file));
            return { file, mtime: stat.mtime };
          } catch {
            return null;
          }
        }),
    );

    return fileStats
      .filter(Boolean)
      .sort((a, b) => b.mtime - a.mtime)
      .map(f => f.file);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Remove arquivos além do limite
 */
async function cleanupDirectory(name, dirPath, maxFiles, pattern = null) {
  log(`\n${colors.bold}📁 ${name}${colors.reset}`);
  log(`   Diretório: ${dirPath}`);
  log(`   Máximo: ${maxFiles} arquivos`);

  const files = await listFilesSortedByDate(dirPath, pattern);

  if (files.length === 0) {
    log(`   ${colors.yellow}Nenhum arquivo encontrado${colors.reset}`);
    return { kept: 0, removed: 0, freedBytes: 0 };
  }

  const toKeep = files.slice(0, maxFiles);
  const toRemove = files.slice(maxFiles);

  log(`   Encontrados: ${files.length} arquivos`);
  log(`   ${colors.green}Mantendo: ${toKeep.length}${colors.reset}`);
  log(`   ${colors.red}Removendo: ${toRemove.length}${colors.reset}`);

  let freedBytes = 0;

  for (const file of toRemove) {
    const filePath = path.join(dirPath, file);
    try {
      const stat = await fs.stat(filePath);
      freedBytes += stat.size;

      if (isDryRun) {
        if (isVerbose) {
          log(`   ${colors.yellow}[DRY-RUN] Removeria: ${file}${colors.reset}`);
        }
      } else {
        await fs.unlink(filePath);
        if (isVerbose) {
          log(`   ${colors.red}Removido: ${file}${colors.reset}`);
        }
      }
    } catch (error) {
      log(
        `   ${colors.red}Erro ao remover ${file}: ${error.message}${colors.reset}`,
      );
    }
  }

  return { kept: toKeep.length, removed: toRemove.length, freedBytes };
}

/**
 * Formata bytes para exibição
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Execução principal
 */
async function main() {
  log(
    `\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════${colors.reset}`,
  );
  log(
    `${colors.bold}${colors.cyan}   🧹 LIMPEZA DE ARQUIVOS ANTIGOS${colors.reset}`,
  );
  log(
    `${colors.bold}${colors.cyan}═══════════════════════════════════════════════${colors.reset}`,
  );

  if (isDryRun) {
    log(
      `\n${colors.yellow}⚠️  MODO DRY-RUN: Nenhum arquivo será removido${colors.reset}`,
    );
  }

  const stats = {
    totalKept: 0,
    totalRemoved: 0,
    totalFreed: 0,
  };

  // Backups
  const backups = await cleanupDirectory(
    "Backups",
    CONFIG.dirs.backups,
    CONFIG.maxBackups,
    /^backup-\d+\.json$/,
  );
  stats.totalKept += backups.kept;
  stats.totalRemoved += backups.removed;
  stats.totalFreed += backups.freedBytes;

  // Histórico de scraping
  const history = await cleanupDirectory(
    "Histórico de Scraping",
    CONFIG.dirs.history,
    CONFIG.maxHistoryFiles,
    /^courses-.*\.json$/,
  );
  stats.totalKept += history.kept;
  stats.totalRemoved += history.removed;
  stats.totalFreed += history.freedBytes;

  // Relatórios
  const reports = await cleanupDirectory(
    "Relatórios",
    CONFIG.dirs.reports,
    CONFIG.maxReportFiles,
    /^report-.*\.json$/,
  );
  stats.totalKept += reports.kept;
  stats.totalRemoved += reports.removed;
  stats.totalFreed += reports.freedBytes;

  // Logs antigos
  const logs = await cleanupDirectory(
    "Logs",
    CONFIG.dirs.logs,
    CONFIG.maxLogFiles,
    /\.log$/,
  );
  stats.totalKept += logs.kept;
  stats.totalRemoved += logs.removed;
  stats.totalFreed += logs.freedBytes;

  // Artefatos de debug
  const artifacts = await cleanupDirectory(
    "Artefatos de Debug",
    CONFIG.dirs.artifacts,
    CONFIG.maxArtifacts,
    /\.(png|html)$/,
  );
  stats.totalKept += artifacts.kept;
  stats.totalRemoved += artifacts.removed;
  stats.totalFreed += artifacts.freedBytes;

  // Resumo
  log(
    `\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════${colors.reset}`,
  );
  log(`${colors.bold}   📊 RESUMO${colors.reset}`);
  log(
    `${colors.bold}${colors.cyan}═══════════════════════════════════════════════${colors.reset}`,
  );
  log(`   Arquivos mantidos: ${colors.green}${stats.totalKept}${colors.reset}`);
  log(
    `   Arquivos removidos: ${colors.red}${stats.totalRemoved}${colors.reset}`,
  );
  log(
    `   Espaço liberado: ${colors.cyan}${formatBytes(stats.totalFreed)}${colors.reset}`,
  );

  if (isDryRun && stats.totalRemoved > 0) {
    log(
      `\n${colors.yellow}💡 Execute sem --dry-run para remover os arquivos${colors.reset}`,
    );
  }

  log("");
}

// Executar
main().catch(error => {
  console.error(`${colors.red}Erro fatal:${colors.reset}`, error);
  process.exit(1);
});
