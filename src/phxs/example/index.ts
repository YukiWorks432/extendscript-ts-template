/**
 * @script example
 * @app phxs
 * @material-symbols info, layers, visibility
 * @description
 *   アクティブなドキュメントのレイヤーを対象に、アクティブレイヤー名をダイアログへ表示する。
 *
 * @workflow
 *   1. ドキュメントを開き、レイヤーをアクティブにする
 *   2. スクリプトを実行する
 *   3. アクティブレイヤーの名前を確認する
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

  const layer = doc.activeLayer;
  showMessage("example", `アクティブレイヤー: ${layer.name}`);
});
