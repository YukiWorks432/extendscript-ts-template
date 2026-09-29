import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const generatorPath = fileURLToPath(
  new URL("./newScript.mjs", import.meta.url)
);
const repositoryRoot = path.resolve(path.dirname(generatorPath), "..");

function createTestEnvironment() {
  const env = { ...process.env };
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path");
  const binaryPath = path.join(repositoryRoot, "node_modules", ".bin");
  env[pathKey || "PATH"] = [binaryPath, env[pathKey]]
    .filter(Boolean)
    .join(path.delimiter);
  return env;
}

async function createFixture(t, apps = {}) {
  const scripts = {
    aeft: [],
    ilst: [],
    phxs: [],
    ...apps,
  };
  const root = await mkdtemp(path.join(os.tmpdir(), "new-script-test-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const scriptsDir = path.join(root, "scripts");
  await mkdir(scriptsDir, { recursive: true });
  await copyFile(generatorPath, path.join(scriptsDir, "newScript.mjs"));
  await copyFile(
    path.join(repositoryRoot, ".oxfmtrc.json"),
    path.join(root, ".oxfmtrc.json")
  );

  const appConfig = Object.entries(scripts)
    .map(([appId, entries]) => `    ${appId}: ${JSON.stringify(entries)},`)
    .join("\n");
  await writeFile(
    path.join(root, "es.config.mjs"),
    `export default {\n  scripts: {\n${appConfig}\n  },\n};\n`,
    "utf8"
  );

  return root;
}

function runGenerator(root, args = [], input = "") {
  return spawnSync(
    process.execPath,
    [path.join(root, "scripts", "newScript.mjs"), ...args],
    {
      cwd: root,
      encoding: "utf8",
      env: createTestEnvironment(),
      input,
      timeout: 10000,
    }
  );
}

function runInteractiveGenerator(root, answers) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [path.join(root, "scripts", "newScript.mjs")],
      {
        cwd: root,
        env: { ...createTestEnvironment(), LC_ALL: "ja_JP.UTF-8" },
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
    const promptSuffixes = [
      "): ",
      "スクリプト名を入力してください: ",
      "スクリプトの種類を選択してください (script/scriptui, default: script): ",
      "ライセンス表記を含めますか？ (y/N): ",
    ];
    let stdout = "";
    let stderr = "";
    let answerIndex = 0;
    const timeout = setTimeout(() => child.kill(), 10000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (
        answerIndex < answers.length &&
        stdout.endsWith(promptSuffixes[answerIndex])
      ) {
        child.stdin.write(`${answers[answerIndex]}\n`);
        answerIndex += 1;
        if (answerIndex === answers.length) child.stdin.end();
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({ error, status: null, stdout, stderr });
    });
    child.on("close", (status) => {
      clearTimeout(timeout);
      resolve({ error: undefined, status, stdout, stderr });
    });
  });
}

function assertSucceeded(result) {
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(
    result.status,
    0,
    `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}

async function readConfig(root) {
  const configUrl = pathToFileURL(path.join(root, "es.config.mjs")).href;
  const config = await import(`${configUrl}?test=${Math.random()}`);
  return config.default;
}

async function readGeneratedIndex(root, appId, name) {
  return readFile(path.join(root, "src", appId, name, "index.ts"), "utf8");
}

test("CLI モードで通常スクリプトとライセンス設定を作成する", async (t) => {
  const root = await createFixture(t);
  const result = runGenerator(root, [
    "--app=aeft",
    "--name=CliScript",
    "--license",
  ]);

  assertSucceeded(result);
  assert.deepEqual((await readConfig(root)).scripts.aeft[0], {
    name: "CliScript",
    version: "0.0.1",
    build: true,
    license: true,
  });

  const indexContent = await readGeneratedIndex(root, "aeft", "CliScript");
  assert.match(indexContent, /entry\("CliScript"/);
  assert.doesNotMatch(indexContent, /entryUI\(/);
});

test("CLI モードで ScriptUI スクリプトを作成する", async (t) => {
  const root = await createFixture(t);
  const result = runGenerator(root, [
    "--app=aeft",
    "--name=CliPanel",
    "--ui=scriptui",
  ]);

  assertSucceeded(result);
  assert.deepEqual((await readConfig(root)).scripts.aeft[0], {
    name: "CliPanel",
    version: "0.0.1",
    build: true,
    license: false,
  });

  const indexContent = await readGeneratedIndex(root, "aeft", "CliPanel");
  assert.match(indexContent, /entryUI\("CliPanel", __ES_THIS__/);
});

test("対話モードも CLI と同じ設定・テンプレートを生成する", async (t) => {
  const cliRoot = await createFixture(t);
  const interactiveRoot = await createFixture(t);

  const cliResult = runGenerator(cliRoot, [
    "--app=ilst",
    "--name=SharedScript",
  ]);
  const interactiveResult = await runInteractiveGenerator(interactiveRoot, [
    "ilst",
    "SharedScript",
    "script",
    "n",
  ]);

  assertSucceeded(cliResult);
  assertSucceeded(interactiveResult);
  const interactiveConfig = await readConfig(interactiveRoot);
  const cliConfig = await readConfig(cliRoot);
  assert.deepEqual(
    interactiveConfig.scripts.ilst,
    cliConfig.scripts.ilst,
    JSON.stringify({
      interactiveOutput: `${interactiveResult.stdout}\n${interactiveResult.stderr}`,
      interactiveScripts: interactiveConfig.scripts,
      cliScripts: cliConfig.scripts,
    })
  );
  assert.equal(
    await readGeneratedIndex(interactiveRoot, "ilst", "SharedScript"),
    await readGeneratedIndex(cliRoot, "ilst", "SharedScript")
  );
});

test("無効なアプリ名を拒否する", async (t) => {
  const root = await createFixture(t);
  const result = runGenerator(root, ["--app=unknown", "--name=InvalidApp"]);
  const output = `${result.stdout}\n${result.stderr}`;

  assert.equal(result.status, 1, output);
  assert.match(output, /無効なアプリ名|Invalid app name/);
});

test("重複するスクリプト名を拒否する", async (t) => {
  const root = await createFixture(t, {
    aeft: [
      {
        name: "ExistingScript",
        version: "0.0.1",
        build: true,
        license: false,
      },
    ],
  });
  const result = runGenerator(root, ["--app=aeft", "--name=ExistingScript"]);
  const output = `${result.stdout}\n${result.stderr}`;

  assert.equal(result.status, 1, output);
  assert.match(output, /既に存在するスクリプト名|already exists/);
});
