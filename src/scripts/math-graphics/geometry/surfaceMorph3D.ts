import type { SurfaceGeometryData3D } from "../core/types3D";
import { clamp01 } from "../animation/easing";

export interface SurfaceMorphTarget3D {
  readonly name: string;
  readonly positions: Float32Array;
}

function assertTargetName(name: string): void {
  if (name.trim().length === 0) {
    throw new RangeError("A surface morph target requires a nonempty name.");
  }
}

export function assertFiniteSurfacePositions3D(
  positions: ArrayLike<number>,
  expectedLength?: number,
): void {
  if (expectedLength !== undefined && positions.length !== expectedLength) {
    throw new RangeError(
      `Surface morph target has ${positions.length} scalar coordinates; ` +
	`expected ${expectedLength}.`,
    );
  }

  if (positions.length === 0 || positions.length % 3 !== 0) {
    throw new RangeError(
      "Surface position buffers must contain a nonempty multiple of three values.",
    );
  }

  for (let index = 0; index < positions.length; index += 1) {
    if (!Number.isFinite(Number(positions[index]))) {
      throw new RangeError(
        `Surface position buffer contains a non-finite value at index ${index}.`,
      );
    }
  }
}

export function copySurfacePositions3D(
  positions: ArrayLike<number>,
  expectedLength?: number,
): Float32Array {
  assertFiniteSurfacePositions3D(positions, expectedLength);

  const copy = new Float32Array(positions.length);
  for (let index = 0; index < positions.length; index += 1) {
    copy[index] = Number(positions[index]);
  }
  return copy;
}

function sameIndices(left: Uint32Array, right: Uint32Array): boolean {
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }

  return true;
}

/**
 * Assert that two sampled surfaces have exactly the same indexed mesh topology.
 *
 * UV coordinates and positions may differ; vertex/index connectivity may not.
 */
export function assertCompatibleSurfaceTopologies3D(
  reference: SurfaceGeometryData3D,
  candidate: SurfaceGeometryData3D,
): void {
  const scalarFields = [
    "uSegments",
    "vSegments",
    "uVertexCount",
    "vVertexCount",
    "vertexCount",
    "triangleCount",
  ] as const;

  for (const field of scalarFields) {
    if (reference[field] !== candidate[field]) {
      throw new RangeError(
        `Surface topology mismatch: ${field} differs ` +
          `(${reference[field]} !== ${candidate[field]}).`,
      );
    }
  }

  if (
    reference.wrapU !== candidate.wrapU ||
      reference.wrapV !== candidate.wrapV
  ) {
    throw new RangeError("Surface topology mismatch: wrapping flags differ.");
  }

  if (!sameIndices(reference.indices, candidate.indices)) {
    throw new RangeError(
      "Surface topology mismatch: triangle index connectivity differs.",
    );
  }

  if (reference.positions.length !== candidate.positions.length) {
    throw new RangeError(
      "Surface topology mismatch: position-buffer lengths differ.",
    );
  }
}

export function createSurfaceMorphTarget3D(
  name: string,
  positions: ArrayLike<number>,
  expectedLength?: number,
): SurfaceMorphTarget3D {
  assertTargetName(name);

  return {
    name,
    positions: copySurfacePositions3D(positions, expectedLength),
  };
}

export function createSurfaceMorphTargetFromGeometry3D(
  name: string,
  reference: SurfaceGeometryData3D,
  target: SurfaceGeometryData3D,
): SurfaceMorphTarget3D {
  assertCompatibleSurfaceTopologies3D(reference, target);

  return createSurfaceMorphTarget3D(
    name,
    target.positions,
    reference.positions.length,
  );
}

/**
 * Interpolate two compatible xyz buffers into `out`.
 *
 * The supplied output buffer is reused when possible, allowing animation loops
 * to avoid allocating a new typed array every frame.
 */
export function lerpSurfacePositions3D(
  from: ArrayLike<number>,
  to: ArrayLike<number>,
  progress: number,
  out?: Float32Array,
): Float32Array {
  assertFiniteSurfacePositions3D(from);
  assertFiniteSurfacePositions3D(to, from.length);

  const target = out ?? new Float32Array(from.length);

  if (target.length !== from.length) {
    throw new RangeError(
      "Surface morph output buffer must match the source buffer length.",
    );
  }

  const t = clamp01(progress);
  const inverse = 1 - t;

  for (let index = 0; index < from.length; index += 1) {
    target[index] =
      inverse * Number(from[index]) +
	t * Number(to[index]);
  }

  return target;
}
