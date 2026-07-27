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

export interface AngleSector2DOptions {
  center?: Vec2Tuple;
  startAngle?: number;
  endAngle?: number;
  direction?: AngleDirection2D;
  radius?: number;
  segments?: number;
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

/** A reusable filled angle sector, including reflex angles up to 360 degrees. */
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

  constructor({
    center = [0, 0],
    startAngle = 0,
    endAngle = Math.PI / 3,
    direction = "counterclockwise",
    radius = 0.65,
    segments = 128,
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

    this.fillPositions = new Float32Array((this.maximumSegments + 2) * 3);
    this.outlinePositions = new Float32Array((this.maximumSegments + 3) * 3);

    this.fillPositionAttribute = new BufferAttribute(this.fillPositions, 3);
    this.outlinePositionAttribute = new BufferAttribute(
      this.outlinePositions,
      3,
    );

    this.fillGeometry = new BufferGeometry();
    this.fillGeometry.setAttribute("position", this.fillPositionAttribute);

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

  /** A convenient point along the angular bisector for placing a label. */
  getLabelPosition(radiusFraction = 0.62): Vec2Tuple {
    const angle = this.startAngleValue + this.getSweepAngle() / 2;
    const distance = this.radiusValue * radiusFraction;

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

    this.fillPositionAttribute.needsUpdate = true;
    this.outlinePositionAttribute.needsUpdate = true;
    this.fillGeometry.setDrawRange(0, activeSegments * 3);
    this.outlineGeometry.setDrawRange(0, activeSegments + 3);
    this.fillGeometry.computeBoundingSphere();
    this.outlineGeometry.computeBoundingSphere();

    this.position.set(this.centerPoint[0], this.centerPoint[1], 0);
    this.rotation.set(0, 0, 0);
    this.scale.set(1, 1, 1);
    this.updateVisibility();
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
