import type { Vec2Tuple } from "../core/types";

const TAU = Math.PI * 2;
const EPSILON = 1e-10;

/** Version tag for build-time Fourier drawing assets. */
export const FOURIER_DRAWING_ASSET_VERSION_2D = 1 as const;

/** One complex Fourier coefficient c_n = real + i imaginary. */
export interface FourierCoefficient2D {
  frequency: number;
  real: number;
  imaginary: number;
}

export type FourierCoefficientOrder2D =
  | "input"
  | "frequency"
  | "amplitude";

export interface FourierCoefficientComputation2DOptions {
  /** Number of frequencies 0, +1, -1, +2, -2, ... to compute. */
  termCount?: number;
  /** Explicit integer frequencies. Overrides termCount when supplied. */
  frequencies?: readonly number[];
}

/** A single prepared stroke. Batch 2 will populate this from SVG paths. */
export interface FourierStroke2DAsset {
  id?: string;
  closed: boolean;
  coefficients: readonly FourierCoefficient2D[];
  /** Dense final reconstruction used by the runtime trace renderer. */
  trace: readonly Vec2Tuple[];
  /**
   * Parameter interval traversed while this stroke is visibly drawn.
   * Closed strokes normally use [0, 1]. Open authoring paths use [0, 0.5]
   * when compiled with the ping-pong periodicization used by Batch 2.
   */
  parameterRange?: readonly [number, number];
  /** Relative share of a multi-stroke animation's total duration. */
  durationWeight?: number;
}

/** Runtime-ready drawing format. It contains no SVG or raster-image data. */
export interface FourierDrawing2DAsset {
  version: typeof FOURIER_DRAWING_ASSET_VERSION_2D;
  strokes: readonly FourierStroke2DAsset[];
}

export interface FourierEpicycleLink2D {
  coefficient: FourierCoefficient2D;
  center: Vec2Tuple;
  tip: Vec2Tuple;
  radius: number;
  angle: number;
}

export interface PointBounds2D {
  left: number;
  right: number;
  bottom: number;
  top: number;
  width: number;
  height: number;
}

export interface NormalizePointSamples2DOptions {
  /** Largest final dimension after normalization. */
  targetSpan?: number;
  /** Destination of the source bounding-box center. */
  center?: Vec2Tuple;
  /** Useful for SVG coordinates, whose y-axis usually points downward. */
  flipY?: boolean;
}

export interface PointNormalizationTransform2D {
  sourceCenter: Vec2Tuple;
  targetCenter: Vec2Tuple;
  scale: number;
  flipY: boolean;
}

export interface NormalizedPointSamples2D {
  points: Vec2Tuple[];
  sourceBounds: PointBounds2D;
  bounds: PointBounds2D;
  transform: PointNormalizationTransform2D;
}

/** Apply a normalization transform previously returned by normalizePointSamples2D(). */
export function applyPointNormalizationTransform2D(
  point: Vec2Tuple,
  transform: PointNormalizationTransform2D,
): Vec2Tuple {
  assertFinitePoint(point, "point");

  const x =
    transform.targetCenter[0] +
      (point[0] - transform.sourceCenter[0]) * transform.scale;
  const yScale = transform.flipY ? -transform.scale : transform.scale;
  const y =
    transform.targetCenter[1] +
      (point[1] - transform.sourceCenter[1]) * yScale;

  return [x, y];
}

function assertFinitePoint(point: Vec2Tuple, label: string): void {
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    throw new RangeError(`${label} must contain two finite numbers.`);
  }
}

function assertPointSamples(points: readonly Vec2Tuple[]): void {
  if (points.length < 2) {
    throw new RangeError("At least two point samples are required.");
  }

  points.forEach((point, index) =>
    assertFinitePoint(point, `points[${index}]`),
  );
}

function samePoint(left: Vec2Tuple, right: Vec2Tuple): boolean {
  return (
    Math.abs(left[0] - right[0]) <= EPSILON &&
      Math.abs(left[1] - right[1]) <= EPSILON
  );
}

/** Remove a repeated final point from a closed sample list when present. */
function withoutRepeatedClosure(points: readonly Vec2Tuple[]): Vec2Tuple[] {
  const result = points.map((point) => [point[0], point[1]] as Vec2Tuple);

  if (result.length > 2 && samePoint(result[0], result[result.length - 1])) {
    result.pop();
  }

  return result;
}

