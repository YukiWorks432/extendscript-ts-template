import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { compiledFilePath } from "./compiledTypescript.mjs";
import { getBuildHashState } from "./buildState.mjs";

const [manifestPath, argumentsJson] = process.argv.slice(2);
const args = JSON.parse(argumentsJson);
process.env.EXTENDSCRIPT_BUILD_PHASE = "prepare";
process.env.EXTENDSCRIPT_DEFER_BUILD_HASHES = "1";
const { default: config } = await import(
  pathToFileURL(path.resolve("rollup.config.mjs"))
);
const options = await (typeof config === "function"
  ? config({ ...args })
  : config);
const states = options.map(getBuildHashState);
if (
  states.some((state) => !state) ||
  (states.length && states.some((state) => state.hashes !== states[0].hashes))
) {
  throw new Error(
    "Rollup設定のビルド対象・ハッシュ情報を取得できませんでした。"
  );
}
const plan = {
  args,
  hashes: states[0]?.hashes ?? {},
  targets: states.map((state) => state.metadata),
};
const groups = new Map();
for (const [index, target] of plan.targets.entries()) {
  const group = groups.get(target.tsconfig) ?? {
    targets: [],
    sourceMaps: false,
  };
  group.targets.push(target);
  const outputs = Array.isArray(options[index].output)
    ? options[index].output
    : [options[index].output];
  group.sourceMaps ||= outputs.some((output) => Boolean(output?.sourcemap));
  target.outputs = outputs.map((output) => output.file).filter(Boolean);
  groups.set(target.tsconfig, group);
}
for (const [index, [configFile, group]] of [...groups].entries()) {
  const cacheDir = path.join(path.dirname(manifestPath), String(index));
  fs.mkdirSync(cacheDir);
  const parsed = ts.getParsedCommandLineOfConfigFile(
    path.resolve(configFile),
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
        );
      },
    }
  );
  const compilerOptions = {
    ...parsed.options,
    noEmitHelpers: true,
    importHelpers: true,
    noResolve: false,
    noEmit: false,
    emitDeclarationOnly: false,
    noEmitOnError: true,
    sourceMap: group.sourceMaps,
    inlineSourceMap: false,
    inlineSources: group.sourceMaps ? parsed.options.inlineSources : false,
    sourceRoot: group.sourceMaps ? parsed.options.sourceRoot : undefined,
    mapRoot: group.sourceMaps ? parsed.options.mapRoot : undefined,
    incremental: false,
    composite: false,
  };
  const selectedFiles = new Set(
    group.targets
      .flatMap((target) => target.descriptor.typeScriptPluginOptions.include)
      .map((file) => path.resolve(file))
  );
  // 設定内の順序を保つ。typesの宣言を入力へ直接追加すると宣言の優先順が変わる。
  const roots = parsed.fileNames.filter((file) =>
    selectedFiles.has(path.resolve(file))
  );
  const program = ts.createProgram(roots, compilerOptions);
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
  if (
    diagnostics.some(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
    )
  ) {
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getCanonicalFileName: (file) => file,
        getNewLine: () => "\n",
      })
    );
  }
  const emitted = program.emit(
    undefined,
    (fileName, text, _bom, _error, sourceFiles) => {
      if (!/\.(?:[cm]?js|jsx)(?:\.map)?$/.test(fileName)) return;
      for (const source of sourceFiles ?? []) {
        const destination = compiledFilePath(cacheDir, source.fileName);
        if (fileName.endsWith(".map")) {
          const map = JSON.parse(text);
          map.sources = map.sources.map((sourcePath) =>
            path.resolve(
              path.dirname(fileName),
              map.sourceRoot ?? "",
              sourcePath
            )
          );
          map.sourceRoot = "";
          fs.writeFileSync(`${destination}.map`, JSON.stringify(map));
        } else {
          fs.writeFileSync(destination, text);
        }
      }
    }
  );
  if (emitted.emitSkipped)
    throw new Error(`TypeScriptの変換に失敗しました: ${configFile}`);
  for (const target of group.targets)
    Object.assign(target.descriptor, {
      cacheDir,
      sourceMaps: group.sourceMaps,
    });
}
fs.writeFileSync(manifestPath, JSON.stringify(plan));
