import type { MathScene2D } from "../core/MathScene2D";
import type { Vec2Tuple } from "../core/types";
import type { FunctionGraph2D } from "../primitives/FunctionGraph2D";

export interface FunctionGraphPointerController2DOptions {
  scene: MathScene2D;
  graph: FunctionGraph2D;
  onPointChange: (point: Vec2Tuple, event: PointerEvent) => void;
  onPointSelect?: (point: Vec2Tuple, event: PointerEvent) => void;
  onPointRelease?: (point: Vec2Tuple, event: PointerEvent) => void;
  hitRadiusPixels?: number;
  hoverCursor?: string;
}

interface ClosestGraphLocation {
  x: number;
  squaredDistance: number;
}

function closestPointParameterOnSegment(
  pointX: number,
  pointY: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): number {
  const dx = endX - startX;
  const dy = endY - startY;
  const squaredLength = dx * dx + dy * dy;

  if (squaredLength <= 1e-12) return 0;

  return Math.min(
    1,
    Math.max(
      0,
      ((pointX - startX) * dx + (pointY - startY) * dy) /
        squaredLength,
    ),
  );
}

/** Desmos-like press-and-drag selection along an explicit graph. */
export class FunctionGraphPointerController2D {
  private readonly scene: MathScene2D;
  private readonly graph: FunctionGraph2D;
  private readonly onPointChange: FunctionGraphPointerController2DOptions["onPointChange"];
  private readonly onPointSelect?: FunctionGraphPointerController2DOptions["onPointSelect"];
  private readonly onPointRelease?: FunctionGraphPointerController2DOptions["onPointRelease"];
  private readonly hitRadiusPixels: number;
  private readonly hoverCursor: string;
  private readonly previousCursor: string;

  private activePointerId: number | null = null;
  private currentPoint: Vec2Tuple | null = null;
  private enabled = true;

  constructor({
    scene,
    graph,
    onPointChange,
    onPointSelect,
    onPointRelease,
    hitRadiusPixels = 14,
    hoverCursor = "crosshair",
  }: FunctionGraphPointerController2DOptions) {
    this.scene = scene;
    this.graph = graph;
    this.onPointChange = onPointChange;
    this.onPointSelect = onPointSelect;
    this.onPointRelease = onPointRelease;
    this.hitRadiusPixels = Math.max(0, hitRadiusPixels);
    this.hoverCursor = hoverCursor;
    this.previousCursor = scene.canvas.style.cursor;

    scene.canvas.addEventListener("pointerdown", this.handlePointerDown);
    scene.canvas.addEventListener("pointermove", this.handlePointerMove);
    scene.canvas.addEventListener("pointerup", this.handlePointerUp);
    scene.canvas.addEventListener("pointercancel", this.handlePointerCancel);
    scene.canvas.addEventListener("pointerleave", this.handlePointerLeave);
    scene.canvas.addEventListener(
      "lostpointercapture",
      this.handleLostPointerCapture,
    );
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;

    if (!enabled) {
      this.activePointerId = null;
      this.currentPoint = null;
      this.scene.canvas.style.cursor = this.previousCursor;
    }

    return this;
  }

  destroy(): void {
    const { canvas } = this.scene;

    canvas.removeEventListener("pointerdown", this.handlePointerDown);
    canvas.removeEventListener("pointermove", this.handlePointerMove);
    canvas.removeEventListener("pointerup", this.handlePointerUp);
    canvas.removeEventListener("pointercancel", this.handlePointerCancel);
    canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    canvas.removeEventListener(
      "lostpointercapture",
      this.handleLostPointerCapture,
    );

    canvas.style.cursor = this.previousCursor;
    this.activePointerId = null;
    this.currentPoint = null;
  }

  private findClosestLocation(
    clientX: number,
    clientY: number,
  ): ClosestGraphLocation | null {
    let best: ClosestGraphLocation | null = null;

    for (const sampledSegment of this.graph.getSampledSegments()) {
      const { points } = sampledSegment;

      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const current = points[index];
        const previousClient = this.scene.worldToClient(previous);
        const currentClient = this.scene.worldToClient(current);

        const t = closestPointParameterOnSegment(
          clientX,
          clientY,
          previousClient[0],
          previousClient[1],
          currentClient[0],
          currentClient[1],
        );

        const closestX =
          previousClient[0] + t * (currentClient[0] - previousClient[0]);
        const closestY =
          previousClient[1] + t * (currentClient[1] - previousClient[1]);
        const dx = clientX - closestX;
        const dy = clientY - closestY;
        const squaredDistance = dx * dx + dy * dy;

        if (!best || squaredDistance < best.squaredDistance) {
          best = {
            x: previous[0] + t * (current[0] - previous[0]),
            squaredDistance,
          };
        }
      }
    }

    if (!best || best.squaredDistance > this.hitRadiusPixels ** 2) {
      return null;
    }

    return best;
  }

  private updatePointAtX(x: number, event: PointerEvent): Vec2Tuple | null {
    const point = this.graph.getNearestPointAtX(x);
    if (!point) return null;

    this.currentPoint = point;
    this.onPointChange(point, event);
    return point;
  }

  private finishInteraction(event: PointerEvent): void {
    if (this.activePointerId !== event.pointerId) return;

    const point = this.currentPoint;
    this.activePointerId = null;
    this.currentPoint = null;

    if (this.scene.canvas.hasPointerCapture(event.pointerId)) {
      this.scene.canvas.releasePointerCapture(event.pointerId);
    }

    if (point) this.onPointRelease?.(point, event);

    const hovered = this.enabled
      ? this.findClosestLocation(event.clientX, event.clientY)
      : null;
    this.scene.canvas.style.cursor = hovered
      ? this.hoverCursor
      : this.previousCursor;
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const closest = this.findClosestLocation(event.clientX, event.clientY);
    if (!closest) return;

    event.preventDefault();
    this.activePointerId = event.pointerId;
    this.scene.canvas.setPointerCapture(event.pointerId);
    this.scene.canvas.style.cursor = "grabbing";

    const point = this.updatePointAtX(closest.x, event);
    if (point) this.onPointSelect?.(point, event);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.enabled) return;

    if (this.activePointerId === event.pointerId) {
      event.preventDefault();
      const world = this.scene.clientToWorld(event.clientX, event.clientY);
      this.updatePointAtX(world[0], event);
      return;
    }

    const hovered = this.findClosestLocation(event.clientX, event.clientY);
    this.scene.canvas.style.cursor = hovered
      ? this.hoverCursor
      : this.previousCursor;
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    this.finishInteraction(event);
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    this.finishInteraction(event);
  };

  private readonly handlePointerLeave = (): void => {
    if (this.activePointerId === null) {
      this.scene.canvas.style.cursor = this.previousCursor;
    }
  };

  private readonly handleLostPointerCapture = (
    event: PointerEvent,
  ): void => {
    if (this.activePointerId !== event.pointerId) return;

    const point = this.currentPoint;
    this.activePointerId = null;
    this.currentPoint = null;
    this.scene.canvas.style.cursor = this.previousCursor;

    if (point) this.onPointRelease?.(point, event);
  };
}
