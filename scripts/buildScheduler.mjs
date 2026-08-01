export class BuildSchedulerError extends Error {
  constructor(job, cause) {
    const label = job.label || job.name || "対象不明";
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`${label}: ${message}`);
    this.name = "BuildSchedulerError";
    this.job = job;
    this.cause = cause;
  }
}

export const runBuildJobs = async ({ jobs, concurrency, run }) => {
  if (!Array.isArray(jobs)) {
    throw new TypeError("jobs には配列を指定してください。");
  }
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new RangeError("concurrency には1以上の整数を指定してください。");
  }
  if (typeof run !== "function") {
    throw new TypeError("run には関数を指定してください。");
  }

  const results = new Array(jobs.length);
  let nextIndex = 0;
  let failure = null;

  const worker = async () => {
    while (true) {
      if (failure || nextIndex >= jobs.length) {
        return;
      }

      const index = nextIndex;
      nextIndex += 1;
      const job = jobs[index];

      try {
        results[index] = await run(job, index);
      } catch (error) {
        if (failure === null) {
          failure = { job, cause: error };
        }
        return;
      }
    }
  };

  const workerCount = Math.min(concurrency, jobs.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  if (failure !== null) {
    throw new BuildSchedulerError(failure.job, failure.cause);
  }

  return results;
};
