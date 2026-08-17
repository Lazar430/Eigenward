import {
  type ParametricSurfaceMap3D,
  type SurfaceGeometryData3D,
} from "../../../../math-graphics";

const TAU = Math.PI * 2;

type Vec3 = readonly [number, number, number];

export const BODY = {
  sphereRadius: 1.7,

  halfLengthX: 2.2,
  halfHeightY: 1.28,
  halfWidthZ: 1.22,

  roundnessPower: 5.2,
} as const;

export const HEAD = {
  backX: 1.48,
  frontX: 3.30,

  backCenterY: 0.28,
  frontCenterY: 0.16,

  backHalfHeight: 0.88,
  frontHalfHeight: 0.69,

  backHalfWidth: 0.92,
  frontHalfWidth: 0.97,

  /*
   * Cross-section remains rounded-rectangular, but the front/rear ends use a
   * much softer power so they roll continuously into the side walls instead
   * of terminating in a flat cap.
   */
  longitudinalRoundnessPower: 3.4,
  crossSectionRoundnessPower: 5.5,
} as const;

/**
 * Smooth rounded-rectangular legs.
 *
 * These dimensions preserve the current visual proportions; the important
 * change is HOW the legs are meshed, not their size.
 */
export const LEGS = {
  length: 1.25,

  centerX: 1.0,
  centerZ: 0.80,

  halfWidthX: 0.43,
  halfWidthZ: 0.36,

  bodyOverlap: 0.24,

  /*
   * p > 2 makes a superellipsoid boxy while remaining mathematically smooth.
   * 8 gives broad almost-flat faces with smoothly rounded edges.
   */
  roundnessPower: 8.0,

  /*
   * Smooth implicit union radius between torso and legs.
   */
  unionSmoothness: 0.075,
} as const;


/**
 * Two simple ears, kept congruent with the rounded/blocky construction so far.
 *
 * Each ear is a flattened rounded rectangular solid attached to the upper
 * sides of the head. It is tilted slightly upward as it extends outward.
 */
export const EARS = {
  centerX: 1.92,
  centerY: 0.82,
  centerZ: 0.93,

  halfLengthX: 0.38,
  halfHeightY: 0.20,
  halfLengthZ: 0.52,

  tiltRadians: 0.28,
  roundnessPower: 4.6,
  unionSmoothness: 0.065,
} as const;

/**
 * Two smooth horns growing from the crown of the head.
 *
 * They are tapered rounded sweeps, not separate meshes: base, shaft and rounded
 * tip all belong to the same implicit cow surface and therefore participate in
 * the same cow -> sphere morph.
 */
export const HORNS = {
  baseX: 2.10,
  baseY: 0.91,
  baseZ: 0.54,

  length: 0.72,

  directionX: -0.10,
  directionY: 0.90,
  directionZ: 0.43,

  baseRadius: 0.17,
  tipRadius: 0.055,
  taperPower: 1.15,

  unionSmoothness: 0.055,
} as const;

export const COW_TO_SPHERE_TIMING = {
  holdStartSeconds: 1.1,
  forwardDurationSeconds: 2.9,
  holdEndSeconds: 0.95,
  reverseDurationSeconds: 2.9,
} as const;

/**
 * Resolution of the ONE-TIME implicit mesh extraction.
 *
 * This no longer controls latitude/longitude bands. The mesh is generated
 * directly in ordinary xyz space, so the old leg ridges cannot occur.
 */
const IMPLICIT_GRID = {
  /*
   * Slightly denser than the body/head/legs-only version so the relatively
   * narrow horns and the thin ear edges are sampled cleanly.
   */
  xCells: 72,
  yCells: 80,
  zCells: 64,

  minX: -2.65,
  maxX: 3.62,

  minY: -3.90,
  maxY: 1.95,

  minZ: -1.88,
  maxZ: 1.88,
} as const;

/* ============================================================================
BASIC MATH
============================================================================ */

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sphereDirection(
  u: number,
  v: number,
): Vec3 {
  const sinV = Math.sin(v);

  return [
    Math.cos(u) * sinV,
    Math.cos(v),
    Math.sin(u) * sinV,
  ];
}


function normalizeVec3(
  x: number,
  y: number,
  z: number,
): Vec3 {
  const length =
    Math.max(
      Math.hypot(x, y, z),
      1e-12,
    );

  return [
    x / length,
    y / length,
    z / length,
  ];
}

