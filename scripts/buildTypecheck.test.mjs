import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import typescript from "@rollup/plugin-typescript";
import { rollup } from "rollup";

test("noEmitOnError が TypeScript 型エラーを Rollup 失敗へ昇格する", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "es-rollup-typecheck-"));
  const inputFile = path.join(root, "index.ts");

  try {
    fs.writeFileSync(inputFile, "const value: string = 1;\n");

    await assert.rejects(
      () =>
        rollup({
          input: inputFile,
          plugins: [
            typescript({
              tsconfig: false,
              noEmitOnError: true,
              strict: true,
              target: ts.ScriptTarget.ES5,
              module: ts.ModuleKind.ESNext,
            }),
          ],
        }),
      /TS2322|not assignable to type/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
