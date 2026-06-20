# リリース手順

このリポジトリでは、`main` に Pull Request をマージしたときに GitHub Actions がリリースを作成します。

## 自動リリース

`main` 向け Pull Request がマージされると、`.github/workflows/release.yml` が動きます。

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

## Pull Request の作り方

通常の変更は feature ブランチで行い、`develop` に squash merge します。
リリースするまとまりになったら、`develop` から `main` へ Pull Request を作ります。
`develop` から `main` への Pull Request は、squash merge ではなく merge commit でマージしてください。
これにより、リリースコミットを `develop` にも安全に早送りできます。

例:

```text
feature/add-script-ui -> develop -> main
```

`main` 向け Pull Request には、変更の大きさに応じてラベルを付けます。

- 互換性を壊す変更: `release:major`
- 機能追加: `release:minor`
- 修正やドキュメント更新: `release:patch`
- リリース不要の管理変更: `release:none`

## 手動リリース

GitHub Actions の `release` ワークフローは手動実行もできます。

手動実行では `bump` に `major`、`minor`、`patch` のいずれかを指定します。
`notes` を入力した場合は、その内容が GitHub Release の本文になります。
手動実行では `develop` への自動同期は行いません。

## 事前設定

GitHub Actions が `main` へリリースコミットを push し、タグと Release を作れる必要があります。

リポジトリの Actions 設定で `GITHUB_TOKEN` に書き込み権限を許可してください。
`main` にブランチ保護を設定している場合は、GitHub Actions の push を許可するか、リリース用の例外を設定してください。

## 失敗した場合

ワークフローがタグ作成後、Release 作成前に失敗した場合は、同じタグ名で Release を手動作成してください。

ワークフローが `main` への push に失敗した場合は、別のリリース処理が先に `main` を進めた可能性があります。
その場合は `main` を確認し、必要なら新しい Pull Request で再実行してください。
