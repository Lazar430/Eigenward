import type { ColorRepresentation } from "three";

import {
  HUES,
  createCoordinatePlane2D,
  createPointMarker2D,
  createSegment2D,
  type CoordinatePlane2D,
  type MathScene2D,
  type ParametricShape2D,
  type PointMarker2D,
  type Segment2D,
  type Vec2Tuple,
  type ViewBounds2D,
} from "../../../../math-graphics";

const DEFAULT_START_VISIBILITY_RATIO = 0.15;
const DEFAULT_GRID_OPACITY = 0.2;

export interface ProgressiveConstructionTrace2D {
  prepare(): void;
  reset(): void;
  setProgress(progress: number): void;
  complete(): void;
}

export interface RegionRevealDurations2D {
  gridSeconds?: number;
  dottedSeconds?: number;
  solidSeconds?: number;
  fillSeconds?: number;
  phaseGapSeconds?: number;
}

export interface RegionRevealSequence2DOptions {
  scene: MathScene2D;
  coordinatePlane: CoordinatePlane2D;
  constructionTraces: readonly ProgressiveConstructionTrace2D[];
  region: ParametricShape2D;
  markers?: readonly PointMarker2D[];
  fillOpacity: number;
  gridOpacity?: number;
  startVisibilityRatio?: number;
  durations?: RegionRevealDurations2D;
}

export interface ViewportDashedLineTrace2DOptions {
  scene: MathScene2D;
  name: string;
  point: Vec2Tuple;
  direction: Vec2Tuple;
  color?: ColorRepresentation;
  opacity?: number;
  width?: number;
  dashSize?: number;
  gapSize?: number;
  viewportPaddingPixels?: number;
}

export interface DashedCircleTrace2DOptions {
  scene: MathScene2D;
  name: string;
  center?: Vec2Tuple;
  radius: number;
  color?: ColorRepresentation;
  opacity?: number;
  width?: number;
  dashCount?: number;
  dashFraction?: number;
}

