import test from "node:test";
import assert from "node:assert/strict";
import { promisify } from "node:util";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";

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
  } finally {
    snapshots.forEach((snapshot, filePath) => restoreFile(filePath, snapshot));
  }
});
