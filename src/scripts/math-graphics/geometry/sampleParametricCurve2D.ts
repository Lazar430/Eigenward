import { Vector2 } from "three";
import type {
  Domain,
  ParametricCurve2D,
} from "../core/types";
import { toVector2 } from "./vector2";

export interface SampleParametricCurve2DOptions {
  curve: ParametricCurve2D;
  domain: Domain;
  segments: number;
  closed?: boolean;
}

/**
 * Samples a mathematical map t ↦ (x(t), y(t)).
 *
 * Closed curves omit the repeated endpoint. The rendering primitive closes the
 * contour itself, avoiding a duplicate point in fill triangulation.
 */
export function sampleParametricCurve2D({
  curve,
  domain: [start, end],
  segments,
  closed = false,
}: SampleParametricCurve2DOptions): Vector2[] {
  if (!Number.isInteger(segments) || segments < 1) {
    throw new RangeError("segments must be a positive integer.");
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) {
    throw new RangeError("domain must contain two distinct finite values.");
  }

  const sampleCount = closed ? segments : segments + 1;
  const points: Vector2[] = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const progress = index / segments;
    const parameter = start + (end - start) * progress;
    const point = toVector2(curve(parameter));

    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new Error(
        `The parametric curve returned a non-finite point at t=${parameter}.`,
      );
    }

    points.push(point);
  }

  return points;
}
