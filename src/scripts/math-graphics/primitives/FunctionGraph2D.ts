import type { ColorRepresentation } from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import {
  type MathScene2D,
  type ViewBounds2D,
} from "../core/MathScene2D";
import { COLORS } from "../core/colors";
import { MathObject2D } from "../core/MathObject2D";
import type {
  Domain,
  OutlineTraceOptions,
  ScalarEquation,
  Vec2Tuple,
} from "../core/types";
import { OutlineTraceLineMaterial } from "../materials/OutlineTraceLineMaterial";

const TRACE_VISIBILITY_EPSILON = 1e-7;
const EVALUATION_EPSILON = 1e-12;

export interface FunctionGraph2DStyle {
  color?: ColorRepresentation;
  width?: number;
  opacity?: number;
}

export interface FunctionGraph2DOptions {
  equation: ScalarEquation;
  /**
   * Optional mathematical domain restriction. In responsive mode the graph is
   * sampled on the intersection of this domain and the visible x interval.
   */
  domain?: Domain;
  /** Enables responsive sampling from the current camera bounds. */
  scene?: MathScene2D;
  /** Fixed sample count. When omitted, samplesPerUnit is used. */
  segments?: number;
  samplesPerUnit?: number;
  minimumSegments?: number;
  maximumSegments?: number;
  /** Extra camera-space sampling beyond each horizontal edge. */
  overscanPixels?: number;
  /**
   * Break a polyline when adjacent samples jump by more than this many world
   * units. When omitted, the threshold follows the visible height.
   */
  discontinuityThreshold?: number;
  /** Values larger than this are treated as outside the drawable real graph. */
  maximumSampleMagnitude?: number;
  style?: FunctionGraph2DStyle;
  name?: string;
}

export type FunctionAxis2D = "x" | "y" | "both";

export interface FunctionAxisIntersection2D {
  axis: FunctionAxis2D;
  point: Vec2Tuple;
}

export interface FunctionAxisIntersectionSearch2DOptions {
  bounds?: ViewBounds2D;
  rootTolerance?: number;
  duplicateTolerance?: number;
}

export interface FunctionGraphSampleSegment2D {
  readonly points: readonly Vec2Tuple[];
}

interface MutableSampleSegment {
  points: Vec2Tuple[];
  cumulativeLengths: number[];
  totalLength: number;
}

interface RenderSegment {
  sample: MutableSampleSegment;
  geometry: LineGeometry;
  completeMaterial: LineMaterial;
  traceMaterial: OutlineTraceLineMaterial;
  completeLine: Line2;
  traceLine: Line2;
}

type SamplesChangedCallback = () => void;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function clampOpacity(value: number): number {
  return clamp(value, 0, 1);
}

function makeLinePositions(points: readonly Vec2Tuple[]): number[] {
  const positions: number[] = [];

  for (const [x, y] of points) {
    positions.push(x, y, 0.025);
  }

  return positions;
}

function calculateCumulativeLengths(
  points: readonly Vec2Tuple[],
): { cumulativeLengths: number[]; totalLength: number } {
  const cumulativeLengths = [0];
  let totalLength = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    totalLength += Math.hypot(
      current[0] - previous[0],
      current[1] - previous[1],
    );
    cumulativeLengths.push(totalLength);
  }

  return { cumulativeLengths, totalLength };
}

function safelyEvaluate(
  equation: ScalarEquation,
  x: number,
  maximumMagnitude: number,
): number | null {
  try {
    const y = equation(x);
    if (!Number.isFinite(y) || Math.abs(y) > maximumMagnitude) return null;
    return y;
  } catch {
    return null;
  }
}

