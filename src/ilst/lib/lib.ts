/***
 * Illustrator ユーティリティ関数
 */

export const isGroupItem = (item: PageItem): item is GroupItem => {
  return item.typename === "GroupItem";
};

export const isCompoundPathItem = (
  item: PageItem
): item is CompoundPathItem => {
  return item.typename === "CompoundPathItem";
};

export const isTextFrame = (item: PageItem): item is TextFrame => {
  return item.typename === "TextFrame";
};

export const isLayer = (item: PageItem | Layer): item is Layer => {
  return item.typename === "Layer";
};

export const isArtboard = (item: any): item is Artboard => {
  return item.typename === "Artboard";
};

export const isPathItem = (item: PageItem): item is PathItem => {
  return item.typename === "PathItem";
};

/***
 * jp: groupをアートボード上の中央に配置する.\
 * en: Center the group on the artboard.
 */
export const centerGroupInArtboard = (artboard: Artboard, group: GroupItem) => {
  const abRect = artboard.artboardRect; // [left, top, right, bottom]
  const abCenterX = (abRect[0] + abRect[2]) / 2;
  const abCenterY = (abRect[1] + abRect[3]) / 2;

  const groupBounds = group.visibleBounds; // [left, top, right, bottom]
  const groupCenterX = (groupBounds[0] + groupBounds[2]) / 2;
  const groupCenterY = (groupBounds[1] + groupBounds[3]) / 2;

  const deltaX = abCenterX - groupCenterX;
  const deltaY = abCenterY - groupCenterY;

  group.translate(deltaX, deltaY);
};
