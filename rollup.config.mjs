import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import license from "rollup-plugin-license";

import fs from "fs";
import crypto from "crypto";
import process from "process";

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

const terserConfig = (banner) =>
  terser({
    compress: {
      ie8: true,
      conditionals: false,
      passes: 4,
    },
    format: {
      comments: false,
      preamble: `/**\n${banner} */\n`,
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
const babelConfig = babel({
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

const entries = config.scripts
  .filter((script) => script.build)
  .map((script) => {
    const srcDir = `src/${script.name}`;
    const outDir = `dist/${script.name}`;
    const inputFile = `${srcDir}/index.ts`;
    const fileHash = calculateFileHash(inputFile);

    const banner = ` * ${script.name} v${script.version} hash: ${fileHash}\n`;

    return {
      input: inputFile,
      output: {
        file: `${outDir}/${script.name}.jsx`,
        format: "cjs",
      },
      context: "this",
      onwarn,
      plugins: [
        typescript(),
        resolve({
          extensions,
        }),
        commonjs(),
        babelConfig,
        terserConfig(banner),
        script.license ? licenser(srcDir) : null,
      ],
    };
  });

if (entries.length === 0) {
  console.error("ビルドするスクリプトがありません。");
  process.exit(1);
}

export default entries;