function shouldBreakSegment(
  equation: ScalarEquation,
  left: Vec2Tuple,
  right: Vec2Tuple,
  discontinuityThreshold: number,
  maximumMagnitude: number,
): boolean {
  const jump = Math.abs(right[1] - left[1]);
  if (jump <= discontinuityThreshold) return false;

  const x0 = left[0];
  const x1 = right[0];
  const fractions = [0.25, 0.5, 0.75];

  for (const fraction of fractions) {
    const x = x0 + fraction * (x1 - x0);
    const y = safelyEvaluate(equation, x, maximumMagnitude);
    if (y === null) return true;
  }

  const midpointX = (x0 + x1) / 2;
  const midpointY = safelyEvaluate(equation, midpointX, maximumMagnitude);
  if (midpointY === null) return true;

  const linearMidpointY = (left[1] + right[1]) / 2;
  const nonlinearity = Math.abs(midpointY - linearMidpointY);
  const oppositeLargeSigns =
    Math.sign(left[1]) !== Math.sign(right[1]) &&
    Math.min(Math.abs(left[1]), Math.abs(right[1])) >
      discontinuityThreshold * 0.5;

  return oppositeLargeSigns && nonlinearity > jump * 0.2;
}

function sampleFunctionSegments(
  equation: ScalarEquation,
  domain: Domain,
  segments: number,
  discontinuityThreshold: number,
  maximumMagnitude: number,
): MutableSampleSegment[] {
  const [minimumX, maximumX] = domain;
  const sampled: MutableSampleSegment[] = [];
  let currentPoints: Vec2Tuple[] = [];
  let previousPoint: Vec2Tuple | null = null;

  const finishCurrent = (): void => {
    if (currentPoints.length >= 2) {
      const { cumulativeLengths, totalLength } =
        calculateCumulativeLengths(currentPoints);

      if (totalLength > 0 && Number.isFinite(totalLength)) {
        sampled.push({
          points: currentPoints,
          cumulativeLengths,
          totalLength,
        });
      }
    }

    currentPoints = [];
    previousPoint = null;
  };

  for (let index = 0; index <= segments; index += 1) {
    const fraction = index / segments;
    const x = minimumX + (maximumX - minimumX) * fraction;
    const y = safelyEvaluate(equation, x, maximumMagnitude);

    if (y === null) {
      finishCurrent();
      continue;
    }

    const point: Vec2Tuple = [x, y];

    if (
      previousPoint &&
      shouldBreakSegment(
        equation,
        previousPoint,
        point,
        discontinuityThreshold,
        maximumMagnitude,
      )
    ) {
      finishCurrent();
    }

    currentPoints.push(point);
    previousPoint = point;
  }

  finishCurrent();
  return sampled;
}

function arcFractionAtX(segment: MutableSampleSegment, x: number): number {
  const { points, cumulativeLengths, totalLength } = segment;
  if (totalLength <= EVALUATION_EPSILON) return 0;
  if (x <= points[0][0]) return 0;
  if (x >= points[points.length - 1][0]) return 1;

  let low = 0;
  let high = points.length - 1;

  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle][0] <= x) low = middle;
    else high = middle;
  }

  const left = points[low];
  const right = points[high];
  const xSpan = right[0] - left[0];
  const fraction = xSpan <= EVALUATION_EPSILON
    ? 0
    : (x - left[0]) / xSpan;
  const localLength =
    cumulativeLengths[low] +
    fraction * (cumulativeLengths[high] - cumulativeLengths[low]);

  return clamp(localLength / totalLength, 0, 1);
}

function refineBracketedRoot(
  equation: ScalarEquation,
  leftX: number,
  rightX: number,
  leftY: number,
  rightY: number,
  tolerance: number,
): number | null {
  let a = leftX;
  let b = rightX;
  let fa = leftY;
  let fb = rightY;

  if (Math.abs(fa) <= tolerance) return a;
  if (Math.abs(fb) <= tolerance) return b;
  if (Math.sign(fa) === Math.sign(fb)) return null;

  for (let iteration = 0; iteration < 72; iteration += 1) {
    const middle = (a + b) / 2;
    let fm: number;

    try {
      fm = equation(middle);
    } catch {
      return null;
    }

    if (!Number.isFinite(fm)) return null;
    if (Math.abs(fm) <= tolerance || Math.abs(b - a) <= tolerance) {
      return middle;
    }

    if (Math.sign(fa) === Math.sign(fm)) {
      a = middle;
      fa = fm;
    } else {
      b = middle;
      fb = fm;
    }
  }

  return Math.abs(fa) < Math.abs(fb) ? a : b;
}

