// アプリのスキャフォールディングを行うスクリプト
// Usage:
//   対話モード: pnpm add-app
//   CLI モード:  pnpm add-app -- --app=idsn
// es.config.mjsにアプリキーを追加し、src/{app}/配下にテンプレートを作成します。

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

// types-for-adobe のアプリID → ディレクトリ名マッピング
const APP_TYPES_MAP = {
  aeft: {
    dir: "AfterEffects/22.0",
    shared: ["shared/XMPScript"],
  },
  ilst: {
    dir: "Illustrator/2022",
    shared: [],
  },
  phxs: {
    dir: "Photoshop/2015.5",
    shared: [],
  },
  idsn: {
    dir: "InDesign/2022",
    shared: [],
  },
  ppro: {
    dir: "Premiere/24.0",
    shared: [],
  },
  anmt: {
    dir: "Animate/22.0",
    shared: [],
  },
  audt: {
    dir: "Audition/2018",
    shared: [],
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
      enterApp: (known) =>
        `追加するアプリのIDを入力してください (例: ${known.join(", ")}): `,
    },
    error: {
      emptyApp: "エラー: アプリIDを入力してください。",
      exists: (app) => `エラー: ${app} は既に存在します。`,
      unknownType: (app) =>
        `警告: ${app} の types-for-adobe マッピングが不明です。tsconfig.json を手動で設定してください。`,
      unexpected: "予期せぬエラーが発生しました:",
    },
    done: (app) => `完了: src/${app}/ のスキャフォールディングが完了しました。`,
    configUpdated: (app) => `es.config.mjs に scripts.${app} を追加しました。`,
  },
  en: {
    prompt: {
      enterApp: (known) =>
        `Enter the app ID to add (e.g. ${known.join(", ")}): `,
    },
    error: {
      emptyApp: "Error: Please enter an app ID.",
      exists: (app) => `Error: ${app} already exists.`,
      unknownType: (app) =>
        `Warning: Unknown types-for-adobe mapping for ${app}. Please configure tsconfig.json manually.`,
      unexpected: "An unexpected error occurred:",
    },
    done: (app) => `Done: Scaffolding for src/${app}/ complete.`,
    configUpdated: (app) => `Added scripts.${app} to es.config.mjs.`,
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
  try {
    const { values } = parseArgs({
      args: process.argv.slice(2).filter((a) => a !== "--"),
      options: {
        app: { type: "string" },
      },
      strict: true,
    });
    return values.app?.trim() || null;
  } catch {
    return null;
  }
}

async function loadConfig() {
  const fileUrl = pathToFileURL(ES_CONFIG_PATH).href;
  const cacheBuster = `?update=${Date.now()}`;
  const module = await import(fileUrl + cacheBuster);
  return module.default;
}

function generateTsconfig(appId) {
  const mapping = APP_TYPES_MAP[appId];
  if (!mapping) {
    console.warn(L.error.unknownType(appId));
    return JSON.stringify(
      {
        extends: "../../tsconfig.json",
        compilerOptions: {
          types: [],
        },
        include: ["./**/*", "../lib/**/*", "../types/**/*", "../init.ts"],
      },
      null,
      2
    );
  }

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

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function updateEsConfig(appId) {
  const content = await readFile(ES_CONFIG_PATH, { encoding: "utf8" });

  // scripts: { ... } ブロックの閉じ } を正確に特定するため、ブレースの深度を追跡
  const scriptsStart = content.search(/scripts\s*:\s*\{/);
  if (scriptsStart === -1) {
    throw new Error("Could not locate scripts block in es.config.mjs.");
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
    throw new Error("Could not find closing brace of scripts block.");
  }

  // 閉じ } の直前に新しいアプリキーを挿入
  const beforeClose = content.slice(0, braceEnd);
  const afterClose = content.slice(braceEnd);
  const newContent = `${beforeClose}  ${appId}: [],\n  ${afterClose}`;
  await writeFile(ES_CONFIG_PATH, newContent, { encoding: "utf8" });
}

async function scaffold(appId) {
  const config = await loadConfig();
  if (config.scripts && config.scripts[appId]) {
    throw new CliError(L.error.exists(appId));
  }

  const appDir = path.resolve(SRC_DIR, appId);

  // tsconfig.json
  const tsconfigContent = generateTsconfig(appId);
  await mkdir(appDir, { recursive: true });
  await writeFile(
    path.resolve(appDir, "tsconfig.json"),
    tsconfigContent + "\n",
    { encoding: "utf8" }
  );

  // types/index.d.ts
  const typesDir = path.resolve(appDir, "types");
  await mkdir(typesDir, { recursive: true });
  await writeFile(
    path.resolve(typesDir, "index.d.ts"),
    `// Type definitions specific to ${appId}.\n`,
    { encoding: "utf8" }
  );

  // lib/.gitkeep
  const libDir = path.resolve(appDir, "lib");
  await mkdir(libDir, { recursive: true });
  await writeFile(path.resolve(libDir, ".gitkeep"), "", { encoding: "utf8" });

  // example/index.ts
  const exampleDir = path.resolve(appDir, "example");
  await mkdir(exampleDir, { recursive: true });
  await writeFile(
    path.resolve(exampleDir, "index.ts"),
    `import "../../init";\nimport { entry } from "../../lib/lib";\n\nentry("example", () => {\n  // TODO: Implement example\n});\n`,
    { encoding: "utf8" }
  );

  // es.config.mjs 更新
  await updateEsConfig(appId);
  execSync(`prettier --write "${ES_CONFIG_PATH}"`, { stdio: "inherit" });
  console.log(L.configUpdated(appId));
  console.log(L.done(appId));
}

async function main() {
  const cliAppId = parseCliArgs();

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
    const appId = String(await ask(rl, L.prompt.enterApp(knownApps))).trim();
    if (!appId) {
      console.error(L.error.emptyApp);
      process.exitCode = 1;
      return;
    }
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
