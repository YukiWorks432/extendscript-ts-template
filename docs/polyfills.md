# ポリフィル

ExtendScript は ES3 ベースのため、ES5 以降の機能をポリフィルで補っている。
ポリフィルは `src/lib/polyfills/` に配置され、`src/init.ts` 経由で全スクリプトに注入される。

## ポリフィルファイル一覧

| ファイル | ベースライブラリ | 説明 |
|---------|----------------|------|
| `es5-shim.js` | [es5-shim](https://github.com/es-shims/es5-shim) | ES5 メソッドの補完。ExtendScript 向けに修正済み |
| `es6-shim.js` | [es6-shim](https://github.com/paulmillr/es6-shim) | ES6 メソッドの補完。ExtendScript 向けに修正済み |
| `esnext-shim.js` | 独自実装 | ES6 以降の機能を必要に応じて追加したポリフィル |
| `json2.js` | — | JSON パーサー |

## 使用不可な機能

以下の機能は ExtendScript の制約によりポリフィルで対応不可能：

- **`Symbol`**: 言語レベルのプリミティブ型であり、ポリフィルでは再現不可能
- **`Promise`**: 予約語の使用が必須となるため、ES3 環境では実装不可能

これらを `src/` 以下のコードで使用しないこと。ESLint でもエラーとして検出される。

## ポリフィルの追加・変更手順

1. 対象の shim ファイルを編集する
   - ES6 以降の機能は `esnext-shim.js` に追加する
   - 既存 shim の修正は元ライブラリとの差分を意識する
2. `src/tests/index.ts` にテストコードを追加する
3. `pnpm build` でビルドし、After Effects 上で動作確認する

## shim の制限事項

shim では正しく動作しない機能が存在する。
これらは ESLint ルールによってエラーとして表示される。
詳細は各 shim ファイルのコメントを参照。
