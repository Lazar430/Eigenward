export { COLORS, HUES } from "./core/colors";
export { MathObject } from "./core/MathObject";
export { MathObject3D } from "./core/MathObject3D";
export {
  MathScene3D,
  createMathScene3D,
  type MathScene3DOptions,
} from "./core/MathScene3D";
export type { CameraState3D, Vec3Like, Vec3Tuple } from "./core/types3D";

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
export {
  FOURIER_DRAWING_ASSET_VERSION_2D,
  applyPointNormalizationTransform2D,
  buildFourierEpicycleChain2D,
  calculateFourierRmsError2D,
  calculatePolylineLength2D,
  computeFourierCoefficients2D,
  createFourierFrequencySequence2D,
  createPeriodicFourierSamples2D,
  evaluateFourierCoefficient2D,
  getFourierCoefficientAmplitude2D,
  getFourierCoefficientPhase2D,
  getPointBounds2D,
  normalizePointSamples2D,
  orderFourierCoefficients2D,
  reconstructFourierPoint2D,
  resamplePolylineByArcLength2D,
  sampleFourierReconstruction2D,
  sampleFourierReconstructionRange2D,
  type FourierCoefficient2D,
  type FourierCoefficientComputation2DOptions,
  type FourierCoefficientOrder2D,
  type FourierDrawing2DAsset,
  type FourierEpicycleLink2D,
  type FourierStroke2DAsset,
  type NormalizePointSamples2DOptions,
  type NormalizedPointSamples2D,
  type PointBounds2D,
  type PointNormalizationTransform2D,
} from "./geometry/fourierSeries2D";
export {
  compileSvgFileToFourierDrawing2D,
  compileSvgTextToFourierDrawing2D,
  downloadFourierDrawingAsset2D,
  parseSvgTransform2D,
  serializeFourierDrawingAsset2D,
  type CompileFourierSvg2DOptions,
  type CompileFourierSvg2DResult,
  type FourierOpenStrokeMode2D,
  type FourierSvgDiagnostic2D,
  type FourierSvgDiagnosticSeverity2D,
  type FourierSvgGeometryTag2D,
  type SerializeFourierDrawingAsset2DOptions,
} from "./assets/fourierSvgAsset2D";
export {
  loadFourierDrawingAsset2D,
  parseFourierDrawingAsset2D,
  type LoadFourierDrawingAsset2DOptions,
} from "./io/fourierDrawingAsset2D";
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
export {
  FourierEpicycles2D,
  createFourierEpicycles2D,
  type FourierEpicycles2DOptions,
  type FourierEpicycles2DStyle,
} from "./primitives/FourierEpicycles2D";
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

export type {
  ParametricSurfaceMap3D,
  ParametricSurfaceSampleOptions3D,
  SurfaceGeometryData3D,
  SurfaceGrid3D,
} from "./core/types3D";

export {
  createSurfaceGrid3D,
  surfaceGridVertexIndex3D,
  type SurfaceGrid3DOptions,
} from "./geometry/surfaceGrid3D";
export { sampleParametricSurface3D } from "./geometry/sampleParametricSurface3D";

export {
  Surface3D,
  createSurface3D,
  type Surface3DOptions,
  type Surface3DStyle,
} from "./primitives/Surface3D";
export {
  ParametricSurface3D,
  createParametricSurface3D,
  type ParametricSurface3DOptions,
} from "./primitives/ParametricSurface3D";
export {
  createSphere3D,
  type Sphere3DOptions,
} from "./primitives/Sphere3D";
export {
  createTorus3D,
  type Torus3DOptions,
} from "./primitives/Torus3D";
export {
  TextLabel3D,
  createTextLabel3D,
  type TextLabel3DOptions,
} from "./primitives/TextLabel3D";

export {
  LightingRig3D,
  createLightingRig3D,
  type LightingRig3DOptions,
} from "./lighting/LightingRig3D";

export {
  OrbitController3D,
  type OrbitController3DOptions,
  type OrbitState3D,
} from "./interaction/OrbitController3D";

export {
  clamp01,
  linear,
  smoothstep,
  easeInOutCubic,
  easeInOutSine,
  type EasingFunction,
} from "./animation/easing";
export {
  FourierDrawingPlayer2D,
  createFourierDrawingPlayer2D,
  type FourierDrawingPlaybackState2D,
  type FourierDrawingPlayer2DOptions,
  type FourierDrawingReducedMotionMode2D,
} from "./animation/FourierDrawingPlayer2D";

export {
  MorphCycle,
  sampleMorphCycle,
  type MorphCycleOptions,
  type MorphCyclePhase,
  type MorphCycleState,
} from "./animation/morphCycle";

export {
  assertCompatibleSurfaceTopologies3D,
  assertFiniteSurfacePositions3D,
  copySurfacePositions3D,
  createSurfaceMorphTarget3D,
  createSurfaceMorphTargetFromGeometry3D,
  lerpSurfacePositions3D,
  type SurfaceMorphTarget3D,
} from "./geometry/surfaceMorph3D";

export {
  MorphableSurface3D,
  createMorphableSurface3D,
  type MorphableSurface3DOptions,
  type MorphState3D,
} from "./primitives/MorphableSurface3D";

