// アプリのスキャフォールディングを行うスクリプト
// Usage:
//   pnpm add-app -- --app=idsn
// es.config.mjsにアプリキーを追加し、src/{app}/配下にテンプレートを作成します。

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
    shared: ["shared/PlugPlugExternalObject", "shared/XMPScript"],
  },
  ilst: {
    dir: "Illustrator/2022",
    shared: ["shared/PlugPlugExternalObject"],
  },
  phxs: {
    dir: "Photoshop/2015.5",
    shared: ["shared/PlugPlugExternalObject"],
  },
  idsn: {
    dir: "InDesign/2022",
    shared: ["shared/PlugPlugExternalObject"],
  },
  ppro: {
    dir: "Premiere/24.0",
    shared: ["shared/PlugPlugExternalObject"],
  },
  anmt: {
    dir: "Animate/22.0",
    shared: ["shared/PlugPlugExternalObject"],
  },
  audt: {
    dir: "Audition/2018",
    shared: ["shared/PlugPlugExternalObject"],
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

const msg =
  LOCALE === "ja"
    ? {
        noApp: "エラー: --app を指定してください。",
        exists: (app) => `エラー: ${app} は既に存在します。`,
        unknownType: (app) =>
          `警告: ${app} の types-for-adobe マッピングが不明です。tsconfig.json を手動で設定してください。`,
        done: (app) =>
          `完了: src/${app}/ のスキャフォールディングが完了しました。`,
        configUpdated: (app) =>
          `es.config.mjs に scripts.${app} を追加しました。`,
      }
    : {
        noApp: "Error: --app is required.",
        exists: (app) => `Error: ${app} already exists.`,
        unknownType: (app) =>
          `Warning: Unknown types-for-adobe mapping for ${app}. Please configure tsconfig.json manually.`,
        done: (app) => `Done: Scaffolding for src/${app}/ complete.`,
        configUpdated: (app) => `Added scripts.${app} to es.config.mjs.`,
      };

function parseCliArgs() {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((a) => a !== "--"),
    options: {
      app: { type: "string" },
    },
    strict: true,
  });
  return values.app?.trim() || null;
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
    console.warn(msg.unknownType(appId));
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

async function main() {
  const appId = parseCliArgs();
  if (!appId) {
    console.error(msg.noApp);
    process.exitCode = 1;
    return;
  }

  try {
    const config = await loadConfig();
    if (config.scripts && config.scripts[appId]) {
      console.error(msg.exists(appId));
      process.exitCode = 1;
      return;
    }

    const appDir = path.resolve(SRC_DIR, appId);

    // tsconfig.json
    const tsconfigContent = generateTsconfig(appId);
    await mkdir(appDir, { recursive: true });
    await writeFile(
      path.resolve(appDir, "tsconfig.json"),
      tsconfigContent + "\n",
      {
        encoding: "utf8",
      }
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
    await writeFile(path.resolve(libDir, ".gitkeep"), "", {
      encoding: "utf8",
    });

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
    console.log(msg.configUpdated(appId));
    console.log(msg.done(appId));
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

main();