/**
 * A smooth rounded rectangular solid:
 *
 *   (|x/a|^p + |y/b|^p + |z/c|^p)^(1/p) - 1
 *
 * p = 2  -> ellipsoid
 * p >> 2 -> rounded rectangular box
 *
 * Unlike a max()/rounded-box SDF, this field is smooth over the whole visible
 * leg surface. There are no piecewise face/edge transitions to shade as ridges.
 */
function superBoxField(
  x: number,
  y: number,
  z: number,
  centerX: number,
  centerY: number,
  centerZ: number,
  halfX: number,
  halfY: number,
  halfZ: number,
  power: number,
): number {
  const nx =
    Math.abs(
      (x - centerX) /
	halfX,
    );

  const ny =
    Math.abs(
      (y - centerY) /
	halfY,
    );

  const nz =
    Math.abs(
      (z - centerZ) /
	halfZ,
    );

  return (
    Math.pow(
      Math.pow(nx, power) +
        Math.pow(ny, power) +
        Math.pow(nz, power),
      1 / power,
    ) -
      1
  );
}

/**
 * C-infinity soft minimum.
 *
 * This avoids a hard crease where an attached leg enters the torso.
 */
function smoothMinimum(
  a: number,
  b: number,
  softness: number,
): number {
  if (softness <= 1e-12) {
    return Math.min(a, b);
  }

  const minimum = Math.min(a, b);

  return (
    minimum -
      softness *
	Math.log(
          Math.exp(
            (minimum - a) /
              softness,
          ) +
            Math.exp(
              (minimum - b) /
		softness,
            ),
	)
  );
}

/* ============================================================================
TORSO
============================================================================ */

function bodyField(
  x: number,
  y: number,
  z: number,
): number {
  return superBoxField(
    x,
    y,
    z,
    0,
    0,
    0,
    BODY.halfLengthX,
    BODY.halfHeightY,
    BODY.halfWidthZ,
    BODY.roundnessPower,
  );
}

/* ============================================================================
ROUNDED TRAPEZOID HEAD
============================================================================ */

function headField(
  x: number,
  y: number,
  z: number,
): number {
  const centerX =
    (HEAD.backX + HEAD.frontX) /
      2;

  const halfLength =
    (HEAD.frontX - HEAD.backX) /
      2;

  /*
   * longitudinal = -1 at the rear/neck end
   * longitudinal = +1 at the muzzle end
   */
  const longitudinal =
    (x - centerX) /
      halfLength;

  /*
   * The head is a genuine rounded trapezoid:
   * its center, height and width vary continuously from back to front.
   *
   * We clamp only the interpolation parameter used to choose the section size;
   * the actual longitudinal coordinate remains un-clamped and therefore still
   * closes the solid smoothly beyond each end.
   */
  const progress =
    clamp01(
      0.5 *
        (longitudinal + 1),
    );

  const centerY =
    lerp(
      HEAD.backCenterY,
      HEAD.frontCenterY,
      progress,
    );

  const halfHeight =
    lerp(
      HEAD.backHalfHeight,
      HEAD.frontHalfHeight,
      progress,
    );

  const halfWidth =
    lerp(
      HEAD.backHalfWidth,
      HEAD.frontHalfWidth,
      progress,
    );

  /*
   * Rounded-rectangle yz cross-section.
   */
  const crossPower =
    HEAD.crossSectionRoundnessPower;

  const crossRadius =
    Math.pow(
      Math.pow(
        Math.abs(
          (y - centerY) /
            halfHeight,
        ),
        crossPower,
      ) +
        Math.pow(
          Math.abs(
            z /
              halfWidth,
          ),
          crossPower,
        ),
      1 / crossPower,
    );

  /*
   * Smooth closure of the front and rear.
   *
   * The previous implementation used
   *
   *     max(longitudinalPart, crossSection)
   *
   * which creates an almost planar terminal face: visually it looks as though
   * the muzzle has been sliced off.
   *
   * Here the longitudinal and cross-sectional distances are combined with one
   * smooth L^p norm instead. The surface therefore bends continuously around
   * the muzzle and neck ends, like a rounded rectangular/trapezoidal solid.
   */
  const p =
    HEAD.longitudinalRoundnessPower;

  return (
    Math.pow(
      Math.pow(
        Math.abs(longitudinal),
        p,
      ) +
        Math.pow(
          crossRadius,
          p,
        ),
      1 / p,
    ) -
      1
  );
}

