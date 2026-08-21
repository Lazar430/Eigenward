import type { ColorRepresentation } from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { COLORS } from "../core/colors";
import { MathObject3D } from "../core/MathObject3D";
import type { Vec3Tuple } from "../core/types3D";
import { distance3D } from "../geometry/euclideanConstructions3D";

const EPSILON = 1e-10;

export interface Polyline3DStyle {
  color?: ColorRepresentation;
  opacity?: number;
  width?: number;
  dashed?: boolean;
  dashSize?: number;
  gapSize?: number;
  depthTest?: boolean;
  renderOrder?: number;
}

export interface Polyline3DOptions {
  points: readonly Vec3Tuple[];
  style?: Polyline3DStyle;
  name?: string;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function assertPoints(points: readonly Vec3Tuple[]): void {
  if (points.length < 2) throw new RangeError("Polyline3D requires at least two points.");
  for (const point of points) {
    if (!point.every(Number.isFinite)) {
      throw new RangeError("Polyline3D points must all be finite.");
    }
  }
}

function copyPoints(points: readonly Vec3Tuple[]): Vec3Tuple[] {
  return points.map(([x, y, z]) => [x, y, z] as Vec3Tuple);
}

function flattenPoints(points: readonly Vec3Tuple[]): number[] {
  const values: number[] = [];
  for (const [x, y, z] of points) values.push(x, y, z);
  return values;
}

/** Persistent sampled 3D curve with dashed styling and arc-length reveal. */
export class Polyline3D extends MathObject3D {
  private readonly geometry = new LineGeometry();
  private readonly material: LineMaterial;
  private readonly line: Line2;
  private pointsValue: Vec3Tuple[];
  private cumulativeLengths: number[] = [];
  private totalLength = 0;
  private revealProgress = 1;

  constructor({ points, style = {}, name = "polyline-3d" }: Polyline3DOptions) {
    super();
    assertPoints(points);
    this.name = name;
    this.pointsValue = copyPoints(points);

    this.material = new LineMaterial({
      color: style.color ?? COLORS.white,
      opacity: clamp01(style.opacity ?? 1),
      transparent: true,
      depthTest: style.depthTest ?? true,
      depthWrite: false,
      dashed: style.dashed ?? false,
      dashSize: Math.max(EPSILON, style.dashSize ?? 0.16),
      gapSize: Math.max(0, style.gapSize ?? 0.12),
      alphaToCoverage: false,
    });
    this.material.linewidth = Math.max(0, style.width ?? 2);

    this.line = new Line2(this.geometry, this.material);
    this.line.name = `${name}:line`;
    this.line.renderOrder = style.renderOrder ?? 2;
    this.add(this.line);

    this.recomputeLengths();
    this.updateGeometry();
  }

  getPoints(): readonly Vec3Tuple[] {
    return copyPoints(this.pointsValue);
  }

  getLength(): number {
    return this.totalLength;
  }

  getRevealProgress(): number {
    return this.revealProgress;
  }

  setPoints(points: readonly Vec3Tuple[]): this {
    assertPoints(points);
    this.pointsValue = copyPoints(points);
    this.recomputeLengths();
    this.updateGeometry();
    return this.changed();
  }

  setRevealProgress(progress: number): this {
    this.revealProgress = clamp01(progress);
    this.updateGeometry();
    return this.changed();
  }

  showComplete(): this {
    return this.setRevealProgress(1).show();
  }

  setColor(color: ColorRepresentation): this {
    this.material.color.set(color);
    return this.changed();
  }

  setOpacity(opacity: number): this {
    this.material.opacity = clamp01(opacity);
    this.material.visible = this.material.opacity > 0;
    return this.changed();
  }

  setWidth(widthPixels: number): this {
    this.material.linewidth = Math.max(0, widthPixels);
    return this.changed();
  }

  setDashStyle({
    dashed = this.material.dashed,
    dashSize = this.material.dashSize,
    gapSize = this.material.gapSize,
  }: { dashed?: boolean; dashSize?: number; gapSize?: number }): this {
    this.material.dashed = dashed;
    this.material.dashSize = Math.max(EPSILON, dashSize);
    this.material.gapSize = Math.max(0, gapSize);
    this.material.needsUpdate = true;
    this.line.computeLineDistances();
    return this.changed();
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private recomputeLengths(): void {
    this.cumulativeLengths = [0];
    this.totalLength = 0;
    for (let index = 1; index < this.pointsValue.length; index += 1) {
      this.totalLength += distance3D(this.pointsValue[index - 1], this.pointsValue[index]);
      this.cumulativeLengths.push(this.totalLength);
    }
  }

  /**
   * Return a reveal-state polyline with the SAME number of points as the
   * original curve.
   *
   * This is important for LineGeometry/Line2. Rebuilding the geometry with a
   * progressively larger number of line segments during an animation can leave
   * the instanced draw count stuck at the smaller size. Instead, unrevealed
   * points collapse onto the current reveal tip, so the GPU-side topology never
   * changes while the curve is being drawn.
   */
  private visiblePoints(): Vec3Tuple[] {
    const pointCount = this.pointsValue.length;

    if (this.revealProgress >= 1 || this.totalLength <= EPSILON) {
      return copyPoints(this.pointsValue);
    }

    const first = this.pointsValue[0];

    if (this.revealProgress <= 0) {
      return Array.from(
        { length: pointCount },
        () => [...first] as Vec3Tuple,
      );
    }

    const targetLength = this.totalLength * this.revealProgress;
    const result: Vec3Tuple[] = [];

    let revealTip: Vec3Tuple = [...first] as Vec3Tuple;
    let crossedTarget = false;

    for (let index = 0; index < pointCount; index += 1) {
      if (crossedTarget) {
        result.push([...revealTip] as Vec3Tuple);
        continue;
      }

      if (index === 0) {
        result.push([...first] as Vec3Tuple);
        continue;
      }

      const previousLength = this.cumulativeLengths[index - 1];
      const nextLength = this.cumulativeLengths[index];

      if (targetLength >= nextLength) {
        revealTip = [...this.pointsValue[index]] as Vec3Tuple;
        result.push([...revealTip] as Vec3Tuple);
        continue;
      }

      const segmentLength = nextLength - previousLength;
      const t =
        segmentLength <= EPSILON
          ? 0
          : (targetLength - previousLength) / segmentLength;

      const a = this.pointsValue[index - 1];
      const b = this.pointsValue[index];

      revealTip = [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ];

      result.push([...revealTip] as Vec3Tuple);
      crossedTarget = true;
    }

    while (result.length < pointCount) {
      result.push([...revealTip] as Vec3Tuple);
    }

    return result;
  }

  private updateGeometry(): void {
    this.geometry.setPositions(flattenPoints(this.visiblePoints()));

    /*
     * These proof curves are cheap and are frequently animated. Disabling
     * frustum culling avoids stale bounds becoming another source of disappearing
     * lines while their vertices move from the collapsed reveal state.
     */
    this.line.frustumCulled = false;

    this.line.computeLineDistances();
  }
}

export function createPolyline3D(options: Polyline3DOptions): Polyline3D {
  return new Polyline3D(options);
}
