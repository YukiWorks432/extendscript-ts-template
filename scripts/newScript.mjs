// スクリプトを新規追加する用のスクリプト
// Usage:
//   対話モード: pnpm new
//   CLI モード:  pnpm new -- --app=aeft --name=MyScript --license
// es.config.mjsに新しいスクリプトを追加し、src/{app}/{name}配下にテンプレートを作成します。
// 新しいスクリプトはes.config.mjsのscripts.{app}配列の先頭に追加されます。
// es.config.mjsはprettierで整形されます。

import { createInterface } from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { parseArgs } from "node:util";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const ES_CONFIG_PATH = path.resolve(projectRoot, "es.config.mjs");
const SRC_DIR = path.resolve(projectRoot, "src");

const RESERVED_NAMES = ["lib", "types", "tests"];

class CliError extends Error {
  constructor(message) {
    super(message);
    this.name = "CliError";
  }
}

// ---- i18n helpers ----
function detectLocale() {
  const env = process.env;
  const lang = String(
    env.LC_ALL || env.LC_MESSAGES || env.LANG || ""
  ).toLowerCase();
  if (lang.startsWith("ja")) return "ja";
  try {
    const sys = Intl.DateTimeFormat().resolvedOptions().locale;
    if (sys && String(sys).toLowerCase().startsWith("ja")) return "ja";
  } catch {}
  return "en";
}

const I18N = {
  ja: {
    prompt: {
      selectApp: (apps) =>
        `対象アプリを選択してください (${apps.join(", ")}): `,
      enterName: "スクリプト名を入力してください: ",
      includeLicense: "ライセンス表記を含めますか？ (y/N): ",
    },
    error: {
      emptyName: "エラー: スクリプト名が空です。",
      emptyApp: "エラー: アプリが指定されていません。",
      invalidApp: (app, apps) =>
        `エラー: 無効なアプリ名です: ${app} (有効: ${apps.join(", ")})`,
      reservedName: (name) =>
        `エラー: "${name}" は予約名のため使用できません。`,
      scriptsNotFound:
        "エラー: es.config.mjs の scripts を特定できませんでした。",
      nameExists: (name, app) =>
        `エラー: ${app} に既に存在するスクリプト名です: ${name}`,
      unexpected: "予期せぬエラーが発生しました:",
      configReadFailed:
        "エラー: es.config.mjs の読み込みに失敗しました。ファイルの構文を確認してください。",
    },
    doneAdd: (name, app, withLicense) =>
      `追加完了: es.config.mjs の scripts.${app} に "${name}" を追記しました${withLicense ? "（license: true）" : ""}。`,
    doneMake: (name, app) =>
      `スクリプトディレクトリと index.ts テンプレートを作成しました: src/${app}/${name}/index.ts`,
  },
  en: {
    prompt: {
      selectApp: (apps) => `Select target app (${apps.join(", ")}): `,
      enterName: "Please enter the script name: ",
      includeLicense: "Include a license field? (y/N): ",
    },
    error: {
      emptyName: "Error: Script name is empty.",
      emptyApp: "Error: No app specified.",
      invalidApp: (app, apps) =>
        `Error: Invalid app name: ${app} (valid: ${apps.join(", ")})`,
      reservedName: (name) =>
        `Error: "${name}" is a reserved name and cannot be used.`,
      scriptsNotFound: "Error: Could not locate scripts in es.config.mjs.",
      nameExists: (name, app) =>
        `Error: Script name already exists in ${app}: ${name}`,
      unexpected: "An unexpected error occurred:",
      configReadFailed:
        "Error: Failed to load es.config.mjs. Please verify the file syntax.",
    },
    doneAdd: (name, app, withLicense) =>
      `Addition complete: Appended "${name}" to scripts.${app} in es.config.mjs${withLicense ? " (license: true)" : ""}.`,
    doneMake: (name, app) =>
      `Created script directory and index.ts template: src/${app}/${name}/index.ts`,
  },
};

const LOCALE = detectLocale();
const L = I18N[LOCALE] || I18N.en;

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

function toBoolean(input) {
  const v = String(input).trim().toLowerCase();
  return v === "y" || v === "yes" || v === "true" || v === "1";
}

async function loadConfig() {
  try {
    const fileUrl = pathToFileURL(ES_CONFIG_PATH).href;
    const cacheBuster = `?update=${Date.now()}`;
    const module = await import(fileUrl + cacheBuster);
    if (!module || !module.default) {
      throw new CliError(L.error.configReadFailed);
    }
    const config = module.default;
    if (!config || !config.scripts || typeof config.scripts !== "object") {
      throw new CliError(L.error.scriptsNotFound);
    }
    return config;
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(
      L.error.configReadFailed + (error?.message ? `\n${error.message}` : "")
    );
  }
}

