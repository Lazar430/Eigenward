import type { SurfaceGrid3D } from "../core/types3D";

export interface SurfaceGrid3DOptions {
  uSegments: number;
  vSegments: number;
  wrapU?: boolean;
  wrapV?: boolean;
}

function normalizeSegmentCount(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be finite.`);
  }

  const segments = Math.floor(value);
  if (segments < 1) {
    throw new RangeError(`${label} must be at least 1.`);
  }

  return segments;
}

/** Return the flat vertex index for a grid coordinate. */
export function surfaceGridVertexIndex3D(
  grid: Pick<SurfaceGrid3D, "uVertexCount" | "vVertexCount">,
  uIndex: number,
  vIndex: number,
): number {
  if (
    uIndex < 0 ||
      uIndex >= grid.uVertexCount ||
      vIndex < 0 ||
      vIndex >= grid.vVertexCount
  ) {
    throw new RangeError("Surface-grid vertex coordinates are out of range.");
  }

  return uIndex * grid.vVertexCount + vIndex;
}

/**
 * Build reusable indexed rectangular topology for a sampled surface.
 *
 * Connectivity is independent of the actual vertex positions. Batch 3 can
 * therefore reuse exactly this topology while changing only the position
 * buffer during a morph.
 */
export function createSurfaceGrid3D({
  uSegments,
  vSegments,
  wrapU = false,
  wrapV = false,
}: SurfaceGrid3DOptions): SurfaceGrid3D {
  const resolvedUSegments = normalizeSegmentCount(uSegments, "uSegments");
  const resolvedVSegments = normalizeSegmentCount(vSegments, "vSegments");

  const uVertexCount = wrapU
    ? resolvedUSegments
    : resolvedUSegments + 1;
  const vVertexCount = wrapV
    ? resolvedVSegments
    : resolvedVSegments + 1;

  const vertexCount = uVertexCount * vVertexCount;
  const triangleCount = resolvedUSegments * resolvedVSegments * 2;
  const indices = new Uint32Array(triangleCount * 3);

  let offset = 0;

  const vertexIndex = (uIndex: number, vIndex: number): number =>
    uIndex * vVertexCount + vIndex;

  for (let uIndex = 0; uIndex < resolvedUSegments; uIndex += 1) {
    const nextU = wrapU ? (uIndex + 1) % uVertexCount : uIndex + 1;

    for (let vIndex = 0; vIndex < resolvedVSegments; vIndex += 1) {
      const nextV = wrapV ? (vIndex + 1) % vVertexCount : vIndex + 1;

      const a = vertexIndex(uIndex, vIndex);
      const b = vertexIndex(nextU, vIndex);
      const c = vertexIndex(uIndex, nextV);
      const d = vertexIndex(nextU, nextV);

      // Winding follows ∂surface/∂u × ∂surface/∂v.
      indices[offset] = a;
      indices[offset + 1] = b;
      indices[offset + 2] = c;
      indices[offset + 3] = b;
      indices[offset + 4] = d;
      indices[offset + 5] = c;
      offset += 6;
    }
  }

  return {
    uSegments: resolvedUSegments,
    vSegments: resolvedVSegments,
    uVertexCount,
    vVertexCount,
    wrapU,
    wrapV,
    vertexCount,
    triangleCount,
    indices,
  };
}
