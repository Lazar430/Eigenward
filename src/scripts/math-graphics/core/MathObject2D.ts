import { Group } from "three";
import type { FrameCallback } from "./types";

type FrameRegistrar = (callback: FrameCallback) => () => void;

/**
 * Common base for objects exposed by the math-graphics layer.
 *
 * Each object owns persistent geometry in local coordinates. These methods
 * alter the parent Object3D transform instead of rebuilding vertices, so a
 * complicated multipart object can later be manipulated exactly like a circle.
 */
export abstract class MathObject2D extends Group {
  private requestRender: () => void = () => {};
  private registerFrameCallback: FrameRegistrar | null = null;

  /** Used internally by MathScene2D when this object joins a scene. */
  bindSceneHooks(
    requestRender: () => void,
    registerFrameCallback: FrameRegistrar,
  ): this {
    this.requestRender = requestRender;
    this.registerFrameCallback = registerFrameCallback;
    return this;
  }

  protected changed(): this {
    this.requestRender();
    return this;
  }

  /**
   * Register object-specific animation in the scene's shared frame loop.
   * Keeping one loop per scene avoids spawning one requestAnimationFrame loop
   * for every independently animated shape.
   */
  protected onFrame(callback: FrameCallback): () => void {
    if (!this.registerFrameCallback) {
      throw new Error(
        `${this.name || "This MathObject2D"} must be added to a MathScene2D before starting an animation.`,
      );
    }

    return this.registerFrameCallback(callback);
  }

  moveTo(x: number, y: number): this {
    this.position.set(x, y, this.position.z);
    return this.changed();
  }

  moveBy(dx: number, dy: number): this {
    this.position.x += dx;
    this.position.y += dy;
    return this.changed();
  }

  /** Uniform scale relative to the object's original local geometry. */
  resizeTo(scale: number): this {
    this.scale.set(scale, scale, 1);
    return this.changed();
  }

  /** Multiply the current width and height by the same factor. */
  resizeBy(factor: number): this {
    this.scale.x *= factor;
    this.scale.y *= factor;
    return this.changed();
  }

  /** Set horizontal and vertical scales independently. */
  setScale(x: number, y: number = x): this {
    this.scale.set(x, y, 1);
    return this.changed();
  }

  setRotation(angleRadians: number): this {
    this.rotation.z = angleRadians;
    return this.changed();
  }

  rotateBy(angleRadians: number): this {
    this.rotation.z += angleRadians;
    return this.changed();
  }

  show(): this {
    this.visible = true;
    return this.changed();
  }

  hide(): this {
    this.visible = false;
    return this.changed();
  }

  abstract dispose(): void;
}
