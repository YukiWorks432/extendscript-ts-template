import test from "node:test";
import assert from "node:assert/strict";

import {
  SCRIPT_HASH_VERSION,
  calculateScriptConfigHash,
  normalizeScriptConfig,
  selectChangedScripts,
  serializeScriptConfig,
} from "./buildHash.mjs";

test("スクリプト設定は順序、整形、コメントに依存せず正規化される", () => {
  const first = {
    name: "example",
    version: "1.0.0",
    license: false,
    future: { z: [2, { b: true, a: null }], a: "value" },
    build: true,
  };
  const second = {
    future: { a: "value", z: [2, { a: null, b: true }] },
    version: "1.0.0",
    name: "example",
  };

  assert.equal(serializeScriptConfig(first), serializeScriptConfig(second));
  assert.equal(
    calculateScriptConfigHash(first),
    calculateScriptConfigHash(second)
  );
  assert.deepEqual(normalizeScriptConfig(second), {
    future: { a: "value", z: [2, { a: null, b: true }] },
    license: false,
    name: "example",
    version: "1.0.0",
  });
});

test("build はハッシュから除外し、license の省略と false を同値にする", () => {
  const withoutLicense = { name: "example", version: "1.0.0" };
  const withFalseLicense = {
    name: "example",
    version: "1.0.0",
    license: false,
  };

  assert.equal(
    calculateScriptConfigHash({ ...withoutLicense, build: false }),
    calculateScriptConfigHash(withFalseLicense)
  );
  assert.equal(normalizeScriptConfig(withoutLicense).license, false);
});

test("非対応の設定値と循環参照は理由付きで拒否する", () => {
  assert.throws(
    () => calculateScriptConfigHash({ name: "example", transform: () => null }),
    /JSON互換値/
  );

  const cyclic = { name: "example" };
  cyclic.options = cyclic;
  assert.throws(() => calculateScriptConfigHash(cyclic), /循環参照/);
});

test("差分選択は変更されたスクリプトだけを返し、強制指定を維持する", () => {
  const scripts = [
    { hashKey: "aeft/first", value: "same" },
    { hashKey: "aeft/second", value: "changed" },
  ];
  const calculateHash = ({ value }) => value;

  const result = selectChangedScripts({
    scripts,
    previousBuildHashes: { "aeft/first": "same", "aeft/second": "old" },
    calculateHash,
  });
  assert.deepEqual(
    result.targetScripts.map(({ hashKey }) => hashKey),
    ["aeft/second"]
  );
  assert.deepEqual(result.currentBuildHashes, {
    "aeft/first": "same",
    "aeft/second": "changed",
  });

  const forced = selectChangedScripts({
    scripts,
    previousBuildHashes: result.currentBuildHashes,
    forceBuildAll: true,
    calculateHash,
  });
  assert.equal(forced.targetScripts.length, scripts.length);
});

test("ハッシュ方式番号は明示されている", () => {
  assert.equal(typeof SCRIPT_HASH_VERSION, "number");
  assert.ok(SCRIPT_HASH_VERSION >= 2);
});
