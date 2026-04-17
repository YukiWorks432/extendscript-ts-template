import "../../init";
import { entry } from "../../lib/lib";

entry("example", () => {
  const doc = app.activeDocument;
  if (!doc) return;

  const selected = doc.selection as PageItem[];
  if (!selected || selected.length === 0) return;

  const names = selected.map((item) => item.name || item.typename);
  alert(`選択中のアイテム:\n${names.join("\n")}`);
});
