import type { Surface3DStyle } from "./Surface3D";
import {
  ParametricSurface3D,
  createParametricSurface3D,
} from "./ParametricSurface3D";

const TAU = Math.PI * 2;

export interface Sphere3DOptions {
  radius?: number;
  widthSegments?: number;
  heightSegments?: number;
  style?: Surface3DStyle;
  name?: string;
}

/** Convenience sphere factory built on the general parametric-surface layer. */
export function createSphere3D({
  radius = 1,
  widthSegments = 64,
  heightSegments = 32,
  style,
  name = "sphere-3d",
}: Sphere3DOptions = {}): ParametricSurface3D {
  if (!(radius > 0) || !Number.isFinite(radius)) {
    throw new RangeError("Sphere radius must be positive and finite.");
  }

  return createParametricSurface3D({
    surface: (longitude, colatitude) => {
      const ringRadius = radius * Math.sin(colatitude);
      return [
        ringRadius * Math.cos(longitude),
        radius * Math.cos(colatitude),
        ringRadius * Math.sin(longitude),
      ];
    },
    uDomain: [0, TAU],
    vDomain: [0, Math.PI],
    uSegments: widthSegments,
    vSegments: heightSegments,
    wrapU: true,
    wrapV: false,
    style,
    name,
  });
}
