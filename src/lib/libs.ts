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
 * jp: エラー内容をアラート表示する.\
 * en: Display an alert with the error details.
 */
export const alertError = (error: Error) => {
  try {
    const line = getLineFromString(error.source, error.line)?.trim() || "";
    alert(
      `Error: ${error.message}\n` +
        `Line: ${error.line}\n` +
        (line.length < 200 ? `">": ${line}` : "")
    );
  } catch (e) {
    alert(`Error: ${error.message}`);
  }
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
  }

  if (app.endUndoGroup) app.endUndoGroup();
};
