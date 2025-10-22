export default {
  scripts: [
    {
      name: "a",
      version: "0.0.1",
      build: true,
      license: false,
    },
    {
      // src/tests/index.ts がビルドされます.
      name: "tests",
      // 出力ファイルのバナーに記載されます.
      version: "0.0.1",
      build: true,
      // src/tests/LICENSE の内容を出力ファイルに挿入します.
      // src/tests/LICENSE がない場合、./LICENSE が使用されます.
      license: true,
    },
    {
      // src/example/index.ts がビルドされます.
      name: "example",
      version: "0.0.1",
      build: true,
      // src/example/LICENSE の内容を出力ファイルに挿入します.
      license: true,
    },
  ],
};
