import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  TypecheckArgumentError,
  discoverTypeScriptConfigs,
  getTypecheckConfigs,
  parseTypecheckArguments,
  runTypecheck,
} from "./typecheck.mjs";

const makeProject = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-typecheck-"));
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          target: "ES5",
          module: "ESNext",
        },
        include: ["src/**/*.ts"],
      },
      null,
      2
    )
  );
  return root;
};

test("型チェック引数はアプリ指定とヘルプを解析する", () => {
  assert.deepEqual(parseTypecheckArguments([]), { app: null, help: false });
  assert.deepEqual(parseTypecheckArguments(["--app=aeft"]), {
    app: "aeft",
    help: false,
  });
  assert.deepEqual(parseTypecheckArguments(["--app", "ilst"]), {
    app: "ilst",
    help: false,
  });
  assert.equal(parseTypecheckArguments(["--help"]).help, true);
  assert.throws(
    () => parseTypecheckArguments(["--unknown"]),
    TypecheckArgumentError
  );
});

test("全体型チェックは追加されたアプリのtsconfigを自動検出する", () => {
  const root = makeProject();

  try {
    for (const appId of ["aeft", "ppro"]) {
      const appDir = path.join(root, "src", appId);
      fs.mkdirSync(appDir, { recursive: true });
      fs.writeFileSync(
        path.join(appDir, "tsconfig.json"),
        JSON.stringify({ extends: "../../tsconfig.json" })
      );
    }

    const discovered = discoverTypeScriptConfigs(root);
    assert.deepEqual(
      discovered.appConfigs.map(({ appId }) => appId),
      ["aeft", "ppro"]
    );
    assert.equal(getTypecheckConfigs({ projectRoot: root }).length, 3);
    assert.deepEqual(
      getTypecheckConfigs({ projectRoot: root, app: "ppro" }),
      [path.join(root, "src", "ppro", "tsconfig.json")]
    );
    assert.throws(
      () => getTypecheckConfigs({ projectRoot: root, app: "unknown" }),
      TypecheckArgumentError
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("TypeScript型エラーがある場合は型チェックを失敗扱いにする", () => {
  const root = makeProject();
  const sourcePath = path.join(root, "src", "index.ts");
  const tscPath = path.resolve("node_modules", "typescript", "bin", "tsc");

  try {
    fs.writeFileSync(sourcePath, 'const value: string = 1;\n');
    assert.equal(
      runTypecheck({ projectRoot: root, tscPath, stdio: "ignore" }),
      false
    );

    fs.writeFileSync(sourcePath, 'const value: string = "ok";\n');
    assert.equal(
      runTypecheck({ projectRoot: root, tscPath, stdio: "ignore" }),
      true
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
