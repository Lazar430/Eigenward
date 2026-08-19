import type { Vec2Tuple } from "../core/types";

const EPSILON = 1e-10;
const TAU = Math.PI * 2;

export type SegmentEndpoints2D = readonly [Vec2Tuple, Vec2Tuple];
export type AngleDirection2D = "counterclockwise" | "clockwise";

export interface PointProjection2D {
  /** Orthogonal projection of the point onto the infinite line. */
  point: Vec2Tuple;
  /** t in lineStart + t(lineEnd - lineStart). */
  lineParameter: number;
  /**
   * Signed perpendicular distance from the line.
   * Positive means the point lies to the left of lineStart -> lineEnd.
   */
  signedDistance: number;
}

export interface AltitudeConstruction2D {
  vertex: Vec2Tuple;
  foot: Vec2Tuple;
  segment: SegmentEndpoints2D;
  lineParameter: number;
  signedDistance: number;
}

export interface LineIntersection2D {
  point: Vec2Tuple;
  /** t in firstStart + t(firstEnd - firstStart). */
  firstParameter: number;
  /** u in secondStart + u(secondEnd - secondStart). */
  secondParameter: number;
}

export interface RayLineIntersection2D {
  point: Vec2Tuple;
  /** Nonnegative parameter in origin + t * direction. */
  rayParameter: number;
  /** u in lineStart + u(lineEnd - lineStart). */
  lineParameter: number;
}

export interface AngleBisectorRay2D {
  origin: Vec2Tuple;
  direction: Vec2Tuple;
}

export interface MinorAngleSector2D {
  center: Vec2Tuple;
  startAngle: number;
  endAngle: number;
  direction: AngleDirection2D;
  /** Positive interior angle in radians, always in [0, pi]. */
  sweep: number;
}

function assertFinitePoint(point: Vec2Tuple, label: string): void {
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    throw new RangeError(`${label} must contain two finite numbers.`);
  }
}

function assertNonzeroVector(vector: Vec2Tuple, label: string): void {
  if (Math.hypot(vector[0], vector[1]) <= EPSILON) {
    throw new RangeError(`${label} must be nonzero.`);
  }
}

function subtract2D(a: Vec2Tuple, b: Vec2Tuple): Vec2Tuple {
  return [a[0] - b[0], a[1] - b[1]];
}

function add2D(a: Vec2Tuple, b: Vec2Tuple): Vec2Tuple {
  return [a[0] + b[0], a[1] + b[1]];
}

function scale2D(vector: Vec2Tuple, scalar: number): Vec2Tuple {
  return [vector[0] * scalar, vector[1] * scalar];
}

function dot2D(a: Vec2Tuple, b: Vec2Tuple): number {
  return a[0] * b[0] + a[1] * b[1];
}

function cross2D(a: Vec2Tuple, b: Vec2Tuple): number {
  return a[0] * b[1] - a[1] * b[0];
}

