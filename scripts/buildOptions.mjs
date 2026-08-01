export class BuildArgumentError extends Error {
  constructor(message) {
    super(message);
    this.name = "BuildArgumentError";
  }
}

const isTruthyFlag = (value) =>
  value !== undefined && value !== "" && value !== "false" && value !== "0";

export const parseConcurrencyValue = (value) => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new BuildArgumentError(
      `--concurrency には1以上の整数を指定してください（受け取った値: ${String(value)}）。`
    );
  }

  const concurrency = Number(value);
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new BuildArgumentError(
      `--concurrency には安全な範囲の1以上の整数を指定してください（受け取った値: ${value}）。`
    );
  }

  return concurrency;
};

export const getDefaultConcurrency = (targetCount, availableParallelism) => {
  if (!Number.isSafeInteger(targetCount) || targetCount < 1) {
    return 0;
  }

  const parallelism =
    Number.isSafeInteger(availableParallelism) && availableParallelism > 0
      ? availableParallelism
      : 1;

  return Math.min(4, parallelism, targetCount);
};

const takeValue = (argumentsList, index, optionName) => {
  const value = argumentsList[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new BuildArgumentError(
      `${optionName} の値がありません。例: ${optionName}=4`
    );
  }
  return value;
};

export const parseBuildArguments = (argumentsList = [], environment = {}) => {
  const result = {
    all: isTruthyFlag(environment.BUILD_ALL),
    app: null,
    concurrency: null,
    help: false,
  };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (argument === "--all" || argument === "-a") {
      result.all = true;
      continue;
    }

    if (argument === "--help" || argument === "-h") {
      result.help = true;
      continue;
    }

    if (argument === "--app") {
      if (result.app !== null) {
        throw new BuildArgumentError("--app は複数回指定できません。");
      }
      result.app = takeValue(argumentsList, index, "--app");
      index += 1;
      continue;
    }

    if (argument.startsWith("--app=")) {
      if (result.app !== null) {
        throw new BuildArgumentError("--app は複数回指定できません。");
      }
      const value = argument.slice("--app=".length);
      if (value === "") {
        throw new BuildArgumentError("--app の値がありません。例: --app=aeft");
      }
      result.app = value;
      continue;
    }

    if (argument === "--concurrency") {
      if (result.concurrency !== null) {
        throw new BuildArgumentError("--concurrency は複数回指定できません。");
      }
      result.concurrency = parseConcurrencyValue(
        takeValue(argumentsList, index, "--concurrency")
      );
      index += 1;
      continue;
    }

    if (argument.startsWith("--concurrency=")) {
      if (result.concurrency !== null) {
        throw new BuildArgumentError("--concurrency は複数回指定できません。");
      }
      result.concurrency = parseConcurrencyValue(
        argument.slice("--concurrency=".length)
      );
      continue;
    }

    throw new BuildArgumentError(`未知のビルドオプションです: ${argument}`);
  }

  return result;
};
