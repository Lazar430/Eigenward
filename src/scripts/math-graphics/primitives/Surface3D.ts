import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Uint32BufferAttribute,
  type ColorRepresentation,
} from "three";
import { COLORS } from "../core/colors";
import { MathObject3D } from "../core/MathObject3D";
import type { SurfaceGeometryData3D } from "../core/types3D";

export interface Surface3DStyle {
  color?: ColorRepresentation;
  opacity?: number;
  roughness?: number;
  metalness?: number;
  emissive?: ColorRepresentation;
  emissiveIntensity?: number;
  flatShading?: boolean;
  wireframe?: boolean;
  wireframeColor?: ColorRepresentation;
  wireframeOpacity?: number;
}

export interface Surface3DOptions {
  geometry: SurfaceGeometryData3D;
  style?: Surface3DStyle;
  name?: string;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function clampOpacity(value: number): number {
  return clamp(value, 0, 1);
}

/**
 * General lit 3D mathematical surface backed by one persistent BufferGeometry.
 *
 * The filled surface and optional wireframe share the same geometry, so later
 * deformation code can update a single position buffer without rebuilding a
 * second edge mesh.
 */
export class Surface3D extends MathObject3D {
  protected readonly geometry: BufferGeometry;
  protected readonly positionAttribute: BufferAttribute;

  private readonly material: MeshStandardMaterial;
  private readonly wireframeMaterial: MeshBasicMaterial;
  private readonly surfaceMesh: Mesh<BufferGeometry, MeshStandardMaterial>;
  private readonly wireframeMesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  private wireframeEnabled: boolean;

  constructor({
    geometry,
    style = {},
    name = "surface-3d",
  }: Surface3DOptions) {
    super();

    if (geometry.positions.length !== geometry.vertexCount * 3) {
      throw new RangeError("Surface position-buffer length is inconsistent.");
    }
    if (geometry.uvs.length !== geometry.vertexCount * 2) {
      throw new RangeError("Surface UV-buffer length is inconsistent.");
    }
    if (geometry.indices.length !== geometry.triangleCount * 3) {
      throw new RangeError("Surface index-buffer length is inconsistent.");
    }

    this.name = name;
    this.geometry = new BufferGeometry();
    this.positionAttribute = new BufferAttribute(
      new Float32Array(geometry.positions),
      3,
    );

    this.geometry.setAttribute("position", this.positionAttribute);
    this.geometry.setAttribute(
      "uv",
      new BufferAttribute(new Float32Array(geometry.uvs), 2),
    );
    this.geometry.setIndex(new Uint32BufferAttribute(geometry.indices, 1));
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();

    const opacity = clampOpacity(style.opacity ?? 1);

    this.material = new MeshStandardMaterial({
      color: style.color ?? COLORS.cyan,
      opacity,
      transparent: opacity < 1,
      depthWrite: opacity >= 1,
      roughness: clamp(style.roughness ?? 0.36, 0, 1),
      metalness: clamp(style.metalness ?? 0.05, 0, 1),
      emissive: style.emissive ?? 0x000000,
      emissiveIntensity: Math.max(0, style.emissiveIntensity ?? 0),
      flatShading: style.flatShading ?? false,
      side: DoubleSide,
    });

    this.wireframeEnabled = style.wireframe ?? false;
    this.wireframeMaterial = new MeshBasicMaterial({
      color: style.wireframeColor ?? COLORS.white,
      opacity: clampOpacity(style.wireframeOpacity ?? 0.28),
      transparent: true,
      depthTest: true,
      depthWrite: false,
      wireframe: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.surfaceMesh = new Mesh(this.geometry, this.material);
    this.surfaceMesh.name = `${name}:surface`;
    this.surfaceMesh.renderOrder = 0;

    this.wireframeMesh = new Mesh(this.geometry, this.wireframeMaterial);
    this.wireframeMesh.name = `${name}:wireframe`;
    this.wireframeMesh.renderOrder = 1;

    this.add(this.surfaceMesh, this.wireframeMesh);
    this.refreshVisibility();
  }

  getGeometry(): BufferGeometry {
    return this.geometry;
  }

  getSurfaceMesh(): Mesh<BufferGeometry, MeshStandardMaterial> {
    return this.surfaceMesh;
  }

  getWireframeMesh(): Mesh<BufferGeometry, MeshBasicMaterial> {
    return this.wireframeMesh;
  }

  getVertexCount(): number {
    return this.positionAttribute.count;
  }

  /** Return a defensive copy of the current xyz vertex buffer. */
  getVertexPositions(): Float32Array {
    return new Float32Array(this.positionAttribute.array as Float32Array);
  }

  setColor(color: ColorRepresentation): this {
    this.material.color.set(color);
    return this.changed();
  }

  setOpacity(opacity: number): this {
    const resolved = clampOpacity(opacity);
    this.material.opacity = resolved;
    this.material.transparent = resolved < 1;
    this.material.depthWrite = resolved >= 1;
    this.material.needsUpdate = true;
    this.refreshVisibility();
    return this.changed();
  }

  setRoughness(roughness: number): this {
    this.material.roughness = clamp(roughness, 0, 1);
    return this.changed();
  }

  setMetalness(metalness: number): this {
    this.material.metalness = clamp(metalness, 0, 1);
    return this.changed();
  }

  setEmissive(
    color: ColorRepresentation,
    intensity = this.material.emissiveIntensity,
  ): this {
    this.material.emissive.set(color);
    this.material.emissiveIntensity = Math.max(0, intensity);
    return this.changed();
  }

  setFlatShading(flatShading: boolean): this {
    this.material.flatShading = flatShading;
    this.material.needsUpdate = true;
    return this.changed();
  }

  setWireframeVisible(visible: boolean): this {
    this.wireframeEnabled = visible;
    this.refreshVisibility();
    return this.changed();
  }

  setWireframeColor(color: ColorRepresentation): this {
    this.wireframeMaterial.color.set(color);
    return this.changed();
  }

  setWireframeOpacity(opacity: number): this {
    this.wireframeMaterial.opacity = clampOpacity(opacity);
    this.refreshVisibility();
    return this.changed();
  }

  /**
   * Protected position-buffer update hook for subclasses such as Batch 3's
   * MorphableSurface3D. Topology and GPU objects remain unchanged.
   */
  protected setVertexPositionsInternal(
    positions: ArrayLike<number>,
    recomputeNormals = true,
  ): this {
    if (positions.length !== this.positionAttribute.array.length) {
      throw new RangeError(
        "Updated surface positions must preserve the existing vertex count.",
      );
    }

    const target = this.positionAttribute.array as Float32Array;

    for (let index = 0; index < target.length; index += 1) {
      const value = Number(positions[index]);
      if (!Number.isFinite(value)) {
        throw new RangeError("Updated surface positions must all be finite.");
      }
      target[index] = value;
    }

    this.positionAttribute.needsUpdate = true;

    if (recomputeNormals) {
      this.geometry.computeVertexNormals();
      const normal = this.geometry.getAttribute("normal");
      if (normal) normal.needsUpdate = true;
    }

    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
    return this.changed();
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.wireframeMaterial.dispose();
  }

  private refreshVisibility(): void {
    this.surfaceMesh.visible = this.material.opacity > 0;
    this.wireframeMesh.visible =
      this.wireframeEnabled && this.wireframeMaterial.opacity > 0;
  }
}

export function createSurface3D(options: Surface3DOptions): Surface3D {
  return new Surface3D(options);
}
