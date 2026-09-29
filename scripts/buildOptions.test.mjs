import test from "node:test";
import assert from "node:assert/strict";

import {
  BuildArgumentError,
  getDefaultConcurrency,
  parseBuildArguments,
  parseConcurrencyValue,
} from "./buildOptions.mjs";

test("ビルド引数は長短形式と等号・分離形式を解析する", () => {
  assert.deepEqual(
    parseBuildArguments(["--all", "--app=aeft", "--concurrency=2", "--help"]),
    { all: true, app: "aeft", concurrency: 2, help: true }
  );
  assert.deepEqual(
    parseBuildArguments(["-a", "-h", "--app", "ilst", "--concurrency", "3"]),
    { all: true, app: "ilst", concurrency: 3, help: true }
  );

  assert.equal(parseBuildArguments(["-h"]).help, true);
  assert.equal(parseBuildArguments([], { BUILD_ALL: "1" }).all, true);
  assert.equal(parseBuildArguments([], { BUILD_ALL: "0" }).all, false);
});

test("同じ値オプションを複数指定した場合は最後の値を使う", () => {
  assert.deepEqual(
    parseBuildArguments([
      "--app=first",
      "--app",
      "phxs",
      "--concurrency=2",
      "--concurrency",
      "4",
    ]),
    { all: false, app: "phxs", concurrency: 4, help: false }
  );
});

test("既定並列度は対象件数と利用可能な並列数を上限にする", () => {
  assert.equal(getDefaultConcurrency(70, 16), 4);
  assert.equal(getDefaultConcurrency(3, 16), 3);
  assert.equal(getDefaultConcurrency(70, 2), 2);
  assert.equal(getDefaultConcurrency(0, 16), 0);
});

test("並列度は1以上の安全な整数だけを受け付ける", () => {
  assert.equal(parseConcurrencyValue("1"), 1);
  assert.equal(parseConcurrencyValue("004"), 4);

  for (const value of [
    "",
    "0",
    "-1",
    "1.5",
    "abc",
    "1e2",
    "9007199254740992",
  ]) {
    assert.throws(() => parseConcurrencyValue(value), BuildArgumentError);
  }
  assert.throws(
    () => parseBuildArguments(["--concurrency"]),
    BuildArgumentError
  );
  assert.throws(() => parseBuildArguments(["--app"]), BuildArgumentError);
  assert.throws(() => parseBuildArguments(["--app="]), BuildArgumentError);
  assert.throws(
    () => parseBuildArguments(["--concurrency=0"]),
    BuildArgumentError
  );
  assert.throws(() => parseBuildArguments(["--unknown"]), BuildArgumentError);
});
