---
name: es-to-ts
description: 既存のExtendScript（.jsx・.js）を、このテンプレートのTypeScriptスクリプトへ移植する。
---

# 既存JSXをTypeScriptへ移植する

元のスクリプトを読み、対象アプリ、処理対象、UI、戻り値、副作用と実行順序を把握する。依頼とコードで分かる情報は聞き直さず、不明な仕様だけ確認する。

`.agents/instructions/extendscript.md` と [互換補正](../../../docs/polyfills.md) を参照する。入力のTypeScriptは4.9.5で扱える文法に限定し、出力はES3を維持する。

新規追加する場合は `add-script` の手順を使う。スキルを自動認識しないAIは `.agents/skills/add-script/SKILL.md` を明示して読む。既存の移植先を更新する場合は、再生成や重複登録を行わない。

## 移植時の判断

- 元の評価結果、短絡評価、副作用の順序を維持する。通常ビルドで補正される入れ子の三項演算子を、互換性のためだけに書き換えない。
- 通常の変更処理は `entry`、パネルの構築は `entryUI` と `__ES_THIS__` を使う。入力・確認にはScriptUIを使う。
- 型は対象アプリの宣言を参照し、不足分は実際のAPIを確認して補う。`Symbol`・`Promise`は使わない。
- 説明コメントは [説明コメントの正本](../../../docs/script-comment-block.md) に従い、元の機能と利用者の操作を記録する。

## 検証する

```sh
pnpm lint
pnpm exec oxfmt --write <変更ファイル...>
pnpm build <appId>/<ScriptName>
```

単体ビルドで移植先と依存先を型検査・再生成する。共有コードや型も変更した場合は [変更範囲に応じた検証](../../../docs/project-overview.md#変更範囲に応じた検証) へ進む。元の振る舞いを保証する回帰テストが必要な場合は追加する。

元のJSXと生成物の実機での比較結果、未確認の機能、生成先を報告する。ビルド成功だけで実機の同等性を断定しない。
