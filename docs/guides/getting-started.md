# はじめに

このガイドでは、テンプレートを使用して新しい ExtendScript プロジェクトを開始する手順を説明する。

## 前提条件

- Node.js >= 20
- pnpm

## セットアップ

1. GitHub の `Use this template` から自分用のリポジトリを作成する
2. クローンして依存関係をインストール：

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

これにより以下が生成される：
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

- After Effects: `File > Scripts > Run Script File...` からビルド済み `.jsx` を選択
- Illustrator: `File > Scripts > Other Script...` からビルド済み `.jsx` を選択
- Photoshop: `File > Scripts > Browse...` からビルド済み `.jsx` を選択

## アプリ別の開発

各アプリのスクリプトは `src/{appId}/` に配置される。
デフォルトで `aeft`（After Effects）、`ilst`（Illustrator）、`phxs`（Photoshop）が用意されている。

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

`src/lib/lib.ts` に `entry()`、`entryUI()`、`alertError()` など全アプリ共通のユーティリティがある。

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

ドッキングパネルとして使う場合は `entryUI` と `__ES_THIS__` を使う。
`__ES_THIS__` はビルド時にバンドル先頭へ自動注入されるグローバルな `this`。

```ts
import { entryUI } from "../../lib/lib";

entryUI("MyScript", __ES_THIS__, (win) => {
  win.add("statictext", undefined, "Hello, ScriptUI!");
  // win は Panel（パネル起動時）または Window（スクリプト直接実行時）
});
```

| 起動方法 | `__ES_THIS__` の値 | `entryUI` の動作 |
|---------|-------------------|------------------|
| スクリプトとして実行 | グローバルオブジェクト | `new Window("palette")` を生成して表示 |
| ドッキングパネルとして起動 | `Panel` | 渡された `Panel` をそのまま使用 |

```ts
import { entry, alertError } from "../../lib/lib";
```

### アプリ固有のユーティリティを作る

`src/{appId}/lib/` にアプリ固有の関数を配置する。

```ts
// src/aeft/lib/comp-utils.ts
export function getActiveComp(): CompItem | null {
  const item = app.project.activeItem;
  return item instanceof CompItem ? item : null;
}
```

### 型定義を追加する

Types-for-Adobe に不足がある場合は `src/{appId}/types/index.d.ts` に追加する。

```ts
// src/aeft/types/index.d.ts
declare class SomeUndefinedClass {
  readonly name: string;
}
```

## 次のステップ

- `docs/project-overview.md` でプロジェクト構成の詳細を確認
- `docs/polyfills.md` で使用可能な ES6+ 機能を確認
- `es.config.mjs` でスクリプトのビルド設定を調整
