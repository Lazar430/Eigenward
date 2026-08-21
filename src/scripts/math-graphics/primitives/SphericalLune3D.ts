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

const EPSILON = 1e-10;
const TAU = Math.PI * 2;

export type SphericalLuneSweep3D = "minor" | "major";

export interface SphericalLune3DOptions {
  sphereCenter: Vec3Tuple;
  sphereRadius?: number;
  /** One of the two antipodal vertices shared by the lune boundaries. */
  pole: Vec3Tuple;
  /**
   * Any non-antipodal point on the first bounding great circle.
   * Its tangent direction at `pole` fixes the first boundary semicircle.
   */
  firstBoundaryPoint: Vec3Tuple;
  /**
   * Any non-antipodal point on the second bounding great circle.
   * Together with `pole`, this fixes the second boundary semicircle.
   */
  secondBoundaryPoint: Vec3Tuple;
  sweep?: SphericalLuneSweep3D;
  revealProgress?: number;
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

function clamp01(value: number): number {
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
 * Filled spherical lune bounded by two great-circle semicircles.
 *
 * Unlike SphericalAngleSector3D, this patch always runs from one pole all the
 * way to its antipode. The mutable reveal progress sweeps the second bounding
 * semicircle from the first one to its final position, which makes the primitive
 * convenient for proof-stage animations without changing its topology.
 */
export class SphericalLune3D extends MathObject3D {
  private readonly sphereCenter: Vec3Tuple;
  private readonly sphereRadius: number;
  private readonly pole: Vec3Tuple;
  private readonly firstBoundaryPoint: Vec3Tuple;
  private readonly secondBoundaryPoint: Vec3Tuple;
  private readonly sweep: SphericalLuneSweep3D;
  private readonly radialSegments: number;
  private readonly angularSegments: number;
  private readonly surfaceOffset: number;

  private revealProgressValue: number;

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
    pole,
    firstBoundaryPoint,
    secondBoundaryPoint,
    sweep = "minor",
    revealProgress = 1,
    radialSegments = 64,
    angularSegments = 36,
    surfaceOffset = 0.018,
    fill = COLORS.violet,
    fillOpacity = 0.28,
    outline = null,
    outlineOpacity = 0.95,
    outlineWidth = 1.9,
    depthTest = true,
    renderOrder = 4,
    name = "spherical-lune-3d",
  }: SphericalLune3DOptions) {
    super();

    this.name = name;
    this.sphereCenter = [...sphereCenter] as Vec3Tuple;
    this.sphereRadius = sphereRadius ?? distance3D(pole, sphereCenter);
    this.pole = [...pole] as Vec3Tuple;
    this.firstBoundaryPoint = [...firstBoundaryPoint] as Vec3Tuple;
    this.secondBoundaryPoint = [...secondBoundaryPoint] as Vec3Tuple;
    this.sweep = sweep;
    this.radialSegments = Math.max(8, Math.floor(radialSegments));
    this.angularSegments = Math.max(2, Math.floor(angularSegments));
    this.surfaceOffset = Math.max(0, surfaceOffset);
    this.revealProgressValue = clamp01(revealProgress);

    if (!(this.sphereRadius > 0) || !Number.isFinite(this.sphereRadius)) {
      throw new RangeError("Spherical lune sphereRadius must be positive and finite.");
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
      opacity: clamp01(fillOpacity),
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
      opacity: outline === null ? 0 : clamp01(outlineOpacity),
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

  getRevealProgress(): number {
    return this.revealProgressValue;
  }

  getLuneAngleRadians(): number {
    const { minorAngle } = this.tangentBasis();
    return this.sweep === "minor" ? minorAngle : TAU - minorAngle;
  }

  setRevealProgress(progress: number): this {
    if (!Number.isFinite(progress)) {
      throw new RangeError("Spherical lune reveal progress must be finite.");
    }
    this.revealProgressValue = clamp01(progress);
    this.updateGeometry();
    return this.changed();
  }

  setFillColor(color: ColorRepresentation): this {
    this.material.color.set(color);
    return this.changed();
  }

  setFillOpacity(opacity: number): this {
    this.material.opacity = clamp01(opacity);
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
    this.outlineMaterial.opacity = clamp01(opacity);
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
    minorAngle: number;
  } {
    const radial = normalize3D(
      subtract3D(this.pole, this.sphereCenter),
      "spherical lune pole",
    );
    const firstRaw = normalize3D(
      subtract3D(this.firstBoundaryPoint, this.sphereCenter),
      "first spherical lune boundary point",
    );
    const secondRaw = normalize3D(
      subtract3D(this.secondBoundaryPoint, this.sphereCenter),
      "second spherical lune boundary point",
    );

    const first = normalize3D(
      subtract3D(firstRaw, scale3D(radial, dot3D(firstRaw, radial))),
      "first spherical lune tangent",
    );
    const second = normalize3D(
      subtract3D(secondRaw, scale3D(radial, dot3D(secondRaw, radial))),
      "second spherical lune tangent",
    );

    const cosine = Math.min(1, Math.max(-1, dot3D(first, second)));
    const minorAngle = Math.acos(cosine);

    if (minorAngle <= EPSILON || Math.abs(Math.PI - minorAngle) <= EPSILON) {
      throw new RangeError(
        "Spherical lune boundaries must determine two distinct, non-collinear great circles.",
      );
    }

    const secondBasis = normalize3D(
      subtract3D(second, scale3D(first, cosine)),
      "spherical lune tangent basis",
    );

    return { radial, first, secondBasis, minorAngle };
  }

  private surfacePoint(
    radial: Vec3Tuple,
    tangentDirection: Vec3Tuple,
    polarAngle: number,
  ): Vec3Tuple {
    const unit = normalize3D(
      add3D(
        scale3D(radial, Math.cos(polarAngle)),
        scale3D(tangentDirection, Math.sin(polarAngle)),
      ),
    );
    return add3D(
      this.sphereCenter,
      scale3D(unit, this.sphereRadius + this.surfaceOffset),
    );
  }

  private updateGeometry(): void {
    const basis = this.tangentBasis();
    const fullSweep =
      this.sweep === "minor"
        ? basis.minorAngle
        : -(TAU - basis.minorAngle);
    const visibleSweep = fullSweep * this.revealProgressValue;
    const rowLength = this.angularSegments + 1;

    for (let radialIndex = 0; radialIndex <= this.radialSegments; radialIndex += 1) {
      const polarAngle = Math.PI * (radialIndex / this.radialSegments);

      for (
        let angularIndex = 0;
        angularIndex <= this.angularSegments;
        angularIndex += 1
      ) {
        const theta =
          visibleSweep * (angularIndex / this.angularSegments);
        const tangentDirection = normalize3D(
          add3D(
            scale3D(basis.first, Math.cos(theta)),
            scale3D(basis.secondBasis, Math.sin(theta)),
          ),
        );
        const point = this.surfacePoint(
          basis.radial,
          tangentDirection,
          polarAngle,
        );
        writePoint(
          this.positions,
          radialIndex * rowLength + angularIndex,
          point,
        );
      }
    }

    this.positionAttribute.needsUpdate = true;
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();

    const firstBoundary: Vec3Tuple[] = [];
    const secondBoundary: Vec3Tuple[] = [];

    const finalTangent = normalize3D(
      add3D(
        scale3D(basis.first, Math.cos(visibleSweep)),
        scale3D(basis.secondBasis, Math.sin(visibleSweep)),
      ),
    );

    for (let radialIndex = 0; radialIndex <= this.radialSegments; radialIndex += 1) {
      const polarAngle = Math.PI * (radialIndex / this.radialSegments);
      firstBoundary.push(
        this.surfacePoint(basis.radial, basis.first, polarAngle),
      );
      secondBoundary.push(
        this.surfacePoint(basis.radial, finalTangent, polarAngle),
      );
    }

    const outline = [
      ...firstBoundary,
      ...secondBoundary.slice(0, -1).reverse(),
    ];
    this.outlineGeometry.setPositions(flattenPoints(outline));
    this.outlineLine.computeLineDistances();
    this.refreshVisibility();
  }

  private refreshVisibility(): void {
    const visible = this.revealProgressValue > EPSILON;
    this.mesh.visible = visible && this.material.opacity > 0;
    this.outlineLine.visible = visible && this.outlineMaterial.opacity > 0;
  }
}

export function createSphericalLune3D(
  options: SphericalLune3DOptions,
): SphericalLune3D {
  return new SphericalLune3D(options);
}
