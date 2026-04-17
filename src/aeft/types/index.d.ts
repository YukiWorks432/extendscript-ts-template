// jp: After Effects 固有の型定義を記述するファイルです。
// en: Type definitions specific to After Effects.

declare class Fill extends PropertyGroup {
  readonly composite: Property<OneDType>;
  readonly fillRule: Property<OneDType>;
  readonly color: Property<ColorType>;
  readonly opacity: Property<OneDType>;
}

declare class GradientFill extends PropertyGroup {
  readonly composite: Property<OneDType>;
  readonly fillRule: Property<OneDType>;
  readonly type: Property<OneDType>;
  readonly startPoint: Property<TwoD_SPATIAL>;
  readonly endPoint: Property<TwoD_SPATIAL>;
  readonly highlightLength?: Property<OneDType>;
  readonly highlightAngle?: Property<OneDType>;
  readonly scale: Property<TwoDType>;
  readonly rotation: Property<OneDType>;
  readonly colors: Property<NoValueType>;
  readonly opacity: Property<OneDType>;
}

declare class Stroke extends PropertyGroup {
  readonly composite: Property<OneDType>;
  readonly color: Property<ColorType>;
  readonly opacity: Property<OneDType>;
  readonly strokeWidth: Property<OneDType>;
  readonly lineCap: Property<OneDType>;
  readonly lineJoin: Property<OneDType>;
  readonly miterLimit: Property<OneDType>;
  readonly dash: PropertyGroup;
  readonly taper: PropertyGroup;
  readonly wave: PropertyGroup;
}
