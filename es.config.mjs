export default {
  // アプリごとにスクリプトを管理します.
  // src/{appId}/{scriptName}/index.ts がビルドされます.
  // 出力先は dist/{appId}/{scriptName}/{scriptName}.jsx です.
  scripts: {
    aeft: [
      {
        name: "AddWiggle",
        version: "0.0.1",
        build: true,
        license: true,
      },
      {
        name: "example",
        version: "0.0.1",
        build: true,
        license: false,
      },
    ],
    ilst: [
      {
        name: "example",
        version: "0.0.1",
        build: true,
        license: false,
      },
    ],
    phxs: [
      {
        name: "example",
        version: "0.0.1",
        build: true,
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
      build: true,
      license: true,
    },
  ],
};
