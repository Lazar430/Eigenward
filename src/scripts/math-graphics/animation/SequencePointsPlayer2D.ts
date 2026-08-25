import { HUES } from "../core/colors";
import {
  createMathScene2D,
  type MathScene2D,
} from "../core/MathScene2D";
import type {
  ParametricShape2D,
} from "../primitives/ParametricShape2D";
import {
  createNumberLinePoint2D,
  formatNumberLineTick2D,
  niceNumberLineTickStep2D,
} from "../presentation/NumberLine2D";
import {
  createSegment2D,
  type Segment2D,
} from "../primitives/Segment2D";
import {
  createTextLabel2D,
  type TextLabel2D,
} from "../primitives/TextLabel2D";

const TAU = Math.PI * 2;
const EPSILON = 1e-12;

export type SequenceLimit2D = number;

export interface SequencePointsPlayer2DStyle {
  axisColor?: number;
  axisOpacity?: number;
  axisWidth?: number;

  tickColor?: number;
  tickOpacity?: number;
  tickWidth?: number;
  tickLabelColor?: string;
  tickLabelFontSizePx?: number;

  termFill?: number;
  termOutline?: number;
  termOutlineWidth?: number;
  termRadiusPixels?: number;

  limitFill?: number;
  limitOutline?: number;
  limitOutlineWidth?: number;
  limitRadiusPixels?: number;

  intervalColor?: string;
  intervalParenthesisFontSizePx?: number;
  intervalEndpointColor?: string;
  intervalEndpointFontSizePx?: number;

  formulaColor?: string;
  formulaFontSizePx?: number;
  formulaBackground?: string;
  formulaBorder?: string;

  epsilonColor?: string;
  epsilonFontSizePx?: number;
  epsilonBackground?: string;
  epsilonBorder?: string;

  limitLabelColor?: string;
  limitLabelFontSizePx?: number;
  limitLabelBackground?: string;
  limitLabelBorder?: string;

  currentIndexColor?: string;
  currentIndexFontSizePx?: number;
  currentIndexBackground?: string;
  currentIndexBorder?: string;

  rankNeutralColor?: string;
  rankActiveColor?: string;
  rankFontSizePx?: number;
  rankBackground?: string;
  rankBorder?: string;
}

export interface SequencePointsPlayer2DOptions {
  /** Ordinary JavaScript sequence formula n -> a_n. */
  sequence: (n: number) => number;

  /** First sequence index. Default: 1. */
  startIndex?: number;

  /** Number of newly animated dots requested in each round. */
  termCount: number;

  /**
   * Hard-coded limit. Use Infinity / -Infinity for divergence to infinity.
   * The player never tries to infer the limit.
   */
  limit: SequenceLimit2D;

  /**
   * Initial epsilon-neighborhood radius for a finite limit.
   * Ignored for +Infinity / -Infinity.
   */
  epsilon?: number;

  /** TeX displayed above the number line. */
  formulaLatex: string;

  /** Optional custom TeX for the limit label. */
  limitLabelLatex?: string;

  /** Horizontal padding around the initial finite data range. Default: 0.10. */
  finitePaddingFraction?: number;

  /** Horizontal padding around the initial divergent batch. Default: 0.10. */
  divergentPaddingFraction?: number;

  /** Approximate number of numerical ticks. Default: 7. */
  targetTickCount?: number;

  /** Delay before the first dot in a batch. Default: 0.42 s. */
  initialDelaySeconds?: number;

  /** Delay between dots. Default: 0.28 s. */
  termIntervalSeconds?: number;

  /** Dot pop duration. Default: 0.28 s. */
  popDurationSeconds?: number;

  /**
   * Multiplicative growth of the term-sampling stride in later recursive
   * rounds. Default: 2.
   *
   * A stride of 1 displays every eligible term, 2 samples every second term,
   * 4 every fourth term, and so on.
   */
  termStrideGrowthFactor?: number;

  /**
   * Number of recursive transitions between stride-growth steps.
   *
   * Default: 2, producing the gentler schedule
   *
   *   initial: 1
   *   rounds:  2, 2, 4, 4, 8, 8, 16, 16, ...
   *
   * Set this to 1 for the exact powers-of-two schedule
   *
   *   1, 2, 4, 8, 16, ...
   */
  termStrideGrowthEveryTransitions?: number;

  /**
   * Hard cap for the progressive sampling stride. Default: 128.
   *
   * Without a cap, exponential stride growth would eventually race through
   * JavaScript's safe integer range even though only a small batch is drawn.
   */
  maximumTermStride?: number;

  /** Pause after a finished batch before the next automatic step. Default: 0.70 s. */
  roundHoldSeconds?: number;

  /** Hold the new epsilon-neighborhood before moving the camera. Default: 0.55 s. */
  neighborhoodHoldSeconds?: number;

  /** Camera-transition duration. Default: 0.95 s. */
  cameraDurationSeconds?: number;

  /** Pause after camera movement before the next dots appear. Default: 0.34 s. */
  postCameraPauseSeconds?: number;

  /**
   * New epsilon is at most this fraction of the smallest strictly-positive
   * distance of any displayed term from L. Default: 0.92.
   */
  epsilonShrinkFactor?: number;

  /**
   * Finite-limit camera behavior.
   *
   * If the old interval is (L-e_old, L+e_old), the next camera half-width is
   * this fraction of e_old. Therefore e_old itself has just passed off-screen,
   * while the newly-created smaller interval and most of the annular space
   * between the two neighborhoods remain visible.
   *
   * Must be < 1. Default: 0.975.
   */
  zoomPastPreviousIntervalFraction?: number;

  /**
   * Divergent sequences pan by at least one old viewport width plus this gap.
   * The zoom level is kept fixed. Default: 0.06.
   */
  divergentPanGapFraction?: number;

  /**
   * Maximum number of candidate sequence terms EVALUATED while locating the
   * next finite batch, or the next term that has escaped the old divergent
   * viewport. With progressive sampling, the actual index range traversed may
   * be much larger. Default: 50,000.
   */
  maximumScanTermsPerBatch?: number;

  /**
   * Large safety cap for automatic recursive/panning transitions.
   * Reaching it freezes the scene; it does NOT loop back. Default: 512.
   */
  maxAutomaticTransitions?: number;

  /** Sequence-index precision guard. Default: Number.MAX_SAFE_INTEGER - 1. */
  maximumSequenceIndex?: number;

  /** Fraction of the canvas that must be visible before the animation starts. */
  startVisibilityRatio?: number;

  /**
   * Show a live n-label that updates when each newly animated term appears.
   * Default: false, so existing scenes are unchanged unless they opt in.
   */
  showCurrentIndexLabel?: boolean;

  /**
   * For finite limits, show a candidate rank label. It resets to a neutral
   * state at every epsilon transition and turns green at the first newly
   * animated term satisfying |a_n - L| < epsilon.
   *
   * This is intentionally a visual candidate rank, not a proof that every
   * later (possibly skipped) term also lies in the neighborhood.
   *
   * Default: false.
   */
  showRankLabel?: boolean;

  /** TeX symbol used for the rank label. Default: \mu. */
  rankSymbolLatex?: string;

  style?: SequencePointsPlayer2DStyle;
  background?: number | null;
  name?: string;
}

