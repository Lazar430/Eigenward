import { HUES } from "../core/colors";
import type { Vec3Tuple } from "../core/types3D";
import type { ProofStageController3D } from "./ProofStageController3D";
import {
  AngleSector3D,
  createAngleSector3D,
  type AngleSectorShape3D,
} from "../primitives/AngleSector3D";
import {
  PointMarker3D,
  createPointMarker3D,
} from "../primitives/PointMarker3D";
import {
  Polygon3D,
  createPolygon3D,
} from "../primitives/Polygon3D";
import {
  Segment3D,
  createSegment3D,
} from "../primitives/Segment3D";
import {
  TextLabel3D,
  createTextLabel3D,
} from "../primitives/TextLabel3D";
import {
  Polyline3D,
  createPolyline3D,
} from "../primitives/Polyline3D";
import {
  SphericalAngleSector3D,
  createSphericalAngleSector3D,
} from "../primitives/SphericalAngleSector3D";
import {
  SphericalLune3D,
  createSphericalLune3D,
  type SphericalLuneSweep3D,
} from "../primitives/SphericalLune3D";
import {
  SphericalWedge3D,
  createSphericalWedge3D,
  type SphericalWedgeSweep3D,
} from "../primitives/SphericalWedge3D";
import {
  add3D,
  normalize3D,
  scale3D,
  subtract3D,
} from "../geometry/euclideanConstructions3D";
import { sphericalTangentDirection3D } from "../geometry/sphericalConstructions3D";

export interface ProofVisualPoint3D {
  readonly marker: PointMarker3D;
  readonly label: TextLabel3D;
  readonly baseRadius: number;
  readonly labelOffset: Vec3Tuple;
  getPosition(): Vec3Tuple;
  setPosition(position: Vec3Tuple): ProofVisualPoint3D;
  show(): ProofVisualPoint3D;
  hide(): ProofVisualPoint3D;
}

export interface CreateProofPoint3DOptions {
  name?: string;
  text: string;
  position: Vec3Tuple;
  offset?: Vec3Tuple;
  radius?: number;
  fill?: string;
  opacity?: number;
  labelColor?: string;
  labelFontSizePx?: number;
  labelFontWeight?: number;
  labelBackground?: string;
  labelBorder?: string;
  labelBorderRadiusPx?: number;
  labelPadding?: string;
}

export interface CreateProofSegment3DOptions {
  name?: string;
  color?: string;
  width?: number;
  opacity?: number;
  depthTest?: boolean;
}

export interface CreateDashedProofSegment3DOptions
  extends CreateProofSegment3DOptions {
  dashSize?: number;
  gapSize?: number;
}

export interface CreateProofAngle3DOptions {
  name?: string;
  center: Vec3Tuple;
  firstArmPoint: Vec3Tuple;
  secondArmPoint: Vec3Tuple;
  radius?: number;
  shape?: AngleSectorShape3D;
  fill?: string;
  fillOpacity?: number;
  outline?: string | null;
  outlineOpacity?: number;
}

export interface CreateProofSphericalRightAngle3DOptions {
  name?: string;
  sphereCenter: Vec3Tuple;
  vertex: Vec3Tuple;
  firstArmPoint: Vec3Tuple;
  secondArmPoint: Vec3Tuple;
  radius?: number;
  surfaceOffset?: number;
  fill?: string;
  fillOpacity?: number;
  outline?: string | null;
  outlineOpacity?: number;
}

export interface CreateProofSphericalLune3DOptions {
  name?: string;
  sphereCenter: Vec3Tuple;
  sphereRadius?: number;
  pole: Vec3Tuple;
  firstBoundaryPoint: Vec3Tuple;
  secondBoundaryPoint: Vec3Tuple;
  sweep?: SphericalLuneSweep3D;
  revealProgress?: number;
  surfaceOffset?: number;
  fill?: string;
  fillOpacity?: number;
  outline?: string | null;
  outlineOpacity?: number;
  outlineWidth?: number;
  depthTest?: boolean;
}

export interface CreateProofSphericalWedge3DOptions {
  name?: string;
  sphereCenter: Vec3Tuple;
  sphereRadius?: number;
  pole: Vec3Tuple;
  firstBoundaryPoint: Vec3Tuple;
  secondBoundaryPoint: Vec3Tuple;
  sweep?: SphericalWedgeSweep3D;
  revealProgress?: number;
  surfaceOffset?: number;
  fill?: string;
  fillOpacity?: number;
  depthTest?: boolean;
}

