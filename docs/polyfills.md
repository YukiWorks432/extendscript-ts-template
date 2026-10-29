# ポリフィル

`src/init.ts`は、`extendscript-compat/runtime`を読み込み、JSONとES5・ES6の一部を補完します。各スクリプトは既存の`import "../../init"`で、この初期化をアプリ固有コードより先に実行します。

`parseInt`、`String.prototype.charAt`、`split`、`replace`は既存の関数がある場合も補正されます。変更は同じExtendScriptエンジンを共有する他のスクリプトにも及びます。同じエンジンでの再評価では、内部の版付き印により重複した適用を防ぎます。

実行時の機能と制限は[extendscript-compatの実行時補正](https://github.com/YukiWorks432/extendscript-compat/blob/main/runtime/README.ja.md)を参照してください。ES5・ES6のすべてを実装するものではなく、`Symbol`と`Promise`は使用できません。`JSON.parse`は一部の不正なJSONを受け入れるため、厳密な入力検証には使えません。

ビルド時には、`extendscriptCompat()`が優先順位、文字列と正規表現の特定のUnicode文字、対応できる`Number`呼び出しを補正します。生成したJSXにはUTF-8 BOMが付きます。補正の範囲は[ビルド時の互換補正](https://github.com/YukiWorks432/extendscript-compat/blob/main/docs/build-compatibility.ja.md)を参照してください。生成物には、同梱した互換コードのライセンスも含まれます。

`src/lib/polyfills/esnext-shim.js`はテンプレート固有の追加用コードとして残しています。標準では読み込まれません。追加機能が必要な場合は内容と他の補正との重複を確認してから有効にし、`src/tests/index.ts`への検証追加と対象アプリでの動作確認を行ってください。
