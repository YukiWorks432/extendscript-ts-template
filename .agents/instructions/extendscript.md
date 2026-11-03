---
applyTo: "src/**/*.ts"
description: "ExtendScript (ES3) 向け TypeScript コーディングルール。src/ 以下のファイル編集時に適用。"
---

# ExtendScript コーディングルール

## ES3 制約

- ExtendScript は ES3 ベース。`src/` 以下の `.ts` コードは ES3 にトランスパイルされる
- `tsconfig.json` の `target: "ES3"` は変更しないこと
- TypeScript の診断は未解決のまま完了しないこと。無視可能な既知診断を追加する場合は、診断コードと適用条件を文書化すること

## 使用禁止機能

- `Symbol` / `Promise` は `src/` 以下で使用しないこと（ポリフィル対応不可）
- `alert()` / `confirm()` は使用しないこと（`new Window()` を使う）

## ディレクトリ構成

- スクリプトはアプリ別に `src/{appId}/{ScriptName}/index.ts` に配置される
- アプリ ID: `aeft`（After Effects）、`ilst`（Illustrator）、`phxs`（Photoshop）等
- 共通ライブラリ: `src/lib/`
- アプリ固有ライブラリ: `src/{appId}/lib/`
- 共通型定義: `src/types/`
- アプリ固有型定義: `src/{appId}/types/`

## init の import

すべてのスクリプトの `index.ts` で、先頭に `import "../../init"` を記述すること。
これによりポリフィルが読み込まれる。

## スクリプト説明コメント

`src/**/index.ts` の先頭、`import` より前には、
[スクリプト説明コメントブロック](../../docs/script-comment-block.md) を配置する。
スクリプトの対象、得られる結果、利用者向け手順が変わる場合は、説明コメントも同時に更新する。
内部実装だけの変更では更新を必須にしない。

## import パス

スクリプトからの相対 import パスは以下の通り：

```ts
import "../../init"; // ポリフィル
import { entry } from "../../lib/lib"; // 共通ユーティリティ
import { foo } from "../lib/bar"; // アプリ固有ユーティリティ
```

## ポリフィル

ポリフィルの詳細は `docs/polyfills.md` を参照。

- 追加APIは、先に `extendscript-compat/runtime` の対応範囲を確認する
- `ES2015.Iterable` は既存の配列反復APIの型に必要だが、`Symbol` や任意の反復可能オブジェクトの実行時対応を保証しない
- 別のポリフィルを追加する場合は、既存補正との重複と読み込み順を確認し、`src/tests/index.ts` と対象アプリで検証する

## ダイアログ作成

ユーザーへの入力要求・確認には `new Window()` を使用する：

```javascript
const dialog = new Window("dialog", "サンプルダイアログ");
dialog.add("statictext", undefined, "これはサンプルダイアログです。");
dialog.add("button", undefined, "OK");
dialog.add("button", undefined, "Cancel");

// ユーザーがキャンセルした場合は処理を中断
if (dialog.show() !== 1) return;
```

## 条件式と生成コードの補正

通常のビルドでは、Terserによる条件式の最適化後に `extendscriptCompat()` が論理演算子と入れ子の三項演算子へ必要な括弧を補い、最終出力を検査する。この経路を使うソースでは入れ子の三項演算子を使用できる。

```ts
const value = a ? (b ? "x" : "y") : "z";
```

読みやすさを優先し、分岐や副作用が複雑になる場合は `if` 文に分ける。単純な値の選択を、互換性対策だけのために即時呼び出し関数へ書き換える必要はない。

補正を通さない手書きJSXや `eval` に渡す文字列には、この保証は及ばない。補正後の生成物を別の生成器や圧縮器へ渡すと括弧が失われるため、コードを変更する工程は互換補正より前に置く。

詳細は [ビルド時の互換補正](https://github.com/YukiWorks432/extendscript-compat/blob/main/docs/build-compatibility.ja.md) を参照する。
