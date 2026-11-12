import test from "node:test";
import { runInNewContext } from "node:vm";
import { assertPrecedenceProtected } from "extendscript-compat";
import assert from "node:assert/strict";
import { promisify } from "node:util";
import fs from "fs";
import os from "os";
import path from "path";
import process from "node:process";
import { execFile, spawnSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import typescript from "@rollup/plugin-typescript";
import { loadConfigFile } from "rollup/loadConfigFile";

import { buildOne } from "./build.mjs";
import { BUILD_HASH_PLUGIN_NAME } from "../rollup.config.mjs";
const execFileAsync = promisify(execFile);
import scriptConfig from "../es.config.mjs";
import { createAppFiles } from "./appScaffold.mjs";

const projectRoot = process.cwd();
const outputFiles = [
  ...Object.entries(scriptConfig.scripts).flatMap(([app, entries]) =>
    entries.map(({ name }) => "dist/" + app + "/" + name + "/" + name + ".jsx")
  ),
  ...(scriptConfig.common || []).map(
    ({ name }) => "dist/" + name + "/" + name + ".jsx"
  ),
].map((filePath) => path.resolve(projectRoot, filePath));
const buildHashFile = path.resolve(projectRoot, "dist/temp/build-hashes.json");
const buildScriptPath = path.resolve(projectRoot, "scripts/build.mjs");

const snapshotFile = (filePath) =>
  fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;

const restoreFile = (filePath, snapshot) => {
  if (snapshot === null) {
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, snapshot);
};

const normalizeBuildMetadata = (content) =>
  content
    .toString("utf8")
    .replace(
      /\/\*\* [^\n]* hash: [0-9a-f]{64} \*\/\n/g,
      "/** normalized build metadata */\n"
    );

const runBuild = async (concurrency) => {
  const environment = { ...process.env };
  delete environment.BUILD_ALL;
  delete environment.EXTENDSCRIPT_BUILD_APP;
  delete environment.EXTENDSCRIPT_DEFER_BUILD_HASHES;

  await execFileAsync(
    process.execPath,
    ["scripts/build.mjs", "--all", `--concurrency=${concurrency}`],
    {
      cwd: projectRoot,
      env: environment,
      maxBuffer: 8 * 1024 * 1024,
    }
  );
};

const restoreEnvironmentValue = (name, value) => {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
};

const createTemporaryRollupProject = (root) => {
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(root, "src", "aeft", "example"), {
    recursive: true,
  });
  fs.copyFileSync(
    path.resolve(projectRoot, "rollup.config.mjs"),
    path.join(root, "rollup.config.mjs")
  );
  fs.writeFileSync(
    path.join(root, "es.config.mjs"),
    'export default { scripts: { aeft: [{ name: "example", version: "0.0.1", license: false }] } };\n'
  );
  for (const name of fs.readdirSync(path.join(projectRoot, "scripts"))) {
    if (name.endsWith(".mjs") && !name.endsWith(".test.mjs")) {
      fs.copyFileSync(
        path.join(projectRoot, "scripts", name),
        path.join(root, "scripts", name)
      );
    }
  }
  fs.symlinkSync(
    path.resolve(projectRoot, "node_modules"),
    path.join(root, "node_modules"),
    "junction"
  );
  fs.copyFileSync(
    path.join(projectRoot, "tsconfig.json"),
    path.join(root, "tsconfig.json")
  );
  fs.writeFileSync(
    path.join(root, "src/aeft/tsconfig.json"),
    createAppFiles("aeft")["src/aeft/tsconfig.json"]
  );
  fs.writeFileSync(
    path.join(root, "src", "aeft", "example", "index.ts"),
    'export const value: string = "valid";\n'
  );
};

const runNodeScript = (scriptPath, argumentsList, options = {}) =>
  spawnSync(process.execPath, [scriptPath, ...argumentsList], {
    ...options,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    timeout: 30000,
  });

