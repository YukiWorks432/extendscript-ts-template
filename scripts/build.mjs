import os from "os";
import path from "path";
import process from "process";
import { pathToFileURL } from "url";

import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { saveBuildHashes } from "./buildState.mjs";
import {
  BuildArgumentError,
  getDefaultConcurrency,
  parseBuildArguments,
  parseMemoryLimit,
} from "./buildOptions.mjs";

const getOutputOptions = (option) => {
  const output = option.output;
  if (output === undefined || output === null) {
    throw new Error("Rollup設定に出力先がありません。");
  }
  return Array.isArray(output) ? output : [output];
};

export const buildOne = async ({ option, rollupFn }) => {
  rollupFn ??= (await import("rollup")).rollup;
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

export const executeBuild = async ({
  prepare,
  bundle,
  saveHashes = saveBuildHashes,
}) => {
  const plan = await prepare();
  if (plan.targets.length === 0) return [];
  await bundle(plan);
  saveHashes(plan.hashes);
  return plan.targets
    .map(({ targetName, outputs }) => ({
      label: targetName,
      status: "成功",
      outputs,
    }))
    .toSorted((left, right) =>
      left.label < right.label ? -1 : left.label > right.label ? 1 : 0
    );
};

const runStage = (script, args, memoryMb, env) =>
  new Promise((resolve, reject) => {
    // コマンドラインの上限を優先し、親のNODE_OPTIONSによるヒープ拡大を防ぐ。
    const child = spawn(
      process.execPath,
      [
        `--max-old-space-size=${memoryMb}`,
        "--max-semi-space-size=8",
        fileURLToPath(new URL(script, import.meta.url)),
        ...args,
      ],
      { stdio: "inherit", windowsHide: true, env }
    );
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${script}: 終了コード ${code ?? signal}`));
    });
  });

const printUsage = () => {
  console.log(`使い方: pnpm build [<appId>/<ScriptName> | <共通スクリプト名>] [--concurrency=<正整数>]
        pnpm build [--all|-a] [--app=<appId>] [--concurrency=<正整数>]

単体指定は変更の有無にかかわらず、その1件を再生成します。
例: pnpm build aeft/MyScript / pnpm build tests
単体指定は --app・--all と併用できません。

既定の並列度: min(4, 利用可能な並列数, 対象件数)
--concurrency=1 を指定すると、範囲限定を維持したまま逐次実行します。
監視ビルドは pnpm watch で実行し、この指定の対象外です。`);
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

  let temporaryDirectory;
  try {
    const compilerMemory = parseMemoryLimit(
      "EXTENDSCRIPT_COMPILER_MEMORY_MB",
      process.env,
      512
    );
    const workerMemory = parseMemoryLimit(
      "EXTENDSCRIPT_WORKER_MEMORY_MB",
      process.env,
      192
    );
    temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "extendscript-build-")
    );
    const manifestPath = path.join(temporaryDirectory, "build.json");
    const environment = {
      ...process.env,
      EXTENDSCRIPT_DEFER_BUILD_HASHES: "1",
    };
    delete environment.EXTENDSCRIPT_BUILD_APP;
    delete environment.EXTENDSCRIPT_BUILD_PHASE;
    delete environment.EXTENDSCRIPT_BUILD_MANIFEST;
    const configArgs = {
      all: argumentsConfig.all,
      app: argumentsConfig.app,
      target: argumentsConfig.target,
    };
    const results = await executeBuild({
      prepare: async () => {
        await runStage(
          "./buildCompile.mjs",
          [manifestPath, JSON.stringify(configArgs)],
          compilerMemory,
          environment
        );
        return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      },
      bundle: async (plan) => {
        const requested =
          argumentsConfig.concurrency ??
          getDefaultConcurrency(plan.targets.length, os.availableParallelism());
        const concurrency = Math.min(requested, plan.targets.length);
        console.log(
          `並列度 ${concurrency} で ${plan.targets.length} 件を実行します。`
        );
        await runStage(
          "./buildBundle.mjs",
          [manifestPath, String(concurrency)],
          workerMemory,
          environment
        );
      },
    });
    if (results.length) {
      console.log("ビルド結果:");
      results.forEach(({ label, status, outputs }) => {
        console.log(`- ${label}: ${status}`);
        for (const output of outputs ?? []) console.log(`  ${output}`);
      });
    }
  } catch (error) {
    console.error(`ビルドに失敗しました: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (temporaryDirectory)
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
};

const isMainModule =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMainModule) {
  await main();
}
