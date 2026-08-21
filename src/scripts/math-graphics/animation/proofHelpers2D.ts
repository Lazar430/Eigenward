import { HUES } from "../core/colors";
import type { Vec2Tuple } from "../core/types";
import type { ProofStageController2D } from "./ProofStageController2D";
import type {
  AngleDirection2D,
  MinorAngleSector2D,
} from "../geometry/euclideanConstructions2D";
import {
  distance2D,
  minorAngleSector2D,
} from "../geometry/euclideanConstructions2D";
import {
  AngleSector2D,
  createAngleSector2D,
  type AngleSectorShape2D,
} from "../primitives/AngleSector2D";
import {
  ParametricShape2D,
  createParametricShape2D,
} from "../primitives/ParametricShape2D";
import { Segment2D, createSegment2D } from "../primitives/Segment2D";
import { TextLabel2D, createTextLabel2D } from "../primitives/TextLabel2D";

const TAU = Math.PI * 2;
const DEFAULT_POINT_RADIUS = 0.105;

export interface ProofVisualPoint2D {
  readonly marker: ParametricShape2D;
  readonly label: TextLabel2D;
  readonly baseRadius: number;
  readonly labelOffset: Vec2Tuple;
  getPosition(): Vec2Tuple;
  setPosition(position: Vec2Tuple): ProofVisualPoint2D;
  show(): ProofVisualPoint2D;
  hide(): ProofVisualPoint2D;
}

export interface CreateProofPoint2DOptions {
  name?: string;
  text: string;
  position: Vec2Tuple;
  offset?: Vec2Tuple;
  radius?: number;
  fill?: string;
  fillOpacity?: number;
  outline?: string;
  outlineWidth?: number;
  outlineOpacity?: number;
  markerZ?: number;
  labelColor?: string;
  labelFontSizePx?: number;
  labelFontWeight?: number;
  labelBackground?: string;
  labelBorder?: string;
  labelBorderRadiusPx?: number;
  labelPadding?: string;
}

export interface CreateProofSegment2DOptions {
  name?: string;
  color?: string;
  width?: number;
  opacity?: number;
}

export interface CreateDashedProofSegment2DOptions
  extends CreateProofSegment2DOptions {
  dashSize?: number;
  gapSize?: number;
}

export interface CreateProofCircleOutline2DOptions {
  name?: string;
  center?: Vec2Tuple;
  radius: number;
  segments?: number;
  outline?: string;
  outlineWidth?: number;
  outlineOpacity?: number;
  fill?: string | null;
  fillOpacity?: number;
}

export interface CreateProofLabel2DOptions {
  name?: string;
  text: string;
  position: Vec2Tuple;
  anchor?: Vec2Tuple;
  color?: string;
  fontSizePx?: number;
  fontWeight?: number;
  background?: string;
  border?: string;
  borderRadiusPx?: number;
  padding?: string;
}

export interface CreateProofSectorHighlight2DOptions {
  name?: string;
  vertex: Vec2Tuple;
  firstArmPoint: Vec2Tuple;
  secondArmPoint: Vec2Tuple;
  radius?: number;
  shape?: AngleSectorShape2D;
  fill?: string;
  fillOpacity?: number;
  outline?: string | null;
  outlineOpacity?: number;
}

export interface ProofLinearBoundaryPiece2D {
  type: "segment";
  from: Vec2Tuple;
  to: Vec2Tuple;
}

export interface ProofArcBoundaryPiece2D {
  type: "arc";
  center: Vec2Tuple;
  radius: number;
  startAngle: number;
  endAngle: number;
  direction?: AngleDirection2D;
}

export type ProofBoundaryPiece2D =
  | ProofLinearBoundaryPiece2D
  | ProofArcBoundaryPiece2D;

export interface CreateProofBoundaryRegion2DOptions {
  name?: string;
  pieces: readonly ProofBoundaryPiece2D[];
  segments?: number;
  fill?: string;
  fillOpacity?: number;
  outline?: string | null;
  outlineWidth?: number;
  outlineOpacity?: number;
}

