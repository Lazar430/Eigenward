import { Vector2 } from "three";
import type { Vec2Like, Vec2Tuple } from "../core/types";

export function isVec2Tuple(value: Vec2Like): value is Vec2Tuple {
  return Array.isArray(value);
}

export function toVector2(value: Vec2Like): Vector2 {
  const point = isVec2Tuple(value)
    ? new Vector2(value[0], value[1])
    : new Vector2(value.x, value.y);

  assertFiniteVector2(point);
  return point;
}

export function assertFiniteVector2(
  point: Vector2,
  context = "point",
): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${context} must contain two finite coordinates.`);
  }
}

export function approximatelyEqual(
  first: Vector2,
  second: Vector2,
  epsilon = 1e-10,
): boolean {
  return first.distanceToSquared(second) <= epsilon * epsilon;
}