export function getPointBounds2D(
  points: readonly Vec2Tuple[],
): PointBounds2D {
  assertPointSamples(points);

  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.POSITIVE_INFINITY;
  let top = Number.NEGATIVE_INFINITY;

  for (const [x, y] of points) {
    left = Math.min(left, x);
    right = Math.max(right, x);
    bottom = Math.min(bottom, y);
    top = Math.max(top, y);
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

/**
 * Center and uniformly scale a point cloud without changing its shape.
 * The returned transform is intentionally serializable for future asset tooling.
 */
export function normalizePointSamples2D(
  points: readonly Vec2Tuple[],
  options: NormalizePointSamples2DOptions = {},
): NormalizedPointSamples2D {
  assertPointSamples(points);

  const targetSpan = options.targetSpan ?? 2;
  const targetCenter = options.center ?? [0, 0];
  const flipY = options.flipY ?? false;

  if (!(targetSpan > 0) || !Number.isFinite(targetSpan)) {
    throw new RangeError("targetSpan must be positive and finite.");
  }
  assertFinitePoint(targetCenter, "center");

  const sourceBounds = getPointBounds2D(points);
  const sourceSpan = Math.max(sourceBounds.width, sourceBounds.height);

  if (!(sourceSpan > EPSILON) || !Number.isFinite(sourceSpan)) {
    throw new RangeError("Point samples must span a nonzero finite region.");
  }

  const sourceCenter: Vec2Tuple = [
    (sourceBounds.left + sourceBounds.right) / 2,
    (sourceBounds.bottom + sourceBounds.top) / 2,
  ];
  const scale = targetSpan / sourceSpan;
  const transform: PointNormalizationTransform2D = {
    sourceCenter,
    targetCenter: [targetCenter[0], targetCenter[1]],
    scale,
    flipY,
  };

  const normalized = points.map((point) =>
    applyPointNormalizationTransform2D(point, transform),
  );

  return {
    points: normalized,
    sourceBounds,
    bounds: getPointBounds2D(normalized),
    transform,
  };
}

/** Model-space length of an open or closed polyline. */
export function calculatePolylineLength2D(
  points: readonly Vec2Tuple[],
  closed = false,
): number {
  assertPointSamples(points);
  const source = closed ? withoutRepeatedClosure(points) : [...points];
  const segmentCount = closed ? source.length : source.length - 1;
  let total = 0;

  for (let index = 0; index < segmentCount; index += 1) {
    const current = source[index];
    const next = source[(index + 1) % source.length];
    total += Math.hypot(next[0] - current[0], next[1] - current[1]);
  }

  return total;
}

/**
 * Resample a polyline at approximately equal arc-length intervals.
 * Closed output intentionally omits the repeated endpoint.
 */
export function resamplePolylineByArcLength2D(
  points: readonly Vec2Tuple[],
  sampleCount: number,
  closed = false,
): Vec2Tuple[] {
  assertPointSamples(points);

  if (!Number.isInteger(sampleCount) || sampleCount < 2) {
    throw new RangeError("sampleCount must be an integer of at least 2.");
  }

  const source = closed ? withoutRepeatedClosure(points) : [...points];
  const segmentCount = closed ? source.length : source.length - 1;

  const segments: {
    start: Vec2Tuple;
    end: Vec2Tuple;
    length: number;
    cumulativeStart: number;
  }[] = [];

  let totalLength = 0;

  for (let index = 0; index < segmentCount; index += 1) {
    const start = source[index];
    const end = source[(index + 1) % source.length];
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);

    if (length <= EPSILON) continue;

    segments.push({
      start,
      end,
      length,
      cumulativeStart: totalLength,
    });
    totalLength += length;
  }

  if (!(totalLength > EPSILON) || segments.length === 0) {
    throw new RangeError("The polyline must have positive finite length.");
  }

  const output: Vec2Tuple[] = [];
  let segmentIndex = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const denominator = closed ? sampleCount : sampleCount - 1;
    const targetDistance = (totalLength * index) / denominator;

    while (
      segmentIndex < segments.length - 1 &&
	targetDistance >
          segments[segmentIndex].cumulativeStart + segments[segmentIndex].length
    ) {
      segmentIndex += 1;
    }

    const segment = segments[segmentIndex];
    const localDistance = targetDistance - segment.cumulativeStart;
    const progress = Math.min(1, Math.max(0, localDistance / segment.length));

    output.push([
      segment.start[0] + (segment.end[0] - segment.start[0]) * progress,
      segment.start[1] + (segment.end[1] - segment.start[1]) * progress,
    ]);
  }

  return output;
}

