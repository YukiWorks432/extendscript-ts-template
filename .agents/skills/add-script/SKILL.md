---
name: add-script
description: Adobe向けの新規ExtendScriptを、既存の生成CLIで追加する。通常スクリプトやScriptUIの作成依頼に使う。
---

# 新規スクリプトを追加する

対象アプリと目的を依頼・既存設定から確認する。設定済みのアプリは `es.config.mjs`、追加できるアプリは `docs/project-overview.md` を参照する。存在しないAdobe APIを推測で使わない。

アプリや処理対象、データ変更の仕様が曖昧な場合は、未確定事項をまとめて確認する。指定済みの項目は聞き直さない。名称は既存規則に沿って提案し、指定がなければ採用して進める。UIの指定がなく通常実行で目的を満たせる場合は通常スクリプトとする。依頼が実装まで含む場合は、実装するかを再確認しない。雛形だけの依頼なら実装しない。

## 生成する

`.agents/instructions/extendscript.md` を読み、生成CLIを使う。

```sh
pnpm new -- --app=<appId> --name=<ScriptName> --license
```

ScriptUIの指定がある場合は `--ui=scriptui` を追加する。ライセンス表記を不要と指定された場合だけ `--license` を省略する。既存の登録と生成先を確認し、スクリプトの配置や `es.config.mjs` を手作業で重複登録しない。

生成した `index.ts` の説明コメントは [説明コメントの正本](../../../docs/script-comment-block.md) に従って完成させる。Material Symbols候補は公式一覧で実在を確認し、参照できない場合は同文書の代替手順に従う。

通常処理は `entry`、ScriptUIの構築は `entryUI` と `__ES_THIS__` を使う。UIから実行する変更処理は `entry` で囲む。雛形の `import "../../init"` を維持する。

## 検証する

```sh
pnpm lint
pnpm exec oxfmt --write <変更ファイル...>
pnpm build <appId>/<ScriptName>
```

単体ビルドは毎回再生成し、依存先も型検査する。共有コードや型も変更した場合は [変更範囲に応じた検証](../../../docs/project-overview.md#変更範囲に応じた検証) に従って全体検証する。必要な回帰テストを実行し、実機での確認結果はビルド結果と分ける。

生成したファイル、成果物のパス、検証結果、実機未確認の範囲を報告する。雛形だけの場合も説明コメントを用途へ合わせて検証する。
