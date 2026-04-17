import "../../init";
import { entry } from "../../lib/lib";

entry("example", () => {
  const doc = app.activeDocument;
  if (!doc) return;

  const layer = doc.activeLayer;
  alert(`アクティブレイヤー: ${layer.name}`);
});
