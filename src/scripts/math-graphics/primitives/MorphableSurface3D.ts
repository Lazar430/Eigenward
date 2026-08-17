import { DynamicDrawUsage } from "three";
import type { SurfaceGeometryData3D } from "../core/types3D";
import {
  copySurfacePositions3D,
  createSurfaceMorphTarget3D,
  lerpSurfacePositions3D,
  type SurfaceMorphTarget3D,
} from "../geometry/surfaceMorph3D";
import {
  Surface3D,
  type Surface3DStyle,
} from "./Surface3D";

export interface MorphableSurface3DOptions {
  geometry: SurfaceGeometryData3D;
  targets?: readonly SurfaceMorphTarget3D[];
  baseTargetName?: string;
  style?: Surface3DStyle;
  name?: string;
}

export interface MorphState3D {
  readonly from: string;
  readonly to: string;
  readonly progress: number;
}

/**
 * A fixed-topology surface whose vertex positions can move between compatible
 * target states without replacing the Three.js mesh or its index buffer.
 */
export class MorphableSurface3D extends Surface3D {
  private readonly targets = new Map<string, Float32Array>();
  private readonly scratchPositions: Float32Array;
  private readonly baseTargetName: string;

  private activeFrom: string;
  private activeTo: string;
  private progress = 0;

  constructor({
    geometry,
    targets = [],
    baseTargetName = "base",
    style,
    name = "morphable-surface-3d",
  }: MorphableSurface3DOptions) {
    super({ geometry, style, name });

    if (baseTargetName.trim().length === 0) {
      throw new RangeError("baseTargetName must be nonempty.");
    }

    this.baseTargetName = baseTargetName;
    this.targets.set(
      baseTargetName,
      copySurfacePositions3D(
        geometry.positions,
        geometry.positions.length,
      ),
    );

    for (const target of targets) {
      this.addMorphTarget(target);
    }

    this.activeFrom = baseTargetName;
    this.activeTo = targets[0]?.name ?? baseTargetName;
    this.scratchPositions = new Float32Array(geometry.positions.length);

    // The same GPU attributes will be rewritten frequently during morphs.
    this.positionAttribute.setUsage(DynamicDrawUsage);
    const normals = this.geometry.getAttribute("normal");
    normals?.setUsage(DynamicDrawUsage);
  }

  getBaseTargetName(): string {
    return this.baseTargetName;
  }

  getMorphTargetNames(): readonly string[] {
    return [...this.targets.keys()];
  }

  hasMorphTarget(name: string): boolean {
    return this.targets.has(name);
  }

  getMorphTargetPositions(name: string): Float32Array {
    return new Float32Array(this.requireTarget(name));
  }

  getMorphState(): MorphState3D {
    return {
      from: this.activeFrom,
      to: this.activeTo,
      progress: this.progress,
    };
  }

  addMorphTarget(target: SurfaceMorphTarget3D): this {
    if (target.name.trim().length === 0) {
      throw new RangeError("Morph target names must be nonempty.");
    }

    if (this.targets.has(target.name)) {
      throw new Error(`A morph target named "${target.name}" already exists.`);
    }

    this.targets.set(
      target.name,
      copySurfacePositions3D(
        target.positions,
        this.positionAttribute.array.length,
      ),
    );

    return this;
  }

  removeMorphTarget(name: string): this {
    if (name === this.baseTargetName) {
      throw new Error("The base morph target cannot be removed.");
    }

    if (name === this.activeFrom || name === this.activeTo) {
      throw new Error(
        `Cannot remove active morph target "${name}". Select another pair first.`,
      );
    }

    this.targets.delete(name);
    return this;
  }

  /**
   * Choose the two states interpolated by setMorphProgress().
   * Progress is reset to zero and the `from` geometry is displayed immediately.
   */
  setMorphTargets(from: string, to: string): this {
    this.requireTarget(from);
    this.requireTarget(to);

    this.activeFrom = from;
    this.activeTo = to;
    this.progress = 0;

    return this.setVertexPositionsInternal(this.requireTarget(from));
  }

  setMorphProgress(progress: number): this {
    if (!Number.isFinite(progress)) {
      throw new RangeError("Morph progress must be finite.");
    }

    this.progress = Math.min(1, Math.max(0, progress));

    const from = this.requireTarget(this.activeFrom);
    const to = this.requireTarget(this.activeTo);

    if (this.activeFrom === this.activeTo) {
      return this.setVertexPositionsInternal(from);
    }

    lerpSurfacePositions3D(
      from,
      to,
      this.progress,
      this.scratchPositions,
    );

    return this.setVertexPositionsInternal(this.scratchPositions);
  }

  setMorphBetween(
    from: string,
    to: string,
    progress: number,
  ): this {
    if (from !== this.activeFrom || to !== this.activeTo) {
      this.setMorphTargets(from, to);
    }

    return this.setMorphProgress(progress);
  }

  /** Display one target exactly and make it the current stationary state. */
  showMorphTarget(name: string): this {
    const target = this.requireTarget(name);

    this.activeFrom = name;
    this.activeTo = name;
    this.progress = 0;

    return this.setVertexPositionsInternal(target);
  }

  private requireTarget(name: string): Float32Array {
    const target = this.targets.get(name);

    if (!target) {
      throw new Error(`Unknown surface morph target "${name}".`);
    }

    return target;
  }
}

export function createMorphableSurface3D(
  options: MorphableSurface3DOptions,
): MorphableSurface3D {
  return new MorphableSurface3D(options);
}

export { createSurfaceMorphTarget3D };
