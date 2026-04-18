# はじめに

このガイドでは、テンプレートを使って新しい ExtendScript プロジェクトを始める手順を説明します。

## 前提条件

- Node.js >= 20
- pnpm

## セットアップ

1. GitHub の `Use this template` から自分用のリポジトリを作成します
2. クローンして依存関係をインストールします：

```bash
git clone <your-repo-url>
cd <your-repo>
pnpm i
```

## 最初のスクリプトを作る

### 1. スクリプト追加

```bash
pnpm new -- --app=aeft --name=MyFirstScript --license
```

これにより以下が生成されます：

- `src/aeft/MyFirstScript/index.ts`（テンプレートコード）
- `es.config.mjs` にビルドエントリを追加

### 2. コードを書く

```ts
// src/aeft/MyFirstScript/index.ts
import "../../init";
import { entry } from "../../lib/lib";

entry("MyFirstScript", () => {
  const comp = app.project.activeItem as CompItem;
  if (!(comp instanceof CompItem)) return;

  const layers = comp.selectedLayers;
  for (let i = 0; i < layers.length; i++) {
    $.writeln(layers[i].name);
  }
});
```

### 3. ビルド

```bash
pnpm build
```

出力先: `dist/aeft/MyFirstScript/MyFirstScript.jsx`

### 4. Adobe アプリで実行

- After Effects: `File > Scripts > Run Script File...` からビルド済み `.jsx` を選択します
- Illustrator: `File > Scripts > Other Script...` からビルド済み `.jsx` を選択します
- Photoshop: `File > Scripts > Browse...` からビルド済み `.jsx` を選択します

## アプリ別の開発

各アプリのスクリプトは `src/{appId}/` に配置されています。
デフォルトで `aeft`（After Effects）、`ilst`（Illustrator）、`phxs`（Photoshop）が用意されています。

### 特定アプリのみビルド

```bash
pnpm build --app=aeft
```

### 新しいアプリを追加

```bash
pnpm add-app -- --app=idsn
```

## ディレクトリ構造

```
src/aeft/
  tsconfig.json        # AE 用の TypeScript 設定
  types/index.d.ts     # AE 固有の型定義を追加
  lib/                 # AE 固有のユーティリティを配置
  MyFirstScript/       # スクリプト本体
    index.ts           # エントリポイント
```

## よくあるパターン

### 共通ユーティリティを使う

`src/lib/lib.ts` に `entry()`、`entryUI()`、`alertError()` など全アプリ共通のユーティリティがあります。

```ts
import { entry, entryUI, alertError } from "../../lib/lib";
```

#### `entry` — 通常スクリプト用

```ts
entry("MyScript", () => {
  // 処理を書く
});
```

#### `entryUI` — ScriptUI パネル対応スクリプト用

ドッキングパネルとして使う場合は `entryUI` と `__ES_THIS__` を使います。
`__ES_THIS__` はビルド時にバンドル先頭へ自動注入されるグローバルな `this` です。

```ts
import { entryUI } from "../../lib/lib";

entryUI("MyScript", __ES_THIS__, (win) => {
  win.add("statictext", undefined, "Hello, ScriptUI!");
  // win は Panel（パネル起動時）または Window（スクリプト直接実行時）
});
```

| 起動方法                   | `__ES_THIS__` の値     | `entryUI` の動作                       |
| -------------------------- | ---------------------- | -------------------------------------- |
| スクリプトとして実行       | グローバルオブジェクト | `new Window("palette")` を生成して表示 |
| ドッキングパネルとして起動 | `Panel`                | 渡された `Panel` をそのまま使用        |

```ts
import { entry, alertError } from "../../lib/lib";
```

### アプリ固有のユーティリティを作る

`src/{appId}/lib/` にアプリ固有の関数を配置します。

```ts
// src/aeft/lib/comp-utils.ts
export function getActiveComp(): CompItem | null {
  const item = app.project.activeItem;
  return item instanceof CompItem ? item : null;
}
```

### 型定義を追加する

Types-for-Adobe に不足がある場合は `src/{appId}/types/index.d.ts` に追加します。

```ts
// src/aeft/types/index.d.ts
declare class SomeUndefinedClass {
  readonly name: string;
}
```

## 次のステップ

- `docs/project-overview.md` でプロジェクト構成の詳細を確認できます
- `docs/polyfills.md` で使用可能な ES6+ 機能を確認できます
- `es.config.mjs` でスクリプトのビルド設定を調整できます

## テンプレートのアップデートを取り込む

このリポジトリは `YukiWorks432/extendscript-ts-template` を元に作られたテンプレートリポジトリです。
元テンプレートにポリフィルやビルドツールの更新があった場合、以下の手順で自分のスクリプトを消さずに取り込めます。

### 0. GitHub Copilot を使う場合

Copilot が使える環境なら、`update-from-upstream` スキルに任せると自動で差分確認・取り込みができます。

### 1. 元テンプレートを「upstream」として登録する

初回のみ実行します（一度設定すれば次回以降は不要です）。

```bash
git remote add upstream https://github.com/YukiWorks432/extendscript-ts-template.git
```

登録できているか確認したい場合：

```bash
git remote -v
```

出力に `upstream` が表示されれば OK です。

### 2. 最新の情報を取得する

```bash
git fetch upstream
```

### 3. アップデート内容を確認する

元テンプレートと自分のリポジトリの差分を確認します：

```bash
git diff --name-status HEAD..upstream/main
```

### 4. インフラファイルだけ取り込む

自分のスクリプト（`src/aeft/<スクリプト名>/` など）は上書きしないよう、
インフラ部分だけを指定して取り込みます：

```bash
git checkout upstream/main -- scripts/ src/lib/ src/init.ts rollup.config.mjs tsconfig.json package.json
```

> **注意**: `es.config.mjs` には自分のスクリプト設定が含まれているため、上記コマンドには含めていません。
> 元テンプレートで `es.config.mjs` の構造が変わっていた場合は、手動で確認して反映してください。

### 5. 依存関係を更新してビルド確認する

```bash
pnpm install
pnpm build --all
```
