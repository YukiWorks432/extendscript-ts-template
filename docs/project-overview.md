# プロジェクト概要

ExtendScript を TypeScript からトランスパイルして作成するためのリポジトリ。
Adobe After Effects 向けのスクリプトを管理する。

## 技術スタック

- **言語**: TypeScript → ES3 にトランスパイル（ExtendScript 向け）
- **ビルド**: Rollup + Babel
- **型定義**: [Types-for-Adobe](https://github.com/docsforadobe/Types-for-Adobe)（有志による非公式定義、不足あり）
- **パッケージマネージャ**: pnpm

## ディレクトリ構成

```
src/                    # 各スクリプトのソースコード
  init.ts               # ポリフィル読み込みエントリ（全スクリプトで import 必須）
  lib/                  # 共通ライブラリ
    polyfills/          # ES5/ES6/ESNext ポリフィル
    aeft-utils.ts       # After Effects ユーティリティ
    lib.ts              # 汎用ユーティリティ
  types/                # カスタム型定義
  tests/                # ポリフィル等のテストコード
  <ScriptName>/         # 各スクリプト（index.ts がエントリ）
scripts/                # ビルド補助スクリプト
  newScript.mjs         # 新規スクリプト追加ツール
  cleanBuildHashes.mjs  # ビルドハッシュクリーンアップ
docs/                   # プロジェクトドキュメント
dist/                   # ビルド出力（.gitignore）
```

## スクリプト管理（es.config.mjs）

`es.config.mjs` で各スクリプトのビルド対象・バージョン・ライセンス有無を管理する。

```mjs
export default {
  scripts: [
    {
      name: "MyScript",     // src/MyScript/index.ts に対応
      version: "0.0.1",
      build: true,           // true: ビルド対象、false: スキップ
      license: true,         // true: ライセンスバナーを出力に挿入
    },
  ],
};
```

## 新規スクリプト追加

### 対話モード

```bash
pnpm new
```

### CLI モード（AI エージェント向け）

```bash
pnpm new -- --name=MyScript --license
```

実行すると以下が自動で行われる：
1. `es.config.mjs` の `scripts` 配列先頭にエントリ追加
2. `src/MyScript/index.ts` をテンプレートから生成
3. Prettier で `es.config.mjs` を整形

### テンプレート

生成される `index.ts` は以下の構造：

```ts
import "../init";
import { entry, isAVLayer } from "../lib/lib";

entry("MyScript", () => {
  // TODO: Implement MyScript
});
```

## 開発コマンド

| コマンド | 説明 |
|---------|------|
| `pnpm build` | 全スクリプトをビルド（`build: true` のもののみ） |
| `pnpm build --all` | 全スクリプトを強制ビルド |
| `pnpm watch` | ファイル変更を監視して自動ビルド |
| `pnpm lint` | ESLint でコード検査 |
| `pnpm format` | Prettier でコード整形 |
| `pnpm new` | 新規スクリプト追加（対話式 / CLI） |
| `pnpm clean` | ビルドハッシュをクリーンアップ |

## 型情報について

[Types-for-Adobe](https://github.com/docsforadobe/Types-for-Adobe) を使用。
有志作成の非公式定義であり、未定義の API が存在する場合がある。
不足している型は `src/types/index.d.ts` にプロジェクト固有の定義を追加する。