export interface CreateProofPolygon3DOptions {
  name?: string;
  vertices: readonly Vec3Tuple[];
  fill?: string;
  fillOpacity?: number;
  outline?: string | null;
  outlineOpacity?: number;
  depthTest?: boolean;
}

export interface ProofAnimationOptions3D {
  durationSeconds?: number;
}

export function createProofPoint3D({
  name = "proof-point-3d",
  text,
  position,
  offset = [0.18, 0.18, 0.18],
  radius = 0.085,
  fill = HUES.cyan.base,
  opacity = 1,
  labelColor = "rgba(245, 242, 255, 0.98)",
  labelFontSizePx = 14,
  labelFontWeight = 720,
  labelBackground = "rgba(18, 14, 31, 0.72)",
  labelBorder = "1px solid rgba(198, 180, 255, 0.14)",
  labelBorderRadiusPx = 7,
  labelPadding = "0.1rem 0.3rem",
}: CreateProofPoint3DOptions): ProofVisualPoint3D {
  const marker = createPointMarker3D({
    name: `${name}:marker`,
    position,
    radius,
    color: fill,
    opacity,
  });

  const label = createTextLabel3D({
    name: `${name}:label`,
    text,
    position: [
      position[0] + offset[0],
      position[1] + offset[1],
      position[2] + offset[2],
    ],
    color: labelColor,
    fontSizePx: labelFontSizePx,
    fontWeight: labelFontWeight,
    background: labelBackground,
    border: labelBorder,
    borderRadiusPx: labelBorderRadiusPx,
    padding: labelPadding,
  });

  let currentPosition: Vec3Tuple = [...position] as Vec3Tuple;

  const api: ProofVisualPoint3D = {
    marker,
    label,
    baseRadius: radius,
    labelOffset: [...offset] as Vec3Tuple,

    getPosition() {
      return [...currentPosition] as Vec3Tuple;
    },

    setPosition(nextPosition) {
      currentPosition = [...nextPosition] as Vec3Tuple;
      marker.setPoint(nextPosition);
      label.moveTo(
        nextPosition[0] + offset[0],
        nextPosition[1] + offset[1],
        nextPosition[2] + offset[2],
      );
      return api;
    },

    show() {
      marker.show();
      label.show();
      return api;
    },

    hide() {
      marker.hide();
      label.hide();
      return api;
    },
  };

  return api;
}

export function createProofSegment3D({
  name = "proof-segment-3d",
  color = HUES.cyan.light,
  width = 2.4,
  opacity = 0.96,
  depthTest = true,
}: CreateProofSegment3DOptions = {}): Segment3D {
  return createSegment3D({
    name,
    start: [0, 0, 0],
    end: [0, 0, 0],
    style: {
      color,
      width,
      opacity,
      depthTest,
    },
  });
}

export function createDashedProofSegment3D({
  name = "proof-dashed-segment-3d",
  color = HUES.purple.light,
  width = 2.2,
  opacity = 0.9,
  depthTest = true,
  dashSize = 0.18,
  gapSize = 0.12,
}: CreateDashedProofSegment3DOptions = {}): Segment3D {
  return createSegment3D({
    name,
    start: [0, 0, 0],
    end: [0, 0, 0],
    style: {
      color,
      width,
      opacity,
      depthTest,
      dashed: true,
      dashSize,
      gapSize,
    },
  });
}

export function createProofAngle3D({
  name = "proof-angle-3d",
  center,
  firstArmPoint,
  secondArmPoint,
  radius = 0,
  shape = "sector",
  fill = HUES.gold.base,
  fillOpacity = 0.2,
  outline = HUES.gold.light,
  outlineOpacity = 0.75,
}: CreateProofAngle3DOptions): AngleSector3D {
  return createAngleSector3D({
    name,
    center,
    firstArmPoint,
    secondArmPoint,
    radius,
    shape,
    fill,
    fillOpacity,
    outline,
    outlineOpacity,
  });
}

/**
 * Conventional square right-angle marker in the tangent plane of a sphere.
 *
 * The supplied arm points may lie anywhere on the two intersecting great
 * circles. Their intrinsic tangent directions at `vertex` are what determine
 * the marker orientation.
 */
