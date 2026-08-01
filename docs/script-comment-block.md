# スクリプト説明コメントブロック

スクリプトの目的、利用者から見た操作手順、ランチャーで使える
Material Symbols の候補を、スクリプト本体の先頭へ記録する設計メモです。
機械処理の契約にはせず、特定のランチャーにも依存させません。

## 基本形

`src/**/index.ts` の先頭に、`import` より前へ次の5項目をこの順序で記載します。

```typescript
/**
 * @script DuplicateSelection
 * @app ilst
 * @material-symbols content_copy, control_point_duplicate, select_all
 * @description
 *   選択中のオブジェクトを指定数だけ複製し、複製結果を同じ文書内へ追加する。
 *
 * @workflow
 *   1. 処理対象のオブジェクトを選択する
 *   2. 複製数を入力する
 *   3. 指定数の複製を作成する
 */
```

### 共通規則

- `@script`、`@app`、`@material-symbols`、`@description`、`@workflow` の5項目を、この順序ですべて記載する。
- コメントブロックは `src/**/index.ts` の先頭、`import` より前へ配置する。
- `@script` はスクリプトのディレクトリ名および `es.config.mjs` の設定上の名前と完全一致させる。
- `@app` はアプリのディレクトリIDと完全一致させる。表示名は併記しない。
- このリポジトリでは日本語を既定とするが、利用者の主要言語による記述も許容する。
- スクリプトの対象、結果、利用者向け手順が変わる変更では、説明コメントも同時に更新する。内部実装だけの変更では更新を必須にしない。

## `@description`

- 対象、操作、得られる結果を含む1〜3文で記述する。
- 詳細な処理手順は `@workflow` に分離する。
- 重要な制約や破壊的な変更がある場合は説明へ含める。

## `@workflow`

- 利用者から見た操作と結果を1〜5段階で記述する。
- 内部関数、API呼び出し、配列処理などの実装詳細は記載しない。
- スケルトンのみを作成する場合も、聞き取った用途から完成させる。用途が不明な場合は `TODO` を残す。

## Material Symbols 候補

- 新しい Material Symbols のみを対象とし、従来の Material Icons は混在させない。
- 公式一覧に実在する、意味の異なる3件を必ず記載する。
- 同一候補の重複は禁止する。
- 公式の小文字スネークケース名をそのまま使用する。
- 理由と優先順位は記載しない。
- 暗黙の優先順位を避けるため、候補名をアルファベット順に並べる。
- 3件を1行にまとめ、カンマと半角空白で区切る。
- スタイル、塗り、太さ、コードポイント、URLは記載しない。
- [Google Fonts の公式アイコン一覧](https://fonts.google.com/icons) を第一確認先とする。
- Google Fonts を参照できない場合は、[Google の material-design-icons リポジトリ](https://github.com/google/material-design-icons) の `symbols` と `update/current_versions.json` で確認する。
- 両方へ接続できず実在確認ができない場合もスクリプト作成は続行し、次の `TODO` を残す。

```typescript
 * @material-symbols TODO: 公式一覧を確認し、候補を3件カンマ区切りで記載
```

アイコン画像やフォントはリポジトリへ同梱しません。KBar は用途例として文書に挙げられますが、KBar 固有の設定や画像生成は扱いません。

## 生成直後の雛形

`pnpm new` と `pnpm add-app` は、用途がまだ確定していないため、次の雛形を生成します。
作成スキルを使う場合は、生成後に用途から `@description`、`@workflow`、`@material-symbols` の `TODO` を完成させます。

```typescript
/**
 * @script MyScript
 * @app aeft
 * @material-symbols TODO: 公式一覧を確認し、候補を3件カンマ区切りで記載
 * @description
 *   TODO: 対象・操作・得られる結果を1〜3文で記載
 *
 * @workflow
 *   1. TODO: 利用者から見た操作と結果を記載
 */
```
