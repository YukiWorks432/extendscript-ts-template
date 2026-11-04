# テンプレートの公開契約

extendscript-ts-template の1.xで維持する仕様と、版番号の判断を定めます。

## 適用範囲

公開仕様の範囲内で書かれた既存の設定とスクリプトは、1.xの更新後も同じ公開コマンドでビルドできます。生成するJSXは、文書化した対応範囲でスクリプトの意味を保ち、指定した配置と初期化方式で利用できます。不具合による誤った結果は維持の対象に含みません。

対象は標準構成と文書化した設定・拡張点です。独自に変更した内部実装の更新は、利用者が差分を確認して取り込みます。

## 安定対象

### 設定と配置

`es.config.mjs` は既定のエクスポートとして、アプリIDからスクリプト配列への `scripts` と、省略可能な共通スクリプト配列 `common` を持ちます。

| 項目      | 契約                                                                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`    | 必須の文字列。入口と出力の名前に使います。生成コマンドでは重複名と予約名 `lib`・`types`・`tests` を拒否します。                                                               |
| `version` | 必須の文字列。出力のスクリプト版表示に使います。テンプレート本体の版とは独立します。                                                                                          |
| `license` | 省略可能な真偽値。省略は `false`。`true` ではスクリプト直下のLICENSEを優先し、なければルートのLICENSEを挿入します。互換コードのライセンス表示はこの設定にかかわらず含めます。 |
| `build`   | 1.xでは非推奨の互換設定として維持します。省略・`true` は通常の対象、`false` は通常ビルドから除外します。`--all` / `-a` はこの指定を上書きします。新しい設定例では省略します。 |

アプリ別の入口は `src/{appId}/{name}/index.ts`、標準出力は `dist/{appId}/{name}/{name}.jsx` です。共通スクリプトは `src/{name}/index.ts` から `dist/{name}/{name}.jsx` へ出力します。各入口はアプリ固有コードより先に `src/init.ts` を読み込みます。生成コマンドが使う `import "../../init"` と共通APIの読み込み先を維持します。

### コマンド

| コマンド                                               | 役割                                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm run configure`                                   | 新しいコピーを対話式で初期設定します。反映前の確認と編集済みファイルの保護、再実行時に利用者の設定を戻さない動作を維持します。 |
| `pnpm new`                                             | スクリプトと設定を生成します。対話式と `--app`・`--name`・`--license`・`--ui=scriptui` による指定を維持します。                |
| `pnpm add-app -- --app=<appId>`                        | 対応アプリの構成と `build:<appId>` の別名を追加します。                                                                        |
| `pnpm typecheck`                                       | 成果物を生成せず全体を型検査します。`--app` は対象アプリに限定し、参照する共有コードも検査します。                             |
| `pnpm build`                                           | 入力と有効な設定の変更に基づき差分ビルドします。`--all` / `-a` は強制再生成、`--app` は対象アプリの限定です。                  |
| `pnpm build:<appId>`                                   | 対応するアプリ限定の通常ビルドです。                                                                                           |
| `pnpm watch`                                           | 変更を監視してビルドします。型エラー中も監視を継続し、出力する場合があります。通常ビルドの成功とは区別します。                 |
| `pnpm clean`                                           | 差分判定の履歴を削除します。成果物全体は削除しません。                                                                         |
| `pnpm lint`・`pnpm fmt`・`pnpm fmt:check`・`pnpm test` | コード検査・整形・整形確認・Node.js側の回帰検証という役割を維持します。                                                        |

初回設定の選択肢、既定値、保護対象は[初期設定](template-customization.md)を参照してください。`package.json` の `templateConfigured: true` は初回設定の完了印として維持します。初期設定コマンドは、利用者が編集済みのプロジェクト全体を再構成する機能ではありません。

通常ビルドの `--concurrency` は1以上の安全な整数で並列度を指定し、1なら逐次実行します。`BUILD_ALL`、`EXTENDSCRIPT_COMPILER_MEMORY_MB`、`EXTENDSCRIPT_WORKER_MEMORY_MB` の公開された意味を維持します。メモリ指定はMiB単位の正整数のヒープ上限で、プロセス全体の使用量ではありません。並列度とメモリ設定は監視ビルドには適用しません。内部の工程制御用環境変数は公開対象ではありません。

### 成果物と失敗時の扱い

標準ビルドは、許可された構文・APIの範囲で評価結果、短絡評価と副作用の順序を保ち、ES3構文のJSXを生成します。UTF-8 BOM、必要な初期化コードとライセンス表示を含め、最上位の `this` を `__ES_THIS__` に保持します。補正範囲は採用版のcompatの契約に従います。

通常ビルドは引数・型検査・生成処理の失敗で非0終了します。型検査・変換の失敗では既存の成果物を更新しません。束ねる工程の失敗では一部の成果物が更新済みになり得るため、全出力の巻き戻しは保証しません。差分判定の履歴は全対象が成功したときだけ確定します。

全体の型検査には `pnpm typecheck` を使います。通常ビルドの型検査は、選択された入口の依存範囲が対象です。公開に使う成果物は型検査と通常ビルドの成功を確認してください。

### 共通API

公開APIは `src/lib/lib.ts` の次の3関数です。各スクリプトからの `../../lib/lib` による読み込みを維持します。

- `entry(name, func)`：利用できる場合にUndoグループを開始し、コールバックの実行後は例外時もグループを閉じます。捕捉した例外はエラーダイアログの表示後に再送出します。
- `entryUI(name, thisObj, func)`：Panelを受け取った場合は再利用し、それ以外はpaletteを生成します。UI構築と表示を行い、Undoグループは作りません。UI構築中やpalette表示時に捕捉した例外を表示して再送出します。イベント処理は必要に応じて `entry` で囲みます。
- `alertError(error)`：Errorの情報をダイアログで表示して、渡された例外を再送出します。