function refineTouchingRoot(
  equation: ScalarEquation,
  leftX: number,
  rightX: number,
  tolerance: number,
): number | null {
  const goldenRatio = (Math.sqrt(5) - 1) / 2;
  let a = leftX;
  let b = rightX;
  let c = b - goldenRatio * (b - a);
  let d = a + goldenRatio * (b - a);

  const squaredValue = (x: number): number => {
    try {
      const y = equation(x);
      return Number.isFinite(y) ? y * y : Number.POSITIVE_INFINITY;
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  };

  let fc = squaredValue(c);
  let fd = squaredValue(d);

  for (let iteration = 0; iteration < 64; iteration += 1) {
    if (fc < fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - goldenRatio * (b - a);
      fc = squaredValue(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + goldenRatio * (b - a);
      fd = squaredValue(d);
    }
  }

  const x = fc < fd ? c : d;
  const squared = Math.min(fc, fd);
  return squared <= tolerance * tolerance ? x : null;
}


function refineFiniteBoundaryRoot(
  equation: ScalarEquation,
  invalidX: number,
  validX: number,
  tolerance: number,
): number | null {
  let invalid = invalidX;
  let valid = validX;

  const rawEvaluate = (x: number): number | null => {
    try {
      const y = equation(x);
      return Number.isFinite(y) ? y : null;
    } catch {
      return null;
    }
  };

  if (rawEvaluate(invalid) !== null) return null;
  let validValue = rawEvaluate(valid);
  if (validValue === null) return null;

  for (let iteration = 0; iteration < 72; iteration += 1) {
    const middle = (invalid + valid) / 2;
    const middleValue = rawEvaluate(middle);

    if (middleValue === null) {
      invalid = middle;
    } else {
      valid = middle;
      validValue = middleValue;
    }
  }

  return Math.abs(validValue) <= tolerance ? valid : null;
}

/**
 * A responsive sampled explicit graph y = f(x).
 *
 * Invalid real values (NaN, infinities, thrown domain errors) create gaps.
 * Large jumps are split into separate line strips, so logarithms, radicals,
 * reciprocals, and trigonometric functions with asymptotes can all be drawn by
 * ordinary JavaScript function definitions.
 */
export class FunctionGraph2D extends MathObject2D {
  private readonly equation: ScalarEquation;
  private readonly domainLimit: Domain | null;
  private readonly scene: MathScene2D | null;
  private readonly fixedSegments: number | null;
  private readonly samplesPerUnit: number;
  private readonly minimumSegments: number;
  private readonly maximumSegments: number;
  private readonly overscanPixels: number;
  private readonly configuredDiscontinuityThreshold: number | null;
  private readonly configuredMaximumMagnitude: number | null;

  private styleColor: ColorRepresentation;
  private styleWidth: number;
  private styleOpacity: number;

  private sampledDomain: Domain;
  private sampledSegments: MutableSampleSegment[] = [];
  private renderSegments: RenderSegment[] = [];
  private readonly samplesChangedCallbacks = new Set<SamplesChangedCallback>();
  private stopViewChange: (() => void) | null = null;

  private traceMode = false;
  private traceFrom = 0;
  private traceTo = 1;
  private stopTraceFrame: (() => void) | null = null;

  constructor({
    equation,
    domain,
    scene,
    segments,
    samplesPerUnit = 80,
    minimumSegments = 320,
    maximumSegments = 2400,
    overscanPixels = 12,
    discontinuityThreshold,
    maximumSampleMagnitude,
    style = {},
    name = "function-graph-2d",
  }: FunctionGraph2DOptions) {
    super();

    if (!scene && !domain) {
      throw new Error(
        "FunctionGraph2D requires either a scene or an explicit domain.",
      );
    }

    if (domain && !(domain[0] < domain[1])) {
      throw new RangeError("Function-graph domain must be increasing.");
    }

    this.name = name;
    this.equation = equation;
    this.domainLimit = domain ? [domain[0], domain[1]] : null;
    this.scene = scene ?? null;
    this.fixedSegments = segments === undefined
      ? null
      : Math.max(2, Math.floor(segments));
    this.samplesPerUnit = Math.max(2, samplesPerUnit);
    this.minimumSegments = Math.max(2, Math.floor(minimumSegments));
    this.maximumSegments = Math.max(
      this.minimumSegments,
      Math.floor(maximumSegments),
    );
    this.overscanPixels = Math.max(0, overscanPixels);
    this.configuredDiscontinuityThreshold =
      discontinuityThreshold === undefined
        ? null
        : Math.max(0, discontinuityThreshold);
    this.configuredMaximumMagnitude =
      maximumSampleMagnitude === undefined
        ? null
        : Math.max(1, maximumSampleMagnitude);

    this.styleColor = style.color ?? COLORS.cyan;
    this.styleWidth = Math.max(0, style.width ?? 3);
    this.styleOpacity = clampOpacity(style.opacity ?? 1);

    this.sampledDomain = this.resolveSamplingDomain();
    this.rebuildGraph();

    if (this.scene) {
      this.stopViewChange = this.scene.onViewChange(() => {
        this.sampledDomain = this.resolveSamplingDomain();
        this.rebuildGraph();
        this.changed();
      }, false);
    }
  }

  getDomain(): Domain {
    return [this.sampledDomain[0], this.sampledDomain[1]];
  }

  getSampledSegments(): readonly FunctionGraphSampleSegment2D[] {
    return this.sampledSegments;
  }

  /** Compatibility helper: returns all valid points without joining gaps. */
  getSampledPoints(): readonly Vec2Tuple[] {
    return this.sampledSegments.flatMap((segment) => segment.points);
  }

  onSamplesChanged(
    callback: SamplesChangedCallback,
    fireImmediately = true,
  ): () => void {
    this.samplesChangedCallbacks.add(callback);
    if (fireImmediately) callback();

    return () => {
      this.samplesChangedCallbacks.delete(callback);
    };
  }

  clampX(x: number): number {
    return clamp(x, this.sampledDomain[0], this.sampledDomain[1]);
  }

  tryEvaluate(x: number): number | null {
    const maximumMagnitude = this.getMaximumSampleMagnitude();
    return safelyEvaluate(this.equation, this.clampX(x), maximumMagnitude);
  }

  evaluate(x: number): number {
    const clampedX = this.clampX(x);
    const y = this.tryEvaluate(clampedX);

    if (y === null) {
      throw new RangeError(
        `FunctionGraph2D has no finite real value at x = ${clampedX}.`,
      );
    }

    return y;
  }

  getPointAtX(x: number): Vec2Tuple {
    const clampedX = this.clampX(x);
    return [clampedX, this.evaluate(clampedX)];
  }

  /**
   * Return the valid graph point nearest a requested x coordinate. This keeps
   * dragging stable across excluded domains and vertical asymptote gaps.
   */
  getNearestPointAtX(x: number): Vec2Tuple | null {
    if (this.sampledSegments.length === 0) return null;

    const clampedX = this.clampX(x);

    for (const segment of this.sampledSegments) {
      const firstX = segment.points[0][0];
      const lastX = segment.points[segment.points.length - 1][0];

      if (clampedX >= firstX && clampedX <= lastX) {
        const y = safelyEvaluate(
          this.equation,
          clampedX,
          this.getMaximumSampleMagnitude(),
        );
        if (y !== null) return [clampedX, y];
      }
    }

    let nearest: Vec2Tuple | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const segment of this.sampledSegments) {
      const endpoints = [
        segment.points[0],
        segment.points[segment.points.length - 1],
      ];

      for (const point of endpoints) {
        const distance = Math.abs(point[0] - clampedX);
        if (distance < nearestDistance) {
          nearest = point;
          nearestDistance = distance;
        }
      }
    }

    return nearest ? [nearest[0], nearest[1]] : null;
  }

  /** Numerically detect all visible intersections with x = 0 and y = 0. */
  findAxisIntersections(
    options: FunctionAxisIntersectionSearch2DOptions = {},
  ): FunctionAxisIntersection2D[] {
    const rootTolerance = Math.max(1e-12, options.rootTolerance ?? 1e-8);
    const duplicateTolerance = Math.max(
      rootTolerance * 10,
      options.duplicateTolerance ?? 1e-5,
    );
    const roots: number[] = [];

    const addRoot = (x: number): void => {
      if (!Number.isFinite(x)) return;
      if (
        roots.some((existing) => Math.abs(existing - x) <= duplicateTolerance)
      ) {
        return;
      }
      roots.push(x);
    };

    const sampleStep =
      (this.sampledDomain[1] - this.sampledDomain[0]) /
      this.getSamplingSegmentCount();

    for (const segment of this.sampledSegments) {
      const { points } = segment;
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];

      if (firstPoint[0] - sampleStep >= this.sampledDomain[0] - 1e-12) {
        const boundaryRoot = refineFiniteBoundaryRoot(
          this.equation,
          firstPoint[0] - sampleStep,
          firstPoint[0],
          rootTolerance,
        );
        if (boundaryRoot !== null) addRoot(boundaryRoot);
      }

      if (lastPoint[0] + sampleStep <= this.sampledDomain[1] + 1e-12) {
        const boundaryRoot = refineFiniteBoundaryRoot(
          this.equation,
          lastPoint[0] + sampleStep,
          lastPoint[0],
          rootTolerance,
        );
        if (boundaryRoot !== null) addRoot(boundaryRoot);
      }

      for (let index = 0; index < points.length; index += 1) {
        const [x, y] = points[index];
        if (Math.abs(y) <= rootTolerance) addRoot(x);

        if (index > 0) {
          const previous = points[index - 1];
          if (Math.sign(previous[1]) !== Math.sign(y)) {
            const root = refineBracketedRoot(
              this.equation,
              previous[0],
              x,
              previous[1],
              y,
              rootTolerance,
            );
            if (root !== null) addRoot(root);
          }
        }

        if (index > 0 && index + 1 < points.length) {
          const previousAbs = Math.abs(points[index - 1][1]);
          const currentAbs = Math.abs(y);
          const nextAbs = Math.abs(points[index + 1][1]);

          if (currentAbs <= previousAbs && currentAbs <= nextAbs) {
            const root = refineTouchingRoot(
              this.equation,
              points[index - 1][0],
              points[index + 1][0],
              rootTolerance,
            );
            if (root !== null) addRoot(root);
          }
        }
      }
    }

    roots.sort((a, b) => a - b);

    const intersections: FunctionAxisIntersection2D[] = roots.map((x) => ({
      axis: "x",
      point: [x, 0],
    }));

    if (
      this.sampledDomain[0] <= 0 &&
      this.sampledDomain[1] >= 0
    ) {
      const y = safelyEvaluate(
        this.equation,
        0,
        this.getMaximumSampleMagnitude(),
      );

      if (y !== null) {
        const existing = intersections.find(
          ({ point }) =>
            Math.abs(point[0]) <= duplicateTolerance &&
            Math.abs(point[1] - y) <= duplicateTolerance,
        );

        if (existing) {
          existing.axis = "both";
          existing.point = [0, 0];
        } else {
          intersections.push({ axis: "y", point: [0, y] });
        }
      }
    }

    const { bounds } = options;
    const filtered = bounds
      ? intersections.filter(({ point }) =>
          point[0] >= bounds.left - duplicateTolerance &&
          point[0] <= bounds.right + duplicateTolerance &&
          point[1] >= bounds.bottom - duplicateTolerance &&
          point[1] <= bounds.top + duplicateTolerance,
        )
      : intersections;

    return filtered.sort((a, b) => {
      if (a.point[0] !== b.point[0]) return a.point[0] - b.point[0];
      return a.point[1] - b.point[1];
    });
  }

  setColor(color: ColorRepresentation): this {
    this.styleColor = color;
    for (const segment of this.renderSegments) {
      segment.completeMaterial.color.set(color);
      segment.traceMaterial.color.set(color);
    }
    return this.changed();
  }

  setWidth(widthPixels: number): this {
    this.styleWidth = Math.max(0, widthPixels);
    for (const segment of this.renderSegments) {
      segment.completeMaterial.linewidth = this.styleWidth;
      segment.traceMaterial.linewidth = this.styleWidth;
    }
    this.refreshVisibility();
    return this.changed();
  }

  setOpacity(opacity: number): this {
    this.styleOpacity = clampOpacity(opacity);
    for (const segment of this.renderSegments) {
      segment.completeMaterial.opacity = this.styleOpacity;
      segment.traceMaterial.opacity = this.styleOpacity;
    }
    this.refreshVisibility();
    return this.changed();
  }

  /** Reveal a normalized increasing-x interval of the sampled domain. */
  setGraphTraceRange(from: number, to: number): this {
    this.traceMode = true;
    this.traceFrom = clamp(Math.min(from, to), 0, 1);
    this.traceTo = clamp(Math.max(from, to), 0, 1);
    this.refreshVisibility();
    return this.changed();
  }

  showCompleteGraph(): this {
    this.traceMode = false;
    this.traceFrom = 0;
    this.traceTo = 1;
    this.refreshVisibility();
    return this.changed();
  }

  /** Trace the graph in increasing-x order, including across separate branches. */
  traceLeftToRight(options: OutlineTraceOptions = {}): () => void {
    this.stopGraphTrace(false);

    const speed = options.speed ?? 0.45;
    const from = clamp(options.from ?? 0, 0, 1);
    const to = clamp(options.to ?? 1, 0, 1);
    const loop = options.loop ?? false;
    const loopPause = Math.max(0, options.loopPause ?? 0);

    if (!(speed > 0) || !Number.isFinite(speed)) {
      throw new RangeError("Graph trace speed must be positive and finite.");
    }

    if (from === to) {
      this.setGraphTraceRange(from, to);
      return () => this.stopGraphTrace();
    }

    const direction = Math.sign(to - from);
    let progress = from;
    let pauseRemaining = 0;
    let waitingToRestart = false;

    this.setGraphTraceRange(from, from);

    const stopFrame = this.onFrame(({ deltaTime }) => {
      if (waitingToRestart) {
        pauseRemaining -= deltaTime;
        if (pauseRemaining > 0) return;

        waitingToRestart = false;
        progress = from;
        this.setGraphTraceRange(from, from);
        return;
      }

      progress += direction * speed * deltaTime;
      const completed = direction > 0 ? progress >= to : progress <= to;
      if (completed) progress = to;

      if (direction > 0) {
        this.setGraphTraceRange(from, progress);
      } else {
        this.setGraphTraceRange(progress, from);
      }

      if (!completed) return;

      if (loop) {
        waitingToRestart = true;
        pauseRemaining = loopPause;
      } else {
        this.showCompleteGraph();
        this.stopGraphTrace(false);
      }
    });

    this.stopTraceFrame = stopFrame;
    return () => this.stopGraphTrace();
  }

  stopGraphTrace(showComplete = true): this {
    this.stopTraceFrame?.();
    this.stopTraceFrame = null;

    if (showComplete) this.showCompleteGraph();
    return this;
  }

  dispose(): void {
    this.stopGraphTrace(false);
    this.stopViewChange?.();
    this.stopViewChange = null;
    this.samplesChangedCallbacks.clear();
    this.disposeRenderSegments();
  }

  private resolveSamplingDomain(): Domain {
    let minimumX: number;
    let maximumX: number;

    if (this.scene) {
      const bounds = this.scene.getViewBounds(-this.overscanPixels);
      minimumX = bounds.left;
      maximumX = bounds.right;
    } else {
      minimumX = this.domainLimit![0];
      maximumX = this.domainLimit![1];
    }

    if (this.domainLimit) {
      minimumX = Math.max(minimumX, this.domainLimit[0]);
      maximumX = Math.min(maximumX, this.domainLimit[1]);
    }

    if (!(minimumX < maximumX)) {
      // Keep a tiny increasing domain so all public invariants remain valid;
      // the graph will simply contain no visible line strips.
      const center = (minimumX + maximumX) / 2;
      return [center - 1e-6, center + 1e-6];
    }

    return [minimumX, maximumX];
  }

  private getSamplingSegmentCount(): number {
    if (this.fixedSegments !== null) return this.fixedSegments;

    const width = this.sampledDomain[1] - this.sampledDomain[0];
    return clamp(
      Math.ceil(width * this.samplesPerUnit),
      this.minimumSegments,
      this.maximumSegments,
    );
  }

  private getDiscontinuityThreshold(): number {
    if (this.configuredDiscontinuityThreshold !== null) {
      return this.configuredDiscontinuityThreshold;
    }

    const visibleHeight = this.scene?.getViewBounds().height ?? 8;
    return Math.max(2, visibleHeight * 2.5);
  }

  private getMaximumSampleMagnitude(): number {
    if (this.configuredMaximumMagnitude !== null) {
      return this.configuredMaximumMagnitude;
    }

    const visibleHeight = this.scene?.getViewBounds().height ?? 8;
    return Math.max(10_000, visibleHeight * 2_000);
  }

  private rebuildGraph(): void {
    this.disposeRenderSegments();

    this.sampledSegments = sampleFunctionSegments(
      this.equation,
      this.sampledDomain,
      this.getSamplingSegmentCount(),
      this.getDiscontinuityThreshold(),
      this.getMaximumSampleMagnitude(),
    );

    for (let index = 0; index < this.sampledSegments.length; index += 1) {
      const sample = this.sampledSegments[index];
      const geometry = new LineGeometry();
      geometry.setPositions(makeLinePositions(sample.points));

      const completeMaterial = new LineMaterial({
        color: this.styleColor,
        opacity: this.styleOpacity,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        dashed: false,
        alphaToCoverage: false,
      });
      completeMaterial.linewidth = this.styleWidth;

      const traceMaterial = new OutlineTraceLineMaterial({
        color: this.styleColor,
        opacity: this.styleOpacity,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        alphaToCoverage: false,
      });
      traceMaterial.linewidth = this.styleWidth;
      traceMaterial.setTraceTotalLength(sample.totalLength);

      const completeLine = new Line2(geometry, completeMaterial);
      completeLine.name = `${this.name}:complete-line-${index}`;
      completeLine.renderOrder = 2;

      const traceLine = new Line2(geometry, traceMaterial);
      traceLine.name = `${this.name}:trace-line-${index}`;
      traceLine.renderOrder = 2;
      traceLine.computeLineDistances();

      this.add(completeLine, traceLine);
      this.renderSegments.push({
        sample,
        geometry,
        completeMaterial,
        traceMaterial,
        completeLine,
        traceLine,
      });
    }

    this.refreshVisibility();

    for (const callback of this.samplesChangedCallbacks) {
      callback();
    }
  }

  private disposeRenderSegments(): void {
    for (const segment of this.renderSegments) {
      this.remove(segment.completeLine, segment.traceLine);
      segment.geometry.dispose();
      segment.completeMaterial.dispose();
      segment.traceMaterial.dispose();
    }

    this.renderSegments = [];
  }

  private refreshVisibility(): void {
    const canRender = this.styleOpacity > 0 && this.styleWidth > 0;
    const [domainMinimum, domainMaximum] = this.sampledDomain;
    const domainSpan = domainMaximum - domainMinimum;
    const traceMinimumX = domainMinimum + this.traceFrom * domainSpan;
    const traceMaximumX = domainMinimum + this.traceTo * domainSpan;

    for (const segment of this.renderSegments) {
      segment.completeLine.visible = canRender && !this.traceMode;

      if (!this.traceMode || !canRender) {
        segment.traceLine.visible = false;
        continue;
      }

      const segmentMinimumX = segment.sample.points[0][0];
      const segmentMaximumX =
        segment.sample.points[segment.sample.points.length - 1][0];
      const overlapMinimumX = Math.max(traceMinimumX, segmentMinimumX);
      const overlapMaximumX = Math.min(traceMaximumX, segmentMaximumX);

      if (overlapMaximumX - overlapMinimumX <= TRACE_VISIBILITY_EPSILON) {
        segment.traceLine.visible = false;
        continue;
      }

      const localFrom = arcFractionAtX(segment.sample, overlapMinimumX);
      const localTo = arcFractionAtX(segment.sample, overlapMaximumX);
      segment.traceMaterial.setTraceRange(localFrom, localTo);
      segment.traceLine.visible =
        localTo - localFrom > TRACE_VISIBILITY_EPSILON;
    }
  }
}

export function createFunctionGraph2D(
  options: FunctionGraph2DOptions,
): FunctionGraph2D {
  return new FunctionGraph2D(options);
}
