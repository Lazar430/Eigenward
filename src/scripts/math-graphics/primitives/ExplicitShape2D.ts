import type { ExplicitShape2DOptions } from "../core/types";
import { sampleExplicitShape2D } from "../geometry/sampleExplicitShape2D";
import { ParametricShape2D } from "./ParametricShape2D";

/**
 * Creates the same transformable/traced shape object as the parametric factory,
 * but from two explicit boundary equations.
 */
export function createExplicitShape2D(
  options: ExplicitShape2DOptions,
): ParametricShape2D {
  return new ParametricShape2D(
    sampleExplicitShape2D(options),
    options.style,
    options.name ?? "explicit-shape-2d",
  );
}
