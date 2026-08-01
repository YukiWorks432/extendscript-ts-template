# ADR 0001: ES3 出力のため TypeScript 4.9.5 を固定する

- 状態: 採用
- 日付: 2026-07-26

## 文脈

このテンプレートは、TypeScript から ExtendScript 向けの ES3 出力を生成する。
TypeScript 5.0 では ES3 を対象にする設定が非推奨になり、TypeScript 5.5 では
TypeScript 5.0 で非推奨になった機能が無効化された。したがって、TypeScript の
上位系列へ単純に更新すると、テンプレートの出力契約またはビルド設定を変更する
移行が必要になる。

## 決定

開発依存関係の TypeScript は `4.9.5` を厳密指定する。ES3 出力を維持したまま
TypeScript 5 系へ移行する作業は、この更新とは分離した別の移行として扱う。
Babel 8 への更新も、TypeScript の上位系列への移行と互換性確認が必要になるため、
今回の対象外とする。Dependabot では TypeScript の自動更新を除外し、Babel の
メジャー更新を除外する。

## 結果

- `tsconfig.json` の `target: "ES3"` を維持し、ExtendScript の実行環境に対する
  出力契約を守れる。
- TypeScript と Babel の上位系列へ更新する場合は、ES3 出力、型検査、Babel の
  変換結果を含む別の移行計画と実機検証が必要になる。
- Babel 7 系と周辺依存のセキュリティ更新は、今回の固定方針と矛盾しない範囲で
  継続する。

## 参考

- [TypeScript 5.0: ES3 対象の非推奨化](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#deprecations-and-default-changes)
- [TypeScript 5.5: TypeScript 5.0 で非推奨になった機能の無効化](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#disabling-features-deprecated-in-typescript-50)
