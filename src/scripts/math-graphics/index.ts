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

export {
  altitudeToLine2D,
  angleBisectorRay2D,
  distance2D,
  extendSegment2D,
  internalAngleBisectorDirection2D,
  lineDirection2D,
  lineIntersection2D,
  medianToSegment2D,
  midpoint2D,
  minorAngleSector2D,
  perpendicularDirection2D,
  pointOnLine2D,
  projectPointOntoLine2D,
  rayLineIntersection2D,
  type AltitudeConstruction2D,
  type AngleBisectorRay2D,
  type LineIntersection2D,
  type MinorAngleSector2D,
  type PointProjection2D,
  type RayLineIntersection2D,
  type SegmentEndpoints2D,
} from "./geometry/euclideanConstructions2D";

export {
  Segment2D,
  createSegment2D,
  type Segment2DOptions,
  type Segment2DStyle,
  type SegmentDashStyle2D,
} from "./primitives/Segment2D";
export {
  RightAngleMarker2D,
  createRightAngleMarker2D,
  type RightAngleMarker2DOptions,
} from "./primitives/RightAngleMarker2D";

export {
  boundsFromPoints2D,
  currentSceneView2D,
  fitPointsView2D,
  sceneContainsPoints2D,
  type FitPointsView2DOptions,
  type SceneView2D,
} from "./geometry/viewport2D";

export {
  PanZoomController2D,
  type PanZoomController2DOptions,
} from "./interaction/PanZoomController2D";

export {
  ProofStageController2D,
  type ProofStage2D,
  type ProofStageController2DOptions,
  type SegmentDrawAnimation2DOptions,
  type RevealAnimation2DOptions,
  type StageEasing2D,
} from "./animation/ProofStageController2D";

export * from "./animation/proofHelpers2D";

export {
  add3D,
  subtract3D,
  scale3D,
  dot3D,
  cross3D,
  length3D,
  normalize3D,
  distance3D,
  midpoint3D,
  centroid3D,
  pointOnLine3D,
  lineDirection3D,
  projectPointOntoLine3D,
  altitudeToLine3D,
  closestPointsBetweenLines3D,
  lineIntersection3D,
  planeFromPoints3D,
  projectPointOntoPlane3D,
  linePlaneIntersection3D,
  parallelLineThroughPoint3D,
  angleBetweenRays3D,
  extendSegment3D,
  type PointProjection3D,
  type AltitudeToLine3D,
  type ClosestLinePoints3D,
  type LineIntersection3D,
  type Plane3D,
  type PointPlaneProjection3D,
  type LinePlaneIntersection3D,
  type Line3D,
} from "./geometry/euclideanConstructions3D";

export {
  sceneContainsPoints3D,
  fitPointsCamera3D,
  copyCameraState3D,
  type FitPointsCamera3DOptions,
  type CameraTarget3D,
} from "./geometry/viewport3D";

export {
  Segment3D,
  createSegment3D,
  type Segment3DOptions,
  type Segment3DStyle,
  type SegmentDashStyle3D,
} from "./primitives/Segment3D";

export {
  PointMarker3D,
  createPointMarker3D,
  type PointMarker3DOptions,
} from "./primitives/PointMarker3D";

export {
  Polygon3D,
  createPolygon3D,
  type Polygon3DOptions,
  type Polygon3DStyle,
} from "./primitives/Polygon3D";

export {
  AngleSector3D,
  createAngleSector3D,
  type AngleSector3DOptions,
  type AngleSectorShape3D,
} from "./primitives/AngleSector3D";

export {
  ProofStageController3D,
  type ProofStage3D,
  type ProofStageController3DOptions,
  type SegmentDrawAnimation3DOptions,
  type RevealAnimation3DOptions,
  type StageEasing3D,
} from "./animation/ProofStageController3D";

export * from "./animation/proofHelpers3D";

export {
  projectPointToSphere3D,
  spherePointFromLatitudeLongitude3D,
  sphericalAngleRadians3D,
  sampleGreatCircleArc3D,
  sampleSpherePlaneCircle3D,
  sampleGreatCircle3D,
  sampleSphericalParallel3D,
  pointOnMinorGreatCircleArc3D,
  sphericalTangentDirection3D,
  sphericalAltitudeFoot3D,
  sphericalOrthocenter3D,
  sphericalAngleBisector3D,
  type SphereCircle3D,
  type SphericalAltitude3D,
  type SphericalOrthocenter3D,
  type SphericalAngleBisector3D,
} from "./geometry/sphericalConstructions3D";

export {
  Polyline3D,
  createPolyline3D,
  type Polyline3DOptions,
  type Polyline3DStyle,
} from "./primitives/Polyline3D";

export {
  SphericalAngleSector3D,
  createSphericalAngleSector3D,
  type SphericalAngleSector3DOptions,
} from "./primitives/SphericalAngleSector3D";

export {
  SphericalLune3D,
  createSphericalLune3D,
  type SphericalLune3DOptions,
  type SphericalLuneSweep3D,
} from "./primitives/SphericalLune3D";
export {
  SphericalWedge3D,
  createSphericalWedge3D,
  type SphericalWedge3DOptions,
  type SphericalWedgeSweep3D,
} from "./primitives/SphericalWedge3D";


