import type { Vector3 } from "three";
import type { Domain } from "./types";

export type Vec3Tuple = readonly [number, number, number];
export type Vec3Like =
  | Vec3Tuple
  | Vector3
  | { x: number; y: number; z: number };

export interface CameraState3D {
  position: Vec3Tuple;
  target: Vec3Tuple;
  fovDegrees: number;
  near: number;
  far: number;
}

/** A mathematical surface map (u, v) ↦ (x, y, z). */
export type ParametricSurfaceMap3D = (
  u: number,
  v: number,
) => Vec3Like;

/**
 * Indexed rectangular surface topology.
 *
 * A wrapped direction has exactly `segments` vertices and joins its last strip
 * back to the first one. An unwrapped direction has `segments + 1` vertices,
 * including both boundary parameter values.
 */
export interface SurfaceGrid3D {
  readonly uSegments: number;
  readonly vSegments: number;
  readonly uVertexCount: number;
  readonly vVertexCount: number;
  readonly wrapU: boolean;
  readonly wrapV: boolean;
  readonly vertexCount: number;
  readonly triangleCount: number;
  readonly indices: Uint32Array;
}

/** Sampled vertex/index data suitable for a Three.js BufferGeometry. */
export interface SurfaceGeometryData3D extends SurfaceGrid3D {
  readonly positions: Float32Array;
  readonly uvs: Float32Array;
}

export interface ParametricSurfaceSampleOptions3D {
  surface: ParametricSurfaceMap3D;
  uDomain: Domain;
  vDomain: Domain;
  uSegments: number;
  vSegments: number;
  wrapU?: boolean;
  wrapV?: boolean;
}
