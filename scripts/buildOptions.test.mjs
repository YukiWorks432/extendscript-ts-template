import test from "node:test";
import assert from "node:assert/strict";

import {
  BuildArgumentError,
  getDefaultConcurrency,
  parseBuildArguments,
  parseConcurrencyValue,
} from "./buildOptions.mjs";

test("ビルド引数は全件指定、アプリ指定、並列度指定を解析する", () => {
  assert.deepEqual(
    parseBuildArguments(["--all", "--app", "aeft", "--concurrency=2"]),
    { all: true, app: "aeft", concurrency: 2, help: false }
  );
  assert.equal(parseBuildArguments([], { BUILD_ALL: "1" }).all, true);
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

  for (const value of ["", "0", "-1", "1.5", "abc", "1e2"]) {
    assert.throws(() => parseConcurrencyValue(value), BuildArgumentError);
  }
  assert.throws(() => parseBuildArguments(["--concurrency"]), /値がありません/);
  assert.throws(
    () => parseBuildArguments(["--unknown"]),
    /未知のビルドオプション/
  );
});
