import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} from "node:worker_threads";
import { buildOne } from "./build.mjs";
import { getBuildHashState } from "./buildState.mjs";
import { runBuildJobs } from "./buildScheduler.mjs";

if (isMainThread) {
  const [manifestPath, concurrencyText] = process.argv.slice(2);
  const plan = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const clients = Array.from({ length: Number(concurrencyText) }, () => {
    const worker = new Worker(new URL(import.meta.url), {
      workerData: manifestPath,
    });
    let pending = null;
    let failure = null;
    worker.on("message", (message) => {
      const current = pending;
      pending = null;
      if (message.error) current.reject(new Error(message.error));
      else current.resolve();
    });
    worker.on("error", (error) => {
      failure = error;
      pending?.reject(error);
      pending = null;
    });
    worker.on("exit", (code) => {
      failure ??= new Error(
        `ビルドワーカーが終了しました（終了コード: ${code}）。`
      );
      pending?.reject(failure);
      pending = null;
    });
    return {
      worker,
      build(targetName) {
        if (failure) return Promise.reject(failure);
        return new Promise((resolve, reject) => {
          pending = { resolve, reject };
          worker.postMessage(targetName);
        });
      },
    };
  });
  try {
    await runBuildJobs({
      jobs: plan.targets.map((target) => ({ label: target.targetName })),
      concurrency: clients.length,
      run: (job, _index, workerIndex) => clients[workerIndex].build(job.label),
    });
  } catch (error) {
    console.error(`ビルドに失敗しました: ${error.message}`);
    process.exitCode = 1;
  } finally {
    // スケジューラーが開始済みの出力・closeBundleを待った後で終了する。
    await Promise.all(clients.map((client) => client.worker.terminate()));
  }
} else {
  process.env.EXTENDSCRIPT_BUILD_PHASE = "bundle";
  process.env.EXTENDSCRIPT_BUILD_MANIFEST = workerData;
  process.env.EXTENDSCRIPT_DEFER_BUILD_HASHES = "1";
  const plan = JSON.parse(fs.readFileSync(workerData, "utf8"));
  const { default: config } = await import(
    pathToFileURL(path.resolve("rollup.config.mjs"))
  );
  parentPort.on("message", async (targetName) => {
    try {
      process.env.EXTENDSCRIPT_BUILD_TARGET = targetName;
      // 設定の追加プラグインや出力先も、実行する対象ごとに適用する。
      const options = await (typeof config === "function"
        ? config({ ...plan.args })
        : config);
      const option = options.find(
        (candidate) =>
          getBuildHashState(candidate)?.metadata.targetName === targetName
      );
      if (!option)
        throw new Error(`Rollup設定に対象がありません: ${targetName}`);
      await buildOne({ option });
      parentPort.postMessage({});
    } catch (error) {
      parentPort.postMessage({
        error: [error.plugin, error.hook, error.message, error.frame]
          .filter(Boolean)
          .join("\n"),
      });
    }
  });
}
