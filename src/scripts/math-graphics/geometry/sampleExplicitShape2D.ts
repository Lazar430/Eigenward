import { Vector2 } from "three";
import type {
  ExplicitShape2DOptions,
  ScalarEquation,
} from "../core/types";
import { approximatelyEqual } from "./vector2";

function assertSegments(segments: number): void {
  if (!Number.isInteger(segments) || segments < 2) {
    throw new RangeError(
      "An explicit shape requires an integer segments value of at least 2.",
    );
  }
}

function assertDomain(start: number, end: number): void {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) {
    throw new RangeError("domain must contain two distinct finite values.");
  }
}

function evaluate(
  equation: ScalarEquation,
  input: number,
  equationName: string,
): number {
  const output = equation(input);

  if (!Number.isFinite(output)) {
    throw new Error(
      `${equationName} returned a non-finite value at ${input}.`,
    );
  }

  return output;
}

function pushUnlessDuplicate(points: Vector2[], point: Vector2): void {
  const previous = points.at(-1);

  if (!previous || !approximatelyEqual(previous, point)) {
    points.push(point);
  }
}

/**
 * Samples a closed region described by explicit equations.
 *
 * For x-independent input, the boundary follows upper(x) from left to right,
 * then lower(x) from right to left. For y-independent input, it follows
 * right(y) upward and left(y) downward. The result is the same persistent
 * shape type used by parametric and polygon factories.
 */
export function sampleExplicitShape2D(
  options: ExplicitShape2DOptions,
): Vector2[] {
  const [start, end] = options.domain;
  const { segments } = options;

  assertSegments(segments);
  assertDomain(start, end);

  const points: Vector2[] = [];

  if (options.independentVariable === "y") {
    for (let index = 0; index <= segments; index += 1) {
      const progress = index / segments;
      const y = start + (end - start) * progress;
      const right = evaluate(options.right, y, "right(y)");
      const left = evaluate(options.left, y, "left(y)");

      if (right < left) {
        throw new Error(
          `The explicit boundaries cross at y=${y}: right(y) < left(y).`,
        );
      }

      pushUnlessDuplicate(points, new Vector2(right, y));
    }

    for (let index = segments; index >= 0; index -= 1) {
      const progress = index / segments;
      const y = start + (end - start) * progress;
      pushUnlessDuplicate(
        points,
        new Vector2(evaluate(options.left, y, "left(y)"), y),
      );
    }
  } else {
    for (let index = 0; index <= segments; index += 1) {
      const progress = index / segments;
      const x = start + (end - start) * progress;
      const upper = evaluate(options.upper, x, "upper(x)");
      const lower = evaluate(options.lower, x, "lower(x)");

      if (upper < lower) {
        throw new Error(
          `The explicit boundaries cross at x=${x}: upper(x) < lower(x).`,
        );
      }

      pushUnlessDuplicate(points, new Vector2(x, upper));
    }

    for (let index = segments; index >= 0; index -= 1) {
      const progress = index / segments;
      const x = start + (end - start) * progress;
      pushUnlessDuplicate(
        points,
        new Vector2(x, evaluate(options.lower, x, "lower(x)")),
      );
    }
  }

  // The renderer closes the contour, so a duplicated last/first point is not
  // useful and may make fill triangulation less stable.
  if (
    points.length > 1 &&
    approximatelyEqual(points[0], points[points.length - 1])
  ) {
    points.pop();
  }

  if (points.length < 3) {
    throw new RangeError(
      "The explicit equations did not produce at least three distinct boundary points.",
    );
  }

  return points;
}
