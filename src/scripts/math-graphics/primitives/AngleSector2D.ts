import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  type ColorRepresentation,
} from "three";
import { COLORS } from "../core/colors";
import { MathObject2D } from "../core/MathObject2D";
import type { Vec2Tuple } from "../core/types";

const TAU = Math.PI * 2;
const EPSILON = 1e-8;

export type AngleDirection2D = "counterclockwise" | "clockwise";
export type AngleSectorShape2D = "sector" | "right-angle";

export interface AngleSector2DOptions {
  center?: Vec2Tuple;
  startAngle?: number;
  endAngle?: number;
  direction?: AngleDirection2D;
  radius?: number;
  segments?: number;
  /**
   * "sector" draws the ordinary circular sector.
   * "right-angle" draws the conventional square marker between the two rays.
   *
   * The right-angle representation assumes the supplied rays are perpendicular.
   */
  shape?: AngleSectorShape2D;
  fill?: ColorRepresentation;
  fillOpacity?: number;
  outline?: ColorRepresentation | null;
  outlineOpacity?: number;
  name?: string;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

/**
 * Reusable angle highlight.
 *
 * By default this is a circular sector, including reflex angles up to 360°.
 * For perpendicular constructions, `shape: "right-angle"` uses the same
 * primitive to draw the customary square marker instead of an arc.
 */
export class AngleSector2D extends MathObject2D {
  private readonly maximumSegments: number;
  private readonly fillPositions: Float32Array;
  private readonly outlinePositions: Float32Array;
  private readonly fillPositionAttribute: BufferAttribute;
  private readonly outlinePositionAttribute: BufferAttribute;
  private readonly fillGeometry: BufferGeometry;
  private readonly outlineGeometry: BufferGeometry;
  private readonly fillMaterial: MeshBasicMaterial;
  private readonly outlineMaterial: LineBasicMaterial;
  private readonly fillMesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly outlineLine: Line<BufferGeometry, LineBasicMaterial>;

  private centerPoint: Vec2Tuple;
  private startAngleValue: number;
  private endAngleValue: number;
  private directionValue: AngleDirection2D;
  private radiusValue: number;
  private shapeValue: AngleSectorShape2D;

