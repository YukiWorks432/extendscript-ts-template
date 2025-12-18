// スクリプトを新規追加する用のスクリプト
// Usage: pnpm new (impl: node ./scripts/newScript.mjs&&prettier --write ./es.config.mjs)
// es.config.mjsに新しいスクリプトを追加し、src配下にテンプレートを作成します。
// 新しいスクリプトはes.config.mjsのscripts配列の先頭に追加されます。
// es.config.mjsはprettierで整形されます。

import { createInterface } from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const ES_CONFIG_PATH = path.resolve(projectRoot, "es.config.mjs");
const SRC_DIR = path.resolve(projectRoot, "src");

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
      enterName: "スクリプト名を入力してください: ",
      includeLicense: "ライセンス表記を含めますか？ (y/N): ",
    },
    error: {
      emptyName: "エラー: スクリプト名が空です。",
      scriptsArrayNotFound:
        "エラー: es.config.mjs の scripts 配列を特定できませんでした。",
      nameExists: (name) => `エラー: 既に存在するスクリプト名です: ${name}`,
      boundsRecalcFailed: "エラー: 配列境界の再計算に失敗しました。",
      unexpected: "予期せぬエラーが発生しました:",
      configReadFailed:
        "エラー: es.config.mjs の読み込みに失敗しました。ファイルの構文を確認してください。",
    },
    doneAdd: (name, withLicense) =>
      `追加完了: es.config.mjs に "${name}" を追記しました${withLicense ? "（license: true）" : ""}。`,
    doneMake: (name) =>
      `スクリプトディレクトリと index.ts テンプレートを作成しました: src/${name}/index.ts`,
  },
  en: {
    prompt: {
      enterName: "Please enter the script name: ",
      includeLicense: "Include a license field? (y/N): ",
    },
    error: {
      emptyName: "Error: Script name is empty.",
      scriptsArrayNotFound:
        "Error: Could not locate the scripts array in es.config.mjs.",
      nameExists: (name) => `Error: Script name already exists: ${name}`,
      boundsRecalcFailed: "Error: Failed to recalculate array bounds.",
      unexpected: "An unexpected error occurred:",
      configReadFailed:
        "Error: Failed to load es.config.mjs. Please verify the file syntax.",
    },
    doneAdd: (name, withLicense) =>
      `Addition complete: Appended "${name}" to es.config.mjs${withLicense ? " (license: true)" : ""}.`,
    doneMake: (name) =>
      `Created script directory and index.ts template: src/${name}/index.ts`,
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
    if (!config || !Array.isArray(config.scripts)) {
      throw new CliError(L.error.scriptsArrayNotFound);
    }
    return config;
  } catch (error) {
    throw new CliError(
      L.error.configReadFailed + (error?.message ? `\n${error.message}` : "")
    );
  }
}

async function getScriptDescriptor(rl, scripts) {
  const name = String(await ask(rl, L.prompt.enterName)).trim();
  if (!name) throw new CliError(L.error.emptyName);
  const exists = scripts.some((script) => script && script.name === name);
  if (exists) throw new CliError(L.error.nameExists(name));

  const withLicense = toBoolean(await ask(rl, L.prompt.includeLicense));

  return {
    name,
    version: "0.0.1",
    build: true,
    license: withLicense,
  };
}

async function updateScriptConfig(newScript) {
  if (!newScript) {
    throw new CliError(L.error.emptyName);
  }
  const esConfigContent = await readFile(ES_CONFIG_PATH, { encoding: "utf8" });
  // esConfigContent の scripts 配列の先頭に newScript を追加する
  const newConfig = esConfigContent.replace(
    /(\s*scripts\s*:\s*\[)([\s\S]*?)(\n\s*\])/m,
    (_, p1, p2, p3) => {
      return p1 + JSON.stringify(newScript, null, 2) + ", " + p2 + p3;
    }
  );
  await writeFile(ES_CONFIG_PATH, newConfig, { encoding: "utf8" });
}

const createIndexTsTemplate = (name) =>
  `import "../init";
import { entry } from "../lib/libs";

// jp: スクリプトはこの中に書いてください
// en: Write your script inside this function
entry("${name}", () => {
  // TODO: Implement ${name}
});
`;

async function createScriptTemplate(name) {
  const scriptDir = path.resolve(SRC_DIR, name);
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

async function main() {
  const rl = createInterface({ input, output });
  try {
    const config = await loadConfig();
    const newScript = await getScriptDescriptor(rl, config.scripts);

    await updateScriptConfig(newScript);
    console.log(L.doneAdd(newScript.name, newScript.license));

    await createScriptTemplate(newScript.name);
    console.log(L.doneMake(newScript.name));
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
