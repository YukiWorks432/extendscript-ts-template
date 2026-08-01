import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import license from "rollup-plugin-license";

import fs from "fs";
import crypto from "crypto";
import process from "process";
import path from "path";
import ts from "typescript";

import config from "./es.config.mjs";
import {
  calculateFileHash,
  calculateScriptHash as calculateScriptHashValue,
  selectChangedScripts,
} from "./scripts/buildHash.mjs";

const BUILD_HASH_DIR = "dist/temp";
const BUILD_HASH_FILE = `${BUILD_HASH_DIR}/build-hashes.json`;

const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const hashText = (text) =>
  crypto.createHash("sha256").update(text).digest("hex");

const normalizePath = (filePath) => filePath.replace(/\\/g, "/");

const collectFiles = (targetPath) => {
  if (!fs.existsSync(targetPath)) {
    return [];
  }

  const stats = fs.statSync(targetPath);
  if (stats.isFile()) {
    return [path.resolve(targetPath)];
  }

  if (!stats.isDirectory()) {
    return [];
  }

  const entries = fs.readdirSync(targetPath, { withFileTypes: true });
  const files = [];

  entries.forEach((entry) => {
    const fullPath = path.join(targetPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      return;
    }

    if (entry.isFile()) {
      files.push(path.resolve(fullPath));
    }
  });

  return files;
};

const getUniqueSortedFiles = (inputPaths) => {
  const fileMap = new Map();

  inputPaths.forEach((inputPath) => {
    collectFiles(inputPath).forEach((filePath) => {
      fileMap.set(filePath, filePath);
    });
  });

  return Array.from(fileMap.values()).sort((left, right) =>
    normalizePath(left).localeCompare(normalizePath(right))
  );
};

const calculateInputHash = (inputPaths) => {
  const files = getUniqueSortedFiles(inputPaths);

  if (files.length === 0) {
    return hashText("empty");
  }

  const merged = files
    .map((filePath) => {
      const relativePath = normalizePath(path.relative(".", filePath));
      return `${relativePath}:${calculateFileHash(filePath)}`;
    })
    .join("|");

  return hashText(merged);
};

const SHARED_BUILD_INPUTS = [
  "rollup.config.mjs",
  "package.json",
  "pnpm-lock.yaml",
  "tsconfig.json",
];

const getLicenseFile = (srcDir) =>
  fs.existsSync(`${srcDir}/LICENSE`) ? `${srcDir}/LICENSE` : "LICENSE";

const getAmbientTypeInputs = (appId) => {
  const inputs = ["src/types"];

  if (appId) {
    inputs.push(`src/${appId}/types`);
  }

  return inputs;
};

const resolveTypeScriptConfigPath = (configPath, extendsValue) => {
  const basePath = path.resolve(path.dirname(configPath), extendsValue);
  const candidates = [basePath, `${basePath}.json`];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
};

const getTypeScriptConfigTypes = (configPath, visited = new Set()) => {
  const resolvedConfigPath = path.resolve(configPath);
  if (visited.has(resolvedConfigPath) || !fs.existsSync(resolvedConfigPath)) {
    return [];
  }

  visited.add(resolvedConfigPath);
  const parsedConfig = JSON.parse(fs.readFileSync(resolvedConfigPath, "utf8"));
  const compilerOptions = parsedConfig.compilerOptions || {};
  if (Object.prototype.hasOwnProperty.call(compilerOptions, "types")) {
    return compilerOptions.types || [];
  }

  if (parsedConfig.extends) {
    const parentConfigPath = resolveTypeScriptConfigPath(
      resolvedConfigPath,
      parsedConfig.extends
    );
    if (parentConfigPath) {
      return getTypeScriptConfigTypes(parentConfigPath, visited);
    }
  }

  return [];
};

const getTypeScriptConfigTypeInputs = (tsconfig) => {
  const configPath = path.resolve(tsconfig);
  return getTypeScriptConfigTypes(configPath).flatMap((typePath) => {
    const basePath = path.resolve(path.dirname(configPath), typePath);
    const candidates = [
      basePath,
      `${basePath}.d.ts`,
      path.join(basePath, "index.d.ts"),
    ];
    return candidates.find((candidate) => fs.existsSync(candidate)) || [];
  });
};

const isTypeScriptInputFile = (filePath) =>
  /\.(?:d\.)?(?:c|m)?tsx?$/i.test(filePath);

