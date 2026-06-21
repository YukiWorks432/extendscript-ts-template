/***
 * Helper Functions
 */

/***
 * jp: 指定された行数目の文字列を取得する.\
 * en: Get the string at the specified line number.
 */
export const getLineFromString = (
  str: string,
  lineNumber: number
): string | null => {
  const lines = str.split("\n");
  if (lineNumber < 1 || lineNumber > lines.length) {
    return null;
  }
  return lines[lineNumber - 1];
};

/***
 * jp: エラー内容をダイアログ表示する.\
 * en: Display a dialog with the error details.
 */
const getErrorMessage = (error: Error): string => {
  try {
    const line = getLineFromString(error.source, error.line)?.trim() || "";
    let lineSuffix = "";
    if (line.length < 200) lineSuffix = `">": ${line}`;
    return `Error: ${error.message}\nLine: ${error.line}\n${lineSuffix}`;
  } catch {
    return `Error: ${error.message}`;
  }
};

type ScriptUIWindowLike = {
  alignChildren: string | string[];
  margins: number;
  add: (...args: unknown[]) => unknown;
  show: () => number;
};

type ScriptUIWindowConstructor = new (
  kind: string,
  title?: string
) => ScriptUIWindowLike;

const createScriptUIWindow = (
  kind: string,
  title: string
): ScriptUIWindowLike =>
  new (Window as unknown as ScriptUIWindowConstructor)(kind, title);

const showErrorDialog = (message: string): void => {
  const dialog = createScriptUIWindow("dialog", "Error");
  dialog.alignChildren = ["fill", "top"];
  dialog.margins = 12;
  dialog.add("statictext", undefined, message, { multiline: true });
  dialog.add("button", undefined, "OK", { name: "ok" });
  dialog.show();
};

export const alertError = (error: Error): never => {
  showErrorDialog(getErrorMessage(error));
  throw error;
};

/***
 * jp: 指定された処理をUndoグループ化して実行する.\
 * en: Execute the specified process in an undo group.
 */
export const entry = (name: string, func: () => any) => {
  if (app.beginUndoGroup) app.beginUndoGroup(name);

  try {
    func();
  } catch (e) {
    alertError(e as Error);
  } finally {
    if (app.endUndoGroup) app.endUndoGroup();
  }
};

/***
 * jp: Scripts UI 対応の entry 関数。\
 *     Panel として起動された場合はそのまま使用し、そうでない場合は palette Window を生成して表示する.\
 * en: Entry function for ScriptUI.\
 *     Uses the provided Panel when launched as a dockable panel, otherwise creates and shows a palette Window.
 * @example
 * entryUI("My Script", __ES_THIS__, (win) => {
 *   win.add("statictext", undefined, "Hello, ScriptUI!");
 * });
 */
export const entryUI = (
  name: string,
  thisObj: object,
  func: (win: Window | Panel) => void
): void => {
  var win: Window | Panel;
  var paletteWindow: ScriptUIWindowLike | null = null;
  if (thisObj instanceof Panel) {
    win = thisObj;
  } else {
    paletteWindow = createScriptUIWindow("palette", name);
    win = paletteWindow as unknown as Window;
  }

  try {
    func(win);
    if (paletteWindow) {
      paletteWindow.show();
    }
  } catch (e) {
    alertError(e as Error);
  }
};
