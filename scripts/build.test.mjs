import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";

import { saveBuildHashes } from "./buildState.mjs";
import { buildOne, executeBuild } from "./build.mjs";

test("全件成功後だけハッシュ確定し、結果は対象名順に返す", async () => {
  const hashes = { first: "hash-first", second: "hash-second" };
  const saved = [];
  let completed = false;
  const plan = {
    hashes,
    targets: [
      "phxs/Example",
      "common",
      "ilst/Example",
      "aeft/Zebra",
      "aeft/apple",
      "aeft/Example",
    ].map((targetName) => ({ targetName })),
  };
  const results = await executeBuild({
    prepare: async () => plan,
    bundle: async () => {
      completed = true;
    },
    saveHashes: (value) => {
      assert.equal(completed, true);
      saved.push(value);
    },
  });
  assert.deepEqual(
    results.map(({ label }) => label),
    [
      "aeft/Example",
      "aeft/Zebra",
      "aeft/apple",
      "common",
      "ilst/Example",
      "phxs/Example",
    ]
  );
  assert.deepEqual(saved, [hashes]);
});

test("型検査または出力の失敗時はハッシュを確定しない", async () => {
  for (const failingStage of ["prepare", "bundle"]) {
    const saved = [];
    let bundleStarted = false;
    await assert.rejects(
      executeBuild({
        prepare: async () => {
          if (failingStage === "prepare") throw new Error("型検査失敗");
          return { targets: [{ targetName: "aeft/example" }], hashes: {} };
        },
        bundle: async () => {
          bundleStarted = true;
          throw new Error("出力失敗");
        },
        saveHashes: (value) => saved.push(value),
      }),
      /型検査失敗|出力失敗/
    );
    assert.equal(bundleStarted, failingStage === "bundle");
    assert.deepEqual(saved, []);
  }
});

test("出力の成功・失敗のどちらでもbundleを閉じる", async () => {
  for (const fail of [false, true]) {
    let closed = false;
    const execution = buildOne({
      option: { input: "entry.ts", output: { file: "output.jsx" } },
      rollupFn: async () => ({
        async write() {
          if (fail) throw new Error("出力失敗");
        },
        async close() {
          closed = true;
        },
      }),
    });
    if (fail) await assert.rejects(execution, /出力失敗/);
    else await execution;
    assert.equal(closed, true);
  }
});

test("ハッシュ履歴の保存失敗時は既存内容を保持する", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-build-hash-"));
  const hashFile = path.join(root, "build-hashes.json");
  const existingContent = Buffer.from('{"existing":"hash"}');
  const originalWriteFileSync = fs.writeFileSync;

  try {
    fs.writeFileSync(hashFile, existingContent);
    t.mock.method(fs, "writeFileSync", (filePath, data, options) => {
      if (String(filePath).endsWith(".tmp")) {
        originalWriteFileSync.call(
          fs,
          filePath,
          String(data).slice(0, 2),
          options
        );
        throw new Error("ハッシュ履歴の保存失敗");
      }

      return originalWriteFileSync.call(fs, filePath, data, options);
    });

    assert.throws(
      () => saveBuildHashes({ next: "hash" }, hashFile),
      /ハッシュ履歴の保存失敗/
    );
    assert.deepEqual(fs.readFileSync(hashFile), existingContent);
    assert.deepEqual(fs.readdirSync(root), ["build-hashes.json"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
