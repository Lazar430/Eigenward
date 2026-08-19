import type { MathScene2D } from "../core/MathScene2D";
import type { Vec2Tuple } from "../core/types";

export interface SceneView2D {
  center: Vec2Tuple;
  viewHeight: number;
}

export interface FitPointsView2DOptions {
  paddingFraction?: number;
  minimumPaddingWorld?: number;
  minimumViewHeight?: number;
}

export function boundsFromPoints2D(points: readonly Vec2Tuple[]): {
  left: number;
  right: number;
  bottom: number;
  top: number;
  width: number;
  height: number;
} {
  if (points.length === 0) {
    throw new RangeError("At least one point is required to calculate bounds.");
  }

  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.POSITIVE_INFINITY;
  let top = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    left = Math.min(left, point[0]);
    right = Math.max(right, point[0]);
    bottom = Math.min(bottom, point[1]);
    top = Math.max(top, point[1]);
  }

  return {
    left,
    right,
    bottom,
    top,
    width: right - left,
    height: top - bottom,
  };
}

export function currentSceneView2D(scene: MathScene2D): SceneView2D {
  const bounds = scene.getViewBounds();

  return {
    center: [
      (bounds.left + bounds.right) / 2,
      (bounds.bottom + bounds.top) / 2,
    ],
    viewHeight: bounds.height,
  };
}

export function sceneContainsPoints2D(
  scene: MathScene2D,
  points: readonly Vec2Tuple[],
  paddingPixels = 26,
): boolean {
  const bounds = scene.getViewBounds(Math.max(0, paddingPixels));

  return points.every(
    ([x, y]) =>
      x >= bounds.left &&
	x <= bounds.right &&
	y >= bounds.bottom &&
	y <= bounds.top,
  );
}

/**
 * Compute the smallest fixed-height MathScene2D view that fits the supplied
 * points for the canvas's current aspect ratio.
 */
export function fitPointsView2D(
  scene: MathScene2D,
  points: readonly Vec2Tuple[],
  {
    paddingFraction = 0.12,
    minimumPaddingWorld = 0.35,
    minimumViewHeight = 1,
  }: FitPointsView2DOptions = {},
): SceneView2D {
  const bounds = boundsFromPoints2D(points);
  const rectangle = scene.canvas.getBoundingClientRect();
  const aspect = Math.max(1e-6, rectangle.width / Math.max(1, rectangle.height));

  const baseSpan = Math.max(bounds.width, bounds.height, 1);
  const padding = Math.max(
    minimumPaddingWorld,
    baseSpan * Math.max(0, paddingFraction),
  );

  const paddedWidth = Math.max(1e-6, bounds.width + 2 * padding);
  const paddedHeight = Math.max(1e-6, bounds.height + 2 * padding);

  return {
    center: [
      (bounds.left + bounds.right) / 2,
      (bounds.bottom + bounds.top) / 2,
    ],
    viewHeight: Math.max(
      minimumViewHeight,
      paddedHeight,
      paddedWidth / aspect,
    ),
  };
}
