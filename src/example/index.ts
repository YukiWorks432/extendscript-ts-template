// shimを実行するために、initのimportが必須です。
import "../init";

// アロー関数が使えるようになった
(() => {
  // let, constが使えるようになった
  // 型アノテーションが使えるようになった
  const comp = app.project.activeItem;
  if (!(comp && comp instanceof CompItem)) return;

  // スプレッド構文が使えるようになった
  const selected = [...comp.selectedLayers];
  if (selected.length === 0) return;

  // Array.mapとArray.joinが使えるようになった
  alert(selected.map((l) => l.name).join("\n"));

  const names: string[] = [];
  // for...ofが使えるようになった
  for (const layer of selected) {
    names.push(layer.name);
  }
  alert(names.join("\n"));

  // テンプレートリテラルが使えるようになった
  alert(`選択中のレイヤー数: ${selected.length}`);

  // Array.reduceが使えるようになった
  const totalOpacity = selected.reduce(
    (sum, layer) => sum + layer.opacity.value,
    0
  );
  alert(`選択中のレイヤーの不透明度の合計: ${totalOpacity}`);

  const hoge = () => {
    return [totalOpacity, totalOpacity / selected.length];
  };
  // 分割代入が使えるようになった
  const [_, averageOpacity] = hoge();

  alert(
    `選択中のレイヤーの不透明度の合計: ${totalOpacity}\n平均: ${averageOpacity}`
  );
})();
