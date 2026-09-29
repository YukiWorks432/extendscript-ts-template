import { parseArgs } from "node:util";

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

export const parseBuildArguments = (argumentsList = [], environment = {}) => {
  let values;
  try {
    ({ values } = parseArgs({
      args: argumentsList,
      options: {
        all: { type: "boolean", short: "a" },
        app: { type: "string" },
        concurrency: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      strict: true,
    }));
  } catch (error) {
    if (error instanceof TypeError) {
      throw new BuildArgumentError(error.message);
    }
    throw error;
  }

  if (values.app === "") {
    throw new BuildArgumentError("--app の値がありません。例: --app=aeft");
  }

  return {
    all: isTruthyFlag(environment.BUILD_ALL) || (values.all ?? false),
    app: values.app ?? null,
    concurrency:
      values.concurrency === undefined
        ? null
        : parseConcurrencyValue(values.concurrency),
    help: values.help ?? false,
  };
};
