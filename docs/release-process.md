# リリース手順

このリポジトリには、`main` に Pull Request をマージしたときに GitHub Actions でリリースを作成する workflow があります。

この workflow はテンプレート利用先にもコピーされます。
不要な場合は `.github/workflows/release.yml` を削除してください。
使う場合は Repository Variable `RELEASE_AUTOMATION_ENABLED=true` を設定してください。

## 自動リリース

`.github/workflows/release.yml` は、`RELEASE_AUTOMATION_ENABLED=true` の場合だけ動きます。

ワークフローは以下を自動で行います。

1. `package.json` の `version` を更新
2. `chore: vX.Y.Z をリリース` コミットを `main` に追加
3. `vX.Y.Z` の注釈付きタグを作成
4. GitHub Release を作成
5. `develop` から `main` へマージした場合は、同じリリースコミットを `develop` にも早送り反映

`pnpm-lock.yaml` にはこのリポジトリ自身の `version` が含まれないため、通常は更新されません。

## バージョンの決まり方

Pull Request に付けたラベルで、上げるバージョンを決めます。

| ラベル          | 動作               |
| --------------- | ------------------ |
| `release:major` | `X.0.0` へ上げる   |
| `release:minor` | `0.X.0` へ上げる   |
| `release:patch` | `0.0.X` へ上げる   |
| `release:none`  | リリースを作らない |

`release:*` ラベルがない場合は `release:patch` として扱います。

複数のリリースラベルが付いた場合は、`major`、`minor`、`patch` の順で大きいものを採用します。

## main 単独運用

`main` だけで運用する場合は、feature ブランチから `main` へ Pull Request を作ります。

```text
feature/my-script -> main
```

Pull Request をマージすると、workflow が `main` に version 更新コミットを追加し、tag と GitHub Release を作成します。

## develop を使う運用

`develop` を使う場合は、通常の変更を feature ブランチで行い、`develop` に squash merge します。
リリースするまとまりになったら、`develop` から `main` へ Pull Request を作ります。

```text
feature/my-script -> develop -> main
```

`develop` から `main` への Pull Request は、squash merge ではなく merge commit でマージしてください。
これにより、リリースコミットを `develop` にも安全に早送りできます。

## Pull Request ラベル

`main` 向け Pull Request には、変更の大きさに応じてラベルを付けます。

- 互換性を壊す変更: `release:major`
- 機能追加: `release:minor`
- 修正やドキュメント更新: `release:patch`
- リリース不要の管理変更: `release:none`

## 手動リリース

GitHub Actions の `release` ワークフローは手動実行もできます。

手動実行でも `RELEASE_AUTOMATION_ENABLED=true` が必要です。
`bump` に `major`、`minor`、`patch` のいずれかを指定します。
`notes` を入力した場合は、その内容が GitHub Release の本文になります。
手動実行では `develop` への自動同期は行いません。

## 事前設定

GitHub Actions が `main` へリリースコミットを push し、タグと Release を作れる必要があります。

リポジトリの Actions 設定で `GITHUB_TOKEN` に書き込み権限を許可してください。
`main` にブランチ保護を設定している場合は、GitHub Actions の push を許可するか、リリース用の例外を設定してください。

自動リリースを有効化する場合は、Repository Variable を設定してください。

```text
RELEASE_AUTOMATION_ENABLED=true
```

## 失敗した場合

ワークフローがタグ作成後、Release 作成前に失敗した場合は、同じタグ名で Release を手動作成してください。

ワークフローが `main` への push に失敗した場合は、別のリリース処理が先に `main` を進めた可能性があります。
その場合は `main` を確認し、必要なら新しい Pull Request で再実行してください。
