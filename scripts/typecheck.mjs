import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export class TypecheckArgumentError extends Error {
  constructor(message) {
    super(message);
    this.name = "TypecheckArgumentError";
  }
}

const takeValue = (argumentsList, index, optionName) => {
  const value = argumentsList[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new TypecheckArgumentError(
      `${optionName} の値がありません。例: ${optionName}=aeft`
    );
  }
  return value;
};

export const parseTypecheckArguments = (argumentsList = []) => {
  const result = { app: null, help: false };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (argument === "--" && index === 0) {
      continue;
    }

    if (argument === "--help" || argument === "-h") {
      result.help = true;
      continue;
    }

    if (argument === "--app") {
      if (result.app !== null) {
        throw new TypecheckArgumentError("--app は複数回指定できません。");
      }
      result.app = takeValue(argumentsList, index, "--app");
      index += 1;
      continue;
    }

    if (argument.startsWith("--app=")) {
      if (result.app !== null) {
        throw new TypecheckArgumentError("--app は複数回指定できません。");
      }
      const value = argument.slice("--app=".length);
      if (value === "") {
        throw new TypecheckArgumentError(
          "--app の値がありません。例: --app=aeft"
        );
      }
      result.app = value;
      continue;
    }

    throw new TypecheckArgumentError(
      `未知の型チェックオプションです: ${argument}`
    );
  }

  return result;
};

export const discoverTypeScriptConfigs = (projectRoot = process.cwd()) => {
  const rootConfig = path.join(projectRoot, "tsconfig.json");
  if (!fs.existsSync(rootConfig)) {
    throw new Error(`tsconfig.json が見つかりません: ${rootConfig}`);
  }

  const sourceRoot = path.join(projectRoot, "src");
  const appConfigs = fs.existsSync(sourceRoot)
    ? fs
        .readdirSync(sourceRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          appId: entry.name,
          configPath: path.join(sourceRoot, entry.name, "tsconfig.json"),
        }))
        .filter(({ configPath }) => fs.existsSync(configPath))
        .toSorted((left, right) => left.appId.localeCompare(right.appId))
    : [];

  return { rootConfig, appConfigs };
};

export const getTypecheckConfigs = ({
  projectRoot = process.cwd(),
  app = null,
} = {}) => {
  const { rootConfig, appConfigs } = discoverTypeScriptConfigs(projectRoot);

  if (app === null) {
    return [rootConfig, ...appConfigs.map(({ configPath }) => configPath)];
  }

  const selected = appConfigs.find(({ appId }) => appId === app);
  if (!selected) {
    const available = appConfigs.map(({ appId }) => appId).join(", ") || "なし";
    throw new TypecheckArgumentError(
      `未対応のアプリIDです: ${app}（利用可能: ${available}）`
    );
  }

  return [selected.configPath];
};

export const runTypecheck = ({
  projectRoot = process.cwd(),
  app = null,
  tscPath = path.join(projectRoot, "node_modules", "typescript", "bin", "tsc"),
  stdio = "inherit",
  spawn = spawnSync,
} = {}) => {
  if (!fs.existsSync(tscPath)) {
    throw new Error(
      `TypeScript コンパイラが見つかりません: ${tscPath}。pnpm install を実行してください。`
    );
  }

  const configs = getTypecheckConfigs({ projectRoot, app });
  let failed = false;

  for (const configPath of configs) {
    const relativeConfig = path.relative(projectRoot, configPath);
    console.log(`型チェック: ${relativeConfig}`);

    const result = spawn(
      process.execPath,
      [tscPath, "--noEmit", "--project", configPath],
      {
        cwd: projectRoot,
        stdio,
      }
    );

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      failed = true;
    }
  }

  return !failed;
};

const printUsage = () => {
  console.log(`使い方: pnpm typecheck [-- --app=<appId>]

引数なしでは共通コードと全アプリを型チェックします。
--app=<appId> を指定すると、そのアプリの tsconfig だけを型チェックします。`);
};

const main = () => {
  let argumentsConfig;
  try {
    argumentsConfig = parseTypecheckArguments(process.argv.slice(2));
  } catch (error) {
    if (error instanceof TypecheckArgumentError) {
      console.error(`型チェック引数エラー: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  if (argumentsConfig.help) {
    printUsage();
    return;
  }

  try {
    if (!runTypecheck({ app: argumentsConfig.app })) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
};

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  main();
}
