import test from "node:test";
import assert from "node:assert/strict";

import { getBuildScriptAlias } from "./addApp.mjs";

test("新規アプリのビルド別名は単発ビルド経路を使う", () => {
  assert.equal(
    getBuildScriptAlias("idsn"),
    "node ./scripts/build.mjs --app=idsn"
  );
});
