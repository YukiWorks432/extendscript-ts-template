import crypto from "crypto";
import fs from "fs";

/**
 * ハッシュ方式はビルドキャッシュの契約です。入力や正規化形式を変更する時は
 * 方式番号を上げ、直後の一度だけ全スクリプトを再ビルドします。
 */
export const SCRIPT_HASH_VERSION = 2;

export const hashText = (text) => {
  const hashSum = crypto.createHash("sha256");
  hashSum.update(text);
  return hashSum.digest("hex");
};

export const calculateFileHash = (filePath) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return hashText(fileBuffer);
  } catch (error) {
    console.error(`ファイルのハッシュ計算に失敗: ${filePath}`, error);
    return "unknown";
  }
};

const isPlainObject = (value) => {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const formatPath = (path) => (path ? `設定値 ${path}` : "設定値");

const normalizeJsonValue = (value, path, ancestors = new Set()) => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(
        `${formatPath(path)}には有限の数値だけを指定できます。`
      );
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      throw new TypeError(`${formatPath(path)}には循環参照を指定できません。`);
    }
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(value);
    return value.map((item, index) =>
      normalizeJsonValue(item, `${path}[${index}]`, nextAncestors)
    );
  }

  if (!isPlainObject(value)) {
    throw new TypeError(
      `${formatPath(path)}にはJSON互換値だけを指定できます（関数、循環参照、Date等は使用できません）。`
    );
  }

  if (ancestors.has(value)) {
    throw new TypeError(`${formatPath(path)}には循環参照を指定できません。`);
  }
  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);

  const normalized = {};
  Object.keys(value)
    .sort()
    .forEach((key) => {
      normalized[key] = normalizeJsonValue(
        value[key],
        path ? `${path}.${key}` : key,
        nextAncestors
      );
    });
  return normalized;
};

export const normalizeScriptConfig = (script) => {
  if (!isPlainObject(script)) {
    throw new TypeError(
      "スクリプト設定にはJSON互換のオブジェクトを指定してください。"
    );
  }

  const normalized = {};
  Object.keys(script)
    .sort()
    .forEach((key) => {
      // build は選択専用のため、成果物のハッシュを失効させません。
      normalized[key] = normalizeJsonValue(script[key], key);
    });
  delete normalized.build;

  // license の省略と license:false は同じ成果物契約として扱います。
  if (normalized.license === undefined || normalized.license === false) {
    normalized.license = false;
  }

  return Object.keys(normalized)
    .sort()
    .reduce((result, key) => {
      result[key] = normalized[key];
      return result;
    }, {});
};

export const serializeScriptConfig = (script) =>
  JSON.stringify(normalizeScriptConfig(script));

export const calculateScriptConfigHash = (script) =>
  hashText(`${SCRIPT_HASH_VERSION}:config:${serializeScriptConfig(script)}`);

export const calculateScriptHash = ({ inputHash, script }) =>
  hashText(
    `${SCRIPT_HASH_VERSION}:input:${inputHash}:config:${serializeScriptConfig(script)}`
  );

export const selectChangedScripts = ({
  scripts,
  previousBuildHashes,
  forceBuildAll = false,
  calculateHash,
}) => {
  const currentBuildHashes = {};
  const targetScripts = [];

  scripts.forEach((scriptContext) => {
    const scriptHash = calculateHash(scriptContext);
    currentBuildHashes[scriptContext.hashKey] = scriptHash;

    if (
      forceBuildAll ||
      previousBuildHashes[scriptContext.hashKey] !== scriptHash
    ) {
      targetScripts.push(scriptContext);
    }
  });

  return { targetScripts, currentBuildHashes };
};
