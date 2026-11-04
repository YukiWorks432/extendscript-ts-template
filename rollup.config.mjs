import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import license from "rollup-plugin-license";
import { extendscriptCompat } from "extendscript-compat/rollup";

import fs from "fs";
import crypto from "crypto";
import process from "process";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "node:module";
import { minify } from "terser";
import { parseSync } from "@babel/core";
import { compiledTypescript } from "./scripts/compiledTypescript.mjs";
import {
  BUILD_HASH_PLUGIN_NAME,
  loadBuildHashes,
  saveBuildHashes,
} from "./scripts/buildState.mjs";
export { BUILD_HASH_PLUGIN_NAME, saveBuildHashes };

const require = createRequire(import.meta.url);
const getCompiler = () => require("typescript");

import config from "./es.config.mjs";
import {
  calculateFileHash,
  calculateScriptHash as calculateScriptHashValue,
  selectChangedScripts,
} from "./scripts/buildHash.mjs";

const compatPackageDir = path.dirname(
  fileURLToPath(import.meta.resolve("extendscript-compat/package.json"))
);
const compatLicenses = ["LICENSE", "THIRD-PARTY-LICENSES.txt"]
  .map((name) => fs.readFileSync(path.join(compatPackageDir, name), "utf8"))
  .join("\n\n");

const hashText = (text) =>
  crypto.createHash("sha256").update(text).digest("hex");

const normalizePath = (filePath) => filePath.replace(/\\/g, "/");

const collectFiles = (targetPath) => {
  const absolutePath = path.resolve(targetPath);
  if (!fs.existsSync(absolutePath)) {
    return [];
  }

  const stats = fs.statSync(absolutePath);
  if (stats.isFile()) {
    return [absolutePath];
  }

  if (!stats.isDirectory()) {
    return [];
  }

  // ドットパスも含めて再帰し、Windows の junction を含むリンクは除外する。
  return fs
    .globSync(["**/*", "**/.*", "**/.*/**/*"], {
      cwd: absolutePath,
      exclude: (entry) => entry.isSymbolicLink(),
      withFileTypes: true,
    })
    .filter((entry) => entry.isFile())
    .map((entry) => path.resolve(entry.parentPath, entry.name));
};

export const getUniqueSortedFiles = (inputPaths) => {
  const files = new Set();

  inputPaths.forEach((inputPath) => {
    collectFiles(inputPath).forEach((filePath) => {
      files.add(filePath);
    });
  });

  return Array.from(files).toSorted((left, right) =>
    normalizePath(left).localeCompare(normalizePath(right))
  );
};

export const calculateInputHash = (inputPaths) => {
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
  ...fs
    .readdirSync("scripts")
    .filter((name) => name.endsWith(".mjs") && !name.endsWith(".test.mjs"))
    .map((name) => `scripts/${name}`),
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
  return getCompiler()
    .preProcessFile(source, true, true)
    .importedFiles.map(({ fileName }) => fileName)
    .filter((specifier) => specifier.startsWith("."));
};

