import test from "node:test";
import assert from "node:assert/strict";

import { BuildSchedulerError, runBuildJobs } from "./buildScheduler.mjs";

test("実行中のビルド数は指定した上限を超えない", async () => {
  let active = 0;
  let maximumActive = 0;

  const results = await runBuildJobs({
    jobs: Array.from({ length: 9 }, (_, id) => ({ id })),
    concurrency: 3,
    run: async (job) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      return job.id;
    },
  });

  assert.equal(maximumActive, 3);
  assert.deepEqual(
    results,
    Array.from({ length: 9 }, (_, id) => id)
  );
});

test("失敗後に未開始の仕事を増やさず、開始済みの仕事を完了させる", async () => {
  const started = [];
  const closed = [];
  let releaseRunning;
  const running = new Promise((resolve) => {
    releaseRunning = resolve;
  });

  const execution = runBuildJobs({
    jobs: [
      { id: "失敗", label: "失敗対象" },
      { id: "実行中", label: "実行中対象" },
      { id: "未開始", label: "未開始対象" },
    ],
    concurrency: 2,
    run: async (job) => {
      started.push(job.id);
      try {
        if (job.id === "失敗") {
          throw new Error("意図した失敗");
        }
        await running;
      } finally {
        closed.push(job.id);
      }
    },
  });

  await Promise.resolve();
  releaseRunning();

  await assert.rejects(execution, (error) => {
    assert.ok(error instanceof BuildSchedulerError);
    assert.equal(error.job.id, "失敗");
    return true;
  });
  assert.deepEqual(started, ["失敗", "実行中"]);
  assert.deepEqual(closed.sort(), ["失敗", "実行中"]);
});
