/***
 * After Effects ユーティリティ関数
 */

/**
 * AVLayerのpositionプロパティの値を3次元配列で取得する
 */
export const getPosition = (layer: AVLayer): [number, number, number] => {
  if (layer.position.separationDimension) {
    if (layer.threeDLayer) {
      return [
        layer.transform.xPosition.value,
        layer.transform.yPosition.value,
        layer.transform.zPosition.value,
      ];
    }
    return [
      layer.transform.xPosition.value,
      layer.transform.yPosition.value,
      0,
    ];
  }

  if (layer.threeDLayer) {
    return layer.position.value as [number, number, number];
  }

  const v = layer.position.value as [number, number];
  return [v[0], v[1], 0];
};

/**
 * Layer が AVLayer かどうかを判定する.
 */
export const isAVLayer = (layer: Layer): layer is AVLayer => {
  return (
    layer instanceof AVLayer ||
    layer instanceof ShapeLayer ||
    layer instanceof TextLayer
  );
};

/**
 * Layer が TextLayer かどうかを判定する.
 */
export const isTextLayer = (layer: Layer): layer is TextLayer => {
  return layer instanceof TextLayer;
};

/**
 * Layer が ShapeLayer かどうかを判定する.
 */
export const isShapeLayer = (layer: Layer): layer is ShapeLayer => {
  return layer instanceof ShapeLayer;
};

declare interface CompLayer extends AVLayer {
  readonly source: CompItem;
}
/**
 * Layer が CompItem をソースに持つ AVLayer かどうかを判定する.
 */
export const isCompLayer = (layer: Layer): layer is CompLayer => {
  return isAVLayer(layer) && layer.source instanceof CompItem;
};

/**
 * Item が CompItem かどうかを判定する.
 */
export const isCompItem = (item: _ItemClasses | null): item is CompItem => {
  return item instanceof CompItem;
};

/**
 * _PropertyClasses が PropertyGroup かどうかを判定する.
 */
export const isPropertyGroup = (
  prop: _PropertyClasses
): prop is PropertyGroup => {
  return prop instanceof PropertyGroup;
};

/**
 * _PropertyClasses が Property かどうかを判定する.
 */
export const isProperty = (prop: _PropertyClasses): prop is Property => {
  return prop instanceof Property;
};

/**
 * property が Fill か判定する.
 */
export const isFillProperty = (prop: _PropertyClasses): prop is Fill => {
  return prop.matchName === "ADBE Vector Graphic - Fill";
};

/**
 * property が Gradient Fill か判定する.
 */
export const isGradientFillProperty = (
  prop: _PropertyClasses
): prop is GradientFill => {
  return prop.matchName === "ADBE Vector Graphic - G-Fill";
};

/**
 * property が Stroke か判定する.
 */
export const isStrokeProperty = (prop: _PropertyClasses): prop is Stroke => {
  return prop.matchName === "ADBE Vector Graphic - Stroke";
};

/**
 * shape に Fill プロパティを追加する.
 */
export const addFillProperty = (shape: PropertyGroup): Fill => {
  if (!shape.canAddProperty("ADBE Vector Graphic - Fill")) {
    throw new Error("Cannot add Fill property to the shape");
  }
  const fill = shape.addProperty("ADBE Vector Graphic - Fill");
  if (isFillProperty(fill)) {
    return fill;
  }
  throw new Error("Failed to add Fill property to the shape");
};

/**
 * GradientFill プロパティに値を適用する.
 * @param target 値を適用する GradientFill プロパティ
 * @param source 値のコピー元となる GradientFill プロパティ
 * @throws 値の適用に失敗した場合にエラーをスローする
 */
export const applyGradientFillProperty = (
  target: GradientFill,
  source: GradientFill
) => {
  try {
    target.type.setValue(source.type.value);
    target.startPoint.setValue(source.startPoint.value);
    target.endPoint.setValue(source.endPoint.value);
    target.highlightLength?.setValue(
      source.highlightLength?.value ?? target.highlightLength?.value ?? 0
    );
    target.highlightAngle?.setValue(
      source.highlightAngle?.value ?? target.highlightAngle?.value ?? 0
    );
    target.scale.setValue(source.scale.value);
    target.rotation.setValue(source.rotation.value);
    target.colors.setValue(source.colors.value);
    target.opacity.setValue(source.opacity.value);
  } catch (e) {
    throw new Error("Failed to copy Gradient Fill properties: " + e);
  }
};

