---
applyTo: "scripts/newScript.mjs,scripts/addApp.mjs,es.config.mjs"
description: "スクリプト追加・アプリ追加の手順と規約"
---

# スクリプト作成・管理ルール

## 新規スクリプト追加

### CLI モード（推奨）

```bash
pnpm new -- --app=<appId> --name=<ScriptName> --license
```

- `--app`: 対象アプリ ID（`aeft`, `ilst`, `phxs` 等）。必須
- `--name`: スクリプト名。必須。PascalCase 推奨
- `--license`: ライセンスバナーを含める場合に指定

### 予約名

以下はスクリプト名として使用不可：

- `lib` — アプリ固有ユーティリティディレクトリと衝突
- `types` — 型定義ディレクトリと衝突
- `tests` — テストディレクトリと衝突

## 新規アプリ追加

```bash
pnpm add-app -- --app=<appId>
```

以下が自動生成される：

- `src/{appId}/tsconfig.json`
- `src/{appId}/types/index.d.ts`
- `src/{appId}/lib/.gitkeep`
- `src/{appId}/example/index.ts`
- `es.config.mjs` に `scripts.{appId}` キーを追加

## es.config.mjs の構造

```mjs
export default {
  scripts: {
    aeft: [{ name: "ScriptName", version: "0.0.1", build: true, license: true }],
    ilst: [...],
    phxs: [...],
  },
  common: [{ name: "tests", version: "0.0.1", build: true, license: true }],
};
```

- `scripts.{appId}`: アプリ別のスクリプト配列。ビルド時に対応する tsconfig が使用される
- `common`: アプリに依存しないスクリプト（テスト等）。ルート tsconfig が使用される