export interface IntersectionMarker2DOptions {
  name: string;
  position: Vec2Tuple;
  text: string;
  offset?: Vec2Tuple;
  anchor?: Vec2Tuple;
  fill?: ColorRepresentation;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(value: number): number {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(value: number): number {
  const t = clamp01(value);

  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
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

function stagedProgress(
  progress: number,
  index: number,
  count: number,
  overlap = 0.24,
): number {
  if (count <= 1) return clamp01(progress);

  const stride = (1 - overlap) / count;
  const start = index * stride;
  const duration = overlap + stride;

  return clamp01((progress - start) / duration);
}

function visibleIntersectionRatio(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) return 0;

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

function clipInfiniteLineToBounds(
  point: Vec2Tuple,
  direction: Vec2Tuple,
  bounds: ViewBounds2D,
): readonly [Vec2Tuple, Vec2Tuple] {
  const [px, py] = point;
  const [dx, dy] = direction;
  const epsilon = 1e-9;

  if (Math.hypot(dx, dy) <= epsilon) {
    throw new RangeError("An infinite-line trace requires a nonzero direction.");
  }

  const candidates: Array<{ t: number; point: Vec2Tuple }> = [];

  const addCandidate = (t: number): void => {
    const x = px + t * dx;
    const y = py + t * dy;

    if (
      x >= bounds.left - epsilon &&
      x <= bounds.right + epsilon &&
      y >= bounds.bottom - epsilon &&
      y <= bounds.top + epsilon
    ) {
      if (
        !candidates.some(
          (candidate) =>
            Math.hypot(
              candidate.point[0] - x,
              candidate.point[1] - y,
            ) <= 1e-7,
        )
      ) {
        candidates.push({ t, point: [x, y] });
      }
    }
  };

  if (Math.abs(dx) > epsilon) {
    addCandidate((bounds.left - px) / dx);
    addCandidate((bounds.right - px) / dx);
  }

  if (Math.abs(dy) > epsilon) {
    addCandidate((bounds.bottom - py) / dy);
    addCandidate((bounds.top - py) / dy);
  }

  if (candidates.length < 2) {
    throw new Error("The requested line does not cross the visible viewport.");
  }

  candidates.sort((a, b) => a.t - b.t);

  return [
    candidates[0].point,
    candidates[candidates.length - 1].point,
  ];
}

export function createRegionCoordinatePlane2D(
  scene: MathScene2D,
  name: string,
): CoordinatePlane2D {
  return createCoordinatePlane2D({
    name,
    scene,
    edgePaddingPixels: 18,
    gridStep: 1,
    integerStep: 1,
    gridColor: 0x777087,
    gridOpacity: DEFAULT_GRID_OPACITY,
    axisColor: 0xeee9ff,
    axisOpacity: 0.9,
    axisWidth: 2.1,
    tickColor: 0xded7f2,
    tickOpacity: 0.8,
    tickLength: 0.12,
    labelColor: "rgba(239, 234, 255, 0.78)",
    labelFontSizePx: 12,
  });
}

export function createIntersectionMarker2D({
  name,
  position,
  text,
  offset = [0.16, 0.16],
  anchor = [0, 1],
  fill = HUES.gold.light,
}: IntersectionMarker2DOptions): PointMarker2D {
  return createPointMarker2D({
    name,
    position,
    radius: 0.075,
    fill,
    outline: 0x21172d,
    outlineWidth: 0.026,
    label: {
      text,
      visibility: "always",
      offset,
      anchor,
      color: "rgba(255, 244, 211, 0.98)",
      fontSizePx: 12,
      fontWeight: 720,
      background: "rgba(30, 23, 22, 0.88)",
      border: "1px solid rgba(255, 225, 138, 0.28)",
      borderRadiusPx: 7,
      padding: "0.18rem 0.34rem",
    },
  });
}

export function createViewportDashedLineTrace2D({
  scene,
  name,
  point,
  direction,
  color = HUES.purple.light,
  opacity = 0.72,
  width = 1.9,
  dashSize = 0.075,
  gapSize = 0.105,
  viewportPaddingPixels = 10,
}: ViewportDashedLineTrace2DOptions): ProgressiveConstructionTrace2D {
  const segment = createSegment2D({
    name,
    start: [0, 0],
    end: [0, 0],
    style: {
      color,
      opacity,
      width,
      dashed: true,
      dashSize,
      gapSize,
    },
  });

  scene.add(segment);

  let start: Vec2Tuple = [0, 0];
  let end: Vec2Tuple = [0, 0];

  const prepare = (): void => {
    [start, end] = clipInfiniteLineToBounds(
      point,
      direction,
      scene.getViewBounds(viewportPaddingPixels),
    );
  };

  const reset = (): void => {
    segment.hide();
    segment.setEndpoints(start, start);
  };

  const setProgress = (progress: number): void => {
    const p = clamp01(progress);

    if (p <= 0) {
      reset();
      return;
    }

    segment.show();
    segment.setEndpoints(start, lerpPoint(start, end, p));
  };

  return {
    prepare,
    reset,
    setProgress,
    complete() {
      segment.show().setEndpoints(start, end);
    },
  };
}

export function createDashedCircleTrace2D({
  scene,
  name,
  center = [0, 0],
  radius,
  color = HUES.purple.light,
  opacity = 0.72,
  width = 1.9,
  dashCount = 54,
  dashFraction = 0.42,
}: DashedCircleTrace2DOptions): ProgressiveConstructionTrace2D {
  const count = Math.max(12, Math.floor(dashCount));
  const fraction = Math.min(0.8, Math.max(0.12, dashFraction));

  const entries: Array<{
    segment: Segment2D;
    start: Vec2Tuple;
    end: Vec2Tuple;
  }> = [];

  for (let index = 0; index < count; index += 1) {
    const cellStart = (index / count) * Math.PI * 2;
    const cellEnd = ((index + fraction) / count) * Math.PI * 2;

    const start: Vec2Tuple = [
      center[0] + radius * Math.cos(cellStart),
      center[1] + radius * Math.sin(cellStart),
    ];

    const end: Vec2Tuple = [
      center[0] + radius * Math.cos(cellEnd),
      center[1] + radius * Math.sin(cellEnd),
    ];

    const segment = createSegment2D({
      name: `${name}:dash-${index}`,
      start,
      end,
      style: {
        color,
        opacity,
        width,
      },
    });

    segment.hide();
    scene.add(segment);

    entries.push({ segment, start, end });
  }

  const reset = (): void => {
    for (const entry of entries) {
      entry.segment.hide().setEndpoints(entry.start, entry.start);
    }
  };

  const setProgress = (progress: number): void => {
    const scaled = clamp01(progress) * entries.length;

    entries.forEach((entry, index) => {
      const local = clamp01(scaled - index);

      if (local <= 0) {
        entry.segment.hide();
        return;
      }

      entry.segment
        .show()
        .setEndpoints(
          entry.start,
          lerpPoint(entry.start, entry.end, local),
        );
    });
  };

  return {
    prepare() {},
    reset,
    setProgress,
    complete() {
      for (const entry of entries) {
        entry.segment.show().setEndpoints(entry.start, entry.end);
      }
    },
  };
}

export class RegionRevealSequence2D {
  private readonly scene: MathScene2D;
  private readonly plane: CoordinatePlane2D;
  private readonly traces: readonly ProgressiveConstructionTrace2D[];
  private readonly region: ParametricShape2D;
  private readonly markers: readonly PointMarker2D[];
  private readonly targetFillOpacity: number;
  private readonly targetGridOpacity: number;
  private readonly startVisibilityRatio: number;

  private readonly gridSeconds: number;
  private readonly dottedSeconds: number;
  private readonly solidSeconds: number;
  private readonly fillSeconds: number;
  private readonly phaseGapSeconds: number;

  private started = false;
  private destroyed = false;
  private elapsed = 0;
  private solidCompleted = false;
  private markersShown = false;

  private stopFrame = (): void => {};
  private readonly visibilityObserver: IntersectionObserver | null;
  private readonly containingDetails: HTMLDetailsElement | null;

  constructor({
    scene,
    coordinatePlane,
    constructionTraces,
    region,
    markers = [],
    fillOpacity,
    gridOpacity = DEFAULT_GRID_OPACITY,
    startVisibilityRatio = DEFAULT_START_VISIBILITY_RATIO,
    durations = {},
  }: RegionRevealSequence2DOptions) {
    this.scene = scene;
    this.plane = coordinatePlane;
    this.traces = constructionTraces;
    this.region = region;
    this.markers = markers;
    this.targetFillOpacity = clamp01(fillOpacity);
    this.targetGridOpacity = clamp01(gridOpacity);
    this.startVisibilityRatio = clamp01(startVisibilityRatio);

    this.gridSeconds = durations.gridSeconds ?? 1.05;
    this.dottedSeconds = durations.dottedSeconds ?? 1.35;
    this.solidSeconds = durations.solidSeconds ?? 1.5;
    this.fillSeconds = durations.fillSeconds ?? 0.7;
    this.phaseGapSeconds = durations.phaseGapSeconds ?? 0.12;

    this.containingDetails = scene.canvas.closest("details");

    this.reset();

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

  reset(): void {
    this.stopFrame();
    this.stopFrame = (): void => {};

    this.elapsed = 0;
    this.solidCompleted = false;
    this.markersShown = false;

    this.plane
      .setGridOpacity(0)
      .setAxisReveal(0)
      .setIntegerReveal(0);

    for (const trace of this.traces) {
      trace.reset();
    }

    this.region
      .setFillOpacity(0)
      .setOutlineTraceRange(0, 0);

    for (const marker of this.markers) {
      marker.hide();
    }
  }

  start(): void {
    if (this.started || this.destroyed) return;

    this.started = true;
    this.visibilityObserver?.disconnect();

    for (const trace of this.traces) {
      trace.prepare();
    }

    this.reset();

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      this.finishImmediately();
      return;
    }

    this.stopFrame = this.scene.onFrame(({ deltaTime }) => {
      this.elapsed += deltaTime;
      this.update(this.elapsed);
    });
  }

  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.visibilityObserver?.disconnect();
    this.containingDetails?.removeEventListener(
      "toggle",
      this.handleDetailsToggle,
    );

    this.stopFrame();
    this.stopFrame = (): void => {};
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

    if (
      this.containingDetails &&
      !this.containingDetails.open
    ) {
      return;
    }

    if (
      visibleIntersectionRatio(this.scene.canvas) <
      this.startVisibilityRatio
    ) {
      return;
    }

    this.start();
  }

  private finishImmediately(): void {
    this.plane
      .setGridOpacity(this.targetGridOpacity)
      .setAxisReveal(1)
      .setIntegerReveal(1);

    for (const trace of this.traces) {
      trace.complete();
    }

    this.region
      .showCompleteOutline()
      .setFillOpacity(this.targetFillOpacity);

    for (const marker of this.markers) {
      marker.show();
    }

    this.scene.invalidate();
  }

  private update(elapsed: number): void {
    const gap = this.phaseGapSeconds;

    const gridEnd = this.gridSeconds;
    const dottedStart = gridEnd + gap;
    const dottedEnd = dottedStart + this.dottedSeconds;
    const solidStart = dottedEnd + gap;
    const solidEnd = solidStart + this.solidSeconds;
    const fillStart = solidEnd + gap;
    const fillEnd = fillStart + this.fillSeconds;

    const gridProgress = easeOutCubic(
      elapsed / this.gridSeconds,
    );

    this.plane
      .setGridOpacity(
        this.targetGridOpacity * gridProgress,
      )
      .setAxisReveal(gridProgress)
      .setIntegerReveal(
        easeOutCubic(
          (gridProgress - 0.32) / 0.68,
        ),
      );

    const dottedProgress = clamp01(
      (elapsed - dottedStart) / this.dottedSeconds,
    );

    this.traces.forEach((trace, index) => {
      trace.setProgress(
        easeInOutCubic(
          stagedProgress(
            dottedProgress,
            index,
            this.traces.length,
          ),
        ),
      );
    });

    const solidProgress = clamp01(
      (elapsed - solidStart) / this.solidSeconds,
    );

    if (solidProgress > 0 && !this.solidCompleted) {
      this.region.setOutlineTraceRange(
        0,
        easeInOutCubic(solidProgress),
      );

      if (solidProgress >= 1) {
        this.region.showCompleteOutline();
        this.solidCompleted = true;
      }
    }

    if (
      solidProgress >= 1 &&
      !this.markersShown
    ) {
      for (const marker of this.markers) {
        marker.show();
      }

      this.markersShown = true;
    }

    const fillProgress = easeOutCubic(
      (elapsed - fillStart) / this.fillSeconds,
    );

    this.region.setFillOpacity(
      this.targetFillOpacity * fillProgress,
    );

    if (elapsed < fillEnd) return;

    this.finishImmediately();
    this.stopFrame();
    this.stopFrame = (): void => {};
  }
}
