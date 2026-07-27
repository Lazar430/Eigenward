import type { Vec2Tuple } from "../core/types";
import type { MathScene2D } from "../core/MathScene2D";

export interface DraggablePoint2DOptions {
  /** Return the point's current world-coordinate position. */
  getPosition: () => Vec2Tuple;
  /** Called continuously with the pointer's world-coordinate position. */
  onDrag: (position: Vec2Tuple, event: PointerEvent) => void;
  onDragStart?: (position: Vec2Tuple, event: PointerEvent) => void;
  onDragEnd?: (position: Vec2Tuple, event: PointerEvent) => void;
  /** Hit radius in CSS pixels, independent of camera zoom. */
  hitRadiusPixels?: number;
  hoverCursor?: string;
}

interface RegisteredPoint extends Required<
  Pick<DraggablePoint2DOptions, "hitRadiusPixels" | "hoverCursor">
> {
  getPosition: DraggablePoint2DOptions["getPosition"];
  onDrag: DraggablePoint2DOptions["onDrag"];
  onDragStart?: DraggablePoint2DOptions["onDragStart"];
  onDragEnd?: DraggablePoint2DOptions["onDragEnd"];
}

interface ActiveDrag {
  point: RegisteredPoint;
  pointerId: number;
}

/**
 * Scene-level point dragging for mathematical control points.
 *
 * It does not add behavior to vectors or shapes. A point is draggable only
 * after a scene explicitly registers getPosition/onDrag callbacks here.
 */
export class PointDragController2D {
  private readonly points = new Set<RegisteredPoint>();
  private activeDrag: ActiveDrag | null = null;
  private readonly previousTouchAction: string;
  private readonly previousCursor: string;

  constructor(private readonly scene: MathScene2D) {
    const { canvas } = scene;

    this.previousTouchAction = canvas.style.touchAction;
    this.previousCursor = canvas.style.cursor;
    canvas.style.touchAction = "none";

    canvas.addEventListener("pointerdown", this.handlePointerDown);
    canvas.addEventListener("pointermove", this.handlePointerMove);
    canvas.addEventListener("pointerup", this.handlePointerUp);
    canvas.addEventListener("pointercancel", this.handlePointerCancel);
    canvas.addEventListener("pointerleave", this.handlePointerLeave);
    canvas.addEventListener("lostpointercapture", this.handleLostCapture);
  }

  registerPoint(options: DraggablePoint2DOptions): () => void {
    const point: RegisteredPoint = {
      ...options,
      hitRadiusPixels: Math.max(0, options.hitRadiusPixels ?? 20),
      hoverCursor: options.hoverCursor ?? "grab",
    };

    this.points.add(point);

    return () => {
      if (this.activeDrag?.point === point) {
        this.activeDrag = null;
      }
      this.points.delete(point);
      this.updateHoverCursor(null);
    };
  }

  destroy(): void {
    const { canvas } = this.scene;

    canvas.removeEventListener("pointerdown", this.handlePointerDown);
    canvas.removeEventListener("pointermove", this.handlePointerMove);
    canvas.removeEventListener("pointerup", this.handlePointerUp);
    canvas.removeEventListener("pointercancel", this.handlePointerCancel);
    canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    canvas.removeEventListener("lostpointercapture", this.handleLostCapture);

    canvas.style.touchAction = this.previousTouchAction;
    canvas.style.cursor = this.previousCursor;
    this.points.clear();
    this.activeDrag = null;
  }

  private findPoint(clientX: number, clientY: number): RegisteredPoint | null {
    let bestPoint: RegisteredPoint | null = null;
    let bestSquaredDistance = Number.POSITIVE_INFINITY;

    for (const point of this.points) {
      const [pointClientX, pointClientY] = this.scene.worldToClient(
        point.getPosition(),
      );
      const dx = clientX - pointClientX;
      const dy = clientY - pointClientY;
      const squaredDistance = dx * dx + dy * dy;
      const squaredRadius = point.hitRadiusPixels * point.hitRadiusPixels;

      if (
        squaredDistance <= squaredRadius &&
        squaredDistance < bestSquaredDistance
      ) {
        bestPoint = point;
        bestSquaredDistance = squaredDistance;
      }
    }

    return bestPoint;
  }

  private updateHoverCursor(point: RegisteredPoint | null): void {
    this.scene.canvas.style.cursor = point?.hoverCursor ?? this.previousCursor;
  }

  private finishDrag(event: PointerEvent): void {
    const active = this.activeDrag;
    if (!active || active.pointerId !== event.pointerId) return;

    const world = this.scene.clientToWorld(event.clientX, event.clientY);
    active.point.onDragEnd?.(world, event);
    this.activeDrag = null;

    if (this.scene.canvas.hasPointerCapture(event.pointerId)) {
      this.scene.canvas.releasePointerCapture(event.pointerId);
    }

    this.updateHoverCursor(this.findPoint(event.clientX, event.clientY));
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const point = this.findPoint(event.clientX, event.clientY);
    if (!point) return;

    event.preventDefault();
    this.activeDrag = { point, pointerId: event.pointerId };
    this.scene.canvas.setPointerCapture(event.pointerId);
    this.scene.canvas.style.cursor = "grabbing";

    const world = this.scene.clientToWorld(event.clientX, event.clientY);
    point.onDragStart?.(world, event);
    point.onDrag(world, event);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const active = this.activeDrag;

    if (active && active.pointerId === event.pointerId) {
      event.preventDefault();
      const world = this.scene.clientToWorld(event.clientX, event.clientY);
      active.point.onDrag(world, event);
      return;
    }

    this.updateHoverCursor(this.findPoint(event.clientX, event.clientY));
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    this.finishDrag(event);
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    this.finishDrag(event);
  };

  private readonly handlePointerLeave = (): void => {
    if (!this.activeDrag) this.updateHoverCursor(null);
  };

  private readonly handleLostCapture = (event: PointerEvent): void => {
    if (this.activeDrag?.pointerId === event.pointerId) {
      this.activeDrag = null;
      this.updateHoverCursor(null);
    }
  };
}
