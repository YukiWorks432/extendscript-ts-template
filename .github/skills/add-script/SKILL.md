---
name: add-script
description: "ExtendScript プロジェクトに新しいスクリプトを追加する。Use when: 新しいスクリプトを作成する、特定の Adobe アプリ（aeft/ilst/phxs）向けのスクリプトを追加する、スクリプトの実装を開始する。"
argument-hint: "対象アプリ (aeft/ilst/phxs)、スクリプト名、スクリプトの用途を指定してください"
---

# ExtendScript 新規スクリプト追加

プロジェクトのスクリプト生成ツールを使って新規スクリプトを作成し、用途をコメントとして記録する。ユーザーの選択に応じてスケルトンで止めるか実装まで進める。

## When to Use

- ユーザーが「スクリプトを作る/追加したい」「新しいスクリプトを作成して」と言ったとき
- 対象 Adobe アプリ（aeft/ilst/phxs）とスクリプト名が示されたとき
- 新しい自動化処理・ツールスクリプトを始めるとき

## Procedure

### 1. 必要情報をまとめて収集する

ユーザーが指定していない項目を `vscode_askQuestions` で **一度にまとめて** 質問する。
すでに提供されている項目はスキップする（不要な質問を繰り返さない）。

収集する情報:

| 項目      | 説明                                      | デフォルト     |
| --------- | ----------------------------------------- | -------------- |
| `app`     | 対象アプリ ID（`aeft` / `ilst` / `phxs`） | なし（必須）   |
| `name`    | スクリプト名（PascalCase）                | なし（必須）   |
| `purpose` | スクリプトが何をするか（1〜3 文）         | なし（必須）   |
| `license` | ライセンスバナーを含めるか                | `true`（推奨） |

**予約名（使用不可）**: `lib`, `types`, `tests`

### 2. 実装方針をユーザーに確認する

`vscode_askQuestions` で以下を尋ねる:

```
header: "implementation"
question: "スクリプトの実装をどこまで進めますか？"
options:
  - label: "スケルトンのみ（コメント付記）"
    description: "ファイルを作成し、仕様をコメントとして記録します。実装は行いません。"
  - label: "実装まで着手する"
    description: "スクリプト作成から実装まで行います。"
```

### 3. スクリプトを生成する

ターミナルで以下を実行する:

```bash
pnpm new -- --app=<appId> --name=<ScriptName> --license
```

`--license` はユーザーが不要と明示した場合のみ省略する。

生成されるファイル:

- `es.config.mjs` に `<ScriptName>` エントリが追加される
- `src/<appId>/<ScriptName>/index.ts` にテンプレートが作成される

### 4. 用途（purpose）をファイルに記録する

`src/<appId>/<ScriptName>/index.ts` を開き、既存コンテンツの先頭（ライセンスバナーの直後、または冒頭）に以下のコメントブロックを追記する:

```typescript
/**
 * @script <ScriptName>
 * @app <appId>
 * @description
 *   <ユーザーが述べた用途を具体的に記述する>
 *
 * @workflow
 *   1. <期待する処理フローのステップ 1>
 *   2. <ステップ 2 ...>
 */
```

`@workflow` はユーザーの用途から推測して記述する。不明な場合は `TODO` として残す。

### 5. 作成したファイルをエディタで開く

`run_vscode_command` ツールで `vscode.open` を呼び出し、作成した `src/<appId>/<ScriptName>/index.ts` をエディタで開く。

### 6a. スケルトンモード — ここで完了

ユーザーが「スケルトンのみ」を選んだ場合:

- ファイルパス `src/<appId>/<ScriptName>/index.ts` をリンク付きでユーザーに報告する
- 「実装を進める際は続けて指示してください」と案内する
- **実装には着手しない**

### 6b. 実装モード — 実装を進める

ユーザーが「実装まで着手する」を選んだ場合:

1. `c:\projects\extendscript-ts-template\.github\instructions\extendscript.instructions.md` を `read_file` で読み込み、コーディングルールを確認する
2. `purpose` と `@workflow` コメントを元に実装を進める
3. 実装完了後に `pnpm lint && pnpm format` を実行する
4. 実装した内容を簡潔に報告する

## Notes

- スクリプト名は PascalCase で記述する（例: `ExportLayers`, `BatchRename`）
- 予約名（`lib` / `types` / `tests`）はスクリプト名として使用できない
- `pnpm new` が失敗した場合はエラーメッセージを確認し、原因を調査してから再試行する
- 質問はまとめて行い、分割して複数回聞かない
