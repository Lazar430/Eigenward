import type { ColorRepresentation } from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { COLORS } from "../core/colors";
import { MathObject3D } from "../core/MathObject3D";
import type { Vec3Tuple } from "../core/types3D";
import {
  distance3D,
  lineDirection3D,
} from "../geometry/euclideanConstructions3D";

const EPSILON = 1e-10;

export interface SegmentDashStyle3D {
  dashed?: boolean;
  /** Dash length in mathematical world units. */
  dashSize?: number;
  /** Gap length in mathematical world units. */
  gapSize?: number;
}

export interface Segment3DStyle extends SegmentDashStyle3D {
  color?: ColorRepresentation;
  opacity?: number;
  /** Screen-space line width in pixels. */
  width?: number;
  depthTest?: boolean;
  renderOrder?: number;
}

export interface Segment3DOptions {
  start: Vec3Tuple;
  end: Vec3Tuple;
  style?: Segment3DStyle;
  name?: string;
}

function clampOpacity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function assertFinitePoint(point: Vec3Tuple, label: string): void {
  if (!point.every(Number.isFinite)) {
    throw new RangeError(`${label} must contain three finite numbers.`);
  }
}

/**
 * Mutable plain 3D segment for proof diagrams.
 *
 * It deliberately mirrors Segment2D: continuous/dashed styles, persistent
 * LineGeometry, and setEndpoints() for stage-by-stage line drawing.
 */
export class Segment3D extends MathObject3D {
  private readonly geometry = new LineGeometry();
  private readonly material: LineMaterial;
  private readonly line: Line2;

  private startPoint: Vec3Tuple;
  private endPoint: Vec3Tuple;
  private readonly initialLength: number;
  private lastDirection: Vec3Tuple = [1, 0, 0];

  constructor({
    start,
    end,
    style = {},
    name = "segment-3d",
  }: Segment3DOptions) {
    super();

    assertFinitePoint(start, "start");
    assertFinitePoint(end, "end");

    this.name = name;
    this.startPoint = [start[0], start[1], start[2]];
    this.endPoint = [end[0], end[1], end[2]];
    this.initialLength = distance3D(start, end);

    if (this.initialLength > EPSILON) {
      this.lastDirection = lineDirection3D(start, end);
    }

    const dashed = style.dashed ?? false;

    this.material = new LineMaterial({
      color: style.color ?? COLORS.white,
      opacity: clampOpacity(style.opacity ?? 1),
      transparent: true,
      depthTest: style.depthTest ?? true,
      depthWrite: false,
      dashed,
      dashSize: Math.max(EPSILON, style.dashSize ?? 0.16),
      gapSize: Math.max(0, style.gapSize ?? 0.12),
      alphaToCoverage: false,
    });
    this.material.linewidth = Math.max(0, style.width ?? 2);

    this.line = new Line2(this.geometry, this.material);
    this.line.name = `${name}:line`;
    this.line.renderOrder = style.renderOrder ?? 2;

    this.add(this.line);
    this.updateGeometry();
  }

  getStart(): Vec3Tuple {
    return [...this.startPoint] as Vec3Tuple;
  }

  getEnd(): Vec3Tuple {
    return [...this.endPoint] as Vec3Tuple;
  }

  getLength(): number {
    return distance3D(this.startPoint, this.endPoint);
  }

  setEndpoints(start: Vec3Tuple, end: Vec3Tuple): this {
    assertFinitePoint(start, "start");
    assertFinitePoint(end, "end");

    this.startPoint = [start[0], start[1], start[2]];
    this.endPoint = [end[0], end[1], end[2]];

    if (distance3D(start, end) > EPSILON) {
      this.lastDirection = lineDirection3D(start, end);
    }

    this.updateGeometry();
    return this.changed();
  }

  setStart(start: Vec3Tuple): this {
    return this.setEndpoints(start, this.endPoint);
  }

  setEnd(end: Vec3Tuple): this {
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
  }: SegmentDashStyle3D): this {
    this.material.dashed = dashed;
    this.material.dashSize = Math.max(EPSILON, dashSize);
    this.material.gapSize = Math.max(0, gapSize);
    this.material.needsUpdate = true;
    this.line.computeLineDistances();
    return this.changed();
  }

  override moveTo(x: number, y: number, z: number): this {
    const displacement: Vec3Tuple = [
      this.endPoint[0] - this.startPoint[0],
      this.endPoint[1] - this.startPoint[1],
      this.endPoint[2] - this.startPoint[2],
    ];

    return this.setEndpoints(
      [x, y, z],
      [
        x + displacement[0],
        y + displacement[1],
        z + displacement[2],
      ],
    );
  }

  override moveBy(dx: number, dy: number, dz: number): this {
    return this.setEndpoints(
      [
        this.startPoint[0] + dx,
        this.startPoint[1] + dy,
        this.startPoint[2] + dz,
      ],
      [
        this.endPoint[0] + dx,
        this.endPoint[1] + dy,
        this.endPoint[2] + dz,
      ],
    );
  }

  override resizeTo(scale: number): this {
    const targetLength = Math.max(0, this.initialLength * scale);

    return this.setEnd([
      this.startPoint[0] + this.lastDirection[0] * targetLength,
      this.startPoint[1] + this.lastDirection[1] * targetLength,
      this.startPoint[2] + this.lastDirection[2] * targetLength,
    ]);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private updateGeometry(): void {
    this.geometry.setPositions([
      this.startPoint[0],
      this.startPoint[1],
      this.startPoint[2],
      this.endPoint[0],
      this.endPoint[1],
      this.endPoint[2],
    ]);

    this.line.computeLineDistances();
  }
}

export function createSegment3D(options: Segment3DOptions): Segment3D {
  return new Segment3D(options);
}
