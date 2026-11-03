---
name: es-to-ts
description: "既存の ExtendScript (.jsx / .js) を TypeScript に書き直す。Use when: 既存のスクリプトを TypeScript 化したい、.jsx ファイルをプロジェクトに追加したい、古い ExtendScript コードをモダンな TypeScript に移植したい、JSX を TS に変換したい。"
argument-hint: "変換したい ExtendScript コードを貼り付けるか、ファイルパスを指定してください"
---

# ExtendScript → TypeScript 変換

既存の ExtendScript (.jsx) を、このプロジェクトの TypeScript 形式に書き直す。

## When to Use

- 既存の `.jsx` スクリプトをプロジェクトに取り込みたい
- 古い ExtendScript コードを TypeScript で管理したい

---

## Procedure

### 1. 対象コードを取得する

ユーザーがコードを貼り付けていない場合は、対象ファイルを読み込む。

### 2. 条件式の意図を確認する

三項演算子と論理演算子の分岐結果・副作用を読み取る。通常のビルドでは `extendscript-compat` が圧縮後の評価順序を保護するため、入れ子という理由だけで書き換えたり確認を求めたりしない。

元のExtendScript固有の評価結果に依存している場合や、意図が読み取れない場合だけ、期待する結果を利用者へ確認する。複雑な式は読みやすさのために `if` 文へ整理する。

### 3. 対象アプリ・スクリプト名を確認する

ユーザーが指定していない場合は、利用可能な質問ツールまたは簡潔な日本語の質問で確認する:

```yaml
header: "target"
question: "このスクリプトはどの Adobe アプリ向けですか？"
options:
  - label: "After Effects"
  - label: "Illustrator"
  - label: "Photoshop"
```

### 4. 新しいスクリプトを作成する

`add-script` スキルを呼び出して、新しいスクリプトのファイルを生成する。
（スキルが利用できない場合は `pnpm new -- --app=<appId> --name=<ScriptName> --license` を実行する）

### 5. TypeScript に変換する

`.agents/instructions/extendscript.md` を読み、コーディングルールを確認してから変換する。

主な変換ポイント:

| Before (ExtendScript)             | After (TypeScript)                                      |
| --------------------------------- | ------------------------------------------------------- |
| `var x = ...`                     | `const x = ...` / `let x = ...`                         |
| `function foo() {}`               | `const foo = () => {}`                                  |
| `x ? a : b`                       | 意図した分岐を維持し、複雑な場合だけ `if` 文へ整理      |
| `try/catch` の `e.message`        | `(e as Error).message`                                  |
| 関数の先頭に処理を書く            | `entry("name", () => { ... })` で囲む                   |
| ScriptUI ウィンドウをそのまま開く | `entryUI("name", __ES_THIS__, (win) => { ... })` で囲む |
| `alert(...)` / `confirm(...)`     | `new Window(...)` を使う                                |
| `$.writeln(...)`                  | デバッグ用途のみ可。本番では削除する                    |

型注釈を適切に追加する（`app.project.activeItem as CompItem` など）。

### 6. lint・ビルドで確認する

```bash
pnpm lint && pnpm fmt && pnpm typecheck -- --app=<appId> && pnpm build -- <appId>/<ScriptName>
```

エラーがあれば修正する。

### 7. 完了を報告する

- 変換したファイルのパスをリンク付きで示す
- 元の評価結果への依存など、手動確認が必要な点があれば明記する

---

## Notes

- **条件式の評価順序**: 通常のビルドの最終補正で保護する。補正しない手書きJSXや `eval` 文字列は対象外。
- **`Symbol` / `Promise`** は利用不可（ポリフィル対象外）
- **ES3 制約**: トランスパイル後は ES3 になるが、TypeScript の文法は最新のものが使える
- `$.writeln()` はデバッグ用。本番コードには残さないこと