const resolveRelativeImport = (fromFilePath, specifier) => {
  const ts = getCompiler();
  const resolvedModule = ts.resolveModuleName(
    specifier,
    fromFilePath,
    { allowJs: true, moduleResolution: ts.ModuleResolutionKind.NodeJs },
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

  return Array.from(files.values()).toSorted((left, right) =>
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
  const baseOptions = { tsconfig, noEmitOnError: !watch };

  if (watch) {
    return baseOptions;
  }

  return {
    ...baseOptions,
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

const terserConfig = (preamble, staged) => {
  const options = {
    ie8: true,
    compress: { passes: 1 },
    format: { comments: /(@preserve|@description)/, preamble },
  };
  if (!staged) return require("@rollup/plugin-terser")(options);
  // すでに隔離されたワーカー内なので、圧縮専用ワーカーを重ねて起動しない。
  return {
    name: "terser",
    async renderChunk(code, _chunk, output) {
      return minify(code, {
        ...options,
        sourceMap: Boolean(output.sourcemap),
        ...(output.format === "es" ? { module: true } : {}),
        ...(output.format === "cjs" ? { toplevel: true } : {}),
      });
    },
  };
};

const extractCommentsToTop = () => ({
  name: "extract-comments-to-top",
  renderChunk(code) {
    if (!code.includes("/*")) return null;
    const comments = parseSync(code, {
      babelrc: false,
      configFile: false,
      sourceType: "unambiguous",
      parserOpts: { attachComment: false },
    }).comments.filter((comment) => comment.type === "CommentBlock");
    if (comments.length === 0) return null;

    const header = [];
    const body = [];
    let offset = 0;
    for (const { start, end } of comments) {
      const comment = code.slice(start, end);
      header.push(comment);
      // トークン境界と自動セミコロン挿入に影響する改行を保つ。
      body.push(
        code.slice(offset, start),
        comment.replace(/[^\r\n\u2028\u2029]/g, " ")
      );
      offset = end;
    }
    body.push(code.slice(offset));
    return header.join("\n") + "\n" + body.join("");
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

const createBabelConfig = (sourceMaps = true) =>
  babel({
    sourceMaps,
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

const persistBuildHashes = (hashes, metadata, { watch = false } = {}) => ({
  name: BUILD_HASH_PLUGIN_NAME,
  buildHashState: { hashes, metadata },
  closeBundle() {
    // watch は型エラーでも出力するため、検証済み履歴として保存しません。
    if (
      watch ||
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
  const preparing = process.env.EXTENDSCRIPT_BUILD_PHASE === "prepare";
  const manifest =
    process.env.EXTENDSCRIPT_BUILD_PHASE === "bundle"
      ? JSON.parse(
          fs.readFileSync(process.env.EXTENDSCRIPT_BUILD_MANIFEST, "utf8")
        )
      : null;
  const forceBuildAll = hasForceBuildFlag(commandLineArgs);
  const appFilter = getAppFilter(commandLineArgs);

  // アプリ別スクリプトを展開: { appId, script, srcDir, outDir }
  const allScripts = [];
  let hasDeprecatedBuildFalse = false;

  if (!manifest && config.scripts) {
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
  if (!manifest && config.common && !appFilter) {
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

  if (!manifest && allScripts.length === 0) {
    console.error("ビルドするスクリプトがありません。");
    process.exit(1);
  }

  if (forceBuildAll && hasDeprecatedBuildFalse) {
    console.warn(
      `${TEXT_COLOR_YELLOW}注意: es.config.mjs の build:false は非推奨です。build -a 実行時はビルド対象の判定を無視して全件をビルドします。${TEXT_COLOR_RESET}`
    );
  }

  const previousBuildHashes = manifest ? {} : loadBuildHashes();
  const selection = manifest
    ? {
        currentBuildHashes: manifest.hashes,
        targetScripts: manifest.targets
          .filter(
            (target) =>
              target.targetName === process.env.EXTENDSCRIPT_BUILD_TARGET
          )
          .map((target) => target.descriptor),
      }
    : selectChangedScripts({
        scripts: allScripts,
        previousBuildHashes,
        forceBuildAll,
        calculateHash: calculateScriptHash,
      });
  const currentBuildHashes = appFilter
    ? { ...previousBuildHashes, ...selection.currentBuildHashes }
    : selection.currentBuildHashes;
  const targetScripts = selection.targetScripts;

  const entries = targetScripts.map((descriptor) => {
    const { appId, script, srcDir, outDir, hashKey, tsconfig } = descriptor;
    const inputFile = `${srcDir}/index.ts`;
    const fileHash =
      currentBuildHashes[hashKey] || calculateFileHash(inputFile);
    const typeScriptPluginOptions =
      descriptor.typeScriptPluginOptions ||
      getTypeScriptPluginOptions({
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
      descriptor: { ...descriptor, typeScriptPluginOptions },
    };

    const banner = `/*\n${compatLicenses}\n*/\n/** ${script.name} v${script.version} hash: ${fileHash} */\nvar __ES_THIS__=this;`;

    return {
      input: inputFile,
      output: {
        file: `${outDir}/${script.name}.jsx`,
        format: "cjs",
        strict: false,
        esModule: false,
        generatedCode: { preset: "es5", reservedNamesAsProps: false },
        freeze: false,
      },
      context: "this",
      onwarn,
      plugins: preparing
        ? [persistBuildHashes(currentBuildHashes, metadata)]
        : [
            manifest
              ? compiledTypescript(descriptor.cacheDir)
              : require("@rollup/plugin-typescript")(typeScriptPluginOptions),
            resolve({
              extensions,
            }),
            commonjs({ sourceMap: manifest ? descriptor.sourceMaps : true }),
            createBabelConfig(manifest ? descriptor.sourceMaps : true),
            extractCommentsToTop(),
            terserConfig(banner, Boolean(manifest)),
            script.license ? licenser(srcDir) : null,
            extendscriptCompat(),
            persistBuildHashes(currentBuildHashes, metadata, {
              watch: Boolean(commandLineArgs.watch),
            }),
          ],
    };
  });

  if (entries.length === 0) {
    saveBuildHashes(currentBuildHashes);
    console.log("変更されたスクリプトがないため、ビルドをスキップしました。");
    if (!preparing) process.exit(0);
    return [];
  }

  const filterMsg = appFilter ? ` (app: ${appFilter})` : "";
  if (!manifest)
    console.log(
      forceBuildAll
        ? `--all/-a 指定により ${entries.length} 件を強制ビルドします。${filterMsg}`
        : `${entries.length} 件の変更スクリプトをビルドします。${filterMsg}`
    );

  return entries;
};
