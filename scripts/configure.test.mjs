import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { collectTemplateDefaults } from "./configureTemplate.mjs";
import { APP_TYPES_MAP, createAppFiles } from "./appScaffold.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const originalPackageName = "extendscript-ts-template";
const readJson = (root, relative) =>
  JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const readConfig = async (root) =>
  (
    await import(
      pathToFileURL(path.join(root, "es.config.mjs")).href +
        "?test=" +
        Date.now()
    )
  ).default;

function write(root, relative, content) {
  fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
  fs.writeFileSync(path.join(root, relative), content);
}

async function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "configure-test-"));
  t.after(() => {
    assert.ok(
      path
        .resolve(root)
        .startsWith(path.resolve(os.tmpdir()) + path.sep + "configure-test-")
    );
    fs.rmSync(root, { recursive: true, force: true });
  });
  fs.cpSync(repositoryRoot, root, {
    recursive: true,
    filter: (source) => {
      const relative = path
        .relative(repositoryRoot, source)
        .replaceAll("\\", "/");
      const segments = relative.split("/");
      return (
        ![".git", "node_modules", "dist"].includes(path.basename(source)) &&
        !(
          segments[0] === "src" &&
          Object.hasOwn(APP_TYPES_MAP, segments[1] || "")
        )
      );
    },
  });
  fs.symlinkSync(
    path.join(repositoryRoot, "node_modules"),
    path.join(root, "node_modules"),
    "junction"
  );
  const pkg = readJson(root, "package.json");
  delete pkg.templateConfigured;
  pkg.name = originalPackageName;
  pkg.version = "0.7.1";
  pkg.author = "Original template author";
  pkg.customMetadata = { preserve: "利用者の追加項目" };
  pkg.scripts = Object.fromEntries(
    Object.entries(pkg.scripts).filter(([key]) => !key.startsWith("build:"))
  );
  for (const app of ["aeft", "ilst", "phxs"]) {
    for (const [relative, content] of Object.entries(createAppFiles(app)))
      write(root, relative, content);
    pkg.scripts["build:" + app] = "node ./scripts/build.mjs --app=" + app;
  }
  write(root, "package.json", JSON.stringify(pkg, null, 2) + "\n");
  write(
    root,
    "es.config.mjs",
    'export default { scripts: {aeft:[{name:"example",version:"0.0.1",license:false}],ilst:[{name:"example",version:"0.0.1",license:false}],phxs:[{name:"example",version:"0.0.1",license:false}]}, common:[{name:"tests",version:"0.0.1",license:true}] };\n'
  );
  write(root, "README.md", "# 初期テンプレート\n");
  write(root, "AGENTS.md", "# 初期の指示\n");
  write(root, ".github/FUNDING.yml", "github: [OriginalAuthor]\n");
  write(
    root,
    "scripts/configure-template.json",
    JSON.stringify(await collectTemplateDefaults(root), null, 2) + "\n"
  );
  return root;
}

function run(root, args = [], input = "") {
  const result = spawnSync(
    process.execPath,
    [path.join(root, "scripts/configure.mjs"), ...args],
    { cwd: root, encoding: "utf8", input, timeout: 30000 }
  );
  assert.equal(result.error, undefined, result.error?.message);
  return result;
}
const answers = (apps = "aeft", samples = "", agents = "", confirm = "y") =>
  ["my-adobe-scripts", apps, samples, agents, confirm, ""].join("\n");

function snapshot(root) {
  const files = {};
  const visit = (relative) => {
    for (const name of fs.readdirSync(path.join(root, relative))) {
      if ([".git", "node_modules", "dist"].includes(name)) continue;
      const next = relative ? relative + "/" + name : name;
      const stat = fs.lstatSync(path.join(root, next));
      if (stat.isDirectory()) visit(next);
      else if (!stat.isSymbolicLink())
        files[next] = fs.readFileSync(path.join(root, next)).toString("base64");
    }
  };
  visit("");
  return files;
}

test("配布する初期ファイル一覧は実際のテンプレートと一致する", async (t) => {
  if (readJson(repositoryRoot, "package.json").templateConfigured) {
    t.skip("利用者の初期設定後は配布元の初期ファイルを要求しない");
    return;
  }
  assert.deepEqual(
    readJson(repositoryRoot, "scripts/configure-template.json"),
    await collectTemplateDefaults(repositoryRoot)
  );
});

