export const EXAMPLE_SCRIPT = {
  name: "example",
  version: "0.0.1",
  build: true,
  license: true,
};

const createScriptCommentBlock = (appId, name) => `/**
 * @script ${name}
 * @app ${appId}
 * @material-symbols TODO: 公式一覧を確認し、候補を3件カンマ区切りで記載
 * @description
 *   TODO: 対象・操作・得られる結果を1〜3文で記載
 *
 * @workflow
 *   1. TODO: 利用者から見た操作と結果を記載
 */`;

// types-for-adobe のアプリID → ディレクトリ名マッピング
export const APP_TYPES_MAP = {
  aeft: {
    dir: "AfterEffects/22.0",
    shared: ["shared/ScriptUI", "shared/XMPScript"],
  },
  ilst: {
    dir: "Illustrator/2022",
    shared: ["shared/ScriptUI"],
  },
  phxs: {
    dir: "Photoshop/2015.5",
    shared: ["shared/ScriptUI"],
  },
  idsn: {
    dir: "InDesign/2022",
    shared: ["shared/ScriptUI"],
  },
  ppro: {
    dir: "Premiere/24.0",
    shared: ["shared/ScriptUI"],
  },
  anmt: {
    dir: "Animate/22.0",
    shared: ["shared/ScriptUI"],
  },
  audt: {
    dir: "Audition/2018",
    shared: ["shared/ScriptUI"],
  },
};

function generateTsconfig(appId) {
  const mapping = APP_TYPES_MAP[appId];
  const types = [
    `../../node_modules/types-for-adobe/${mapping.dir}`,
    ...mapping.shared.map((s) => `../../node_modules/types-for-adobe/${s}`),
  ];

  return JSON.stringify(
    {
      extends: "../../tsconfig.json",
      compilerOptions: { types },
      include: ["./**/*", "../lib/**/*", "../types/**/*", "../init.ts"],
    },
    null,
    2
  );
}

export const getBuildScriptAlias = (appId) =>
  `node ./scripts/build.mjs --app=${appId}`;

export const createAppFiles = (appId) => ({
  ["src/" + appId + "/tsconfig.json"]: generateTsconfig(appId) + "\n",
  ["src/" + appId + "/types/index.d.ts"]:
    "// Type definitions specific to " + appId + ".\n",
  ["src/" + appId + "/lib/.gitkeep"]: "",
  ["src/" + appId + "/example/index.ts"]:
    `${createScriptCommentBlock(appId, EXAMPLE_SCRIPT.name)}\n\nimport "../../init";\nimport { entry } from "../../lib/lib";\n\nentry("example", () => {\n  // TODO: Implement example\n});\n`,
});
