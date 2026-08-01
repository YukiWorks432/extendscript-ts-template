---
name: add-script
description: "ExtendScript プロジェクトに新しいスクリプトを追加する。Use when: 新しいスクリプトを作成する、After Effects / Illustrator / Photoshop 向けのスクリプトを追加する、スクリプトの実装を開始する、aeft / ilst / phxs スクリプトを作りたい。"
argument-hint: "対象アプリ（After Effects / Illustrator / Photoshop）、何をするスクリプトか、を教えてください"
---

# ExtendScript 新規スクリプト追加

プロジェクトのスクリプト生成ツールを使って新規スクリプトを作成し、用途をコメントとして記録する。
ユーザーの選択に応じてスケルトンで止めるか、実装まで進める。

説明コメントの形式は [docs/script-comment-block.md](../../../docs/script-comment-block.md) を正本とする。
このスキルでは、生成後に用途から説明、処理手順、Material Symbols の候補を完成させる。

## When to Use

- 「スクリプトを作りたい」「新しいスクリプトを追加して」と言ったとき
- 対象の Adobe アプリと、何をするスクリプトかが示されたとき
- 新しい自動化処理・作業ツールを始めるとき

---

## Procedure

### 1. 基本情報をまとめて収集する

ユーザーが指定していない項目を、利用可能な質問ツールまたは簡潔な日本語の質問で **一度にまとめて** 質問する。
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

利用可能な質問ツールまたは簡潔な日本語の質問で確認する:

```yaml
header: "scriptName"
question: "スクリプト名は「<提案名>」でよいですか？英数字のみ使用できます（ファイル名になります）。"
```

ユーザーが別の名前を希望する場合はそれを使用する。

### 3. 実装方針をユーザーに確認する

利用可能な質問ツールまたは簡潔な日本語の質問で以下を尋ねる:

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
ScriptUI を選んだ場合は `--ui=scriptui` を追加する:

```bash
pnpm new -- --app=<appId> --name=<ScriptName> --license --ui=scriptui
```

実行後に生成されるファイル:

- `es.config.mjs` に `<ScriptName>` エントリが追加される
- `src/<appId>/<ScriptName>/index.ts` にテンプレートが作成される

### 5. 用途（purpose）をファイルに記録する

`src/<appId>/<ScriptName>/index.ts` を開き、ファイル先頭の雛形を用途に合わせて完成させる。
コメントブロックは `import` より前へ配置し、次の5項目をこの順序で記載する:

```typescript
/**
 * @script <ScriptName>
 * @app <appId>
 * @material-symbols <候補1>, <候補2>, <候補3>
 * @description
 *   <ユーザーが述べた用途を具体的に記述する>
 *
 * @workflow
 *   1. <期待する処理フローのステップ 1>
 *   2. <ステップ 2 ...>
 */
```

`@script` はディレクトリ名および `es.config.mjs` の設定名と一致させ、`@app` はアプリIDだけを記載する。
`@description` は対象・操作・結果を含む1〜3文、`@workflow` は利用者から見た操作と結果を1〜5段階で記述する。
内部関数やAPI呼び出しなどの実装詳細は記載しない。

`@material-symbols` には、[Google Fonts の公式アイコン一覧](https://fonts.google.com/icons) で実在を確認した
新しい Material Symbols を、意味の異なる3件だけ小文字スネークケースで記載する。
候補は重複させず、アルファベット順に並べ、カンマと半角空白で区切る。
Google Fonts を参照できない場合は、[Google の material-design-icons リポジトリ](https://github.com/google/material-design-icons) の
`symbols` または `update/current_versions.json` で確認する。両方の確認先を参照できない場合だけ、次の `TODO` を残して作成を続行する:

```typescript
 * @material-symbols TODO: 公式一覧を確認し、候補を3件カンマ区切りで記載
```

候補について利用者へ確認せず、用途から自動で選ぶ。Google Fonts と公式リポジトリの両方を参照できない場合だけ `TODO` を残す。
`@workflow` も用途が不明な場合は `TODO` を残す。

**ScriptUI の場合**: 生成済みテンプレートが `entryUI` と `__ES_THIS__` を使っていることを確認する:

```typescript
import "../../init";
import { entry, entryUI } from "../../lib/lib";

entryUI("<ScriptName>", __ES_THIS__, (win) => {
  const runButton = win.add("button", undefined, "実行");
  runButton.onClick = () => {
    entry("<ScriptName>", () => {
      // TODO: 実行処理を書く
    });
  };
});
```

### 6. 作成したファイルを確認する

作成した `src/<appId>/<ScriptName>/index.ts` を読み、生成結果とコメントが意図通りか確認する。
スケルトンのみを作成する場合でも、聞き取った用途から `@description` と `@workflow` を完成させる。
実装まで進める場合は、実装後の対象・結果・利用者向け手順に合わせてコメントを再確認する。

### 7a. スケルトンモード — ここで完了

ユーザーが「スケルトンのみ」を選んだ場合:

- ファイルパス `src/<appId>/<ScriptName>/index.ts` をリンク付きでユーザーに報告する
- `@material-symbols` に記載した候補名を完了報告へ示す。公式一覧を確認できず `TODO` を残した場合は、その `TODO` も示す
- 実装する際のヒント（どの関数を使うか）を簡単に案内する
- **実装には着手しない**

### 7b. 実装モード — 実装を進める

ユーザーが「AIに実装まで依頼する」を選んだ場合:

1. `.agents/instructions/extendscript.md` を読み、コーディングルールを確認する
2. `purpose` と `@workflow` コメントを元に実装する
3. 実装完了後に `pnpm lint && pnpm format` を実行する
4. エラーがなければ `pnpm build -- <appId>/<ScriptName>` を実行してビルドする
5. エラーがあればステップ 3 に戻って修正する
6. ビルド成功後、実装した内容を簡潔に日本語で報告する
7. 完了報告に `@material-symbols` へ記載した候補名を示す。公式一覧を確認できず `TODO` を残した場合は、その `TODO` も示す

---

## Notes

- `pnpm new` が失敗した場合は、エラーメッセージを確認し原因を調査してから再試行する
- 質問は **まとめて一度** に行い、分割して何度も聞かない
- アプリ ID の対応表: `aeft` = After Effects / `ilst` = Illustrator / `phxs` = Photoshop
- 予約名（`lib` / `types` / `tests` / `example`）はスクリプト名として使用できない
- `__ES_THIS__` は ScriptUI 用のグローバル変数で、パネルとして起動された場合に正しく動作させるために必要