/**
 * Convert an open stroke into a continuous periodic sample sequence by walking
 * from start to end and then back to the start. The visible forward traversal
 * occupies exactly t in [0, 0.5]. Closed strokes are copied unchanged.
 */
export function createPeriodicFourierSamples2D(
  points: readonly Vec2Tuple[],
  closed: boolean,
): Vec2Tuple[] {
  assertPointSamples(points);

  if (closed) return withoutRepeatedClosure(points);

  const source = points.map((point) => [point[0], point[1]] as Vec2Tuple);

  if (source.length === 2) {
    return [source[0], source[1]];
  }

  return [
    ...source,
    ...source.slice(1, -1).reverse(),
  ];
}

/** Frequencies in the visual/math-friendly order 0, +1, -1, +2, -2, ... */
export function createFourierFrequencySequence2D(termCount: number): number[] {
  if (!Number.isInteger(termCount) || termCount < 1) {
    throw new RangeError("termCount must be a positive integer.");
  }

  const frequencies = [0];

  for (let magnitude = 1; frequencies.length < termCount; magnitude += 1) {
    frequencies.push(magnitude);
    if (frequencies.length < termCount) frequencies.push(-magnitude);
  }

  return frequencies;
}

function validateFrequencies(frequencies: readonly number[]): void {
  if (frequencies.length === 0) {
    throw new RangeError("At least one Fourier frequency is required.");
  }

  const seen = new Set<number>();

  for (const frequency of frequencies) {
    if (!Number.isInteger(frequency) || !Number.isFinite(frequency)) {
      throw new RangeError("Fourier frequencies must be finite integers.");
    }
    if (seen.has(frequency)) {
      throw new RangeError(`Duplicate Fourier frequency ${frequency}.`);
    }
    seen.add(frequency);
  }
}

/**
 * Direct discrete approximation of
 *   c_n = integral_0^1 f(t) exp(-2 pi i n t) dt.
 *
 * Point samples are expected at equal parameter intervals and should not repeat
 * the t=1 endpoint for a closed curve. A repeated closure point is removed
 * defensively when detected.
 */
export function computeFourierCoefficients2D(
  points: readonly Vec2Tuple[],
  options: FourierCoefficientComputation2DOptions = {},
): FourierCoefficient2D[] {
  assertPointSamples(points);
  const samples = withoutRepeatedClosure(points);

  const frequencies = options.frequencies
    ? [...options.frequencies]
    : createFourierFrequencySequence2D(options.termCount ?? 31);

  validateFrequencies(frequencies);

  const sampleCount = samples.length;

  return frequencies.map((frequency) => {
    let real = 0;
    let imaginary = 0;

    for (let index = 0; index < sampleCount; index += 1) {
      const [x, y] = samples[index];
      const angle = (TAU * frequency * index) / sampleCount;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);

      // (x + iy)(cos(angle) - i sin(angle))
      real += x * cosine + y * sine;
      imaginary += y * cosine - x * sine;
    }

    return {
      frequency,
      real: real / sampleCount,
      imaginary: imaginary / sampleCount,
    };
  });
}

export function getFourierCoefficientAmplitude2D(
  coefficient: FourierCoefficient2D,
): number {
  return Math.hypot(coefficient.real, coefficient.imaginary);
}

export function getFourierCoefficientPhase2D(
  coefficient: FourierCoefficient2D,
): number {
  return Math.atan2(coefficient.imaginary, coefficient.real);
}

/** Return a copy in a useful epicycle chain order. */
export function orderFourierCoefficients2D(
  coefficients: readonly FourierCoefficient2D[],
  order: FourierCoefficientOrder2D = "frequency",
): FourierCoefficient2D[] {
  const result = coefficients.map((coefficient) => ({ ...coefficient }));

  if (order === "input") return result;

  if (order === "amplitude") {
    return result.sort((left, right) => {
      const amplitudeDifference =
        getFourierCoefficientAmplitude2D(right) -
          getFourierCoefficientAmplitude2D(left);

      if (Math.abs(amplitudeDifference) > EPSILON) return amplitudeDifference;
      return Math.abs(left.frequency) - Math.abs(right.frequency);
    });
  }

  return result.sort((left, right) => {
    const leftMagnitude = Math.abs(left.frequency);
    const rightMagnitude = Math.abs(right.frequency);

    if (leftMagnitude !== rightMagnitude) return leftMagnitude - rightMagnitude;
    if (left.frequency === 0) return -1;
    if (right.frequency === 0) return 1;
    return right.frequency - left.frequency; // +n before -n
  });
}

