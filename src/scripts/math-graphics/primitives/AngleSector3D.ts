import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Uint32BufferAttribute,
  type ColorRepresentation,
} from "three";
import { COLORS } from "../core/colors";
import { MathObject3D } from "../core/MathObject3D";
import type { Vec3Tuple } from "../core/types3D";
import {
  add3D,
  angleBetweenRays3D,
  dot3D,
  normalize3D,
  scale3D,
  subtract3D,
} from "../geometry/euclideanConstructions3D";

const EPSILON = 1e-9;

export type AngleSectorShape3D = "sector" | "right-angle";

export interface AngleSector3DOptions {
  center: Vec3Tuple;
  firstArmPoint: Vec3Tuple;
  secondArmPoint: Vec3Tuple;
  radius?: number;
  segments?: number;
  shape?: AngleSectorShape3D;
  fill?: ColorRepresentation;
  fillOpacity?: number;
  outline?: ColorRepresentation | null;
  outlineOpacity?: number;
  depthTest?: boolean;
  renderOrder?: number;
  name?: string;
}

function clampOpacity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function writePoint(
  target: Float32Array,
  index: number,
  point: Vec3Tuple,
): void {
  const offset = index * 3;
  target[offset] = point[0];
  target[offset + 1] = point[1];
  target[offset + 2] = point[2];
}

/**
 * Circular or square angle highlight in the actual plane of two 3D rays.
 *
 * `shape: "right-angle"` gives the conventional square marker and expects the
 * supplied rays to be perpendicular.
 */
export class AngleSector3D extends MathObject3D {
  private readonly maximumSegments: number;
  private readonly fillPositions: Float32Array;
  private readonly outlinePositions: Float32Array;
  private readonly fillPositionAttribute: BufferAttribute;
  private readonly outlinePositionAttribute: BufferAttribute;
  private readonly fillGeometry = new BufferGeometry();
  private readonly outlineGeometry = new BufferGeometry();
  private readonly fillMaterial: MeshBasicMaterial;
  private readonly outlineMaterial: LineBasicMaterial;
  private readonly fillMesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly outlineLine: Line<BufferGeometry, LineBasicMaterial>;

  private centerValue: Vec3Tuple;
  private firstArmPointValue: Vec3Tuple;
  private secondArmPointValue: Vec3Tuple;
  private radiusValue: number;
  private shapeValue: AngleSectorShape3D;

  constructor({
    center,
    firstArmPoint,
    secondArmPoint,
    radius = 0.55,
    segments = 96,
    shape = "sector",
    fill = COLORS.violet,
    fillOpacity = 0.22,
    outline = null,
    outlineOpacity = 0.85,
    depthTest = true,
    renderOrder = 3,
    name = "angle-sector-3d",
  }: AngleSector3DOptions) {
    super();

    if (!(radius >= 0) || !Number.isFinite(radius)) {
      throw new RangeError("AngleSector3D radius must be finite and nonnegative.");
    }

    this.name = name;
    this.maximumSegments = Math.max(8, Math.floor(segments));
    this.centerValue = [...center] as Vec3Tuple;
    this.firstArmPointValue = [...firstArmPoint] as Vec3Tuple;
    this.secondArmPointValue = [...secondArmPoint] as Vec3Tuple;
    this.radiusValue = radius;
    this.shapeValue = shape;

    this.fillPositions = new Float32Array((this.maximumSegments + 2) * 3);
    this.outlinePositions = new Float32Array((this.maximumSegments + 3) * 3);

    this.fillPositionAttribute = new BufferAttribute(this.fillPositions, 3);
    this.outlinePositionAttribute = new BufferAttribute(
      this.outlinePositions,
      3,
    );

    this.fillGeometry.setAttribute("position", this.fillPositionAttribute);
    this.outlineGeometry.setAttribute(
      "position",
      this.outlinePositionAttribute,
    );

    const indices: number[] = [];
    for (let index = 0; index < this.maximumSegments; index += 1) {
      indices.push(0, index + 1, index + 2);
    }
    this.fillGeometry.setIndex(new Uint32BufferAttribute(indices, 1));

    this.fillMaterial = new MeshBasicMaterial({
      color: fill,
      opacity: clampOpacity(fillOpacity),
      transparent: true,
      depthTest,
      depthWrite: false,
      side: DoubleSide,
    });

    this.outlineMaterial = new LineBasicMaterial({
      color: outline ?? fill,
      opacity: outline === null ? 0 : clampOpacity(outlineOpacity),
      transparent: true,
      depthTest,
      depthWrite: false,
    });

    this.fillMesh = new Mesh(this.fillGeometry, this.fillMaterial);
    this.fillMesh.name = `${name}:fill`;
    this.fillMesh.renderOrder = renderOrder;

    this.outlineLine = new Line(
      this.outlineGeometry,
      this.outlineMaterial,
    );
    this.outlineLine.name = `${name}:outline`;
    this.outlineLine.renderOrder = renderOrder + 1;

    this.add(this.fillMesh, this.outlineLine);
    this.updateGeometry();
  }

  getCenter(): Vec3Tuple {
    return [...this.centerValue] as Vec3Tuple;
  }

  getRadius(): number {
    return this.radiusValue;
  }

  getAngle(): number {
    return angleBetweenRays3D(
      this.centerValue,
      this.firstArmPointValue,
      this.secondArmPointValue,
    );
  }

  getShape(): AngleSectorShape3D {
    return this.shapeValue;
  }