const getRelativeImportSpecifiers = (filePath) => {
  const source = fs.readFileSync(filePath, "utf8");
  return ts
    .preProcessFile(source, true, true)
    .importedFiles.map(({ fileName }) => fileName)
    .filter((specifier) => specifier.startsWith("."));
};

const IMPORT_RESOLVE_OPTIONS = {
  allowJs: true,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
};

const resolveRelativeImport = (fromFilePath, specifier) => {
  const resolvedModule = ts.resolveModuleName(
    specifier,
    fromFilePath,
    IMPORT_RESOLVE_OPTIONS,
    ts.sys
  ).resolvedModule;
  const resolvedFilePath = resolvedModule?.resolvedFileName;

  if (!resolvedFilePath) {
    return null;
  }

  const absoluteFilePath = path.resolve(resolvedFilePath);
  if (!fs.existsSync(absoluteFilePath)) {
    return null;
  }

  return fs.statSync(absoluteFilePath).isFile() ? absoluteFilePath : null;
};

const canReadImports = (filePath) =>
  isTypeScriptInputFile(filePath) || path.extname(filePath) === ".js";

export const collectImportDependencyFiles = (entryFile) => {
  const files = new Map();

  const visit = (filePath) => {
    const resolvedFile = path.resolve(filePath);

    if (files.has(resolvedFile) || !fs.existsSync(resolvedFile)) {
      return;
    }

    files.set(resolvedFile, resolvedFile);

    if (!canReadImports(resolvedFile)) {
      return;
    }

    getRelativeImportSpecifiers(resolvedFile).forEach((specifier) => {
      const importedFile = resolveRelativeImport(resolvedFile, specifier);

      if (importedFile) {
        visit(importedFile);
      }
    });
  };

  visit(entryFile);

  return Array.from(files.values()).sort((left, right) =>
    normalizePath(left).localeCompare(normalizePath(right))
  );
};

export const getTypeScriptInputFiles = ({
  appId,
  srcDir,
  tsconfig,
  ambientTypeInputs = getAmbientTypeInputs(appId),
}) =>
  getUniqueSortedFiles([
    ...collectImportDependencyFiles(`${srcDir}/index.ts`),
    ...ambientTypeInputs,
    ...(tsconfig ? getTypeScriptConfigTypeInputs(tsconfig) : []),
  ])
    .filter(isTypeScriptInputFile)
    .map(normalizePath);

export const getTypeScriptPluginOptions = ({
  appId,
  srcDir,
  tsconfig,
  watch = false,
}) => {
  if (watch) {
    return { tsconfig };
  }

  return {
    tsconfig,
    include: getTypeScriptInputFiles({ appId, srcDir, tsconfig }),
    filterRoot: false,
  };
};

const getScriptHashInputs = ({ appId, script, srcDir, tsconfig }) => {
  const inputs = [
    ...SHARED_BUILD_INPUTS,
    tsconfig,
    ...getAmbientTypeInputs(appId),
    ...collectImportDependencyFiles(`${srcDir}/index.ts`),
  ];

  if (script.license) {
    inputs.push(getLicenseFile(srcDir));
  }

  return inputs;
};

const calculateScriptHash = (scriptContext) =>
  calculateScriptHashValue({
    inputHash: calculateInputHash(getScriptHashInputs(scriptContext)),
    script: scriptContext.script,
  });

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

export const saveBuildHashes = (hashes, buildHashFile = BUILD_HASH_FILE) => {
  const targetPath = path.resolve(buildHashFile);
  const temporaryPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;

  ensureDirectory(path.dirname(targetPath));

  try {
    fs.writeFileSync(temporaryPath, JSON.stringify(hashes, null, 2), "utf8");
    fs.renameSync(temporaryPath, targetPath);
  } catch (error) {
    try {
      fs.rmSync(temporaryPath, { force: true });
    } catch {
      // 元の履歴を保持することを優先し、一時ファイルの削除失敗は元のエラーに委ねる。
    }
    throw error;
  }
};

const isTruthyFlag = (value) =>
  value !== undefined && value !== "" && value !== "false" && value !== "0";

const hasForceBuildFlag = (commandLineArgs = {}) => {
  const forceBuildFromArgs =
    Boolean(commandLineArgs.all) || Boolean(commandLineArgs.a);

  delete commandLineArgs.all;
  delete commandLineArgs.a;

  if (forceBuildFromArgs) {
    return true;
  }

  return isTruthyFlag(process.env.BUILD_ALL);
};

