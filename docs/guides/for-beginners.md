# After Effects スクリプトを TypeScript で作ろう【完全初心者ガイド】

> **対象読者**: プログラミング経験ゼロ〜少しある方。After Effects は使えるけど自動化には踏み出せていない方。

---

## はじめに

After Effects で同じ作業を繰り返していませんか？  
たとえば「選択したレイヤー全部にウィグルをかけたい」とか「100 枚の画像を一括で整列したい」とか。

実は After Effects には **ExtendScript** という自動化の仕組みがあります。  
しかし ExtendScript は古い JavaScript（ES3）ベースで、そのまま書くのは現代の感覚からすると非常につらい。

このテンプレートを使えば：

- **TypeScript**（モダンな型付き JavaScript）でスクリプトを書ける
- `Array.map()`、`for...of`、テンプレートリテラルなどの便利な構文が使える
- **コーディングAI**に「こんなスクリプト書いて」と頼める
- ビルド一発で After Effects が読める `.jsx` ファイルが出力される

それでは環境構築から始めましょう。

---

## STEP 1: 必要なツールをインストールする

### 1-1. VSCode（エディタ）

コードを書くためのエディタです。無料で使えます。

1. https://code.visualstudio.com/ にアクセス
2. 「Download for Windows」をクリックしてインストーラをダウンロード
3. インストーラを実行（すべてデフォルトのままで OK）

インストール後、VSCode を起動して日本語化しておくと使いやすいです：

1. VSCode を開く
2. 左のサイドバーにある四角いアイコン（Extensions）をクリック
3. 検索ボックスに「Japanese」と入力
4. 「Japanese Language Pack for Visual Studio Code」をインストール
5. VSCode を再起動

---

### 1-2. Git（バージョン管理ツール）

コードの変更履歴を管理するツールです。GitHub と連携するために必要です。

1. https://git-scm.com/ にアクセス
2. 「Download for Windows」をクリックしてダウンロード
3. インストーラを実行

> **インストール中の選択肢**: すべてデフォルトのままで問題ありません。

インストール確認：

```bash
git --version
# git version 2.x.x と表示されれば OK
```

---

### 1-3. GitHub CLI（GitHub 操作ツール）

GitHub をコマンドラインから操作するツールです。クローンや認証が楽になります。

1. https://cli.github.com/ にアクセス
2. 「Download for Windows」をクリック
3. インストーラを実行（デフォルトのまま）

インストール確認：

```bash
gh --version
# gh version x.x.x と表示されれば OK
```

---

### 1-4. Node.js（JavaScript 実行環境）

ビルドツールを動かすために必要です。`^24.22.1`（Node.js 24.22.1 以降の24系）をインストールしてください。

1. https://nodejs.org/ja/download にアクセス
2. Node.js 24 系のインストーラーを選んでダウンロード
3. インストーラーを実行（デフォルトのまま）

インストール確認：

```bash
node --version
# v24.22.1 以降の24系であることを確認
```

---

### 1-5. pnpm（パッケージマネージャ）

Node.js のパッケージを管理するツールです。`npm` より高速でディスク容量も節約できます。

このテンプレートは `package.json` の `devEngines.packageManager` で pnpm `^12.16.1` を指定します。pnpm を npm からインストールすると、テンプレート内で起動したときに、この範囲に合う版が使われます。

Node.js をインストールした後、プロジェクトをクローンする前に、コマンドプロンプトまたは PowerShell で pnpm をインストールします。

```bash
npm install --global pnpm
```

プロジェクトをクローンして移動した後、pnpm の版を確認します。

```bash
pnpm --version
# 12.16.1 以降の12系であることを確認
```

---

## STEP 2: GitHubアカウントとコーディングAIを準備する

### GitHub アカウントを作る

1. https://github.com/join にアクセス
2. メールアドレス、パスワード、ユーザー名を入力して登録
3. メール認証を完了させる

---

### コーディングAIを使う場合

Codexなど、ローカルのファイルとターミナルを扱えるコーディングAIを利用できます。導入・サインイン・料金は各製品の公式案内に従ってください。

このテンプレートの共通指示は `AGENTS.md`、作業手順は `.agents/skills/` にあります。Codexを中心にした構成ですが、別のAIでも該当するMarkdownを読むように依頼できます。AIごとに自動読み込みの仕様は異なります。

---

### GitHub CLI でサインインする

後でリポジトリをクローンするために必要です。

```bash
gh auth login
```

対話形式で以下を選択します：

