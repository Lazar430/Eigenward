import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
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
  distance3D,
  dot3D,
  normalize3D,
  scale3D,
  subtract3D,
} from "../geometry/euclideanConstructions3D";

const EPSILON = 1e-10;
const TAU = Math.PI * 2;

export type SphericalWedgeSweep3D = "minor" | "major";

export interface SphericalWedge3DOptions {
  sphereCenter: Vec3Tuple;
  sphereRadius?: number;
  /** One endpoint of the common pole-to-antipode diameter. */
  pole: Vec3Tuple;
  /** Point fixing the first bounding great-circle half-plane. */
  firstBoundaryPoint: Vec3Tuple;
  /** Point fixing the second bounding great-circle half-plane. */
  secondBoundaryPoint: Vec3Tuple;
  sweep?: SphericalWedgeSweep3D;
  revealProgress?: number;
  polarSegments?: number;
  angularSegments?: number;
  /**
   * Small radial offset for the rendered shell. A slight negative value places
   * the transparent wedge just inside the sphere and leaves a separately drawn
   * spherical lune cleanly visible on top of it.
   */
  surfaceOffset?: number;
  fill?: ColorRepresentation;
  fillOpacity?: number;
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

/**
 * Transparent solid highlight for the spherical wedge associated with a lune.
 *
 * Geometrically the wedge is the region of the ball between two great-circle
 * half-planes through the sphere center. Its boundary consists of:
 *
 *   1. the spherical lune on the outer sphere, and
 *   2. two planar semicircular half-disks meeting along the pole-antipode
 *      diameter through the center.
 *
 * Three.js does not render a literal participating volume here; instead this
 * primitive renders that closed boundary shell with a translucent material,
 * which is the conventional and robust way to make such a mathematical solid
 * readable while retaining the sphere and constructions behind it.
 *
 * `setRevealProgress()` sweeps the second half-plane away from the first, using
 * exactly the same angular convention as SphericalLune3D so both primitives can
 * be animated in lock-step.
 */
export class SphericalWedge3D extends MathObject3D {
  private readonly sphereCenter: Vec3Tuple;
  private readonly sphereRadius: number;
  private readonly renderedRadius: number;
  private readonly pole: Vec3Tuple;
  private readonly firstBoundaryPoint: Vec3Tuple;
  private readonly secondBoundaryPoint: Vec3Tuple;
  private readonly sweep: SphericalWedgeSweep3D;
  private readonly polarSegments: number;
  private readonly angularSegments: number;

  private revealProgressValue: number;

  private readonly geometry = new BufferGeometry();
  private readonly positions: Float32Array;
  private readonly positionAttribute: BufferAttribute;
  private readonly material: MeshBasicMaterial;
  private readonly mesh: Mesh<BufferGeometry, MeshBasicMaterial>;

  private readonly outerVertexOffset = 0;
  private readonly firstSideVertexOffset: number;
  private readonly secondSideVertexOffset: number;

