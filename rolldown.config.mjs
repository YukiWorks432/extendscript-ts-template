import { defineConfig } from "rolldown";
import terser from "@rollup/plugin-terser";
import babel, { getBabelOutputPlugin } from "@rollup/plugin-babel";
import license from "rollup-plugin-license";

import fs from "fs";
import crypto from "crypto";
import process from "process";
import path from "path";

import config from "./es.config.mjs";

// ファイルのハッシュを計算する関数
const calculateFileHash = (filePath) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash("sha256");
    hashSum.update(fileBuffer);
    return hashSum.digest("hex");
  } catch (error) {
    console.error(`ファイルのハッシュ計算に失敗: ${filePath}`, error);
    return "unknown";
  }
};

const BUILD_HASH_DIR = "dist/temp";
const BUILD_HASH_FILE = `${BUILD_HASH_DIR}/build-hashes.json`;

const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const hashText = (text) => {
  const hashSum = crypto.createHash("sha256");
  hashSum.update(text);
  return hashSum.digest("hex");
};

const collectTypeScriptFiles = (targetDir) => {
  if (!fs.existsSync(targetDir)) {
    return [];
  }

  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  const files = [];

  entries.forEach((entry) => {
    const fullPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTypeScriptFiles(fullPath));
      return;
    }

    if (/\.ts$/i.test(entry.name)) {
      files.push(fullPath);
    }
  });

  return files.sort((left, right) => left.localeCompare(right));
};

const calculateScriptHash = (scriptDir) => {
  const files = collectTypeScriptFiles(scriptDir);

  if (files.length === 0) {
    return hashText("empty");
  }

  const merged = files
    .map((filePath) => {
      const relativePath = path
        .relative(scriptDir, filePath)
        .replace(/\\/g, "/");
      return `${relativePath}:${calculateFileHash(filePath)}`;
    })
    .join("|");

  return hashText(merged);
};

const loadBuildHashes = () => {
  try {
    if (!fs.existsSync(BUILD_HASH_FILE)) {
      return {};
    }

    const content = fs.readFileSync(BUILD_HASH_FILE, "utf8");
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn(
      "ハッシュ履歴の読み込みに失敗したため、全件ビルドします。",
      error
    );
    return {};
  }
};

const saveBuildHashes = (hashes) => {
  ensureDirectory(BUILD_HASH_DIR);
  fs.writeFileSync(BUILD_HASH_FILE, JSON.stringify(hashes, null, 2), "utf8");
};

const isTruthyFlag = (value) =>
  value !== undefined && value !== "" && value !== "false" && value !== "0";

const hasForceBuildFlag = () => {
  return isTruthyFlag(process.env.BUILD_ALL);
};

const getAppFilter = () => {
  return process.env.APP || null;
};

const extensions = [".ts"];

const terserConfig = (preamble) =>
  terser({
    compress: {
      ie8: true,
      conditionals: false,
      passes: 1,
    },
    format: {
      comments: /(@preserve|@description)/,
      preamble,
    },
  });

const extractCommentsToTop = () => ({
  name: "extract-comments-to-top",
  renderChunk(code) {
    const comments = [];
    const stripped = code.replace(/\/\*[\s\S]*?\*\//g, (match) => {
      comments.push(match);
      return "";
    });
    if (comments.length === 0) return null;
    return comments.join("\n") + "\n" + stripped;
  },
});

const licenser = (srcDir) => {
  const licenseDir = fs.existsSync(`${srcDir}/LICENSE`)
    ? `${srcDir}/LICENSE`
    : "LICENSE";
  return license({
    banner: {
      content: {
        file: licenseDir,
      },
    },
  });
};

