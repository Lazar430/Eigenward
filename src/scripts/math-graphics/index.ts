export { COLORS, HUES } from "./core/colors";
export { MathObject2D } from "./core/MathObject2D";
export {
  MathScene2D,
  createMathScene2D,
  type MathScene2DOptions,
  type ViewBounds2D,
  type ViewChangeCallback2D,
} from "./core/MathScene2D";

export type {
  Domain,
  ExplicitShape2DOptions,
  ExplicitXShape2DOptions,
  ExplicitYShape2DOptions,
  FrameCallback,
  FrameInfo,
  OutlineTraceOptions,
  ParametricCurve2D,
  ParametricShape2DOptions,
  Polygon2DOptions,
  ScalarEquation,
  ShapeStyle2D,
  Vec2Like,
  Vec2Tuple,
} from "./core/types";

export { sampleParametricCurve2D } from "./geometry/sampleParametricCurve2D";
export { sampleExplicitShape2D } from "./geometry/sampleExplicitShape2D";
export {
  createPolygonCurve2D,
  createRegularPolygonVertices,
} from "./geometry/polygonCurve2D";
export {
  formatMathCoordinate2D,
  formatMathNumber2D,
  type MathNumberFormat2DOptions,
} from "./geometry/formatMathCoordinate2D";

export {
  ParametricShape2D,
  createParametricShape2D,
} from "./primitives/ParametricShape2D";
export { createExplicitShape2D } from "./primitives/ExplicitShape2D";
export { createPolygon2D } from "./primitives/Polygon2D";

export {
  Vector2D,
  createVector2D,
  type Vector2DOptions,
  type Vector2DStyle,
} from "./primitives/Vector2D";
export {
  ParallelogramArea2D,
  createParallelogramArea2D,
  type ParallelogramArea2DOptions,
} from "./primitives/ParallelogramArea2D";
export {
  TextLabel2D,
  createTextLabel2D,
  type TextLabel2DOptions,
} from "./primitives/TextLabel2D";
export {
  AngleSector2D,
  createAngleSector2D,
  type AngleDirection2D,
  type AngleSector2DOptions,
} from "./primitives/AngleSector2D";
export {
  CoordinatePlane2D,
  createCoordinatePlane2D,
  type CoordinatePlane2DOptions,
} from "./primitives/CoordinatePlane2D";

export {
  FunctionGraph2D,
  createFunctionGraph2D,
  type FunctionAxis2D,
  type FunctionAxisIntersection2D,
  type FunctionAxisIntersectionSearch2DOptions,
  type FunctionGraph2DOptions,
  type FunctionGraph2DStyle,
  type FunctionGraphSampleSegment2D,
} from "./primitives/FunctionGraph2D";
export {
  PointMarker2D,
  createPointMarker2D,
  type PointLabelVisibility2D,
  type PointMarker2DLabelOptions,
  type PointMarker2DOptions,
} from "./primitives/PointMarker2D";

export {
  PointDragController2D,
  type DraggablePoint2DOptions,
} from "./interaction/PointDragController2D";

export {
  FunctionGraphPointerController2D,
  type FunctionGraphPointerController2DOptions,
} from "./interaction/FunctionGraphPointerController2D";

export {
  IDENTITY_MATRIX_2,
  applyMatrix2,
  determinantMatrix2,
  inverseMatrix2,
  lerpMatrix2,
  multiplyMatrix2,
  type Matrix2,
} from "./linear-algebra/matrix2";