/* ============================================================================
FOUR SMOOTH ROUNDED-RECTANGULAR LEGS
============================================================================ */

const legTopY =
  -BODY.halfHeightY +
    LEGS.bodyOverlap;

const legBottomY =
  legTopY -
    LEGS.length;

const legCenterY =
  (legTopY + legBottomY) /
    2;

const legHalfHeight =
  (legTopY - legBottomY) /
    2;

function oneLegField(
  x: number,
  y: number,
  z: number,
  centerX: number,
  centerZ: number,
): number {
  return superBoxField(
    x,
    y,
    z,
    centerX,
    legCenterY,
    centerZ,
    LEGS.halfWidthX,
    legHalfHeight,
    LEGS.halfWidthZ,
    LEGS.roundnessPower,
  );
}

function legsField(
  x: number,
  y: number,
  z: number,
): number {
  return Math.min(
    oneLegField(
      x,
      y,
      z,
      LEGS.centerX,
      LEGS.centerZ,
    ),
    oneLegField(
      x,
      y,
      z,
      LEGS.centerX,
      -LEGS.centerZ,
    ),
    oneLegField(
      x,
      y,
      z,
      -LEGS.centerX,
      LEGS.centerZ,
    ),
    oneLegField(
      x,
      y,
      z,
      -LEGS.centerX,
      -LEGS.centerZ,
    ),
  );
}

/* ============================================================================
TWO FLATTENED ROUNDED-RECTANGULAR EARS
============================================================================ */

/**
 * Mirror-aware ear field.
 *
 * We work in local (y,z) coordinates and rotate that plane around the x-axis.
 * The outer end of each ear rises slightly, while the inner end overlaps the
 * head so there is no detached/floating geometry.
 */
function oneEarField(
  x: number,
  y: number,
  z: number,
  side: -1 | 1,
): number {
  const dx =
    x - EARS.centerX;

  const dy =
    y - EARS.centerY;

  /*
   * Mirror the right/left ears into one common "outward positive z" frame.
   */
  const outwardZ =
    side * z -
      EARS.centerZ;

  const cosine =
    Math.cos(
      EARS.tiltRadians,
    );

  const sine =
    Math.sin(
      EARS.tiltRadians,
    );

  /*
   * Rotate the local yz-plane so the ear's long axis points outward and a
   * little upward.
   */
  const localY =
    cosine * dy -
      sine * outwardZ;

  const localZ =
    sine * dy +
      cosine * outwardZ;

  return superBoxField(
    dx,
    localY,
    localZ,
    0,
    0,
    0,
    EARS.halfLengthX,
    EARS.halfHeightY,
    EARS.halfLengthZ,
    EARS.roundnessPower,
  );
}

function earsField(
  x: number,
  y: number,
  z: number,
): number {
  return Math.min(
    oneEarField(
      x,
      y,
      z,
      1,
    ),
    oneEarField(
      x,
      y,
      z,
      -1,
    ),
  );
}

/* ============================================================================
TWO TAPERED, ROUNDED HORNS
============================================================================ */

const hornDirection =
  normalizeVec3(
    HORNS.directionX,
    HORNS.directionY,
    HORNS.directionZ,
  );

/**
 * Smooth tapered capsule-like horn.
 *
 * `side` mirrors the horn across z=0.
 *
 * The axis is a finite segment. Radius decreases continuously from base to
 * tip. Because the distance is measured to the clamped segment, the final tip
 * closes as a rounded cap instead of ending in a flat cut.
 */
function oneHornField(
  x: number,
  y: number,
  z: number,
  side: -1 | 1,
): number {
  const baseX =
    HORNS.baseX;

  const baseY =
    HORNS.baseY;

  const baseZ =
    side *
      HORNS.baseZ;

  const axisX =
    hornDirection[0];

  const axisY =
    hornDirection[1];

  const axisZ =
    side *
      hornDirection[2];

  const rx =
    x - baseX;

  const ry =
    y - baseY;

  const rz =
    z - baseZ;

  const along =
    rx * axisX +
      ry * axisY +
      rz * axisZ;

  const progress =
    clamp01(
      along /
	HORNS.length,
    );

  const closestX =
    baseX +
      axisX *
	HORNS.length *
	progress;

  const closestY =
    baseY +
      axisY *
	HORNS.length *
	progress;

  const closestZ =
    baseZ +
      axisZ *
	HORNS.length *
	progress;

  const radialDistance =
    Math.hypot(
      x - closestX,
      y - closestY,
      z - closestZ,
    );

  const taper =
    Math.pow(
      1 - progress,
      HORNS.taperPower,
    );

  const radius =
    lerp(
      HORNS.tipRadius,
      HORNS.baseRadius,
      taper,
    );

  /*
   * Normalize by base radius so this field has roughly the same scale as our
   * superbox fields before entering smoothMinimum().
   */
  return (
    radialDistance -
      radius
  ) /
    HORNS.baseRadius;
}

