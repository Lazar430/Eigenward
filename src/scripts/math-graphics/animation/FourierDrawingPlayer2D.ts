import { smoothstep } from "./easing";
import { MathScene2D } from "../core/MathScene2D";
import {
  calculatePolylineLength2D,
  type FourierDrawing2DAsset,
  type FourierStroke2DAsset,
} from "../geometry/fourierSeries2D";
import {
  FourierEpicycles2D,
  createFourierEpicycles2D,
  type FourierEpicycles2DStyle,
} from "../primitives/FourierEpicycles2D";

const EPSILON = 1e-9;

export type FourierDrawingPlaybackState2D =
  | "idle"
  | "drawing"
  | "fading"
  | "paused"
  | "complete"
  | "destroyed";

export type FourierDrawingReducedMotionMode2D = "complete" | "ignore";

export interface FourierDrawingPlayer2DOptions {
  scene: MathScene2D;
  asset: FourierDrawing2DAsset;
  style?:
    | FourierEpicycles2DStyle
    | ((stroke: FourierStroke2DAsset, index: number) => FourierEpicycles2DStyle);
  /** Total time spent actually drawing all strokes. */
  totalDrawSeconds?: number;
  /** Final fade duration for the last visible epicycle chain. */
  fadeSeconds?: number;
  /** Prevent tiny detail strokes from flashing by too quickly. */
  minimumStrokeSeconds?: number;
  /** Fraction of the canvas that must be visible before playback begins/resumes. */
  visibilityThreshold?: number;
  autoplay?: boolean;
  pauseWhenBelowThreshold?: boolean;
  reducedMotion?: FourierDrawingReducedMotionMode2D;
  name?: string;
  onComplete?: () => void;
}

interface ResolvedOptions2D {
  totalDrawSeconds: number;
  fadeSeconds: number;
  minimumStrokeSeconds: number;
  visibilityThreshold: number;
  autoplay: boolean;
  pauseWhenBelowThreshold: boolean;
  reducedMotion: FourierDrawingReducedMotionMode2D;
  name: string;
  onComplete?: () => void;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function visibleCanvasFraction(canvas: HTMLCanvasElement): number {
  const rectangle = canvas.getBoundingClientRect();
  if (rectangle.width <= 0 || rectangle.height <= 0) return 0;

  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const visibleWidth = Math.max(
    0,
    Math.min(rectangle.right, viewportWidth) - Math.max(rectangle.left, 0),
  );
  const visibleHeight = Math.max(
    0,
    Math.min(rectangle.bottom, viewportHeight) - Math.max(rectangle.top, 0),
  );

  return (visibleWidth * visibleHeight) / (rectangle.width * rectangle.height);
}

function assertPositiveFinite(value: number, label: string): void {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new RangeError(`${label} must be positive and finite.`);
  }
}

function assertNonnegativeFinite(value: number, label: string): void {
  if (!(value >= 0) || !Number.isFinite(value)) {
    throw new RangeError(`${label} must be nonnegative and finite.`);
  }
}

function validateAsset(asset: FourierDrawing2DAsset): void {
  if (asset.strokes.length === 0) {
    throw new RangeError("A Fourier drawing player requires at least one stroke.");
  }
}

function resolveOptions(
  options: FourierDrawingPlayer2DOptions,
): ResolvedOptions2D {
  const resolved: ResolvedOptions2D = {
    totalDrawSeconds: options.totalDrawSeconds ?? 4.2,
    fadeSeconds: options.fadeSeconds ?? 0.32,
    minimumStrokeSeconds: options.minimumStrokeSeconds ?? 0.16,
    visibilityThreshold: options.visibilityThreshold ?? 0.2,
    autoplay: options.autoplay ?? true,
    pauseWhenBelowThreshold: options.pauseWhenBelowThreshold ?? true,
    reducedMotion: options.reducedMotion ?? "complete",
    name: options.name ?? "fourier-drawing-player-2d",
    onComplete: options.onComplete,
  };

  assertPositiveFinite(resolved.totalDrawSeconds, "totalDrawSeconds");
  assertNonnegativeFinite(resolved.fadeSeconds, "fadeSeconds");
  assertNonnegativeFinite(resolved.minimumStrokeSeconds, "minimumStrokeSeconds");

  if (
    !(resolved.visibilityThreshold >= 0 && resolved.visibilityThreshold <= 1) ||
      !Number.isFinite(resolved.visibilityThreshold)
  ) {
    throw new RangeError("visibilityThreshold must lie in [0, 1].");
  }

  return resolved;
}

