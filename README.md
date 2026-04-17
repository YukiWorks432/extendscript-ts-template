# extendscript-ts-template

複数の Adobe アプリ向け ExtendScript を TypeScript からトランスパイルして管理する軽量モノレポテンプレートです。

独自に調節した[es5-shim](https://github.com/es-shims/es5-shim)と[es6-shim](https://github.com/paulmillr/es6-shim)を注入することで、
ES6相当のライブラリを使用できます。  
TypeScriptからトランスパイルするため、文法は最新のものを使用できます。

ExtendScriptの制約により、`Symbol` `Promise`など、一部のライブラリはオミットされています。  
詳細は `docs/polyfills.md` を参照してください。  
また、shimの詳細な動作は各shimを参照してください。
shimの限界として、正しく動作しないものはeslintによってエラーとして表示されます。
また、一般的なprettierルールを同封しています。

型情報には[Types-for-Adobe](https://github.com/docsforadobe/Types-for-Adobe)を使用しています。  
これは有志によって作成されたもので、公式の情報ではないため、定義されていない情報がいくつもあります。足りない定義などがあればプルリクエストを検討してください。

## 対応アプリ

デフォルトで以下のアプリが設定済みです：

| アプリ | ID | ディレクトリ |
|-------|-----|------------|
| After Effects | `aeft` | `src/aeft/` |
| Illustrator | `ilst` | `src/ilst/` |
| Photoshop | `phxs` | `src/phxs/` |

`pnpm add-app -- --app=<appId>` で新しいアプリを追加できます。

## 環境 / Environment

- Node.js >= 20
- pnpm

## テスト環境 / Tested environment

- Node.js v22.15.0
- Windows 11
- AfterEffects 2025 / Illustrator 2025 / Photoshop 2025

## インストール / Install

このリポジトリはテンプレートリポジトリです。`Use this template`から自分用のリポジトリを作成してください。

```bash
pnpm i
pnpm build
```

## 使い方 / Usage

各アプリの `src/{appId}/` 内にスクリプトフォルダと `index.ts` を作成し、
`es.config.mjs` にエントリを登録します。

以下のコマンドで簡単にスクリプトを追加できます：

```shell
pnpm new -- --app=aeft --name=MyScript --license
```

対話式でも作成できます：

```shell
pnpm new
```

### es.config.mjs

```mjs
export default {
  scripts: {
    aeft: [
      {
        name: "example",      // src/aeft/example/index.ts がビルドされます
        version: "0.0.1",
        build: true,           // ビルドの可否
        license: true,         // LICENSE の内容を出力に挿入
      },
    ],
    ilst: [...],
    phxs: [...],
  },
  common: [
    {
      name: "tests",           // src/tests/index.ts がビルドされます
      version: "0.0.1",
      build: true,
      license: true,
    },
  ],
};
```

### スクリプトのテンプレート

```ts
// src/aeft/example/index.ts
import "../../init";
import { entry } from "../../lib/lib";

entry("example", () => {
  // TODO: Implement example
});
```

## ビルド / Build

```bash
pnpm build          # 変更のあるスクリプトをビルド
pnpm build --all    # 全スクリプトを強制ビルド
pnpm build --app=aeft  # 特定アプリのみビルド
```

出力先は `dist/{appId}/{ScriptName}/` です。

watchもあります。

```bash
pnpm watch
```

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `pnpm build` | 変更のあるスクリプトをビルド |
| `pnpm build --all` | 全スクリプトを強制ビルド |
| `pnpm build --app=aeft` | 特定アプリのみビルド |
| `pnpm watch` | ファイル変更を監視して自動ビルド |
| `pnpm lint` | ESLint でコード検査 |
| `pnpm format` | Prettier でコード整形 |
| `pnpm new` | 新規スクリプト追加 |
| `pnpm add-app` | 新規アプリ追加 |
| `pnpm clean` | ビルドハッシュをクリーンアップ |

## テスト / Test

`src/tests/index.ts`にテストを記述しています。
ビルドして実行すればダイアログが表示され、shimが想定通り動いているかが表示されます。

## ドキュメント

- [プロジェクト概要](docs/project-overview.md)
- [ポリフィル](docs/polyfills.md)
- [はじめに](docs/guides/getting-started.md)
