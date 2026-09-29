import test from "node:test";
import assert from "node:assert/strict";
import { promisify } from "node:util";
import fs from "fs";
import os from "os";
import path from "path";
import process from "node:process";
import { execFile, spawnSync } from "child_process";
import { pathToFileURL } from "node:url";
import typescript from "@rollup/plugin-typescript";
import { loadConfigFile } from "rollup/loadConfigFile";

import { buildOne } from "./build.mjs";
import { BUILD_HASH_PLUGIN_NAME } from "../rollup.config.mjs";
const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();
const outputFiles = [
  "dist/aeft/example/example.jsx",
  "dist/ilst/example/example.jsx",
  "dist/phxs/example/example.jsx",
  "dist/tests/tests.jsx",
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
  fs.copyFileSync(
    path.resolve(projectRoot, "es.config.mjs"),
    path.join(root, "es.config.mjs")
  );
  fs.copyFileSync(
    path.resolve(projectRoot, "scripts/buildHash.mjs"),
    path.join(root, "scripts", "buildHash.mjs")
  );
  fs.symlinkSync(
    path.resolve(projectRoot, "node_modules"),
    path.join(root, "node_modules"),
    "junction"
  );
  fs.writeFileSync(
    path.join(root, "src", "aeft", "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        target: "ES5",
        module: "ESNext",
        moduleResolution: "Node",
        skipLibCheck: true,
      },
      include: ["**/*.ts"],
    })
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
