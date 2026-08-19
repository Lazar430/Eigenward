import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  type ColorRepresentation,
} from "three";
import { COLORS } from "../core/colors";
import { MathObject2D } from "../core/MathObject2D";
import type { Vec2Tuple } from "../core/types";

const EPSILON = 1e-9;

export interface RightAngleMarker2DOptions {
  vertex: Vec2Tuple;
  firstArmPoint: Vec2Tuple;
  secondArmPoint: Vec2Tuple;
  size?: number;
  fill?: ColorRepresentation;
  fillOpacity?: number;
  outline?: ColorRepresentation | null;
  outlineOpacity?: number;
  name?: string;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalize(vector: Vec2Tuple, label: string): Vec2Tuple {
  const length = Math.hypot(vector[0], vector[1]);

  if (length <= EPSILON) {
    throw new RangeError(`${label} must be nonzero.`);
  }

  return [vector[0] / length, vector[1] / length];
}

/**
 * Conventional square marker for a right angle.
 *
 * The marker owns one persistent square mesh + outline. setGeometry() changes
 * only the existing buffer contents, and setReveal() grows the marker from the
 * vertex without replacing geometry.
 */
export class RightAngleMarker2D extends MathObject2D {
  private readonly fillPositions = new Float32Array(12);
  private readonly outlinePositions = new Float32Array(12);

  private readonly fillGeometry = new BufferGeometry();
  private readonly outlineGeometry = new BufferGeometry();

  private readonly fillMaterial: MeshBasicMaterial;
  private readonly outlineMaterial: LineBasicMaterial;

  private readonly fillMesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly outlineLine: LineLoop<BufferGeometry, LineBasicMaterial>;

  private vertexPoint: Vec2Tuple;
  private firstArmPointValue: Vec2Tuple;
  private secondArmPointValue: Vec2Tuple;
  private sizeValue: number;
  private revealValue = 1;

  constructor({
    vertex,
    firstArmPoint,
    secondArmPoint,
    size = 0.28,
    fill = COLORS.violet,
    fillOpacity = 0.18,
    outline = COLORS.white,
    outlineOpacity = 0.9,
    name = "right-angle-marker-2d",
  }: RightAngleMarker2DOptions) {
    super();

    if (!(size >= 0) || !Number.isFinite(size)) {
      throw new RangeError("Right-angle marker size must be finite and nonnegative.");
    }

    this.name = name;
    this.vertexPoint = [vertex[0], vertex[1]];
    this.firstArmPointValue = [firstArmPoint[0], firstArmPoint[1]];
    this.secondArmPointValue = [secondArmPoint[0], secondArmPoint[1]];
    this.sizeValue = size;

    this.fillGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(this.fillPositions, 3),
    );
    this.fillGeometry.setIndex([0, 1, 2, 0, 2, 3]);

    this.outlineGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(this.outlinePositions, 3),
    );

    this.fillMaterial = new MeshBasicMaterial({
      color: fill,
      opacity: clamp01(fillOpacity),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    });

    this.outlineMaterial = new LineBasicMaterial({
      color: outline ?? fill,
      opacity: outline === null ? 0 : clamp01(outlineOpacity),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this.fillMesh = new Mesh(this.fillGeometry, this.fillMaterial);
    this.fillMesh.name = `${name}:fill`;
    this.fillMesh.renderOrder = 3;

    this.outlineLine = new LineLoop(this.outlineGeometry, this.outlineMaterial);
    this.outlineLine.name = `${name}:outline`;
    this.outlineLine.renderOrder = 4;

    this.add(this.fillMesh, this.outlineLine);
    this.updateGeometry();
  }

  getVertex(): Vec2Tuple {
    return [this.vertexPoint[0], this.vertexPoint[1]];
  }

  getSize(): number {
    return this.sizeValue;
  }

  getReveal(): number {
    return this.revealValue;
  }

  setGeometry(
    vertex: Vec2Tuple,
    firstArmPoint: Vec2Tuple,
    secondArmPoint: Vec2Tuple,
  ): this {
    this.vertexPoint = [vertex[0], vertex[1]];
    this.firstArmPointValue = [firstArmPoint[0], firstArmPoint[1]];
    this.secondArmPointValue = [secondArmPoint[0], secondArmPoint[1]];
    this.updateGeometry();
    return this.changed();
  }

  setSize(size: number): this {
    if (!(size >= 0) || !Number.isFinite(size)) {
      throw new RangeError("Right-angle marker size must be finite and nonnegative.");
    }

    this.sizeValue = size;
    this.updateGeometry();
    return this.changed();
  }

  setReveal(progress: number): this {
    this.revealValue = clamp01(progress);
    this.updateGeometry();
    return this.changed();
  }

  setFillOpacity(opacity: number): this {
    this.fillMaterial.opacity = clamp01(opacity);
    return this.changed();
  }

  setOutlineOpacity(opacity: number): this {
    this.outlineMaterial.opacity = clamp01(opacity);
    return this.changed();
  }

  dispose(): void {
    this.fillGeometry.dispose();
    this.outlineGeometry.dispose();
    this.fillMaterial.dispose();
    this.outlineMaterial.dispose();
  }

  private updateGeometry(): void {
    const first = normalize(
      [
        this.firstArmPointValue[0] - this.vertexPoint[0],
        this.firstArmPointValue[1] - this.vertexPoint[1],
      ],
      "first right-angle arm",
    );
    const second = normalize(
      [
        this.secondArmPointValue[0] - this.vertexPoint[0],
        this.secondArmPointValue[1] - this.vertexPoint[1],
      ],
      "second right-angle arm",
    );

    const size = this.sizeValue * this.revealValue;

    const points: Vec2Tuple[] = [
      this.vertexPoint,
      [
        this.vertexPoint[0] + first[0] * size,
        this.vertexPoint[1] + first[1] * size,
      ],
      [
        this.vertexPoint[0] + (first[0] + second[0]) * size,
        this.vertexPoint[1] + (first[1] + second[1]) * size,
      ],
      [
        this.vertexPoint[0] + second[0] * size,
        this.vertexPoint[1] + second[1] * size,
      ],
    ];

    for (let index = 0; index < 4; index += 1) {
      const [x, y] = points[index];
      const offset = index * 3;

      this.fillPositions[offset] = x;
      this.fillPositions[offset + 1] = y;
      this.fillPositions[offset + 2] = 0.03;

      this.outlinePositions[offset] = x;
      this.outlinePositions[offset + 1] = y;
      this.outlinePositions[offset + 2] = 0.035;
    }

    const fillAttribute = this.fillGeometry.getAttribute("position");
    const outlineAttribute = this.outlineGeometry.getAttribute("position");
    fillAttribute.needsUpdate = true;
    outlineAttribute.needsUpdate = true;

    this.fillGeometry.computeBoundingSphere();
    this.outlineGeometry.computeBoundingSphere();
  }
}

export function createRightAngleMarker2D(
  options: RightAngleMarker2DOptions,
): RightAngleMarker2D {
  return new RightAngleMarker2D(options);
}