  constructor({
    center = [0, 0],
    startAngle = 0,
    endAngle = Math.PI / 3,
    direction = "counterclockwise",
    radius = 0.65,
    segments = 128,
    shape = "sector",
    fill = COLORS.violet,
    fillOpacity = 0.22,
    outline = null,
    outlineOpacity = 0.85,
    name = "angle-sector-2d",
  }: AngleSector2DOptions = {}) {
    super();

    if (!(radius >= 0) || !Number.isFinite(radius)) {
      throw new RangeError("Angle-sector radius must be finite and nonnegative.");
    }

    this.name = name;
    this.maximumSegments = Math.max(8, Math.floor(segments));
    this.centerPoint = [center[0], center[1]];
    this.startAngleValue = startAngle;
    this.endAngleValue = endAngle;
    this.directionValue = direction;
    this.radiusValue = radius;
    this.shapeValue = shape;

    this.fillPositions = new Float32Array((this.maximumSegments + 2) * 3);
    this.outlinePositions = new Float32Array((this.maximumSegments + 3) * 3);

    this.fillPositionAttribute = new BufferAttribute(this.fillPositions, 3);
    this.outlinePositionAttribute = new BufferAttribute(
      this.outlinePositions,
      3,
    );

    this.fillGeometry = new BufferGeometry();
    this.fillGeometry.setAttribute("position", this.fillPositionAttribute);

    /*
     * Triangle-fan indices work for both modes:
     *   sector:      center + sampled arc
     *   right-angle: center, arm-1, square corner, arm-2
     *
     * In right-angle mode only the first two triangles are drawn.
     */
    const indices: number[] = [];
    for (let index = 0; index < this.maximumSegments; index += 1) {
      indices.push(0, index + 1, index + 2);
    }
    this.fillGeometry.setIndex(indices);

    this.outlineGeometry = new BufferGeometry();
    this.outlineGeometry.setAttribute(
      "position",
      this.outlinePositionAttribute,
    );

    this.fillMaterial = new MeshBasicMaterial({
      color: fill,
      opacity: clamp(fillOpacity, 0, 1),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    });

    this.outlineMaterial = new LineBasicMaterial({
      color: outline ?? fill,
      opacity: outline === null ? 0 : clamp(outlineOpacity, 0, 1),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this.fillMesh = new Mesh(this.fillGeometry, this.fillMaterial);
    this.fillMesh.name = `${name}:fill`;
    this.fillMesh.renderOrder = 0;

    this.outlineLine = new Line(this.outlineGeometry, this.outlineMaterial);
    this.outlineLine.name = `${name}:outline`;
    this.outlineLine.renderOrder = 1;

    this.add(this.fillMesh, this.outlineLine);
    this.updateGeometryAndTransform();
  }

  getStartAngle(): number {
    return this.startAngleValue;
  }

  getEndAngle(): number {
    return this.endAngleValue;
  }

  getSweepAngle(): number {
    const raw = this.endAngleValue - this.startAngleValue;

    return this.directionValue === "counterclockwise"
      ? positiveModulo(raw, TAU)
      : -positiveModulo(-raw, TAU);
  }

  getRadius(): number {
    return this.radiusValue;
  }

  getCenter(): Vec2Tuple {
    return [this.centerPoint[0], this.centerPoint[1]];
  }

  getShape(): AngleSectorShape2D {
    return this.shapeValue;
  }

  /** A convenient point along the angular bisector for placing a label. */
  getLabelPosition(radiusFraction = 0.62): Vec2Tuple {
    const angle = this.startAngleValue + this.getSweepAngle() / 2;
    const distance =
      this.shapeValue === "right-angle"
        ? this.radiusValue * Math.SQRT2 * radiusFraction
        : this.radiusValue * radiusFraction;

    return [
      this.centerPoint[0] + distance * Math.cos(angle),
      this.centerPoint[1] + distance * Math.sin(angle),
    ];
  }

  setAngles(startAngle: number, endAngle: number): this {
    if (!Number.isFinite(startAngle) || !Number.isFinite(endAngle)) {
      throw new RangeError("Angle-sector angles must be finite.");
    }

    this.startAngleValue = startAngle;
    this.endAngleValue = endAngle;
    this.updateGeometryAndTransform();
    return this.changed();
  }

  setDirection(direction: AngleDirection2D): this {
    this.directionValue = direction;
    this.updateGeometryAndTransform();
    return this.changed();
  }

  setCenter(center: Vec2Tuple): this {
    this.centerPoint = [center[0], center[1]];
    this.updateGeometryAndTransform();
    return this.changed();
  }

  setRadius(radius: number): this {
    if (!(radius >= 0) || !Number.isFinite(radius)) {
      throw new RangeError("Angle-sector radius must be finite and nonnegative.");
    }

    this.radiusValue = radius;
    this.updateGeometryAndTransform();
    return this.changed();
  }

  setShape(shape: AngleSectorShape2D): this {
    this.shapeValue = shape;
    this.updateGeometryAndTransform();
    return this.changed();
  }

  setFillColor(color: ColorRepresentation): this {
    this.fillMaterial.color.set(color);
    return this.changed();
  }

  setFillOpacity(opacity: number): this {
    this.fillMaterial.opacity = clamp(opacity, 0, 1);
    this.updateVisibility();
    return this.changed();
  }

  setOutlineColor(color: ColorRepresentation | null): this {
    if (color === null) {
      this.outlineMaterial.opacity = 0;
    } else {
      this.outlineMaterial.color.set(color);
      if (this.outlineMaterial.opacity === 0) this.outlineMaterial.opacity = 1;
    }

    this.updateVisibility();
    return this.changed();
  }

  override moveTo(x: number, y: number): this {
    return this.setCenter([x, y]);
  }

  override moveBy(dx: number, dy: number): this {
    return this.setCenter([
      this.centerPoint[0] + dx,
      this.centerPoint[1] + dy,
    ]);
  }

  dispose(): void {
    this.fillGeometry.dispose();
    this.outlineGeometry.dispose();
    this.fillMaterial.dispose();
    this.outlineMaterial.dispose();
  }

  private updateGeometryAndTransform(): void {
    if (this.shapeValue === "right-angle") {
      this.updateRightAngleGeometry();
    } else {
      this.updateSectorGeometry();
    }

    this.fillPositionAttribute.needsUpdate = true;
    this.outlinePositionAttribute.needsUpdate = true;
    this.fillGeometry.computeBoundingSphere();
    this.outlineGeometry.computeBoundingSphere();

    this.position.set(this.centerPoint[0], this.centerPoint[1], 0);
    this.rotation.set(0, 0, 0);
    this.scale.set(1, 1, 1);
    this.updateVisibility();
  }

  private updateSectorGeometry(): void {
    const sweep = this.getSweepAngle();
    const absoluteSweep = Math.abs(sweep);
    const activeSegments = Math.max(
      1,
      Math.ceil((absoluteSweep / TAU) * this.maximumSegments),
    );

    this.fillPositions[0] = 0;
    this.fillPositions[1] = 0;
    this.fillPositions[2] = 0.005;

    for (let index = 0; index <= activeSegments; index += 1) {
      const fraction = index / activeSegments;
      const angle = this.startAngleValue + sweep * fraction;
      const offset = (index + 1) * 3;

      this.fillPositions[offset] = this.radiusValue * Math.cos(angle);
      this.fillPositions[offset + 1] = this.radiusValue * Math.sin(angle);
      this.fillPositions[offset + 2] = 0.005;
    }

    // Closed outline path: center -> start -> arc -> center.
    this.outlinePositions[0] = 0;
    this.outlinePositions[1] = 0;
    this.outlinePositions[2] = 0.01;

    for (let index = 0; index <= activeSegments; index += 1) {
      const fraction = index / activeSegments;
      const angle = this.startAngleValue + sweep * fraction;
      const offset = (index + 1) * 3;

      this.outlinePositions[offset] = this.radiusValue * Math.cos(angle);
      this.outlinePositions[offset + 1] = this.radiusValue * Math.sin(angle);
      this.outlinePositions[offset + 2] = 0.01;
    }

    const finalOffset = (activeSegments + 2) * 3;
    this.outlinePositions[finalOffset] = 0;
    this.outlinePositions[finalOffset + 1] = 0;
    this.outlinePositions[finalOffset + 2] = 0.01;

    this.fillGeometry.setDrawRange(0, activeSegments * 3);
    this.outlineGeometry.setDrawRange(0, activeSegments + 3);
  }

  private updateRightAngleGeometry(): void {
    /*
     * Local square:
     *
     *       p2
     *       +------ p3
     *       |       /
     *       |      /
     *       p1    /
     *        \   /
     *         center
     *
     * More precisely:
     *   p1 = r * first unit ray
     *   p3 = r * second unit ray
     *   p2 = p1 + p3
     *
     * When the two rays are perpendicular this is exactly a square corner.
     */
    const first: Vec2Tuple = [
      Math.cos(this.startAngleValue),
      Math.sin(this.startAngleValue),
    ];
    const second: Vec2Tuple = [
      Math.cos(this.endAngleValue),
      Math.sin(this.endAngleValue),
    ];

    const r = this.radiusValue;

    const points: readonly Vec2Tuple[] = [
      [0, 0],
      [r * first[0], r * first[1]],
      [
        r * (first[0] + second[0]),
        r * (first[1] + second[1]),
      ],
      [r * second[0], r * second[1]],
    ];

    for (let index = 0; index < points.length; index += 1) {
      const [x, y] = points[index];
      const offset = index * 3;

      this.fillPositions[offset] = x;
      this.fillPositions[offset + 1] = y;
      this.fillPositions[offset + 2] = 0.005;

      this.outlinePositions[offset] = x;
      this.outlinePositions[offset + 1] = y;
      this.outlinePositions[offset + 2] = 0.01;
    }

    // Close the ordinary Line outline by returning to the center.
    this.outlinePositions[12] = 0;
    this.outlinePositions[13] = 0;
    this.outlinePositions[14] = 0.01;

    // Two triangles: (0,1,2) and (0,2,3).
    this.fillGeometry.setDrawRange(0, 6);
    // center -> p1 -> corner -> p3 -> center
    this.outlineGeometry.setDrawRange(0, 5);
  }

  private updateVisibility(): void {
    const visibleAngle = Math.abs(this.getSweepAngle()) > EPSILON;
    this.fillMesh.visible =
      visibleAngle && this.radiusValue > 0 && this.fillMaterial.opacity > 0;
    this.outlineLine.visible =
      visibleAngle && this.radiusValue > 0 && this.outlineMaterial.opacity > 0;
  }
}

export function createAngleSector2D(
  options?: AngleSector2DOptions,
): AngleSector2D {
  return new AngleSector2D(options);
}
