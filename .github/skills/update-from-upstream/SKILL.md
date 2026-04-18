---
name: update-from-upstream
description: "テンプレートリポジトリ（YukiWorks432/extendscript-ts-template）に更新があった場合に、自分のスクリプトを消さずに安全に取り込む。Use when: テンプレートの更新を取り込みたい、アップデートを確認したい、ポリフィルやビルドツールを最新化したい、upstream の変更を反映したい"
argument-hint: "確認のみ / 自動更新 / 特定ファイルのみ など、用途を指定できます"
---

# テンプレートのアップデートを取り込む

テンプレートリポジトリ (`YukiWorks432/extendscript-ts-template`) の最新の変更を、
**ユーザー自身のスクリプトを上書きせずに**安全に取り込む。

## When to Use

- 「テンプレートのアップデートを取り込みたい」
- 「ポリフィルやビルドスクリプトが古くなっていそう」
- 「元のリポジトリで何が変わったか確認したい」

## 更新対象ファイルの分類

### ✅ 自動的に更新するファイル（テンプレート管理のインフラ）

| パス                               | 説明                               |
| ---------------------------------- | ---------------------------------- |
| `scripts/`                         | ビルドツール・スクリプト生成ツール |
| `src/lib/`                         | 共通ポリフィル                     |
| `src/init.ts`                      | 初期化コード                       |
| `src/tests/`                       | テストインフラ                     |
| `src/types/`                       | グローバル型定義                   |
| `src/aeft/lib/`, `src/aeft/types/` | After Effects 共通ライブラリ・型   |
| `src/ilst/lib/`, `src/ilst/types/` | Illustrator 共通ライブラリ・型     |
| `src/phxs/lib/`, `src/phxs/types/` | Photoshop 共通ライブラリ・型       |
| `rollup.config.mjs`                | バンドル設定                       |
| `tsconfig.json`                    | TypeScript 設定                    |
| `eslint.config.mjs`                | Lint 設定                          |
| `package.json`                     | パッケージ情報・依存関係           |
| `.prettierrc`, `.prettierignore`   | フォーマット設定                   |
| `pnpm-workspace.yaml`              | ワークスペース設定                 |
| `.github/instructions/`            | Copilot 指示ファイル               |
| `.github/skills/add-script/`       | add-script スキル                  |
| `.github/copilot-instructions.md`  | Copilot 基本設定                   |
| `docs/`                            | ドキュメント                       |

### ❌ 自動更新しないファイル（ユーザーが管理するもの）

| パス                       | 説明                                                       |
| -------------------------- | ---------------------------------------------------------- |
| `src/aeft/<スクリプト名>/` | ユーザーの After Effects スクリプト                        |
| `src/ilst/<スクリプト名>/` | ユーザーの Illustrator スクリプト                          |
| `src/phxs/<スクリプト名>/` | ユーザーの Photoshop スクリプト                            |
| `es.config.mjs`            | スクリプトのビルド設定（ユーザーが追加したエントリを保持） |
| `README.md`                | ユーザーが書き換えた可能性がある                           |
| `LICENSE`                  | ユーザーが書き換えた可能性がある                           |

## Procedure

### 1. upstream リモートを確認・設定する

```bash
git remote -v
```

出力に `upstream` が含まれない場合は追加する:

```bash
git remote add upstream https://github.com/YukiWorks432/extendscript-ts-template.git
```

> **注意**: すでに `upstream` が設定されている場合はスキップする。

### 2. 最新の情報を取得する

```bash
git fetch upstream
```

### 3. 差分を確認・ユーザーに報告する

コミット差分を確認する:

```bash
git log HEAD..upstream/main --oneline
```

変更ファイル一覧を確認する:

```bash
git diff --name-status HEAD..upstream/main
```

取得した差分情報をもとに、以下を日本語でユーザーに報告する:

- 新しい機能・変更点の要約（コミットメッセージを元に）
- 自動更新対象のファイル一覧
- **`es.config.mjs` が変更されている場合**は、手動マージが必要な旨を明記する
- **差分がない場合**は「最新の状態です」と報告してスキルを終了する

### 4. 更新の方針をユーザーに確認する

`vscode_askQuestions` で以下を確認する:

```
header: "update-policy"
question: "アップデートを取り込みますか？"
options:
  - label: "インフラファイルのみ自動更新する（推奨）"
    description: "ユーザーのスクリプトは変更しません。"
    recommended: true
  - label: "差分の詳細を確認してから判断する"
    description: "変更ファイルごとの差分を確認します。"
  - label: "キャンセル"
```

「キャンセル」の場合はここで停止する。

「差分の詳細を確認」の場合は、自動更新対象ファイルそれぞれの差分 (`git diff HEAD..upstream/main -- <file>`) を表示し、再度確認を取る。

### 5. インフラファイルを upstream から取り込む

以下のコマンドで対象ファイルを取り込む（実際に upstream に存在するファイルのみ実行する）:

```bash
git checkout upstream/main -- scripts/
git checkout upstream/main -- src/lib/
git checkout upstream/main -- src/init.ts
git checkout upstream/main -- src/tests/
git checkout upstream/main -- src/types/
git checkout upstream/main -- src/aeft/lib/ src/aeft/types/
git checkout upstream/main -- src/ilst/lib/ src/ilst/types/
git checkout upstream/main -- src/phxs/lib/ src/phxs/types/
git checkout upstream/main -- rollup.config.mjs tsconfig.json eslint.config.mjs
git checkout upstream/main -- package.json .prettierrc .prettierignore pnpm-workspace.yaml
git checkout upstream/main -- .github/instructions/ .github/skills/add-script/ .github/copilot-instructions.md
git checkout upstream/main -- docs/
```

ファイルが upstream に存在しない場合は `error: pathspec` が出るのでスキップする。

### 6. `es.config.mjs` の構造が変わっていた場合

`git diff HEAD..upstream/main -- es.config.mjs` を確認する。

構造や新しいフィールドが追加されていれば、変更点をユーザーに提示し、手動で `es.config.mjs` を更新するよう案内する。
自動マージは行わない（ユーザーのスクリプト設定を破壊するリスクがあるため）。

### 7. 依存関係を更新する

```bash
pnpm install
```

`pnpm-lock.yaml` は自動生成されるため、checkout 対象には含めない。

### 8. ビルドを確認する

```bash
pnpm build --all
```

エラーがある場合は原因を調査・修正してから次のステップへ進む。

### 9. 完了を報告する

ユーザーに以下を伝える:

- 取り込んだ変更点の要約（日本語）
- ユーザーのスクリプトに影響する可能性のある変更がある場合は警告
- 変更をコミットするよう案内（例: `git add . && git commit -m "chore: upstream からアップデートを取り込む"`）

## Notes

- `pnpm-lock.yaml` は `pnpm install` で自動更新されるため、`git checkout` 対象から**除外**する
- ユーザーの `src/aeft/tsconfig.json` など、アプリフォルダ直下の tsconfig は更新対象外
- 大きな破壊的変更（API 変更など）がある場合は、自動更新を中断してユーザーに確認する
- `.github/skills/` 配下のユーザー独自スキル（`update-from-upstream` 自身を含む）は上書きしない