```
? Where do you use GitHub? → GitHub.com
? What is your preferred protocol for Git operations? → HTTPS
? Authenticate Git with your GitHub credentials? → Yes
? How would you like to authenticate GitHub CLI? → Login with a web browser
```

ブラウザが開くので、表示されるコードを入力して認証を完了させます。

---

## STEP 3: リポジトリを作ってクローンする

### 3-1. テンプレートからリポジトリを作る

1. https://github.com/YukiWorks432/extendscript-ts-template にアクセス
2. 緑色の「**Use this template**」ボタンをクリック
3. 「Create a new repository」を選択
4. リポジトリ名を入力

   > **リポジトリ名のコツ**: このテンプレートは After Effects だけでなく Illustrator・Photoshop など複数のアプリのスクリプトをまとめて管理できます。`my-ae-scripts` のようにアプリ名を入れると後で管理しにくくなるので、`my-adobe-scripts` や `adobe-automation` など**アプリを限定しない名前**にしておくのがおすすめです。

5. Private / Public を選ぶ（どちらでも OK）
6. 「Create repository」をクリック

これで自分専用のリポジトリが作られました！

---

### 3-2. ローカルにクローンする

作成したリポジトリのページで、クローン用のコマンドをコピーします：

1. リポジトリページの緑色の「**< > Code**」ボタンをクリック
2. 「**GitHub CLI**」タブを選択
3. 表示されたコマンド（`gh repo clone ...`）をコピー

```
例: gh repo clone tanaka/my-adobe-scripts
```

次に、**コマンドプロンプト**（またはPowerShell）を開き、クローン先のフォルダに移動してからコマンドを貼り付けて実行します。

> **クローン先フォルダについて**: `gh repo clone` を実行したカレントディレクトリの中にリポジトリ名のフォルダが作られます。
> たとえば `C:\Users\ユーザー名\Documents` で実行すると `C:\Users\ユーザー名\Documents\my-adobe-scripts` にクローンされます。
> 管理しやすい場所（ドキュメントやデスクトップなど）に `cd` コマンドで移動してから実行しましょう。
>
> ```bash
> cd C:/Users/ユーザー名/Documents
> gh repo clone tanaka/my-adobe-scripts
> ```

> **コマンドプロンプトの開き方**: Windowsキー + R → `cmd` と入力して Enter、または スタートメニューで「コマンドプロンプト」と検索します。

クローンが完了したら、フォルダに移動します：

```bash
cd my-adobe-scripts
```

---

### 3-3. VSCode で開く

```bash
code .
```

これで VSCode がプロジェクトを開きます。

---

## STEP 4: 依存関係をインストールする

VSCode のターミナルを開いてください（**Ctrl + `** または **Ctrl + @**）。

```bash
pnpm i
```

数十秒で完了します。これで TypeScript のコンパイラや Rollup（バンドラー）などが使えるようになります。

---

### （オプション）Oxc の拡張機能を入れる

Oxlint の診断と Oxfmt による自動整形を VSCode で使うには、Oxc の拡張機能を利用できます。

1. VSCode の拡張機能パネル（左サイドバーの四角いアイコン）を開く
2. Oxc 拡張機能をインストールします（oxc.oxc-vscode）。

**保存時に自動整形を有効にする**（Ctrl+S で整形）：

VSCode の設定（`Ctrl + ,`）を開き、右上の「**{}**（設定を JSON で開く）」アイコンをクリックして、以下を追加します：

```json
{
  "[javascript]": {
    "editor.defaultFormatter": "oxc.oxc-vscode",
    "editor.formatOnSave": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "oxc.oxc-vscode",
    "editor.formatOnSave": true
  }
}
```

これで JavaScript と TypeScript ファイルを Ctrl+S で保存するたびに Oxfmt で整形されます。

---

## STEP 5: コーディングAIにスクリプトを作ってもらう

### 5-1. 対象と目的を伝える

AIでリポジトリを開き、例えば次のように依頼します。

```text
AGENTS.mdと.agents/skills/add-script/SKILL.mdを読んでください。
After Effects向けのWiggleApplierを作成し、選択レイヤーのPositionに
ウィグルエクスプレッションを設定してください。
pnpm build aeft/WiggleApplierで検証してください。
```

AIは不足する仕様を確認し、生成CLIでファイルを追加し、説明コメントと実装を完成させて単体ビルドします。`.agents/skills/` を認識するAIでは、自然な依頼から該当するスキルを利用できます。認識されない場合は上のようにファイルを明示します。

説明コメントは [スクリプト説明コメントブロック](../script-comment-block.md) に従います。AIの生成結果を確認し、Adobe実機でも期待する操作になることを確認してください。

<details>
<summary>AI を使わずに手動でスクリプトを作る場合</summary>

#### 手順 1: ファイルを生成する

ターミナルで以下のコマンドを実行します（スクリプト名は任意）：

```bash
pnpm new -- --app=aeft --name=WiggleApplier --license
```

もしくは対話式に進めることもできます。

```bash
pnpm new

