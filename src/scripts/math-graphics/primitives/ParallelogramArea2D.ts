import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  type ColorRepresentation,
} from "three";
import { COLORS } from "../core/colors";
import { MathObject2D } from "../core/MathObject2D";
import type { Vec2Tuple } from "../core/types";

export interface ParallelogramArea2DOptions {
  origin: Vec2Tuple;
  u: Vec2Tuple;
  v: Vec2Tuple;
  color?: ColorRepresentation;
  opacity?: number;
  name?: string;
}

function clampOpacity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function assertFiniteVector(vector: Vec2Tuple, label: string): void {
  if (!Number.isFinite(vector[0]) || !Number.isFinite(vector[1])) {
    throw new RangeError(`${label} must contain two finite numbers.`);
  }
}

/**
 * The filled parallelogram spanned by two vectors with a common origin.
 * Its local vertices are 0, u, u + v, v.
 */
export class ParallelogramArea2D extends MathObject2D {
  private readonly positions = new Float32Array(12);
  private readonly positionAttribute: BufferAttribute;
  private readonly geometry: BufferGeometry;
  private readonly material: MeshBasicMaterial;
  private readonly mesh: Mesh<BufferGeometry, MeshBasicMaterial>;

  private originPoint: Vec2Tuple;
  private uVector: Vec2Tuple;
  private vVector: Vec2Tuple;

  constructor({
    origin,
    u,
    v,
    color = COLORS.violet,
    opacity = 0.22,
    name = "parallelogram-area-2d",
  }: ParallelogramArea2DOptions) {
    super();

    assertFiniteVector(origin, "origin");
    assertFiniteVector(u, "u");
    assertFiniteVector(v, "v");

    this.name = name;
    this.originPoint = [origin[0], origin[1]];
    this.uVector = [u[0], u[1]];
    this.vVector = [v[0], v[1]];

    this.geometry = new BufferGeometry();

    /*
     * BufferAttribute retains this exact Float32Array.
     * Therefore, modifying this.positions later updates the geometry's
     * underlying vertex data.
     */
    this.positionAttribute = new BufferAttribute(this.positions, 3);
    this.geometry.setAttribute("position", this.positionAttribute);
    this.geometry.setIndex([0, 1, 2, 0, 2, 3]);

    this.material = new MeshBasicMaterial({
      color,
      opacity: clampOpacity(opacity),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    });

    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = `${name}:fill`;
    this.mesh.renderOrder = 0;

    this.add(this.mesh);
    this.updateGeometryAndTransform();
  }

  getOrigin(): Vec2Tuple {
    return [this.originPoint[0], this.originPoint[1]];
  }

  getU(): Vec2Tuple {
    return [this.uVector[0], this.uVector[1]];
  }

  getV(): Vec2Tuple {
    return [this.vVector[0], this.vVector[1]];
  }

  setBasis(origin: Vec2Tuple, u: Vec2Tuple, v: Vec2Tuple): this {
    assertFiniteVector(origin, "origin");
    assertFiniteVector(u, "u");
    assertFiniteVector(v, "v");

    this.originPoint = [origin[0], origin[1]];
    this.uVector = [u[0], u[1]];
    this.vVector = [v[0], v[1]];

    this.updateGeometryAndTransform();
    return this.changed();
  }

  setFromEndpoints(
    origin: Vec2Tuple,
    uTip: Vec2Tuple,
    vTip: Vec2Tuple,
  ): this {
    return this.setBasis(
      origin,
      [uTip[0] - origin[0], uTip[1] - origin[1]],
      [vTip[0] - origin[0], vTip[1] - origin[1]],
    );
  }

  getSignedArea(): number {
    return (
      this.uVector[0] * this.vVector[1] -
      this.uVector[1] * this.vVector[0]
    );
  }

  getArea(): number {
    return Math.abs(this.getSignedArea());
  }

  setColor(color: ColorRepresentation): this {
    this.material.color.set(color);
    return this.changed();
  }

  setOpacity(opacity: number): this {
    this.material.opacity = clampOpacity(opacity);
    this.mesh.visible = this.material.opacity > 0;
    return this.changed();
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private updateGeometryAndTransform(): void {
    const [ux, uy] = this.uVector;
    const [vx, vy] = this.vVector;

    this.positions.set([
      0,       0,       0,
      ux,      uy,      0,
      ux + vx, uy + vy, 0,
      vx,      vy,      0,
    ]);

    this.positionAttribute.needsUpdate = true;

    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();

    this.position.set(this.originPoint[0], this.originPoint[1], 0);
    this.rotation.set(0, 0, 0);
    this.scale.set(1, 1, 1);

    this.mesh.visible = this.material.opacity > 0;
  }
}

export function createParallelogramArea2D(
  options: ParallelogramArea2DOptions,
): ParallelogramArea2D {
  return new ParallelogramArea2D(options);
}
