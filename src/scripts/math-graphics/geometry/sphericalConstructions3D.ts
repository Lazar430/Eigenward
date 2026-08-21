import type { Vec3Tuple } from "../core/types3D";
import {
  add3D,
  cross3D,
  distance3D,
  dot3D,
  length3D,
  normalize3D,
  scale3D,
  subtract3D,
} from "./euclideanConstructions3D";

const EPSILON = 1e-10;
const TAU = Math.PI * 2;

export interface SphereCircle3D {
  center: Vec3Tuple;
  radius: number;
  planeNormal: Vec3Tuple;
  planeOffset: number;
  points: readonly Vec3Tuple[];
}

export interface SphericalAltitude3D {
  vertex: Vec3Tuple;
  sideStart: Vec3Tuple;
  sideEnd: Vec3Tuple;
  foot: Vec3Tuple;
  /** Plane normal of the altitude's supporting great circle. */
  greatCircleNormal: Vec3Tuple;
}

export interface SphericalOrthocenter3D {
  /** Representative orthocenter chosen on the triangle-facing hemisphere. */
  point: Vec3Tuple;
  /** The unavoidable antipodal second intersection of the three altitude circles. */
  antipode: Vec3Tuple;
  altitudeNormals: readonly [Vec3Tuple, Vec3Tuple, Vec3Tuple];
}

