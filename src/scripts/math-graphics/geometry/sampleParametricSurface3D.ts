import type { Vec3Like } from "../core/types3D";
import type {
  ParametricSurfaceSampleOptions3D,
  SurfaceGeometryData3D,
} from "../core/types3D";
import { createSurfaceGrid3D } from "./surfaceGrid3D";

function readVec3(value: Vec3Like): readonly [number, number, number] {
  if ("x" in value) return [value.x, value.y, value.z];
  return [value[0], value[1], value[2]];
}

function assertDomain(
  domain: readonly [number, number],
  label: string,
): void {
  const [minimum, maximum] = domain;

  if (
    !Number.isFinite(minimum) ||
      !Number.isFinite(maximum) ||
      !(minimum < maximum)
  ) {
    throw new RangeError(`${label} must be finite and strictly increasing.`);
  }
}

/**
 * Sample a two-parameter mathematical surface onto reusable indexed topology.
 *
 * Wrapped directions intentionally omit the duplicated endpoint sample. Their
 * last grid strip reconnects to index zero, producing a seamless periodic mesh.
 */
export function sampleParametricSurface3D({
  surface,
  uDomain,
  vDomain,
  uSegments,
  vSegments,
  wrapU = false,
  wrapV = false,
}: ParametricSurfaceSampleOptions3D): SurfaceGeometryData3D {
  assertDomain(uDomain, "uDomain");
  assertDomain(vDomain, "vDomain");

  const grid = createSurfaceGrid3D({
    uSegments,
    vSegments,
    wrapU,
    wrapV,
  });

  const positions = new Float32Array(grid.vertexCount * 3);
  const uvs = new Float32Array(grid.vertexCount * 2);
  const [minimumU, maximumU] = uDomain;
  const [minimumV, maximumV] = vDomain;

  let positionOffset = 0;
  let uvOffset = 0;

  for (let uIndex = 0; uIndex < grid.uVertexCount; uIndex += 1) {
    const uFraction = uIndex / grid.uSegments;
    const u = minimumU + (maximumU - minimumU) * uFraction;

    for (let vIndex = 0; vIndex < grid.vVertexCount; vIndex += 1) {
      const vFraction = vIndex / grid.vSegments;
      const v = minimumV + (maximumV - minimumV) * vFraction;
      const [x, y, z] = readVec3(surface(u, v));

      if (![x, y, z].every(Number.isFinite)) {
        throw new RangeError(
          `Parametric surface returned a non-finite point at u=${u}, v=${v}.`,
        );
      }

      positions[positionOffset] = x;
      positions[positionOffset + 1] = y;
      positions[positionOffset + 2] = z;
      positionOffset += 3;

      uvs[uvOffset] = uFraction;
      uvs[uvOffset + 1] = vFraction;
      uvOffset += 2;
    }
  }

  return {
    ...grid,
    positions,
    uvs,
  };
}
