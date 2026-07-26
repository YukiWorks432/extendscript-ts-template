/** @type {import("./src/types/es.config").EsConfig} */
const config = {
  // アプリごとにスクリプトを管理します.
  // src/{appId}/{scriptName}/index.ts がビルドされます.
  // 出力先は dist/{appId}/{scriptName}/{scriptName}.jsx です.
  scripts: {
    aeft: [
      {
        name: "example",
        version: "0.0.1",
        license: false,
      },
    ],
    ilst: [
      {
        name: "example",
        version: "0.0.1",
        license: false,
      },
    ],
    phxs: [
      {
        name: "example",
        version: "0.0.1",
        license: false,
      },
    ],
  },
  // アプリに依存しないスクリプト.
  // src/{scriptName}/index.ts がビルドされます.
  // 出力先は dist/{scriptName}/{scriptName}.jsx です.
  common: [
    {
      name: "tests",
      version: "0.0.1",
      license: true,
    },
  ],
};

export default config;
