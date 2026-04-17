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
- **GitHub Copilot**（AI）に「こんなスクリプト書いて」と頼める
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

ビルドツールを動かすために必要です。バージョン **20 以上**をインストールしてください。

1. https://nodejs.org/ja にアクセス
2. 「LTS（推奨版）」をクリックしてダウンロード（執筆時点: v22.x）
3. インストーラを実行（デフォルトのまま）

インストール確認：

```bash
node --version
# v22.x.x と表示されれば OK（20以上であればOK）
```

---

### 1-5. pnpm（パッケージマネージャ）

Node.js のパッケージを管理するツールです。`npm` より高速でディスク容量も節約できます。

Node.js 16.9 以降には **Corepack** というツール管理機能が同梱されています。これを使うのが最も簡単な方法です。

Node.js をインストールした後、コマンドプロンプトまたは PowerShell で：

```bash
corepack enable pnpm
```

インストール確認：

```bash
pnpm --version
# 10.x.x と表示されれば OK
```

> **Corepack とは**: Node.js に同梱されたパッケージマネージャ管理ツールです。`npm install -g` と異なり、グローバルインストールなしでパッケージマネージャを切り替えられます。

---

## STEP 2: GitHub アカウントと GitHub Copilot について

### GitHub アカウントを作る

1. https://github.com/join にアクセス
2. メールアドレス、パスワード、ユーザー名を入力して登録
3. メール認証を完了させる

---

### 無料プランで GitHub Copilot はどこまで使える？

2025 年現在、GitHub は**無料アカウントでも GitHub Copilot が使えます**。

| 機能 | 無料プラン | Pro プラン（月 $10） |
|------|----------|---------------------|
| コード補完（AI インライン提案） | ✅ 月 2,000 回まで | ✅ 無制限 |
| Copilot Chat（チャット） | ✅ 月 50 回まで | ✅ 無制限 |
| エージェントモード（自律的なコード生成） | ✅（回数制限内） | ✅ 無制限 |
| 複数モデル選択（GPT-4o など） | ✅ 一部モデル | ✅ 全モデル |

> **初心者にとって**: 無料プランで十分スタートできます。慣れてきて毎日使うようになったら有料プランを検討しましょう。

---

### GitHub Copilot は VSCode に組み込み済み

VSCode 1.99（2025年3月）以降、**GitHub Copilot は VSCode にデフォルトで組み込まれています**。拡張機能を別途インストールする必要はありません。

ただし、チャット機能を使うには **GitHub アカウントでのサインインが必要**です。

サインイン手順：

1. VSCode 左下のアカウントアイコン（または右下の Copilot アイコン）をクリック
2. 「Sign in to use GitHub Copilot」をクリック
3. ブラウザが開くので GitHub アカウントでログイン
4. VSCode に戻ると Copilot Chat（吹き出しアイコン）が使えるようになる

> **サインインしないと**: コード補完もチャットも使えません。必ずサインインしてから次のステップへ進みましょう。

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

次に、VSCode のターミナルを開いてコマンドを貼り付けて実行します。

> **ターミナルの開き方**: メニュー「Terminal → New Terminal」、またはショートカット **Ctrl + `**（バッククォート）か **Ctrl + @** でも開けます。  
> **貼り付けのコツ**: ターミナル内では **右クリック** でペーストできます（Ctrl+V は効かない場合があります）。

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

### （オプション）ESLint と Prettier の拡張機能を入れる

コードの品質チェック（ESLint）と自動整形（Prettier）を VSCode で使えるようにしておくと便利です。

1. VSCode の拡張機能パネル（左サイドバーの四角いアイコン）を開く
2. 以下の 2 つをインストール：
   - 「**ESLint**」（`dbaeumer.vscode-eslint`）
   - 「**Prettier - Code formatter**」（`esbenp.prettier-vscode`）

**保存時に自動整形を有効にする**（Ctrl+S で整形）：

VSCode の設定（`Ctrl + ,`）を開き、右上の「**{}**（設定を JSON で開く）」アイコンをクリックして、以下を追加します：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

これで TypeScript ファイルを Ctrl+S で保存するたびに自動整形されます。

---

## STEP 5: GitHub Copilot にスクリプトを作ってもらう

このテンプレートには `.github/` フォルダ内に **Copilot 用のスキル定義**が含まれています。これにより、Copilot が「スクリプト追加」の手順を自律的に実行できます。

### 5-1. Copilot Chat に一言頼むだけ

VSCode 左サイドバーの **Copilot Chat**（吹き出しアイコン）を開き、チャットモードを「**Agent**」に切り替えてから、以下のように入力します：

```
/add-script 選択中のレイヤーの Position にウィグルエクスプレッションを適用するスクリプトを作って
```

Copilot が自律的に以下をすべてやってくれます：

1. 足りない情報（アプリ・スクリプト名など）を質問してくれる
2. `pnpm new` でファイルを生成する
3. スクリプトの実装まで書いてくれる

> **Agent モードとは**: Copilot がファイル操作やターミナルコマンドを自律的に実行するモードです。チャットモードのドロップダウンから「Agent」を選んでください。

---

### 5-2. 生成されるコードの例

Copilot が以下のようなコードを `src/aeft/WiggleApplier/index.ts` に生成します：

```typescript
// shimを実行するために、initのimportが必須です。
import "../../init";