export function createProofSphericalRightAngle3D({
  name = "proof-spherical-right-angle-3d",
  sphereCenter,
  vertex,
  firstArmPoint,
  secondArmPoint,
  radius = 0.18,
  surfaceOffset = 0.025,
  fill = HUES.blue.base,
  fillOpacity = 0.18,
  outline = HUES.blue.light,
  outlineOpacity = 0.95,
}: CreateProofSphericalRightAngle3DOptions): AngleSector3D {
  const radial = normalize3D(
    subtract3D(vertex, sphereCenter),
    "spherical right-angle radial",
  );
  const center = add3D(vertex, scale3D(radial, surfaceOffset));
  const firstTangent = sphericalTangentDirection3D(
    vertex,
    firstArmPoint,
    sphereCenter,
  );
  const secondTangent = sphericalTangentDirection3D(
    vertex,
    secondArmPoint,
    sphereCenter,
  );

  return createAngleSector3D({
    name,
    center,
    firstArmPoint: add3D(center, firstTangent),
    secondArmPoint: add3D(center, secondTangent),
    radius,
    shape: "right-angle",
    fill,
    fillOpacity,
    outline,
    outlineOpacity,
    depthTest: true,
    renderOrder: 6,
  });
}

export function createProofSphericalLune3D({
  name = "proof-spherical-lune-3d",
  sphereCenter,
  sphereRadius,
  pole,
  firstBoundaryPoint,
  secondBoundaryPoint,
  sweep = "minor",
  revealProgress = 0,
  surfaceOffset = 0.025,
  fill = HUES.mint.base,
  fillOpacity = 0.32,
  outline = HUES.mint.light,
  outlineOpacity = 0.96,
  outlineWidth = 2.0,
  depthTest = true,
}: CreateProofSphericalLune3DOptions): SphericalLune3D {
  return createSphericalLune3D({
    name,
    sphereCenter,
    sphereRadius,
    pole,
    firstBoundaryPoint,
    secondBoundaryPoint,
    sweep,
    revealProgress,
    surfaceOffset,
    fill,
    fillOpacity,
    outline,
    outlineOpacity,
    outlineWidth,
    depthTest,
  });
}

export function createProofSphericalWedge3D({
  name = "proof-spherical-wedge-3d",
  sphereCenter,
  sphereRadius,
  pole,
  firstBoundaryPoint,
  secondBoundaryPoint,
  sweep = "minor",
  revealProgress = 0,
  surfaceOffset = -0.028,
  fill = HUES.purple.base,
  fillOpacity = 0.16,
  depthTest = true,
}: CreateProofSphericalWedge3DOptions): SphericalWedge3D {
  return createSphericalWedge3D({
    name,
    sphereCenter,
    sphereRadius,
    pole,
    firstBoundaryPoint,
    secondBoundaryPoint,
    sweep,
    revealProgress,
    surfaceOffset,
    fill,
    fillOpacity,
    depthTest,
  });
}

export function createProofPolygon3D({
  name = "proof-polygon-3d",
  vertices,
  fill = HUES.mint.base,
  fillOpacity = 0.18,
  outline = HUES.mint.light,
  outlineOpacity = 0.45,
  depthTest = true,
}: CreateProofPolygon3DOptions): Polygon3D {
  return createPolygon3D({
    name,
    vertices,
    style: {
      fill,
      fillOpacity,
      outline,
      outlineOpacity,
      depthTest,
    },
  });
}

export async function revealProofPoint3D(
  proof: ProofStageController3D,
  point: ProofVisualPoint3D,
  options: ProofAnimationOptions3D = {},
): Promise<void> {
  const durationSeconds = options.durationSeconds ?? 0.28;

  point.marker.show().setRadius(0);
  point.label.show().setOpacity(0);

  await proof.animate(durationSeconds, (progress) => {
    point.marker.setRadius(point.baseRadius * progress);
    point.label.setOpacity(progress);
  });
}

export async function revealProofLabel3D(
  proof: ProofStageController3D,
  label: TextLabel3D,
  options: ProofAnimationOptions3D = {},
): Promise<void> {
  const durationSeconds = options.durationSeconds ?? 0.25;

  label.show().setOpacity(0);

  await proof.animate(durationSeconds, (progress) => {
    label.setOpacity(progress);
  });
}

export async function revealProofAngle3D(
  proof: ProofStageController3D,
  angle: AngleSector3D,
  radius: number,
  options: ProofAnimationOptions3D = {},
): Promise<void> {
  await proof.revealAngleSector(angle, radius, {
    durationSeconds: options.durationSeconds ?? 0.4,
  });
}