/** Evaluate one rotating complex term c_n exp(2 pi i n t). */
export function evaluateFourierCoefficient2D(
  coefficient: FourierCoefficient2D,
  progress: number,
): Vec2Tuple {
  const angle = TAU * coefficient.frequency * progress;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return [
    coefficient.real * cosine - coefficient.imaginary * sine,
    coefficient.real * sine + coefficient.imaginary * cosine,
  ];
}

/** Evaluate the complete finite Fourier approximation at normalized time t. */
export function reconstructFourierPoint2D(
  coefficients: readonly FourierCoefficient2D[],
  progress: number,
  origin: Vec2Tuple = [0, 0],
): Vec2Tuple {
  let x = origin[0];
  let y = origin[1];

  for (const coefficient of coefficients) {
    const [dx, dy] = evaluateFourierCoefficient2D(coefficient, progress);
    x += dx;
    y += dy;
  }

  return [x, y];
}

/**
 * Tip-to-tail geometric state for every Fourier term. This is pure math data;
 * Batch 3 will render the same data with a batched Three.js primitive.
 */
export function buildFourierEpicycleChain2D(
  coefficients: readonly FourierCoefficient2D[],
  progress: number,
  origin: Vec2Tuple = [0, 0],
): FourierEpicycleLink2D[] {
  let x = origin[0];
  let y = origin[1];
  const links: FourierEpicycleLink2D[] = [];

  for (const coefficient of coefficients) {
    const center: Vec2Tuple = [x, y];
    const [dx, dy] = evaluateFourierCoefficient2D(coefficient, progress);
    x += dx;
    y += dy;

    links.push({
      coefficient,
      center,
      tip: [x, y],
      radius: getFourierCoefficientAmplitude2D(coefficient),
      angle:
        getFourierCoefficientPhase2D(coefficient) +
          TAU * coefficient.frequency * progress,
    });
  }

  return links;
}

/** Dense point list over an arbitrary Fourier parameter interval. */
export function sampleFourierReconstructionRange2D(
  coefficients: readonly FourierCoefficient2D[],
  sampleCount: number,
  parameterRange: readonly [number, number] = [0, 1],
  includeEnd = false,
  origin: Vec2Tuple = [0, 0],
): Vec2Tuple[] {
  if (!Number.isInteger(sampleCount) || sampleCount < 2) {
    throw new RangeError("sampleCount must be an integer of at least 2.");
  }

  const [start, end] = parameterRange;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) {
    throw new RangeError(
      "parameterRange must contain two distinct finite values.",
    );
  }

  const denominator = includeEnd ? sampleCount - 1 : sampleCount;

  return Array.from({ length: sampleCount }, (_, index) => {
    const progress = index / denominator;
    const parameter = start + (end - start) * progress;
    return reconstructFourierPoint2D(coefficients, parameter, origin);
  });
}

/** Dense point list of one complete finite periodic reconstruction. */
export function sampleFourierReconstruction2D(
  coefficients: readonly FourierCoefficient2D[],
  sampleCount: number,
  origin: Vec2Tuple = [0, 0],
): Vec2Tuple[] {
  return sampleFourierReconstructionRange2D(
    coefficients,
    sampleCount,
    [0, 1],
    false,
    origin,
  );
}

/** RMS distance between equal-parameter source samples and a reconstruction. */
export function calculateFourierRmsError2D(
  sourcePoints: readonly Vec2Tuple[],
  coefficients: readonly FourierCoefficient2D[],
): number {
  assertPointSamples(sourcePoints);
  const samples = withoutRepeatedClosure(sourcePoints);
  let squaredError = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const expected = samples[index];
    const actual = reconstructFourierPoint2D(
      coefficients,
      index / samples.length,
    );
    const dx = actual[0] - expected[0];
    const dy = actual[1] - expected[1];
    squaredError += dx * dx + dy * dy;
  }

  return Math.sqrt(squaredError / samples.length);
}