export interface SequenceTerm2D {
  index: number;
  value: number;
}

export interface SequenceViewport2D {
  left: number;
  right: number;
  centerX: number;
  span: number;
}

interface ResolvedStyle2D {
  axisColor: number;
  axisOpacity: number;
  axisWidth: number;
  tickColor: number;
  tickOpacity: number;
  tickWidth: number;
  tickLabelColor: string;
  tickLabelFontSizePx: number;
  termFill: number;
  termOutline: number;
  termOutlineWidth: number;
  termRadiusPixels: number;
  limitFill: number;
  limitOutline: number;
  limitOutlineWidth: number;
  limitRadiusPixels: number;
  intervalColor: string;
  intervalParenthesisFontSizePx: number;
  intervalEndpointColor: string;
  intervalEndpointFontSizePx: number;
  formulaColor: string;
  formulaFontSizePx: number;
  formulaBackground: string;
  formulaBorder: string;
  epsilonColor: string;
  epsilonFontSizePx: number;
  epsilonBackground: string;
  epsilonBorder: string;
  limitLabelColor: string;
  limitLabelFontSizePx: number;
  limitLabelBackground: string;
  limitLabelBorder: string;

  currentIndexColor: string;
  currentIndexFontSizePx: number;
  currentIndexBackground: string;
  currentIndexBorder: string;

  rankNeutralColor: string;
  rankActiveColor: string;
  rankFontSizePx: number;
  rankBackground: string;
  rankBorder: string;
}

interface TickEntry {
  x: number;
  segment: Segment2D;
  label: TextLabel2D;
}

