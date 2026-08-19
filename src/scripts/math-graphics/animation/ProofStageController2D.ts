import type { MathScene2D } from "../core/MathScene2D";
import type { Vec2Tuple } from "../core/types";
import type { Segment2D } from "../primitives/Segment2D";
import type { AngleSector2D } from "../primitives/AngleSector2D";
import type { RightAngleMarker2D } from "../primitives/RightAngleMarker2D";
import {
  currentSceneView2D,
  fitPointsView2D,
  sceneContainsPoints2D,
  type FitPointsView2DOptions,
  type SceneView2D,
} from "../geometry/viewport2D";

export type StageEasing2D = (progress: number) => number;

export interface ProofStage2D {
  title: string;
  description: string;
  run: (controller: ProofStageController2D) => void | Promise<void>;
}

export interface ProofStageController2DOptions {
  stages: readonly ProofStage2D[];
  reset: () => void;
  startVisibilityRatio?: number;
  nextButtonPosition?: "top-right" | "bottom-right";
}

export interface SegmentDrawAnimation2DOptions {
  durationSeconds?: number;
  easing?: StageEasing2D;
}

export interface RevealAnimation2DOptions {
  durationSeconds?: number;
  easing?: StageEasing2D;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(value: number): number {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, progress: number): number {
  return a + (b - a) * progress;
}

/**
 * Reusable staged-proof controller:
 * - starts only once the canvas enters the viewport;
 * - serializes stage changes;
 * - exposes small geometry-animation helpers;
 * - owns a Next/Reset button;
 * - owns a deliberately subdued hover/focus "i" control for stage details.
 */
export class ProofStageController2D {
  private readonly stages: readonly ProofStage2D[];
  private readonly resetScene: () => void;
  private readonly visibilityRatio: number;

  private currentStageIndex = -1;
  private busy = false;
  private destroyed = false;
  private started = false;

  private readonly activeStops = new Set<() => void>();
  private readonly visibilityObserver: IntersectionObserver | null;

  private readonly nextButton: HTMLButtonElement;
  private readonly infoButton: HTMLButtonElement;
  private readonly infoPanel: HTMLDivElement;
  private readonly infoTitle: HTMLDivElement;
  private readonly infoDescription: HTMLDivElement;

