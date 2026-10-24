import {
  HUES,
  createDimensionBrace2D,
  createTextLabel2D,
  type MathScene2D,
  type Vec2Tuple,
} from "../math-graphics";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeInOutCubic(value: number): number {
  const t = clamp01(value);

  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(value: number): number {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, progress: number): number {
  return a + (b - a) * progress;
}

function lerpPoint(
  start: Vec2Tuple,
  end: Vec2Tuple,
  progress: number,
): Vec2Tuple {
  return [
    lerp(start[0], end[0], progress),
    lerp(start[1], end[1], progress),
  ];
}

function visibleIntersectionRatio(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return 0;
  }

  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth || 0;

  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight || 0;

  const left = Math.max(0, rect.left);
  const right = Math.min(viewportWidth, rect.right);
  const top = Math.max(0, rect.top);
  const bottom = Math.min(viewportHeight, rect.bottom);

  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);

  return (width * height) / (rect.width * rect.height);
}

export const ALGEBRA_STAGE_PAUSE_SECONDS = 1.8;
export const ALGEBRA_SHORT_STAGE_PAUSE_SECONDS =
  ALGEBRA_STAGE_PAUSE_SECONDS * 0.7;
export const ALGEBRA_FORMULA_STEP_HOLD_SECONDS =
  ALGEBRA_STAGE_PAUSE_SECONDS * 0.95;
export const ALGEBRA_FINAL_HOLD_SECONDS =
  ALGEBRA_STAGE_PAUSE_SECONDS * 1.7;

export const ALGEBRA_BRACE_STYLE = {
  color: HUES.mint.light,
  width: 3.8,
  opacity: 0.94,
  offset: 0.36,
  hookDepth: 0.28,
  cuspDepth: 0.18,
  samples: 96,
} as const;

export const ALGEBRA_BRACE_LABEL_STYLE = {
  color: "rgba(221, 255, 242, 0.98)",
  fontSizePx: 20,
  fontWeight: 760,
  background: "rgba(17, 46, 38, 0.80)",
  border: "1px solid rgba(136, 242, 206, 0.20)",
  borderRadiusPx: 7,
  padding: "0.10rem 0.32rem",
  offset: 0.50,
} as const;

export const ALGEBRA_AREA_LABEL_STYLE = {
  color: "rgba(248, 244, 255, 0.985)",
  fontSizePx: 22,
  fontWeight: 780,
  background: "rgba(28, 23, 37, 0.66)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadiusPx: 8,
  padding: "0.16rem 0.40rem",
} as const;

export const ALGEBRA_FORMULA_LABEL_STYLE = {
  color: "rgba(247, 243, 255, 0.985)",
  fontSizePx: 24,
  fontWeight: 780,
  background: "rgba(18, 16, 28, 0.74)",
  border: "1px solid rgba(183, 171, 255, 0.16)",
  borderRadiusPx: 9,
  padding: "0.16rem 0.45rem",
} as const;


export function polygonCentroid2D(
  vertices: readonly Vec2Tuple[],
): Vec2Tuple {
  if (vertices.length === 0) return [0, 0];

  if (vertices.length < 3) {
    const x =
      vertices.reduce((sum, point) => sum + point[0], 0) /
      vertices.length;
    const y =
      vertices.reduce((sum, point) => sum + point[1], 0) /
      vertices.length;
    return [x, y];
  }

  let twiceArea = 0;
  let centroidXTimesSixArea = 0;
  let centroidYTimesSixArea = 0;

  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    const cross =
      current[0] * next[1] -
      next[0] * current[1];

    twiceArea += cross;
    centroidXTimesSixArea +=
      (current[0] + next[0]) * cross;
    centroidYTimesSixArea +=
      (current[1] + next[1]) * cross;
  }

  if (Math.abs(twiceArea) < 1e-9) {
    const x =
      vertices.reduce((sum, point) => sum + point[0], 0) /
      vertices.length;
    const y =
      vertices.reduce((sum, point) => sum + point[1], 0) /
      vertices.length;
    return [x, y];
  }

  return [
    centroidXTimesSixArea / (3 * twiceArea),
    centroidYTimesSixArea / (3 * twiceArea),
  ];
}

export function createAreaLabel(
  name: string,
  latex: string,
  position: Vec2Tuple,
) {
  return createTextLabel2D({
    name,
    latex,
    position,
    anchor: [0.5, 0.5],
    ...ALGEBRA_AREA_LABEL_STYLE,
  });
}

export function createFormulaLabel(
  name: string,
  latex: string,
  position: Vec2Tuple,
) {
  return createTextLabel2D({
    name,
    latex,
    position,
    anchor: [0.5, 0.5],
    ...ALGEBRA_FORMULA_LABEL_STYLE,
  });
}

export type DimensionBraceLike = ReturnType<typeof createDimensionBrace2D>;
export type TextLabelLike = ReturnType<typeof createTextLabel2D>;

export interface TraceableSegment2D {
  show(): this;
  hide(): this;
  setEndpoints(start: Vec2Tuple, end: Vec2Tuple): this;
}

export interface FillShape2D {
  show(): this;
  hide(): this;
  setFillOpacity(opacity: number): this;
}

export interface ViewportTriggeredSequence2DOptions {
  scene: MathScene2D;
  reset: () => void;
  run: (sequence: ViewportTriggeredSequence2D) => Promise<void>;
  startVisibilityRatio?: number;
}

export class ViewportTriggeredSequence2D {
  readonly scene: MathScene2D;

