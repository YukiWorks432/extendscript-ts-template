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
