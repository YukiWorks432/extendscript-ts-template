# 非公開ライブラリの導入検証

このブランチはローカルの導入確認用であり、公開リポジトリへプッシュしない。`extendscript-compat`のnpm登録後、`package.json`の`file:vendor/extendscript-compat-0.1.0.tgz`を公開版へ置き換え、ロックファイルを更新し、このvendorディレクトリを削除してからPRを提出する。

- 検証元: YukiWorks432/extendscript-compat、コミット`3951e9ca5df09cb192baaab6f43200ab51fe88c6`
- tarball SHA-256: `11ab40c4faff3b53cf22670fe7c3226adf92420a74257e916912d04adbe648ad`
- 作成方法: 正本で`pnpm check`、`pnpm pack --pack-destination artifacts`

本体の改変はこの場所では行わず、正本リポジトリで修正・検証して再梱包する。