import { entry } from "../../lib/lib";

entry("WiggleApplier", () => {
  const comp = app.project.activeItem;
  // アクティブなコンポジションが選択されていない場合は終了
  if (!(comp && comp instanceof CompItem)) {
    alert("コンポジションを選択してください。");
    return;
  }

  const selected = [...comp.selectedLayers];
  // 選択レイヤーがない場合は終了
  if (selected.length === 0) {
    alert("レイヤーを選択してください。");
    return;
  }

  // 選択中のすべてのレイヤーにウィグルエクスプレッションを適用
  for (const layer of selected) {
    const position = layer.property("ADBE Transform Group")?.property(
      "ADBE Position"
    ) as Property | null;

    if (!position) continue;

    // エクスプレッションを設定（wiggle(周波数, 振幅)）
    position.expression = "wiggle(3, 30)";
  }

  alert(`${selected.length} 個のレイヤーにウィグルを適用しました。`);
});
```

---

### 5-3. コードの意味を理解する

| コード | 意味 |
|--------|------|
| `import "../../init"` | ES5/ES6 のポリフィルを読み込む（必須） |
| `entry("WiggleApplier", () => { ... })` | エラーハンドリングと Undo グループをまとめてくれる便利関数 |
| `app.project.activeItem` | 現在 After Effects で開いているアイテム |
| `comp.selectedLayers` | コンポジション内で選択中のレイヤー一覧 |
| `position.expression = "wiggle(3, 30)"` | エクスプレッションを設定（周波数 3Hz、振幅 30px） |

---

## STEP 6: ビルドする

```bash
pnpm build
```

成功すると `dist/aeft/WiggleApplier/WiggleApplier.jsx` が生成されます。

エラーが出た場合は Copilot Chat に「このエラーを修正して」と貼り付けると直してくれます。

---

## STEP 7: After Effects で使う

1. After Effects を起動する
2. メニューから「**ファイル → スクリプト → スクリプトファイルを実行...**」
3. 先ほど生成された `dist/aeft/WiggleApplier/WiggleApplier.jsx` を選択
4. コンポジションでレイヤーを選択した状態でスクリプトを実行
5. 選択したレイヤーの Position にウィグルエクスプレッションが適用されます！

> **毎回メニューから選ぶのが面倒な場合**:  
> `WiggleApplier.jsx` を After Effects の `Scripts/ScriptUI Panels/` フォルダにコピーすると、メニューに常駐させることもできます。

---

## よくあるエラーと対処法

### `pnpm: コマンドが見つかりません`

Node.js のインストール後にターミナルを再起動してから、再度 `corepack enable pnpm` を実行してみてください。  
それでもダメなら管理者権限でコマンドプロンプトを開いて実行してください。

### ビルドエラー: `TS2339: Property 'xxx' does not exist`

型定義が不足しているサインです。Copilot Chat に「このエラーを型アサーションで回避して」と頼んでみてください。  
または `as any` を一時的に付けてビルドを通すことができます。

### After Effects でスクリプトを実行しても何も起きない

- コンポジションが開かれているか確認
- レイヤーが選択されているか確認
- After Effects のメニュー「編集 → 環境設定 → スクリプトとエクスプレッション」で「スクリプトによるファイルおよびネットワークへのアクセスを許可」にチェックが入っているか確認

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
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint): コードの問題をリアルタイムで検出
  - [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode): コードを自動整形

---

## まとめ

| やったこと | コマンド |
|-----------|---------|
| 環境構築 | VSCode / Git / GitHub CLI / Node.js / pnpm をインストール |
| リポジトリ作成 | GitHub の Use this template → Code > GitHub CLI → `gh repo clone` |
| 依存関係インストール | `pnpm i` |
| スクリプト作成（AI） | Copilot Chat（Agent モード）で `/add-script ...` と入力 |
| ビルド | `pnpm build` |
| AE で実行 | ファイル → スクリプト → スクリプトファイルを実行... |

このテンプレートを使えば「コードは書けないけど After Effects の自動化はしたい」という方でも、AI の力を借りて実用的なスクリプトを作れます。  

ぜひ自分の作業フローを自動化してみてください！

---

## 参考リンク

- [extendscript-ts-template](https://github.com/YukiWorks432/extendscript-ts-template) - このテンプレートの GitHub リポジトリ
- [Types-for-Adobe](https://github.com/docsforadobe/Types-for-Adobe) - Adobe アプリの型定義（有志作成）
- [After Effects スクリプティングガイド](https://ae-scripting.docsforadobe.dev/) - AE のオブジェクト・メソッド一覧（英語）
- [GitHub Copilot の無料プランについて](https://docs.github.com/ja/copilot/about-github-copilot/subscription-plans-for-github-copilot) - 公式ドキュメント
