import type { EulerOrder } from "three";
import { MathObject } from "./MathObject";

/**
 * Common transform layer for reusable 3D mathematical objects.
 *
 * Geometry stays local to the primitive. Translation, rotation, and scaling are
 * performed on the containing Group, mirroring MathObject2D's authoring model.
 */
export abstract class MathObject3D extends MathObject {
  moveTo(x: number, y: number, z: number): this {
    this.position.set(x, y, z);
    return this.changed();
  }

  moveBy(dx: number, dy: number, dz: number): this {
    this.position.x += dx;
    this.position.y += dy;
    this.position.z += dz;
    return this.changed();
  }

  /** Uniform scale relative to the object's original local geometry. */
  resizeTo(scale: number): this {
    this.scale.set(scale, scale, scale);
    return this.changed();
  }

  /** Multiply the current x/y/z scales by the same factor. */
  resizeBy(factor: number): this {
    this.scale.multiplyScalar(factor);
    return this.changed();
  }

  /** Set independent x/y/z scales. Omitted y/z values default to x. */
  setScale(x: number, y: number = x, z: number = x): this {
    this.scale.set(x, y, z);
    return this.changed();
  }

  /** Set intrinsic Euler rotation in radians. */
  setRotation(
    xRadians: number,
    yRadians: number,
    zRadians: number,
    order: EulerOrder = "XYZ",
  ): this {
    this.rotation.set(xRadians, yRadians, zRadians, order);
    return this.changed();
  }

  /** Increment Euler rotation in radians around the local axes. */
  rotateBy(dxRadians: number, dyRadians: number, dzRadians: number): this {
    this.rotation.x += dxRadians;
    this.rotation.y += dyRadians;
    this.rotation.z += dzRadians;
    return this.changed();
  }
}
