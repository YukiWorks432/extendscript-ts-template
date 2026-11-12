# Repository Agent Instructions

このファイルは、このリポジトリで作業するエージェント共通の入口です。
長い手順は `docs/` と `.agents/` に委譲し、ここには強い束縛と参照先だけを残します。

## 優先順位

- 上位の system / developer / user 指示を最優先し、次にこの `AGENTS.md`、次に参照先 docs / skills に従ってください。
- コーディングAI向けの共通入口はこの `AGENTS.md` です。詳細手順は `.agents/`、ローカル Codex 設定は `.codex/` に置きます。
- GitHub Copilot 専用の `.github/copilot-instructions.md`、`.github/instructions/`、`.github/skills/` は正本にせず、この配布用リポジトリには置きません。
- 作業前にこの `AGENTS.md` を確認してください。対象ファイルに対応する追加指示がある場合は、その指示も確認してください。
- `src/**/*.ts` を編集する場合は、`.agents/instructions/extendscript.md` を確認してください。
- Node.js と pnpm の対応版、TypeScript 4.9.5 固定の理由は、
  [`docs/adr/0001-typescript-4-9-5-for-es3.md`](docs/adr/0001-typescript-4-9-5-for-es3.md) を参照してください。
- 参照先 docs / skills とこのファイルが矛盾する場合は、このファイルを優先し、必要なら矛盾を報告してください。

## 必ず守ること

### 言語と説明

- ユーザー向けの説明・要約・確認は日本語で簡潔に行ってください。
- Commit Message / Issues / Pull Request は日本語で記述してください。
- ベストプラクティスを説明するときは、抽象論だけでなく具体例も示してください。

### 作業環境と安全性

- 既存のユーザー変更や別エージェントの未関連変更を勝手に戻さないでください。
- ファイル移動は原則 `git mv` を使用してください。
- 実装に必要な情報が足りず、推測すると仕様リスクが高い場合は、着手前に質問してください。
- `dist/` と `node_modules/` は生成物です。直接編集しないでください。

### ExtendScript / TypeScript

- `src/` 配下は ExtendScript 実行を前提に ES3 へトランスパイルされます。`tsconfig.json` の `target: "ES3"` は変更しないでください。
- `Symbol` / `Promise` は `src/` 配下で使用しないでください。ポリフィル対応できない前提で設計してください。
- ユーザー入力や確認には `alert()` / `confirm()` を使わず、ScriptUI の `new Window()` を使用してください。
- アプリ別スクリプトは `import "../../init"`、共通スクリプトは `import "../init"` をアプリ固有コードより先に読み込み、ポリフィルを有効にしてください。
- 入れ子の三項演算子は、通常のビルドで `extendscript-compat` の補正・検査を通す場合に使用できます。複雑な分岐は読みやすさを優先して `if` 文に分けてください。補正後の生成物を再圧縮しないでください。

### コマンドと品質ゲート

- コマンドは `package.json` の scripts を優先してください。
- 個別スクリプトの追加・修正は `pnpm build <appId>/<ScriptName>` で対象と依存先を型検査し、毎回その1件を再生成してください。共通スクリプトは `pnpm build <name>` を使います。
- 共有コード・型・ビルド基盤の変更は `pnpm typecheck`、関連テスト、`pnpm build --all` を実行してください。文書だけの変更は整形・リンク・差分の確認に絞ります。
- `pnpm lint` と必要な回帰テストを実行し、整形は `pnpm exec oxfmt --write <変更ファイル...>` に限定してください。検証範囲の正本は [変更範囲に応じた検証](docs/project-overview.md#変更範囲に応じた検証) です。
- TypeScript診断を未解決のまま完了しないでください。ビルド成功とAdobe実機での動作確認を区別して報告してください。
- 新規スクリプト作成時は `pnpm new -- --app=<appId> --name=<ScriptName> --license` を優先してください。
- 新規アプリ追加時は `pnpm add-app -- --app=<appId>` を使用してください。
- README や docs が実態と異なる場合は、workspace の実ファイルと挙動を優先し、必要なら docs を更新してください。

## 作業別の入口

| 作業                       | 読むスキル・正本                                           |
| -------------------------- | ---------------------------------------------------------- |
| 新規スクリプト             | `.agents/skills/add-script/SKILL.md`                       |
| 既存JSXの移植              | `.agents/skills/es-to-ts/SKILL.md`                         |
| 型・ビルドエラー           | `.agents/skills/debug-script/SKILL.md`                     |
| テンプレートの更新取り込み | `.agents/skills/update-from-upstream/SKILL.md`             |
| `src/**/*.ts` の編集       | `.agents/instructions/extendscript.md`                     |
| ビルドCLI・公開APIの変更   | `docs/public-contract.ja.md` と `docs/project-overview.md` |

スキルを自動認識しないAIでも、該当するMarkdownを明示して同じ手順を参照できます。

## 参照先

- プロジェクト構成・ビルド設定: `docs/project-overview.md`
- 初期セットアップ: `docs/guides/getting-started.md`
- 初学者向け説明: `docs/guides/for-beginners.md`
- ポリフィル詳細: `docs/polyfills.md`
- テンプレート利用後の初期整理: `docs/template-customization.md`
- 配布用リポジトリの運営方針: `docs/repository-operations.md`
- リリース手順: `docs/release-process.md`
- Codex ローカル設定: `.codex/README.md`
- スクリプト追加: `scripts/newScript.mjs` と `docs/project-overview.md`
- アプリ追加: `scripts/addApp.mjs` と `docs/project-overview.md`
- ExtendScript 追加指示: `.agents/instructions/extendscript.md`

## Tool Compatibility

- GitHub Copilot 固有の `vscode_askQuestions`、`run_vscode_command`、`read_file`、`file_search` などのツール名が古い手順に残っている場合、この環境で利用可能な最も近い手段に置き換えてください。
- 質問や選択肢提示が必要な場合は、利用可能な専用質問ツールを優先してください。使えない場合は、簡潔な日本語の質問で代替してください。
