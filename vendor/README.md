# 非公開ライブラリの導入検証

このブランチはローカルの導入確認用であり、公開リポジトリへプッシュしない。`extendscript-compat`のnpm登録後、`package.json`の`file:vendor/extendscript-compat-0.1.0.tgz`を公開版へ置き換え、ロックファイルを更新し、このvendorディレクトリを削除してからPRを提出する。

- 検証元: YukiWorks432/extendscript-compat、コミット`03f5ade70a0142757167f1d72a023e038e90f6f1`
- tarball SHA-256: `748b22b7e4aa38195357e52586b3f397669d9c4f1b5e640ffa2310e4ac8a83b4`
- 作成方法: 正本で`pnpm check`、`pnpm pack --pack-destination artifacts`

本体の改変はこの場所では行わず、正本リポジトリで修正・検証して再梱包する。