export interface ProofAnimationOptions2D {
  durationSeconds?: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function sampleSegmentPiece(piece: ProofLinearBoundaryPiece2D, t: number): Vec2Tuple {
  return [
    lerp(piece.from[0], piece.to[0], t),
    lerp(piece.from[1], piece.to[1], t),
  ];
}

function arcSweep(piece: ProofArcBoundaryPiece2D): number {
  const direction = piece.direction ?? "counterclockwise";
  const raw = piece.endAngle - piece.startAngle;

  return direction === "counterclockwise"
    ? positiveModulo(raw, TAU)
    : -positiveModulo(-raw, TAU);
}

function sampleArcPiece(piece: ProofArcBoundaryPiece2D, t: number): Vec2Tuple {
  const angle = piece.startAngle + arcSweep(piece) * t;
  return proofCirclePoint2D(piece.center, piece.radius, angle);
}

function boundaryPieceLength(piece: ProofBoundaryPiece2D): number {
  if (piece.type === "segment") {
    return Math.max(1e-6, distance2D(piece.from, piece.to));
  }

  return Math.max(1e-6, Math.abs(piece.radius * arcSweep(piece)));
}

export function proofCirclePoint2D(
  center: Vec2Tuple,
  radius: number,
  angleRadians: number,
): Vec2Tuple {
  return [
    center[0] + radius * Math.cos(angleRadians),
    center[1] + radius * Math.sin(angleRadians),
  ];
}

export function angleOfPointAbout2D(
  center: Vec2Tuple,
  point: Vec2Tuple,
): number {
  return Math.atan2(point[1] - center[1], point[0] - center[0]);
}

export function proofArcPieceFromPoints2D(options: {
  center: Vec2Tuple;
  radius: number;
  startPoint: Vec2Tuple;
  endPoint: Vec2Tuple;
  direction?: AngleDirection2D;
}): ProofArcBoundaryPiece2D {
  return {
    type: "arc",
    center: options.center,
    radius: options.radius,
    startAngle: angleOfPointAbout2D(options.center, options.startPoint),
    endAngle: angleOfPointAbout2D(options.center, options.endPoint),
    direction: options.direction ?? "counterclockwise",
  };
}

export function createProofLabel2D({
  name = "proof-label-2d",
  text,
  position,
  anchor = [0.5, 0.5],
  color = "rgba(245, 242, 255, 0.98)",
  fontSizePx = 15,
  fontWeight = 780,
  background = "rgba(18, 14, 31, 0.7)",
  border = "1px solid rgba(198, 180, 255, 0.12)",
  borderRadiusPx = 7,
  padding = "0.1rem 0.3rem",
}: CreateProofLabel2DOptions): TextLabel2D {
  return createTextLabel2D({
    name,
    text,
    position,
    anchor,
    color,
    fontSizePx,
    fontWeight,
    background,
    border,
    borderRadiusPx,
    padding,
  });
}

export function createProofPoint2D({
  name = "proof-point-2d",
  text,
  position,
  offset = [0.24, 0.24],
  radius = DEFAULT_POINT_RADIUS,
  fill = HUES.cyan.base,
  fillOpacity = 0.98,
  outline = HUES.purple.soft,
  outlineWidth = 1.6,
  outlineOpacity = 0.96,
  markerZ = 0.08,
  labelColor = "rgba(245, 242, 255, 0.98)",
  labelFontSizePx = 15,
  labelFontWeight = 780,
  labelBackground = "rgba(18, 14, 31, 0.7)",
  labelBorder = "1px solid rgba(198, 180, 255, 0.12)",
  labelBorderRadiusPx = 7,
  labelPadding = "0.1rem 0.3rem",
}: CreateProofPoint2DOptions): ProofVisualPoint2D {
  const marker = createParametricShape2D({
    name: `${name}:marker`,
    curve: (parameter) => [Math.cos(parameter), Math.sin(parameter)],
    domain: [0, TAU],
    segments: 72,
    style: {
      fill,
      fillOpacity,
      outline,
      outlineWidth,
      outlineOpacity,
    },
  })
    .resizeTo(radius)
    .moveTo(position[0], position[1]);

  marker.position.z = markerZ;

  const label = createProofLabel2D({
    name: `${name}:label`,
    text,
    position: [position[0] + offset[0], position[1] + offset[1]],
    color: labelColor,
    fontSizePx: labelFontSizePx,
    fontWeight: labelFontWeight,
    background: labelBackground,
    border: labelBorder,
    borderRadiusPx: labelBorderRadiusPx,
    padding: labelPadding,
  });

  let currentPosition: Vec2Tuple = [position[0], position[1]];

  const api: ProofVisualPoint2D = {
    marker,
    label,
    baseRadius: radius,
    labelOffset: [offset[0], offset[1]],
    getPosition() {
      return [currentPosition[0], currentPosition[1]];
    },
    setPosition(nextPosition) {
      currentPosition = [nextPosition[0], nextPosition[1]];
      marker.moveTo(nextPosition[0], nextPosition[1]);
      label.moveTo(nextPosition[0] + offset[0], nextPosition[1] + offset[1]);
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

export function createProofSegment2D({
  name = "proof-segment-2d",
  color = HUES.cyan.light,
  width = 2.6,
  opacity = 0.97,
}: CreateProofSegment2DOptions = {}): Segment2D {
  return createSegment2D({
    name,
    start: [0, 0],
    end: [0, 0],
    style: {
      color,
      width,
      opacity,
    },
  });
}

export function createDashedProofSegment2D({
  name = "proof-dashed-segment-2d",
  color = HUES.blue.light,
  width = 2.15,
  opacity = 0.93,
  dashSize = 0.2,
  gapSize = 0.13,
}: CreateDashedProofSegment2DOptions = {}): Segment2D {
  return createSegment2D({
    name,
    start: [0, 0],
    end: [0, 0],
    style: {
      color,
      width,
      opacity,
      dashed: true,
      dashSize,
      gapSize,
    },
  });
}

export function createProofCircleOutline2D({
  name = "proof-circle-outline-2d",
  center = [0, 0],
  radius,
  segments = 220,
  outline = HUES.purple.soft,
  outlineWidth = 2.25,
  outlineOpacity = 0.98,
  fill = null,
  fillOpacity = 0,
}: CreateProofCircleOutline2DOptions): ParametricShape2D {
  return createParametricShape2D({
    name,
    curve: (parameter) => proofCirclePoint2D(center, radius, parameter),
    domain: [0, TAU],
    segments,
    style: {
      fill,
      fillOpacity,
      outline,
      outlineWidth,
      outlineOpacity,
    },
  });
}

export function createProofSectorHighlight2D({
  name = "proof-sector-highlight-2d",
  vertex,
  firstArmPoint,
  secondArmPoint,
  radius = 0,
  shape = "sector",
  fill = HUES.gold.base,
  fillOpacity = 0.18,
  outline = HUES.gold.light,
  outlineOpacity = 0.34,
}: CreateProofSectorHighlight2DOptions): AngleSector2D {
  const sectorData: MinorAngleSector2D = minorAngleSector2D(
    vertex,
    firstArmPoint,
    secondArmPoint,
  );

  return createAngleSector2D({
    name,
    center: sectorData.center,
    startAngle: sectorData.startAngle,
    endAngle: sectorData.endAngle,
    direction: sectorData.direction,
    radius,
    shape,
    fill,
    fillOpacity,
    outline,
    outlineOpacity: outline === null ? 0 : outlineOpacity,
  });
}

export function createProofBoundaryRegion2D({
  name = "proof-boundary-region-2d",
  pieces,
  segments = 180,
  fill = HUES.mint.base,
  fillOpacity = 0.18,
  outline = null,
  outlineWidth = 1.5,
  outlineOpacity = 0.4,
}: CreateProofBoundaryRegion2DOptions): ParametricShape2D {
  if (pieces.length === 0) {
    throw new RangeError("A boundary region needs at least one boundary piece.");
  }

  const lengths = pieces.map(boundaryPieceLength);
  const totalLength = lengths.reduce((sum, value) => sum + value, 0);
  const cumulative: number[] = [0];

  for (const length of lengths) {
    cumulative.push(cumulative[cumulative.length - 1] + length / totalLength);
  }
  cumulative[cumulative.length - 1] = 1;

  const curve = (t: number): Vec2Tuple => {
    if (t <= 0) {
      const first = pieces[0];
      return first.type === "segment"
        ? sampleSegmentPiece(first, 0)
        : sampleArcPiece(first, 0);
    }

    if (t >= 1) {
      const last = pieces[pieces.length - 1];
      return last.type === "segment"
        ? sampleSegmentPiece(last, 1)
        : sampleArcPiece(last, 1);
    }

    for (let index = 0; index < pieces.length; index += 1) {
      const start = cumulative[index];
      const end = cumulative[index + 1];
      if (t <= end || index === pieces.length - 1) {
        const local = end - start <= 1e-8 ? 0 : (t - start) / (end - start);
        const piece = pieces[index];
        return piece.type === "segment"
          ? sampleSegmentPiece(piece, local)
          : sampleArcPiece(piece, local);
      }
    }

    const fallback = pieces[pieces.length - 1];
    return fallback.type === "segment"
      ? sampleSegmentPiece(fallback, 1)
      : sampleArcPiece(fallback, 1);
  };

  return createParametricShape2D({
    name,
    curve,
    domain: [0, 1],
    segments,
    style: {
      fill,
      fillOpacity,
      outline,
      outlineWidth,
      outlineOpacity: outline === null ? 0 : outlineOpacity,
    },
  });
}

export async function revealProofPoint2D(
  proof: ProofStageController2D,
  point: ProofVisualPoint2D,
  options: ProofAnimationOptions2D = {},
): Promise<void> {
  const durationSeconds = options.durationSeconds ?? 0.28;

  point.marker.show().resizeTo(0);
  point.label.show().setOpacity(0);

  await proof.animate(durationSeconds, (progress) => {
    point.marker.resizeTo(point.baseRadius * progress);
    point.label.setOpacity(progress);
  });
}

export async function revealProofLabel2D(
  proof: ProofStageController2D,
  label: TextLabel2D,
  options: ProofAnimationOptions2D = {},
): Promise<void> {
  const durationSeconds = options.durationSeconds ?? 0.25;

  label.show().setOpacity(0);
  await proof.animate(durationSeconds, (progress) => {
    label.setOpacity(progress);
  });
}

export async function traceProofShape2D(
  proof: ProofStageController2D,
  shape: ParametricShape2D,
  options: ProofAnimationOptions2D = {},
): Promise<void> {
  const durationSeconds = options.durationSeconds ?? 0.95;

  shape.show();
  shape.setOutlineTraceRange(0, 0);

  await proof.animate(durationSeconds, (progress) => {
    shape.setOutlineTraceRange(0, progress);
  });

  shape.showCompleteOutline();
}

export async function revealProofFill2D(
  proof: ProofStageController2D,
  shape: ParametricShape2D,
  targetFillOpacity: number,
  options: ProofAnimationOptions2D = {},
): Promise<void> {
  const durationSeconds = options.durationSeconds ?? 0.42;

  shape.show().setFillOpacity(0);
  await proof.animate(durationSeconds, (progress) => {
    shape.setFillOpacity(targetFillOpacity * progress);
  });
}

export async function revealProofSector2D(
  proof: ProofStageController2D,
  sector: AngleSector2D,
  radius: number,
  options: ProofAnimationOptions2D = {},
): Promise<void> {
  await proof.revealAngleSector(sector, radius, {
    durationSeconds: options.durationSeconds ?? 0.42,
  });
}
