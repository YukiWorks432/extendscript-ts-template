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

## 継続的インテグレーション

`.github/workflows/ci.yml` は、`develop` を対象とする Pull Request と、`develop` への更新で起動します。
Dependabot が作成した Pull Request も、通常の Pull Request と同じ検証対象です。

Node.js の行列ごとに次の検証を実行します。

- Node.js 22 と 24
- pnpm `11.17.0` の確認
- `pnpm install --frozen-lockfile --strict-peer-dependencies`
- `pnpm lint`
- `pnpm test`
- `pnpm build --all`
- `pnpm exec prettier --check .`
- `git diff --check`

`package.json` の `packageManager` と同じ pnpm の版をワークフローに明記し、実行時にも版を確認します。
ロックファイルを固定したインストールと厳格なピア依存関係検査を、キャッシュによって省略することはありません。
同じ Pull Request または `develop` 更新に対する古い実行は、新しい実行を開始すると中止します。
ワークフローの権限は、ソース取得に必要な `contents: read` だけを付与しています。

行列の検証名は次のとおりです。

- `CI / Node.js 22`
- `CI / Node.js 24`

After Effects の実機試験と `pnpm audit` は自動化対象外です。これらは Issue #45 で確定した手動検証として、CI の合否に含めません。

### 必須チェックを設定する手順

配布用リポジトリで `develop` への取り込み前に CI を必須化する場合は、GitHub のリポジトリ設定で次のように設定します。

1. **Settings > Branches > Branch protection rules** から `develop` を対象にした規則を作成または編集する。
2. Pull Request を必須にし、**Require status checks to pass before merging** を有効にする。
3. 必須チェックとして `CI / Node.js 22` と `CI / Node.js 24` を追加する。`CI` だけではなく、両方の行列チェックを指定する。
4. 保存後、`develop` を対象にした Pull Request で両方のチェックが成功することを確認する。

ブランチ保護をまだ設定しない場合も、上記のチェック名を変更せずに運用します。ワークフローのジョブ名を変更した場合は、ブランチ保護側の必須チェックも同時に更新してください。

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