const runUnboundedBuild = async () => {
  const previousBuildAll = process.env.BUILD_ALL;
  const previousDefer = process.env.EXTENDSCRIPT_DEFER_BUILD_HASHES;
  process.env.BUILD_ALL = "1";
  process.env.EXTENDSCRIPT_DEFER_BUILD_HASHES = "1";

  try {
    const { options, warnings } = await loadConfigFile(
      path.resolve(projectRoot, "rollup.config.mjs"),
      {}
    );
    warnings.flush();

    for (const option of options) {
      const hashPlugin = option.plugins.find(
        (plugin) => plugin && plugin.name === BUILD_HASH_PLUGIN_NAME
      );
      const tsconfig = hashPlugin.buildHashState.metadata.tsconfig;
      const unboundedOptions = {
        ...option,
        plugins: option.plugins.map((plugin) =>
          plugin && plugin.name === "typescript"
            ? typescript({ tsconfig })
            : plugin
        ),
      };
      await buildOne({ option: unboundedOptions });
    }
  } finally {
    restoreEnvironmentValue("BUILD_ALL", previousBuildAll);
    restoreEnvironmentValue("EXTENDSCRIPT_DEFER_BUILD_HASHES", previousDefer);
  }
};

test("逐次実行と並列実行の生成物はバイト単位で一致する", async () => {
  const snapshots = new Map(
    [...outputFiles, buildHashFile].map((filePath) => [
      filePath,
      snapshotFile(filePath),
    ])
  );

  try {
    await runBuild(1);
    const serialOutputs = outputFiles.map((filePath) => snapshotFile(filePath));
    assert.ok(serialOutputs.every((content) => content !== null));

    await runBuild(4);
    const parallelOutputs = outputFiles.map((filePath) =>
      snapshotFile(filePath)
    );
    assert.deepEqual(parallelOutputs, serialOutputs);

    await runUnboundedBuild();
    const unboundedOutputs = outputFiles.map((filePath) =>
      snapshotFile(filePath)
    );
    assert.deepEqual(
      unboundedOutputs.map(normalizeBuildMetadata),
      parallelOutputs.map(normalizeBuildMetadata)
    );
  } finally {
    snapshots.forEach((snapshot, filePath) => restoreFile(filePath, snapshot));
  }
});

test("watch の型エラー履歴で通常ビルドを省略しない", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-watch-build-"));
  const sourcePath = path.join(root, "src", "aeft", "example", "index.ts");
  const hashPath = path.join(root, "dist", "temp", "build-hashes.json");
  const watchRunnerPath = path.join(root, "watch-once.mjs");
  const normalBuildRunnerPath = path.join(root, "normal-build-once.mjs");
  const watchRunner = `
import path from "node:path";
import { watch } from "rollup";
import { loadConfigFile } from "rollup/loadConfigFile";

const { options, warnings } = await loadConfigFile(
  path.resolve("rollup.config.mjs"),
  { watch: true }
);
warnings.flush();

const watcher = watch(options);
let closing = false;
const timeout = setTimeout(async () => {
  if (closing) return;
  closing = true;
  await watcher.close();
  console.error("watch がビルド完了イベントを返しませんでした。");
  process.exitCode = 1;
}, 20000);

watcher.on("event", async (event) => {
  if (event.code === "ERROR" && !closing) {
    closing = true;
    clearTimeout(timeout);
    await watcher.close();
    console.error(event.error);
    process.exitCode = 1;
    return;
  }

  if (event.code === "BUNDLE_END" && !closing) {
    closing = true;
    clearTimeout(timeout);
    await watcher.close();
    console.log("WATCH_BUNDLE_END");
  }
});
`;
  const normalBuildRunner = `
import path from "node:path";
import { loadConfigFile } from "rollup/loadConfigFile";
import { buildOne } from "${pathToFileURL(buildScriptPath).href}";

const { options, warnings } = await loadConfigFile(
  path.resolve("rollup.config.mjs"),
  {}
);
warnings.flush();
if (options.length === 0) {
  console.log("NORMAL_BUILD_SKIPPED");
  process.exit(2);
}

try {
  await buildOne({ option: options[0] });
  console.error("NORMAL_BUILD_SUCCEEDED");
  process.exit(3);
} catch (error) {
  console.log(error instanceof Error ? error.message : String(error));
  process.exit(0);
}
`;
  const environment = { ...process.env };
  delete environment.BUILD_ALL;
  delete environment.EXTENDSCRIPT_DEFER_BUILD_HASHES;
  environment.EXTENDSCRIPT_BUILD_APP = "aeft";

  try {
    createTemporaryRollupProject(root);

    const initialBuild = runNodeScript(buildScriptPath, ["--app=aeft"], {
      cwd: root,
      env: environment,
    });
    assert.equal(
      initialBuild.status,
      0,
      initialBuild.stdout + initialBuild.stderr
    );
    const validatedHashes = fs.readFileSync(hashPath);

    fs.writeFileSync(sourcePath, "export const value: string = 1;\n");
    fs.writeFileSync(watchRunnerPath, watchRunner);
    const watchBuild = runNodeScript(watchRunnerPath, [], {
      cwd: root,
      env: environment,
    });
    assert.equal(watchBuild.status, 0, watchBuild.stdout + watchBuild.stderr);
    assert.match(watchBuild.stdout + watchBuild.stderr, /WATCH_BUNDLE_END/);
    assert.deepEqual(fs.readFileSync(hashPath), validatedHashes);

    fs.writeFileSync(normalBuildRunnerPath, normalBuildRunner);
    const normalBuild = runNodeScript(normalBuildRunnerPath, [], {
      cwd: root,
      env: environment,
    });
    assert.equal(
      normalBuild.status,
      0,
      normalBuild.stdout + normalBuild.stderr
    );
    assert.match(normalBuild.stdout + normalBuild.stderr, /TS2322/);
    assert.doesNotMatch(
      normalBuild.stdout + normalBuild.stderr,
      /NORMAL_BUILD_SKIPPED/
    );
  } finally {
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  }
});

