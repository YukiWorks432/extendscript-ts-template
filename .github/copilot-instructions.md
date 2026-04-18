## 言語・回答スタイル

- 日本語で回答する
- 簡潔で分かりやすい説明を心がける
- ベストプラクティスは必要に応じて具体例つきで提示する
- パフォーマンスを重点的にチェックする
- ユーザーの提案に対して、専門家としてより良い実装案がないか検討する
- **質問、提案には必ず `vscode_askQuestions` ツールを使用する。** テキストで質問を列挙しない。
  選択肢を提示する場合は `options` を設定し、`allowFreeformInput: true`（デフォルト）のままにする。

## 開発ワークフロー

- コマンドは `package.json` の scripts に登録されているものを優先する
- コード生成後は `pnpm lint` と `pnpm format` を必ず実行する
- コードや設定を変更したら、必要に応じて `pnpm build` で確認する。変更範囲が広い場合は `pnpm build --all` を使う
- 新規スクリプト作成時は `pnpm new -- --app=<appId> --name=ScriptName --license` を使用する
- 実装に当たって、足りない情報があれば着手前に質問する。仕様を固めてから進める
- README.md は参照するが、実際のファイル配置や挙動と異なる場合は workspace の実態を優先する
- 文頭が `!` で始まる指示は即時着手する。重大なインシデントにつながる場合のみユーザーに確認する
- セッション開始時、変更の内容に合わせてセッション名/ブランチ名/worktree名を変更する

## ドキュメント

- `docs/` を適切に確認し、必要に応じて更新する
- プロジェクト構成・ビルド設定は `docs/project-overview.md` を参照
- ポリフィルの詳細は `docs/polyfills.md` を参照
- 初期セットアップ手順は `docs/guides/getting-started.md` を参照

## Git / PR 運用

- コミットメッセージ、PRタイトル、PR説明は日本語で記述する
- PR を作成・変更する際は、適切なラベルを設定する
- PR のマージは原則 Squash and merge。develop → main のマージ時は **必ず** Create a merge commit を使用する
- Issue 作成時は仕様が確定するまで GitHub に反映しない。仕様確定後に正式作成し、ラベルを設定する

## コードレビュー

- PRレビューを行う際は、**`review-pull-request` スキル**を使用する

## ローカルスキル

プロジェクト固有のスキルファイルを以下に定義する。該当するリクエストには必ず `read_file` でスキルファイルを読み込んでから対応すること。

<skills>
<skill>
<name>add-script</name>
<description>ExtendScript プロジェクトに新しいスクリプトを追加する。Use when: 新しいスクリプトを作成する、After Effects / Illustrator / Photoshop 向けのスクリプトを追加する、スクリプトの実装を開始する。</description>
<file>.github/skills/add-script/SKILL.md</file>
</skill>
<skill>
<name>update-from-upstream</name>
<description>テンプレートリポジトリ（YukiWorks432/extendscript-ts-template）の更新をユーザーのスクリプトを消さずに取り込む。Use when: テンプレートのアップデートを反映したい、ポリフィルやビルドツールを最新化したい、upstream の変更を確認・取り込みたい。</description>
<file>.github/skills/update-from-upstream/SKILL.md</file>
</skill>
</skills>
