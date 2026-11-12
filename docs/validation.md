# 検証環境と実機確認の記録

Windowsの次の環境で、テンプレートの生成物と互換コードを確認した記録があります。テンプレートの実機検証は2026年11月4日までです。compat 1.2.0の実機検証は下記の出典を参照してください。

| 製品          | 製品版           | ExtendScript |
| ------------- | ---------------- | ------------ |
| After Effects | 26.5x89          | 4.5.6        |
| Illustrator   | 30.8.2           | 4.5.6        |
| Photoshop     | 27.11.0 / 27.9.0 | 4.5.12       |
| Premiere Pro  | 26.5.2           | 4.5.6        |

## 確認した内容

- 4製品で、テンプレートの生成物による共通検査と、互換コードの動作を確認しました。
- AE・Illustrator・Photoshopでは、実際の利用側スクリプトの代表操作も確認しました。
- Premiereでは文字列列挙の修正とJSXの直接実行、AEでは `for` 初期化部分の `in` 演算子の追加補正も確認しました。

これらは当時の生成物に対する結果です。対象コミット、製品版ごとの検査内容と実行条件は、下記の出典を参照してください。

Premiere Proの結果は過去の互換コードと生成物に対する確認記録として残します。現在のテンプレートはAnimate・Premiere Proを対象外とし、初期設定・アプリ追加では生成しません。対応条件は[公開契約](public-contract.ja.md#対応環境と互換補正)を参照してください。

アプリの雛形生成への対応と、実機で確認した範囲は異なります。InDesign・Audition、macOS、表にない製品版については、参照した記録に実機確認の結果はありません。

開発環境の導入条件は[README](../README.md)、自動検査の内容は[CI設定](../.github/workflows/ci.yml)を参照してください。CIではAdobeアプリを起動しません。

## 出典

- [compat 1.0.0の検証結果と出荷判断](https://github.com/YukiWorks432/extendscript-compat/blob/8561c298e9ea56f8143cb8c2bd2430a9e497d4b3/docs/release-1.0.0.ja.md)：4製品、公開テンプレート、利用側の確認内容。生成物のハッシュと実行結果の原記録へのリンクもあります。
- [compat 1.1.0の追加補正と検証範囲](https://github.com/YukiWorks432/extendscript-compat/blob/8561c298e9ea56f8143cb8c2bd2430a9e497d4b3/docs/releases/1.1.0.ja.md)：AEでの `for` 初期化部分の補正の確認内容。
- [compat 1.2.0の追加補完と検証範囲](https://github.com/YukiWorks432/extendscript-compat/blob/d0f9c914b7231c7b0ddef4a9b3e6bb92c1c3e180/docs/releases/1.2.0.ja.md)：AEでの限定補完と、ポリフィル・ポニーフィルの確認内容。
