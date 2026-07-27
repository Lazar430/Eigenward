import type {
  ColorRepresentation,
  Object3D,
  Vector2,
} from "three";

export type Vec2Tuple = readonly [number, number];
export type Vec2Like = Vec2Tuple | Vector2 | { x: number; y: number };
export type Domain = readonly [number, number];

/** A mathematical map t ↦ (x(t), y(t)). */
export type ParametricCurve2D = (parameter: number) => Vec2Like;

/** An ordinary single-variable real-valued equation. */
export type ScalarEquation = (input: number) => number;

export interface ShapeStyle2D {
  outline?: ColorRepresentation | null;
  outlineWidth?: number;
  outlineOpacity?: number;
  fill?: ColorRepresentation | null;
  fillOpacity?: number;
}

export interface ParametricShape2DOptions {
  curve: ParametricCurve2D;
  domain: Domain;
  segments: number;
  style?: ShapeStyle2D;
  name?: string;
}

interface ExplicitShape2DBaseOptions {
  domain: Domain;
  /** Number of equal subintervals used for each equation branch. */
  segments: number;
  style?: ShapeStyle2D;
  name?: string;
}

/** Region lower(x) ≤ y ≤ upper(x). */
export interface ExplicitXShape2DOptions
  extends ExplicitShape2DBaseOptions {
  independentVariable?: "x";
  upper: ScalarEquation;
  lower: ScalarEquation;
}

/** Region left(y) ≤ x ≤ right(y). */
export interface ExplicitYShape2DOptions
  extends ExplicitShape2DBaseOptions {
  independentVariable: "y";
  right: ScalarEquation;
  left: ScalarEquation;
}

export type ExplicitShape2DOptions =
  | ExplicitXShape2DOptions
  | ExplicitYShape2DOptions;

export interface Polygon2DOptions {
  vertices: readonly Vec2Like[];
  style?: ShapeStyle2D;
  name?: string;
}

export interface OutlineTraceOptions {
  /**
   * Fraction of the selected outline interval revealed per second.
   * A speed of 0.5 traces the interval in two seconds.
   */
  speed?: number;
  /** Normalized starting location along the outline. */
  from?: number;
  /** Normalized ending location along the outline. */
  to?: number;
  loop?: boolean;
  /** Seconds to hold the completed trace before starting the next loop. */
  loopPause?: number;
}

export interface FrameInfo {
  /** DOMHighResTimeStamp supplied by requestAnimationFrame, in milliseconds. */
  time: number;
  /** Elapsed time since the previous rendered frame, in seconds. */
  deltaTime: number;
}

export type FrameCallback = (frame: FrameInfo) => void;

export type DisposableObject3D = Object3D & {
  dispose?: () => void;
};
