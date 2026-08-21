import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  Uint32BufferAttribute,
  type ColorRepresentation,
} from "three";
import { COLORS } from "../core/colors";
import { MathObject3D } from "../core/MathObject3D";
import type { Vec3Tuple } from "../core/types3D";
import {
  cross3D,
  dot3D,
  normalize3D,
  subtract3D,
} from "../geometry/euclideanConstructions3D";

const PLANAR_TOLERANCE = 1e-7;

export interface Polygon3DStyle {
  fill?: ColorRepresentation;
  fillOpacity?: number;
  outline?: ColorRepresentation | null;
  outlineOpacity?: number;
  depthTest?: boolean;
  renderOrder?: number;
}

export interface Polygon3DOptions {
  /** Convex, coplanar polygon vertices in cyclic order. */
  vertices: readonly Vec3Tuple[];
  style?: Polygon3DStyle;
  name?: string;
}

function clampOpacity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function validatePlanarConvexInput(vertices: readonly Vec3Tuple[]): void {
  if (vertices.length < 3) {
    throw new RangeError("Polygon3D needs at least three vertices.");
  }

  const origin = vertices[0];
  const first = subtract3D(vertices[1], origin);
  const second = subtract3D(vertices[2], origin);
  const normal = normalize3D(
    cross3D(first, second),
    "polygon normal (first three vertices must not be collinear)",
  );

  for (let index = 3; index < vertices.length; index += 1) {
    const distanceFromPlane = Math.abs(
      dot3D(subtract3D(vertices[index], origin), normal),
    );

    if (distanceFromPlane > PLANAR_TOLERANCE) {
      throw new RangeError("Polygon3D vertices must be coplanar.");
    }
  }
}

/**
 * Small persistent convex planar polygon, intended primarily for proof
 * highlights such as triangles and quadrilateral faces.
 */
export class Polygon3D extends MathObject3D {
  private readonly vertexCount: number;
  private readonly fillPositions: Float32Array;
  private readonly outlinePositions: Float32Array;
  private readonly fillGeometry = new BufferGeometry();
  private readonly outlineGeometry = new BufferGeometry();
  private readonly fillPositionAttribute: BufferAttribute;
  private readonly outlinePositionAttribute: BufferAttribute;
  private readonly fillMaterial: MeshBasicMaterial;
  private readonly outlineMaterial: LineBasicMaterial;
  private readonly fillMesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly outlineLine: LineLoop<BufferGeometry, LineBasicMaterial>;

  private verticesValue: Vec3Tuple[];

  constructor({
    vertices,
    style = {},
    name = "polygon-3d",
  }: Polygon3DOptions) {
    super();

    validatePlanarConvexInput(vertices);

    this.name = name;
    this.vertexCount = vertices.length;
    this.verticesValue = vertices.map(
      ([x, y, z]) => [x, y, z] as Vec3Tuple,
    );

    this.fillPositions = new Float32Array(this.vertexCount * 3);
    this.outlinePositions = new Float32Array(this.vertexCount * 3);

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
    for (let index = 1; index < this.vertexCount - 1; index += 1) {
      indices.push(0, index, index + 1);
    }
    this.fillGeometry.setIndex(new Uint32BufferAttribute(indices, 1));

    const fillOpacity = clampOpacity(style.fillOpacity ?? 0.18);
    const outlineOpacity = clampOpacity(style.outlineOpacity ?? 0.7);

    this.fillMaterial = new MeshBasicMaterial({
      color: style.fill ?? COLORS.violet,
      opacity: fillOpacity,
      transparent: true,
      depthTest: style.depthTest ?? true,
      depthWrite: false,
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

    this.outlineMaterial = new LineBasicMaterial({
      color: style.outline ?? style.fill ?? COLORS.white,
      opacity: style.outline === null ? 0 : outlineOpacity,
      transparent: true,
      depthTest: style.depthTest ?? true,
      depthWrite: false,
    });

    this.fillMesh = new Mesh(this.fillGeometry, this.fillMaterial);
    this.fillMesh.name = `${name}:fill`;
    this.fillMesh.renderOrder = style.renderOrder ?? 0;

    this.outlineLine = new LineLoop(
      this.outlineGeometry,
      this.outlineMaterial,
    );
    this.outlineLine.name = `${name}:outline`;
    this.outlineLine.renderOrder = (style.renderOrder ?? 0) + 1;

    this.add(this.fillMesh, this.outlineLine);
    this.updateGeometry();
  }

  getVertices(): readonly Vec3Tuple[] {
    return this.verticesValue.map(
      ([x, y, z]) => [x, y, z] as Vec3Tuple,
    );
  }

  setVertices(vertices: readonly Vec3Tuple[]): this {
    if (vertices.length !== this.vertexCount) {
      throw new RangeError(
        "Polygon3D setVertices() must preserve the vertex count.",
      );
    }

    validatePlanarConvexInput(vertices);
    this.verticesValue = vertices.map(
      ([x, y, z]) => [x, y, z] as Vec3Tuple,
    );

    this.updateGeometry();
    return this.changed();
  }

  setFillColor(color: ColorRepresentation): this {
    this.fillMaterial.color.set(color);
    return this.changed();
  }

  setFillOpacity(opacity: number): this {
    this.fillMaterial.opacity = clampOpacity(opacity);
    this.fillMesh.visible = this.fillMaterial.opacity > 0;
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

    this.outlineLine.visible = this.outlineMaterial.opacity > 0;
    return this.changed();
  }

  setOutlineOpacity(opacity: number): this {
    this.outlineMaterial.opacity = clampOpacity(opacity);
    this.outlineLine.visible = this.outlineMaterial.opacity > 0;
    return this.changed();
  }

  dispose(): void {
    this.fillGeometry.dispose();
    this.outlineGeometry.dispose();
    this.fillMaterial.dispose();
    this.outlineMaterial.dispose();
  }

  private updateGeometry(): void {
    for (let index = 0; index < this.vertexCount; index += 1) {
      const [x, y, z] = this.verticesValue[index];
      const offset = index * 3;

      this.fillPositions[offset] = x;
      this.fillPositions[offset + 1] = y;
      this.fillPositions[offset + 2] = z;

      this.outlinePositions[offset] = x;
      this.outlinePositions[offset + 1] = y;
      this.outlinePositions[offset + 2] = z;
    }

    this.fillPositionAttribute.needsUpdate = true;
    this.outlinePositionAttribute.needsUpdate = true;
    this.fillGeometry.computeBoundingBox();
    this.fillGeometry.computeBoundingSphere();
    this.outlineGeometry.computeBoundingBox();
    this.outlineGeometry.computeBoundingSphere();
  }
}

export function createPolygon3D(options: Polygon3DOptions): Polygon3D {
  return new Polygon3D(options);
}