export interface SphericalAngleBisector3D {
  vertex: Vec3Tuple;
  sideStart: Vec3Tuple;
  sideEnd: Vec3Tuple;
  target: Vec3Tuple;
  tangentDirection: Vec3Tuple;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function assertSphereRadius(radius: number): void {
  if (!(radius > 0) || !Number.isFinite(radius)) {
    throw new RangeError("Sphere radius must be positive and finite.");
  }
}

function relativeUnit(point: Vec3Tuple, sphereCenter: Vec3Tuple): Vec3Tuple {
  return normalize3D(subtract3D(point, sphereCenter), "sphere-relative point");
}

function worldFromUnit(
  unit: Vec3Tuple,
  sphereCenter: Vec3Tuple,
  sphereRadius: number,
): Vec3Tuple {
  return add3D(sphereCenter, scale3D(unit, sphereRadius));
}

function angularDistanceUnit(a: Vec3Tuple, b: Vec3Tuple): number {
  return Math.acos(clamp(dot3D(a, b), -1, 1));
}

function rotateUnitAroundAxis(
  vector: Vec3Tuple,
  axis: Vec3Tuple,
  angle: number,
): Vec3Tuple {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return normalize3D(
    add3D(
      add3D(
        scale3D(vector, cosine),
        scale3D(cross3D(axis, vector), sine),
      ),
      scale3D(axis, dot3D(axis, vector) * (1 - cosine)),
    ),
  );
}

function perpendicularBasis(normal: Vec3Tuple): readonly [Vec3Tuple, Vec3Tuple] {
  const n = normalize3D(normal, "circle plane normal");
  const seed: Vec3Tuple = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const first = normalize3D(cross3D(n, seed));
  const second = normalize3D(cross3D(n, first));
  return [first, second];
}

export function projectPointToSphere3D(
  point: Vec3Tuple,
  sphereCenter: Vec3Tuple,
  sphereRadius: number,
): Vec3Tuple {
  assertSphereRadius(sphereRadius);
  return worldFromUnit(relativeUnit(point, sphereCenter), sphereCenter, sphereRadius);
}

export function spherePointFromLatitudeLongitude3D(
  latitudeRadians: number,
  longitudeRadians: number,
  sphereCenter: Vec3Tuple = [0, 0, 0],
  sphereRadius = 1,
): Vec3Tuple {
  assertSphereRadius(sphereRadius);
  const cosLatitude = Math.cos(latitudeRadians);
  return [
    sphereCenter[0] + sphereRadius * cosLatitude * Math.cos(longitudeRadians),
    sphereCenter[1] + sphereRadius * Math.sin(latitudeRadians),
    sphereCenter[2] + sphereRadius * cosLatitude * Math.sin(longitudeRadians),
  ];
}

/** Intrinsic spherical angle between the two great-circle directions at vertex. */
export function sphericalAngleRadians3D(
  vertex: Vec3Tuple,
  firstArmPoint: Vec3Tuple,
  secondArmPoint: Vec3Tuple,
  sphereCenter: Vec3Tuple = [0, 0, 0],
): number {
  const v = relativeUnit(vertex, sphereCenter);
  const first = relativeUnit(firstArmPoint, sphereCenter);
  const second = relativeUnit(secondArmPoint, sphereCenter);
  const firstTangent = normalize3D(
    subtract3D(first, scale3D(v, dot3D(first, v))),
    "first spherical-angle tangent",
  );
  const secondTangent = normalize3D(
    subtract3D(second, scale3D(v, dot3D(second, v))),
    "second spherical-angle tangent",
  );
  return Math.acos(clamp(dot3D(firstTangent, secondTangent), -1, 1));
}

export function sampleGreatCircleArc3D(
  start: Vec3Tuple,
  end: Vec3Tuple,
  {
    sphereCenter = [0, 0, 0],
    sphereRadius,
    segments = 96,
    arc = "minor",
    surfaceOffset = 0,
  }: {
    sphereCenter?: Vec3Tuple;
    sphereRadius?: number;
    segments?: number;
    arc?: "minor" | "major";
    surfaceOffset?: number;
  } = {},
): Vec3Tuple[] {
  const inferredRadius = sphereRadius ?? distance3D(start, sphereCenter);
  assertSphereRadius(inferredRadius);

  const u = relativeUnit(start, sphereCenter);
  const v = relativeUnit(end, sphereCenter);
  const cross = cross3D(u, v);
  const crossLength = length3D(cross);
  const minorAngle = Math.atan2(crossLength, clamp(dot3D(u, v), -1, 1));

  if (minorAngle <= EPSILON) {
    const point = worldFromUnit(u, sphereCenter, inferredRadius + surfaceOffset);
    return [point, point];
  }
  if (Math.abs(Math.PI - minorAngle) <= 1e-8 || crossLength <= EPSILON) {
    throw new RangeError(
      "A great-circle arc between antipodal points is not unique; choose a non-antipodal endpoint.",
    );
  }

  const axis = normalize3D(cross);
  const sweep = arc === "minor" ? minorAngle : -(TAU - minorAngle);
  const count = Math.max(2, Math.floor(segments));
  const radius = inferredRadius + surfaceOffset;
  const points: Vec3Tuple[] = [];

  for (let index = 0; index <= count; index += 1) {
    const t = index / count;
    points.push(
      worldFromUnit(
        rotateUnitAroundAxis(u, axis, sweep * t),
        sphereCenter,
        radius,
      ),
    );
  }
  return points;
}

export function sampleSpherePlaneCircle3D(
  sphereCenter: Vec3Tuple,
  sphereRadius: number,
  planeNormal: Vec3Tuple,
  planeOffset: number,
  {
    segments = 160,
    surfaceOffset = 0,
  }: {
    segments?: number;
    surfaceOffset?: number;
  } = {},
): SphereCircle3D {
  assertSphereRadius(sphereRadius);
  if (!Number.isFinite(planeOffset) || Math.abs(planeOffset) >= sphereRadius) {
    throw new RangeError(
      "planeOffset must be finite and have absolute value strictly smaller than the sphere radius.",
    );
  }

  const normal = normalize3D(planeNormal, "circle plane normal");
  const circleCenter = add3D(sphereCenter, scale3D(normal, planeOffset));
  const circleRadius = Math.sqrt(
    Math.max(0, sphereRadius * sphereRadius - planeOffset * planeOffset),
  );
  const [basisU, basisV] = perpendicularBasis(normal);
  const count = Math.max(12, Math.floor(segments));
  const radialScale = surfaceOffset === 0
    ? 1
    : (sphereRadius + surfaceOffset) / sphereRadius;
  const renderedCircleCenter = add3D(
    sphereCenter,
    scale3D(subtract3D(circleCenter, sphereCenter), radialScale),
  );
  const renderedCircleRadius = circleRadius * radialScale;
  const points: Vec3Tuple[] = [];

  for (let index = 0; index <= count; index += 1) {
    const angle = TAU * (index / count);
    points.push(
      add3D(
        renderedCircleCenter,
        add3D(
          scale3D(basisU, renderedCircleRadius * Math.cos(angle)),
          scale3D(basisV, renderedCircleRadius * Math.sin(angle)),
        ),
      ),
    );
  }

  return {
    center: circleCenter,
    radius: circleRadius,
    planeNormal: normal,
    planeOffset,
    points,
  };
}

export function sampleGreatCircle3D(
  sphereCenter: Vec3Tuple,
  sphereRadius: number,
  planeNormal: Vec3Tuple,
  options: { segments?: number; surfaceOffset?: number } = {},
): SphereCircle3D {
  return sampleSpherePlaneCircle3D(
    sphereCenter,
    sphereRadius,
    planeNormal,
    0,
    options,
  );
}

export function sampleSphericalParallel3D(
  sphereCenter: Vec3Tuple,
  sphereRadius: number,
  axis: Vec3Tuple,
  height: number,
  options: { segments?: number; surfaceOffset?: number } = {},
): SphereCircle3D {
  return sampleSpherePlaneCircle3D(
    sphereCenter,
    sphereRadius,
    axis,
    height,
    options,
  );
}

function pointOnMinorArcUnit(
  candidate: Vec3Tuple,
  start: Vec3Tuple,
  end: Vec3Tuple,
  tolerance = 1e-6,
): boolean {
  const whole = angularDistanceUnit(start, end);
  const split = angularDistanceUnit(start, candidate) + angularDistanceUnit(candidate, end);
  return Math.abs(split - whole) <= tolerance;
}

/**
 * Test whether `candidate` lies on the minor great-circle arc from `start` to `end`.
 * All three points are interpreted radially from `sphereCenter`.
 */
export function pointOnMinorGreatCircleArc3D(
  candidate: Vec3Tuple,
  start: Vec3Tuple,
  end: Vec3Tuple,
  sphereCenter: Vec3Tuple = [0, 0, 0],
  tolerance = 1e-6,
): boolean {
  return pointOnMinorArcUnit(
    relativeUnit(candidate, sphereCenter),
    relativeUnit(start, sphereCenter),
    relativeUnit(end, sphereCenter),
    tolerance,
  );
}

/** Unit tangent at `vertex` to the great circle heading toward `armPoint`. */
export function sphericalTangentDirection3D(
  vertex: Vec3Tuple,
  armPoint: Vec3Tuple,
  sphereCenter: Vec3Tuple = [0, 0, 0],
): Vec3Tuple {
  const v = relativeUnit(vertex, sphereCenter);
  const arm = relativeUnit(armPoint, sphereCenter);
  return normalize3D(
    subtract3D(arm, scale3D(v, dot3D(arm, v))),
    "spherical tangent direction",
  );
}

function chooseSideIntersectionUnit(
  first: Vec3Tuple,
  second: Vec3Tuple,
  sideStart: Vec3Tuple,
  sideEnd: Vec3Tuple,
): Vec3Tuple {
  const firstOnSide = pointOnMinorArcUnit(first, sideStart, sideEnd);
  const secondOnSide = pointOnMinorArcUnit(second, sideStart, sideEnd);
  if (firstOnSide && !secondOnSide) return first;
  if (secondOnSide && !firstOnSide) return second;

  const whole = angularDistanceUnit(sideStart, sideEnd);
  const firstError = Math.abs(
    angularDistanceUnit(sideStart, first) + angularDistanceUnit(first, sideEnd) - whole,
  );
  const secondError = Math.abs(
    angularDistanceUnit(sideStart, second) + angularDistanceUnit(second, sideEnd) - whole,
  );
  return firstError <= secondError ? first : second;
}

export function sphericalAltitudeFoot3D(
  vertex: Vec3Tuple,
  sideStart: Vec3Tuple,
  sideEnd: Vec3Tuple,
  sphereCenter: Vec3Tuple = [0, 0, 0],
  sphereRadius?: number,
): SphericalAltitude3D {
  const radius = sphereRadius ?? distance3D(vertex, sphereCenter);
  assertSphereRadius(radius);

  const a = relativeUnit(vertex, sphereCenter);
  const b = relativeUnit(sideStart, sphereCenter);
  const c = relativeUnit(sideEnd, sphereCenter);
  const sideNormal = normalize3D(cross3D(b, c), "opposite-side great-circle normal");
  const altitudeNormal = normalize3D(
    cross3D(sideNormal, a),
    "spherical altitude great-circle normal",
  );
  const projected = subtract3D(a, scale3D(sideNormal, dot3D(a, sideNormal)));
  const candidate = normalize3D(projected, "spherical altitude foot");
  const opposite = scale3D(candidate, -1);
  const chosen = chooseSideIntersectionUnit(candidate, opposite, b, c);

  return {
    vertex,
    sideStart,
    sideEnd,
    foot: worldFromUnit(chosen, sphereCenter, radius),
    greatCircleNormal: altitudeNormal,
  };
}

/**
 * The three spherical altitude great circles meet in an antipodal pair.
 *
 * `point` selects the representative on the same broad hemisphere as the
 * triangle, while `antipode` is the second concurrency point.
 */
export function sphericalOrthocenter3D(
  firstVertex: Vec3Tuple,
  secondVertex: Vec3Tuple,
  thirdVertex: Vec3Tuple,
  sphereCenter: Vec3Tuple = [0, 0, 0],
  sphereRadius?: number,
): SphericalOrthocenter3D {
  const radius = sphereRadius ?? distance3D(firstVertex, sphereCenter);
  assertSphereRadius(radius);

  const a = relativeUnit(firstVertex, sphereCenter);
  const b = relativeUnit(secondVertex, sphereCenter);
  const c = relativeUnit(thirdVertex, sphereCenter);

  const sideNormalA = normalize3D(cross3D(b, c), "BC great-circle normal");
  const sideNormalB = normalize3D(cross3D(c, a), "CA great-circle normal");
  const sideNormalC = normalize3D(cross3D(a, b), "AB great-circle normal");

  const altitudeNormalA = normalize3D(
    cross3D(sideNormalA, a),
    "A-altitude great-circle normal",
  );
  const altitudeNormalB = normalize3D(
    cross3D(sideNormalB, b),
    "B-altitude great-circle normal",
  );
  const altitudeNormalC = normalize3D(
    cross3D(sideNormalC, c),
    "C-altitude great-circle normal",
  );

  let candidate = normalize3D(
    cross3D(altitudeNormalA, altitudeNormalB),
    "spherical orthocenter",
  );

  if (Math.abs(dot3D(candidate, altitudeNormalC)) > 1e-7) {
    throw new Error("Spherical altitude great circles are numerically inconsistent.");
  }

  const triangleHemisphereHint = add3D(add3D(a, b), c);
  if (
    length3D(triangleHemisphereHint) > EPSILON &&
    dot3D(candidate, triangleHemisphereHint) < 0
  ) {
    candidate = scale3D(candidate, -1);
  }

  const point = worldFromUnit(candidate, sphereCenter, radius);
  const antipode = worldFromUnit(scale3D(candidate, -1), sphereCenter, radius);

  return {
    point,
    antipode,
    altitudeNormals: [altitudeNormalA, altitudeNormalB, altitudeNormalC],
  };
}

export function sphericalAngleBisector3D(
  vertex: Vec3Tuple,
  sideStart: Vec3Tuple,
  sideEnd: Vec3Tuple,
  sphereCenter: Vec3Tuple = [0, 0, 0],
  sphereRadius?: number,
): SphericalAngleBisector3D {
  const radius = sphereRadius ?? distance3D(vertex, sphereCenter);
  assertSphereRadius(radius);

  const a = relativeUnit(vertex, sphereCenter);
  const b = relativeUnit(sideStart, sphereCenter);
  const c = relativeUnit(sideEnd, sphereCenter);

  const tangentToB = normalize3D(
    subtract3D(b, scale3D(a, dot3D(b, a))),
    "first spherical-angle tangent",
  );
  const tangentToC = normalize3D(
    subtract3D(c, scale3D(a, dot3D(c, a))),
    "second spherical-angle tangent",
  );
  const tangentDirection = normalize3D(
    add3D(tangentToB, tangentToC),
    "internal spherical-angle bisector tangent",
  );

  const bisectorNormal = normalize3D(
    cross3D(a, tangentDirection),
    "bisector great-circle normal",
  );
  const sideNormal = normalize3D(
    cross3D(b, c),
    "opposite-side great-circle normal",
  );
  const candidate = normalize3D(
    cross3D(bisectorNormal, sideNormal),
    "bisector/opposite-side intersection",
  );
  const opposite = scale3D(candidate, -1);
  const chosen = chooseSideIntersectionUnit(candidate, opposite, b, c);

  return {
    vertex,
    sideStart,
    sideEnd,
    target: worldFromUnit(chosen, sphereCenter, radius),
    tangentDirection,
  };
}