const createBabelConfig = () =>
  babel({
    extensions,
    babelrc: false,
    babelHelpers: "bundled",
    presets: [
      "@babel/preset-typescript",
      [
        "@babel/preset-env",
        {
          loose: true,
          modules: false,
          targets: {
            ie: "8",
          },
        },
      ],
    ],
    plugins: [
      ["@babel/plugin-transform-class-properties", { loose: true }],
      ["@babel/plugin-transform-classes", { loose: true }],
      ["@babel/plugin-transform-property-mutators", { loose: true }],
      ["@babel/plugin-transform-shorthand-properties", { loose: true }],
      ["@babel/plugin-transform-reserved-words", { loose: true }],
    ],
  });

const createOutputBabelConfig = () =>
  getBabelOutputPlugin({
    presets: [
      [
        "@babel/preset-env",
        {
          loose: true,
          modules: false,
          targets: {
            ie: "8",
          },
        },
      ],
    ],
  });

let hasSavedBuildHashes = false;

const persistBuildHashes = (hashes) => ({
  name: "persist-build-hashes",
  closeBundle() {
    if (hasSavedBuildHashes) {
      return;
    }

    saveBuildHashes(hashes);
    hasSavedBuildHashes = true;
  },
});

export default defineConfig((commandLineArgs) => {
  const forceBuildAll = hasForceBuildFlag();
  const appFilter = getAppFilter();

  // アプリ別スクリプトを展開: { appId, script, srcDir, outDir }
  const allScripts = [];

  if (config.scripts) {
    for (const [appId, scripts] of Object.entries(config.scripts)) {
      if (appFilter && appId !== appFilter) continue;
      for (const script of scripts) {
        allScripts.push({
          appId,
          script,
          srcDir: `src/${appId}/${script.name}`,
          outDir: `dist/${appId}/${script.name}`,
          hashKey: `${appId}/${script.name}`,
          tsconfig: `src/${appId}/tsconfig.json`,
        });
      }
    }
  }

  // common スクリプト（アプリ非依存）
  if (config.common && !appFilter) {
    for (const script of config.common) {
      allScripts.push({
        appId: null,
        script,
        srcDir: `src/${script.name}`,
        outDir: `dist/${script.name}`,
        hashKey: script.name,
        tsconfig: "tsconfig.json",
      });
    }
  }

  if (allScripts.length === 0) {
    console.error("ビルドするスクリプトがありません。");
    process.exit(1);
  }

  const previousBuildHashes = loadBuildHashes();
  const currentBuildHashes = {};

  const targetScripts = allScripts.filter(({ script, srcDir, hashKey }) => {
    const scriptHash = calculateScriptHash(srcDir);
    currentBuildHashes[hashKey] = scriptHash;

    if (forceBuildAll) {
      return true;
    }

    return previousBuildHashes[hashKey] !== scriptHash;
  });

  const entries = targetScripts.map(
    ({ script, srcDir, outDir, hashKey, tsconfig }) => {
      const inputFile = `${srcDir}/index.ts`;
      const fileHash =
        currentBuildHashes[hashKey] || calculateFileHash(inputFile);

      const banner = `/** ${script.name} v${script.version} hash: ${fileHash} */\nvar __ES_THIS__=this;`;

      return {
        input: inputFile,
        output: {
          file: `${outDir}/${script.name}.jsx`,
          format: "esm",
          banner,
        },
        context: "this",
        tsconfig,
        onLog(level, log) {
          if (log.code === "EVAL") return;
          console.warn(log.message);
        },
        plugins: [
          createBabelConfig(),
          createOutputBabelConfig(),
          extractCommentsToTop(),
          terserConfig(banner),
          script.license ? licenser(srcDir) : null,
          persistBuildHashes(currentBuildHashes),
        ],
      };
    }
  );

  if (entries.length === 0) {
    saveBuildHashes(currentBuildHashes);
    console.log("変更されたスクリプトがないため、ビルドをスキップしました。");
    process.exit(0);
  }

  const filterMsg = appFilter ? ` (app: ${appFilter})` : "";
  console.log(
    forceBuildAll
      ? `--all/-a 指定により ${entries.length} 件を強制ビルドします。${filterMsg}`
      : `${entries.length} 件の変更スクリプトをビルドします。${filterMsg}`
  );

  return entries;
});
