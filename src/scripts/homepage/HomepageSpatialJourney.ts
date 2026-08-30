interface SpatialStopRecord {
  element: HTMLElement;
  targetCameraX: number;
  centerY: number;
}

interface SpatialConnectorRecord {
  element: HTMLElement;
  topY: number;
  bottomY: number;
  height: number;
}

export interface HomepageSpatialJourneyOptions {
  /** Horizontal camera motion is disabled below this media query. */
  desktopQuery?: string;
  /** Fraction of the connector reserved before camera motion really begins. */
  cameraLeadIn?: number;
  /** Fraction of the connector reserved after camera motion has essentially ended. */
  cameraLeadOut?: number;
  /** Viewport point used as the reading/camera focus. */
  focusViewportRatio?: number;
  /** Connector progress at which the destination waypoint pops in. */
  arrivalProgress?: number;
}

const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, value));

const lerp = (start: number, end: number, t: number): number =>
  start + (end - start) * t;

function smootherstep(value: number): number {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Native-scroll spatial homepage controller.
 *
 * The browser still owns vertical scrolling. This controller only moves the
 * presentation horizontally while the reader crosses the large connector
 * gaps between stops. Because the transform is translation-only, descendant
 * MathScene2D/MathScene3D canvases retain their real CSS width and height.
 */
export class HomepageSpatialJourney {
  private readonly track: HTMLElement;
  private readonly stops: HTMLElement[];
  private readonly connectors: HTMLElement[];
  private readonly desktopMedia: MediaQueryList;
  private readonly reducedMotionMedia: MediaQueryList;
  private readonly resizeObserver: ResizeObserver | null;

  private readonly cameraLeadIn: number;
  private readonly cameraLeadOut: number;
  private readonly focusViewportRatio: number;
  private readonly arrivalProgress: number;

  private stopRecords: SpatialStopRecord[] = [];
  private connectorRecords: SpatialConnectorRecord[] = [];

  private frame = 0;
  private initialRevealFrame = 0;
  private destroyed = false;
  private lastCurrentIndex = -1;
  private arrivedStates: boolean[] = [];

  constructor(
    track: HTMLElement,
    options: HomepageSpatialJourneyOptions = {},
  ) {
    this.track = track;
    this.stops = Array.from(
      track.querySelectorAll<HTMLElement>("[data-spatial-stop]"),
    ).sort(
      (left, right) =>
        Number(left.dataset.spatialIndex ?? 0) -
        Number(right.dataset.spatialIndex ?? 0),
    );

    this.connectors = Array.from(
      track.querySelectorAll<HTMLElement>("[data-spatial-connector]"),
    );

    this.desktopMedia = window.matchMedia(
      options.desktopQuery ?? "(min-width: 901px)",
    );
    this.reducedMotionMedia = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    this.cameraLeadIn = clamp01(options.cameraLeadIn ?? 0.12);
    this.cameraLeadOut = clamp01(options.cameraLeadOut ?? 0.10);
    this.focusViewportRatio = clamp01(options.focusViewportRatio ?? 0.52);
    this.arrivalProgress = clamp01(options.arrivalProgress ?? 0.92);

    this.arrivedStates = this.stops.map(() => false);

    this.resizeObserver =
      "ResizeObserver" in window
        ? new ResizeObserver(() => {
            this.measure();
            this.requestUpdate();
          })
        : null;

    this.resizeObserver?.observe(this.track);
    for (const stop of this.stops) this.resizeObserver?.observe(stop);
    for (const connector of this.connectors) this.resizeObserver?.observe(connector);

    this.measure();
    this.updateNow();
    this.scheduleInitialReveal();

    window.addEventListener("scroll", this.handleScroll, { passive: true });
    window.addEventListener("resize", this.handleResize, { passive: true });
    this.desktopMedia.addEventListener("change", this.handleResize);
    this.reducedMotionMedia.addEventListener("change", this.handleResize);

    void document.fonts?.ready.then(() => {
      if (this.destroyed) return;
      this.measure();
      this.requestUpdate();
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    cancelAnimationFrame(this.frame);
    cancelAnimationFrame(this.initialRevealFrame);
    this.frame = 0;
    this.initialRevealFrame = 0;

    window.removeEventListener("scroll", this.handleScroll);
    window.removeEventListener("resize", this.handleResize);
    this.desktopMedia.removeEventListener("change", this.handleResize);
    this.reducedMotionMedia.removeEventListener("change", this.handleResize);
    this.resizeObserver?.disconnect();

    this.track.style.removeProperty("--home-camera-x");

    for (const connector of this.connectors) {
      connector.style.removeProperty("--home-route-hidden");
    }
  }

  private readonly handleScroll = (): void => {
    this.requestUpdate();
  };

  private readonly handleResize = (): void => {
    this.measure();
    this.requestUpdate();
  };

  private requestUpdate(): void {
    if (this.destroyed || this.frame !== 0) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.updateNow();
    });
  }

  /**
   * Browser scroll restoration can happen just after module evaluation. If the
   * wide track paints before that restoration and before the first camera
   * calculation, a left/right stop briefly appears near the world center and
   * then snaps into place. Keep the track visually suppressed for two frames,
   * then remeasure at the restored scroll position and reveal it atomically.
   */
  private scheduleInitialReveal(): void {
    const reveal = (): void => {
      if (this.destroyed) return;

      this.measure();
      this.updateNow();
      this.track.dataset.spatialReady = "true";
    };

    this.initialRevealFrame = requestAnimationFrame(() => {
      this.initialRevealFrame = requestAnimationFrame(() => {
        this.initialRevealFrame = 0;
        reveal();
      });
    });
  }

  private measure(): void {
    if (this.destroyed) return;

    /*
     * Camera translation is stored on children, not the track itself, so the
     * track's layout geometry remains stable while measuring.
     */
    const trackWidth = this.track.clientWidth;
    const trackRectangle = this.track.getBoundingClientRect();
    const pageTop = window.scrollY + trackRectangle.top;

    this.stopRecords = this.stops.map((element) => {
      const centerInTrack = element.offsetLeft + element.offsetWidth / 2;
      const targetCameraX =
        this.desktopMedia.matches && !this.reducedMotionMedia.matches
          ? trackWidth / 2 - centerInTrack
          : 0;

      const centerY =
        pageTop + element.offsetTop + element.offsetHeight / 2;

      return {
        element,
        targetCameraX,
        centerY,
      };
    });

    this.connectorRecords = this.connectors.map((element) => {
      const topY = pageTop + element.offsetTop;
      const height = Math.max(1, element.offsetHeight);

      return {
        element,
        topY,
        bottomY: topY + height,
        height,
      };
    });
  }

  private updateNow(): void {
    if (this.destroyed || this.stopRecords.length === 0) return;

    const focusY =
      window.scrollY + window.innerHeight * this.focusViewportRatio;

    const cameraX = this.resolveCameraX(focusY);
    this.track.style.setProperty("--home-camera-x", `${cameraX.toFixed(3)}px`);

    this.updateConnectorDrawing(focusY);
    this.updateWaypoints(focusY);
    this.updateCurrentStop(focusY);
  }

  private resolveCameraX(focusY: number): number {
    if (!this.desktopMedia.matches || this.reducedMotionMedia.matches) return 0;

    let cameraX = this.stopRecords[0]?.targetCameraX ?? 0;

    for (let index = 0; index < this.connectorRecords.length; index += 1) {
      const connector = this.connectorRecords[index];
      const start = this.stopRecords[index];
      const end = this.stopRecords[index + 1];

      if (!start || !end) break;

      if (focusY < connector.topY) {
        return cameraX;
      }

      if (focusY <= connector.bottomY) {
        const rawProgress = clamp01(
          (focusY - connector.topY) / connector.height,
        );

        const movingRange = Math.max(
          0.001,
          1 - this.cameraLeadIn - this.cameraLeadOut,
        );

        const cameraProgress = smootherstep(
          (rawProgress - this.cameraLeadIn) / movingRange,
        );

        return lerp(
          start.targetCameraX,
          end.targetCameraX,
          cameraProgress,
        );
      }

      cameraX = end.targetCameraX;
    }

    return cameraX;
  }

  private updateConnectorDrawing(focusY: number): void {
    for (const connector of this.connectorRecords) {
      const progress = clamp01(
        (focusY - connector.topY) / connector.height,
      );

      connector.element.style.setProperty(
        "--home-route-hidden",
        `${((1 - progress) * 100).toFixed(3)}%`,
      );

      connector.element.dataset.spatialRouteState =
        progress <= 0
          ? "future"
          : progress >= 1
            ? "complete"
            : "drawing";
    }
  }

  private updateWaypoints(focusY: number): void {
    if (this.stops.length === 0) return;

    this.setArrived(0, focusY >= this.stopRecords[0].centerY - window.innerHeight);

    for (let index = 1; index < this.stops.length; index += 1) {
      const connector = this.connectorRecords[index - 1];
      if (!connector) continue;

      const progress = clamp01(
        (focusY - connector.topY) / connector.height,
      );

      this.setArrived(index, progress >= this.arrivalProgress);
    }
  }

  private setArrived(index: number, arrived: boolean): void {
    if (this.arrivedStates[index] === arrived) return;
    this.arrivedStates[index] = arrived;

    const stop = this.stops[index];
    if (!stop) return;

    stop.dataset.spatialArrived = arrived ? "true" : "false";
  }

  private updateCurrentStop(focusY: number): void {
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < this.stopRecords.length; index += 1) {
      const distance = Math.abs(this.stopRecords[index].centerY - focusY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    }

    if (closestIndex === this.lastCurrentIndex) return;

    if (this.lastCurrentIndex >= 0) {
      const previous = this.stops[this.lastCurrentIndex];
      if (previous) previous.dataset.spatialCurrent = "false";
    }

    const current = this.stops[closestIndex];
    if (current) current.dataset.spatialCurrent = "true";

    this.lastCurrentIndex = closestIndex;
  }
}

export function mountHomepageSpatialJourney(
  track: HTMLElement,
  options?: HomepageSpatialJourneyOptions,
): HomepageSpatialJourney {
  return new HomepageSpatialJourney(track, options);
}
