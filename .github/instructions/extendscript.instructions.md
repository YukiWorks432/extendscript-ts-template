---
applyTo: "src/**/*.ts"
description: "ExtendScript (ES3) 向け TypeScript コーディングルール。src/ 以下のファイル編集時に適用。"
---

# ExtendScript コーディングルール

## ES3 制約

- ExtendScript は ES3 ベース。`src/` 以下の `.ts` コードは ES3 にトランスパイルされる
- `tsconfig.json` の `target: "ES3"` は変更しないこと
- ES3 トランスパイル時のプロンプト警告は無視してよい

## 使用禁止機能

- `Symbol` / `Promise` は `src/` 以下で使用しないこと（ポリフィル対応不可）
- `alert()` / `confirm()` は使用しないこと（`new Window()` を使う）

## init の import

すべてのスクリプトの `index.ts` で、先頭に `import "../init"` を記述すること。
これによりポリフィルが読み込まれる。

## ポリフィル

ポリフィルの詳細は `docs/polyfills.md` を参照。

- ES6 以降の機能追加時は `src/lib/polyfills/esnext-shim.js` への追加を検討する
- ポリフィル追加時は `src/tests/index.ts` にテストを追加する

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
