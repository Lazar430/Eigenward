import type { ColorRepresentation } from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { COLORS } from "../core/colors";
import { MathObject2D } from "../core/MathObject2D";
import type { Vec2Tuple } from "../core/types";

const EPSILON = 1e-10;

export interface SegmentDashStyle2D {
  dashed?: boolean;
  /** Dash length in mathematical world units. */
  dashSize?: number;
  /** Gap length in mathematical world units. */
  gapSize?: number;
}

export interface Segment2DStyle extends SegmentDashStyle2D {
  color?: ColorRepresentation;
  opacity?: number;
  /** Screen-space width in CSS/WebGL pixels, matching the engine's Line2 usage. */
  width?: number;
}

export interface Segment2DOptions {
  start: Vec2Tuple;
  end: Vec2Tuple;
  style?: Segment2DStyle;
  name?: string;
}

function clampOpacity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function assertFinitePoint(point: Vec2Tuple, label: string): void {
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    throw new RangeError(`${label} must contain two finite numbers.`);
  }
}

/**
 * A reusable finite geometry segment with mutable endpoints.
 *
 * Unlike Vector2D, this primitive is semantically a plain segment rather than
 * an arrow and supports dashed construction/extension lines. The LineGeometry
 * and LineMaterial are persistent; setEndpoints() only updates their positions.
 */
export class Segment2D extends MathObject2D {
  private readonly geometry = new LineGeometry();
  private readonly material: LineMaterial;
  private readonly line: Line2;

  private startPoint: Vec2Tuple;
  private endPoint: Vec2Tuple;
  private readonly initialLength: number;
  private lastNonzeroAngle = 0;

  constructor({
    start,
    end,
    style = {},
    name = "segment-2d",
  }: Segment2DOptions) {
    super();

    assertFinitePoint(start, "start");
    assertFinitePoint(end, "end");

    this.name = name;
    this.startPoint = [start[0], start[1]];
    this.endPoint = [end[0], end[1]];
    this.initialLength = Math.hypot(
      end[0] - start[0],
      end[1] - start[1],
    );

    if (this.initialLength > EPSILON) {
      this.lastNonzeroAngle = Math.atan2(
        end[1] - start[1],
        end[0] - start[0],
      );
    }

    const dashed = style.dashed ?? false;
    const dashSize = Math.max(EPSILON, style.dashSize ?? 0.16);
    const gapSize = Math.max(0, style.gapSize ?? 0.12);

    this.material = new LineMaterial({
      color: style.color ?? COLORS.white,
      opacity: clampOpacity(style.opacity ?? 1),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      dashed,
      dashSize,
      gapSize,
      alphaToCoverage: false,
    });

    this.material.linewidth = Math.max(0, style.width ?? 2);

    this.line = new Line2(this.geometry, this.material);
    this.line.name = `${name}:line`;
    this.line.renderOrder = 2;

    this.add(this.line);
    this.updateGeometry();
  }

  getStart(): Vec2Tuple {
    return [this.startPoint[0], this.startPoint[1]];
  }

  getEnd(): Vec2Tuple {
    return [this.endPoint[0], this.endPoint[1]];
  }

  getLength(): number {
    return Math.hypot(
      this.endPoint[0] - this.startPoint[0],
      this.endPoint[1] - this.startPoint[1],
    );
  }

  setEndpoints(start: Vec2Tuple, end: Vec2Tuple): this {
    assertFinitePoint(start, "start");
    assertFinitePoint(end, "end");

    this.startPoint = [start[0], start[1]];
    this.endPoint = [end[0], end[1]];

    const dx = end[0] - start[0];
    const dy = end[1] - start[1];

    if (Math.hypot(dx, dy) > EPSILON) {
      this.lastNonzeroAngle = Math.atan2(dy, dx);
    }

    this.updateGeometry();
    return this.changed();
  }

  setStart(start: Vec2Tuple): this {
    return this.setEndpoints(start, this.endPoint);
  }

  setEnd(end: Vec2Tuple): this {
    return this.setEndpoints(this.startPoint, end);
  }

  setColor(color: ColorRepresentation): this {
    this.material.color.set(color);
    return this.changed();
  }

  setOpacity(opacity: number): this {
    this.material.opacity = clampOpacity(opacity);
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
  }: SegmentDashStyle2D): this {
    this.material.dashed = dashed;
    this.material.dashSize = Math.max(EPSILON, dashSize);
    this.material.gapSize = Math.max(0, gapSize);
    this.material.needsUpdate = true;
    this.line.computeLineDistances();
    return this.changed();
  }

  override moveTo(x: number, y: number): this {
    const dx = this.endPoint[0] - this.startPoint[0];
    const dy = this.endPoint[1] - this.startPoint[1];

    return this.setEndpoints([x, y], [x + dx, y + dy]);
  }

  override moveBy(dx: number, dy: number): this {
    return this.setEndpoints(
      [this.startPoint[0] + dx, this.startPoint[1] + dy],
      [this.endPoint[0] + dx, this.endPoint[1] + dy],
    );
  }

  override setRotation(angleRadians: number): this {
    const length = this.getLength();

    return this.setEnd([
      this.startPoint[0] + length * Math.cos(angleRadians),
      this.startPoint[1] + length * Math.sin(angleRadians),
    ]);
  }

  override rotateBy(angleRadians: number): this {
    return this.setRotation(this.lastNonzeroAngle + angleRadians);
  }

  /**
   * Scale relative to the segment's construction-time length, matching Vector2D.
   */
  override resizeTo(scale: number): this {
    const targetLength = Math.max(0, this.initialLength * scale);

    return this.setEnd([
      this.startPoint[0] + targetLength * Math.cos(this.lastNonzeroAngle),
      this.startPoint[1] + targetLength * Math.sin(this.lastNonzeroAngle),
    ]);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private updateGeometry(): void {
    this.geometry.setPositions([
      this.startPoint[0], this.startPoint[1], 0.02,
      this.endPoint[0], this.endPoint[1], 0.02,
    ]);
    this.line.computeLineDistances();
  }
}

export function createSegment2D(options: Segment2DOptions): Segment2D {
  return new Segment2D(options);
}
