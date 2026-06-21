// アプリのスキャフォールディングを行うスクリプト
// Usage:
//   対話モード: pnpm add-app
//   CLI モード:  pnpm add-app -- --app=idsn
// es.config.mjsにアプリキーを追加し、src/{app}/配下にテンプレートを作成します。

import { createInterface } from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { parseArgs } from "node:util";
import { constants } from "node:fs";
import { access, readFile, writeFile, mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const ES_CONFIG_PATH = path.resolve(projectRoot, "es.config.mjs");
const PACKAGE_JSON_PATH = path.resolve(projectRoot, "package.json");
const SRC_DIR = path.resolve(projectRoot, "src");
const EXAMPLE_SCRIPT = {
  name: "example",
  version: "0.0.1",
  build: true,
  license: true,
};

// types-for-adobe のアプリID → ディレクトリ名マッピング
const APP_TYPES_MAP = {
  aeft: {
    dir: "AfterEffects/22.0",
    shared: ["shared/ScriptUI", "shared/XMPScript"],
  },
  ilst: {
    dir: "Illustrator/2022",
    shared: ["shared/ScriptUI"],
  },
  phxs: {
    dir: "Photoshop/2015.5",
    shared: ["shared/ScriptUI"],
  },
  idsn: {
    dir: "InDesign/2022",
    shared: ["shared/ScriptUI"],
  },
  ppro: {
    dir: "Premiere/24.0",
    shared: ["shared/ScriptUI"],
  },
  anmt: {
    dir: "Animate/22.0",
    shared: ["shared/ScriptUI"],
  },
  audt: {
    dir: "Audition/2018",
    shared: ["shared/ScriptUI"],
  },
};

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

const LOCALE = detectLocale();

const I18N = {
  ja: {
    prompt: {
      selectApp: (known) =>
        `追加するアプリを番号で選択してください (${known.join(", ")}): `,
    },
    error: {
      emptyApp: "エラー: アプリIDを入力してください。",
      invalidArgs:
        "エラー: 引数が不正です。pnpm add-app -- --app=<appId> を使用してください。",
      invalidSelection: (value, count) =>
        `エラー: ${value} は無効な選択です。1 から ${count} の番号を入力してください。`,
      unsupportedApp: (app, known) =>
        `エラー: 未対応のアプリIDです: ${app} (対応: ${known.join(", ")})`,
      srcExists: (app) => `エラー: src/${app} は既に存在します。`,
      configExists: (app) =>
        `エラー: es.config.mjs に scripts.${app} が既に存在します。`,
      scriptsNotFound:
        "エラー: es.config.mjs の scripts を特定できませんでした。",
      configReadFailed:
        "エラー: es.config.mjs の読み込みに失敗しました。ファイルの構文を確認してください。",
      unexpected: "予期せぬエラーが発生しました:",
    },
    done: (app) => `完了: src/${app}/ のスキャフォールディングが完了しました。`,
    configUpdated: (app) => `es.config.mjs に scripts.${app} を追加しました。`,
    packageScriptUpdated: (app) =>
      `package.json に build:${app} を追加しました。`,
  },
  en: {
    prompt: {
      selectApp: (known) =>
        `Select the app to add by number (${known.join(", ")}): `,
    },
    error: {
      emptyApp: "Error: Please enter an app ID.",
      invalidArgs:
        "Error: Invalid arguments. Use pnpm add-app -- --app=<appId>.",
      invalidSelection: (value, count) =>
        `Error: ${value} is not a valid selection. Enter a number from 1 to ${count}.`,
      unsupportedApp: (app, known) =>
        `Error: Unsupported app ID: ${app} (supported: ${known.join(", ")})`,
      srcExists: (app) => `Error: src/${app} already exists.`,
      configExists: (app) =>
        `Error: scripts.${app} already exists in es.config.mjs.`,
      scriptsNotFound: "Error: Could not locate scripts in es.config.mjs.",
      configReadFailed:
        "Error: Failed to load es.config.mjs. Please verify the file syntax.",
      unexpected: "An unexpected error occurred:",
    },
    done: (app) => `Done: Scaffolding for src/${app}/ complete.`,
    configUpdated: (app) => `Added scripts.${app} to es.config.mjs.`,
    packageScriptUpdated: (app) => `Added build:${app} to package.json.`,
  },
};

const L = I18N[LOCALE] || I18N.en;

class CliError extends Error {
  constructor(message) {
    super(message);
    this.name = "CliError";
  }
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function parseCliArgs() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  if (args.length === 0) return null;

  try {
    const { values } = parseArgs({
      args,
      options: {
        app: { type: "string" },
      },
      strict: true,
    });
    const appId = values.app?.trim() || "";
    if (!appId) throw new CliError(L.error.emptyApp);
    return appId;
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(L.error.invalidArgs);
  }
}

async function loadConfig() {
  try {
    const fileUrl = pathToFileURL(ES_CONFIG_PATH).href;
    const cacheBuster = `?update=${Date.now()}`;
    const module = await import(fileUrl + cacheBuster);
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

function generateTsconfig(appId) {
  const mapping = APP_TYPES_MAP[appId];
  const types = [
    `../../node_modules/types-for-adobe/${mapping.dir}`,
    ...mapping.shared.map((s) => `../../node_modules/types-for-adobe/${s}`),
  ];

  return JSON.stringify(
    {
      extends: "../../tsconfig.json",
      compilerOptions: { types },
      include: ["./**/*", "../lib/**/*", "../types/**/*", "../init.ts"],
    },
    null,
    2
  );
}

function findScriptsBlockEnd(content) {
  // scripts: { ... } ブロックの閉じ } を正確に特定するため、ブレースの深度を追跡
  const scriptsStart = content.search(/scripts\s*:\s*\{/);
  if (scriptsStart === -1) {
    throw new CliError(L.error.scriptsNotFound);
  }

  // scripts の開き { の位置を特定
  const braceStart = content.indexOf("{", scriptsStart + "scripts".length);
  let depth = 1;
  let braceEnd = -1;
  for (let i = braceStart + 1; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) {
        braceEnd = i;
        break;
      }
    }
  }

  if (braceEnd === -1) {
    throw new CliError(L.error.scriptsNotFound);
  }

  return braceEnd;
}

async function pathExists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function assertKnownApp(appId) {
  const knownApps = Object.keys(APP_TYPES_MAP);
  if (!appId) throw new CliError(L.error.emptyApp);
  if (!Object.prototype.hasOwnProperty.call(APP_TYPES_MAP, appId)) {
    throw new CliError(L.error.unsupportedApp(appId, knownApps));
  }
}

async function validateScaffold(appId) {
  assertKnownApp(appId);

  const appDir = path.resolve(SRC_DIR, appId);
  if (await pathExists(appDir)) {
    throw new CliError(L.error.srcExists(appId));
  }

  const config = await loadConfig();
  if (Object.prototype.hasOwnProperty.call(config.scripts, appId)) {
    throw new CliError(L.error.configExists(appId));
  }

  const esConfigContent = await readFile(ES_CONFIG_PATH, { encoding: "utf8" });
  findScriptsBlockEnd(esConfigContent);

  return { appDir, esConfigContent };
}

async function updateEsConfig(appId, content) {
  const braceEnd = findScriptsBlockEnd(content);

  // 閉じ } の直前に新しいアプリキーを挿入
  const beforeClose = content.slice(0, braceEnd);
  const afterClose = content.slice(braceEnd);
  const newContent = `${beforeClose}  ${appId}: [
    {
      name: "${EXAMPLE_SCRIPT.name}",
      version: "${EXAMPLE_SCRIPT.version}",
      build: ${EXAMPLE_SCRIPT.build},
      license: ${EXAMPLE_SCRIPT.license},
    },
  ],
  ${afterClose}`;
  await writeFile(ES_CONFIG_PATH, newContent, { encoding: "utf8" });
}

function shouldInsertAfterBuildScript(currentKey, nextKey) {
  const isBuildKey = currentKey === "build" || currentKey.startsWith("build:");
  const nextIsBuildKey = nextKey && nextKey.startsWith("build:");
  return isBuildKey && !nextIsBuildKey;
}

function addBuildScriptAlias(scripts, appId) {
  const scriptName = `build:${appId}`;
  if (Object.prototype.hasOwnProperty.call(scripts, scriptName)) {
    return { scripts, added: false };
  }

  const entries = Object.entries(scripts);
  const nextScripts = {};
  let inserted = false;

  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    nextScripts[key] = value;

    const nextKey = entries[i + 1]?.[0] || null;
    if (!inserted && shouldInsertAfterBuildScript(key, nextKey)) {
      nextScripts[scriptName] = `rollup -c --app=${appId}`;
      inserted = true;
    }
  }

  if (!inserted) {
    nextScripts[scriptName] = `rollup -c --app=${appId}`;
  }

  return { scripts: nextScripts, added: true };
}

async function updatePackageScripts(appId) {
  const content = await readFile(PACKAGE_JSON_PATH, { encoding: "utf8" });
  const packageJson = JSON.parse(content);
  const scripts =
    packageJson.scripts && typeof packageJson.scripts === "object"
      ? packageJson.scripts
      : {};
  const result = addBuildScriptAlias(scripts, appId);

  if (!result.added) {
    return false;
  }

  packageJson.scripts = result.scripts;
  await writeFile(
    PACKAGE_JSON_PATH,
    JSON.stringify(packageJson, null, 2) + "\n",
    {
      encoding: "utf8",
    }
  );
  return true;
}

async function scaffold(appId) {
  const { appDir, esConfigContent } = await validateScaffold(appId);

  // tsconfig.json
  const tsconfigContent = generateTsconfig(appId);
  await mkdir(appDir, { recursive: true });
  await writeFile(
    path.resolve(appDir, "tsconfig.json"),
    tsconfigContent + "\n",
    { encoding: "utf8", flag: "wx" }
  );

  // types/index.d.ts
  const typesDir = path.resolve(appDir, "types");
  await mkdir(typesDir, { recursive: true });
  await writeFile(
    path.resolve(typesDir, "index.d.ts"),
    `// Type definitions specific to ${appId}.\n`,
    { encoding: "utf8", flag: "wx" }
  );

  // lib/.gitkeep
  const libDir = path.resolve(appDir, "lib");
  await mkdir(libDir, { recursive: true });
  await writeFile(path.resolve(libDir, ".gitkeep"), "", {
    encoding: "utf8",
    flag: "wx",
  });

  // example/index.ts
  const exampleDir = path.resolve(appDir, "example");
  await mkdir(exampleDir, { recursive: true });
  await writeFile(
    path.resolve(exampleDir, "index.ts"),
    `import "../../init";\nimport { entry } from "../../lib/lib";\n\nentry("example", () => {\n  // TODO: Implement example\n});\n`,
    { encoding: "utf8", flag: "wx" }
  );

  // es.config.mjs 更新
  await updateEsConfig(appId, esConfigContent);
  const packageScriptAdded = await updatePackageScripts(appId);
  execSync(`prettier --write "${ES_CONFIG_PATH}"`, { stdio: "inherit" });
  if (packageScriptAdded) {
    console.log(L.packageScriptUpdated(appId));
  }
  console.log(L.configUpdated(appId));
  console.log(L.done(appId));
}

async function main() {
  let cliAppId;
  try {
    cliAppId = parseCliArgs();
  } catch (err) {
    process.exitCode = 1;
    console.error(err instanceof CliError ? err.message : L.error.unexpected);
    return;
  }

  if (cliAppId) {
    // CLI モード
    try {
      await scaffold(cliAppId);
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
    const knownApps = Object.keys(APP_TYPES_MAP);
    knownApps.forEach((app, index) => {
      console.log(`${index + 1}. ${app}`);
    });
    const selected = String(
      await ask(rl, L.prompt.selectApp(knownApps))
    ).trim();
    const selectedIndex = Number(selected);
    if (
      !Number.isInteger(selectedIndex) ||
      selectedIndex < 1 ||
      selectedIndex > knownApps.length
    ) {
      throw new CliError(L.error.invalidSelection(selected, knownApps.length));
    }
    const appId = knownApps[selectedIndex - 1];
    await scaffold(appId);
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
