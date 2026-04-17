# プロジェクト概要

ExtendScript を TypeScript からトランスパイルして作成するためのテンプレートリポジトリ。
複数の Adobe アプリ（After Effects, Illustrator, Photoshop 等）向けのスクリプトを1つのリポジトリで管理する軽量モノレポ構造。

## 技術スタック

- **言語**: TypeScript → ES3 にトランスパイル（ExtendScript 向け）
- **ビルド**: Rollup + Babel
- **型定義**: [Types-for-Adobe](https://github.com/docsforadobe/Types-for-Adobe)（有志による非公式定義、不足あり）
- **パッケージマネージャ**: pnpm

## ディレクトリ構成

```
src/                       # ソースコード
  init.ts                  # ポリフィル読み込みエントリ（全スクリプトで import 必須）
  lib/                     # 全アプリ共通ライブラリ
    polyfills/             # ES5/ES6/ESNext ポリフィル
    lib.ts                 # 汎用ユーティリティ（entry, entryUI, alertError）
  types/                   # 全アプリ共通の型定義
    index.d.ts             # Error, Application 拡張、__ES_THIS__ グローバル変数
  tests/                   # ポリフィルテスト（アプリ非依存）
  aeft/                    # After Effects 向けスクリプト
    tsconfig.json          # AE 用 TypeScript 設定（types-for-adobe/AfterEffects）
    types/                 # AE 固有の型定義
    lib/                   # AE 固有のユーティリティ
    <ScriptName>/          # 各スクリプト（index.ts がエントリ）
  ilst/                    # Illustrator 向けスクリプト
    tsconfig.json          # Illustrator 用 TypeScript 設定
    types/                 # Illustrator 固有の型定義
    lib/                   # Illustrator 固有のユーティリティ
    <ScriptName>/          # 各スクリプト
  phxs/                    # Photoshop 向けスクリプト
    tsconfig.json          # Photoshop 用 TypeScript 設定
    types/                 # Photoshop 固有の型定義
    lib/                   # Photoshop 固有のユーティリティ
    <ScriptName>/          # 各スクリプト
scripts/                   # ビルド補助スクリプト
  newScript.mjs            # 新規スクリプト追加ツール
  addApp.mjs               # 新規アプリスキャフォールディング
  cleanBuildHashes.mjs     # ビルドハッシュクリーンアップ
docs/                      # ドキュメント
dist/                      # ビルド出力（.gitignore）
  aeft/<ScriptName>/       # AE スクリプトの出力
  ilst/<ScriptName>/       # Illustrator スクリプトの出力
  phxs/<ScriptName>/       # Photoshop スクリプトの出力
```

## スクリプト管理（es.config.mjs）

`es.config.mjs` でアプリごとにスクリプトのビルド対象・バージョン・ライセンス有無を管理する。

```mjs
export default {
  scripts: {
    aeft: [
      {
        name: "MyScript",     // src/aeft/MyScript/index.ts に対応
        version: "0.0.1",
        build: true,           // true: ビルド対象
        license: true,         // true: ライセンスバナーを出力に挿入
      },
    ],
    ilst: [...],
    phxs: [...],
  },
  common: [
    {
      name: "tests",          // src/tests/index.ts に対応
      version: "0.0.1",
      build: true,
      license: true,
    },
  ],
};
```

## tsconfig 構成

- **ルート `tsconfig.json`**: 共通ベース設定（ES3 ターゲット、lib 設定、types なし）
- **`src/{appId}/tsconfig.json`**: ルートを `extends` し、アプリ固有の `types` のみ差し替え

| アプリ | tsconfig パス | types-for-adobe |
|-------|---------------|-----------------|
| After Effects | `src/aeft/tsconfig.json` | `AfterEffects/22.0` |
| Illustrator | `src/ilst/tsconfig.json` | `Illustrator/2022` |
| Photoshop | `src/phxs/tsconfig.json` | `Photoshop/2015.5` |

## 新規スクリプト追加

### CLI モード（AI エージェント向け）

```bash
pnpm new -- --app=aeft --name=MyScript --license
```

### 対話モード

```bash
pnpm new
```

実行すると以下が自動で行われる：
1. `es.config.mjs` の `scripts.{app}` 配列先頭にエントリ追加
2. `src/{app}/MyScript/index.ts` をテンプレートから生成
3. Prettier で `es.config.mjs` を整形

### テンプレート

生成される `index.ts` は以下の構造：

```ts
import "../../init";
import { entry } from "../../lib/lib";

entry("MyScript", () => {
  // TODO: Implement MyScript
});
```

**ScriptUI スクリプト（パネル対応）を作る場合は `entryUI` を使う：**

```ts
import "../../init";
import { entryUI } from "../../lib/lib";

entryUI("MyScript", __ES_THIS__, (win) => {
  win.add("statictext", undefined, "Hello!");
  // ここで UI を構築する
});
```

`__ES_THIS__` はビルド時にバンドル先頭へ自動注入されるグローバルな `this` で、
Extension Manager / Dockable パネルとして起動された場合は `Panel`、
スクリプトとして実行された場合はグローバルオブジェクトを返す。

### 予約名

以下の名前はスクリプト名として使用不可：
- `lib` — アプリ固有ユーティリティディレクトリと衝突
- `types` — 型定義ディレクトリと衝突
- `tests` — テストディレクトリと衝突

## 新規アプリ追加

```bash
pnpm add-app -- --app=idsn
```

実行すると以下を自動生成：
- `src/{app}/tsconfig.json`（types-for-adobe のマッピング付き）
- `src/{app}/types/index.d.ts`
- `src/{app}/lib/.gitkeep`
- `src/{app}/example/index.ts`
- `es.config.mjs` に `scripts.{app}` キーを追加

## 開発コマンド

| コマンド | 説明 |
|---------|------|
| `pnpm build` | 変更のあるスクリプトをビルド |
| `pnpm build --all` | 全スクリプトを強制ビルド |
| `pnpm build --app=aeft` | 特定アプリのスクリプトのみビルド |
| `pnpm watch` | ファイル変更を監視して自動ビルド |
| `pnpm lint` | ESLint でコード検査 |
| `pnpm format` | Prettier でコード整形 |
| `pnpm new` | 新規スクリプト追加（対話式 / CLI） |
| `pnpm add-app` | 新規アプリスキャフォールディング |
| `pnpm clean` | ビルドハッシュをクリーンアップ |

## 型情報について

[Types-for-Adobe](https://github.com/docsforadobe/Types-for-Adobe) を使用。
有志作成の非公式定義であり、未定義の API が存在する場合がある。
不足している型は以下に追加する：
- 全アプリ共通: `src/types/index.d.ts`
- アプリ固有: `src/{appId}/types/index.d.ts`
