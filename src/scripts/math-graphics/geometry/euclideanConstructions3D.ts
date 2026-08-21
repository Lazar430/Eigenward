import type { Vec3Tuple } from "../core/types3D";

const EPSILON = 1e-10;

export interface PointProjection3D {
  point: Vec3Tuple;
  /** t in lineStart + t(lineEnd - lineStart). */
  lineParameter: number;
  distance: number;
}

export interface AltitudeToLine3D {
  vertex: Vec3Tuple;
  foot: Vec3Tuple;
  segment: readonly [Vec3Tuple, Vec3Tuple];
  lineParameter: number;
  distance: number;
}

export interface ClosestLinePoints3D {
  firstPoint: Vec3Tuple;
  secondPoint: Vec3Tuple;
  firstParameter: number;
  secondParameter: number;
  distance: number;
}

export interface LineIntersection3D {
  point: Vec3Tuple;
  firstParameter: number;
  secondParameter: number;
}

export interface Plane3D {
  point: Vec3Tuple;
  /** Unit normal. */
  normal: Vec3Tuple;
}

export interface PointPlaneProjection3D {
  point: Vec3Tuple;
  signedDistance: number;
  distance: number;
}

export interface LinePlaneIntersection3D {
  point: Vec3Tuple;
  lineParameter: number;
}

export interface Line3D {
  origin: Vec3Tuple;
  /** Unit direction. */
  direction: Vec3Tuple;
}

function assertFinitePoint(point: Vec3Tuple, label: string): void {
  if (!point.every(Number.isFinite)) {
    throw new RangeError(`${label} must contain three finite numbers.`);
  }
}

function assertNonzeroVector(vector: Vec3Tuple, label: string): void {
  if (length3D(vector) <= EPSILON) {
    throw new RangeError(`${label} must be nonzero.`);
  }
}