引数・戻り値の型は上記ファイルの宣言を維持対象に含めます。これらは対象アプリが提供するUndo・ScriptUI機能の範囲で利用します。公開API一覧にない補助関数、アプリ別の補助コードとサンプルは安定対象に含めません。

### 対応環境と互換補正

各配布版の `package.json` の `engines`・`devEngines` と、採用するTypeScriptの入力構文・型設定を対応環境の基準とします。対応版はNode.js `^24.22.1`、pnpm `^12.16.1`、TypeScript `4.9.5` です。TypeScriptの固定理由は [ADR 0001](adr/0001-typescript-4-9-5-for-es3.md) を参照してください。コンパイラーの内部更新でも、有効な入力を非互換に制限する場合はメジャー変更です。

追加の拡張機能を使わず、生成した単体JSXを標準UIから実行できる製品を対象とします。初期構成は `aeft`・`ilst`・`phxs` です。初期設定とアプリ追加による構成生成は、加えて `idsn`・`audt` に対応します。

| 製品          | ID     | 標準UIでの実行経路                                                                                                                                                             |
| ------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| After Effects | `aeft` | [File → Scripts → Run Script File](https://helpx.adobe.com/after-effects/desktop/automate-in-after-effects/automate-animation/scripts.html)                                    |
| Illustrator   | `ilst` | [File → Scripts → Other Script](https://helpx.adobe.com/illustrator/desktop/automate-visualize-data/automate-actions/install-and-run-scripts.html)                             |
| Photoshop     | `phxs` | [File → Scripts → Browse](https://helpx.adobe.com/photoshop/desktop/automate-tasks/automation-settings-and-presets/automate-photoshop-with-scripts.html)                       |
| InDesign      | `idsn` | [Window → Utilities → Scriptsからスクリプトを実行](https://helpx.adobe.com/indesign/desktop/automation-and-scripting/document-automation/automate-workflows-with-scripts.html) |
| Audition      | `audt` | [File → Browse and Run Script](https://blog.adobe.com/en/publish/2018/04/03/audition-updates-spring-2018)                                                                      |

AnimateとPremiere Proは対象外です。Animateの[コマンド実行](https://helpx.adobe.com/jp/animate/desktop/multimedia-and-video/automating-tasks-commands-menu.html)はJSFL向けで、[JavaScript API](https://github.com/AdobeDocs/developers-animatesdk-docs/blob/master/Introduction/JavaScript_API_objects.md)も `app` を前提にした現行構成とは異なります。Premiere Proには単体JSXを選んで実行する標準メニューがなく、Adobeが案内する[ExtendScriptの実行経路はCEPパネル](https://community.adobe.com/questions-729/is-there-a-way-to-launch-one-time-use-jsx-script-files-like-you-can-in-after-effects-1401948)です。両製品のIDは初期設定・アプリ追加で拒否しますが、既存の利用者の設定やスクリプトを削除する処理は行いません。

実機確認済みのアプリ・版・条件は[検証記録](validation.md)に示します。InDesign・Auditionは実機未確認です。非公式のTypes-for-Adobeによる型検査・ビルドと、実機での動作確認は分けて扱います。

テンプレートは採用版の `extendscript-compat` の実行時初期化とビルド時補正を組み込み、補正後のES3構文検査を行います。APIごとの対応範囲・副作用・制限は採用版のcompatの契約に従います。[ポリフィル](polyfills.md) が参照先を案内します。`Symbol`・`Promise` やES5以降の全APIを提供する契約ではありません。補正後に再圧縮などコードを変更する工程を追加しないでください。

## 拡張点と変更可能な内部実装

`rollup.config.mjs` の既存設定を基にした追加プラグイン・出力先・ソースマップ設定の反映は維持対象です。ただし任意の第三者プラグインとの完全互換は保証しません。公開した拡張方法の廃止や、利用者による公開設定の書き換えを要求する変更はメジャー変更です。互換補正・検査の前提を壊す独自処理は利用者側で確認してください。

次は公開契約を保つ範囲で変更できます。

- コンパイル・圧縮の方式、プロセス構成、中間ファイル、キャッシュの内部形式
- 生成コードの変数名・改行・圧縮結果・バイト列、ソースマップの正確な内容
- ログと診断の正確な文面、検査規則や整形結果、テスト件数
- 既定の並列度・ヒープ上限。処理時間や最大使用メモリの数値は保証しません。

内部実装の変更でも、有効な入力と公開オプションの意味を維持します。

## 版番号と廃止

[SemVer](https://semver.org/lang/ja/)に従い、1.0.0以降は次で判断します。

| 区分     | 変更                                                                                          |
| -------- | --------------------------------------------------------------------------------------------- |
| パッチ   | 契約違反の不具合修正、文書訂正、契約を保つ性能改善                                            |
| マイナー | 既存利用を維持する任意の設定・コマンド・対応アプリ・公開APIの追加、廃止予定の告知             |
| メジャー | 公開設定の削除や意味の変更、標準出力先・公開APIの非互換変更、対応環境の縮小・最低版の引き上げ |

契約上無効な入力の拒否を修正する場合はパッチ、有効な入力を新たに拒否する場合はメジャーです。不具合による誤動作に依存した結果は維持しません。非推奨化しても1.xでは互換性を保ち、削除はメジャー更新で移行方法とともに案内します。

0.xの更新区分と公開操作は[リリース手順](release-process.md)に従います。契約を変更するときは、関連文書と振る舞いの検証も更新します。
