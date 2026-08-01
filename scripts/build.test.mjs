import test from "node:test";
import assert from "node:assert/strict";

import { BUILD_HASH_PLUGIN_NAME } from "../rollup.config.mjs";
import { executeBuild } from "./build.mjs";

const createOption = (label, hashes) => ({
  input: label,
  output: { file: `${label}.jsx`, format: "cjs" },
  plugins: [
    {
      name: BUILD_HASH_PLUGIN_NAME,
      buildHashState: {
        hashes,
        metadata: { targetName: label },
      },
    },
  ],
});

test("全件成功後だけハッシュ確定し、結果は対象名順に返す", async () => {
  const hashes = { first: "hash-first", second: "hash-second" };
  const saved = [];
  const options = [
    createOption("second", hashes),
    createOption("first", hashes),
  ];

  const results = await executeBuild({
    options,
    hashState: { hashes },
    concurrency: 2,
    rollupFn: async () => ({
      async write() {},
      async close() {},
    }),
    saveHashes: (value) => saved.push(value),
  });

  assert.deepEqual(
    results.map(({ label }) => label),
    ["first", "second"]
  );
  assert.deepEqual(saved, [hashes]);
});

test("失敗時は開始済みbundleを閉じ、ハッシュを保存しない", async () => {
  const hashes = { failing: "old", running: "old", later: "old" };
  const options = [
    createOption("failing", hashes),
    createOption("running", hashes),
    createOption("later", hashes),
  ];
  const started = [];
  const closed = [];
  const saved = [];
  let releaseRunning;
  const running = new Promise((resolve) => {
    releaseRunning = resolve;
  });

  const execution = executeBuild({
    options,
    hashState: { hashes },
    concurrency: 2,
    rollupFn: async (inputOptions) => {
      started.push(inputOptions.input);
      return {
        async write() {
          if (inputOptions.input === "failing") {
            throw new Error("出力失敗");
          }
          await running;
        },
        async close() {
          closed.push(inputOptions.input);
        },
      };
    },
    saveHashes: (value) => saved.push(value),
  });

  await Promise.resolve();
  releaseRunning();

  await assert.rejects(execution, /failing: 出力失敗/);
  assert.deepEqual(started, ["failing", "running"]);
  assert.deepEqual(closed.sort(), ["failing", "running"]);
  assert.deepEqual(saved, []);
});
