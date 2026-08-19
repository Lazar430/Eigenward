import type { MathScene2D } from "../core/MathScene2D";
import type { Vec2Tuple } from "../core/types";
import { currentSceneView2D, type SceneView2D } from "../geometry/viewport2D";

export interface PanZoomController2DOptions {
  minimumViewHeight?: number;
  maximumViewHeight?: number;
  wheelSensitivity?: number;
  /** Allow Alt + primary-button dragging to pan. */
  altPrimaryPan?: boolean;
  /** Allow middle-button dragging to pan. */
  middleButtonPan?: boolean;
}

interface ActivePan {
  pointerId: number;
  startClient: Vec2Tuple;
  startView: SceneView2D;
}

/**
 * Lightweight inspection controller for static 2D mathematical diagrams.
 *
 * Wheel zoom is centered on the pointer. Panning uses middle-drag or Alt +
 * primary-drag by default so it does not steal ordinary left-click interactions.
 */
export class PanZoomController2D {
  private readonly minimumViewHeight: number;
  private readonly maximumViewHeight: number;
  private readonly wheelSensitivity: number;
  private readonly altPrimaryPan: boolean;
  private readonly middleButtonPan: boolean;

  private readonly initialView: SceneView2D;
  private activePan: ActivePan | null = null;
  private readonly previousTouchAction: string;

  constructor(
    private readonly scene: MathScene2D,
    {
      minimumViewHeight = 2.2,
      maximumViewHeight = 30,
      wheelSensitivity = 0.0015,
      altPrimaryPan = true,
      middleButtonPan = true,
    }: PanZoomController2DOptions = {},
  ) {
    this.minimumViewHeight = Math.max(0.2, minimumViewHeight);
    this.maximumViewHeight = Math.max(
      this.minimumViewHeight,
      maximumViewHeight,
    );
    this.wheelSensitivity = Math.max(0.0001, wheelSensitivity);
    this.altPrimaryPan = altPrimaryPan;
    this.middleButtonPan = middleButtonPan;
    this.initialView = currentSceneView2D(scene);

    this.previousTouchAction = scene.canvas.style.touchAction;
    scene.canvas.style.touchAction = "none";

    scene.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
    scene.canvas.addEventListener("pointerdown", this.handlePointerDown);
    scene.canvas.addEventListener("pointermove", this.handlePointerMove);
    scene.canvas.addEventListener("pointerup", this.handlePointerUp);
    scene.canvas.addEventListener("pointercancel", this.handlePointerUp);
    scene.canvas.addEventListener("lostpointercapture", this.handleLostCapture);
  }

  resetView(): void {
    this.scene.setView({
      viewHeight: this.initialView.viewHeight,
      center: this.initialView.center,
      unitSizePixels: null,
    });
  }

  destroy(): void {
    const { canvas } = this.scene;

    canvas.removeEventListener("wheel", this.handleWheel);
    canvas.removeEventListener("pointerdown", this.handlePointerDown);
    canvas.removeEventListener("pointermove", this.handlePointerMove);
    canvas.removeEventListener("pointerup", this.handlePointerUp);
    canvas.removeEventListener("pointercancel", this.handlePointerUp);
    canvas.removeEventListener("lostpointercapture", this.handleLostCapture);

    canvas.style.touchAction = this.previousTouchAction;
    this.activePan = null;
  }

  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault();

    const current = currentSceneView2D(this.scene);
    const pointer = this.scene.clientToWorld(event.clientX, event.clientY);

    const zoomFactor = Math.exp(event.deltaY * this.wheelSensitivity);
    const nextHeight = Math.min(
      this.maximumViewHeight,
      Math.max(this.minimumViewHeight, current.viewHeight * zoomFactor),
    );
    const ratio = nextHeight / current.viewHeight;

    const nextCenter: Vec2Tuple = [
      pointer[0] + (current.center[0] - pointer[0]) * ratio,
      pointer[1] + (current.center[1] - pointer[1]) * ratio,
    ];

    this.scene.setView({
      viewHeight: nextHeight,
      center: nextCenter,
      unitSizePixels: null,
    });
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    const middlePan = this.middleButtonPan && event.button === 1;
    const altPrimaryPan =
      this.altPrimaryPan && event.button === 0 && event.altKey;

    if (!middlePan && !altPrimaryPan) return;

    event.preventDefault();

    this.activePan = {
      pointerId: event.pointerId,
      startClient: [event.clientX, event.clientY],
      startView: currentSceneView2D(this.scene),
    };

    this.scene.canvas.setPointerCapture(event.pointerId);
    this.scene.canvas.style.cursor = "grabbing";
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const active = this.activePan;
    if (!active || active.pointerId !== event.pointerId) return;

    event.preventDefault();

    const rectangle = this.scene.canvas.getBoundingClientRect();
    const currentBounds = this.scene.getViewBounds();

    const worldPerPixelX =
      currentBounds.width / Math.max(1, rectangle.width);
    const worldPerPixelY =
      currentBounds.height / Math.max(1, rectangle.height);

    const dx = event.clientX - active.startClient[0];
    const dy = event.clientY - active.startClient[1];

    this.scene.setView({
      viewHeight: active.startView.viewHeight,
      center: [
        active.startView.center[0] - dx * worldPerPixelX,
        active.startView.center[1] + dy * worldPerPixelY,
      ],
      unitSizePixels: null,
    });
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (this.activePan?.pointerId !== event.pointerId) return;

    this.activePan = null;

    if (this.scene.canvas.hasPointerCapture(event.pointerId)) {
      this.scene.canvas.releasePointerCapture(event.pointerId);
    }

    this.scene.canvas.style.cursor = "";
  };

  private readonly handleLostCapture = (event: PointerEvent): void => {
    if (this.activePan?.pointerId === event.pointerId) {
      this.activePan = null;
      this.scene.canvas.style.cursor = "";
    }
  };
}
