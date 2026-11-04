import fs from "node:fs";
import path from "node:path";

const BUILD_HASH_FILE = "dist/temp/build-hashes.json";
export const BUILD_HASH_PLUGIN_NAME = "persist-build-hashes";

export const loadBuildHashes = () => {
  try {
    if (!fs.existsSync(BUILD_HASH_FILE)) {
      return {};
    }

    const content = fs.readFileSync(BUILD_HASH_FILE, "utf8");
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn(
      "ハッシュ履歴の読み込みに失敗したため、全件ビルドします。",
      error
    );
    return {};
  }
};

export const saveBuildHashes = (hashes, buildHashFile = BUILD_HASH_FILE) => {
  const targetPath = path.resolve(buildHashFile);
  const temporaryPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  try {
    fs.writeFileSync(temporaryPath, JSON.stringify(hashes, null, 2), "utf8");
    fs.renameSync(temporaryPath, targetPath);
  } catch (error) {
    try {
      fs.rmSync(temporaryPath, { force: true });
    } catch {
      // 元の履歴を保持することを優先し、一時ファイルの削除失敗は元のエラーに委ねる。
    }
    throw error;
  }
};

export const getBuildHashState = (option) =>
  option.plugins?.find((plugin) => plugin?.name === BUILD_HASH_PLUGIN_NAME)
    ?.buildHashState;