function hornsField(
  x: number,
  y: number,
  z: number,
): number {
  return Math.min(
    oneHornField(
      x,
      y,
      z,
      1,
    ),
    oneHornField(
      x,
      y,
      z,
      -1,
    ),
  );
}

/* ============================================================================
COW-SO-FAR IMPLICIT FIELD
============================================================================ */

function cowField(
  x: number,
  y: number,
  z: number,
): number {
  const torsoAndHead =
    smoothMinimum(
      bodyField(x, y, z),
      headField(x, y, z),
      0.045,
    );

  const withLegs =
    smoothMinimum(
      torsoAndHead,
      legsField(x, y, z),
      LEGS.unionSmoothness,
    );

  const withEars =
    smoothMinimum(
      withLegs,
      earsField(x, y, z),
      EARS.unionSmoothness,
    );

  return smoothMinimum(
    withEars,
    hornsField(x, y, z),
    HORNS.unionSmoothness,
  );
}

/* ============================================================================
MARCHING TETRAHEDRA
----------------------------------------------------------------------------
									    IMPORTANT FIX FOR THE RIDGES

   The old implementation forced the whole cow through a latitude/longitude
   sphere parameterization and searched outward along rays from the origin.

   A long narrow leg is NOT naturally represented by those rays. Adjacent
   latitude/longitude strips kept changing which portion of the leg they hit,
   producing the visible chainsaw/ridge pattern.

   We do not do that anymore.

   We sample cowField() directly in xyz space and triangulate its zero-level
   surface. The resulting cow mesh is then used as the fixed topology for the
   entire morph. The sphere target is made by radially normalizing THESE SAME
   vertices, so MorphableSurface3D still gets one persistent compatible mesh.
   ============================================================================ */

interface GridPoint {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly value: number;
}

const TETRAHEDRA = [
  [0, 5, 1, 6],
  [0, 1, 2, 6],
  [0, 2, 3, 6],
  [0, 3, 7, 6],
  [0, 7, 4, 6],
  [0, 4, 5, 6],
] as const;

function fieldGradient(
  x: number,
  y: number,
  z: number,
): Vec3 {
  const h = 0.0025;

  const gx =
    cowField(
      x + h,
      y,
      z,
    ) -
      cowField(
	x - h,
	y,
	z,
      );

  const gy =
    cowField(
      x,
      y + h,
      z,
    ) -
      cowField(
	x,
	y - h,
	z,
      );

  const gz =
    cowField(
      x,
      y,
      z + h,
    ) -
      cowField(
	x,
	y,
	z - h,
      );

  return [
    gx / (2 * h),
    gy / (2 * h),
    gz / (2 * h),
  ];
}

/**
 * Pull a linearly interpolated marching vertex onto the actual implicit
 * surface. This removes the tiny voxel-grid waviness that ordinary marching
 * methods can leave on broad smooth faces.
 */
function projectOntoSurface(
  point: Vec3,
): Vec3 {
  let x = point[0];
  let y = point[1];
  let z = point[2];

  for (
    let iteration = 0;
    iteration < 4;
    iteration += 1
  ) {
    const value =
      cowField(x, y, z);

    const [
      gx,
      gy,
      gz,
    ] =
      fieldGradient(
        x,
        y,
        z,
      );

    const lengthSquared =
      gx * gx +
	gy * gy +
	gz * gz;

    if (
      lengthSquared <= 1e-12
    ) {
      break;
    }

    const step =
      value /
	lengthSquared;

    x -= step * gx;
    y -= step * gy;
    z -= step * gz;
  }

  return [x, y, z];
}

