# リポジトリ運営方針

このページは、`YukiWorks432/extendscript-ts-template` 自身を運営するための方針です。
テンプレートを利用して作成したリポジトリでは、自分の運用に合わせて変更して構いません。

## ブランチ

通常の変更は `main` から作業ブランチを作り、`main` 向け Pull Request として統合します。
作業内容に応じて `feat/`、`fix/`、`chore/` などの接頭辞を使います。

```text
main -> feat/<topic> -> Pull Request -> main
```

通常の Pull Request はスカッシュマージを基本とします。
複数の変更を組み合わせた状態で事前検証する必要がある場合だけ、`main` から短命な
`integration/<topic>` ブランチを作り、そこで変更を統合します。検証後はそのブランチから
`main` 向け Pull Request を作成します。

```text
main
  └─ integration/<topic>
       ├─ feat/a
       └─ feat/b
           ↓
     Pull Request -> main
```

常設の `develop` は通常の統合先として使いません。移行時は `develop` を対象ブランチにした未完了
Pull Request の扱いを決め、CI と Dependabot の設定、ブランチ保護を `main` 基準へ整えた後に削除します。

## 継続的インテグレーション

`.github/workflows/ci.yml` は、`main` を対象とする Pull Request と、`main` への更新で起動します。
Dependabot が作成した Pull Request も、通常の Pull Request と同じ検証対象です。

Node.js 24 で次の検証を実行します。

- Node.js 24
- `pnpm install --frozen-lockfile --strict-peer-dependencies`
- `pnpm lint`
- `pnpm test`
- `pnpm build --all`
- `pnpm format:check`
- `git diff --check`

`package.json` の `devEngines.packageManager.version` に pnpm `^12.0.0` を指定します。CI の `pnpm/setup@v3` はこの範囲から pnpm を解決し、同じ action の `runtime` で Node.js 24 を設定します。セットアップ後は、固定ロックファイルと厳格なピア依存関係検査を含む品質ゲートを実行します。
ロックファイルを固定したインストールと厳格なピア依存関係検査を、キャッシュによって省略することはありません。
同じ Pull Request または `main` 更新に対する古い実行は、新しい実行を開始すると中止します。
ワークフローの権限は、ソース取得に必要な `contents: read` だけを付与しています。

検証名は次のとおりです。

- `CI / Node.js 24`

After Effects の実機試験と `pnpm audit` は自動化対象外です。これらは Issue #45 で確定した手動検証として、CI の合否に含めません。

### 必須チェックを設定する手順

配布用リポジトリで `main` への取り込み前に CI を必須化する場合は、GitHub のリポジトリ設定で次のように設定します。

1. **Settings > Branches > Branch protection rules** から `main` を対象にした規則を作成または編集する。
2. Pull Request を必須にし、**Require status checks to pass before merging** を有効にする。
3. 必須チェックとして `CI / Node.js 24` を追加する。
4. 保存後、`main` を対象にした Pull Request でこのチェックが成功することを確認する。

ブランチ保護をまだ設定しない場合も、上記のチェック名を変更せずに運用します。ワークフローのジョブ名を変更した場合は、ブランチ保護側の必須チェックも同時に更新してください。

## リリース

リリース自動化は `.github/workflows/release.yml` で管理します。
リポジトリ変数 `RELEASE_AUTOMATION_ENABLED=true` が設定されている場合だけ、手動実行できます。
`main` 向け Pull Request のマージだけではリリースを作成しません。

`release:*` ラベルは変更のリリース影響を記録するために使います。ラベルはリリースを起動せず、
バージョンの区分は手動実行時に選択します。ラベルがなくても手動リリースは実行できます。

| ラベル          | 用途                                   |
| --------------- | -------------------------------------- |
| `release:major` | `1.0.0` 以降の互換性を壊す変更         |
| `release:minor` | 機能追加、`0.x` 系列の互換性を壊す変更 |
| `release:patch` | 修正、文書更新、運用改善               |
| `release:none`  | リリースを予定しない管理変更           |

互換性を壊す変更のラベルは、現在のバージョン系列で決めます。`0.x` 系列では
`release:minor`、`1.0.0` 以降では `release:major` を付けてください。公開している
設定形式の変更や、対応する Node.js の最低バージョンを引き上げて利用可能な環境を
狭める変更も、互換性を壊す変更に含めます。互換性を維持する機能追加は
`release:minor`、修正や文書更新は `release:patch`、リリースを予定しない管理変更は
`release:none` として記録します。ラベルは記録用であり、手動実行時の入力を置き換えません。

## テンプレートとしての注意

このリポジトリの `main` はテンプレートとしてコピーされます。
運営者専用の設定を追加する場合は、テンプレート利用者にコピーされても事故にならない初期状態にしてください。

具体的には、次の方針を守ります。

- 自動で外部状態を変更するワークフローは、明示的な有効化フラグを必須にする。
- 個人やこのリポジトリ固有の設定は、README または docs で調整方法を明記する。
- テンプレート利用者が最初に確認すべき項目は `docs/template-customization.md` に集約する。

## GitHub 設定

現時点では、マージ方法やブランチ保護は GitHub 設定で強制しません。
運用ルールはこの文書で規定します。

将来、作業者が増えて事故リスクが高くなった場合は、`main` のブランチ保護、必須チェック、マージ方法の制限を検討します。
