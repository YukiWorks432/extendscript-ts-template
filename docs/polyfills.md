# ポリフィル

`src/init.ts`は、`extendscript-compat/runtime`を読み込み、JSONとES5・ES6の一部を補完します。各スクリプトは既存の`import "../../init"`で、この初期化をアプリ固有コードより先に実行します。

`parseInt`、`String.prototype.charAt`、`split`、`replace`は既存の関数がある場合も補正されます。変更は同じExtendScriptエンジンを共有する他のスクリプトにも及びます。同じエンジンでの再評価では、内部の版付き印により重複した適用を防ぎます。

実行時の機能と制限は[extendscript-compatの実行時補正](https://github.com/YukiWorks432/extendscript-compat/blob/main/runtime/README.ja.md)を参照してください。ES5・ES6のすべてを実装するものではなく、`Symbol`と`Promise`は使用できません。`JSON.parse`は一部の不正なJSONを受け入れるため、厳密な入力検証には使えません。

ビルド時には、`extendscriptCompat()`が優先順位、文字列と正規表現の特定のUnicode文字、対応できる`Number`呼び出しを補正します。生成したJSXにはUTF-8 BOMが付きます。補正の範囲は[ビルド時の互換補正](https://github.com/YukiWorks432/extendscript-compat/blob/main/docs/build-compatibility.ja.md)を参照してください。生成物には、同梱した互換コードのライセンスも含まれます。

生成物の結合テストでは、`extendscript-compat`の`assertES3Syntax()`で予約語を含むES3構文を検査し、`assertPrecedenceProtected()`で優先順位の保護を確認します。構文検査の実装と解析設定はライブラリ側で管理します。実行時APIやAdobe実機の動作は別途確認が必要です。

現在は構文検査APIの追加を検証するため、[ライブラリ側PR #42](https://github.com/YukiWorks432/extendscript-compat/pull/42)のコミットを`package.json`とロックファイルで固定参照しています。このAPIを含むnpm版の公開後、テンプレートのマージ前に公開版の固定指定へ置き換え、全体検証を行います。

## 型設定とAPIの選択

`moduleResolution: "node"` により、`extendscript-compat/runtime` の型宣言を読み込みます。`Array.at`、`Object.hasOwn`、`String.replaceAll` などの対応済みメソッドのために、`lib` へ `ES2022` や `ESNext` 全体を追加する必要はありません。

標準の `lib` は `ES5`、`ES2015.Core`、`ES2015.Iterable` です。`ES2015.Iterable` は既存の `Array.prototype.keys`・`values`・`entries` と、その `next()` の型を保つために残しています。反復プロトコル全体や `Symbol` の実行時対応を意味しません。配列以外への `for...of` や反復子を受け取るAPIは、型が通っても利用環境での確認が必要です。

`Map`、`Set`、`WeakMap`、`WeakSet`、`Proxy` のコンストラクターを許可する標準ライブラリと、条件付き対応の `Reflect` の型は読み込みません。必要な場合は実行時の提供元と対象アプリでの動作を確認してから追加してください。`ES5` と `ES2015.Core` も完全対応の保証ではなく、`Object.defineProperty` などの既存の禁止規則と `Symbol`・`Promise` の禁止は維持します。APIごとの制限は [実行時API対応表](https://github.com/YukiWorks432/extendscript-compat/blob/main/runtime/API-COMPATIBILITY.ja.md) を参照してください。

## 条件式と追加ポリフィル

通常のビルドを通すソースでは入れ子の三項演算子を使用できます。Terserの条件式最適化後に互換補正・検査を行うため、複雑な式を読みやすい `if` 文へ分ける判断と、実行時の評価順序の保護を分けて扱えます。補正しない手書きJSXや文字列の `eval` は対象外です。補正後に再圧縮すると保護が失われるため、生成物を変更する工程を後ろへ追加しないでください。

`src/lib/polyfills/esnext-shim.js`はテンプレート固有の追加用コードとして残しています。標準では読み込まれません。追加機能が必要な場合は内容と他の補正との重複を確認してから有効にし、`src/tests/index.ts`への検証追加と対象アプリでの動作確認を行ってください。