> 対象アプリを選択してください（aeft, ilst, phxs）
aeft
> スクリプト名を入力してください:
WiggleApplier
> ライセンス表記を含めますか？ (y/N)
n
```

`src/aeft/WiggleApplier/index.ts` が自動生成されます。

#### 手順 2: コードを書く

生成された `src/aeft/WiggleApplier/index.ts` を VSCode で開き、下の「生成されるコードの例」を参考にして実装を書きます。

- `import "../../init"` は必ず先頭に残してください（ポリフィルの読み込みに必要）
- `entry("スクリプト名", () => { ... })` の中に処理を書きます
- After Effects のオブジェクト・メソッドは [AE スクリプティングガイド](https://ae-scripting.docsforadobe.dev/) で確認できます

</details>

---

### 5-2. 生成されるコードの例

例えば、以下のようなコードを `src/aeft/WiggleApplier/index.ts` に生成します：

```typescript
/**
 * @script WiggleApplier
 * @app aeft
 * @material-symbols animation, layers, tune
 * @description
 *   選択中のレイヤーを対象に、Position へウィグルエクスプレッションを適用する。
 *
 * @workflow
 *   1. コンポジションでレイヤーを選択する
 *   2. スクリプトを実行する
 *   3. 選択レイヤーの Position にウィグルが適用されたことを確認する
 */

// shimを実行するために、initのimportが必須です。
import "../../init";

import { entry } from "../../lib/lib";