export function add3D(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function subtract3D(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale3D(vector: Vec3Tuple, scalar: number): Vec3Tuple {
  return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
}

export function dot3D(a: Vec3Tuple, b: Vec3Tuple): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross3D(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function length3D(vector: Vec3Tuple): number {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

export function normalize3D(
  vector: Vec3Tuple,
  label = "vector",
): Vec3Tuple {
  assertNonzeroVector(vector, label);
  const length = length3D(vector);
  return [
    vector[0] / length,
    vector[1] / length,
    vector[2] / length,
  ];
}

export function distance3D(a: Vec3Tuple, b: Vec3Tuple): number {
  assertFinitePoint(a, "a");
  assertFinitePoint(b, "b");
  return length3D(subtract3D(b, a));
}

export function midpoint3D(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  assertFinitePoint(a, "a");
  assertFinitePoint(b, "b");
  return [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
    (a[2] + b[2]) / 2,
  ];
}

export function centroid3D(points: readonly Vec3Tuple[]): Vec3Tuple {
  if (points.length === 0) {
    throw new RangeError("centroid3D requires at least one point.");
  }

  let x = 0;
  let y = 0;
  let z = 0;

  for (const point of points) {
    assertFinitePoint(point, "centroid point");
    x += point[0];
    y += point[1];
    z += point[2];
  }

  return [x / points.length, y / points.length, z / points.length];
}

/** Affine point start + t(end-start). t need not lie in [0,1]. */
export function pointOnLine3D(
  start: Vec3Tuple,
  end: Vec3Tuple,
  parameter: number,
): Vec3Tuple {
  assertFinitePoint(start, "start");
  assertFinitePoint(end, "end");

  if (!Number.isFinite(parameter)) {
    throw new RangeError("parameter must be finite.");
  }

  const direction = subtract3D(end, start);
  return add3D(start, scale3D(direction, parameter));
}

export function lineDirection3D(
  start: Vec3Tuple,
  end: Vec3Tuple,
): Vec3Tuple {
  assertFinitePoint(start, "start");
  assertFinitePoint(end, "end");
  return normalize3D(subtract3D(end, start), "line direction");
}

export function projectPointOntoLine3D(
  point: Vec3Tuple,
  lineStart: Vec3Tuple,
  lineEnd: Vec3Tuple,
): PointProjection3D {
  assertFinitePoint(point, "point");
  assertFinitePoint(lineStart, "lineStart");
  assertFinitePoint(lineEnd, "lineEnd");

  const direction = subtract3D(lineEnd, lineStart);
  const squaredLength = dot3D(direction, direction);

  if (squaredLength <= EPSILON * EPSILON) {
    throw new RangeError(
      "Cannot project onto a line defined by coincident points.",
    );
  }

  const relative = subtract3D(point, lineStart);
  const lineParameter = dot3D(relative, direction) / squaredLength;
  const projected = add3D(lineStart, scale3D(direction, lineParameter));

  return {
    point: projected,
    lineParameter,
    distance: distance3D(point, projected),
  };
}

export function altitudeToLine3D(
  vertex: Vec3Tuple,
  lineStart: Vec3Tuple,
  lineEnd: Vec3Tuple,
): AltitudeToLine3D {
  const projection = projectPointOntoLine3D(vertex, lineStart, lineEnd);

  return {
    vertex,
    foot: projection.point,
    segment: [vertex, projection.point],
    lineParameter: projection.lineParameter,
    distance: projection.distance,
  };
}

/**
 * Closest pair of points on two infinite 3D lines.
 *
 * This is useful even when the lines are skew. `lineIntersection3D()` wraps it
 * and only reports an intersection when the closest-point distance is within
 * tolerance.
 */
export function closestPointsBetweenLines3D(
  firstStart: Vec3Tuple,
  firstEnd: Vec3Tuple,
  secondStart: Vec3Tuple,
  secondEnd: Vec3Tuple,
  tolerance = EPSILON,
): ClosestLinePoints3D | null {
  const u = subtract3D(firstEnd, firstStart);
  const v = subtract3D(secondEnd, secondStart);
  const w0 = subtract3D(firstStart, secondStart);

  assertNonzeroVector(u, "first line direction");
  assertNonzeroVector(v, "second line direction");

  const a = dot3D(u, u);
  const b = dot3D(u, v);
  const c = dot3D(v, v);
  const d = dot3D(u, w0);
  const e = dot3D(v, w0);
  const denominator = a * c - b * b;

  if (Math.abs(denominator) <= Math.max(EPSILON, tolerance)) {
    return null;
  }

  const firstParameter = (b * e - c * d) / denominator;
  const secondParameter = (a * e - b * d) / denominator;

  const firstPoint = add3D(
    firstStart,
    scale3D(u, firstParameter),
  );
  const secondPoint = add3D(
    secondStart,
    scale3D(v, secondParameter),
  );

  return {
    firstPoint,
    secondPoint,
    firstParameter,
    secondParameter,
    distance: distance3D(firstPoint, secondPoint),
  };
}

export function lineIntersection3D(
  firstStart: Vec3Tuple,
  firstEnd: Vec3Tuple,
  secondStart: Vec3Tuple,
  secondEnd: Vec3Tuple,
  tolerance = 1e-8,
): LineIntersection3D | null {
  const closest = closestPointsBetweenLines3D(
    firstStart,
    firstEnd,
    secondStart,
    secondEnd,
    tolerance,
  );

  if (!closest || closest.distance > Math.max(0, tolerance)) {
    return null;
  }

  return {
    point: midpoint3D(closest.firstPoint, closest.secondPoint),
    firstParameter: closest.firstParameter,
    secondParameter: closest.secondParameter,
  };
}

export function planeFromPoints3D(
  a: Vec3Tuple,
  b: Vec3Tuple,
  c: Vec3Tuple,
): Plane3D {
  assertFinitePoint(a, "a");
  assertFinitePoint(b, "b");
  assertFinitePoint(c, "c");

  const ab = subtract3D(b, a);
  const ac = subtract3D(c, a);
  const normal = normalize3D(
    cross3D(ab, ac),
    "plane normal (the three points must not be collinear)",
  );

  return {
    point: [a[0], a[1], a[2]],
    normal,
  };
}

export function projectPointOntoPlane3D(
  point: Vec3Tuple,
  plane: Plane3D,
): PointPlaneProjection3D {
  assertFinitePoint(point, "point");
  assertFinitePoint(plane.point, "plane point");

  const normal = normalize3D(plane.normal, "plane normal");
  const relative = subtract3D(point, plane.point);
  const signedDistance = dot3D(relative, normal);

  return {
    point: subtract3D(point, scale3D(normal, signedDistance)),
    signedDistance,
    distance: Math.abs(signedDistance),
  };
}

export function linePlaneIntersection3D(
  lineStart: Vec3Tuple,
  lineEnd: Vec3Tuple,
  plane: Plane3D,
  tolerance = EPSILON,
): LinePlaneIntersection3D | null {
  const direction = subtract3D(lineEnd, lineStart);
  assertNonzeroVector(direction, "line direction");

  const normal = normalize3D(plane.normal, "plane normal");
  const denominator = dot3D(direction, normal);

  if (Math.abs(denominator) <= Math.max(EPSILON, tolerance)) {
    return null;
  }

  const lineParameter =
    dot3D(subtract3D(plane.point, lineStart), normal) / denominator;

  return {
    point: add3D(lineStart, scale3D(direction, lineParameter)),
    lineParameter,
  };
}

export function parallelLineThroughPoint3D(
  point: Vec3Tuple,
  referenceStart: Vec3Tuple,
  referenceEnd: Vec3Tuple,
): Line3D {
  assertFinitePoint(point, "point");

  return {
    origin: [point[0], point[1], point[2]],
    direction: lineDirection3D(referenceStart, referenceEnd),
  };
}

export function angleBetweenRays3D(
  vertex: Vec3Tuple,
  firstArmPoint: Vec3Tuple,
  secondArmPoint: Vec3Tuple,
): number {
  const first = normalize3D(
    subtract3D(firstArmPoint, vertex),
    "first angle arm",
  );
  const second = normalize3D(
    subtract3D(secondArmPoint, vertex),
    "second angle arm",
  );

  return Math.acos(
    Math.min(1, Math.max(-1, dot3D(first, second))),
  );
}

export function extendSegment3D(
  start: Vec3Tuple,
  end: Vec3Tuple,
  before = 0,
  after = 0,
): readonly [Vec3Tuple, Vec3Tuple] {
  if (
    !Number.isFinite(before) ||
    !Number.isFinite(after) ||
    before < 0 ||
    after < 0
  ) {
    throw new RangeError(
      "Extension distances must be finite and nonnegative.",
    );
  }

  const direction = lineDirection3D(start, end);

  return [
    subtract3D(start, scale3D(direction, before)),
    add3D(end, scale3D(direction, after)),
  ];
}
