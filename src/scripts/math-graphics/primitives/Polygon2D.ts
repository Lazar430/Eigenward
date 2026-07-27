import type { Polygon2DOptions } from "../core/types";
import { createPolygonCurve2D } from "../geometry/polygonCurve2D";
import { createParametricShape2D } from "./ParametricShape2D";

/**
 * Convenience factory built on the general piecewise-linear polygon
 * parametrization. It returns the same shape class as every other factory.
 */
export function createPolygon2D({
  vertices,
  style,
  name,
}: Polygon2DOptions) {
  return createParametricShape2D({
    curve: createPolygonCurve2D(vertices),
    domain: [0, vertices.length],
    segments: vertices.length,
    style,
    name: name ?? "polygon-2d",
  });
}