test("圧縮後の条件式で評価結果と短絡評価・副作用の順序を保護する", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-compat-output-"));
  try {
    createTemporaryRollupProject(root);
    fs.writeFileSync(
      path.join(root, "src", "aeft", "example", "index.ts"),
      `export function select(a: boolean, b: boolean, c: boolean): number {
  if (a || b && c) { if (a) return 10; return 20; }
  if (b) return 30;
  return 40;
}
export function nested(a: boolean, b: boolean, c: boolean, trace: string[]): number {
  function mark(label: string, value: boolean): boolean { trace.push(label); return value; }
  function result(value: number): number { trace.push(String(value)); return value; }
  return mark("a", a) ? (mark("b", b) ? result(10) : result(20)) : (mark("c", c) ? result(30) : result(40));
}
export function nestedTest(a: boolean, b: boolean, c: boolean, trace: string[]): number {
  function mark(label: string, value: boolean): boolean { trace.push(label); return value; }
  return (mark("a", a) ? mark("b", b) : mark("c", c)) ? 1 : 0;
}
export function logical(a: boolean, b: boolean, c: boolean, trace: string[]): boolean {
  function mark(label: string, value: boolean): boolean { trace.push(label); return value; }
  return mark("a", a) || mark("b", b) && mark("c", c);
}
`
    );
    const linted = runNodeScript(
      path.join(projectRoot, "node_modules/oxlint/bin/oxlint"),
      [
        "--config",
        path.join(projectRoot, ".oxlintrc.json"),
        "src/aeft/example/index.ts",
      ],
      { cwd: root }
    );
    assert.equal(linted.status, 0, linted.stdout + linted.stderr);
    const environment = { ...process.env, EXTENDSCRIPT_BUILD_APP: "aeft" };
    delete environment.BUILD_ALL;
    delete environment.EXTENDSCRIPT_DEFER_BUILD_HASHES;
    const built = runNodeScript(buildScriptPath, ["--app=aeft", "--all"], {
      cwd: root,
      env: environment,
    });
    assert.equal(built.status, 0, built.stdout + built.stderr);
    const code = fs.readFileSync(
      path.join(root, "dist/aeft/example/example.jsx"),
      "utf8"
    );
    assertPrecedenceProtected(code);
    const context = { exports: {} };
    runInNewContext(code, context);
    for (const [a, b, c, expected] of [
      [true, false, false, 10],
      [false, true, true, 20],
      [false, true, false, 30],
      [false, false, true, 40],
    ]) {
      assert.equal(context.exports.select(a, b, c), expected);
    }
    for (const [a, b, c, expected, expectedTrace] of [
      [true, true, false, 10, ["a", "b", "10"]],
      [true, false, true, 20, ["a", "b", "20"]],
      [false, true, true, 30, ["a", "c", "30"]],
      [false, true, false, 40, ["a", "c", "40"]],
    ]) {
      const trace = [];
      assert.equal(context.exports.nested(a, b, c, trace), expected);
      assert.deepEqual(trace, expectedTrace);
    }
    for (const [a, b, c, expected, expectedTrace] of [
      [true, true, false, 1, ["a", "b"]],
      [true, false, true, 0, ["a", "b"]],
      [false, false, true, 1, ["a", "c"]],
      [false, true, false, 0, ["a", "c"]],
    ]) {
      const trace = [];
      assert.equal(context.exports.nestedTest(a, b, c, trace), expected);
      assert.deepEqual(trace, expectedTrace);
    }
    for (const [a, b, c, expected, expectedTrace] of [
      [true, false, false, true, ["a"]],
      [false, true, true, true, ["a", "b", "c"]],
      [false, true, false, false, ["a", "b", "c"]],
      [false, false, true, false, ["a", "b"]],
    ]) {
      const trace = [];
      assert.equal(context.exports.logical(a, b, c, trace), expected);
      assert.deepEqual(trace, expectedTrace);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("コメント風の文字列と正規表現を通常・監視ビルドで保持する", () => {
  for (const mode of ["normal", "watch"]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-comment-values-"));
    try {
      createTemporaryRollupProject(root);
      fs.writeFileSync(
        path.join(root, "src/aeft/example/index.ts"),
        `/** @description コメント風の値を保つ。 */
/* @preserve comment-regression */
export function readValues(input: string) {
  return [
    "/* keep this text */",
    'before /* @description not-a-comment */ after',
    "quote \\\" // line /* preserved */",
    \`template /* raw */ \${input}\`,
    /[/*][*/]/.test(input),
  ];
}
`
      );
      const environment = { ...process.env };
      delete environment.BUILD_ALL;
      delete environment.EXTENDSCRIPT_BUILD_APP;
      delete environment.EXTENDSCRIPT_DEFER_BUILD_HASHES;
      let built;
      if (mode === "normal") {
        built = runNodeScript(buildScriptPath, ["--app=aeft", "--all"], {
          cwd: root,
          env: environment,
        });
      } else {
        const runner = path.join(root, "build-watch-settings.mjs");
        fs.writeFileSync(
          runner,
          `import createConfig from "./rollup.config.mjs";
import { buildOne } from ${JSON.stringify(pathToFileURL(buildScriptPath).href)};
const [option] = createConfig({ all: true, app: "aeft", watch: true });
await buildOne({ option });
`
        );
        built = runNodeScript(runner, [], { cwd: root, env: environment });
      }
      assert.equal(built.status, 0, mode + built.stdout + built.stderr);
      const code = fs.readFileSync(
        path.join(root, "dist/aeft/example/example.jsx"),
        "utf8"
      );
      const context = { exports: {} };
      runInNewContext(code, context);
      assert.deepEqual(
        Array.from(context.exports.readValues("/*")),
        [
          "/* keep this text */",
          "before /* @description not-a-comment */ after",
          'quote " // line /* preserved */',
          "template /* raw */ /*",
          true,
        ],
        mode
      );
      assert.match(code, /\/\*\* @description コメント風の値を保つ。 \*\//);
      assert.match(code, /\/\* @preserve comment-regression \*\//);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test("ビルドしたスクリプトに実行時補正とBOM・ライセンスを含める", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-compat-runtime-"));
  try {
    createTemporaryRollupProject(root);
    fs.copyFileSync(
      path.join(projectRoot, "src/init.ts"),
      path.join(root, "src/init.ts")
    );
    fs.writeFileSync(
      path.join(root, "src/aeft/example/index.ts"),
      'import "../../init"; export function check() { return [parseInt("a-", 16), "\\0".charAt(0).length, JSON.parse("{\\"value\\":3}").value, Number("0b101")]; }\n'
    );
    const environment = { ...process.env, EXTENDSCRIPT_BUILD_APP: "aeft" };
    delete environment.BUILD_ALL;
    delete environment.EXTENDSCRIPT_DEFER_BUILD_HASHES;
    const built = runNodeScript(buildScriptPath, ["--app=aeft", "--all"], {
      cwd: root,
      env: environment,
    });
    assert.equal(built.status, 0, built.stdout + built.stderr);
    const bytes = fs.readFileSync(
      path.join(root, "dist/aeft/example/example.jsx")
    );
    assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
    const code = bytes.toString("utf8");
    const compatDirectory = path.dirname(
      fileURLToPath(import.meta.resolve("extendscript-compat/package.json"))
    );
    for (const name of ["LICENSE", "THIRD-PARTY-LICENSES.txt"]) {
      assert.ok(
        code.includes(
          fs.readFileSync(path.join(compatDirectory, name), "utf8").trim()
        )
      );
    }
    const context = { exports: {} };
    runInNewContext(
      `var nativeNumber = Number;
var nativeParseInt = parseInt;
parseInt = function (value, radix) { return value === "a-" && radix === 16 ? 169 : nativeParseInt(value, radix); };
JSON = undefined;
Object.entries = undefined;
Object.values = undefined;
Object.create = undefined;
Object.defineProperty = undefined;
Object.getOwnPropertyDescriptor = undefined;
`,
      context
    );
    runInNewContext(code, context);
    assert.deepEqual(Array.from(context.exports.check()), [10, 1, 3, 5]);
    assert.equal(runInNewContext("Number === nativeNumber", context), true);
    assert.throws(
      () => runInNewContext('JSON.parse("[1,]")', context),
      (error) => error.name === "SyntaxError"
    );
    assert.deepEqual(
      Array.from(runInNewContext('Object.values("ab")', context)),
      ["a", "b"]
    );
    assert.deepEqual(
      Array.from(runInNewContext('Object.entries("ab")', context), (pair) =>
        Array.from(pair)
      ),
      [
        ["0", "a"],
        ["1", "b"],
      ]
    );
    assert.equal(
      runInNewContext("Object.create({ inherited: 7 }).inherited", context),
      7
    );
    assert.equal(
      runInNewContext(
        'Object.defineProperty({}, "value", { value: 3 }).value',
        context
      ),
      3
    );
    assert.equal(
      runInNewContext(
        'Object.getOwnPropertyDescriptor({ value: 4 }, "value").value',
        context
      ),
      4
    );
    const nativeContext = { exports: {} };
    runInNewContext(
      "var originalCreate = Object.create; var originalDefine = Object.defineProperty;",
      nativeContext
    );
    runInNewContext(code, nativeContext);
    assert.equal(
      runInNewContext(
        "Object.create === originalCreate && Object.defineProperty === originalDefine",
        nativeContext
      ),
      true
    );
    const patchedParseInt = runInNewContext("parseInt", context);
    runInNewContext(code, context);
    assert.equal(runInNewContext("parseInt", context), patchedParseInt);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("予約語のプロパティと名前空間をES3向けに出力する", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-compat-es3-"));
  try {
    createTemporaryRollupProject(root);
    fs.writeFileSync(
      path.join(root, "src/aeft/example/values.ts"),
      "export default 7; export const other = 11;\n"
    );
    fs.writeFileSync(
      path.join(root, "src/aeft/example/index.ts"),
      `import * as values from "./values";
export function lookup(key: keyof typeof values): number { return values[key]; }
export function reserved(value: number): number { return { "default": value }["default"]; }
export { lookup as default };
`
    );
    const environment = { ...process.env, EXTENDSCRIPT_BUILD_APP: "aeft" };
    delete environment.BUILD_ALL;
    delete environment.EXTENDSCRIPT_DEFER_BUILD_HASHES;
    const built = runNodeScript(buildScriptPath, ["--app=aeft", "--all"], {
      cwd: root,
      env: environment,
    });
    assert.equal(built.status, 0, built.stdout + built.stderr);
    const code = fs.readFileSync(
      path.join(root, "dist/aeft/example/example.jsx"),
      "utf8"
    );
    const context = { exports: {} };
    runInNewContext(
      "Object.freeze = undefined; Object.defineProperty = undefined;",
      context
    );
    runInNewContext(code, context);
    assert.equal(context.exports.lookup("default"), 7);
    assert.equal(context.exports.lookup("other"), 11);
    assert.equal(context.exports.default("default"), 7);
    assert.equal(context.exports.reserved(42), 42);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("最終出力にES3外の構文が残るとビルドを失敗させる", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-invalid-output-"));
  try {
    createTemporaryRollupProject(root);
    const runner = path.join(root, "build-invalid-output.mjs");
    fs.writeFileSync(
      runner,
      `
import { buildOne } from ${JSON.stringify(pathToFileURL(buildScriptPath).href)};
import createConfig from "./rollup.config.mjs";
const [option] = createConfig({ all: true, app: "aeft" });
option.plugins.unshift({
  name: "inject-non-es3-output",
  generateBundle(_options, bundle) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type === "chunk") chunk.code += "\\nvar invalid = value?.name;";
    }
  },
});
try {
  await buildOne({ option });
} catch (error) {
  console.error(JSON.stringify({ code: error.code, plugin: error.plugin, hook: error.hook }));
  process.exitCode = 1;
}
`
    );
    const built = runNodeScript(runner, [], {
      cwd: root,
      env: { ...process.env, EXTENDSCRIPT_DEFER_BUILD_HASHES: "1" },
    });
    assert.equal(built.status, 1, built.stdout + built.stderr);
    assert.deepEqual(JSON.parse(built.stderr.trim()), {
      code: "PLUGIN_ERROR",
      plugin: "extendscript-compat",
      hook: "generateBundle",
    });
    assert.equal(
      fs.existsSync(path.join(root, "dist/aeft/example/example.jsx")),
      false
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("選択外の型エラーを除外し、選択対象の型エラーでは既存出力と履歴を保持する", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-compile-scope-"));
  try {
    createTemporaryRollupProject(root);
    fs.mkdirSync(path.join(root, "src/aeft/types"));
    fs.writeFileSync(
      path.join(root, "src/aeft/types/index.d.ts"),
      "interface Application { beginUndoGroup: (name: string) => void; }\n"
    );
    fs.mkdirSync(path.join(root, "src/types"));
    fs.writeFileSync(
      path.join(root, "src/types/index.d.ts"),
      "interface Application { beginUndoGroup?: (name: string) => void; }\n"
    );
    fs.writeFileSync(
      path.join(root, "src/aeft/example/index.ts"),
      'export function begin(): void { app.beginUndoGroup("example"); }\n'
    );
    const environment = { ...process.env, BUILD_ALL: "0" };
    const initial = runNodeScript(buildScriptPath, ["--app=aeft"], {
      cwd: root,
      env: environment,
    });
    assert.equal(initial.status, 0, initial.stdout + initial.stderr);
    const source = path.join(root, "src/aeft/example/index.ts");
    const sibling = path.join(root, "src/aeft/unselected/index.ts");
    fs.mkdirSync(path.dirname(sibling), { recursive: true });
    fs.writeFileSync(sibling, "export const invalid: string = 123;\n");
    fs.writeFileSync(source, 'export const value: string = "changed";\n');
    const changed = runNodeScript(buildScriptPath, ["--app=aeft"], {
      cwd: root,
      env: environment,
    });
    assert.equal(changed.status, 0, changed.stdout + changed.stderr);
    const output = path.join(root, "dist/aeft/example/example.jsx");
    const history = path.join(root, "dist/temp/build-hashes.json");
    const validOutput = fs.readFileSync(output);
    const validHistory = fs.readFileSync(history);
    fs.writeFileSync(source, "export const invalid: string = 123;\n");
    const failing = runNodeScript(buildScriptPath, ["--app=aeft"], {
      cwd: root,
      env: environment,
    });
    assert.notEqual(failing.status, 0, failing.stdout + failing.stderr);
    assert.match(failing.stdout + failing.stderr, /TS2322/);
    assert.deepEqual(fs.readFileSync(output), validOutput);
    assert.deepEqual(fs.readFileSync(history), validHistory);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("通常ビルドにもRollup設定の追加処理・出力先・ソースマップを適用する", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-custom-build-"));
  try {
    createTemporaryRollupProject(root);
    fs.renameSync(
      path.join(root, "rollup.config.mjs"),
      path.join(root, "base.config.mjs")
    );
    fs.writeFileSync(
      path.join(root, "rollup.config.mjs"),
      `import base from "./base.config.mjs";
export default (args) => base(args).map((option) => ({
  ...option,
  output: { ...option.output, file: "dist/custom.jsx", sourcemap: true },
  plugins: [...option.plugins, {
    name: "custom-output",
    generateBundle(_output, bundle) { for (const chunk of Object.values(bundle)) { if (chunk.type === "chunk") chunk.code += "\\n/* CUSTOM_RESULT */"; } },
  }],
}));
`
    );
    const built = runNodeScript(buildScriptPath, ["--app=aeft", "--all"], {
      cwd: root,
    });
    assert.equal(built.status, 0, built.stdout + built.stderr);
    assert.match(
      fs.readFileSync(path.join(root, "dist/custom.jsx"), "utf8"),
      /CUSTOM_RESULT/
    );
    const map = JSON.parse(
      fs.readFileSync(path.join(root, "dist/custom.jsx.map"), "utf8")
    );
    assert.ok(
      map.sources.some((source) => source.endsWith("src/aeft/example/index.ts"))
    );
    assert.ok(map.mappings.length > 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("ワーカーの最終ES3検査で失敗した場合も履歴を更新しない", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-worker-failure-"));
  try {
    createTemporaryRollupProject(root);
    const initial = runNodeScript(buildScriptPath, ["--app=aeft", "--all"], {
      cwd: root,
    });
    assert.equal(initial.status, 0, initial.stdout + initial.stderr);
    const history = path.join(root, "dist/temp/build-hashes.json");
    const validHistory = fs.readFileSync(history);
    fs.renameSync(
      path.join(root, "rollup.config.mjs"),
      path.join(root, "base.config.mjs")
    );
    fs.writeFileSync(
      path.join(root, "rollup.config.mjs"),
      `import base from "./base.config.mjs";
export default (args) => base(args).map((option) => {
  option.plugins.unshift({ name: "invalid-output", generateBundle(_output, bundle) {
    for (const chunk of Object.values(bundle)) { if (chunk.type === "chunk") chunk.code += "\\nvar invalid = value?.name;"; }
  } });
  return option;
});
`
    );
    const built = runNodeScript(
      buildScriptPath,
      ["--app=aeft", "--all", "--concurrency=1"],
      { cwd: root }
    );
    assert.notEqual(built.status, 0, built.stdout + built.stderr);
    assert.match(
      built.stdout + built.stderr,
      /extendscript-compat[\s\S]*generateBundle/
    );
    assert.deepEqual(fs.readFileSync(history), validHistory);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("設定が文字列や空メッセージの例外で失敗しても履歴を確定しない", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-config-error-"));
  try {
    createTemporaryRollupProject(root);
    const initial = runNodeScript(buildScriptPath, ["--app=aeft", "--all"], {
      cwd: root,
    });
    assert.equal(initial.status, 0, initial.stdout + initial.stderr);
    const output = path.join(root, "dist/aeft/example/example.jsx");
    const history = path.join(root, "dist/temp/build-hashes.json");
    const validOutput = fs.readFileSync(output);
    const validHistory = fs.readFileSync(history);
    fs.renameSync(
      path.join(root, "rollup.config.mjs"),
      path.join(root, "base.config.mjs")
    );
    for (const expression of ['"configuration failed"', 'new Error("")']) {
      fs.writeFileSync(
        path.join(root, "rollup.config.mjs"),
        `import base from "./base.config.mjs";
export default (args) => {
  if (process.env.EXTENDSCRIPT_BUILD_PHASE === "bundle") throw ${expression};
  return base(args);
};
`
      );
      const built = runNodeScript(buildScriptPath, ["--app=aeft", "--all"], {
        cwd: root,
      });
      assert.notEqual(built.status, 0, built.stdout + built.stderr);
      if (expression.startsWith('"'))
        assert.match(built.stderr, /configuration failed/);
      assert.deepEqual(fs.readFileSync(output), validOutput);
      assert.deepEqual(fs.readFileSync(history), validHistory);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("単体ビルドは毎回1件だけ再生成し、対象外の出力と履歴を保持する", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-single-build-"));
  try {
    createTemporaryRollupProject(root);
    fs.mkdirSync(path.join(root, "src/aeft/other"));
    fs.mkdirSync(path.join(root, "src/aeft/lib"));
    fs.mkdirSync(path.join(root, "src/common"));
    fs.copyFileSync(
      path.join(projectRoot, "src/init.ts"),
      path.join(root, "src/init.ts")
    );
    fs.writeFileSync(
      path.join(root, "es.config.mjs"),
      'export default { scripts: { aeft: [{ name: "example", version: "0.0.1" }, { name: "other", version: "0.0.1" }] }, common: [{ name: "common", version: "0.0.1" }] };'
    );
    fs.writeFileSync(
      path.join(root, "src/aeft/example/index.ts"),
      'import "../../init"; import { value } from "../lib/shared"; export const result = value;'
    );
    const dependency = path.join(root, "src/aeft/lib/shared.ts");
    fs.writeFileSync(dependency, "export const value: number = 7;");
    fs.writeFileSync(
      path.join(root, "src/aeft/other/index.ts"),
      "export const other = 2;"
    );
    fs.writeFileSync(
      path.join(root, "src/common/index.ts"),
      "export const common = 3;"
    );
    const environment = { ...process.env, BUILD_ALL: "0" };
    const build = (args, env = environment) =>
      runNodeScript(buildScriptPath, args, { cwd: root, env });
    const initial = build(["--all"]);
    assert.equal(initial.status, 0, initial.stdout + initial.stderr);
    const output = path.join(root, "dist/aeft/example/example.jsx");
    const other = path.join(root, "dist/aeft/other/other.jsx");
    const common = path.join(root, "dist/common/common.jsx");
    const history = path.join(root, "dist/temp/build-hashes.json");
    const expectedOutput = fs.readFileSync(output);
    const otherOutput = fs.readFileSync(other);
    const commonOutput = fs.readFileSync(common);
    const originalHistory = JSON.parse(fs.readFileSync(history, "utf8"));
    fs.writeFileSync(
      path.join(root, "src/aeft/other/index.ts"),
      "export const other: string = 2;"
    );
    fs.writeFileSync(
      path.join(root, "src/common/index.ts"),
      "export const common: string = 3;"
    );
    fs.writeFileSync(output, "古い生成物");
    const selected = build(["aeft/example"], {
      ...environment,
      BUILD_ALL: "1",
    });
    assert.equal(selected.status, 0, selected.stdout + selected.stderr);
    assert.match(selected.stdout, /dist\/aeft\/example\/example\.jsx/);
    assert.deepEqual(fs.readFileSync(output), expectedOutput);
    assert.deepEqual(fs.readFileSync(other), otherOutput);
    assert.deepEqual(fs.readFileSync(common), commonOutput);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(history, "utf8")),
      originalHistory
    );
    const context = { exports: {} };
    runInNewContext(fs.readFileSync(output, "utf8"), context);
    assert.equal(context.exports.result, 7);
    // 変更のないソースでも、生成物が失われていれば再作成する。
    fs.rmSync(output);
    const rebuilt = build(["aeft/example"]);
    assert.equal(rebuilt.status, 0, rebuilt.stdout + rebuilt.stderr);
    assert.deepEqual(fs.readFileSync(output), expectedOutput);
    const validHistory = fs.readFileSync(history);
    const invalid = build(["aeft/missing"]);
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /aeft\/missing/);
    assert.match(invalid.stderr, /aeft\/example/);
    assert.deepEqual(fs.readFileSync(output), expectedOutput);
    assert.deepEqual(fs.readFileSync(history), validHistory);
    fs.writeFileSync(dependency, 'export const value: number = "invalid";');
    const failed = build(["aeft/example"]);
    assert.notEqual(failed.status, 0);
    assert.match(failed.stdout + failed.stderr, /TS2322/);
    assert.deepEqual(fs.readFileSync(output), expectedOutput);
    assert.deepEqual(fs.readFileSync(history), validHistory);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("共通スクリプトも名前で指定でき、build:falseの明示指定では再生成する", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-single-common-"));
  try {
    createTemporaryRollupProject(root);
    fs.mkdirSync(path.join(root, "src/common"));
    fs.writeFileSync(
      path.join(root, "es.config.mjs"),
      'export default { scripts: { aeft: [{ name: "example", version: "0.0.1" }] }, common: [{ name: "common", version: "0.0.1", build: false }] };'
    );
    fs.writeFileSync(
      path.join(root, "src/aeft/example/index.ts"),
      "export const invalid: string = 1;"
    );
    fs.writeFileSync(
      path.join(root, "src/common/index.ts"),
      "export const value = 9;"
    );
    const built = runNodeScript(buildScriptPath, ["common"], {
      cwd: root,
      env: { ...process.env, BUILD_ALL: "0" },
    });
    assert.equal(built.status, 0, built.stdout + built.stderr);
    const context = { exports: {} };
    runInNewContext(
      fs.readFileSync(path.join(root, "dist/common/common.jsx"), "utf8"),
      context
    );
    assert.equal(context.exports.value, 9);
    assert.deepEqual(
      Object.keys(
        JSON.parse(
          fs.readFileSync(
            path.join(root, "dist/temp/build-hashes.json"),
            "utf8"
          )
        )
      ),
      ["common"]
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