function buildCowMesh():
  SurfaceGeometryData3D {
  const nx =
    IMPLICIT_GRID.xCells;

  const ny =
    IMPLICIT_GRID.yCells;

  const nz =
    IMPLICIT_GRID.zCells;

  const gx = nx + 1;
  const gy = ny + 1;
  const gz = nz + 1;

  const totalGridPoints =
    gx * gy * gz;

  const values =
    new Float32Array(
      totalGridPoints,
    );

  const xs =
    new Float32Array(gx);

  const ys =
    new Float32Array(gy);

  const zs =
    new Float32Array(gz);

  for (
    let i = 0;
    i < gx;
    i += 1
  ) {
    xs[i] =
      lerp(
        IMPLICIT_GRID.minX,
        IMPLICIT_GRID.maxX,
        i / nx,
      );
  }

  for (
    let j = 0;
    j < gy;
    j += 1
  ) {
    ys[j] =
      lerp(
        IMPLICIT_GRID.minY,
        IMPLICIT_GRID.maxY,
        j / ny,
      );
  }

  for (
    let k = 0;
    k < gz;
    k += 1
  ) {
    zs[k] =
      lerp(
        IMPLICIT_GRID.minZ,
        IMPLICIT_GRID.maxZ,
        k / nz,
      );
  }

  const gridIndex = (
    i: number,
    j: number,
    k: number,
  ): number =>
    (i * gy + j) * gz + k;

  /*
   * Sample the scalar field only once.
   */
  for (
    let i = 0;
    i < gx;
    i += 1
  ) {
    for (
      let j = 0;
      j < gy;
      j += 1
    ) {
      for (
        let k = 0;
        k < gz;
        k += 1
      ) {
        values[
          gridIndex(i, j, k)
        ] =
          cowField(
            xs[i],
            ys[j],
            zs[k],
          );
      }
    }
  }

  const positions: number[] = [];
  const indices: number[] = [];

  /*
   * Intersection vertices are shared between neighboring tetrahedra/cubes.
   * This is essential: shared vertices give Three.js one smooth averaged normal
   * field instead of independent faceted triangles.
   */
  const edgeVertex =
    new Map<number, number>();

  const getEdgeVertex = (
    a: GridPoint,
    b: GridPoint,
  ): number => {
    const smaller =
      Math.min(
        a.id,
        b.id,
      );

    const larger =
      Math.max(
        a.id,
        b.id,
      );

    const key =
      smaller *
	totalGridPoints +
	larger;

    const existing =
      edgeVertex.get(key);

    if (
      existing !== undefined
    ) {
      return existing;
    }

    const denominator =
      b.value - a.value;

    const t =
      Math.abs(denominator) <=
	1e-12
        ? 0.5
        : clamp01(
          -a.value /
            denominator,
        );

    const raw: Vec3 = [
      lerp(a.x, b.x, t),
      lerp(a.y, b.y, t),
      lerp(a.z, b.z, t),
    ];

    const [
      x,
      y,
      z,
    ] =
      projectOntoSurface(raw);

    const vertexIndex =
      positions.length / 3;

    positions.push(
      x,
      y,
      z,
    );

    edgeVertex.set(
      key,
      vertexIndex,
    );

    return vertexIndex;
  };

  const orientTriangle = (
    ia: number,
    ib: number,
    ic: number,
  ): void => {
    const ax =
      positions[ia * 3];

    const ay =
      positions[ia * 3 + 1];

    const az =
      positions[ia * 3 + 2];

    const bx =
      positions[ib * 3];

    const by =
      positions[ib * 3 + 1];

    const bz =
      positions[ib * 3 + 2];

    const cx =
      positions[ic * 3];

    const cy =
      positions[ic * 3 + 1];

    const cz =
      positions[ic * 3 + 2];

    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;

    const acx = cx - ax;
    const acy = cy - ay;
    const acz = cz - az;

    const nx =
      aby * acz -
	abz * acy;

    const ny =
      abz * acx -
	abx * acz;

    const nz =
      abx * acy -
	aby * acx;

    const mx =
      (ax + bx + cx) / 3;

    const my =
      (ay + by + cy) / 3;

    const mz =
      (az + bz + cz) / 3;

    const [
      gx,
      gy,
      gz,
    ] =
      fieldGradient(
        mx,
        my,
        mz,
      );

    if (
      nx * gx +
        ny * gy +
        nz * gz
      >= 0
    ) {
      indices.push(
        ia,
        ib,
        ic,
      );
    } else {
      indices.push(
        ia,
        ic,
        ib,
      );
    }
  };

  const polygoniseTetrahedron = (
    tetra: readonly [
      GridPoint,
      GridPoint,
      GridPoint,
      GridPoint,
    ],
  ): void => {
    const inside: number[] = [];
    const outside: number[] = [];

    for (
      let local = 0;
      local < 4;
      local += 1
    ) {
      if (
        tetra[local].value <= 0
      ) {
        inside.push(local);
      } else {
        outside.push(local);
      }
    }

    if (
      inside.length === 0 ||
	inside.length === 4
    ) {
      return;
    }

    if (inside.length === 1) {
      const i = inside[0];

      const a =
        getEdgeVertex(
          tetra[i],
          tetra[outside[0]],
        );

      const b =
        getEdgeVertex(
          tetra[i],
          tetra[outside[1]],
        );

      const c =
        getEdgeVertex(
          tetra[i],
          tetra[outside[2]],
        );

      orientTriangle(a, b, c);
      return;
    }

    if (inside.length === 3) {
      const o = outside[0];

      const a =
        getEdgeVertex(
          tetra[o],
          tetra[inside[0]],
        );

      const b =
        getEdgeVertex(
          tetra[o],
          tetra[inside[1]],
        );

      const c =
        getEdgeVertex(
          tetra[o],
          tetra[inside[2]],
        );

      orientTriangle(a, b, c);
      return;
    }

    /*
     * Two inside, two outside -> one quadrilateral.
     */
    const i0 = inside[0];
    const i1 = inside[1];
    const o0 = outside[0];
    const o1 = outside[1];

    const a =
      getEdgeVertex(
        tetra[i0],
        tetra[o0],
      );

    const b =
      getEdgeVertex(
        tetra[i0],
        tetra[o1],
      );

    const c =
      getEdgeVertex(
        tetra[i1],
        tetra[o1],
      );

    const d =
      getEdgeVertex(
        tetra[i1],
        tetra[o0],
      );

    orientTriangle(a, b, c);
    orientTriangle(a, c, d);
  };

  for (
    let i = 0;
    i < nx;
    i += 1
  ) {
    for (
      let j = 0;
      j < ny;
      j += 1
    ) {
      for (
        let k = 0;
        k < nz;
        k += 1
      ) {
        const coordinates = [
          [i, j, k],
          [i + 1, j, k],
          [i + 1, j + 1, k],
          [i, j + 1, k],

          [i, j, k + 1],
          [i + 1, j, k + 1],
          [i + 1, j + 1, k + 1],
          [i, j + 1, k + 1],
        ] as const;

        const corners =
          coordinates.map(
            ([
              ci,
              cj,
              ck,
            ]) => {
              const id =
                gridIndex(
                  ci,
                  cj,
                  ck,
                );

              return {
                id,
                x: xs[ci],
                y: ys[cj],
                z: zs[ck],
                value:
                  values[id],
              };
            },
          );

        for (
          const tetraIndices
          of TETRAHEDRA
        ) {
          polygoniseTetrahedron([
            corners[
              tetraIndices[0]
            ],
            corners[
              tetraIndices[1]
            ],
            corners[
              tetraIndices[2]
            ],
            corners[
              tetraIndices[3]
            ],
          ]);
        }
      }
    }
  }

  const vertexCount =
    positions.length / 3;

  const triangleCount =
    indices.length / 3;

  if (
    vertexCount === 0 ||
      triangleCount === 0
  ) {
    throw new Error(
      "Implicit cow mesh extraction produced no surface.",
    );
  }

  const uvs =
    new Float32Array(
      vertexCount * 2,
    );

  /*
   * Spherical UVs are only metadata here; this scene currently uses no texture.
   */
  for (
    let index = 0;
    index < vertexCount;
    index += 1
  ) {
    const x =
      positions[index * 3];

    const y =
      positions[index * 3 + 1];

    const z =
      positions[index * 3 + 2];

    const radius =
      Math.max(
        Math.hypot(x, y, z),
        1e-12,
      );

    uvs[index * 2] =
      (
        Math.atan2(z, x) /
          TAU +
          1
      ) % 1;

    uvs[index * 2 + 1] =
      Math.acos(
        Math.max(
          -1,
          Math.min(
            1,
            y / radius,
          ),
        ),
      ) /
	Math.PI;
  }

  /*
   * SurfaceGeometryData3D originated as a rectangular-grid data type. Surface3D
   * and MorphableSurface3D only require the counts, buffers and connectivity,
   * so these bookkeeping values identify this arbitrary fixed topology.
   */
  return {
    uSegments:
      vertexCount,
    vSegments: 1,

    uVertexCount:
      vertexCount,
    vVertexCount: 1,

    wrapU: false,
    wrapV: false,

    vertexCount,
    triangleCount,

    indices:
      Uint32Array.from(
        indices,
      ),

    positions:
      Float32Array.from(
        positions,
      ),

    uvs,
  };
}