export async function revealProofPolygon3D(
  proof: ProofStageController3D,
  polygon: Polygon3D,
  fillOpacity: number,
  options: ProofAnimationOptions3D = {},
): Promise<void> {
  await proof.revealPolygon(polygon, fillOpacity, {
    durationSeconds: options.durationSeconds ?? 0.42,
  });
}


export interface CreateProofPolyline3DOptions {
  name?: string;
  points: readonly Vec3Tuple[];
  color?: string;
  width?: number;
  opacity?: number;
  depthTest?: boolean;
  dashed?: boolean;
  dashSize?: number;
  gapSize?: number;
}

export interface CreateProofSphericalAngle3DOptions {
  name?: string;
  sphereCenter: Vec3Tuple;
  sphereRadius?: number;
  vertex: Vec3Tuple;
  firstArmPoint: Vec3Tuple;
  secondArmPoint: Vec3Tuple;
  geodesicRadiusRadians?: number;
  surfaceOffset?: number;
  fill?: string;
  fillOpacity?: number;
  outline?: string | null;
  outlineOpacity?: number;
  outlineWidth?: number;
  depthTest?: boolean;
}

export function createProofPolyline3D({
  name = "proof-polyline-3d",
  points,
  color = HUES.cyan.light,
  width = 2.35,
  opacity = 0.96,
  depthTest = true,
  dashed = false,
  dashSize = 0.18,
  gapSize = 0.12,
}: CreateProofPolyline3DOptions): Polyline3D {
  return createPolyline3D({
    name,
    points,
    style: { color, width, opacity, depthTest, dashed, dashSize, gapSize },
  });
}

export function createDashedProofPolyline3D(
  options: Omit<CreateProofPolyline3DOptions, "dashed">,
): Polyline3D {
  return createProofPolyline3D({ ...options, dashed: true });
}

export function createProofSphericalAngle3D({
  name = "proof-spherical-angle-3d",
  sphereCenter,
  sphereRadius,
  vertex,
  firstArmPoint,
  secondArmPoint,
  geodesicRadiusRadians = 0,
  surfaceOffset = 0.012,
  fill = HUES.gold.base,
  fillOpacity = 0.22,
  outline = HUES.gold.light,
  outlineOpacity = 0.82,
  outlineWidth = 1.7,
  depthTest = true,
}: CreateProofSphericalAngle3DOptions): SphericalAngleSector3D {
  return createSphericalAngleSector3D({
    name,
    sphereCenter,
    sphereRadius,
    vertex,
    firstArmPoint,
    secondArmPoint,
    geodesicRadiusRadians,
    surfaceOffset,
    fill,
    fillOpacity,
    outline,
    outlineOpacity,
    outlineWidth,
    depthTest,
  });
}

export async function revealProofPolyline3D(
  proof: ProofStageController3D,
  polyline: Polyline3D,
  options: ProofAnimationOptions3D = {},
): Promise<void> {
  const durationSeconds = options.durationSeconds ?? 0.58;
  polyline.show().setRevealProgress(0);
  await proof.animate(durationSeconds, (progress) => {
    polyline.setRevealProgress(progress);
  });
}

export async function revealProofSphericalAngle3D(
  proof: ProofStageController3D,
  angle: SphericalAngleSector3D,
  geodesicRadiusRadians: number,
  options: ProofAnimationOptions3D = {},
): Promise<void> {
  const durationSeconds = options.durationSeconds ?? 0.4;
  angle.show().setGeodesicRadiusRadians(0);
  await proof.animate(durationSeconds, (progress) => {
    angle.setGeodesicRadiusRadians(geodesicRadiusRadians * progress);
  });
}

export async function revealProofSphericalLune3D(
  proof: ProofStageController3D,
  lune: SphericalLune3D,
  options: ProofAnimationOptions3D = {},
): Promise<void> {
  const durationSeconds = options.durationSeconds ?? 0.62;
  lune.show().setRevealProgress(0);
  await proof.animate(durationSeconds, (progress) => {
    lune.setRevealProgress(progress);
  });
}

export async function revealProofSphericalWedge3D(
  proof: ProofStageController3D,
  wedge: SphericalWedge3D,
  options: ProofAnimationOptions3D = {},
): Promise<void> {
  const durationSeconds = options.durationSeconds ?? 0.62;
  wedge.show().setRevealProgress(0);
  await proof.animate(durationSeconds, (progress) => {
    wedge.setRevealProgress(progress);
  });
}

