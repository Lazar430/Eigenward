import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Uint32BufferAttribute,
  type ColorRepresentation,
} from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { COLORS } from "../core/colors";
import { MathObject3D } from "../core/MathObject3D";
import type { Vec3Tuple } from "../core/types3D";
import {
  add3D,
  distance3D,
  dot3D,
  normalize3D,
  scale3D,
  subtract3D,
} from "../geometry/euclideanConstructions3D";
import { sphericalAngleRadians3D } from "../geometry/sphericalConstructions3D";

const EPSILON = 1e-10;

export interface SphericalAngleSector3DOptions {
  sphereCenter: Vec3Tuple;
  sphereRadius?: number;
  vertex: Vec3Tuple;
  firstArmPoint: Vec3Tuple;
  secondArmPoint: Vec3Tuple;
  /** Intrinsic radius on the sphere, measured as a central angle in radians. */
  geodesicRadiusRadians?: number;
  radialSegments?: number;
  angularSegments?: number;
  surfaceOffset?: number;
  fill?: ColorRepresentation;
  fillOpacity?: number;
  outline?: ColorRepresentation | null;
  outlineOpacity?: number;
  outlineWidth?: number;
  depthTest?: boolean;
  renderOrder?: number;
  name?: string;
}

function clampOpacity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function writePoint(target: Float32Array, index: number, point: Vec3Tuple): void {
  const offset = index * 3;
  target[offset] = point[0];
  target[offset + 1] = point[1];
  target[offset + 2] = point[2];
}

function flattenPoints(points: readonly Vec3Tuple[]): number[] {
  const values: number[] = [];
  for (const [x, y, z] of points) values.push(x, y, z);
  return values;
}

/**
 * Intrinsic spherical angle highlight.
 *
 * This is deliberately NOT a flat tangent-plane sector. Every mesh vertex lies
 * on a sphere concentric with the source sphere (with a tiny optional outward
 * offset to prevent z-fighting). The two side boundaries are geodesic arcs and
 * the outer boundary is a small geodesic circle centered at the angle vertex.
 */
export class SphericalAngleSector3D extends MathObject3D {
  private readonly radialSegments: number;
  private readonly angularSegments: number;
  private readonly sphereCenter: Vec3Tuple;
  private readonly sphereRadius: number;
  private readonly vertex: Vec3Tuple;
  private readonly firstArmPoint: Vec3Tuple;
  private readonly secondArmPoint: Vec3Tuple;
  private readonly surfaceOffset: number;
  private geodesicRadiusRadiansValue: number;

  private readonly geometry = new BufferGeometry();
  private readonly positions: Float32Array;
  private readonly positionAttribute: BufferAttribute;
  private readonly material: MeshBasicMaterial;
  private readonly mesh: Mesh<BufferGeometry, MeshBasicMaterial>;

  private readonly outlineGeometry = new LineGeometry();
  private readonly outlineMaterial: LineMaterial;
  private readonly outlineLine: Line2;

