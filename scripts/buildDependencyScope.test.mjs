import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";

import {
  collectImportDependencyFiles,
  getTypeScriptInputFiles,
  getTypeScriptPluginOptions,
} from "../rollup.config.mjs";

const normalize = (filePath) => filePath.replace(/\\/g, "/");

test("スクリプト単位のTypeScript範囲は相対依存と環境型だけを含む", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-build-scope-"));
  const sourceRoot = path.join(root, "src");
  const targetDir = path.join(sourceRoot, "common", "target");
  const siblingDir = path.join(sourceRoot, "common", "sibling");
  const typesDir = path.join(sourceRoot, "types");
  const runtimeDir = path.join(sourceRoot, "lib");
  const stringOnlyPath = path.join(siblingDir, "string-only.ts");
  const commentedPath = path.join(siblingDir, "commented.ts");
  const lazyPath = path.join(targetDir, "lazy.ts");

  try {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.mkdirSync(siblingDir, { recursive: true });
    fs.mkdirSync(typesDir, { recursive: true });
    fs.mkdirSync(runtimeDir, { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, "index.ts"),
      [
        "const text = 'import \"../sibling/string-only\";';",
        '/* import "../sibling/commented"; */',
        'import "../../init";',
        'export * from "../shared";',
        'const load = import("./lazy");',
      ].join("\n")
    );
    fs.writeFileSync(
      path.join(sourceRoot, "common", "shared.ts"),
      "export {};\n"
    );
    fs.writeFileSync(
      path.join(siblingDir, "index.ts"),
      "const unrelated: MissingType = 1;\n"
    );
    fs.writeFileSync(stringOnlyPath, "export {};\n");
    fs.writeFileSync(commentedPath, "export {};\n");
    fs.writeFileSync(lazyPath, "export {};\n");
    fs.writeFileSync(
      path.join(sourceRoot, "init.ts"),
      'const text = "// import \'./missing\';";\nimport "./lib/runtime";\n'
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
    assert.ok(dependencies.includes(normalize(lazyPath)));
    assert.equal(dependencies.includes(normalize(stringOnlyPath)), false);
    assert.equal(dependencies.includes(normalize(commentedPath)), false);
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

test("監視ビルドは従来のTypeScript設定を使い、単発ビルドだけ範囲を限定する", () => {
  const common = {
    appId: "aeft",
    srcDir: "src/aeft/example",
    tsconfig: "src/aeft/tsconfig.json",
  };
  const watchOptions = getTypeScriptPluginOptions({ ...common, watch: true });
  const buildOptions = getTypeScriptPluginOptions(common);

  assert.deepEqual(watchOptions, { tsconfig: common.tsconfig });
  assert.equal(buildOptions.filterRoot, false);
  assert.ok(Array.isArray(buildOptions.include));
});