const getAppFilter = (commandLineArgs = {}) => {
  const appFilter =
    commandLineArgs.app || process.env.EXTENDSCRIPT_BUILD_APP || null;
  delete commandLineArgs.app;
  return appFilter;
};

const extensions = [".ts"];

const isEvalWarning = (w) =>
  w &&
  (w.code === "EVAL" ||
    (w.code === "PLUGIN_WARNING" && w.pluginCode === "EVAL"));
const isFromJson2 = (w) => {
  const id = (w && (w.id || (w.loc && w.loc.file))) || "";
  return /[\\/]json2\.js$/i.test(id);
};
const onwarn = (warning, defaultHandler) => {
  if (isEvalWarning(warning) && isFromJson2(warning)) {
    return;
  }
  defaultHandler(warning);
};
const TEXT_COLOR_YELLOW = "\x1b[33m";
const TEXT_COLOR_RESET = "\x1b[0m";

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
  const licenseDir = getLicenseFile(srcDir);
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

let hasSavedBuildHashes = false;
export const BUILD_HASH_PLUGIN_NAME = "persist-build-hashes";

const persistBuildHashes = (hashes, metadata) => ({
  name: BUILD_HASH_PLUGIN_NAME,
  buildHashState: { hashes, metadata },
  closeBundle() {
    if (
      hasSavedBuildHashes ||
      process.env.EXTENDSCRIPT_DEFER_BUILD_HASHES === "1"
    ) {
      return;
    }

    saveBuildHashes(hashes);
    hasSavedBuildHashes = true;
  },
});

export default (commandLineArgs = {}) => {
  const forceBuildAll = hasForceBuildFlag(commandLineArgs);
  const appFilter = getAppFilter(commandLineArgs);

  // アプリ別スクリプトを展開: { appId, script, srcDir, outDir }
  const allScripts = [];
  let hasDeprecatedBuildFalse = false;

  if (config.scripts) {
    for (const [appId, scripts] of Object.entries(config.scripts)) {
      if (appFilter && appId !== appFilter) continue;
      for (const script of scripts) {
        const isBuildEnabled = script.build !== false;

        if (!forceBuildAll && !isBuildEnabled) {
          continue;
        }

        if (forceBuildAll && !isBuildEnabled) {
          hasDeprecatedBuildFalse = true;
        }

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
      const isBuildEnabled = script.build !== false;

      if (!forceBuildAll && !isBuildEnabled) {
        continue;
      }

      if (forceBuildAll && !isBuildEnabled) {
        hasDeprecatedBuildFalse = true;
      }

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

  if (forceBuildAll && hasDeprecatedBuildFalse) {
    console.warn(
      `${TEXT_COLOR_YELLOW}注意: es.config.mjs の build:false は非推奨です。build -a 実行時はビルド対象の判定を無視して全件をビルドします。${TEXT_COLOR_RESET}`
    );
  }

  const previousBuildHashes = loadBuildHashes();
  const selection = selectChangedScripts({
    scripts: allScripts,
    previousBuildHashes,
    forceBuildAll,
    calculateHash: calculateScriptHash,
  });
  const currentBuildHashes = appFilter
    ? { ...previousBuildHashes, ...selection.currentBuildHashes }
    : selection.currentBuildHashes;
  const targetScripts = selection.targetScripts;

  const entries = targetScripts.map(
    ({ appId, script, srcDir, outDir, hashKey, tsconfig }) => {
      const inputFile = `${srcDir}/index.ts`;
      const fileHash =
        currentBuildHashes[hashKey] || calculateFileHash(inputFile);
      const typeScriptPluginOptions = getTypeScriptPluginOptions({
        appId,
        srcDir,
        tsconfig,
        watch: Boolean(commandLineArgs.watch),
      });
      const metadata = {
        appId,
        hashKey,
        scriptName: script.name,
        tsconfig,
        targetName: appId ? `${appId}/${script.name}` : script.name,
      };

      const banner = `/** ${script.name} v${script.version} hash: ${fileHash} */\nvar __ES_THIS__=this;`;

      return {
        input: inputFile,
        output: {
          file: `${outDir}/${script.name}.jsx`,
          format: "cjs",
          strict: false,
        },
        context: "this",
        onwarn,
        plugins: [
          typescript(typeScriptPluginOptions),
          resolve({
            extensions,
          }),
          commonjs(),
          createBabelConfig(),
          extractCommentsToTop(),
          terserConfig(banner),
          script.license ? licenser(srcDir) : null,
          persistBuildHashes(currentBuildHashes, metadata),
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
};