  constructor({
    sphereCenter,
    sphereRadius,
    vertex,
    firstArmPoint,
    secondArmPoint,
    geodesicRadiusRadians = 0.18,
    radialSegments = 14,
    angularSegments = 48,
    surfaceOffset = 0.012,
    fill = COLORS.violet,
    fillOpacity = 0.24,
    outline = null,
    outlineOpacity = 0.9,
    outlineWidth = 1.7,
    depthTest = true,
    renderOrder = 4,
    name = "spherical-angle-sector-3d",
  }: SphericalAngleSector3DOptions) {
    super();

    this.name = name;
    this.sphereCenter = [...sphereCenter] as Vec3Tuple;
    this.sphereRadius = sphereRadius ?? distance3D(vertex, sphereCenter);
    this.vertex = [...vertex] as Vec3Tuple;
    this.firstArmPoint = [...firstArmPoint] as Vec3Tuple;
    this.secondArmPoint = [...secondArmPoint] as Vec3Tuple;
    this.radialSegments = Math.max(2, Math.floor(radialSegments));
    this.angularSegments = Math.max(6, Math.floor(angularSegments));
    this.surfaceOffset = Math.max(0, surfaceOffset);
    this.geodesicRadiusRadiansValue = Math.max(0, geodesicRadiusRadians);

    if (!(this.sphereRadius > 0) || !Number.isFinite(this.sphereRadius)) {
      throw new RangeError("Spherical angle sphereRadius must be positive and finite.");
    }

    const vertexCount = (this.radialSegments + 1) * (this.angularSegments + 1);
    this.positions = new Float32Array(vertexCount * 3);
    this.positionAttribute = new BufferAttribute(this.positions, 3);
    this.geometry.setAttribute("position", this.positionAttribute);

    const indices: number[] = [];
    const rowLength = this.angularSegments + 1;
    for (let radial = 0; radial < this.radialSegments; radial += 1) {
      for (let angular = 0; angular < this.angularSegments; angular += 1) {
        const a = radial * rowLength + angular;
        const b = a + 1;
        const c = a + rowLength;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    this.geometry.setIndex(new Uint32BufferAttribute(indices, 1));

    this.material = new MeshBasicMaterial({
      color: fill,
      opacity: clampOpacity(fillOpacity),
      transparent: true,
      depthTest,
      depthWrite: false,
      side: DoubleSide,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = `${name}:surface-patch`;
    this.mesh.renderOrder = renderOrder;

    this.outlineMaterial = new LineMaterial({
      color: outline ?? fill,
      opacity: outline === null ? 0 : clampOpacity(outlineOpacity),
      transparent: true,
      depthTest,
      depthWrite: false,
      dashed: false,
      alphaToCoverage: false,
    });
    this.outlineMaterial.linewidth = Math.max(0, outlineWidth);
    this.outlineLine = new Line2(this.outlineGeometry, this.outlineMaterial);
    this.outlineLine.name = `${name}:outline`;
    this.outlineLine.renderOrder = renderOrder + 1;

    this.add(this.mesh, this.outlineLine);
    this.updateGeometry();
  }

  getGeodesicRadiusRadians(): number {
    return this.geodesicRadiusRadiansValue;
  }

  getSphericalAngleRadians(): number {
    return sphericalAngleRadians3D(
      this.vertex,
      this.firstArmPoint,
      this.secondArmPoint,
      this.sphereCenter,
    );
  }

  setGeodesicRadiusRadians(radiusRadians: number): this {
    if (!(radiusRadians >= 0) || !Number.isFinite(radiusRadians)) {
      throw new RangeError("Spherical angle geodesic radius must be finite and nonnegative.");
    }
    this.geodesicRadiusRadiansValue = radiusRadians;
    this.updateGeometry();
    return this.changed();
  }

  setFillColor(color: ColorRepresentation): this {
    this.material.color.set(color);
    return this.changed();
  }

  setFillOpacity(opacity: number): this {
    this.material.opacity = clampOpacity(opacity);
    this.refreshVisibility();
    return this.changed();
  }

  setOutlineColor(color: ColorRepresentation | null): this {
    if (color === null) {
      this.outlineMaterial.opacity = 0;
    } else {
      this.outlineMaterial.color.set(color);
      if (this.outlineMaterial.opacity === 0) this.outlineMaterial.opacity = 1;
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
    this.geometry.dispose();
    this.material.dispose();
    this.outlineGeometry.dispose();
    this.outlineMaterial.dispose();
  }

  private tangentBasis(): {
    radial: Vec3Tuple;
    first: Vec3Tuple;
    secondBasis: Vec3Tuple;
    angle: number;
  } {
    const radial = normalize3D(subtract3D(this.vertex, this.sphereCenter));
    const firstRaw = normalize3D(subtract3D(this.firstArmPoint, this.sphereCenter));
    const secondRaw = normalize3D(subtract3D(this.secondArmPoint, this.sphereCenter));

    const first = normalize3D(
      subtract3D(firstRaw, scale3D(radial, dot3D(firstRaw, radial))),
      "first spherical-angle tangent",
    );
    const second = normalize3D(
      subtract3D(secondRaw, scale3D(radial, dot3D(secondRaw, radial))),
      "second spherical-angle tangent",
    );
    const cosine = Math.min(1, Math.max(-1, dot3D(first, second)));
    const angle = Math.acos(cosine);
    const secondBasis = normalize3D(
      subtract3D(second, scale3D(first, cosine)),
      "spherical-angle tangent basis",
    );
    return { radial, first, secondBasis, angle };
  }

  private surfacePoint(
    radial: Vec3Tuple,
    tangentDirection: Vec3Tuple,
    geodesicRadius: number,
  ): Vec3Tuple {
    const unit = normalize3D(
      add3D(
        scale3D(radial, Math.cos(geodesicRadius)),
        scale3D(tangentDirection, Math.sin(geodesicRadius)),
      ),
    );
    return add3D(
      this.sphereCenter,
      scale3D(unit, this.sphereRadius + this.surfaceOffset),
    );
  }

  private updateGeometry(): void {
    const basis = this.tangentBasis();
    const radius = Math.min(Math.PI - 1e-4, this.geodesicRadiusRadiansValue);
    const rowLength = this.angularSegments + 1;

    for (let radialIndex = 0; radialIndex <= this.radialSegments; radialIndex += 1) {
      const geodesicRadius = radius * (radialIndex / this.radialSegments);
      for (let angularIndex = 0; angularIndex <= this.angularSegments; angularIndex += 1) {
        const phi = basis.angle * (angularIndex / this.angularSegments);
        const tangentDirection = normalize3D(
          add3D(
            scale3D(basis.first, Math.cos(phi)),
            scale3D(basis.secondBasis, Math.sin(phi)),
          ),
        );
        const point = this.surfacePoint(basis.radial, tangentDirection, geodesicRadius);
        writePoint(this.positions, radialIndex * rowLength + angularIndex, point);
      }
    }

    this.positionAttribute.needsUpdate = true;
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();

    const outline: Vec3Tuple[] = [];
    outline.push(this.surfacePoint(basis.radial, basis.first, 0));
    for (let radialIndex = 1; radialIndex <= this.radialSegments; radialIndex += 1) {
      outline.push(
        this.surfacePoint(
          basis.radial,
          basis.first,
          radius * (radialIndex / this.radialSegments),
        ),
      );
    }
    for (let angularIndex = 1; angularIndex <= this.angularSegments; angularIndex += 1) {
      const phi = basis.angle * (angularIndex / this.angularSegments);
      const tangentDirection = normalize3D(
        add3D(
          scale3D(basis.first, Math.cos(phi)),
          scale3D(basis.secondBasis, Math.sin(phi)),
        ),
      );
      outline.push(this.surfacePoint(basis.radial, tangentDirection, radius));
    }
    for (let radialIndex = this.radialSegments - 1; radialIndex >= 0; radialIndex -= 1) {
      const phi = basis.angle;
      const tangentDirection = normalize3D(
        add3D(
          scale3D(basis.first, Math.cos(phi)),
          scale3D(basis.secondBasis, Math.sin(phi)),
        ),
      );
      outline.push(
        this.surfacePoint(
          basis.radial,
          tangentDirection,
          radius * (radialIndex / this.radialSegments),
        ),
      );
    }

    this.outlineGeometry.setPositions(flattenPoints(outline));
    this.outlineLine.computeLineDistances();
    this.refreshVisibility();
  }

  private refreshVisibility(): void {
    const visible =
      this.geodesicRadiusRadiansValue > EPSILON &&
      this.getSphericalAngleRadians() > EPSILON;
    this.mesh.visible = visible && this.material.opacity > 0;
    this.outlineLine.visible = visible && this.outlineMaterial.opacity > 0;
  }
}

export function createSphericalAngleSector3D(
  options: SphericalAngleSector3DOptions,
): SphericalAngleSector3D {
  return new SphericalAngleSector3D(options);
}
