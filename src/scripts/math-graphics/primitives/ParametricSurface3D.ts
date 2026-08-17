import type {
  ParametricSurfaceSampleOptions3D,
} from "../core/types3D";
import { sampleParametricSurface3D } from "../geometry/sampleParametricSurface3D";
import {
  Surface3D,
  type Surface3DStyle,
} from "./Surface3D";

export interface ParametricSurface3DOptions
  extends ParametricSurfaceSampleOptions3D {
    style?: Surface3DStyle;
    name?: string;
}

/** A Surface3D produced by sampling a mathematical map (u, v) ↦ R³. */
export class ParametricSurface3D extends Surface3D {
  constructor({
    surface,
    uDomain,
    vDomain,
    uSegments,
    vSegments,
    wrapU,
    wrapV,
    style,
    name = "parametric-surface-3d",
  }: ParametricSurface3DOptions) {
    super({
      geometry: sampleParametricSurface3D({
        surface,
        uDomain,
        vDomain,
        uSegments,
        vSegments,
        wrapU,
        wrapV,
      }),
      style,
      name,
    });
  }
}

export function createParametricSurface3D(
  options: ParametricSurface3DOptions,
): ParametricSurface3D {
  return new ParametricSurface3D(options);
}