  constructor({
    sphereCenter,
    sphereRadius,
    pole,
    firstBoundaryPoint,
    secondBoundaryPoint,
    sweep = "minor",
    revealProgress = 1,
    polarSegments = 64,
    angularSegments = 36,
    surfaceOffset = -0.028,
    fill = COLORS.violet,
    fillOpacity = 0.16,
    depthTest = true,
    renderOrder = 3,
    name = "spherical-wedge-3d",
  }: SphericalWedge3DOptions) {
    super();

    this.name = name;
    this.sphereCenter = [...sphereCenter] as Vec3Tuple;
    this.sphereRadius = sphereRadius ?? distance3D(pole, sphereCenter);
    this.renderedRadius = this.sphereRadius + surfaceOffset;
    this.pole = [...pole] as Vec3Tuple;
    this.firstBoundaryPoint = [...firstBoundaryPoint] as Vec3Tuple;
    this.secondBoundaryPoint = [...secondBoundaryPoint] as Vec3Tuple;
    this.sweep = sweep;
    this.polarSegments = Math.max(8, Math.floor(polarSegments));
    this.angularSegments = Math.max(2, Math.floor(angularSegments));
    this.revealProgressValue = clamp01(revealProgress);

    if (!(this.sphereRadius > 0) || !Number.isFinite(this.sphereRadius)) {
      throw new RangeError("Spherical wedge sphereRadius must be positive and finite.");
    }
    if (!(this.renderedRadius > 0) || !Number.isFinite(this.renderedRadius)) {
      throw new RangeError(
        "Spherical wedge sphereRadius + surfaceOffset must be positive and finite.",
      );
    }

    const outerVertexCount =
      (this.polarSegments + 1) * (this.angularSegments + 1);
    const sideVertexCount = this.polarSegments + 2; // center + semicircle samples

    this.firstSideVertexOffset = outerVertexCount;
    this.secondSideVertexOffset = outerVertexCount + sideVertexCount;

    const totalVertexCount = outerVertexCount + sideVertexCount * 2;
    this.positions = new Float32Array(totalVertexCount * 3);
    this.positionAttribute = new BufferAttribute(this.positions, 3);
    this.geometry.setAttribute("position", this.positionAttribute);

    const indices: number[] = [];
    const outerRowLength = this.angularSegments + 1;

    // Curved outer spherical face.
    for (let polar = 0; polar < this.polarSegments; polar += 1) {
      for (let angular = 0; angular < this.angularSegments; angular += 1) {
        const a = this.outerVertexOffset + polar * outerRowLength + angular;
        const b = a + 1;
        const c = a + outerRowLength;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    // First planar half-disk.
    for (let polar = 0; polar < this.polarSegments; polar += 1) {
      indices.push(
        this.firstSideVertexOffset,
        this.firstSideVertexOffset + 1 + polar,
        this.firstSideVertexOffset + 2 + polar,
      );
    }

    // Second planar half-disk. Reverse winding so its outward normal is opposite.
    for (let polar = 0; polar < this.polarSegments; polar += 1) {
      indices.push(
        this.secondSideVertexOffset,
        this.secondSideVertexOffset + 2 + polar,
        this.secondSideVertexOffset + 1 + polar,
      );
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
    this.mesh.name = `${name}:closed-boundary-shell`;
    this.mesh.renderOrder = renderOrder;
    this.add(this.mesh);

    this.updateGeometry();
  }

  getRevealProgress(): number {
    return this.revealProgressValue;
  }

  getWedgeAngleRadians(): number {
    const { minorAngle } = this.tangentBasis();
    return this.sweep === "minor" ? minorAngle : TAU - minorAngle;
  }

  setRevealProgress(progress: number): this {
    if (!Number.isFinite(progress)) {
      throw new RangeError("Spherical wedge reveal progress must be finite.");
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

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private tangentBasis(): {
    radial: Vec3Tuple;
    first: Vec3Tuple;
    secondBasis: Vec3Tuple;
    minorAngle: number;
  } {
    const radial = normalize3D(
      subtract3D(this.pole, this.sphereCenter),
      "spherical wedge pole",
    );
    const firstRaw = normalize3D(
      subtract3D(this.firstBoundaryPoint, this.sphereCenter),
      "first spherical wedge boundary point",
    );
    const secondRaw = normalize3D(
      subtract3D(this.secondBoundaryPoint, this.sphereCenter),
      "second spherical wedge boundary point",
    );

    const first = normalize3D(
      subtract3D(firstRaw, scale3D(radial, dot3D(firstRaw, radial))),
      "first spherical wedge tangent",
    );
    const second = normalize3D(
      subtract3D(secondRaw, scale3D(radial, dot3D(secondRaw, radial))),
      "second spherical wedge tangent",
    );

    const cosine = Math.min(1, Math.max(-1, dot3D(first, second)));
    const minorAngle = Math.acos(cosine);

    if (minorAngle <= EPSILON || Math.abs(Math.PI - minorAngle) <= EPSILON) {
      throw new RangeError(
        "Spherical wedge boundaries must determine two distinct, non-collinear great circles.",
      );
    }

    const secondBasis = normalize3D(
      subtract3D(second, scale3D(first, cosine)),
      "spherical wedge tangent basis",
    );

    return { radial, first, secondBasis, minorAngle };
  }

  private directionAt(
    radial: Vec3Tuple,
    tangentDirection: Vec3Tuple,
    polarAngle: number,
  ): Vec3Tuple {
    return normalize3D(
      add3D(
        scale3D(radial, Math.cos(polarAngle)),
        scale3D(tangentDirection, Math.sin(polarAngle)),
      ),
    );
  }

  private boundaryPoint(
    radial: Vec3Tuple,
    tangentDirection: Vec3Tuple,
    polarAngle: number,
  ): Vec3Tuple {
    return add3D(
      this.sphereCenter,
      scale3D(
        this.directionAt(radial, tangentDirection, polarAngle),
        this.renderedRadius,
      ),
    );
  }

  private updateGeometry(): void {
    const basis = this.tangentBasis();
    const fullSweep =
      this.sweep === "minor"
        ? basis.minorAngle
        : -(TAU - basis.minorAngle);
    const visibleSweep = fullSweep * this.revealProgressValue;
    const outerRowLength = this.angularSegments + 1;

    // Curved spherical face.
    for (let polarIndex = 0; polarIndex <= this.polarSegments; polarIndex += 1) {
      const polarAngle = Math.PI * (polarIndex / this.polarSegments);

      for (
        let angularIndex = 0;
        angularIndex <= this.angularSegments;
        angularIndex += 1
      ) {
        const theta = visibleSweep * (angularIndex / this.angularSegments);
        const tangentDirection = normalize3D(
          add3D(
            scale3D(basis.first, Math.cos(theta)),
            scale3D(basis.secondBasis, Math.sin(theta)),
          ),
        );
        writePoint(
          this.positions,
          this.outerVertexOffset + polarIndex * outerRowLength + angularIndex,
          this.boundaryPoint(basis.radial, tangentDirection, polarAngle),
        );
      }
    }

    const finalTangent = normalize3D(
      add3D(
        scale3D(basis.first, Math.cos(visibleSweep)),
        scale3D(basis.secondBasis, Math.sin(visibleSweep)),
      ),
    );

    // Both planar half-disks use the sphere center as fan center.
    writePoint(this.positions, this.firstSideVertexOffset, this.sphereCenter);
    writePoint(this.positions, this.secondSideVertexOffset, this.sphereCenter);

    for (let polarIndex = 0; polarIndex <= this.polarSegments; polarIndex += 1) {
      const polarAngle = Math.PI * (polarIndex / this.polarSegments);
      writePoint(
        this.positions,
        this.firstSideVertexOffset + 1 + polarIndex,
        this.boundaryPoint(basis.radial, basis.first, polarAngle),
      );
      writePoint(
        this.positions,
        this.secondSideVertexOffset + 1 + polarIndex,
        this.boundaryPoint(basis.radial, finalTangent, polarAngle),
      );
    }

    this.positionAttribute.needsUpdate = true;
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
    this.refreshVisibility();
  }

  private refreshVisibility(): void {
    this.mesh.visible =
      this.revealProgressValue > EPSILON && this.material.opacity > 0;
  }
}

export function createSphericalWedge3D(
  options: SphericalWedge3DOptions,
): SphericalWedge3D {
  return new SphericalWedge3D(options);
}