  private readonly resetCallback: () => void;
  private readonly runCallback: (
    sequence: ViewportTriggeredSequence2D,
  ) => Promise<void>;
  private readonly startVisibilityRatio: number;

  private started = false;
  private destroyed = false;
  private readonly activeFrameStops = new Set<() => void>();
  private readonly visibilityObserver: IntersectionObserver | null;
  private readonly containingDetails: HTMLDetailsElement | null;

  constructor({
    scene,
    reset,
    run,
    startVisibilityRatio = 0.15,
  }: ViewportTriggeredSequence2DOptions) {
    this.scene = scene;
    this.resetCallback = reset;
    this.runCallback = run;
    this.startVisibilityRatio = clamp01(startVisibilityRatio);

    this.containingDetails = scene.canvas.closest("details");

    this.resetCallback();

    this.visibilityObserver =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              if (this.started || this.destroyed) return;

              const entry = entries.find(
                (candidate) => candidate.target === this.scene.canvas,
              );

              if (
                entry?.isIntersecting &&
                entry.intersectionRatio >= this.startVisibilityRatio
              ) {
                this.tryStart();
              }
            },
            {
              threshold: [0, this.startVisibilityRatio, 1],
            },
          );

    this.visibilityObserver?.observe(scene.canvas);

    this.containingDetails?.addEventListener(
      "toggle",
      this.handleDetailsToggle,
    );

    if (!this.visibilityObserver) {
      requestAnimationFrame(() => this.tryStart());
    }
  }

  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.visibilityObserver?.disconnect();
    this.containingDetails?.removeEventListener(
      "toggle",
      this.handleDetailsToggle,
    );
    this.stopAllActiveFrames();
  }

  async animate(
    durationSeconds: number,
    onUpdate: (progress: number) => void,
    easing: (progress: number) => number = easeInOutCubic,
  ): Promise<void> {
    if (this.destroyed) return;

    const duration = Math.max(0.0001, durationSeconds);

    return new Promise<void>((resolve) => {
      let elapsed = 0;
      let stopped = false;

      const stop = this.scene.onFrame(({ deltaTime }) => {
        if (stopped || this.destroyed) return;

        elapsed += deltaTime;
        const raw = clamp01(elapsed / duration);
        onUpdate(easing(raw));

        if (raw < 1) return;

        stopped = true;
        stop();
        this.activeFrameStops.delete(stop);
        resolve();
      });

      this.activeFrameStops.add(stop);
    });
  }

  wait(durationSeconds: number): Promise<void> {
    return this.animate(durationSeconds, () => {}, () => 1);
  }

  async drawSegment(
    segment: TraceableSegment2D,
    start: Vec2Tuple,
    end: Vec2Tuple,
    durationSeconds = 0.6,
  ): Promise<void> {
    segment.show().setEndpoints(start, start);

    await this.animate(durationSeconds, (progress) => {
      segment.setEndpoints(start, lerpPoint(start, end, progress));
    });

    segment.show().setEndpoints(start, end);
  }

  async revealBrace(
    brace: DimensionBraceLike,
    durationSeconds = 0.72,
  ): Promise<void> {
    brace
      .show()
      .setRevealProgress(0)
      .setLabelOpacity(0);

    await this.animate(durationSeconds, (progress) => {
      brace.setRevealProgress(progress);

      const labelProgress = clamp01((progress - 0.68) / 0.32);
      brace.setLabelOpacity(labelProgress);
    });

    brace
      .showCompleteBrace()
      .setLabelOpacity(1);
  }

  async revealLabel(
    label: TextLabelLike,
    durationSeconds = 0.36,
  ): Promise<void> {
    label.show().setOpacity(0);

    await this.animate(durationSeconds, (progress) => {
      label.setOpacity(easeOutCubic(progress));
    }, (x) => x);

    label.show().setOpacity(1);
  }

  async setFormula(
    label: TextLabelLike,
    latex: string,
    holdSeconds = 0.7,
    fadeSeconds = 0.18,
  ): Promise<void> {
    if (label.visible) {
      await this.animate(fadeSeconds, (progress) => {
        label.setOpacity(1 - progress);
      }, (x) => x);
    }

    label.setLatex(latex).show();

    await this.animate(fadeSeconds, (progress) => {
      label.setOpacity(progress);
    }, (x) => x);

    await this.wait(holdSeconds);
  }

  async revealFill(
    shape: FillShape2D,
    targetOpacity: number,
    durationSeconds = 0.46,
  ): Promise<void> {
    const clamped = clamp01(targetOpacity);
    shape.show().setFillOpacity(0);

    await this.animate(durationSeconds, (progress) => {
      shape.setFillOpacity(clamped * easeOutCubic(progress));
    }, (x) => x);

    shape.show().setFillOpacity(clamped);
  }

  private readonly handleDetailsToggle = (): void => {
    if (!this.containingDetails?.open || this.started || this.destroyed) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.scene.invalidate();
        this.tryStart();
      });
    });
  };

  private tryStart(): void {
    if (this.started || this.destroyed) return;

    if (this.containingDetails && !this.containingDetails.open) {
      return;
    }

    if (
      visibleIntersectionRatio(this.scene.canvas) <
      this.startVisibilityRatio
    ) {
      return;
    }

    this.started = true;
    this.visibilityObserver?.disconnect();
    this.resetCallback();

    void this.runCallback(this);
  }

  private stopAllActiveFrames(): void {
    for (const stop of this.activeFrameStops) {
      stop();
    }

    this.activeFrameStops.clear();
  }
}
