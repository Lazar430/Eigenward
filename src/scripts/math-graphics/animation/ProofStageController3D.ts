import type { MathScene3D } from "../core/MathScene3D";
import type { Vec3Tuple } from "../core/types3D";
import type { AngleSector3D } from "../primitives/AngleSector3D";
import type { Polygon3D } from "../primitives/Polygon3D";
import type { Segment3D } from "../primitives/Segment3D";
import {
  fitPointsCamera3D,
  sceneContainsPoints3D,
  type CameraTarget3D,
  type FitPointsCamera3DOptions,
} from "../geometry/viewport3D";

export type StageEasing3D = (progress: number) => number;

export interface ProofStage3D {
  title: string;
  description: string;
  run: (controller: ProofStageController3D) => void | Promise<void>;
}

export interface ProofStageController3DOptions {
  stages: readonly ProofStage3D[];
  reset: () => void;
  startVisibilityRatio?: number;
  nextButtonPosition?: "top-right" | "bottom-right";
  /**
   * Call this after programmatic camera motion if another interaction controller
   * (typically OrbitController3D) caches camera state.
   */
  syncCameraController?: () => void;
}

export interface SegmentDrawAnimation3DOptions {
  durationSeconds?: number;
  easing?: StageEasing3D;
}

export interface RevealAnimation3DOptions {
  durationSeconds?: number;
  easing?: StageEasing3D;
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

function lerpVec3(
  a: Vec3Tuple,
  b: Vec3Tuple,
  progress: number,
): Vec3Tuple {
  return [
    lerp(a[0], b[0], progress),
    lerp(a[1], b[1], progress),
    lerp(a[2], b[2], progress),
  ];
}

/**
 * 3D counterpart of ProofStageController2D.
 *
 * It owns proof progression/UI and generic 3D reveal choreography, but leaves
 * the actual geometry and simultaneity choices in the scene file.
 */
export class ProofStageController3D {
  private readonly stages: readonly ProofStage3D[];
  private readonly resetScene: () => void;
  private readonly visibilityRatio: number;
  private readonly syncCameraController: () => void;

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
    readonly scene: MathScene3D,
    {
      stages,
      reset,
      startVisibilityRatio = 0.15,
      nextButtonPosition = "bottom-right",
      syncCameraController = () => {},
    }: ProofStageController3DOptions,
  ) {
    if (stages.length === 0) {
      throw new RangeError("A staged proof requires at least one stage.");
    }

    this.stages = stages;
    this.resetScene = reset;
    this.visibilityRatio = clamp01(startVisibilityRatio);
    this.syncCameraController = syncCameraController;

    /*
     * Important: reset before the browser can paint construction-time geometry.
     * This is the same anti-flash rule used by the corrected 2D controller.
     */
    this.resetScene();

    const shell = scene.canvas.parentElement;
    if (!shell) {
      throw new Error(
        "ProofStageController3D requires a canvas parent element.",
      );
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
    this.infoButton.setAttribute(
      "aria-label",
      "Show current proof-stage details",
    );

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
            { threshold: [0, this.visibilityRatio, 1] },
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
    this.currentStageIndex = 0;
    this.updateOverlay();
    await this.runCurrentStage();
  }

  async next(): Promise<void> {
    if (!this.started || this.busy || this.destroyed) return;

    if (this.currentStageIndex >= this.stages.length - 1) {
      this.cancelAnimations();
      this.resetScene();
      this.syncCameraController();
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
    easing: StageEasing3D = easeOutCubic,
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
    segment: Segment3D,
    start: Vec3Tuple,
    end: Vec3Tuple,
    {
      durationSeconds = 0.55,
      easing = easeOutCubic,
    }: SegmentDrawAnimation3DOptions = {},
  ): Promise<void> {
    segment.show();
    segment.setEndpoints(start, start);

    return this.animate(
      durationSeconds,
      (progress) => {
        segment.setEndpoints(start, lerpVec3(start, end, progress));
      },
      easing,
    );
  }

  revealAngleSector(
    sector: AngleSector3D,
    finalRadius: number,
    {
      durationSeconds = 0.42,
      easing = easeOutCubic,
    }: RevealAnimation3DOptions = {},
  ): Promise<void> {
    sector.show();
    sector.setRadius(0);

    return this.animate(
      durationSeconds,
      (progress) => sector.setRadius(finalRadius * progress),
      easing,
    );
  }

  revealPolygon(
    polygon: Polygon3D,
    finalOpacity: number,
    {
      durationSeconds = 0.42,
      easing = easeOutCubic,
    }: RevealAnimation3DOptions = {},
  ): Promise<void> {
    polygon.show();
    polygon.setFillOpacity(0);

    return this.animate(
      durationSeconds,
      (progress) => polygon.setFillOpacity(finalOpacity * progress),
      easing,
    );
  }

  async animateCameraTo(
    target: CameraTarget3D,
    durationSeconds = 0.7,
  ): Promise<void> {
    const start = this.scene.getCameraState();
    const finalFov = target.fovDegrees ?? start.fovDegrees;

    await this.animate(durationSeconds, (progress) => {
      this.scene.setCamera({
        position: lerpVec3(start.position, target.position, progress),
        target: lerpVec3(start.target, target.target, progress),
        fovDegrees: lerp(start.fovDegrees, finalFov, progress),
      });
    });

    this.syncCameraController();
  }

  ensurePointsVisible(
    points: readonly Vec3Tuple[],
    options: FitPointsCamera3DOptions & {
      paddingNdc?: number;
      durationSeconds?: number;
    } = {},
  ): Promise<void> {
    if (
      sceneContainsPoints3D(
        this.scene,
        points,
        options.paddingNdc ?? 0.08,
      )
    ) {
      return Promise.resolve();
    }

    const target = fitPointsCamera3D(this.scene, points, options);
    return this.animateCameraTo(target, options.durationSeconds ?? 0.7);
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
