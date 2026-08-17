import type { Surface3DStyle } from "./Surface3D";
import {
  ParametricSurface3D,
  createParametricSurface3D,
} from "./ParametricSurface3D";

const TAU = Math.PI * 2;

export interface Torus3DOptions {
  majorRadius?: number;
  tubeRadius?: number;
  majorSegments?: number;
  tubeSegments?: number;
  style?: Surface3DStyle;
  name?: string;
}

/** Convenience torus factory built on the general parametric-surface layer. */
export function createTorus3D({
  majorRadius = 1.45,
  tubeRadius = 0.52,
  majorSegments = 96,
  tubeSegments = 36,
  style,
  name = "torus-3d",
}: Torus3DOptions = {}): ParametricSurface3D {
  if (!(majorRadius > 0) || !Number.isFinite(majorRadius)) {
    throw new RangeError("Torus majorRadius must be positive and finite.");
  }
  if (!(tubeRadius > 0) || !Number.isFinite(tubeRadius)) {
    throw new RangeError("Torus tubeRadius must be positive and finite.");
  }

  return createParametricSurface3D({
    surface: (u, v) => {
      const ring = majorRadius + tubeRadius * Math.cos(v);

      // The sign on y chooses outward winding for the shared grid convention.
      return [
        ring * Math.cos(u),
        -tubeRadius * Math.sin(v),
        ring * Math.sin(u),
      ];
    },
    uDomain: [0, TAU],
    vDomain: [0, TAU],
    uSegments: majorSegments,
    vSegments: tubeSegments,
    wrapU: true,
    wrapV: true,
    style,
    name,
  });
}
