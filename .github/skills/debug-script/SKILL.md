---
name: debug-script
description: "TypeScript / Rollup のビルドエラーを修正する。Use when: pnpm build でエラーが出た、pnpm lint でエラーが出た、TypeScript の型エラーが出た、ビルドが失敗した、コンパイルエラー、型エラーの修正。"
argument-hint: "エラーメッセージを貼り付けるか、対象ファイルを指定してください"
---

# ビルドエラーの修正

`pnpm build` や `pnpm lint` で発生したエラーを調査して修正する。

> **注意**: ExtendScript のランタイムエラーは minify 後のコードで発生するため、
> このスキルはビルド時（TypeScript / Rollup）のエラーのみを対象とする。

## When to Use

- `pnpm build` を実行してエラーが出た
- `pnpm lint` で TypeScript の型エラーが報告された
- エラーメッセージが出ているが原因がわからない

---

## Procedure

### 1. エラーの種類を特定する

エラーメッセージを確認し、以下のどれかに分類する:

| 種類                    | 特徴                                                         |
| ----------------------- | ------------------------------------------------------------ |
| **TypeScript 型エラー** | `TS2xxx` のエラーコード、または `error TS` から始まる        |
| **Rollup エラー**       | `[!] Error:` から始まる、またはバンドル失敗                  |
| **ESLint エラー**       | `error` / `warning` + ルール名（例: `no-restricted-syntax`） |
| **import エラー**       | `Cannot find module` / `Module not found`                    |

エラーメッセージが提供されていない場合は、ユーザーに貼り付けてもらうか、
ターミナルで以下を実行してエラーを取得する:

```bash
pnpm build 2>&1 | head -60
```

または

```bash
pnpm lint 2>&1 | head -60
```

### 2. エラーの原因を調査する

#### TypeScript 型エラーの場合

- エラーファイルと行番号を確認する（例: `src/aeft/MyScript/index.ts:12:5`）
- `read_file` でファイルを開き、該当行周辺のコードを確認する
- 型定義不足であれば `src/{appId}/types/index.d.ts` を確認する
- ES3 制約違反（`Symbol`, `Promise` など）であれば使用禁止機能一覧を確認する

#### Rollup エラーの場合

- エラーに含まれるファイルパスと行番号を確認する
- 循環 import や存在しない import パスが原因であることが多い

#### ESLint エラーの場合

- ルール名を確認する（例: `no-restricted-syntax` は三項演算子禁止ルール）
- `.github/instructions/extendscript.instructions.md` のコーディングルールを `read_file` で確認する

#### import エラーの場合

- import パスが正しいか確認する（相対パスの `../../` 等）
- 対象ファイルが存在するか `file_search` で確認する

### 3. 修正する

エラーの種類に応じて修正する。
修正後は必ず以下を実行して確認する:

```bash
pnpm lint && pnpm build
```

エラーが残っている場合はステップ 1 に戻る。

### 4. 完了を報告する

- 修正した内容を日本語で簡潔に報告する
- 修正したファイルのパスをリンク付きで示す

---

## Notes

- **三項演算子** (`? :`) は ExtendScript の既知バグのため `no-restricted-syntax` ESLint エラーになる（`ConditionalExpression` ルール）。
  `const` が必要なら即時呼び出し無名関数 + `if` に、`let` でよければ `let` + `if` に書き直す
- **`Symbol` / `Promise`** は使用禁止。代替手段を提案する
- **型定義の不足** は `src/types/index.d.ts`（共通）または `src/{appId}/types/index.d.ts`（アプリ固有）に追加する