  setPoints(
    center: Vec3Tuple,
    firstArmPoint: Vec3Tuple,
    secondArmPoint: Vec3Tuple,
  ): this {
    this.centerValue = [...center] as Vec3Tuple;
    this.firstArmPointValue = [...firstArmPoint] as Vec3Tuple;
    this.secondArmPointValue = [...secondArmPoint] as Vec3Tuple;
    this.updateGeometry();
    return this.changed();
  }

  setRadius(radius: number): this {
    if (!(radius >= 0) || !Number.isFinite(radius)) {
      throw new RangeError("AngleSector3D radius must be finite and nonnegative.");
    }

    this.radiusValue = radius;
    this.updateGeometry();
    return this.changed();
  }

  setShape(shape: AngleSectorShape3D): this {
    this.shapeValue = shape;
    this.updateGeometry();
    return this.changed();
  }

  setFillColor(color: ColorRepresentation): this {
    this.fillMaterial.color.set(color);
    return this.changed();
  }

  setFillOpacity(opacity: number): this {
    this.fillMaterial.opacity = clampOpacity(opacity);
    this.refreshVisibility();
    return this.changed();
  }

  setOutlineColor(color: ColorRepresentation | null): this {
    if (color === null) {
      this.outlineMaterial.opacity = 0;
    } else {
      this.outlineMaterial.color.set(color);
      if (this.outlineMaterial.opacity === 0) {
        this.outlineMaterial.opacity = 1;
      }
    }

    this.refreshVisibility();
    return this.changed();
  }

  setOutlineOpacity(opacity: number): this {
    this.outlineMaterial.opacity = clampOpacity(opacity);
    this.refreshVisibility();
    return this.changed();
  }

  dispose(): void {
    this.fillGeometry.dispose();
    this.outlineGeometry.dispose();
    this.fillMaterial.dispose();
    this.outlineMaterial.dispose();
  }

  private rayBasis(): {
    first: Vec3Tuple;
    second: Vec3Tuple;
    tangent: Vec3Tuple;
    angle: number;
  } {
    const first = normalize3D(
      subtract3D(this.firstArmPointValue, this.centerValue),
      "first angle arm",
    );
    const second = normalize3D(
      subtract3D(this.secondArmPointValue, this.centerValue),
      "second angle arm",
    );

    const cosine = Math.min(1, Math.max(-1, dot3D(first, second)));
    const angle = Math.acos(cosine);

    const orthogonal = subtract3D(second, scale3D(first, cosine));
    const tangent = normalize3D(
      orthogonal,
      "angle plane direction (the two rays must not be collinear)",
    );

    return { first, second, tangent, angle };
  }

  private updateGeometry(): void {
    const basis = this.rayBasis();

    if (this.shapeValue === "right-angle") {
      this.updateRightAngleGeometry(basis.first, basis.second);
    } else {
      this.updateSectorGeometry(
        basis.first,
        basis.tangent,
        basis.angle,
      );
    }

    this.fillPositionAttribute.needsUpdate = true;
    this.outlinePositionAttribute.needsUpdate = true;
    this.fillGeometry.computeBoundingSphere();
    this.outlineGeometry.computeBoundingSphere();
    this.refreshVisibility();
  }

  private updateSectorGeometry(
    first: Vec3Tuple,
    tangent: Vec3Tuple,
    angle: number,
  ): void {
    const activeSegments = Math.max(
      1,
      Math.ceil((angle / Math.PI) * this.maximumSegments),
    );

    writePoint(this.fillPositions, 0, this.centerValue);
    writePoint(this.outlinePositions, 0, this.centerValue);

    for (let index = 0; index <= activeSegments; index += 1) {
      const fraction = index / activeSegments;
      const theta = angle * fraction;
      const direction = add3D(
        scale3D(first, Math.cos(theta)),
        scale3D(tangent, Math.sin(theta)),
      );
      const point = add3D(
        this.centerValue,
        scale3D(direction, this.radiusValue),
      );

      writePoint(this.fillPositions, index + 1, point);
      writePoint(this.outlinePositions, index + 1, point);
    }

    writePoint(
      this.outlinePositions,
      activeSegments + 2,
      this.centerValue,
    );

    this.fillGeometry.setDrawRange(0, activeSegments * 3);
    this.outlineGeometry.setDrawRange(0, activeSegments + 3);
  }

  private updateRightAngleGeometry(
    first: Vec3Tuple,
    second: Vec3Tuple,
  ): void {
    const r = this.radiusValue;

    const p0 = this.centerValue;
    const p1 = add3D(p0, scale3D(first, r));
    const p3 = add3D(p0, scale3D(second, r));
    const p2 = add3D(
      p0,
      scale3D(add3D(first, second), r),
    );

    const points = [p0, p1, p2, p3] as const;

    for (let index = 0; index < points.length; index += 1) {
      writePoint(this.fillPositions, index, points[index]);
      writePoint(this.outlinePositions, index, points[index]);
    }

    writePoint(this.outlinePositions, 4, p0);

    this.fillGeometry.setDrawRange(0, 6);
    this.outlineGeometry.setDrawRange(0, 5);
  }

  private refreshVisibility(): void {
    const visibleAngle = this.getAngle() > EPSILON;

    this.fillMesh.visible =
      visibleAngle &&
      this.radiusValue > 0 &&
      this.fillMaterial.opacity > 0;

    this.outlineLine.visible =
      visibleAngle &&
      this.radiusValue > 0 &&
      this.outlineMaterial.opacity > 0;
  }
}

export function createAngleSector3D(
  options: AngleSector3DOptions,
): AngleSector3D {
  return new AngleSector3D(options);
}
