# Repository Agent Instructions

このファイルは、このリポジトリで作業するエージェント共通の入口です。
長い手順は `docs/` と `.agents/` に委譲し、ここには強い束縛と参照先だけを残します。

## 優先順位

- 上位の system / developer / user 指示を最優先し、次にこの `AGENTS.md`、次に参照先 docs / skills に従ってください。
- Codex 向けの入口はこの `AGENTS.md` です。詳細手順は `.agents/`、ローカル Codex 設定は `.codex/` に置きます。
- GitHub Copilot 専用の `.github/copilot-instructions.md`、`.github/instructions/`、`.github/skills/` は正本にせず、この配布用リポジトリには置きません。
- 作業前にこの `AGENTS.md` を確認してください。対象ファイルに対応する追加指示がある場合は、その指示も確認してください。
- `src/**/*.ts` を編集する場合は、`.agents/instructions/extendscript.md` を確認してください。
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
- すべてのスクリプトの `index.ts` は先頭で `import "../../init"` を読み込み、ポリフィルを有効にしてください。
- ExtendScript の既知バグを避けるため、入れ子の三項演算子は使用しないでください。

### コマンドと品質ゲート

- コマンドは `package.json` の scripts を優先してください。
- コードを生成・編集した後は、変更範囲に応じて最小の `pnpm lint` / `pnpm format` / `pnpm build` を実行してください。
- 新規スクリプト作成時は `pnpm new -- --app=<appId> --name=<ScriptName> --license` を優先してください。
- 新規アプリ追加時は `pnpm add-app -- --app=<appId>` を使用してください。
- README や docs が実態と異なる場合は、workspace の実ファイルと挙動を優先し、必要なら docs を更新してください。

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
