import {
  sampleParametricSurface3D,
  type ParametricSurfaceMap3D,
  type SurfaceGeometryData3D,
} from "../../../../math-graphics";

const TAU = Math.PI * 2;

export const MUG = {
  bodyCenterX: -0.48,
  bodyRadius: 1.12,
  bodyHalfHeight: 1.275,

  handleMajorRadius: 0.82,
  handleTubeRadius: 0.18,
  handleEmbed: 0.14,

  handleParameterFraction: 0.38,
  upperHiddenJoinFraction: 0.07,
  lowerHiddenJoinFraction: 0.07,
} as const;

export const TORUS = {
  majorRadius: 1.32,
  minorRadius: 0.5,
} as const;

export const SURFACE_GRID = {
  uSegments: 196,
  vSegments: 56,
} as const;

export const MORPH_TIMING = {
  holdStartSeconds: 1.0,
  forwardDurationSeconds: 3.0,
  holdEndSeconds: 0.9,
  reverseDurationSeconds: 3.0,
} as const;

const HANDLE_FRACTION = MUG.handleParameterFraction;
const BODY_FRACTION = 1 - HANDLE_FRACTION;
const UPPER_JOIN = MUG.upperHiddenJoinFraction;
const LOWER_JOIN = MUG.lowerHiddenJoinFraction;
const BODY_VISIBLE_FRACTION = 1 - UPPER_JOIN - LOWER_JOIN;

const bodyRightX = MUG.bodyCenterX + MUG.bodyRadius;
const handleAttachmentX = bodyRightX - MUG.handleEmbed;

const SOLID_PROFILE = {
  topCapFraction: 0.18,
  sideFraction: 0.64,
  bottomCapFraction: 0.18,
} as const;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smoothstep = (t: number) => {
  const q = clamp01(t);
  return q * q * (3 - 2 * q);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function normalize2(x: number, y: number): readonly [number, number] {
  const length = Math.hypot(x, y);
  return length <= 1e-12 ? [1, 0] : [x / length, y / length];
}

function circularRing(
  centerX: number,
  centerY: number,
  radius: number,
  basisX: number,
  basisY: number,
  v: number,
): readonly [number, number, number] {
  const c = Math.cos(v);
  const s = Math.sin(v);

  return [
    centerX + radius * c * basisX,
    centerY + radius * c * basisY,
    radius * s,
  ];
}

function halfTorusHandle(
  t: number,
  v: number,
): readonly [number, number, number] {
  const phi = -Math.PI / 2 + Math.PI * clamp01(t);
  const ring = MUG.handleMajorRadius + MUG.handleTubeRadius * Math.cos(v);

  return [
    handleAttachmentX + ring * Math.cos(phi),
    ring * Math.sin(phi),
    MUG.handleTubeRadius * Math.sin(v),
  ];
}

function cylinderBody(
  t: number,
  v: number,
): readonly [number, number, number] {
  const topEnd = SOLID_PROFILE.topCapFraction;
  const sideEnd = topEnd + SOLID_PROFILE.sideFraction;

  if (t < topEnd) {
    const radius = MUG.bodyRadius * smoothstep(t / topEnd);

    return [
      MUG.bodyCenterX + radius * Math.cos(v),
      MUG.bodyHalfHeight,
      radius * Math.sin(v),
    ];
  }

  if (t < sideEnd) {
    const q = (t - topEnd) / SOLID_PROFILE.sideFraction;

    return [
      MUG.bodyCenterX + MUG.bodyRadius * Math.cos(v),
      lerp(MUG.bodyHalfHeight, -MUG.bodyHalfHeight, q),
      MUG.bodyRadius * Math.sin(v),
    ];
  }

  const q = smoothstep(
    (t - sideEnd) / SOLID_PROFILE.bottomCapFraction,
  );
  const radius = MUG.bodyRadius * (1 - q);

  return [
    MUG.bodyCenterX + radius * Math.cos(v),
    -MUG.bodyHalfHeight,
    radius * Math.sin(v),
  ];
}

function upperHiddenJoin(
  t: number,
  v: number,
): readonly [number, number, number] {
  const q = smoothstep(t);
  const [basisX, basisY] = normalize2(q, 1 - q);

  return circularRing(
    lerp(handleAttachmentX, MUG.bodyCenterX, q),
    lerp(MUG.handleMajorRadius, MUG.bodyHalfHeight, q),
    MUG.handleTubeRadius * (1 - q) * (1 - q),
    basisX,
    basisY,
    v,
  );
}

function lowerHiddenJoin(
  t: number,
  v: number,
): readonly [number, number, number] {
  const q = smoothstep(t);
  const [basisX, basisY] = normalize2(1 - q, -q);

  return circularRing(
    lerp(MUG.bodyCenterX, handleAttachmentX, q),
    lerp(-MUG.bodyHalfHeight, -MUG.handleMajorRadius, q),
    MUG.handleTubeRadius * q * q,
    basisX,
    basisY,
    v,
  );
}

/**
 * Complete mug surface:
 * half-torus handle -> hidden upper join -> closed cylinder -> hidden lower join.
 */
export const mugPoint: ParametricSurfaceMap3D = (u, v) => {
  const t = ((((u / TAU) % 1) + 1) % 1);

  if (t < HANDLE_FRACTION) {
    return halfTorusHandle(t / HANDLE_FRACTION, v);
  }

  const bodyT = (t - HANDLE_FRACTION) / BODY_FRACTION;

  if (bodyT < UPPER_JOIN) {
    return upperHiddenJoin(bodyT / Math.max(UPPER_JOIN, 1e-12), v);
  }

  const visibleEnd = UPPER_JOIN + BODY_VISIBLE_FRACTION;

  if (bodyT < visibleEnd) {
    return cylinderBody(
      (bodyT - UPPER_JOIN) / BODY_VISIBLE_FRACTION,
      v,
    );
  }

  return lowerHiddenJoin(
    (bodyT - visibleEnd) / Math.max(LOWER_JOIN, 1e-12),
    v,
  );
};

/**
 * Final torus. The mug handle maps to the right half; the mug body maps
 * to the left half, preserving the correspondence used by the current scene.
 */
export const torusPoint: ParametricSurfaceMap3D = (u, v) => {
  const t = ((((u / TAU) % 1) + 1) % 1);

  const phi =
    t < HANDLE_FRACTION
      ? -Math.PI / 2 + Math.PI * (t / HANDLE_FRACTION)
      : Math.PI / 2 +
        Math.PI * ((t - HANDLE_FRACTION) / BODY_FRACTION);

  const ring = TORUS.majorRadius + TORUS.minorRadius * Math.cos(v);

  return [
    ring * Math.cos(phi),
    ring * Math.sin(phi),
    TORUS.minorRadius * Math.sin(v),
  ];
};

function sample(
  surface: ParametricSurfaceMap3D,
): SurfaceGeometryData3D {
  return sampleParametricSurface3D({
    surface,
    uDomain: [0, TAU],
    vDomain: [0, TAU],
    uSegments: SURFACE_GRID.uSegments,
    vSegments: SURFACE_GRID.vSegments,
    wrapU: true,
    wrapV: true,
  });
}

export function createMugToDonutGeometry(): {
  mugGeometry: SurfaceGeometryData3D;
  torusGeometry: SurfaceGeometryData3D;
} {
  return {
    mugGeometry: sample(mugPoint),
    torusGeometry: sample(torusPoint),
  };
}