entry("WiggleApplier", () => {
  const comp = app.project.activeItem;
  // アクティブなコンポジションが選択されていない場合は終了
  if (!(comp && comp instanceof CompItem)) {
    throw new Error("コンポジションを選択してください。");
  }

  const selected = [...comp.selectedLayers];
  // 選択レイヤーがない場合は終了
  if (selected.length === 0) {
    throw new Error("レイヤーを選択してください。");
  }

  // 選択中のすべてのレイヤーにウィグルエクスプレッションを適用
  for (const layer of selected) {
    const position = layer
      .property("ADBE Transform Group")
      ?.property("ADBE Position") as Property | null;

    if (!position) continue;

    // エクスプレッションを設定（wiggle(周波数, 振幅)）
    position.expression = "wiggle(3, 30)";
  }

  const dialog = new Window("dialog", "完了");
  dialog.add(
    "statictext",
    undefined,
    `${selected.length} 個のレイヤーにウィグルを適用しました。`
  );
  dialog.add("button", undefined, "OK", { name: "ok" });
  dialog.show();
});
```

---

### 5-3. コードの意味を理解する

| コード                                  | 意味                                                       |
| --------------------------------------- | ---------------------------------------------------------- |
| `import "../../init"`                   | ES5/ES6 のポリフィルを読み込む（必須）                     |
| `entry("WiggleApplier", () => { ... })` | エラーハンドリングと Undo グループをまとめてくれる便利関数 |
| `app.project.activeItem`                | 現在 After Effects で開いているアイテム                    |
| `comp.selectedLayers`                   | コンポジション内で選択中のレイヤー一覧                     |
| `position.expression = "wiggle(3, 30)"` | エクスプレッションを設定（周波数 3Hz、振幅 30px）          |

---

## STEP 6: 型チェックしてビルドする

```bash
pnpm typecheck -- --app=aeft
pnpm build aeft/WiggleApplier
```

型チェックでは成果物を作らず TypeScript の型エラーを確認します。両方が成功すると `dist/aeft/WiggleApplier/WiggleApplier.jsx` が生成されます。

エラーが出た場合は 利用中のAI に「このエラーを修正して」と貼り付けると直してくれます。

<details>
<summary>AI を使わずにエラーを修正する場合</summary>

型チェックまたはビルドでエラーが出たときは、エラーメッセージに含まれるファイル名・行番号を確認して該当箇所を修正します。

**よくあるエラーと対処法**:

| エラー                                  | 対処                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `TS2339: Property 'xxx' does not exist` | 実際のAPIと型宣言を確認する。[Types-for-Adobe](https://github.com/docsforadobe/Types-for-Adobe) でプロパティ名を確認する |
| `TS2304: Cannot find name 'xxx'`        | AE のグローバルオブジェクト名が間違っている。スクリプティングガイドで正式名称を確認する                                  |
| `TS1005: ',' expected` など構文エラー   | 該当行の括弧・カンマ・クォートの対応を確認する                                                                           |

修正後は再度 `pnpm typecheck -- --app=aeft` と `pnpm build aeft/WiggleApplier` を実行してエラーが消えることを確認してください。

</details>

---

## STEP 7: After Effects で使う

1. After Effects を起動します
2. メニューから「**ファイル → スクリプト → スクリプトファイルを実行...**」を選択します
3. 先ほど生成された `dist/aeft/WiggleApplier/WiggleApplier.jsx` を選択します
4. コンポジションでレイヤーを選択した状態でスクリプトを実行します
5. 選択したレイヤーの Position にウィグルエクスプレッションが適用されます！

> **毎回メニューから選ぶのが面倒な場合**:  
> `WiggleApplier.jsx` を After Effects の `Scripts/ScriptUI Panels/` フォルダにコピーすると、メニューに常駐させることもできます。

---

## よくあるエラーと対処法

### `pnpm: コマンドが見つかりません`

Node.js のインストール後にターミナルを再起動してください。それでも見つからない場合は、プロジェクト外のフォルダへ移動してから `npm install --global pnpm` を実行します。

### ビルドエラー: `TS2339: Property 'xxx' does not exist`

型定義が不足している可能性があります。実際のAdobe APIを確認し、必要ならアプリ固有の型宣言を補います。型アサーションだけでエラーを隠さないでください。

### After Effects でスクリプトを実行しても何も起きない

- コンポジションが開かれているか確認してください
- レイヤーが選択されているか確認してください
- After Effects のメニュー「編集 → 環境設定 → スクリプトとエクスプレッション」で「スクリプトによるファイルおよびネットワークへのアクセスを許可」にチェックが入っているか確認してください

### `gh repo clone` でエラーが出る

`gh auth login` でログインできているか確認してください：

```bash
gh auth status
```

---

## 次のステップ

環境構築とスクリプト作成ができたら、次はこんなことを試してみましょう：

- **複数のスクリプトを管理する**: `pnpm new` でどんどんスクリプトを追加できます
- **共通処理をライブラリ化する**: `src/aeft/lib/lib.ts` に共通関数をまとめられます
- **Illustrator / Photoshop 向けも作る**: `--app=ilst` や `--app=phxs` で他アプリ向けも同じ手順で作れます
- **VSCode の推奨拡張機能を使う**:
  - [ExtendScript Debugger](https://marketplace.visualstudio.com/items?itemName=Adobe.extendscript-debug): スクリプトを VSCode からデバッグ実行できる（Adobe 公式）
  - [Oxc](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode): Oxlint でコードの問題を検出し、Oxfmt で自動整形

---

## まとめ

| やったこと           | コマンド                                                          |
| -------------------- | ----------------------------------------------------------------- |
| 環境構築             | VSCode / Git / GitHub CLI / Node.js / pnpm をインストール         |
| リポジトリ作成       | GitHub の Use this template → Code > GitHub CLI → `gh repo clone` |
| 依存関係インストール | `pnpm i`                                                          |
| スクリプト作成（AI） | AIに `AGENTS.md` と `add-script` の手順を明示して依頼             |
| 型チェック           | `pnpm typecheck -- --app=aeft`                                    |
| ビルド               | `pnpm build aeft/WiggleApplier`                                   |
| AE で実行            | ファイル → スクリプト → スクリプトファイルを実行...               |

このテンプレートを使えば「コードは書けないけど After Effects の自動化はしたい」という方でも、AI の力を借りて実用的なスクリプトを作れます。

ぜひ自分の作業フローを自動化してみてください！

---

## 参考リンク

- [extendscript-ts-template](https://github.com/YukiWorks432/extendscript-ts-template) - このテンプレートの GitHub リポジトリ
- [Types-for-Adobe](https://github.com/docsforadobe/Types-for-Adobe) - Adobe アプリの型定義（有志作成）
- [After Effects スクリプティングガイド](https://ae-scripting.docsforadobe.dev/) - AE のオブジェクト・メソッド一覧（英語）
- [Codexのプロジェクト指示](https://learn.chatgpt.com/docs/agent-configuration/agents-md) - 共通指示の読み込み
