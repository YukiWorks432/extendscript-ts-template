# テンプレート利用後の初期整理

このリポジトリはテンプレートリポジトリです。
`Use this template` で作成したリポジトリには、スクリプト開発用の設定だけでなく、このテンプレートを運営するための設定もコピーされます。

自分用のリポジトリを作成したら、最初にこのページの項目を確認してください。

## 必ず確認する項目

### リリース workflow

`.github/workflows/release.yml` は、`main` への Pull Request マージ時に `package.json` の `version` 更新、tag 作成、GitHub Release 作成を行う workflow です。

この workflow は、Repository Variable `RELEASE_AUTOMATION_ENABLED` が `true` の場合だけ動きます。
不要な場合は `.github/workflows/release.yml` を削除してください。
使う場合は、`docs/release-process.md` を読んでから有効化してください。

### FUNDING

`.github/FUNDING.yml` には、このテンプレート作者の支援先が入っています。
自分のリポジトリに不要な場合は削除してください。
支援先を設定したい場合は、自分のアカウントや支援先に置き換えてください。

### AI エージェント設定

`AGENTS.md`、`.agents/`、`.codex/` は Codex 向けの作業ルールとローカル設定です。
このテンプレートでは `AGENTS.md` をエージェント指示の入口にし、具体的な手順は `.agents/` に置きます。
`.codex/config.toml` はローカルサブエージェントの並列度だけを定義し、承認・sandbox・network 権限は広げません。

この設定は、このテンプレートの開発方針に合わせた初期値です。
自分のプロジェクト名、ブランチ運用、説明言語、品質ゲートに合わせて編集してください。
不要な場合は削除して構いません。

### README

`README.md` はテンプレートの説明になっています。
自分用のリポジトリでは、プロジェクト名、対象アプリ、使い方、テスト環境を実態に合わせて書き換えてください。

## ブランチ運用

このテンプレートの配布元では、通常の作業ブランチから `main` 向け Pull Request を作成します。
複数の変更を組み合わせて事前検証する必要がある場合だけ、短命な `integration/<topic>` を使います。

テンプレートから作成したリポジトリでは、チームの運用に合わせて `develop` を設けることもできます。
その場合も、通常の作業ブランチをどこへ取り込むか、どの時点で `main` へ反映するかを決めてください。
`develop` を使う例:

```text
feature/my-script -> develop -> main
```

リリース workflow を使う場合は、`docs/release-process.md` を確認してください。
