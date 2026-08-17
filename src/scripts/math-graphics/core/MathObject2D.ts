import { MathObject } from "./MathObject";

/**
 * Common base for 2D mathematical objects.
 *
 * Persistent geometry lives in local coordinates; the methods below manipulate
 * the parent Object3D transform so multipart objects behave as one mathematical
 * object without rebuilding GPU buffers.
 */
export abstract class MathObject2D extends MathObject {
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
}
