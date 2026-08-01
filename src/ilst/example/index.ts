/**
 * @script example
 * @app ilst
 * @material-symbols category, format_shapes, select_all
 * @description
 *   選択中のオブジェクトの名前または種類を一覧化し、結果をダイアログへ表示する。
 *
 * @workflow
 *   1. ドキュメント上のオブジェクトを選択する
 *   2. スクリプトを実行する
 *   3. 選択したオブジェクトの名前または種類を確認する
 */

import "../../init";
import { entry } from "../lib/lib";

const showMessage = (title: string, message: string) => {
  const win = new Window("dialog", title);
  win.add("statictext", undefined, message, { multiline: true });
  win.add("button", undefined, "OK", { name: "ok" });
  win.show();
};

entry("example", () => {
  const doc = app.activeDocument;
  if (!doc) return;

  const selected = doc.selection as PageItem[];
  if (!selected || selected.length === 0) return;

  const names = selected.map((item) => item.name || item.typename);
  showMessage("example", `選択中のアイテム:\n${names.join("\n")}`);
});
