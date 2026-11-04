import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
export const compiledFilePath = (cacheDir, sourceFile) => {
  const absolute = path.resolve(sourceFile).replaceAll("\\", "/");
  const canonical =
    process.platform === "win32" ? absolute.toLowerCase() : absolute;
  return path.join(
    cacheDir,
    createHash("sha256").update(canonical).digest("hex") + ".js"
  );
};

export const compiledTypescript = (cacheDir) => ({
  name: "compiled-typescript",
  resolveId(id) {
    if (id === "tslib") return require.resolve("tslib/tslib.es6.js");
    return null;
  },
  load(id) {
    if (!/\.(?:c|m)?tsx?$/i.test(id) || /\.d\.(?:c|m)?ts$/i.test(id))
      return null;
    const emitted = compiledFilePath(cacheDir, id);
    if (!fs.existsSync(emitted))
      this.error(`変換済みのTypeScriptがありません: ${id}`);
    return {
      code: fs.readFileSync(emitted, "utf8"),
      map: fs.existsSync(`${emitted}.map`)
        ? fs.readFileSync(`${emitted}.map`, "utf8")
        : null,
    };
  },
});
