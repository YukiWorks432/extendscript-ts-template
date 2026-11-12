import test from "node:test";
import assert from "node:assert/strict";

import {
  BuildArgumentError,
  getDefaultConcurrency,
  parseBuildArguments,
  parseConcurrencyValue,
  parseMemoryLimit,
} from "./buildOptions.mjs";

test("ビルド引数は長短形式と等号・分離形式を解析する", () => {
  assert.deepEqual(
    parseBuildArguments(["--all", "--app=aeft", "--concurrency=2", "--help"]),
    { target: null, all: true, app: "aeft", concurrency: 2, help: true }
  );
  assert.deepEqual(
    parseBuildArguments(["-a", "-h", "--app", "ilst", "--concurrency", "3"]),
    { target: null, all: true, app: "ilst", concurrency: 3, help: true }
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
    { target: null, all: false, app: "phxs", concurrency: 4, help: false }
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

test("メモリ上限は未指定時の既定値とMiB単位の正整数を受け付ける", () => {
  const name = "EXTENDSCRIPT_WORKER_MEMORY_MB";
  assert.equal(parseMemoryLimit(name, {}, 321), 321);
  assert.equal(parseMemoryLimit(name, { [name]: "768" }, 321), 768);
  for (const value of ["", "0", "-1", "1.5", "abc", "9007199254740992"]) {
    assert.throws(
      () => parseMemoryLimit(name, { [name]: value }, 321),
      BuildArgumentError
    );
  }
});

test("単体指定はアプリ別と共通の対象を受け付け、範囲の競合を拒否する", () => {
  assert.equal(parseBuildArguments(["aeft/MyScript"]).target, "aeft/MyScript");
  assert.equal(parseBuildArguments(["--", "tests"]).target, "tests");
  assert.equal(
    parseBuildArguments(["tests", "--concurrency=1"]).concurrency,
    1
  );
  for (const args of [
    ["one", "two"],
    [""],
    ["aeft/MyScript", "--app=aeft"],
    ["tests", "--all"],
  ]) {
    assert.throws(() => parseBuildArguments(args), BuildArgumentError);
  }
});