function smoothstep01(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function retractEarForSphere(
  x: number,
  y: number,
  z: number,
): Vec3 {
  const side: -1 | 1 = z >= 0 ? 1 : -1;
  const dx = x - EARS.centerX;
  const dy = y - EARS.centerY;
  const outwardZ = side * z - EARS.centerZ;

  const cosine = Math.cos(EARS.tiltRadians);
  const sine = Math.sin(EARS.tiltRadians);

  const localY = cosine * dy - sine * outwardZ;
  const localZ = sine * dy + cosine * outwardZ;

  const dxRegion = Math.abs(dx) / (EARS.halfLengthX * 1.25);
  const dyRegion = Math.abs(localY) / (EARS.halfHeightY * 2.0);
  const dzRegion = Math.abs(localZ) / (EARS.halfLengthZ * 1.15);
  const region = Math.max(dxRegion, dyRegion, dzRegion);
  const mask = smoothstep01(1 - region);

  if (mask <= 1e-5) {
    return [x, y, z];
  }

  const collapsedLocalY = localY * 0.28;
  const collapsedLocalZ = Math.min(localZ, EARS.halfLengthZ * 0.09);

  const collapsedDy = cosine * collapsedLocalY + sine * collapsedLocalZ;
  const collapsedOutwardZ = -sine * collapsedLocalY + cosine * collapsedLocalZ;

  const targetX = EARS.centerX + dx;
  const targetY = EARS.centerY + collapsedDy;
  const targetZ = side * (EARS.centerZ + collapsedOutwardZ);

  return [
    lerp(x, targetX, mask),
    lerp(y, targetY, mask),
    lerp(z, targetZ, mask),
  ];
}

function retractHornForSphere(
  x: number,
  y: number,
  z: number,
): Vec3 {
  const side: -1 | 1 = z >= 0 ? 1 : -1;

  const baseX = HORNS.baseX;
  const baseY = HORNS.baseY;
  const baseZ = side * HORNS.baseZ;

  const axisX = hornDirection[0];
  const axisY = hornDirection[1];
  const axisZ = side * hornDirection[2];

  const rx = x - baseX;
  const ry = y - baseY;
  const rz = z - baseZ;

  const along = rx * axisX + ry * axisY + rz * axisZ;
  const clampedAlong = clamp01(along / HORNS.length) * HORNS.length;

  const axisPointX = baseX + axisX * clampedAlong;
  const axisPointY = baseY + axisY * clampedAlong;
  const axisPointZ = baseZ + axisZ * clampedAlong;

  const radialX = x - axisPointX;
  const radialY = y - axisPointY;
  const radialZ = z - axisPointZ;
  const radialLength = Math.max(Math.hypot(radialX, radialY, radialZ), 1e-12);

  const radialRegion = radialLength / (HORNS.baseRadius * 1.8);
  const alongRegion = (along + HORNS.length * 0.08) / (HORNS.length * 0.28);

  const radialMask = smoothstep01(1 - radialRegion);
  const alongMask = smoothstep01(alongRegion);
  const mask = radialMask * alongMask;

  if (mask <= 1e-5) {
    return [x, y, z];
  }

  const collapsedAlong = clampedAlong * 0.10;
  const collapsedRadiusScale = 0.18;

  const collapsedAxisX = baseX + axisX * collapsedAlong;
  const collapsedAxisY = baseY + axisY * collapsedAlong;
  const collapsedAxisZ = baseZ + axisZ * collapsedAlong;

  const targetX = collapsedAxisX + radialX * collapsedRadiusScale;
  const targetY = collapsedAxisY + radialY * collapsedRadiusScale;
  const targetZ = collapsedAxisZ + radialZ * collapsedRadiusScale;

  return [
    lerp(x, targetX, mask),
    lerp(y, targetY, mask),
    lerp(z, targetZ, mask),
  ];
}

function createSphereCorrespondencePoint(
  x: number,
  y: number,
  z: number,
): Vec3 {
  const earRetracted = retractEarForSphere(x, y, z);
  const hornRetracted = retractHornForSphere(
    earRetracted[0],
    earRetracted[1],
    earRetracted[2],
  );

  return hornRetracted;
}

/* ============================================================================
SAME FIXED TOPOLOGY -> SPHERE
----------------------------------------------------------------------------
									    Once we have the smooth cow mesh, the sphere target is trivial: normalize
									    every cow vertex to sphereRadius while keeping THE EXACT SAME index buffer.
									    ============================================================================ */

function createSphereTarget(
  cowGeometry:
    SurfaceGeometryData3D,
): SurfaceGeometryData3D {
  const positions =
    new Float32Array(
      cowGeometry.positions.length,
    );

  for (
    let offset = 0;
    offset < positions.length;
    offset += 3
  ) {
    const x =
      cowGeometry.positions[
        offset
      ];

    const y =
      cowGeometry.positions[
        offset + 1
      ];

    const z =
      cowGeometry.positions[
        offset + 2
      ];

    /*
     * Important correspondence tweak:
     *
     * Ears and horns should NOT already be visibly embossed on the initial
     * sphere. So before normalizing to the source sphere, we retract points in
     * those regions back into the head. This keeps the first part of the morph
     * visually identical to the earlier body/head/legs emergence, and only
     * later allows the ears and horns to peel out of the head as the global
     * morph approaches the final cow.
     */
    const [sourceX, sourceY, sourceZ] =
      createSphereCorrespondencePoint(
        x,
        y,
        z,
      );

    const length =
      Math.max(
        Math.hypot(
          sourceX,
          sourceY,
          sourceZ,
        ),
        1e-12,
      );

    const scale =
      BODY.sphereRadius /
	length;

    positions[offset] =
      sourceX * scale;

    positions[offset + 1] =
      sourceY * scale;

    positions[offset + 2] =
      sourceZ * scale;
  }

  return {
    ...cowGeometry,
    positions,
    indices:
      new Uint32Array(
        cowGeometry.indices,
      ),
    uvs:
      new Float32Array(
        cowGeometry.uvs,
      ),
  };
}

/**
 * Kept only so the existing scene/debug API still compiles.
 *
 * Rendering no longer uses this ray parameterization; createCowToSphereGeometry
 * uses the direct xyz implicit mesh above.
 */
export const cowPoint:
  ParametricSurfaceMap3D =
  (u, v) => {
    const direction =
      sphereDirection(u, v);

    const maximumRadius =
      5.8;

    const steps = 200;
    let lastInside = 0;

    for (
      let step = 0;
      step <= steps;
      step += 1
    ) {
      const radius =
        maximumRadius *
          step /
          steps;

      if (
        cowField(
          direction[0] *
            radius,
          direction[1] *
            radius,
          direction[2] *
            radius,
        ) <= 0
      ) {
        lastInside =
          radius;
      }
    }

    return [
      direction[0] *
        lastInside,
      direction[1] *
        lastInside,
      direction[2] *
        lastInside,
    ];
  };

export const spherePoint:
  ParametricSurfaceMap3D =
  (u, v) => {
    const [
      dx,
      dy,
      dz,
    ] =
      sphereDirection(u, v);

    return [
      BODY.sphereRadius * dx,
      BODY.sphereRadius * dy,
      BODY.sphereRadius * dz,
    ];
  };

let cachedGeometry:
  | {
    cowGeometry:
        SurfaceGeometryData3D;
    sphereGeometry:
        SurfaceGeometryData3D;
  }
  | undefined;

export function
createCowToSphereGeometry(): {
  cowGeometry:
    SurfaceGeometryData3D;
  sphereGeometry:
    SurfaceGeometryData3D;
} {
  if (cachedGeometry) {
    return cachedGeometry;
  }

  const cowGeometry =
    buildCowMesh();

  const sphereGeometry =
    createSphereTarget(
      cowGeometry,
    );

  cachedGeometry = {
    cowGeometry,
    sphereGeometry,
  };

  return cachedGeometry;
}
