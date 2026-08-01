import os from "os";
import path from "path";
import process from "process";
import { pathToFileURL } from "url";

import { rollup } from "rollup";
import { loadConfigFile } from "rollup/loadConfigFile";

import { BUILD_HASH_PLUGIN_NAME, saveBuildHashes } from "../rollup.config.mjs";
import {
  BuildArgumentError,
  getDefaultConcurrency,
  parseBuildArguments,
} from "./buildOptions.mjs";
import { BuildSchedulerError, runBuildJobs } from "./buildScheduler.mjs";

const getBuildHashState = (option) => {
  const plugin = (option.plugins || []).find(
    (candidate) => candidate && candidate.name === BUILD_HASH_PLUGIN_NAME
  );
  return plugin ? plugin.buildHashState : null;
};

export const findBuildHashState = (options) => {
  const states = options.map(getBuildHashState).filter(Boolean);
  if (states.length === 0) {
    throw new Error("ビルドハッシュの調停情報を取得できませんでした。");
  }

  const firstState = states[0];
  if (states.some((state) => state.hashes !== firstState.hashes)) {
    throw new Error("ビルドハッシュの調停情報が対象間で一致しません。");
  }

  return firstState;
};

const getTargetMetadata = (option, index) => {
  const state = getBuildHashState(option);
  const metadata = state && state.metadata;
  if (!metadata || !metadata.targetName) {
    throw new Error(
      `ビルド対象 ${index + 1} の識別情報を取得できませんでした。`
    );
  }
  return metadata;
};

const getOutputOptions = (option) => {
  const output = option.output;
  if (output === undefined || output === null) {
    throw new Error("Rollup設定に出力先がありません。");
  }
  return Array.isArray(output) ? output : [output];
};

export const buildOne = async ({ option, rollupFn = rollup }) => {
  const { output, watch: _watch, ...inputOptions } = option;
  const bundle = await rollupFn(inputOptions);

  try {
    for (const outputOption of getOutputOptions({ output })) {
      await bundle.write(outputOption);
    }
  } finally {
    await bundle.close();
  }
};

const compareLabels = (left, right) => {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

export const executeBuild = async ({
  options,
  hashState,
  concurrency,
  rollupFn = rollup,
  saveHashes = saveBuildHashes,
}) => {
  const jobs = options.map((option, index) => ({
    label: getTargetMetadata(option, index).targetName,
    option,
  }));

  const results = await runBuildJobs({
    jobs,
    concurrency,
    run: async (job) => {
      await buildOne({ option: job.option, rollupFn });
      return { label: job.label, status: "成功" };
    },
  });

  saveHashes(hashState.hashes);
  return results
    .slice()
    .sort((left, right) => compareLabels(left.label, right.label));
};

const getAvailableParallelism = () => {
  if (typeof os.availableParallelism === "function") {
    try {
      return os.availableParallelism();
    } catch (_error) {
      // 古い実行環境や実行時の取得失敗ではCPU数へフォールバックします。
    }
  }

  return os.cpus().length;
};

const printUsage = () => {
  console.log(`使い方: pn build [--all|-a] [--app=<appId>] [--concurrency=<正整数>]

既定の並列度: min(4, 利用可能な並列数, 対象件数)
--concurrency=1 を指定すると、範囲限定を維持したまま逐次実行します。
監視ビルドは pn watch で実行し、この指定の対象外です。`);
};

const restoreEnvironmentValue = (name, value) => {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
};

const main = async () => {
  let argumentsConfig;
  try {
    argumentsConfig = parseBuildArguments(process.argv.slice(2), process.env);
  } catch (error) {
    if (error instanceof BuildArgumentError) {
      console.error(`ビルド引数エラー: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  if (argumentsConfig.help) {
    printUsage();
    return;
  }

  const previousApp = process.env.EXTENDSCRIPT_BUILD_APP;
  const previousBuildAll = process.env.BUILD_ALL;
  const previousDefer = process.env.EXTENDSCRIPT_DEFER_BUILD_HASHES;

  try {
    if (argumentsConfig.app === null) {
      delete process.env.EXTENDSCRIPT_BUILD_APP;
    } else {
      process.env.EXTENDSCRIPT_BUILD_APP = argumentsConfig.app;
    }
    if (argumentsConfig.all) {
      process.env.BUILD_ALL = "1";
    }
    process.env.EXTENDSCRIPT_DEFER_BUILD_HASHES = "1";

    const configPath = path.resolve("rollup.config.mjs");
    const { options, warnings } = await loadConfigFile(configPath, {});
    warnings.flush();

    const hashState = findBuildHashState(options);
    const requestedConcurrency =
      argumentsConfig.concurrency ??
      getDefaultConcurrency(options.length, getAvailableParallelism());
    const concurrency = Math.min(requestedConcurrency, options.length);

    console.log(`並列度 ${concurrency} で ${options.length} 件を実行します。`);
    const results = await executeBuild({
      options,
      hashState,
      concurrency,
    });

    console.log("ビルド結果:");
    results.forEach(({ label, status }) => {
      console.log(`- ${label}: ${status}`);
    });
  } catch (error) {
    if (error instanceof BuildSchedulerError) {
      console.error(`ビルドに失敗しました: ${error.message}`);
      console.error("失敗を検出したため、未開始の処理は停止しました。");
    } else {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`ビルドに失敗しました: ${message}`);
    }
    process.exitCode = 1;
  } finally {
    restoreEnvironmentValue("EXTENDSCRIPT_BUILD_APP", previousApp);
    restoreEnvironmentValue("BUILD_ALL", previousBuildAll);
    restoreEnvironmentValue("EXTENDSCRIPT_DEFER_BUILD_HASHES", previousDefer);
  }
};

const isMainModule =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMainModule) {
  await main();
}