/**
 * shape に Gradient Fill プロパティを追加する.
 * @param shape Gradient Fill プロパティを追加する PropertyGroup
 * @param gradient 値のコピー元となる GradientFill プロパティ (省略した場合は追加したプロパティの初期値がコピーされる)
 * @returns 追加された Gradient Fill プロパティ
 * @throws Gradient Fill プロパティの追加に失敗した場合にエラーをスローする
 */
export const addGradientFillProperty = (
  shape: PropertyGroup,
  gradient?: GradientFill
): GradientFill => {
  if (!shape.canAddProperty("ADBE Vector Graphic - G-Fill")) {
    throw new Error("Cannot add Gradient Fill property to the shape");
  }
  const fill = shape.addProperty("ADBE Vector Graphic - G-Fill");
  if (isGradientFillProperty(fill)) {
    applyGradientFillProperty(fill, gradient ?? fill);
    return fill;
  }
  throw new Error("Failed to add Gradient Fill property to the shape");
};

/**
 * shape に Stroke プロパティを追加する.
 */
export const addStrokeProperty = (shape: PropertyGroup): Stroke => {
  if (!shape.canAddProperty("ADBE Vector Graphic - Stroke")) {
    throw new Error("Cannot add Stroke property to the shape");
  }
  const stroke = shape.addProperty("ADBE Vector Graphic - Stroke");
  if (isStrokeProperty(stroke)) {
    return stroke;
  }
  throw new Error("Failed to add Stroke property to the shape");
};

export const layerCollectionToArray = (
  collection: LayerCollection
): Layer[] => {
  const layers: Layer[] = [];
  for (let i = 1; i <= collection.length; i++) {
    layers.push(collection[i]);
  }
  return layers;
};

export const layersInOut = (
  layers: Layer[]
): { inPoint: number; outPoint: number } => {
  let inPoint = Number.NEGATIVE_INFINITY;
  let outPoint = Number.POSITIVE_INFINITY;

  for (const layer of layers) {
    if (layer.inPoint > inPoint) {
      inPoint = layer.inPoint;
    }
    if (layer.outPoint < outPoint) {
      outPoint = layer.outPoint;
    }
  }

  return { inPoint, outPoint };
};

export const addSolidLayer = (width: number, height: number) => {
  const proj = app.project;
  const comp = app.project.activeItem;
  if (!isCompItem(comp)) {
    throw new Error("No active composition");
  }
  const solidName = `Solid (${width}x${height})`;
  const existing = findWhiteSolidFootage(proj, solidName, width, height);
  if (existing) {
    return comp.layers.add(existing);
  }
  return comp.layers.addSolid([1, 1, 1], solidName, width, height, 1);
};

export const addAdjustmentLayer = (width: number, height: number) => {
  const proj = app.project;
  const comp = app.project.activeItem;
  if (!isCompItem(comp)) {
    throw new Error("No active composition");
  }
  const solidName = `Solid (${width}x${height})`;

  let layer: AVLayer | null = null;
  const existing = findWhiteSolidFootage(proj, solidName, width, height);
  if (existing) {
    layer = comp.layers.add(existing);
  } else {
    layer = comp.layers.addSolid([1, 1, 1], solidName, width, height, 1);
  }

  layer.adjustmentLayer = true;
  layer.label = 5;
  layer.name = "Adjustment Layer";

  return layer;
};

const findWhiteSolidFootage = (
  project: Project,
  solidName: string,
  width: number,
  height: number
): FootageItem | null => {
  for (let i = 1, l = project.numItems; i <= l; i++) {
    const item = project.item(i);
    if (
      item instanceof FootageItem &&
      item.mainSource instanceof SolidSource &&
      item.name.indexOf(solidName) === 0 &&
      item.width === width &&
      item.height === height &&
      item.mainSource.color[0] === 1 &&
      item.mainSource.color[1] === 1 &&
      item.mainSource.color[2] === 1
    ) {
      return item;
    }
  }
  return null;
};
