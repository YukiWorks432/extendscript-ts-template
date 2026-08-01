import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";

import {
  collectImportDependencyFiles,
  getTypeScriptInputFiles,
} from "../rollup.config.mjs";

const normalize = (filePath) => filePath.replace(/\\/g, "/");

test("スクリプト単位のTypeScript範囲は相対依存と環境型だけを含む", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-build-scope-"));
  const sourceRoot = path.join(root, "src");
  const targetDir = path.join(sourceRoot, "common", "target");
  const siblingDir = path.join(sourceRoot, "common", "sibling");
  const typesDir = path.join(sourceRoot, "types");
  const runtimeDir = path.join(sourceRoot, "lib");

  try {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.mkdirSync(siblingDir, { recursive: true });
    fs.mkdirSync(typesDir, { recursive: true });
    fs.mkdirSync(runtimeDir, { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, "index.ts"),
      'import "../../init"; import "../shared";\n'
    );
    fs.writeFileSync(
      path.join(sourceRoot, "common", "shared.ts"),
      "export {};\n"
    );
    fs.writeFileSync(
      path.join(siblingDir, "index.ts"),
      "const unrelated: MissingType = 1;\n"
    );
    fs.writeFileSync(
      path.join(sourceRoot, "init.ts"),
      'import "./lib/runtime";\n'
    );
    fs.writeFileSync(
      path.join(runtimeDir, "runtime.js"),
      "module.exports = {};\n"
    );
    fs.writeFileSync(
      path.join(typesDir, "environment.d.ts"),
      "declare const app: unknown;\n"
    );

    const dependencies = collectImportDependencyFiles(
      path.join(targetDir, "index.ts")
    ).map(normalize);
    const typeScriptFiles = getTypeScriptInputFiles({
      appId: null,
      srcDir: targetDir,
      ambientTypeInputs: [typesDir],
    });

    assert.ok(
      dependencies.includes(normalize(path.join(sourceRoot, "init.ts")))
    );
    assert.ok(
      dependencies.includes(normalize(path.join(runtimeDir, "runtime.js")))
    );
    assert.ok(
      typeScriptFiles.includes(normalize(path.join(targetDir, "index.ts")))
    );
    assert.ok(
      typeScriptFiles.includes(
        normalize(path.join(sourceRoot, "common", "shared.ts"))
      )
    );
    assert.ok(
      typeScriptFiles.includes(
        normalize(path.join(typesDir, "environment.d.ts"))
      )
    );
    assert.equal(
      typeScriptFiles.includes(normalize(path.join(siblingDir, "index.ts"))),
      false
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("アプリ別tsconfigの環境型定義を範囲へ含める", () => {
  const files = getTypeScriptInputFiles({
    appId: "aeft",
    srcDir: "src/aeft/example",
    tsconfig: "src/aeft/tsconfig.json",
  });

  assert.ok(
    files.some((filePath) =>
      filePath.endsWith("types-for-adobe/AfterEffects/22.0/index.d.ts")
    )
  );
  assert.ok(
    files.some((filePath) =>
      filePath.endsWith("types-for-adobe/shared/XMPScript.d.ts")
    )
  );
});