test("1アプリへ初期設定し、共通コード・未知の項目・ライセンスを保持する", async (t) => {
  const root = await fixture(t);
  const license = fs.readFileSync(path.join(root, "LICENSE"));
  const common = fs.readFileSync(path.join(root, "src/init.ts"));
  const result = run(root, [], answers("aeft", "", "n"));
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const pkg = readJson(root, "package.json");
  assert.equal(pkg.name, "my-adobe-scripts");
  assert.equal(pkg.version, "0.1.0");
  assert.equal(pkg.templateConfigured, true);
  assert.deepEqual(pkg.customMetadata, { preserve: "利用者の追加項目" });
  assert.equal(pkg.author, undefined);
  assert.deepEqual(Object.keys((await readConfig(root)).scripts), ["aeft"]);
  assert.equal(
    pkg.scripts["build:aeft"],
    "node ./scripts/build.mjs --app=aeft"
  );
  assert.equal(pkg.scripts["build:ilst"], undefined);
  assert.equal(fs.existsSync(path.join(root, "src/ilst")), false);
  assert.equal(fs.existsSync(path.join(root, ".agents")), false);
  assert.equal(fs.existsSync(path.join(root, "AGENTS.md")), false);
  assert.equal(fs.existsSync(path.join(root, ".github/FUNDING.yml")), false);
  assert.equal(
    fs.existsSync(path.join(root, ".github/workflows/release.yml")),
    true
  );
  assert.deepEqual(fs.readFileSync(path.join(root, "LICENSE")), license);
  assert.deepEqual(fs.readFileSync(path.join(root, "src/init.ts")), common);
  assert.equal((await readConfig(root)).common[0].name, "tests");
  assert.match(
    fs.readFileSync(path.join(root, "README.md"), "utf8"),
    /my-adobe-scripts/
  );
});

test("既定の複数アプリとサンプル・AI設定を維持できる", async (t) => {
  const root = await fixture(t);
  const result = run(root, [], answers(""));
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(Object.keys((await readConfig(root)).scripts), [
    "aeft",
    "ilst",
    "phxs",
  ]);
  assert.equal(fs.existsSync(path.join(root, "AGENTS.md")), true);
  assert.equal(
    fs.existsSync(path.join(root, "src/ilst/example/index.ts")),
    true
  );
});

test("追加アプリを選び、サンプルを作らず次のスクリプトを型検査・ビルドできる", async (t) => {
  const root = await fixture(t);
  const result = run(root, [], answers("idsn", "n", "n"));
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(Object.keys((await readConfig(root)).scripts), ["idsn"]);
  assert.equal(fs.existsSync(path.join(root, "src/idsn/example")), false);
  for (const args of [
    [
      "scripts/newScript.mjs",
      "--app=idsn",
      "--name=MyFirstScript",
      "--license",
    ],
    ["scripts/typecheck.mjs"],
    ["scripts/build.mjs", "--all"],
  ]) {
    const environment = { ...process.env };
    const pathKey =
      Object.keys(environment).find((key) => key.toLowerCase() === "path") ||
      "PATH";
    environment[pathKey] =
      path.join(root, "node_modules/.bin") +
      path.delimiter +
      (environment[pathKey] || "");
    const command = spawnSync(process.execPath, args, {
      cwd: root,
      encoding: "utf8",
      env: environment,
      timeout: 60000,
    });
    assert.equal(command.error, undefined, command.error?.message);
    assert.equal(command.status, 0, command.stdout + command.stderr);
  }
  assert.equal(
    fs.existsSync(path.join(root, "dist/idsn/MyFirstScript/MyFirstScript.jsx")),
    true
  );
});

test("キャンセル・入力終了・不正な選択でファイルを変更しない", async (t) => {
  const root = await fixture(t);
  const before = snapshot(root);
  for (const input of [
    answers("aeft", "", "", "n"),
    "my-scripts\naeft\n",
    answers("unknown"),
    answers("../../outside"),
  ]) {
    run(root, [], input);
    assert.deepEqual(snapshot(root), before);
  }
});

test("対象外アプリは初期設定・アプリ追加ともに変更前に拒否する", async (t) => {
  const root = await fixture(t);
  const before = snapshot(root);
  for (const app of ["anmt", "ppro"]) {
    const configure = run(root, [], answers(app));
    assert.equal(configure.status, 1, configure.stdout + configure.stderr);
    assert.match(configure.stderr, /対応するID/);
    assert.deepEqual(snapshot(root), before);
    const addApp = spawnSync(
      process.execPath,
      ["scripts/addApp.mjs", "--app=" + app],
      { cwd: root, encoding: "utf8", timeout: 30000 }
    );
    assert.equal(addApp.error, undefined, addApp.error?.message);
    assert.equal(addApp.status, 1, addApp.stdout + addApp.stderr);
    assert.match(addApp.stderr, /未対応|Unsupported/);
    assert.deepEqual(snapshot(root), before);
  }
});

test("再実行しても利用者の名前・版・追加ファイルを戻さない", async (t) => {
  const root = await fixture(t);
  assert.equal(run(root, [], answers()).status, 0);
  const pkg = readJson(root, "package.json");
  pkg.name = "renamed-project";
  pkg.version = "2.3.4";
  write(root, "package.json", JSON.stringify(pkg));
  write(root, "src/aeft/MyScript/index.ts", "export const value = 1;\n");
  const before = snapshot(root);
  const result = run(root, [], answers("phxs"));
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(snapshot(root), before);
});