function getAppIds(config) {
  return Object.keys(config.scripts);
}

function validateApp(appId, config) {
  const apps = getAppIds(config);
  if (!appId) throw new CliError(L.error.emptyApp);
  if (!apps.includes(appId)) {
    throw new CliError(L.error.invalidApp(appId, apps));
  }
}

function validateName(name, appId, config) {
  if (!name) throw new CliError(L.error.emptyName);
  if (RESERVED_NAMES.includes(name.toLowerCase())) {
    throw new CliError(L.error.reservedName(name));
  }
  const scripts = config.scripts[appId] || [];
  const exists = scripts.some((s) => s && s.name === name);
  if (exists) throw new CliError(L.error.nameExists(name, appId));
}

async function getScriptDescriptor(rl, config) {
  const apps = getAppIds(config);
  const appId = String(await ask(rl, L.prompt.selectApp(apps))).trim();
  validateApp(appId, config);

  const name = String(await ask(rl, L.prompt.enterName)).trim();
  validateName(name, appId, config);

  const withLicense = toBoolean(await ask(rl, L.prompt.includeLicense));

  return {
    appId,
    script: {
      name,
      version: "0.0.1",
      build: true,
      license: withLicense,
    },
  };
}

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function updateScriptConfig(appId, newScript) {
  const esConfigContent = await readFile(ES_CONFIG_PATH, { encoding: "utf8" });

  // scripts.{appId} の配列先頭に newScript を追加する
  // appId の配列部分を検索して先頭に挿入
  const escaped = escapeRegExp(appId);
  const pattern = new RegExp(`(${escaped}\\s*:\\s*\\[)(\\s*)`, "m");
  if (!pattern.test(esConfigContent)) {
    throw new CliError(L.error.scriptsNotFound);
  }
  const newConfig = esConfigContent.replace(pattern, (_, p1, p2) => {
    return p1 + p2 + JSON.stringify(newScript, null, 2) + "," + p2;
  });
  await writeFile(ES_CONFIG_PATH, newConfig, { encoding: "utf8" });
}

const createIndexTsTemplate = (name) =>
  `/** @description Explain script */

import "../../init";
import { entry } from "../lib/lib";

entry("${name}", () => {
  // TODO: Implement ${name}
});
`;

async function createScriptTemplate(appId, name) {
  const scriptDir = path.resolve(SRC_DIR, appId, name);
  const indexPath = path.resolve(scriptDir, "index.ts");
  await mkdir(scriptDir, { recursive: true });
  const indexContent = createIndexTsTemplate(name);
  try {
    await writeFile(indexPath, indexContent, {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error) {
    if (!(error && error.code === "EEXIST")) throw error;
  }
}

function parseCliArgs() {
  try {
    const { values } = parseArgs({
      args: process.argv.slice(2).filter((a) => a !== "--"),
      options: {
        app: { type: "string" },
        name: { type: "string" },
        license: { type: "boolean", default: false },
      },
      strict: true,
    });
    if (values.name && values.app) {
      return {
        appId: values.app.trim(),
        script: {
          name: values.name.trim(),
          version: "0.0.1",
          build: true,
          license: !!values.license,
        },
      };
    }
  } catch {
    // 不正な引数の場合は対話モードにフォールバック
  }
  return null;
}

async function main() {
  const cliDescriptor = parseCliArgs();

  if (cliDescriptor) {
    // CLI モード
    const { appId, script } = cliDescriptor;
    try {
      const config = await loadConfig();
      validateApp(appId, config);
      validateName(script.name, appId, config);

      await updateScriptConfig(appId, script);
      console.log(L.doneAdd(script.name, appId, script.license));

      await createScriptTemplate(appId, script.name);
      console.log(L.doneMake(script.name, appId));
      execSync(`prettier --write "${ES_CONFIG_PATH}"`, { stdio: "inherit" });
    } catch (err) {
      process.exitCode = 1;
      if (err instanceof CliError) {
        console.error(err.message);
      } else {
        console.error(L.error.unexpected, err);
      }
    }
    return;
  }

  // 対話モード
  const rl = createInterface({ input, output });
  try {
    const config = await loadConfig();
    const { appId, script } = await getScriptDescriptor(rl, config);

    await updateScriptConfig(appId, script);
    console.log(L.doneAdd(script.name, appId, script.license));

    await createScriptTemplate(appId, script.name);
    console.log(L.doneMake(script.name, appId));
    execSync(`prettier --write "${ES_CONFIG_PATH}"`, { stdio: "inherit" });
  } catch (err) {
    process.exitCode = 1;
    if (err instanceof CliError) {
      console.error(err.message);
    } else {
      console.error(L.error.unexpected, err);
    }
  } finally {
    rl.close();
  }
}

main();
