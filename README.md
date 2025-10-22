# extendscript-ts-template

ExtendScriptをTypeScriptからトランスパイルして作成するためのリポジトリです。

独自に調節した[es5-shim](https://github.com/es-shims/es5-shim)と[es6-shim](https://github.com/paulmillr/es6-shim)を注入することで、
ES6相当のライブラリを使用できます。  
TypeScriptからトランスパイルするため、文法は最新のものを使用できます。　　

ExtendScriptの制約により、`Symbol` `Promise`など、一部のライブラリはオミットされています。  
（Symbolはそもそも不可能。Promiseは予約語の使用が必須となるため不可能。）  
また、shimの詳細な動作は各shimを参照してください。
shimの限界として、正しく動作しないものはeslintによってエラーとして表示されます。
また、一般的なprettierルールを同封しています。

型情報には[Types-for-Adobe](https://github.com/docsforadobe/Types-for-Adobe)を使用しています。  
これは有志によって作成されたもので、公式の情報ではないため、定義されていない情報がいくつもあります。足りない定義などがあればプルリクエストを検討してください。

対応するソフトウェア（AfterEffects / Illustrator / Photoshop など）ごとにリポジトリを分けることを想定しています。  
対応するソフトウェアごとに必要な設定は[使い方](#使い方--usage)にて説明します。

## 環境 / Environment

- Node.js >= 20
- pnpm

## テスト環境 / Tested enviroment

- Node.js v22.15.0
- Windows 11
- AfterEffects 2025 / Illustrator 2025 / Photoshop 2025

## インストール / Install

このリポジトリはテンプレートリポジトリです。`Use this repository`から自分用のリポジトリを作成してください。

```bash
pnpm i
pnpm build
```

## 使い方 / Usage

スクリプトごとにリポジトリを作るのはあまりに非効率的なので、  
srcフォルダ内に各スクリプトのフォルダと`index.ts`を作成し、  
`es.config.mjs`からスクリプトを登録します。書き方は以下の通りです。

以下のコマンドを使用することで、この操作を簡略化することができます。
スクリプト名と、ライセンスの埋め込みの有無を入力すれば、ディレクトリ/index.tsの作成、`es.config.mjs`への追記を行います（一番目に追記されます）。

```shell
pnpm new

> Please enter the script name: 
example
> Include a license field? (y/N): 
n
> Addition complete: Appended "example" to es.config.mjs.
> Created script directory and index.ts template: src/example/index.ts
```

```mjs
// es.config.mjs
export default {
  scripts: [
    {
      // src/tests/index.ts がビルドされます.
      name: "tests",
      // 出力ファイルのバナーに記載されます.
      version: "0.0.1",
      // ビルドの可否.
      build: true,
      // src/tests/LICENSE の内容を出力ファイルに挿入します.
      // src/tests/LICENSE がない場合、./LICENSE が使用されます.
      license: true,
    },
    {
      // src/example/index.ts がビルドされます.
      name: "example",
      version: "0.0.1",
      build: true,
      // src/example/LICENSE の内容を出力ファイルに挿入します.
      license: true,
    },
  ],
};
```

```ts
// src/example/index.ts

// shimを実行するために、initのimportが必須です。
import "init";

// write your core...
alert("examle");
```

型定義はtsconfig.jsonで、Types-for-Adobeから読み込むように設定されています。
対応するソフトウェアを変更する場合は`types`の内容を変更してください。

**AfterEffects の場合**

```json
"types": [
  "./node_modules/types-for-adobe/AfterEffects/22.0",
  "./node_modules/types-for-adobe/shared/PlugPlugExternalObject",
  "./node_modules/types-for-adobe/shared/XMPScript"
]
```

**Animate の場合**

```json
"types": [
  "./node_modules/types-for-adobe/Animate/22.0",
  "./node_modules/types-for-adobe/shared/PlugPlugExternalObject",
]
```

**Audition の場合**

```json
"types": [
  "./node_modules/types-for-adobe/Audition/2018",
  "./node_modules/types-for-adobe/shared/PlugPlugExternalObject",
]
```

**Illustrator の場合**

```json
"types": [
  "./node_modules/types-for-adobe/Illustrator/2022",
  "./node_modules/types-for-adobe/shared/PlugPlugExternalObject"
]
```

**InDesign の場合**

```json
"types": [
  "./node_modules/types-for-adobe/InDesign/2023",
  "./node_modules/types-for-adobe/shared/PlugPlugExternalObject"
]
```

**Photoshop の場合**

```json
"types": [
  "./node_modules/types-for-adobe/Photoshop/2015.5",
  "./node_modules/types-for-adobe/shared/PlugPlugExternalObject"
]
```

**Premiere の場合**

```json
"types": [
  "./node_modules/types-for-adobe/Premiere/24.0",
  "./node_modules/types-for-adobe-extras/Premiere/24.0/qeDom"
  "./node_modules/types-for-adobe/shared/PlugPlugExternalObject"
]
```

## ビルド / Build

pnpmからスクリプトでビルドします。

```bash
pnpm build
```

watchもあります。

```bash
pnpm watch
```

## テスト / Test

`src/tests/tests.ts`にテストを記述しています。
ビルドして実行すればダイアログが表示され、shimが想定通り動いているかが表示されます。