test("利用者の追加・編集があるアプリ・サンプル・AI設定・支援先を保持する", async (t) => {
  const root = await fixture(t);
  write(root, "src/phxs/MyScript/index.ts", "// 利用者のスクリプト\n");
  write(root, "src/aeft/example/index.ts", "// 編集したサンプル\n");
  write(root, ".agents/custom.md", "利用者の指示\n");
  write(root, ".github/FUNDING.yml", "github: [MyAccount]\n");
  const result = run(root, [], answers("aeft", "n", "n"));
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const config = await readConfig(root);
  assert.deepEqual(Object.keys(config.scripts), ["aeft", "phxs"]);
  assert.equal(config.scripts.aeft[0].name, "example");
  assert.equal(
    fs.readFileSync(path.join(root, "src/aeft/example/index.ts"), "utf8"),
    "// 編集したサンプル\n"
  );
  assert.equal(
    fs.readFileSync(path.join(root, "src/phxs/MyScript/index.ts"), "utf8"),
    "// 利用者のスクリプト\n"
  );
  assert.equal(
    fs.readFileSync(path.join(root, ".agents/custom.md"), "utf8"),
    "利用者の指示\n"
  );
  assert.match(
    fs.readFileSync(path.join(root, ".github/FUNDING.yml"), "utf8"),
    /MyAccount/
  );
});

test("編集済みREADME・設定・ビルド別名は反映前に検出する", async (t) => {
  for (const relative of ["README.md", "es.config.mjs", "package.json"]) {
    const root = await fixture(t);
    if (relative === "package.json") {
      const pkg = readJson(root, relative);
      pkg.scripts["build:ilst"] = "custom-command";
      write(root, relative, JSON.stringify(pkg));
    } else {
      fs.appendFileSync(path.join(root, relative), "\n// 利用者の追記\n");
    }
    const before = snapshot(root);
    assert.equal(run(root, [], answers("aeft")).status, 1);
    assert.deepEqual(snapshot(root), before);
  }
});

test("配布元をoriginにしたコピーはSSHとHTTPSのどちらでも停止する", async (t) => {
  const root = await fixture(t);
  spawnSync("git", ["init", "-q"], { cwd: root });
  for (const url of [
    "https://github.com/YukiWorks432/extendscript-ts-template.git",
    "git@github.com:YukiWorks432/extendscript-ts-template.git",
  ]) {
    spawnSync("git", ["config", "remote.origin.url", url], { cwd: root });
    const before = snapshot(root);
    const result = run(root, [], answers());
    assert.equal(result.status, 1);
    assert.match(result.stderr, /配布元/);
    assert.deepEqual(snapshot(root), before);
  }
});

test("アプリのリンク先を削除しない", async (t) => {
  const root = await fixture(t);
  const outside = path.join(root, "kept-files");
  fs.mkdirSync(outside);
  write(root, "kept-files/value.txt", "保護対象\n");
  fs.symlinkSync(outside, path.join(root, "src/phxs/custom-link"), "junction");
  const result = run(root, [], answers("aeft"));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    fs.readFileSync(path.join(outside, "value.txt"), "utf8"),
    "保護対象\n"
  );
  assert.equal(fs.existsSync(path.join(root, "src/phxs/custom-link")), true);
});

test("対応する全アプリを生成し、型検査と整形検査に成功する", async (t) => {
  const root = await fixture(t);
  const result = run(root, [], answers(Object.keys(APP_TYPES_MAP).join(",")));
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(Object.keys((await readConfig(root)).scripts), [
    "aeft",
    "ilst",
    "phxs",
    "idsn",
    "audt",
  ]);
  const typecheck = spawnSync(process.execPath, ["scripts/typecheck.mjs"], {
    cwd: root,
    encoding: "utf8",
    timeout: 60000,
  });
  assert.equal(typecheck.error, undefined, typecheck.error?.message);
  assert.equal(typecheck.status, 0, typecheck.stdout + typecheck.stderr);
  const formatting = spawnSync(
    process.execPath,
    [
      path.join(root, "node_modules/oxfmt/bin/oxfmt"),
      "--check",
      "src/idsn",
      "src/audt",
    ],
    { cwd: root, encoding: "utf8", timeout: 30000 }
  );
  assert.equal(formatting.error, undefined, formatting.error?.message);
  assert.equal(formatting.status, 0, formatting.stdout + formatting.stderr);
});

test("確認前のSIGINTではファイルを変更しない", async (t) => {
  const root = await fixture(t);
  const before = snapshot(root);
  const result = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(root, "scripts/configure.mjs")],
      { cwd: root, stdio: ["pipe", "pipe", "pipe"] }
    );
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("初期質問が表示されません"));
    }, 10000);
    child.stdout.on("data", () => child.kill("SIGINT"));
    child.on("error", reject);
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal });
    });
  });
  assert.ok(result.signal === "SIGINT" || result.code !== 0);
  assert.deepEqual(snapshot(root), before);
});
