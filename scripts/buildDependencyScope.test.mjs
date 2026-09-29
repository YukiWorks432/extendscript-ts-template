import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";

import {
  calculateInputHash,
  collectImportDependencyFiles,
  getUniqueSortedFiles,
  getTypeScriptInputFiles,
  getTypeScriptPluginOptions,
} from "../rollup.config.mjs";

const normalize = (filePath) => filePath.replace(/\\/g, "/");

test("ビルド入力はファイルと再帰ディレクトリから安定して集まる", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-build-inputs-"));
  const nestedDir = path.join(root, "nested");
  const hiddenDir = path.join(root, ".hidden", "nested");
  const nestedHiddenDir = path.join(root, ".hidden", ".nested");
  const topLevelFile = path.join(root, "first.d.ts");
  const nestedFile = path.join(nestedDir, "second.d.ts");
  const hiddenFile = path.join(hiddenDir, "third.d.ts");
  const dotFile = path.join(root, ".hidden", ".input.d.ts");
  const nestedDotFile = path.join(nestedHiddenDir, "input.d.ts");
  const missingPath = path.join(root, "missing.d.ts");
  const expectedFiles = [
    topLevelFile,
    nestedFile,
    hiddenFile,
    dotFile,
    nestedDotFile,
  ];

  try {
    fs.mkdirSync(nestedDir, { recursive: true });
    fs.mkdirSync(hiddenDir, { recursive: true });
    fs.mkdirSync(nestedHiddenDir, { recursive: true });
    expectedFiles.forEach((filePath) => fs.writeFileSync(filePath, filePath));

    const files = getUniqueSortedFiles([root, topLevelFile, missingPath]);
    assert.equal(files.length, expectedFiles.length);
    assert.ok(files.every((filePath) => path.isAbsolute(filePath)));
    expectedFiles.forEach((filePath) => assert.ok(files.includes(filePath)));
    assert.equal(files.includes(root), false);

    assert.deepEqual(
      files.map((filePath) => normalize(path.relative(root, filePath))),
      getUniqueSortedFiles([topLevelFile, root, nestedDir]).map((filePath) =>
        normalize(path.relative(root, filePath))
      )
    );
    assert.deepEqual(
      new Set(
        files.map((filePath) => normalize(path.relative(root, filePath)))
      ),
      new Set([
        "first.d.ts",
        "nested/second.d.ts",
        ".hidden/nested/third.d.ts",
        ".hidden/.input.d.ts",
        ".hidden/.nested/input.d.ts",
      ])
    );

    assert.notEqual(calculateInputHash([topLevelFile]), calculateInputHash([]));
    assert.equal(calculateInputHash([missingPath]), calculateInputHash([]));
    assert.equal(calculateInputHash([root]), calculateInputHash(expectedFiles));
    assert.equal(
      calculateInputHash([root, topLevelFile]),
      calculateInputHash([topLevelFile, root])
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("ビルド入力はディレクトリのシンボリックリンク先を再帰しない", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-build-symlink-"));
  const targetDir = path.join(root, "target");
  const linkedDir = path.join(root, "linked");
  const targetFile = path.join(targetDir, "input.d.ts");

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(targetFile, "declare const target: true;\n");

    try {
      fs.symlinkSync(
        targetDir,
        linkedDir,
        process.platform === "win32" ? "junction" : "dir"
      );
    } catch (error) {
      if (["EACCES", "ENOTSUP", "EPERM"].includes(error.code)) {
        t.skip(
          "この環境ではディレクトリのシンボリックリンクを作成できません。"
        );
        return;
      }
      throw error;
    }

    assert.deepEqual(getUniqueSortedFiles([root]), [targetFile]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

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
