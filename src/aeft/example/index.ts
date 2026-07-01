// shimを実行するために、initのimportが必須です。
import "../../init";

// libから必要な関数をimportします。
import { entry } from "../lib/lib";

const showMessage = (title: string, message: string) => {
  const win = new Window("dialog", title);
  win.add("statictext", undefined, message, { multiline: true });
  win.add("button", undefined, "OK", { name: "ok" });
  win.show();
};

// スクリプトはすべてentryの中に書いてください
// アロー関数が使えるようになった
entry("example", () => {
  // let, constが使えるようになった
  // 型アノテーションが使えるようになった
  const comp = app.project.activeItem;
  if (!(comp && comp instanceof CompItem)) return;

  // スプレッド構文が使えるようになった
  const selected = [...comp.selectedLayers];
  if (selected.length === 0) return;

  // Array.mapとArray.joinが使えるようになった
  const selectedNames = selected.map((l) => l.name).join("\n");

  const names: string[] = [];
  // for...ofが使えるようになった
  for (const layer of selected) {
    names.push(layer.name);
  }

  // Array.reduceが使えるようになった
  const totalOpacity = selected.reduce(
    (sum, layer) => sum + layer.opacity.value,
    0
  );

  const getOpacityStats = () => {
    return [totalOpacity, totalOpacity / selected.length];
  };
  // 分割代入が使えるようになった
  const [_, averageOpacity] = getOpacityStats();

  // テンプレートリテラルが使えるようになった
  showMessage(
    "example",
    `選択中のレイヤー数: ${selected.length}\n\n` +
      `Array.map の結果:\n${selectedNames}\n\n` +
      `for...of の結果:\n${names.join("\n")}\n\n` +
      `不透明度の合計: ${totalOpacity}\n平均: ${averageOpacity}`
  );
});
