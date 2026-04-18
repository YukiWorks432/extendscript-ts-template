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

ユーザーがコードを貼り付けていない場合は `read_file` でファイルを読み込む。

### 2. 事前確認: 三項演算子の検出

コード内の三項演算子 (`? :`) を探す。
**三項演算子は ExtendScript の既知バグのため、変換後は必ず代替構文に書き直す。**

三項演算子が見つかった場合は `vscode_askQuestions` でユーザーに確認する:

```yaml
header: "ternary"
question: "以下の三項演算子の仕様を教えてください。変換に必要です。"
# 見つかった三項演算子を具体的に列挙して質問する
```

`condition ? valueIfTrue : valueIfFalse` の `valueIfTrue` / `valueIfFalse` それぞれが
何を返すべきかを確認し、`if` 文または即時呼び出し無名関数で書き直す。

### 3. 対象アプリ・スクリプト名を確認する

ユーザーが指定していない場合は `vscode_askQuestions` で確認する:

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

`.github/instructions/extendscript.instructions.md` を `read_file` で読み込み、コーディングルールを確認してから変換する。

主な変換ポイント:

| Before (ExtendScript)             | After (TypeScript)                                      |
| --------------------------------- | ------------------------------------------------------- |
| `var x = ...`                     | `const x = ...` / `let x = ...`                         |
| `function foo() {}`               | `const foo = () => {}`                                  |
| `x ? a : b`                       | `if` 文または即時呼び出し無名関数                       |
| `try/catch` の `e.message`        | `(e as Error).message`                                  |
| 関数の先頭に処理を書く            | `entry("name", () => { ... })` で囲む                   |
| ScriptUI ウィンドウをそのまま開く | `entryUI("name", __ES_THIS__, (win) => { ... })` で囲む |
| `alert(...)` / `confirm(...)`     | `new Window(...)` を使う                                |
| `$.writeln(...)`                  | デバッグ用途のみ可。本番では削除する                    |

型注釈を適切に追加する（`app.project.activeItem as CompItem` など）。

### 6. lint・ビルドで確認する

```bash
pnpm lint && pnpm format && pnpm build -- <appId>/<ScriptName>
```

エラーがあれば修正する。

### 7. 完了を報告する

- 変換したファイルのパスをリンク付きで示す
- 三項演算子など手動確認が必要な点があれば明記する

---

## Notes

- **三項演算子の既知バグ**: ネストした三項演算子が JS 仕様通りに評価されない。
  参考: https://uske-s.hatenablog.com/entry/2021/10/26/184709
- **`Symbol` / `Promise`** は利用不可（ポリフィル対象外）
- **ES3 制約**: トランスパイル後は ES3 になるが、TypeScript の文法は最新のものが使える
- `$.writeln()` はデバッグ用。本番コードには残さないこと
