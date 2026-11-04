import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  APP_TYPES_MAP,
  EXAMPLE_SCRIPT,
  createAppFiles,
  getBuildScriptAlias,
} from "./appScaffold.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
class Cancelled extends Error {}

function formatContent(root, relative, content) {
  const packagePath = require.resolve("oxfmt/package.json");
  const formatter = path.join(path.dirname(packagePath), "bin/oxfmt");
  return execFileSync(
    process.execPath,
    [formatter, "--stdin-filepath", relative],
    { cwd: root, input: content, encoding: "utf8" }
  );
}

async function planConfiguration(root, choices, originalPackage) {
  const pkg = { ...originalPackage, scripts: { ...originalPackage.scripts } };
  if (
    choices.name.length > 214 ||
    !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(choices.name)
  )
    throw new Error(
      "プロジェクト名には小文字の英数字・ハイフン等で有効なパッケージ名を指定してください。"
    );
  if (
    !choices.apps.length ||
    choices.apps.some((app) => !Object.hasOwn(APP_TYPES_MAP, app))
  )
    throw new Error("使用アプリを対応するIDから1つ以上選択してください。");
  const config = (
    await import(
      pathToFileURL(path.join(root, "es.config.mjs")).href +
        "?configure=" +
        Date.now()
    )
  ).default;
  const apps = [...new Set(choices.apps)];
  const writes = new Map();
  const removals = new Set();
  for (const app of Object.keys(config.scripts)) {
    if (apps.includes(app)) continue;
    removals.add("src/" + app);
    delete config.scripts[app];
    delete pkg.scripts["build:" + app];
  }
  for (const app of apps) {
    if (!Object.hasOwn(config.scripts, app)) {
      if (fs.existsSync(path.join(root, "src", app)))
        throw new Error(
          "src/" +
            app +
            " が既に存在します。初期設定を中止し、手動設定の手順を確認してください。"
        );
      config.scripts[app] = choices.examples ? [{ ...EXAMPLE_SCRIPT }] : [];
      for (const [relative, content] of Object.entries(createAppFiles(app))) {
        if (choices.examples || !relative.includes("/example/"))
          writes.set(
            relative,
            content ? formatContent(root, relative, content) : content
          );
      }
      pkg.scripts["build:" + app] = getBuildScriptAlias(app);
    } else if (!choices.examples) {
      removals.add("src/" + app + "/example");
      config.scripts[app] = config.scripts[app].filter(
        (entry) => entry.name !== "example"
      );
    }
  }
  if (!choices.agents)
    for (const relative of ["AGENTS.md", ".agents", ".codex"])
      removals.add(relative);
  removals.add(".github/FUNDING.yml");
  for (const relative of removals)
    if (!fs.existsSync(path.join(root, relative))) removals.delete(relative);
  pkg.name = choices.name;
  const previousVersion = pkg.version;
  pkg.version = "0.1.0";
  delete pkg.author;
  pkg.templateConfigured = true;
  const tick = String.fromCharCode(96);
  const command = (value) => tick + value + tick;
  const readme = [
    "# " + choices.name,
    "",
    "Adobe向けExtendScriptをTypeScriptで開発するプロジェクトです。",
    "",
    "使用アプリ: " + apps.map(command).join(", "),
    "",
    "## 開発手順",
    "",
    command("pnpm install") + " で依存関係を導入します。",
    "",
    tick.repeat(3) + "sh",
    "pnpm new -- --app=" + apps[0] + " --name=MyScript --license",
    "pnpm typecheck",
    "pnpm build",
    tick.repeat(3),
    "",
    "生成物は " +
      command("dist/<appId>/<ScriptName>/<ScriptName>.jsx") +
      " に出力されます。",
    "",
    "- [最初のスクリプトの作成と実行](docs/guides/getting-started.md)",
    "- [構成とビルド設定](docs/project-overview.md)",
    "- [互換補正と制限](docs/polyfills.md)",
    "- [初期設定の選択肢と手動設定](docs/template-customization.md)",
    "",
    "このプロジェクトは [extendscript-ts-template](https://github.com/YukiWorks432/extendscript-ts-template) を基にしています。",
    "",
  ].join("\n");
  const configText =
    '/** @type {import("./src/types/es.config").EsConfig} */\nconst config = ' +
    JSON.stringify(config, null, 2) +
    ";\n\nexport default config;\n";
  writes.set("es.config.mjs", formatContent(root, "es.config.mjs", configText));
  writes.set("README.md", formatContent(root, "README.md", readme));
  // 完了印は最後に保存し、再実行で利用者の名前や版を初期値へ戻さない。
  writes.set(
    "package.json",
    formatContent(root, "package.json", JSON.stringify(pkg, null, 2) + "\n")
  );
  for (const relative of [...writes.keys(), ...removals]) {
    const absolute = path.resolve(root, relative);
    if (!absolute.startsWith(path.resolve(root) + path.sep))
      throw new Error("変更対象がプロジェクトの外です。");
    let ancestor = absolute;
    while (ancestor !== path.resolve(root)) {
      if (fs.lstatSync(ancestor, { throwIfNoEntry: false })?.isSymbolicLink())
        throw new Error("リンクを含む変更対象は適用できません: " + relative);
      ancestor = path.dirname(ancestor);
    }
  }
  return { apps, writes, removals, previousVersion };
}

