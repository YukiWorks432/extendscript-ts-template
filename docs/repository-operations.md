# リポジトリ運営方針

このページは、`YukiWorks432/extendscript-ts-template` 自身を運営するための方針です。
テンプレートを利用して作成したリポジトリでは、自分の運用に合わせて変更して構いません。

## ブランチ

このリポジトリでは、通常作業を feature ブランチで行います。
feature ブランチは `develop` から作成します。

```text
develop -> feature/<topic>
```

作業が完了したら、feature ブランチを `develop` に squash merge します。
リリースするまとまりになったら、`develop` から `main` へ Pull Request を作成し、merge commit でマージします。

```text
feature/<topic> -> develop -> main
```

`develop` から `main` への Pull Request を squash merge すると、リリース workflow が作成する version 更新コミットを `develop` に安全に早送りできない場合があります。
そのため、`develop` から `main` へは merge commit を使います。

## リリース

リリース自動化は `.github/workflows/release.yml` で管理します。
Repository Variable `RELEASE_AUTOMATION_ENABLED=true` が設定されている場合だけ動作します。

`main` 向け Pull Request には、変更内容に応じて以下のラベルを付けます。

| ラベル          | 用途                                   |
| --------------- | -------------------------------------- |
| `release:major` | `1.0.0` 以降の互換性を壊す変更         |
| `release:minor` | 機能追加、`0.x` 系列の互換性を壊す変更 |
| `release:patch` | 修正、文書更新、運用改善               |
| `release:none`  | リリース不要                           |

ラベルがない場合は `release:patch` として扱います。

互換性を壊す変更のラベルは、現在のバージョン系列で決めます。`0.x` 系列では
`release:minor`、`1.0.0` 以降では `release:major` を付けてください。公開している
設定形式の変更や、対応する Node.js の最低バージョンを引き上げて利用可能な環境を
狭める変更も、互換性を壊す変更に含めます。互換性を維持する機能追加は
`release:minor`、修正や文書更新は `release:patch`、リリース不要の管理変更は
`release:none` とします。自動リリース処理はラベルに従って版番号を更新するため、
この系列ごとの運用を実現するために workflow の変更は必要ありません。

## テンプレートとしての注意

このリポジトリの `main` はテンプレートとしてコピーされます。
運営者専用の設定を追加する場合は、テンプレート利用者にコピーされても事故にならない初期状態にしてください。

具体的には、次の方針を守ります。

- 自動で外部状態を変更する workflow は、明示的な有効化フラグを必須にする。
- 個人やこのリポジトリ固有の設定は、README または docs で調整方法を明記する。
- テンプレート利用者が最初に確認すべき項目は `docs/template-customization.md` に集約する。

## GitHub 設定

現時点では、merge 方法やブランチ保護は GitHub 設定で強制しません。
運用ルールはこの文書で規定します。

将来、作業者が増えて事故リスクが高くなった場合は、`main` と `develop` のブランチ保護、必須チェック、merge 方法の制限を検討します。
