import {
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  type ColorRepresentation,
} from "three";
import { COLORS } from "../core/colors";
import { MathObject3D } from "../core/MathObject3D";
import type { Vec3Tuple } from "../core/types3D";

export interface PointMarker3DOptions {
  position?: Vec3Tuple;
  radius?: number;
  color?: ColorRepresentation;
  opacity?: number;
  widthSegments?: number;
  heightSegments?: number;
  depthTest?: boolean;
  renderOrder?: number;
  name?: string;
}

function clampOpacity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Lightweight unlit 3D point marker for synthetic-geometry diagrams.
 *
 * This is intentionally cheaper and semantically clearer than using the
 * high-resolution parametric Sphere3D primitive for every named point.
 */
export class PointMarker3D extends MathObject3D {
  private readonly geometry: SphereGeometry;
  private readonly material: MeshBasicMaterial;
  private readonly mesh: Mesh<SphereGeometry, MeshBasicMaterial>;
  private radiusValue: number;

  constructor({
    position = [0, 0, 0],
    radius = 0.085,
    color = COLORS.cyan,
    opacity = 1,
    widthSegments = 18,
    heightSegments = 12,
    depthTest = true,
    renderOrder = 4,
    name = "point-marker-3d",
  }: PointMarker3DOptions = {}) {
    super();

    if (!(radius >= 0) || !Number.isFinite(radius)) {
      throw new RangeError("Point-marker radius must be finite and nonnegative.");
    }

    this.name = name;
    this.radiusValue = radius;

    this.geometry = new SphereGeometry(
      1,
      Math.max(8, Math.floor(widthSegments)),
      Math.max(6, Math.floor(heightSegments)),
    );

    this.material = new MeshBasicMaterial({
      color,
      opacity: clampOpacity(opacity),
      transparent: opacity < 1,
      depthTest,
      depthWrite: false,
    });

    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = `${name}:mesh`;
    this.mesh.renderOrder = renderOrder;

    this.add(this.mesh);
    this.position.set(...position);
    this.scale.setScalar(radius);
  }

  getPoint(): Vec3Tuple {
    return [this.position.x, this.position.y, this.position.z];
  }

  getRadius(): number {
    return this.radiusValue;
  }

  setPoint(position: Vec3Tuple): this {
    return this.moveTo(position[0], position[1], position[2]);
  }

  setRadius(radius: number): this {
    if (!(radius >= 0) || !Number.isFinite(radius)) {
      throw new RangeError("Point-marker radius must be finite and nonnegative.");
    }

    this.radiusValue = radius;
    this.scale.setScalar(radius);
    return this.changed();
  }

  setColor(color: ColorRepresentation): this {
    this.material.color.set(color);
    return this.changed();
  }

  setOpacity(opacity: number): this {
    const resolved = clampOpacity(opacity);
    this.material.opacity = resolved;
    this.material.transparent = resolved < 1;
    this.material.visible = resolved > 0;
    this.material.needsUpdate = true;
    return this.changed();
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export function createPointMarker3D(
  options?: PointMarker3DOptions,
): PointMarker3D {
  return new PointMarker3D(options);
}