  constructor(
    readonly scene: MathScene2D,
    {
      stages,
      reset,
      startVisibilityRatio = 0.15,
      nextButtonPosition = "bottom-right",
    }: ProofStageController2DOptions,
  ) {
    if (stages.length === 0) {
      throw new RangeError("A staged proof requires at least one stage.");
    }

    this.stages = stages;
    this.resetScene = reset;
    this.visibilityRatio = clamp01(startVisibilityRatio);

    const shell = scene.canvas.parentElement;

    if (!shell) {
      throw new Error("ProofStageController2D requires a canvas parent element.");
    }

    this.nextButton = document.createElement("button");
    this.nextButton.type = "button";
    this.nextButton.textContent = "Next stage";
    this.nextButton.disabled = true;

    Object.assign(this.nextButton.style, {
      position: "absolute",
      right: "0.85rem",
      ...(nextButtonPosition === "bottom-right"
        ? { bottom: "0.85rem" }
        : { top: "0.85rem" }),
      zIndex: "32",
      padding: "0.5rem 0.78rem",
      border: "1px solid rgba(198, 180, 255, 0.22)",
      borderRadius: "0.72rem",
      background: "rgba(19, 16, 32, 0.9)",
      color: "#f7f4ff",
      font: "inherit",
      fontSize: "0.8rem",
      fontWeight: "760",
      cursor: "pointer",
      boxShadow: "0 0.65rem 1.6rem rgba(3, 1, 10, 0.24)",
      backdropFilter: "blur(8px)",
    });

    this.infoButton = document.createElement("button");
    this.infoButton.type = "button";
    this.infoButton.textContent = "i";
    this.infoButton.setAttribute("aria-label", "Show current proof-stage details");

    Object.assign(this.infoButton.style, {
      position: "absolute",
      top: "0.85rem",
      right: "0.85rem",
      zIndex: "34",
      width: "2rem",
      height: "2rem",
      display: "grid",
      placeItems: "center",
      border: "1px solid rgba(198, 180, 255, 0.2)",
      borderRadius: "999px",
      background: "rgba(18, 14, 31, 0.72)",
      color: "#f7f4ff",
      font: "inherit",
      fontFamily: "Georgia, serif",
      fontSize: "1rem",
      fontWeight: "700",
      fontStyle: "italic",
      cursor: "help",
      opacity: "0.34",
      transition: "opacity 160ms ease, border-color 160ms ease",
      backdropFilter: "blur(8px)",
    });

    this.infoPanel = document.createElement("div");
    this.infoPanel.setAttribute("role", "status");

    Object.assign(this.infoPanel.style, {
      position: "absolute",
      top: "3.25rem",
      right: "0.85rem",
      zIndex: "33",
      width: "min(24rem, calc(100% - 1.7rem))",
      padding: "0.7rem 0.78rem",
      border: "1px solid rgba(198, 180, 255, 0.16)",
      borderRadius: "0.78rem",
      background: "rgba(17, 14, 30, 0.91)",
      color: "#f7f4ff",
      boxShadow: "0 0.8rem 2rem rgba(3, 1, 10, 0.28)",
      backdropFilter: "blur(10px)",
      opacity: "0",
      transform: "translateY(-4px)",
      pointerEvents: "none",
      transition: "opacity 160ms ease, transform 160ms ease",
    });

    this.infoTitle = document.createElement("div");
    Object.assign(this.infoTitle.style, {
      fontSize: "0.82rem",
      fontWeight: "780",
      marginBottom: "0.32rem",
      color: "rgba(232, 247, 255, 0.98)",
    });

    this.infoDescription = document.createElement("div");
    Object.assign(this.infoDescription.style, {
      fontSize: "0.76rem",
      fontWeight: "560",
      lineHeight: "1.5",
      color: "rgba(239, 234, 255, 0.76)",
    });

    this.infoPanel.append(this.infoTitle, this.infoDescription);
    shell.append(this.nextButton, this.infoPanel, this.infoButton);

    this.nextButton.addEventListener("click", this.handleNextClick);
    this.infoButton.addEventListener("mouseenter", this.showInfo);
    this.infoButton.addEventListener("mouseleave", this.hideInfo);
    this.infoButton.addEventListener("focus", this.showInfo);
    this.infoButton.addEventListener("blur", this.hideInfo);

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
                entry.intersectionRatio >= this.visibilityRatio
            ) {
              this.visibilityObserver?.disconnect();
              void this.start();
            }
          },
          {
            threshold: [0, this.visibilityRatio, 1],
          },
        );

    if (this.visibilityObserver) {
      this.visibilityObserver.observe(scene.canvas);
    } else {
      void this.start();
    }
  }

  getStageIndex(): number {
    return this.currentStageIndex;
  }

  async start(): Promise<void> {
    if (this.started || this.destroyed) return;

    this.started = true;
    this.resetScene();
    this.currentStageIndex = 0;
    this.updateOverlay();
    await this.runCurrentStage();
  }

  async next(): Promise<void> {
    if (!this.started || this.busy || this.destroyed) return;

    if (this.currentStageIndex >= this.stages.length - 1) {
      this.cancelAnimations();
      this.resetScene();
      this.currentStageIndex = 0;
      this.updateOverlay();
      await this.runCurrentStage();
      return;
    }

    this.currentStageIndex += 1;
    this.updateOverlay();
    await this.runCurrentStage();
  }

  animate(
    durationSeconds: number,
    update: (progress: number) => void,
    easing: StageEasing2D = easeOutCubic,
  ): Promise<void> {
    if (this.destroyed) return Promise.resolve();

    const duration = Math.max(1e-6, durationSeconds);

    return new Promise((resolve) => {
      let elapsed = 0;
      let finished = false;

      update(easing(0));

      const stop = this.scene.onFrame(({ deltaTime }) => {
        if (finished || this.destroyed) return;

        elapsed += deltaTime;
        const rawProgress = clamp01(elapsed / duration);
        update(easing(rawProgress));

        if (rawProgress < 1) return;

        finished = true;
        stop();
        this.activeStops.delete(stop);
        resolve();
      });

      this.activeStops.add(stop);
    });
  }

  wait(durationSeconds: number): Promise<void> {
    return this.animate(durationSeconds, () => {}, (value) => value);
  }

  drawSegment(
    segment: Segment2D,
    start: Vec2Tuple,
    end: Vec2Tuple,
    {
      durationSeconds = 0.55,
      easing = easeOutCubic,
    }: SegmentDrawAnimation2DOptions = {},
  ): Promise<void> {
    segment.show();
    segment.setEndpoints(start, start);

    return this.animate(
      durationSeconds,
      (progress) => {
        segment.setEndpoints(start, [
          lerp(start[0], end[0], progress),
          lerp(start[1], end[1], progress),
        ]);
      },
      easing,
    );
  }

  revealAngleSector(
    sector: AngleSector2D,
    finalRadius: number,
    {
      durationSeconds = 0.42,
      easing = easeOutCubic,
    }: RevealAnimation2DOptions = {},
  ): Promise<void> {
    sector.show();
    sector.setRadius(0);

    return this.animate(
      durationSeconds,
      (progress) => sector.setRadius(finalRadius * progress),
      easing,
    );
  }

  revealRightAngle(
    marker: RightAngleMarker2D,
    {
      durationSeconds = 0.32,
      easing = easeOutCubic,
    }: RevealAnimation2DOptions = {},
  ): Promise<void> {
    marker.show();
    marker.setReveal(0);

    return this.animate(
      durationSeconds,
      (progress) => marker.setReveal(progress),
      easing,
    );
  }

  animateViewTo(
    target: SceneView2D,
    durationSeconds = 0.65,
  ): Promise<void> {
    const start = currentSceneView2D(this.scene);

    return this.animate(durationSeconds, (progress) => {
      this.scene.setView({
        viewHeight: lerp(start.viewHeight, target.viewHeight, progress),
        center: [
          lerp(start.center[0], target.center[0], progress),
          lerp(start.center[1], target.center[1], progress),
        ],
        unitSizePixels: null,
      });
    });
  }

  ensurePointsVisible(
    points: readonly Vec2Tuple[],
    options: FitPointsView2DOptions & {
      paddingPixels?: number;
      durationSeconds?: number;
    } = {},
  ): Promise<void> {
    if (
      sceneContainsPoints2D(
        this.scene,
        points,
        options.paddingPixels ?? 34,
      )
    ) {
      return Promise.resolve();
    }

    const target = fitPointsView2D(this.scene, points, options);
    return this.animateViewTo(target, options.durationSeconds ?? 0.7);
  }

  cancelAnimations(): void {
    for (const stop of this.activeStops) stop();
    this.activeStops.clear();
  }

  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.visibilityObserver?.disconnect();
    this.cancelAnimations();

    this.nextButton.removeEventListener("click", this.handleNextClick);
    this.infoButton.removeEventListener("mouseenter", this.showInfo);
    this.infoButton.removeEventListener("mouseleave", this.hideInfo);
    this.infoButton.removeEventListener("focus", this.showInfo);
    this.infoButton.removeEventListener("blur", this.hideInfo);

    this.nextButton.remove();
    this.infoButton.remove();
    this.infoPanel.remove();
  }

  private async runCurrentStage(): Promise<void> {
    this.busy = true;
    this.nextButton.disabled = true;
    this.nextButton.style.opacity = "0.55";

    try {
      await this.stages[this.currentStageIndex].run(this);
    } finally {
      if (!this.destroyed) {
        this.busy = false;
        this.nextButton.disabled = false;
        this.nextButton.style.opacity = "1";
        this.updateOverlay();
      }
    }
  }

  private updateOverlay(): void {
    const stage = this.stages[Math.max(0, this.currentStageIndex)];

    this.infoTitle.textContent =
      `Stage ${Math.max(1, this.currentStageIndex + 1)} · ${stage.title}`;
    this.infoDescription.textContent = stage.description;

    this.nextButton.textContent =
      this.currentStageIndex >= this.stages.length - 1
        ? "Reset proof"
        : "Next stage";
  }

  private readonly handleNextClick = (): void => {
    void this.next();
  };

  private readonly showInfo = (): void => {
    this.infoButton.style.opacity = "1";
    this.infoButton.style.borderColor = "rgba(145, 239, 255, 0.42)";
    this.infoPanel.style.opacity = "1";
    this.infoPanel.style.transform = "translateY(0)";
  };

  private readonly hideInfo = (): void => {
    this.infoButton.style.opacity = "0.34";
    this.infoButton.style.borderColor = "rgba(198, 180, 255, 0.2)";
    this.infoPanel.style.opacity = "0";
    this.infoPanel.style.transform = "translateY(-4px)";
  };
}