function applyConfiguration(root, plan) {
  for (const [relative, content] of plan.writes) {
    if (relative === "package.json") continue;
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
  }
  for (const relative of plan.removals)
    fs.rmSync(path.join(root, relative), { recursive: true, force: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    plan.writes.get("package.json"),
    "utf8"
  );
}
async function main() {
  const args = process.argv.slice(2).filter((value) => value !== "--");
  if (args.length) {
    if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
      console.log(
        "pnpm run configure\n新しいテンプレートコピーを対話式で初期設定します。"
      );
      return;
    }
    throw new Error("引数は不要です。pnpm run configure を実行してください。");
  }
  const origin = spawnSync("git", ["config", "--get", "remote.origin.url"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  if (
    /(?:https?:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)YukiWorks432\/extendscript-ts-template(?:\.git)?\/?$/i.test(
      origin.stdout?.trim() || ""
    )
  )
    throw new Error(
      "配布元リポジトリでは初期設定できません。Use this template で作成したコピーで実行してください。"
    );
  const pkg = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")
  );
  if (pkg.templateConfigured === true) {
    console.log("初期設定済みです。ファイルは変更しません。次の操作: pnpm new");
    return;
  }
  const status = spawnSync(
    "git",
    [
      "--no-optional-locks",
      "status",
      "--porcelain=v1",
      "--untracked-files=normal",
    ],
    { cwd: projectRoot, encoding: "utf8" }
  );
  if (status.status !== 0)
    throw new Error(
      "Gitの状態を確認できません。新しいリポジトリをクローンし、依存導入後・編集前に実行してください。"
    );
  if (status.stdout)
    throw new Error(
      "未コミット変更または未追跡ファイルがあります。初期設定は編集前のコピーで実行してください。ファイルは変更していません。"
    );
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const iterator = rl[Symbol.asyncIterator]();
  rl.on("SIGINT", () => rl.close());
  const ask = async (question) => {
    process.stdout.write(question);
    const answer = await iterator.next();
    if (answer.done) throw new Cancelled();
    return answer.value.trim();
  };
  const yesNo = async (question, fallback) => {
    const value = (await ask(question)).toLowerCase();
    if (!value) return fallback;
    if (["y", "yes"].includes(value)) return true;
    if (["n", "no"].includes(value)) return false;
    throw new Error(
      "y または n で回答してください。ファイルは変更していません。"
    );
  };
  try {
    const folderName = path.basename(path.resolve(projectRoot));
    const name =
      (await ask("プロジェクト名 [" + folderName + "]: ")) || folderName;
    console.log("対応アプリ: " + Object.keys(APP_TYPES_MAP).join(", "));
    const appInput =
      (await ask("使用アプリ [aeft,ilst,phxs]: ")) || "aeft,ilst,phxs";
    const apps = appInput.split(/[,\s]+/).filter(Boolean);
    const examples = await yesNo("サンプルを残しますか？ [Y/n]: ", true);
    const agents = await yesNo("AI向け設定を利用しますか？ [Y/n]: ", true);
    const plan = await planConfiguration(
      projectRoot,
      { name, apps, examples, agents },
      pkg
    );
    console.log("\n反映する構成: " + plan.apps.join(", "));
    console.log("プロジェクト名: " + pkg.name + " → " + name);
    console.log("プロジェクトの版: " + plan.previousVersion + " → 0.1.0");
    for (const relative of plan.writes.keys())
      console.log("更新・作成: " + relative);
    if (plan.removals.size)
      console.log("削除対象（ディレクトリは配下も含みます）:");
    for (const relative of plan.removals) console.log("  " + relative);
    if (!(await yesNo("この内容を反映しますか？ [y/N]: ", false)))
      throw new Cancelled();
    applyConfiguration(projectRoot, plan);
    console.log(
      "\n初期設定が完了しました。使用アプリ: " + plan.apps.join(", ")
    );
    console.log("次の操作: pnpm new → pnpm typecheck → pnpm build");
    console.log(
      "任意のGitHub設定: mainの保護規則、説明文。リリースを使う場合は docs/release-process.md の有効化手順を確認してください。"
    );
  } finally {
    rl.close();
  }
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  try {
    await main();
  } catch (error) {
    if (error instanceof Cancelled)
      console.log("\nキャンセルしました。ファイルは変更していません。");
    else {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
