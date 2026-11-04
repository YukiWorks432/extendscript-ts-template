import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

export const fingerprint = (content) =>
  createHash("sha256")
    .update(content.toString("utf8").replace(/\r\n/g, "\n"))
    .digest("hex");

// 初期ファイルと識別できた対象だけを削除・置換するための一覧です。
export async function collectTemplateDefaults(root) {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8")
  );
  const config = (
    await import(
      pathToFileURL(path.join(root, "es.config.mjs")).href +
        "?defaults=" +
        Date.now()
    )
  ).default;
  const apps = Object.keys(config.scripts);
  const files = {};
  const visit = (relative) => {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return;
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink())
      throw new Error("初期ファイル一覧にリンクは含められません: " + relative);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolute).toSorted())
        visit(relative + "/" + name);
    } else {
      files[relative] = fingerprint(fs.readFileSync(absolute));
    }
  };
  for (const relative of [
    "README.md",
    "es.config.mjs",
    "AGENTS.md",
    ".agents",
    ".codex",
    ".github/FUNDING.yml",
    ...apps.map((app) => "src/" + app),
  ])
    visit(relative);
  return { packageName: pkg.name, packageAuthor: pkg.author, apps, files };
}

const root = fileURLToPath(new URL("../", import.meta.url));
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  if (process.argv[2] !== "--write")
    throw new Error("保守用: node scripts/configureTemplate.mjs --write");
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8")
  );
  if (pkg.templateConfigured)
    throw new Error("初期設定後のプロジェクトでは更新できません。");
  fs.writeFileSync(
    path.join(root, "scripts/configure-template.json"),
    JSON.stringify(await collectTemplateDefaults(root), null, 2) + "\n"
  );
  console.log("初期ファイル一覧を更新しました。");
}
