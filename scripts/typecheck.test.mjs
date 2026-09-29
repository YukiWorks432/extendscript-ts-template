import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

import {
  TypecheckArgumentError,
  discoverTypeScriptConfigs,
  getTypecheckConfigs,
  parseTypecheckArguments,
} from "./typecheck.mjs";

const typecheckScriptPath = path.resolve("scripts/typecheck.mjs");

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

const linkNodeModules = (root) => {
  fs.symlinkSync(
    path.resolve("node_modules"),
    path.join(root, "node_modules"),
    "junction"
  );
};

const runTypecheckCli = (root, argumentsList = []) =>
  spawnSync(process.execPath, [typecheckScriptPath, ...argumentsList], {
    cwd: root,
    encoding: "utf8",
  });

test("型チェック引数はアプリ指定とヘルプを解析する", () => {
  assert.deepEqual(parseTypecheckArguments([]), { app: null, help: false });
  assert.deepEqual(parseTypecheckArguments(["--app=aeft"]), {
    app: "aeft",
    help: false,
  });
  assert.deepEqual(parseTypecheckArguments(["--", "--app=aeft"]), {
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
    assert.deepEqual(getTypecheckConfigs({ projectRoot: root, app: "ppro" }), [
      path.join(root, "src", "ppro", "tsconfig.json"),
    ]);
    assert.throws(
      () => getTypecheckConfigs({ projectRoot: root, app: "unknown" }),
      TypecheckArgumentError
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("型チェック CLI は型エラーで非0終了し、修正後は成功する", () => {
  const root = makeProject();
  const sourcePath = path.join(root, "src", "index.ts");

  try {
    linkNodeModules(root);
    fs.writeFileSync(sourcePath, "const value: string = 1;\n");
    const failed = runTypecheckCli(root);
    assert.equal(failed.status, 1, failed.stdout + failed.stderr);
    assert.match(failed.stdout + failed.stderr, /TS2322/);

    fs.writeFileSync(sourcePath, 'const value: string = "ok";\n');
    const succeeded = runTypecheckCli(root);
    assert.equal(succeeded.status, 0, succeeded.stdout + succeeded.stderr);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("アプリ限定型チェックは参照する共有コードも検査する", () => {
  const root = makeProject();
  const appDir = path.join(root, "src", "aeft");
  const appSourcePath = path.join(appDir, "index.ts");
  const sharedSourcePath = path.join(root, "src", "common", "shared.ts");

  try {
    linkNodeModules(root);
    fs.mkdirSync(appDir, { recursive: true });
    fs.mkdirSync(path.dirname(sharedSourcePath), { recursive: true });
    fs.writeFileSync(
      path.join(appDir, "tsconfig.json"),
      JSON.stringify({
        extends: "../../tsconfig.json",
        include: ["./**/*.ts"],
      })
    );
    fs.writeFileSync(
      appSourcePath,
      'import { sharedValue } from "../common/shared";\nconst value: string = sharedValue;\n'
    );
    fs.writeFileSync(
      sharedSourcePath,
      "export const sharedValue: string = 1;\n"
    );

    const failed = runTypecheckCli(root, ["--", "--app=aeft"]);
    assert.equal(failed.status, 1, failed.stdout + failed.stderr);
    assert.match(
      failed.stdout + failed.stderr,
      /src[\\/]common[\\/]shared\.ts/
    );
    assert.match(failed.stdout + failed.stderr, /TS2322/);

    fs.writeFileSync(
      sharedSourcePath,
      'export const sharedValue: string = "ok";\n'
    );
    const succeeded = runTypecheckCli(root, ["--", "--app=aeft"]);
    assert.equal(succeeded.status, 0, succeeded.stdout + succeeded.stderr);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
