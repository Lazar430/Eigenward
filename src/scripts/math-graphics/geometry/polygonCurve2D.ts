import type {
  ParametricCurve2D,
  Vec2Like,
  Vec2Tuple,
} from "../core/types";
import { toVector2 } from "./vector2";

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function normalizeVertices(
  vertices: readonly Vec2Like[],
): Vec2Tuple[] {
  if (vertices.length < 3) {
    throw new RangeError("A polygon requires at least three vertices.");
  }

  return vertices.map((vertex, index) => {
    const point = toVector2(vertex);

    return [point.x, point.y] as const;
  });
}

/**
 * Creates the piecewise-linear parametrization discussed in the square demo.
 * The interval [k, k + 1] walks from vertex k to vertex k + 1, with the final
 * edge wrapping back to the first vertex.
 */
export function createPolygonCurve2D(
  vertices: readonly Vec2Like[],
): ParametricCurve2D {
  const points = normalizeVertices(vertices);
  const edgeCount = points.length;

  return (parameter) => {
    const wrapped = positiveModulo(parameter, edgeCount);
    const edgeIndex = Math.floor(wrapped);
    const localProgress = wrapped - edgeIndex;

    const start = points[edgeIndex];
    const end = points[(edgeIndex + 1) % edgeCount];

    return [
      start[0] + localProgress * (end[0] - start[0]),
      start[1] + localProgress * (end[1] - start[1]),
    ];
  };
}

export function createRegularPolygonVertices(
  sides: number,
  radius = 1,
  startAngle = Math.PI / 2,
): Vec2Tuple[] {
  if (!Number.isInteger(sides) || sides < 3) {
    throw new RangeError("A regular polygon requires at least three sides.");
  }

  if (!(radius > 0) || !Number.isFinite(radius)) {
    throw new RangeError("radius must be a positive finite number.");
  }

  return Array.from({ length: sides }, (_, index) => {
    const angle = startAngle + (index / sides) * Math.PI * 2;
    return [radius * Math.cos(angle), radius * Math.sin(angle)] as const;
  });
}
