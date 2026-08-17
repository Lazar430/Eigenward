import { Group } from "three";
import type { FrameCallback } from "./types";

type FrameRegistrar = (callback: FrameCallback) => () => void;

/**
 * Dimension-independent base for objects exposed by the math-graphics layer.
 *
 * Scenes bind redraw and shared-frame-loop hooks when an object is added. The
 * object itself stays renderer-agnostic and owns only its local Three.js graph.
 */
export abstract class MathObject extends Group {
  private requestRender: () => void = () => {};
  private registerFrameCallback: FrameRegistrar | null = null;

  /** Used internally by MathScene2D / MathScene3D when this object joins a scene. */
  bindSceneHooks(
    requestRender: () => void,
    registerFrameCallback: FrameRegistrar,
  ): this {
    this.requestRender = requestRender;
    this.registerFrameCallback = registerFrameCallback;
    return this;
  }

  /** Notify the owning scene that a visible property changed. */
  protected changed(): this {
    this.requestRender();
    return this;
  }

  /**
   * Register object-specific animation in the owning scene's shared frame loop.
   * This prevents every animated primitive from starting its own RAF loop.
   */
  protected onFrame(callback: FrameCallback): () => void {
    if (!this.registerFrameCallback) {
      throw new Error(
	`${this.name || "This MathObject"} must be added to a math scene before starting an animation.`,
      );
    }

    return this.registerFrameCallback(callback);
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