function strokeWeight(stroke: FourierStroke2DAsset): number {
  if (
    stroke.durationWeight !== undefined &&
      stroke.durationWeight > 0 &&
      Number.isFinite(stroke.durationWeight)
  ) {
    return stroke.durationWeight;
  }

  const length = calculatePolylineLength2D(stroke.trace, stroke.closed);
  return length > EPSILON && Number.isFinite(length) ? length : 1;
}

/**
 * Give every stroke a small guaranteed time slice, then distribute the rest by
 * authoring-time durationWeight (normally source arc length).
 */
function distributeStrokeDurations(
  strokes: readonly FourierStroke2DAsset[],
  totalSeconds: number,
  requestedMinimumSeconds: number,
): number[] {
  const count = strokes.length;
  const minimumSeconds = Math.min(requestedMinimumSeconds, totalSeconds / count);
  const guaranteedSeconds = minimumSeconds * count;
  const flexibleSeconds = Math.max(0, totalSeconds - guaranteedSeconds);
  const weights = strokes.map(strokeWeight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  if (!(totalWeight > EPSILON)) {
    return Array.from({ length: count }, () => totalSeconds / count);
  }

  return weights.map(
    (weight) => minimumSeconds + flexibleSeconds * (weight / totalWeight),
  );
}

function styleForStroke(
  style: FourierDrawingPlayer2DOptions["style"],
  stroke: FourierStroke2DAsset,
  index: number,
): FourierEpicycles2DStyle {
  return typeof style === "function" ? style(stroke, index) : (style ?? {});
}

/**
 * Coordinates a complete multi-stroke Fourier drawing.
 *
 * The player owns timing and visibility policy; FourierEpicycles2D remains a
 * renderer with no clock of its own. Only the active stroke mutates each frame.
 * Completed strokes become static traces, and future strokes remain hidden.
 */
export class FourierDrawingPlayer2D {
  readonly strokes: readonly FourierEpicycles2D[];

  private readonly scene: MathScene2D;
  private readonly options: ResolvedOptions2D;
  private readonly strokeDurations: readonly number[];
  private readonly strokeStartTimes: readonly number[];
  private readonly visibilityObserver: IntersectionObserver | null;

  private stopFrame: (() => void) | null = null;
  private state: FourierDrawingPlaybackState2D = "idle";
  private pausedPhase: "drawing" | "fading" = "drawing";
  private pauseReason: "manual" | "visibility" | null = null;
  private drawElapsed = 0;
  private fadeElapsed = 0;
  private activeStrokeIndex = -1;
  private visibleEnough = false;
  private completionReported = false;

  constructor(options: FourierDrawingPlayer2DOptions) {
    validateAsset(options.asset);
    this.scene = options.scene;
    this.options = resolveOptions(options);
    this.strokeDurations = distributeStrokeDurations(
      options.asset.strokes,
      this.options.totalDrawSeconds,
      this.options.minimumStrokeSeconds,
    );

    let cumulative = 0;
    this.strokeStartTimes = this.strokeDurations.map((duration) => {
      const start = cumulative;
      cumulative += duration;
      return start;
    });

    this.strokes = options.asset.strokes.map((stroke, index) =>
      createFourierEpicycles2D({
        name: `${this.options.name}:stroke-${index}`,
        stroke,
        style: styleForStroke(options.style, stroke, index),
        progress: 0,
      }),
    );

    this.scene.add(...this.strokes);
    this.prepareIdleVisuals();
    this.visibleEnough =
      typeof window !== "undefined" &&
	visibleCanvasFraction(this.scene.canvas) + EPSILON >=
          this.options.visibilityThreshold;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
	window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion && this.options.reducedMotion === "complete") {
      this.visibilityObserver = null;
      this.complete();
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      this.visibilityObserver = null;
      this.visibleEnough = true;
      if (this.options.autoplay) this.play();
      return;
    }

    const threshold = this.options.visibilityThreshold;
    const thresholds = threshold === 0 ? [0] : [0, threshold];

    this.visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        const enough = Boolean(
          entry?.isIntersecting &&
            entry.intersectionRatio + EPSILON >= this.options.visibilityThreshold,
        );
        this.handleVisibilityChange(enough);
      },
      { threshold: thresholds },
    );
    this.visibilityObserver.observe(this.scene.canvas);
    if (this.options.autoplay && this.visibleEnough) this.play();
  }

  getState(): FourierDrawingPlaybackState2D {
    return this.state;
  }

  getDrawProgress(): number {
    return clamp01(this.drawElapsed / this.options.totalDrawSeconds);
  }

  getActiveStrokeIndex(): number {
    return this.activeStrokeIndex;
  }

  play(): this {
    this.assertUsable();

    if (this.state === "complete") return this;
    if (this.state === "drawing" || this.state === "fading") return this;

    if (this.options.pauseWhenBelowThreshold && !this.visibleEnough) {
      this.pausedPhase = this.drawElapsed >= this.options.totalDrawSeconds
        ? "fading"
        : "drawing";
      this.pauseReason = "visibility";
      this.state = "paused";
      return this;
    }

    const phase = this.state === "paused"
      ? this.pausedPhase
      : this.drawElapsed >= this.options.totalDrawSeconds
      ? "fading"
      : "drawing";

    this.pauseReason = null;
    this.state = phase;
    this.ensureActiveVisuals();
    this.startFrameLoop();
    return this;
  }

  pause(): this {
    this.assertUsable();
    if (this.state !== "drawing" && this.state !== "fading") return this;

    this.pausedPhase = this.state;
    this.pauseReason = "manual";
    this.state = "paused";
    this.stopFrameLoop();
    return this;
  }

  replay(): this {
    this.assertUsable();
    this.reset();
    return this.play();
  }

  reset(): this {
    this.assertUsable();
    this.stopFrameLoop();
    this.drawElapsed = 0;
    this.fadeElapsed = 0;
    this.activeStrokeIndex = -1;
    this.pauseReason = null;
    this.completionReported = false;
    this.state = "idle";
    this.prepareIdleVisuals();
    return this;
  }

  /** Immediately show the final drawing with no construction guides. */
  complete(): this {
    this.assertUsable();
    this.stopFrameLoop();

    for (const stroke of this.strokes) {
      stroke.showCompletedTrace();
      stroke.setTraceVisible(true);
      stroke.setConstructionOpacity(0);
      stroke.setEpicyclesVisible(false);
      stroke.setTipVisible(false);
    }

    this.drawElapsed = this.options.totalDrawSeconds;
    this.fadeElapsed = this.options.fadeSeconds;
    this.activeStrokeIndex = this.strokes.length - 1;
    this.pauseReason = null;
    this.state = "complete";
    this.reportCompletion();
    return this;
  }

  destroy(): void {
    if (this.state === "destroyed") return;

    this.stopFrameLoop();
    this.visibilityObserver?.disconnect();
    this.scene.remove(...this.strokes);
    for (const stroke of this.strokes) stroke.dispose();
    this.state = "destroyed";
  }

  private assertUsable(): void {
    if (this.state === "destroyed") {
      throw new Error("This FourierDrawingPlayer2D has been destroyed.");
    }
  }

  private prepareIdleVisuals(): void {
    for (const stroke of this.strokes) {
      stroke.reset();
      stroke.setProgress(0);
      stroke.setTraceVisible(false);
      stroke.setEpicyclesVisible(false);
      stroke.setTipVisible(false);
      stroke.setConstructionOpacity(1);
    }
  }

  private ensureActiveVisuals(): void {
    if (this.state === "drawing" && this.activeStrokeIndex < 0) {
      this.activateStroke(0, 0);
    }
  }

  private handleVisibilityChange(visibleEnough: boolean): void {
    this.visibleEnough = visibleEnough;

    if (visibleEnough) {
      if (this.state === "idle" && this.options.autoplay) {
        this.play();
      } else if (this.state === "paused" && this.pauseReason === "visibility") {
        this.play();
      }
      return;
    }

    if (
      this.options.pauseWhenBelowThreshold &&
	(this.state === "drawing" || this.state === "fading")
    ) {
      this.pausedPhase = this.state;
      this.pauseReason = "visibility";
      this.state = "paused";
      this.stopFrameLoop();
    }
  }

  private startFrameLoop(): void {
    if (this.stopFrame) return;

    this.stopFrame = this.scene.onFrame(({ deltaTime }) => {
      if (this.state === "drawing") {
        this.advanceDrawing(deltaTime);
      } else if (this.state === "fading") {
        this.advanceFade(deltaTime);
      }
    });
  }

  private stopFrameLoop(): void {
    this.stopFrame?.();
    this.stopFrame = null;
  }

  private advanceDrawing(deltaTime: number): void {
    this.drawElapsed = Math.min(
      this.options.totalDrawSeconds,
      this.drawElapsed + Math.max(0, deltaTime),
    );

    if (this.drawElapsed >= this.options.totalDrawSeconds - EPSILON) {
      this.finishAllStrokeTraces();

      if (this.options.fadeSeconds <= EPSILON) {
        this.complete();
        return;
      }

      this.state = "fading";
      this.fadeElapsed = 0;
      return;
    }

    const index = this.strokeIndexForTime(this.drawElapsed);
    const start = this.strokeStartTimes[index];
    const duration = this.strokeDurations[index];
    const localProgress = clamp01((this.drawElapsed - start) / duration);
    this.activateStroke(index, localProgress);
  }

  private advanceFade(deltaTime: number): void {
    this.fadeElapsed = Math.min(
      this.options.fadeSeconds,
      this.fadeElapsed + Math.max(0, deltaTime),
    );

    const progress = this.options.fadeSeconds <= EPSILON
      ? 1
      : clamp01(this.fadeElapsed / this.options.fadeSeconds);
    const opacity = 1 - smoothstep(progress);

    const active = this.strokes[this.strokes.length - 1];
    active.setConstructionOpacity(opacity);

    if (progress >= 1 - EPSILON) this.complete();
  }

  private strokeIndexForTime(time: number): number {
    for (let index = this.strokeDurations.length - 1; index >= 0; index -= 1) {
      if (time + EPSILON >= this.strokeStartTimes[index]) return index;
    }
    return 0;
  }

  private activateStroke(index: number, progress: number): void {
    if (index !== this.activeStrokeIndex) {
      for (
        let completed = Math.max(0, this.activeStrokeIndex);
        completed < index;
        completed += 1
      ) {
        this.strokes[completed].showCompletedTrace();
        this.strokes[completed].setTraceVisible(true);
        this.strokes[completed].setConstructionOpacity(0);
      }

      const active = this.strokes[index];
      active.reset();
      active.setTraceVisible(true);
      active.setEpicyclesVisible(true);
      active.setTipVisible(true);
      active.setConstructionOpacity(1);
      this.activeStrokeIndex = index;
    }

    this.strokes[index].setProgress(progress);
  }

  private finishAllStrokeTraces(): void {
    for (let index = 0; index < this.strokes.length; index += 1) {
      const stroke = this.strokes[index];
      stroke.setProgress(1);
      stroke.setTraceVisible(true);

      if (index === this.strokes.length - 1) {
        stroke.setEpicyclesVisible(true);
        stroke.setTipVisible(true);
        stroke.setConstructionOpacity(1);
      } else {
        stroke.setConstructionOpacity(0);
        stroke.setEpicyclesVisible(false);
        stroke.setTipVisible(false);
      }
    }
    this.activeStrokeIndex = this.strokes.length - 1;
  }

  private reportCompletion(): void {
    if (this.completionReported) return;
    this.completionReported = true;
    this.options.onComplete?.();
  }
}

export function createFourierDrawingPlayer2D(
  options: FourierDrawingPlayer2DOptions,
): FourierDrawingPlayer2D {
  return new FourierDrawingPlayer2D(options);
}
