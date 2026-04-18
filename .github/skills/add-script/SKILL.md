---
name: add-script
description: "ExtendScript プロジェクトに新しいスクリプトを追加する。Use when: 新しいスクリプトを作成する、After Effects / Illustrator / Photoshop 向けのスクリプトを追加する、スクリプトの実装を開始する、aeft / ilst / phxs スクリプトを作りたい。"
argument-hint: "対象アプリ（After Effects / Illustrator / Photoshop）、何をするスクリプトか、を教えてください"
---

# ExtendScript 新規スクリプト追加

プロジェクトのスクリプト生成ツールを使って新規スクリプトを作成し、用途をコメントとして記録する。
ユーザーの選択に応じてスケルトンで止めるか、実装まで進める。

## When to Use

- 「スクリプトを作りたい」「新しいスクリプトを追加して」と言ったとき
- 対象の Adobe アプリと、何をするスクリプトかが示されたとき
- 新しい自動化処理・作業ツールを始めるとき

---

## Procedure

### 1. 基本情報をまとめて収集する

ユーザーが指定していない項目を `vscode_askQuestions` で **一度にまとめて** 質問する。
すでに提供されている項目はスキップする（重複して聞かない）。

収集する情報:

| 項目      | 内容                                           | 必須                       |
| --------- | ---------------------------------------------- | -------------------------- |
| `app`     | 対象アプリ                                     | ✅ 必須                    |
| `purpose` | 何をするスクリプトか（詳しいほど精度が上がる） | ✅ 必須                    |
| `uiType`  | スクリプトの種類（通常 or ScriptUI）           | ✅ 必須                    |
| `license` | ライセンス表記を含めるか                       | 任意（デフォルト: 含める） |

**`app` の選択肢:**

```yaml
header: "app"
question: "どの Adobe アプリ向けのスクリプトですか？"
options:
  - label: "After Effects（アフターエフェクト）"
    description: "アプリID: aeft"
  - label: "Illustrator（イラストレーター）"
    description: "アプリID: ilst"
  - label: "Photoshop（フォトショップ）"
    description: "アプリID: phxs"
```

**`uiType` の選択肢:**

```yaml
header: "uiType"
question: "スクリプトの種類を選んでください"
options:
  - label: "通常スクリプト（シンプル）"
    description: "実行すると処理が走るシンプルなスクリプト。ほとんどの自動化処理はこちら。"
    recommended: true
  - label: "ScriptUI（ウィンドウ型）"
    description: "ボタン・テキストボックスなどがあるウィンドウを表示するスクリプト。"
```

**`purpose` の記載例（ユーザーに提示して入力を促す）:**

> 例: 「選択しているレイヤーの名前を一括でリネームする。プレフィックス文字列を指定できるようにしたい」
> 例: 「アクティブなコンポの全レイヤーのアニメーションをフレーム1にリセットする」

purpose が一言しか書かれていない・処理の流れが読み取れない場合は、追加情報/仕様提案をまとめてを **1度だけ** まとめて質問する。

### 2. スクリプト名を提案・確認する

`purpose` から英語のスクリプト名を推測し、ユーザーに確認する。

命名規則は既存のスクリプトから推測する（一般的には PascalCase）。
`purpose` が日本語の場合は英語に意訳してから命名する。

**予約名（使用不可）**: `lib`, `types`, `tests`, `example`

`vscode_askQuestions` で確認する:

```yaml
header: "scriptName"
question: "スクリプト名は「<提案名>」でよいですか？英数字のみ使用できます（ファイル名になります）。"
```

ユーザーが別の名前を希望する場合はそれを使用する。

### 3. 実装方針をユーザーに確認する

`vscode_askQuestions` で以下を尋ねる:

```yaml
header: "implementation"
question: "スクリプトの実装をどこまで進めますか？"
options:
  - label: "スケルトンのみ作成する（自分で実装する）"
    description: "ファイルを作成し、仕様をコメントとして残します。コードは書きません。"
  - label: "AIに実装まで依頼する"
    description: "スクリプト作成から実装まで行います。"
```

### 4. スクリプトを生成する

ターミナルで以下を実行する:

```bash
pnpm new -- --app=<appId> --name=<ScriptName> --license
```

`--license` はユーザーが不要と明示した場合のみ省略する。

実行後に生成されるファイル:

- `es.config.mjs` に `<ScriptName>` エントリが追加される
- `src/<appId>/<ScriptName>/index.ts` にテンプレートが作成される

**ScriptUI を選んだ場合**: 生成後、`index.ts` の `entry` を `entryUI` に書き換える（後述）。

### 5. 用途（purpose）をファイルに記録する

`src/<appId>/<ScriptName>/index.ts` を開き、ファイル先頭に以下のコメントブロックを追加する:

```typescript
/**
 * @script <ScriptName>
 * @app <appId>（After Effects / Illustrator / Photoshop）
 * @description
 *   <ユーザーが述べた用途を具体的に記述する>
 *
 * @workflow
 *   1. <期待する処理フローのステップ 1>
 *   2. <ステップ 2 ...>
 */
```

`@workflow` はユーザーの `purpose` から推測して記述する。不明な場合は `TODO` として残す。

**ScriptUI の場合**: `entry` を `entryUI` に変更し、以下のテンプレートに書き換える:

```typescript
import "../../init";
import { entryUI } from "../lib/lib";

entryUI("<ScriptName>", __ES_THIS__, (win) => {
  // TODO: UI を構築する
});
```

### 6. 作成したファイルをエディタで開く

`run_vscode_command` ツールで `vscode.open` を呼び出し、作成した `src/<appId>/<ScriptName>/index.ts` をエディタで開く。

### 7a. スケルトンモード — ここで完了

ユーザーが「スケルトンのみ」を選んだ場合:

- ファイルパス `src/<appId>/<ScriptName>/index.ts` をリンク付きでユーザーに報告する
- 実装する際のヒント（どの関数を使うか）を簡単に案内する
- **実装には着手しない**

### 7b. 実装モード — 実装を進める

ユーザーが「AIに実装まで依頼する」を選んだ場合:

1. `.github/instructions/extendscript.instructions.md` を `read_file` で読み込み、コーディングルールを確認する
2. `purpose` と `@workflow` コメントを元に実装する
3. 実装完了後に `pnpm lint && pnpm format` を実行する
4. エラーがなければ `pnpm build -- <appId>/<ScriptName>` を実行してビルドする
5. エラーがあればステップ 3 に戻って修正する
6. ビルド成功後、実装した内容を簡潔に日本語で報告する

---

## Notes

- `pnpm new` が失敗した場合は、エラーメッセージを確認し原因を調査してから再試行する
- 質問は **まとめて一度** に行い、分割して何度も聞かない
- アプリ ID の対応表: `aeft` = After Effects / `ilst` = Illustrator / `phxs` = Photoshop
- 予約名（`lib` / `types` / `tests` / `example`）はスクリプト名として使用できない
- `__ES_THIS__` は ScriptUI 用のグローバル変数で、パネルとして起動された場合に正しく動作させるために必要
