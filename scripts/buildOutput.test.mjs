import test from "node:test";
import assert from "node:assert/strict";
import { promisify } from "node:util";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
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