interface TermMarkerEntry {
  term: SequenceTerm2D;
  marker: ParametricShape2D;
  scale: number;
  announced: boolean;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutCubic(value: number): number {
  const t = clamp01(value);

  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutBack(value: number): number {
  const t = clamp01(value);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = t - 1;

  return 1 + c3 * u * u * u + c1 * u * u;
}

function resolveStyle(
  style: SequencePointsPlayer2DStyle = {},
): ResolvedStyle2D {
  return {
    axisColor: style.axisColor ?? 0xeee9ff,
    axisOpacity: style.axisOpacity ?? 0.92,
    axisWidth: style.axisWidth ?? 2.3,

    tickColor: style.tickColor ?? 0xded7f2,
    tickOpacity: style.tickOpacity ?? 0.76,
    tickWidth: style.tickWidth ?? 1.8,
    tickLabelColor:
      style.tickLabelColor ?? "rgba(239, 234, 255, 0.76)",
    tickLabelFontSizePx: style.tickLabelFontSizePx ?? 11,

    termFill: style.termFill ?? HUES.cyan.light,
    termOutline: style.termOutline ?? 0x1a2230,
    termOutlineWidth: style.termOutlineWidth ?? 0.025,
    termRadiusPixels: style.termRadiusPixels ?? 6,

    limitFill: style.limitFill ?? HUES.magenta.light,
    limitOutline: style.limitOutline ?? 0x2a1427,
    limitOutlineWidth: style.limitOutlineWidth ?? 0.03,
    limitRadiusPixels: style.limitRadiusPixels ?? 7.5,

    intervalColor:
      style.intervalColor ?? "rgba(255, 222, 150, 0.98)",
    intervalParenthesisFontSizePx:
      style.intervalParenthesisFontSizePx ?? 30,
    intervalEndpointColor:
      style.intervalEndpointColor ?? "rgba(255, 237, 198, 0.94)",
    intervalEndpointFontSizePx:
      style.intervalEndpointFontSizePx ?? 12,

    formulaColor:
      style.formulaColor ?? "rgba(244, 240, 255, 0.98)",
    formulaFontSizePx: style.formulaFontSizePx ?? 18,
    formulaBackground:
      style.formulaBackground ?? "rgba(22, 18, 35, 0.78)",
    formulaBorder:
      style.formulaBorder ??
      "1px solid rgba(190, 176, 235, 0.16)",

    epsilonColor:
      style.epsilonColor ?? "rgba(255, 238, 194, 0.98)",
    epsilonFontSizePx: style.epsilonFontSizePx ?? 14,
    epsilonBackground:
      style.epsilonBackground ?? "rgba(48, 36, 15, 0.78)",
    epsilonBorder:
      style.epsilonBorder ??
      "1px solid rgba(255, 220, 133, 0.18)",

    limitLabelColor:
      style.limitLabelColor ?? "rgba(255, 228, 246, 0.98)",
    limitLabelFontSizePx: style.limitLabelFontSizePx ?? 15,
    limitLabelBackground:
      style.limitLabelBackground ?? "rgba(45, 18, 39, 0.82)",
    limitLabelBorder:
      style.limitLabelBorder ??
      "1px solid rgba(255, 145, 211, 0.20)",

    currentIndexColor:
      style.currentIndexColor ?? "rgba(220, 238, 255, 0.94)",
    currentIndexFontSizePx:
      style.currentIndexFontSizePx ?? 13,
    currentIndexBackground:
      style.currentIndexBackground ?? "rgba(20, 28, 40, 0.76)",
    currentIndexBorder:
      style.currentIndexBorder ??
      "1px solid rgba(138, 194, 255, 0.18)",

    rankNeutralColor:
      style.rankNeutralColor ?? "rgba(222, 218, 235, 0.82)",
    rankActiveColor:
      style.rankActiveColor ?? "rgba(151, 239, 132, 0.98)",
    rankFontSizePx:
      style.rankFontSizePx ?? 13,
    rankBackground:
      style.rankBackground ?? "rgba(25, 24, 32, 0.78)",
    rankBorder:
      style.rankBorder ??
      "1px solid rgba(184, 177, 207, 0.18)",
  };
}

function evaluateSequenceTerm(
  sequence: (n: number) => number,
  index: number,
): SequenceTerm2D {
  let value: number;

  try {
    value = sequence(index);
  } catch {
    value = Number.NaN;
  }

  return { index, value };
}

function computeFiniteInitialViewport(
  terms: readonly SequenceTerm2D[],
  limit: number,
  epsilon: number,
  paddingFraction: number,
): SequenceViewport2D {
  const finiteTermValues = terms
    .map(({ value }) => value)
    .filter(Number.isFinite);

  const values = [
    limit - epsilon,
    limit,
    limit + epsilon,
    ...finiteTermValues,
  ];

  let minimum = Math.min(...values);
  let maximum = Math.max(...values);
  let rawSpan = maximum - minimum;

  if (!(rawSpan > EPSILON)) {
    rawSpan = Math.max(1, Math.abs(limit) * 0.25);
    minimum = limit - rawSpan / 2;
    maximum = limit + rawSpan / 2;
  }

  const padding = rawSpan * Math.max(0.04, paddingFraction);
  const left = minimum - padding;
  const right = maximum + padding;

  return {
    left,
    right,
    centerX: (left + right) / 2,
    span: right - left,
  };
}

function computeDivergentInitialViewport(
  terms: readonly SequenceTerm2D[],
  direction: 1 | -1,
  paddingFraction: number,
): SequenceViewport2D {
  const values = terms
    .map(({ value }) => value)
    .filter(Number.isFinite);

  if (values.length === 0) {
    return {
      left: -1,
      right: 1,
      centerX: 0,
      span: 2,
    };
  }

  let minimum = Math.min(...values);
  let maximum = Math.max(...values);
  let rawSpan = maximum - minimum;

  if (!(rawSpan > EPSILON)) {
    rawSpan = Math.max(1, Math.abs(values[0]) * 0.5);
    minimum -= rawSpan / 2;
    maximum += rawSpan / 2;
  }

  const basePadding = rawSpan * Math.max(0.04, paddingFraction);
  const escapePadding = basePadding * 0.65;
  const trailingPadding = basePadding * 1.35;

  const left = direction > 0
    ? minimum - trailingPadding
    : minimum - escapePadding;

  const right = direction > 0
    ? maximum + escapePadding
    : maximum + trailingPadding;

  return {
    left,
    right,
    centerX: (left + right) / 2,
    span: right - left,
  };
}

function formatNumber(value: number): string {
  if (value === Number.POSITIVE_INFINITY) return "+\\infty";
  if (value === Number.NEGATIVE_INFINITY) return "-\\infty";

  if (Object.is(value, -0) || Math.abs(value) < 1e-15) {
    return "0";
  }

  const absolute = Math.abs(value);

  if (absolute >= 1e6 || absolute < 1e-5) {
    return value
      .toExponential(3)
      .replace(/(\.\d*?[1-9])0+e/, "$1e")
      .replace(/\.0+e/, "e")
      .replace("e+", "e");
  }

  return String(Number(value.toPrecision(7)));
}

function defaultLimitLabelLatex(limit: number): string {
  if (limit === Number.POSITIVE_INFINITY) {
    return String.raw`\lim_{n\to\infty}a_n=+\infty`;
  }

  if (limit === Number.NEGATIVE_INFINITY) {
    return String.raw`\lim_{n\to\infty}a_n=-\infty`;
  }

  return String.raw`\lim_{n\to\infty}a_n=${formatNumber(limit)}`;
}

/**
 * Automatic sequence visualizer for finite epsilon-neighborhood convergence
 * and divergence to ±infinity.
 *
 * Every clock used by the recursive process is driven through MathScene2D's
 * onFrame() loop. MathScene2D pauses that loop while the canvas is offscreen,
 * so this player does not keep scanning terms or advancing rounds while the
 * visitor is elsewhere on the page.
 */
export class SequencePointsPlayer2D {
  readonly scene: MathScene2D;
  readonly axis: Segment2D;
  readonly limitMarker: ParametricShape2D | null;
  readonly limitLabel: TextLabel2D;
  readonly formulaLabel: TextLabel2D;
  readonly epsilonLabel: TextLabel2D | null;
  readonly currentIndexLabel: TextLabel2D | null;
  readonly rankLabel: TextLabel2D | null;

  private readonly canvas: HTMLCanvasElement;
  private readonly options: SequencePointsPlayer2DOptions;
  private readonly style: ResolvedStyle2D;
  private readonly sequence: (n: number) => number;
  private readonly limit: number;
  private readonly finiteLimit: boolean;
  private readonly divergenceDirection: 1 | -1 | 0;
  private readonly batchSize: number;
  private readonly startIndex: number;
  private readonly initialEpsilon: number;
  private readonly initialViewport: SequenceViewport2D;
  private readonly initialTerms: readonly SequenceTerm2D[];

  private readonly initialDelaySeconds: number;
  private readonly termIntervalSeconds: number;
  private readonly popDurationSeconds: number;
  private readonly termStrideGrowthFactor: number;
  private readonly termStrideGrowthEveryTransitions: number;
  private readonly maximumTermStride: number;
  private readonly roundHoldSeconds: number;
  private readonly neighborhoodHoldSeconds: number;
  private readonly cameraDurationSeconds: number;
  private readonly postCameraPauseSeconds: number;
  private readonly epsilonShrinkFactor: number;
  private readonly zoomPastPreviousIntervalFraction: number;
  private readonly divergentPanGapFraction: number;
  private readonly maximumScanTermsPerBatch: number;
  private readonly maxAutomaticTransitions: number;
  private readonly maximumSequenceIndex: number;
  private readonly startVisibilityRatio: number;
  private readonly targetTickCount: number;
  private readonly showCurrentIndexLabel: boolean;
  private readonly showRankLabel: boolean;
  private readonly rankSymbolLatex: string;

  private tickEntries: TickEntry[] = [];
  private termEntries: TermMarkerEntry[] = [];
  private currentBatchEntries: TermMarkerEntry[] = [];

  private readonly leftParenthesis: TextLabel2D | null;
  private readonly rightParenthesis: TextLabel2D | null;
  private readonly leftEndpointLabel: TextLabel2D | null;
  private readonly rightEndpointLabel: TextLabel2D | null;

  private visibilityObserver: IntersectionObserver | null = null;
  private readonly resizeObserver: ResizeObserver;
  private stopAnimation: (() => void) | null = null;

  private currentCenterX: number;
  private currentSpan: number;
  private currentEpsilon: number;
  private nextSequenceIndex: number;
  private smallestPositiveDisplayedDistance = Number.POSITIVE_INFINITY;
  private automaticTransitions = 0;
  private displayedTermCount = 0;
  private rankFoundInCurrentNeighborhood = false;
  private currentAnimatedIndex: number | null = null;

  private initialStarted = false;
  private batchAnimating = false;
  private transitioning = false;
  private stoppedBySafetyGuard = false;
  private unitSizePixels = 1;
  private elapsedCurrentAnimation = 0;

  constructor(
    canvas: HTMLCanvasElement,
    options: SequencePointsPlayer2DOptions,
  ) {
    if (!Number.isInteger(options.termCount) || options.termCount <= 0) {
      throw new RangeError("termCount must be a positive integer.");
    }

    const startIndex = options.startIndex ?? 1;

    if (!Number.isInteger(startIndex)) {
      throw new RangeError("startIndex must be an integer.");
    }

    const finiteLimit = Number.isFinite(options.limit);
    const divergenceDirection: 1 | -1 | 0 = finiteLimit
      ? 0
      : options.limit === Number.POSITIVE_INFINITY
        ? 1
        : options.limit === Number.NEGATIVE_INFINITY
          ? -1
          : 0;

    if (!finiteLimit && divergenceDirection === 0) {
      throw new RangeError(
        "limit must be finite, Infinity, or -Infinity.",
      );
    }

    if (
      finiteLimit &&
      (!(options.epsilon! > 0) || !Number.isFinite(options.epsilon))
    ) {
      throw new RangeError(
        "A finite-limit sequence requires epsilon > 0.",
      );
    }

    this.canvas = canvas;
    this.options = options;
    this.style = resolveStyle(options.style);
    this.sequence = options.sequence;
    this.limit = options.limit;
    this.finiteLimit = finiteLimit;
    this.divergenceDirection = divergenceDirection;
    this.batchSize = options.termCount;
    this.startIndex = startIndex;
    this.initialEpsilon = finiteLimit ? options.epsilon! : 1;
    this.currentEpsilon = this.initialEpsilon;

    this.initialDelaySeconds = Math.max(
      0,
      options.initialDelaySeconds ?? 0.42,
    );

    this.termIntervalSeconds = Math.max(
      0.02,
      options.termIntervalSeconds ?? 0.28,
    );

    this.popDurationSeconds = Math.max(
      0.05,
      options.popDurationSeconds ?? 0.28,
    );

    this.termStrideGrowthFactor = Math.max(
      1.01,
      Math.min(
        16,
        options.termStrideGrowthFactor ?? 2,
      ),
    );

    this.termStrideGrowthEveryTransitions = Math.max(
      1,
      Math.floor(
        options.termStrideGrowthEveryTransitions ?? 2,
      ),
    );

    this.maximumTermStride = Math.max(
      1,
      Math.floor(
        options.maximumTermStride ?? 128,
      ),
    );

    this.roundHoldSeconds = Math.max(
      0,
      options.roundHoldSeconds ?? 0.70,
    );

    this.neighborhoodHoldSeconds = Math.max(
      0,
      options.neighborhoodHoldSeconds ?? 0.55,
    );

    this.cameraDurationSeconds = Math.max(
      0.1,
      options.cameraDurationSeconds ?? 0.95,
    );

    this.postCameraPauseSeconds = Math.max(
      0,
      options.postCameraPauseSeconds ?? 0.34,
    );

    this.epsilonShrinkFactor = Math.min(
      0.98,
      Math.max(0.1, options.epsilonShrinkFactor ?? 0.92),
    );

    this.zoomPastPreviousIntervalFraction = Math.min(
      0.985,
      Math.max(
        this.epsilonShrinkFactor + 0.005,
        options.zoomPastPreviousIntervalFraction ?? 0.975,
      ),
    );

    this.divergentPanGapFraction = Math.max(
      0.01,
      options.divergentPanGapFraction ?? 0.06,
    );

    this.maximumScanTermsPerBatch = Math.max(
      this.batchSize,
      Math.floor(options.maximumScanTermsPerBatch ?? 50_000),
    );

    this.maxAutomaticTransitions = Math.max(
      1,
      Math.floor(options.maxAutomaticTransitions ?? 512),
    );

    this.maximumSequenceIndex = Math.min(
      Number.MAX_SAFE_INTEGER - 1,
      Math.max(
        this.startIndex + this.batchSize,
        Math.floor(
          options.maximumSequenceIndex ??
            Number.MAX_SAFE_INTEGER - 1,
        ),
      ),
    );

    this.startVisibilityRatio = clamp01(
      options.startVisibilityRatio ?? 0.15,
    );

    this.targetTickCount = Math.max(
      2,
      Math.floor(options.targetTickCount ?? 7),
    );

    this.showCurrentIndexLabel =
      options.showCurrentIndexLabel ?? false;

    this.showRankLabel =
      this.finiteLimit &&
      (options.showRankLabel ?? false);

    this.rankSymbolLatex =
      options.rankSymbolLatex ?? String.raw`\mu`;

    const initialTerms: SequenceTerm2D[] = [];

    for (let offset = 0; offset < this.batchSize; offset += 1) {
      initialTerms.push(
        evaluateSequenceTerm(
          this.sequence,
          this.startIndex + offset,
        ),
      );
    }

    this.initialTerms = initialTerms;
    this.nextSequenceIndex = this.startIndex + this.batchSize;

    this.initialViewport = this.finiteLimit
      ? computeFiniteInitialViewport(
          this.initialTerms,
          this.limit,
          this.initialEpsilon,
          options.finitePaddingFraction ?? 0.10,
        )
      : computeDivergentInitialViewport(
          this.initialTerms,
          this.divergenceDirection as 1 | -1,
          options.divergentPaddingFraction ?? 0.10,
        );

    this.currentCenterX = this.initialViewport.centerX;
    this.currentSpan = this.initialViewport.span;

    const width = Math.max(
      320,
      canvas.getBoundingClientRect().width || canvas.clientWidth || 800,
    );

    this.unitSizePixels = width / this.currentSpan;

    this.scene = createMathScene2D(canvas, {
      unitSizePixels: this.unitSizePixels,
      center: [this.currentCenterX, 0],
      background: options.background ?? null,
    });

    const name = options.name ?? "sequence-points";

    this.axis = createSegment2D({
      name: `${name}:axis`,
      start: [
        this.currentCenterX - this.currentSpan / 2,
        0,
      ],
      end: [
        this.currentCenterX + this.currentSpan / 2,
        0,
      ],
      style: {
        color: this.style.axisColor,
        opacity: this.style.axisOpacity,
        width: this.style.axisWidth,
      },
    });

    this.limitMarker = this.finiteLimit
      ? createNumberLinePoint2D(
          {
            name: `${name}:limit-marker`,
            x: this.limit,
            fill: this.style.limitFill,
            outline: this.style.limitOutline,
            outlineWidth: this.style.limitOutlineWidth,
          },
        )
      : null;

    this.limitLabel = createTextLabel2D({
      name: `${name}:limit-label`,
      latex:
        options.limitLabelLatex ??
        defaultLimitLabelLatex(this.limit),
      position: [
        this.finiteLimit ? this.limit : this.currentCenterX,
        0,
      ],
      anchor: [0.5, 1],
      color: this.style.limitLabelColor,
      fontSizePx: this.style.limitLabelFontSizePx,
      fontWeight: 720,
      background: this.style.limitLabelBackground,
      border: this.style.limitLabelBorder,
      borderRadiusPx: 7,
      padding: "0.16rem 0.34rem",
    });

    this.formulaLabel = createTextLabel2D({
      name: `${name}:formula`,
      latex: options.formulaLatex,
      position: [this.currentCenterX, 0],
      anchor: [0.5, 0],
      color: this.style.formulaColor,
      fontSizePx: this.style.formulaFontSizePx,
      fontWeight: 720,
      background: this.style.formulaBackground,
      border: this.style.formulaBorder,
      borderRadiusPx: 8,
      padding: "0.22rem 0.46rem",
    });

    this.currentIndexLabel =
      this.showCurrentIndexLabel
        ? createTextLabel2D({
            name: `${name}:current-index-label`,
            latex: String.raw`n=\cdots`,
            position: [this.currentCenterX, 0],
            anchor: [0, 0],
            color: this.style.currentIndexColor,
            fontSizePx: this.style.currentIndexFontSizePx,
            fontWeight: 690,
            background: this.style.currentIndexBackground,
            border: this.style.currentIndexBorder,
            borderRadiusPx: 7,
            padding: "0.16rem 0.34rem",
          })
        : null;

    this.rankLabel =
      this.showRankLabel
        ? createTextLabel2D({
            name: `${name}:rank-label`,
            latex: String.raw`${this.rankSymbolLatex}=?`,
            position: [this.currentCenterX, 0],
            anchor: [0, 0],
            color: this.style.rankNeutralColor,
            fontSizePx: this.style.rankFontSizePx,
            fontWeight: 690,
            background: this.style.rankBackground,
            border: this.style.rankBorder,
            borderRadiusPx: 7,
            padding: "0.16rem 0.34rem",
          })
        : null;

    if (this.finiteLimit) {
      this.epsilonLabel = createTextLabel2D({
        name: `${name}:epsilon-label`,
        latex: String.raw`\varepsilon=${formatNumber(this.currentEpsilon)}`,
        position: [this.currentCenterX, 0],
        anchor: [1, 0],
        color: this.style.epsilonColor,
        fontSizePx: this.style.epsilonFontSizePx,
        fontWeight: 690,
        background: this.style.epsilonBackground,
        border: this.style.epsilonBorder,
        borderRadiusPx: 7,
        padding: "0.16rem 0.34rem",
      });

      this.leftParenthesis = createTextLabel2D({
        name: `${name}:epsilon-left-parenthesis`,
        text: "(",
        position: [this.limit - this.currentEpsilon, 0],
        anchor: [0.5, 0.5],
        color: this.style.intervalColor,
        fontSizePx: this.style.intervalParenthesisFontSizePx,
        fontWeight: 500,
        background: "transparent",
        padding: "0",
      });

      this.rightParenthesis = createTextLabel2D({
        name: `${name}:epsilon-right-parenthesis`,
        text: ")",
        position: [this.limit + this.currentEpsilon, 0],
        anchor: [0.5, 0.5],
        color: this.style.intervalColor,
        fontSizePx: this.style.intervalParenthesisFontSizePx,
        fontWeight: 500,
        background: "transparent",
        padding: "0",
      });

      this.leftEndpointLabel = createTextLabel2D({
        name: `${name}:epsilon-left-endpoint`,
        text: formatNumber(this.limit - this.currentEpsilon),
        position: [this.limit - this.currentEpsilon, 0],
        anchor: [0.5, 0],
        color: this.style.intervalEndpointColor,
        fontSizePx: this.style.intervalEndpointFontSizePx,
        fontWeight: 600,
        background: "rgba(18, 17, 24, 0.66)",
        borderRadiusPx: 5,
        padding: "0.08rem 0.22rem",
      });

      this.rightEndpointLabel = createTextLabel2D({
        name: `${name}:epsilon-right-endpoint`,
        text: formatNumber(this.limit + this.currentEpsilon),
        position: [this.limit + this.currentEpsilon, 0],
        anchor: [0.5, 0],
        color: this.style.intervalEndpointColor,
        fontSizePx: this.style.intervalEndpointFontSizePx,
        fontWeight: 600,
        background: "rgba(18, 17, 24, 0.66)",
        borderRadiusPx: 5,
        padding: "0.08rem 0.22rem",
      });
    } else {
      this.epsilonLabel = null;
      this.leftParenthesis = null;
      this.rightParenthesis = null;
      this.leftEndpointLabel = null;
      this.rightEndpointLabel = null;
    }

    this.scene.add(
      this.axis,
      ...(this.limitMarker ? [this.limitMarker] : []),
      ...(this.leftParenthesis ? [this.leftParenthesis] : []),
      ...(this.rightParenthesis ? [this.rightParenthesis] : []),
      ...(this.leftEndpointLabel ? [this.leftEndpointLabel] : []),
      ...(this.rightEndpointLabel ? [this.rightEndpointLabel] : []),
      this.limitLabel,
      this.formulaLabel,
      ...(this.epsilonLabel ? [this.epsilonLabel] : []),
      ...(this.currentIndexLabel ? [this.currentIndexLabel] : []),
      ...(this.rankLabel ? [this.rankLabel] : []),
    );

    this.rebuildTicks();
    this.currentBatchEntries = this.addBatch(this.initialTerms);
    this.layoutScreenSpaceElements();

    this.resizeObserver = new ResizeObserver(() => {
      this.layoutScreenSpaceElements();
    });

    this.resizeObserver.observe(this.canvas);

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      this.finishCurrentBatchImmediately(false);
      this.initialStarted = true;
      this.stoppedBySafetyGuard = true;
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      this.initialStarted = true;
      this.startCurrentBatch();
      return;
    }

    this.visibilityObserver = new IntersectionObserver(
      (entries) => {
        if (this.initialStarted) return;

        const entry = entries.find(
          (candidate) => candidate.target === this.canvas,
        );

        if (
          entry?.isIntersecting &&
          entry.intersectionRatio + EPSILON >= this.startVisibilityRatio
        ) {
          this.initialStarted = true;
          this.visibilityObserver?.disconnect();
          this.visibilityObserver = null;
          this.startCurrentBatch();
        }
      },
      {
        threshold: [0, this.startVisibilityRatio, 1],
      },
    );

    this.visibilityObserver.observe(this.canvas);
  }

  getCurrentEpsilon(): number | null {
    return this.finiteLimit ? this.currentEpsilon : null;
  }

  getNextSequenceIndex(): number {
    return this.nextSequenceIndex;
  }

  getAutomaticTransitionCount(): number {
    return this.automaticTransitions;
  }

  getDisplayedTermCount(): number {
    return this.displayedTermCount;
  }

  /**
   * Sampling stride used by the current recursive depth.
   *
   * 1 means every candidate index is evaluated, 2 means every second index,
   * 4 every fourth index, etc.
   */
  getCurrentTermStride(): number {
    return this.termStrideForTransition(
      this.automaticTransitions,
    );
  }

  isStoppedBySafetyGuard(): boolean {
    return this.stoppedBySafetyGuard;
  }

  restart(): void {
    void this.resetToInitialState();
  }

  destroy(): void {
    this.visibilityObserver?.disconnect();
    this.visibilityObserver = null;
    this.resizeObserver.disconnect();
    this.stopAnimation?.();
    this.stopAnimation = null;
    this.scene.destroy();
  }

  private startCurrentBatch(): void {
    if (this.batchAnimating || this.transitioning) return;

    if (this.currentBatchEntries.length === 0) {
      this.finishBatch();
      return;
    }

    this.batchAnimating = true;
    this.elapsedCurrentAnimation = 0;
    this.stopAnimation?.();

    this.stopAnimation = this.scene.onFrame(({ deltaTime }) => {
      this.elapsedCurrentAnimation += deltaTime;
      let allComplete = true;

      for (
        let index = 0;
        index < this.currentBatchEntries.length;
        index += 1
      ) {
        const entry = this.currentBatchEntries[index];

        const startTime =
          this.initialDelaySeconds +
          index * this.termIntervalSeconds;

        const rawProgress =
          (this.elapsedCurrentAnimation - startTime) /
          this.popDurationSeconds;

        if (rawProgress < 0) {
          allComplete = false;
          continue;
        }

        if (!entry.announced) {
          entry.announced = true;
          this.announceAnimatedTerm(entry.term);
        }

        const progress = clamp01(rawProgress);
        entry.scale = Math.max(0, easeOutBack(progress));
        entry.marker.show();
        this.applyTermMarkerScale(entry);

        if (progress < 1) {
          allComplete = false;
        } else {
          entry.scale = 1;
          this.applyTermMarkerScale(entry);
        }
      }

      if (allComplete) {
        this.finishBatch();
      }
    });
  }

  private finishCurrentBatchImmediately(
    continueAutomatically = true,
  ): void {
    for (const entry of this.currentBatchEntries) {
      if (!entry.announced) {
        entry.announced = true;
        this.announceAnimatedTerm(entry.term);
      }

      entry.scale = 1;
      entry.marker.show();
      this.applyTermMarkerScale(entry);
    }

    this.finishBatch(continueAutomatically);
  }

  private finishBatch(
    continueAutomatically = true,
  ): void {
    this.stopAnimation?.();
    this.stopAnimation = null;
    this.batchAnimating = false;
    this.currentBatchEntries = [];

    if (
      continueAutomatically &&
      !this.stoppedBySafetyGuard
    ) {
      void this.scheduleAutomaticAdvance();
    }
  }

  private async scheduleAutomaticAdvance(): Promise<void> {
    if (this.transitioning || this.stoppedBySafetyGuard) return;

    this.transitioning = true;
    await this.wait(this.roundHoldSeconds);

    if (
      this.automaticTransitions >= this.maxAutomaticTransitions ||
      this.nextSequenceIndex > this.maximumSequenceIndex
    ) {
      this.stoppedBySafetyGuard = true;
      this.transitioning = false;
      return;
    }

    if (this.finiteLimit) {
      await this.advanceFiniteNeighborhood();
    } else {
      await this.advanceDivergentWindow();
    }
  }

  private async advanceFiniteNeighborhood(): Promise<void> {
    const previousEpsilon = this.currentEpsilon;
    const nextEpsilon = this.computeNextEpsilon();

    if (nextEpsilon === null) {
      this.stoppedBySafetyGuard = true;
      this.transitioning = false;
      return;
    }

    this.currentEpsilon = nextEpsilon;
    this.automaticTransitions += 1;
    this.resetRankLabel();
    this.updateNeighborhoodLabels();
    this.showNeighborhoodLabels();

    await this.wait(this.neighborhoodHoldSeconds);

    this.clearTicks();

    /*
     * Deliberately DO NOT zoom to the new epsilon interval itself.
     *
     * We only move far enough that the previous neighborhood endpoints have
     * just passed outside the viewport. Thus the new interval remains visible
     * together with most of the region between the old and new intervals and
     * whatever old sequence points still occupy that region.
     */
    const targetSpan =
      2 * previousEpsilon * this.zoomPastPreviousIntervalFraction;

    await this.animateViewTo(
      this.limit,
      targetSpan,
      this.cameraDurationSeconds,
    );

    /*
     * Keep visible old points in the annular region between neighborhoods.
     * Points outside the new camera view are disposed, as are any old points
     * exactly at L (or otherwise inside the new neighborhood). The latter is
     * important for eventually-constant sequences: memory still stays bounded.
     */
    this.pruneFiniteOldMarkers();
    this.rebuildTicks();
    this.layoutScreenSpaceElements();

    await this.wait(this.postCameraPauseSeconds);

    const nextBatch = this.collectNextFiniteVisibleBatch();
    this.currentBatchEntries = this.addBatch(nextBatch);
    this.layoutScreenSpaceElements();

    this.transitioning = false;
    this.startCurrentBatch();
  }

  private async advanceDivergentWindow(): Promise<void> {
    const nextBatch = this.collectNextDivergentBatch();

    if (nextBatch.length === 0) {
      this.stoppedBySafetyGuard = true;
      this.transitioning = false;
      return;
    }

    const bounds = this.currentHorizontalBounds();
    const gap = this.currentSpan * this.divergentPanGapFraction;
    const finiteValues = nextBatch
      .map(({ value }) => value)
      .filter(Number.isFinite);

    if (finiteValues.length === 0) {
      this.stoppedBySafetyGuard = true;
      this.transitioning = false;
      return;
    }

    let targetCenterX: number;

    const firstForward = nextBatch[0].value;

    if (this.divergenceDirection > 0) {
      const minimumLeft = bounds.right + gap;
      const contentLeft = firstForward - this.currentSpan * 0.10;
      const targetLeft = Math.max(minimumLeft, contentLeft);
      targetCenterX = targetLeft + this.currentSpan / 2;
    } else {
      const maximumRight = bounds.left - gap;
      const contentRight = firstForward + this.currentSpan * 0.10;
      const targetRight = Math.min(maximumRight, contentRight);
      targetCenterX = targetRight - this.currentSpan / 2;
    }

    this.automaticTransitions += 1;
    this.clearTicks();

    /* Same zoom level: divergence is shown as translation along the line. */
    await this.animateViewTo(
      targetCenterX,
      this.currentSpan,
      this.cameraDurationSeconds,
    );

    this.pruneMarkersOutsideCurrentView();
    this.rebuildTicks();
    this.layoutScreenSpaceElements();

    await this.wait(this.postCameraPauseSeconds);

    this.currentBatchEntries = this.addBatch(nextBatch);
    this.layoutScreenSpaceElements();

    this.transitioning = false;
    this.startCurrentBatch();
  }

  private addBatch(
    terms: readonly SequenceTerm2D[],
  ): TermMarkerEntry[] {
    const added: TermMarkerEntry[] = [];
    const bounds = this.currentHorizontalBounds();
    const inset = this.currentSpan * 0.006;
    const name = this.options.name ?? "sequence-points";

    for (const term of terms) {
      if (!Number.isFinite(term.value)) continue;

      if (
        term.value < bounds.left + inset ||
        term.value > bounds.right - inset
      ) {
        continue;
      }

      const marker = createNumberLinePoint2D({
        name: `${name}:term-${term.index}`,
        x: term.value,
        fill: this.style.termFill,
        outline: this.style.termOutline,
        outlineWidth: this.style.termOutlineWidth,
      });

      marker.hide().resizeTo(0);
      this.scene.add(marker);

      const entry: TermMarkerEntry = {
        term,
        marker,
        scale: 0,
        announced: false,
      };

      this.termEntries.push(entry);
      added.push(entry);
      this.displayedTermCount += 1;

      if (this.finiteLimit) {
        const distance = Math.abs(term.value - this.limit);

        /*
         * Terms exactly equal to L are intentionally ignored here. Every
         * epsilon-neighborhood necessarily contains L itself, so such terms
         * must not block the construction of a smaller neighborhood.
         */
        if (distance > 0 && Number.isFinite(distance)) {
          this.smallestPositiveDisplayedDistance = Math.min(
            this.smallestPositiveDisplayedDistance,
            distance,
          );
        }
      }
    }

    return added;
  }

  private announceAnimatedTerm(
    term: SequenceTerm2D,
  ): void {
    this.currentAnimatedIndex =
      term.index;

    this.currentIndexLabel?.setLatex(
      String.raw`n=${term.index}`,
    );

    if (
      !this.showRankLabel ||
      this.rankFoundInCurrentNeighborhood ||
      !this.finiteLimit
    ) {
      return;
    }

    /*
     * Open epsilon-neighborhood: boundary equality does not count.
     *
     * We deliberately trigger mu from a NEWLY ANIMATED term. Old dots that
     * happen to survive inside a smaller recursive neighborhood do not
     * instantly satisfy the next visual rank.
     */
    if (
      Math.abs(
        term.value -
        this.limit,
      ) <
      this.currentEpsilon
    ) {
      this.rankFoundInCurrentNeighborhood =
        true;

      this.rankLabel
        ?.setLatex(
          String.raw`${this.rankSymbolLatex}=${term.index}`,
        )
        .setColor(
          this.style.rankActiveColor,
        );
    }
  }

  private resetRankLabel(): void {
    if (!this.rankLabel) {
      return;
    }

    this.rankFoundInCurrentNeighborhood =
      false;

    this.rankLabel
      .setLatex(
        String.raw`${this.rankSymbolLatex}=?`,
      )
      .setColor(
        this.style.rankNeutralColor,
      );
  }

  private resetIndexLabel(): void {
    this.currentAnimatedIndex =
      null;

    this.currentIndexLabel?.setLatex(
      String.raw`n=\cdots`,
    );
  }

  private termStrideForTransition(
    transitionNumber: number,
  ): number {
    if (transitionNumber <= 0) {
      return 1;
    }

    /*
     * ceil() means the very first recursive round already advances to the
     * first coarser sampling level.
     *
     * With the defaults (factor 2, every 2 transitions):
     *
     *   transition 0 -> 1
     *   transition 1 -> 2
     *   transition 2 -> 2
     *   transition 3 -> 4
     *   transition 4 -> 4
     *   ...
     */
    const growthStage = Math.ceil(
      transitionNumber /
      this.termStrideGrowthEveryTransitions,
    );

    /*
     * Avoid computing a huge exponential after the configured cap has already
     * become inevitable.
     */
    const maximumGrowthStage = Math.ceil(
      Math.log(this.maximumTermStride) /
      Math.log(this.termStrideGrowthFactor),
    );

    if (growthStage >= maximumGrowthStage) {
      return this.maximumTermStride;
    }

    return Math.min(
      this.maximumTermStride,
      Math.max(
        1,
        Math.round(
          this.termStrideGrowthFactor ** growthStage,
        ),
      ),
    );
  }

  private advanceSequenceIndex(
    stride: number,
  ): void {
    /*
     * maximumSequenceIndex is itself kept below MAX_SAFE_INTEGER. Saturating
     * here prevents a large stride from creating an imprecise integer before
     * the normal safety guard gets a chance to stop the animation.
     */
    if (
      this.nextSequenceIndex >
      this.maximumSequenceIndex - stride
    ) {
      this.nextSequenceIndex =
        this.maximumSequenceIndex + 1;
      return;
    }

    this.nextSequenceIndex += stride;
  }

  private collectNextFiniteVisibleBatch(): SequenceTerm2D[] {
    const result: SequenceTerm2D[] = [];
    const bounds = this.currentHorizontalBounds();
    const inset = this.currentSpan * 0.012;
    const stride = this.termStrideForTransition(
      this.automaticTransitions,
    );
    let scanned = 0;

    while (
      result.length < this.batchSize &&
      scanned < this.maximumScanTermsPerBatch &&
      this.nextSequenceIndex <= this.maximumSequenceIndex
    ) {
      const index = this.nextSequenceIndex;
      this.advanceSequenceIndex(stride);
      scanned += 1;

      const term = evaluateSequenceTerm(this.sequence, index);

      if (
        Number.isFinite(term.value) &&
        term.value > bounds.left + inset &&
        term.value < bounds.right - inset
      ) {
        result.push(term);
      }
    }

    if (result.length === 0 && scanned >= this.maximumScanTermsPerBatch) {
      this.stoppedBySafetyGuard = true;
    }

    return result;
  }

  private collectNextDivergentBatch(): SequenceTerm2D[] {
    const result: SequenceTerm2D[] = [];
    const bounds = this.currentHorizontalBounds();

    /*
     * Divergent batches are collected before automaticTransitions is
     * incremented, so use the sampling stride of the upcoming round.
     */
    const stride = this.termStrideForTransition(
      this.automaticTransitions + 1,
    );

    let scanned = 0;
    let foundForwardTerm = false;

    while (
      result.length < this.batchSize &&
      scanned < this.maximumScanTermsPerBatch &&
      this.nextSequenceIndex <= this.maximumSequenceIndex
    ) {
      const index = this.nextSequenceIndex;
      this.advanceSequenceIndex(stride);
      scanned += 1;

      const term = evaluateSequenceTerm(this.sequence, index);

      if (!Number.isFinite(term.value)) continue;

      if (!foundForwardTerm) {
        const escaped = this.divergenceDirection > 0
          ? term.value > bounds.right
          : term.value < bounds.left;

        if (!escaped) continue;
        foundForwardTerm = true;
      }

      result.push(term);
    }

    return result;
  }

  private computeNextEpsilon(): number | null {
    const distanceBound = Number.isFinite(
      this.smallestPositiveDisplayedDistance,
    )
      ? this.smallestPositiveDisplayedDistance * this.epsilonShrinkFactor
      : Number.POSITIVE_INFINITY;

    const candidate = Math.min(
      this.currentEpsilon * this.epsilonShrinkFactor,
      distanceBound,
    );

    if (!(candidate > 0) || !Number.isFinite(candidate)) {
      return null;
    }

    if (
      this.limit - candidate === this.limit ||
      this.limit + candidate === this.limit
    ) {
      return null;
    }

    return candidate;
  }

  private pruneFiniteOldMarkers(): void {
    const bounds = this.currentHorizontalBounds();
    const intervalTolerance = this.currentEpsilon * 1e-10;

    this.pruneTermMarkers((entry) => {
      const value = entry.term.value;
      const inView = value >= bounds.left && value <= bounds.right;
      const outsideNewNeighborhood =
        Math.abs(value - this.limit) >=
        this.currentEpsilon - intervalTolerance;

      return inView && outsideNewNeighborhood;
    });
  }

  private pruneMarkersOutsideCurrentView(): void {
    const bounds = this.currentHorizontalBounds();

    this.pruneTermMarkers((entry) =>
      entry.term.value >= bounds.left &&
      entry.term.value <= bounds.right,
    );
  }

  private pruneTermMarkers(
    keep: (entry: TermMarkerEntry) => boolean,
  ): void {
    const retained: TermMarkerEntry[] = [];

    for (const entry of this.termEntries) {
      if (keep(entry)) {
        retained.push(entry);
      } else {
        this.scene.remove(entry.marker);
        entry.marker.dispose();
      }
    }

    this.termEntries = retained;
  }

  private disposeAllTermMarkers(): void {
    for (const entry of this.termEntries) {
      this.scene.remove(entry.marker);
      entry.marker.dispose();
    }

    this.termEntries = [];
    this.currentBatchEntries = [];
  }

  private async resetToInitialState(): Promise<void> {
    if (this.transitioning) return;

    this.transitioning = true;
    this.batchAnimating = false;
    this.stopAnimation?.();
    this.stopAnimation = null;
    this.stoppedBySafetyGuard = false;

    this.clearTicks();

    await this.animateViewTo(
      this.initialViewport.centerX,
      this.initialViewport.span,
      this.cameraDurationSeconds,
    );

    this.disposeAllTermMarkers();
    this.currentEpsilon = this.initialEpsilon;
    this.smallestPositiveDisplayedDistance = Number.POSITIVE_INFINITY;
    this.automaticTransitions = 0;
    this.displayedTermCount = 0;
    this.nextSequenceIndex = this.startIndex + this.batchSize;
    this.resetIndexLabel();
    this.resetRankLabel();

    if (this.finiteLimit) {
      this.updateNeighborhoodLabels();
      this.showNeighborhoodLabels();
    }

    this.rebuildTicks();
    this.currentBatchEntries = this.addBatch(this.initialTerms);
    this.layoutScreenSpaceElements();

    this.transitioning = false;
    this.startCurrentBatch();
  }

  private animateViewTo(
    targetCenterX: number,
    targetSpan: number,
    durationSeconds: number,
  ): Promise<void> {
    const startCenterX = this.currentCenterX;
    const startSpan = this.currentSpan;

    return new Promise((resolve) => {
      let elapsed = 0;
      let stop = (): void => {};

      stop = this.scene.onFrame(({ deltaTime }) => {
        elapsed += deltaTime;
        const progress = clamp01(elapsed / durationSeconds);
        const eased = easeInOutCubic(progress);

        this.setView(
          lerp(startCenterX, targetCenterX, eased),
          Math.exp(
            lerp(
              Math.log(startSpan),
              Math.log(targetSpan),
              eased,
            ),
          ),
        );

        if (progress >= 1) {
          stop();
          resolve();
        }
      });
    });
  }

  private wait(seconds: number): Promise<void> {
    if (!(seconds > 0)) return Promise.resolve();

    return new Promise((resolve) => {
      let elapsed = 0;
      let stop = (): void => {};

      stop = this.scene.onFrame(({ deltaTime }) => {
        elapsed += deltaTime;

        if (elapsed >= seconds) {
          stop();
          resolve();
        }
      });
    });
  }

  private setView(centerX: number, span: number): void {
    this.currentCenterX = centerX;
    this.currentSpan = Math.max(Number.MIN_VALUE, span);
    this.layoutScreenSpaceElements();
  }

  private currentHorizontalBounds(): { left: number; right: number } {
    return {
      left: this.currentCenterX - this.currentSpan / 2,
      right: this.currentCenterX + this.currentSpan / 2,
    };
  }

  private updateNeighborhoodLabels(): void {
    if (!this.finiteLimit) return;

    const left = this.limit - this.currentEpsilon;
    const right = this.limit + this.currentEpsilon;

    this.leftParenthesis?.moveTo(left, 0);
    this.rightParenthesis?.moveTo(right, 0);

    this.leftEndpointLabel
      ?.setText(formatNumber(left))
      .moveTo(left, 0);

    this.rightEndpointLabel
      ?.setText(formatNumber(right))
      .moveTo(right, 0);

    this.epsilonLabel?.setLatex(
      String.raw`\varepsilon=${formatNumber(this.currentEpsilon)}`,
    );

    this.layoutScreenSpaceElements();
  }

  private showNeighborhoodLabels(): void {
    this.leftParenthesis?.show();
    this.rightParenthesis?.show();
    this.leftEndpointLabel?.show();
    this.rightEndpointLabel?.show();
  }

  private clearTicks(): void {
    for (const { segment, label } of this.tickEntries) {
      this.scene.remove(segment, label);
      segment.dispose();
      label.dispose();
    }

    this.tickEntries = [];
  }

  private rebuildTicks(): void {
    this.clearTicks();

    const step = niceNumberLineTickStep2D(this.currentSpan, this.targetTickCount);
    const bounds = this.currentHorizontalBounds();
    const first = Math.ceil(bounds.left / step - 1e-10) * step;
    const name = this.options.name ?? "sequence-points";

    for (let index = 0; index < 40; index += 1) {
      const x = first + index * step;
      if (x > bounds.right + step * 1e-8) break;

      const segment = createSegment2D({
        name: `${name}:tick-${this.automaticTransitions}-${index}`,
        start: [x, 0],
        end: [x, 0],
        style: {
          color: this.style.tickColor,
          opacity: this.style.tickOpacity,
          width: this.style.tickWidth,
        },
      });

      const label = createTextLabel2D({
        name: `${name}:tick-label-${this.automaticTransitions}-${index}`,
        text: formatNumberLineTick2D(x, step),
        position: [x, 0],
        anchor: [0.5, 0],
        color: this.style.tickLabelColor,
        fontSizePx: this.style.tickLabelFontSizePx,
        fontWeight: 560,
        background: "transparent",
        padding: "0",
      });

      this.tickEntries.push({ x, segment, label });
      this.scene.add(segment, label);
    }
  }

  private layoutScreenSpaceElements(): void {
    const rectangle = this.canvas.getBoundingClientRect();
    const width = rectangle.width || this.canvas.clientWidth || 800;
    const height = rectangle.height || this.canvas.clientHeight || 450;

    if (width <= 0 || height <= 0) return;

    this.unitSizePixels = width / this.currentSpan;
    const worldPerPixel = 1 / this.unitSizePixels;
    const bounds = this.currentHorizontalBounds();

    this.scene.setView({
      unitSizePixels: this.unitSizePixels,
      center: [this.currentCenterX, 0],
    });

    const edgeInset = 7 * worldPerPixel;

    this.axis.setEndpoints(
      [bounds.left + edgeInset, 0],
      [bounds.right - edgeInset, 0],
    );

    const tickHalfHeight = 5 * worldPerPixel;
    const tickLabelY = -17 * worldPerPixel;

    for (const { x, segment, label } of this.tickEntries) {
      segment.setEndpoints(
        [x, -tickHalfHeight],
        [x, tickHalfHeight],
      );
      label.moveTo(x, tickLabelY);
    }

    if (this.limitMarker) {
      this.limitMarker
        .moveTo(this.limit, 0)
        .resizeTo(this.style.limitRadiusPixels * worldPerPixel);

      this.limitLabel
        .setAnchor([0.5, 1])
        .moveTo(this.limit, 25 * worldPerPixel);
    } else {
      const positive = this.divergenceDirection > 0;

      this.limitLabel
        .setAnchor([positive ? 1 : 0, 1])
        .moveTo(
          positive
            ? bounds.right - 18 * worldPerPixel
            : bounds.left + 18 * worldPerPixel,
          27 * worldPerPixel,
        );
    }

    const formulaY =
      (height / 2 - 28) * worldPerPixel;

    this.formulaLabel.moveTo(
      this.currentCenterX,
      formulaY,
    );

    const leftHudX =
      bounds.left +
      18 * worldPerPixel;

    this.currentIndexLabel?.moveTo(
      leftHudX,
      formulaY,
    );

    this.rankLabel?.moveTo(
      leftHudX,
      formulaY -
        34 * worldPerPixel,
    );

    if (this.finiteLimit) {
      this.epsilonLabel?.moveTo(
        bounds.right - 18 * worldPerPixel,
        formulaY,
      );

      const endpointLabelY = -24 * worldPerPixel;

      this.leftEndpointLabel?.moveTo(
        this.limit - this.currentEpsilon,
        endpointLabelY,
      );

      this.rightEndpointLabel?.moveTo(
        this.limit + this.currentEpsilon,
        endpointLabelY,
      );
    }

    for (const entry of this.termEntries) {
      this.applyTermMarkerScale(entry);
    }
  }

  private applyTermMarkerScale(entry: TermMarkerEntry): void {
    const radius = this.style.termRadiusPixels / this.unitSizePixels;
    entry.marker.resizeTo(radius * entry.scale);
  }
}

export function createSequencePointsPlayer2D(
  canvas: HTMLCanvasElement,
  options: SequencePointsPlayer2DOptions,
): SequencePointsPlayer2D {
  return new SequencePointsPlayer2D(canvas, options);
}