function normalize2D(vector: Vec2Tuple, label = "vector"): Vec2Tuple {
  assertNonzeroVector(vector, label);
  const length = Math.hypot(vector[0], vector[1]);
  return [vector[0] / length, vector[1] / length];
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

export function distance2D(a: Vec2Tuple, b: Vec2Tuple): number {
  assertFinitePoint(a, "a");
  assertFinitePoint(b, "b");
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function midpoint2D(a: Vec2Tuple, b: Vec2Tuple): Vec2Tuple {
  assertFinitePoint(a, "a");
  assertFinitePoint(b, "b");
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/** Affine point a + t(b-a). t need not lie in [0,1]. */
export function pointOnLine2D(
  a: Vec2Tuple,
  b: Vec2Tuple,
  parameter: number,
): Vec2Tuple {
  assertFinitePoint(a, "a");
  assertFinitePoint(b, "b");

  if (!Number.isFinite(parameter)) {
    throw new RangeError("parameter must be finite.");
  }

  return [
    a[0] + parameter * (b[0] - a[0]),
    a[1] + parameter * (b[1] - a[1]),
  ];
}

/** Unit direction from start to end. */
export function lineDirection2D(
  start: Vec2Tuple,
  end: Vec2Tuple,
): Vec2Tuple {
  assertFinitePoint(start, "start");
  assertFinitePoint(end, "end");
  return normalize2D(subtract2D(end, start), "line direction");
}

/**
 * Unit normal to start -> end.
 * orientation = 1 selects the left-hand normal, -1 the right-hand normal.
 */
export function perpendicularDirection2D(
  start: Vec2Tuple,
  end: Vec2Tuple,
  orientation: 1 | -1 = 1,
): Vec2Tuple {
  const [dx, dy] = lineDirection2D(start, end);
  return orientation === 1 ? [-dy, dx] : [dy, -dx];
}

export function projectPointOntoLine2D(
  point: Vec2Tuple,
  lineStart: Vec2Tuple,
  lineEnd: Vec2Tuple,
): PointProjection2D {
  assertFinitePoint(point, "point");
  assertFinitePoint(lineStart, "lineStart");
  assertFinitePoint(lineEnd, "lineEnd");

  const direction = subtract2D(lineEnd, lineStart);
  const squaredLength = dot2D(direction, direction);

  if (squaredLength <= EPSILON * EPSILON) {
    throw new RangeError("Cannot project onto a line defined by coincident points.");
  }

  const relative = subtract2D(point, lineStart);
  const lineParameter = dot2D(relative, direction) / squaredLength;
  const projected = add2D(lineStart, scale2D(direction, lineParameter));
  const lineLength = Math.sqrt(squaredLength);
  const signedDistance = cross2D(direction, relative) / lineLength;

  return {
    point: projected,
    lineParameter,
    signedDistance,
  };
}

/**
 * Semantic geometry helper for a height/altitude from a vertex to an infinite
 * line. The returned lineParameter tells you whether the foot is on the segment:
 * 0 <= lineParameter <= 1.
 */
export function altitudeToLine2D(
  vertex: Vec2Tuple,
  lineStart: Vec2Tuple,
  lineEnd: Vec2Tuple,
): AltitudeConstruction2D {
  const projection = projectPointOntoLine2D(vertex, lineStart, lineEnd);

  return {
    vertex,
    foot: projection.point,
    segment: [vertex, projection.point],
    lineParameter: projection.lineParameter,
    signedDistance: projection.signedDistance,
  };
}

/** Median from vertex to the midpoint of the opposite segment. */
export function medianToSegment2D(
  vertex: Vec2Tuple,
  oppositeStart: Vec2Tuple,
  oppositeEnd: Vec2Tuple,
): SegmentEndpoints2D {
  assertFinitePoint(vertex, "vertex");
  return [vertex, midpoint2D(oppositeStart, oppositeEnd)];
}

/**
 * Intersection of two infinite lines. Returns null for parallel or coincident
 * lines; parameters are not clamped to the original segments.
 */
export function lineIntersection2D(
  firstStart: Vec2Tuple,
  firstEnd: Vec2Tuple,
  secondStart: Vec2Tuple,
  secondEnd: Vec2Tuple,
  tolerance = EPSILON,
): LineIntersection2D | null {
  assertFinitePoint(firstStart, "firstStart");
  assertFinitePoint(firstEnd, "firstEnd");
  assertFinitePoint(secondStart, "secondStart");
  assertFinitePoint(secondEnd, "secondEnd");

  const r = subtract2D(firstEnd, firstStart);
  const s = subtract2D(secondEnd, secondStart);
  assertNonzeroVector(r, "first line direction");
  assertNonzeroVector(s, "second line direction");

  const denominator = cross2D(r, s);

  if (Math.abs(denominator) <= Math.max(0, tolerance)) {
    return null;
  }

  const relative = subtract2D(secondStart, firstStart);
  const firstParameter = cross2D(relative, s) / denominator;
  const secondParameter = cross2D(relative, r) / denominator;

  return {
    point: add2D(firstStart, scale2D(r, firstParameter)),
    firstParameter,
    secondParameter,
  };
}

/**
 * Intersection of a ray and an infinite line. Returns null for parallel lines
 * or when the intersection lies behind the ray origin.
 */
export function rayLineIntersection2D(
  origin: Vec2Tuple,
  direction: Vec2Tuple,
  lineStart: Vec2Tuple,
  lineEnd: Vec2Tuple,
  tolerance = EPSILON,
): RayLineIntersection2D | null {
  assertFinitePoint(origin, "origin");
  assertFinitePoint(direction, "direction");
  assertFinitePoint(lineStart, "lineStart");
  assertFinitePoint(lineEnd, "lineEnd");
  assertNonzeroVector(direction, "ray direction");

  const lineDirection = subtract2D(lineEnd, lineStart);
  assertNonzeroVector(lineDirection, "line direction");

  const denominator = cross2D(direction, lineDirection);

  if (Math.abs(denominator) <= Math.max(0, tolerance)) {
    return null;
  }

  const relative = subtract2D(lineStart, origin);
  const rayParameter = cross2D(relative, lineDirection) / denominator;
  const lineParameter = cross2D(relative, direction) / denominator;

  if (rayParameter < -Math.max(0, tolerance)) {
    return null;
  }

  const safeRayParameter = Math.max(0, rayParameter);

  return {
    point: add2D(origin, scale2D(direction, safeRayParameter)),
    rayParameter: safeRayParameter,
    lineParameter,
  };
}

/** Unit direction of the internal angle bisector at vertex. */
export function internalAngleBisectorDirection2D(
  vertex: Vec2Tuple,
  firstArmPoint: Vec2Tuple,
  secondArmPoint: Vec2Tuple,
): Vec2Tuple {
  assertFinitePoint(vertex, "vertex");
  assertFinitePoint(firstArmPoint, "firstArmPoint");
  assertFinitePoint(secondArmPoint, "secondArmPoint");

  const first = normalize2D(
    subtract2D(firstArmPoint, vertex),
    "first angle arm",
  );
  const second = normalize2D(
    subtract2D(secondArmPoint, vertex),
    "second angle arm",
  );

  const sum = add2D(first, second);

  if (Math.hypot(sum[0], sum[1]) <= EPSILON) {
    throw new RangeError(
      "A straight angle does not determine a unique internal angle bisector.",
    );
  }

  return normalize2D(sum);
}

export function angleBisectorRay2D(
  vertex: Vec2Tuple,
  firstArmPoint: Vec2Tuple,
  secondArmPoint: Vec2Tuple,
): AngleBisectorRay2D {
  return {
    origin: vertex,
    direction: internalAngleBisectorDirection2D(
      vertex,
      firstArmPoint,
      secondArmPoint,
    ),
  };
}

/**
 * Information directly consumable by AngleSector2D for the minor angle formed
 * by two rays vertex->firstArmPoint and vertex->secondArmPoint.
 */
export function minorAngleSector2D(
  vertex: Vec2Tuple,
  firstArmPoint: Vec2Tuple,
  secondArmPoint: Vec2Tuple,
): MinorAngleSector2D {
  const firstDirection = subtract2D(firstArmPoint, vertex);
  const secondDirection = subtract2D(secondArmPoint, vertex);

  assertNonzeroVector(firstDirection, "first angle arm");
  assertNonzeroVector(secondDirection, "second angle arm");

  const startAngle = Math.atan2(firstDirection[1], firstDirection[0]);
  const endAngle = Math.atan2(secondDirection[1], secondDirection[0]);
  const counterclockwiseSweep = positiveModulo(endAngle - startAngle, TAU);

  if (counterclockwiseSweep <= Math.PI) {
    return {
      center: vertex,
      startAngle,
      endAngle,
      direction: "counterclockwise",
      sweep: counterclockwiseSweep,
    };
  }

  return {
    center: vertex,
    startAngle,
    endAngle,
    direction: "clockwise",
    sweep: TAU - counterclockwiseSweep,
  };
}

/**
 * Extend a finite segment along its own line by explicit world-unit distances.
 * before extends through start away from end; after extends through end away
 * from start.
 */
export function extendSegment2D(
  start: Vec2Tuple,
  end: Vec2Tuple,
  before = 0,
  after = 0,
): SegmentEndpoints2D {
  if (
    !Number.isFinite(before) ||
    !Number.isFinite(after) ||
    before < 0 ||
    after < 0
  ) {
    throw new RangeError("Extension distances must be finite and nonnegative.");
  }

  const direction = lineDirection2D(start, end);

  return [
    [
      start[0] - before * direction[0],
      start[1] - before * direction[1],
    ],
    [
      end[0] + after * direction[0],
      end[1] + after * direction[1],
    ],
  ];
}
