import { Spherical, Vector3 } from "three";
import type { MathScene3D } from "../core/MathScene3D";
import type { Vec3Like, Vec3Tuple } from "../core/types3D";

export type OrbitRotationMode3D =
  | "trackball"
  | "orbit";

export interface OrbitController3DOptions {
  target?: Vec3Like;
  enabled?: boolean;
  enableRotate?: boolean;
  enableZoom?: boolean;
  rotationSpeed?: number;
  zoomSpeed?: number;
  minDistance?: number;
  maxDistance?: number;

  /**
   * Only used by the legacy "orbit" rotation mode.
   * Trackball mode has no polar-angle singularity or vertical clamp.
   */
  minPolarAngle?: number;
  maxPolarAngle?: number;

  /**
   * "trackball" is now the default.
   *
   * trackball:
   *   - horizontal drag rotates around the camera's current up axis
   *   - vertical drag rotates around the camera's current right axis
   *   - the camera can pass continuously over either pole
   *   - repeated drags can turn the view fully front-to-back
   *
   * orbit:
   *   - preserves the old spherical / turntable behavior
   *   - vertical motion is restricted by minPolarAngle / maxPolarAngle
   */
  rotationMode?: OrbitRotationMode3D;

  cursor?: string;
}

export interface OrbitState3D {
  target: Vec3Tuple;
  radius: number;
  polarAngle: number;
  azimuthAngle: number;

  /**
   * Needed to restore the complete trackball orientation, including the
   * camera's accumulated up direction after crossing a pole.
   */
  cameraUp?: Vec3Tuple;
}

interface PointerPosition {
  x: number;
  y: number;
}

function readVec3(value: Vec3Like): Vec3Tuple {
  if ("x" in value) return [value.x, value.y, value.z];
  return [value[0], value[1], value[2]];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Scene-level perspective camera controller with mouse, touch, wheel, and pinch.
 *
 * The default rotation mode is a free trackball-style orbit. Unlike the old
 * spherical-only implementation, it has no north/south-pole barrier: dragging
 * vertically can carry the camera continuously over the top or bottom of the
 * object and all the way around to the opposite side.
 *
 * It still never owns a render loop. Every camera change flows through
 * MathScene3D, preserving the engine's invalidate/on-demand rendering model.
 */
export class OrbitController3D {
  private readonly target = new Vector3();

  /** Current camera offset from target. This is the real rotation state. */
  private readonly offset = new Vector3();

  /**
   * Camera up direction carried along by trackball rotations. Keeping this
   * vector dynamic is what removes the old pole singularity.
   */
  private readonly cameraUp = new Vector3(0, 1, 0);

  /**
   * Kept for backwards-compatible state reporting and the legacy orbit mode.
   */
  private readonly spherical = new Spherical();

  private readonly pointers = new Map<number, PointerPosition>();
  private readonly previousTouchAction: string;
  private readonly previousCursor: string;

  private enabled: boolean;
  private readonly enableRotate: boolean;
  private readonly enableZoom: boolean;
  private readonly rotationSpeed: number;
  private readonly zoomSpeed: number;
  private readonly minDistance: number;
  private readonly maxDistance: number;
  private readonly minPolarAngle: number;
  private readonly maxPolarAngle: number;
  private readonly rotationMode: OrbitRotationMode3D;
  private readonly idleCursor: string;

  private lastPinchDistance: number | null = null;

  constructor(
    private readonly scene: MathScene3D,
    options: OrbitController3DOptions = {},
  ) {
    const state = scene.getCameraState();
    const target = readVec3(options.target ?? state.target);

    this.target.set(...target);
    this.enabled = options.enabled ?? true;
    this.enableRotate = options.enableRotate ?? true;
    this.enableZoom = options.enableZoom ?? true;
    this.rotationSpeed = Math.max(0, options.rotationSpeed ?? 0.0062);
    this.zoomSpeed = Math.max(0, options.zoomSpeed ?? 1);
    this.minDistance = Math.max(1e-4, options.minDistance ?? 1.25);
    this.maxDistance = Math.max(
      this.minDistance,
      options.maxDistance ?? 40,
    );

    this.minPolarAngle = clamp(
      options.minPolarAngle ?? 0.05,
      0,
      Math.PI,
    );

    this.maxPolarAngle = clamp(
      options.maxPolarAngle ?? Math.PI - 0.05,
      this.minPolarAngle,
      Math.PI,
    );

    this.rotationMode = options.rotationMode ?? "trackball";
    this.idleCursor = options.cursor ?? "grab";

    this.previousTouchAction = scene.canvas.style.touchAction;
    this.previousCursor = scene.canvas.style.cursor;

    scene.canvas.style.touchAction = "none";
    scene.canvas.style.cursor = this.enabled
      ? this.idleCursor
      : this.previousCursor;

    this.syncFromScene();

    scene.canvas.addEventListener("pointerdown", this.handlePointerDown);
    scene.canvas.addEventListener("pointermove", this.handlePointerMove);
    scene.canvas.addEventListener("pointerup", this.handlePointerUp);
    scene.canvas.addEventListener("pointercancel", this.handlePointerCancel);
    scene.canvas.addEventListener("lostpointercapture", this.handleLostCapture);
    scene.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  getState(): OrbitState3D {
    this.syncSphericalFromOffset();

    return {
      target: [this.target.x, this.target.y, this.target.z],
      radius: this.offset.length(),
      polarAngle: this.spherical.phi,
      azimuthAngle: this.spherical.theta,
      cameraUp: [this.cameraUp.x, this.cameraUp.y, this.cameraUp.z],
    };
  }

  setState(state: Partial<OrbitState3D>): this {
    if (state.target !== undefined) {
      this.target.set(...state.target);
    }

    if (state.cameraUp !== undefined) {
      this.cameraUp.set(...state.cameraUp);

      if (this.cameraUp.lengthSq() <= 1e-12) {
        this.cameraUp.set(0, 1, 0);
      } else {
        this.cameraUp.normalize();
      }
    }

    this.syncSphericalFromOffset();

    if (state.radius !== undefined) {
      this.spherical.radius = clamp(
        state.radius,
        this.minDistance,
        this.maxDistance,
      );
    }

    if (state.polarAngle !== undefined) {
      this.spherical.phi = clamp(
        state.polarAngle,
        0,
        Math.PI,
      );
    }

    if (state.azimuthAngle !== undefined) {
      this.spherical.theta = state.azimuthAngle;
    }

    if (
      state.radius !== undefined ||
	state.polarAngle !== undefined ||
	state.azimuthAngle !== undefined
    ) {
      this.spherical.makeSafe();
      this.offset.setFromSpherical(this.spherical);
    }

    this.clampOffsetDistance();
    this.makeUpOrthogonalToView();
    this.applyCamera();

    return this;
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.pointers.clear();
    this.lastPinchDistance = null;

    this.scene.canvas.style.cursor = enabled
      ? this.idleCursor
      : this.previousCursor;

    return this;
  }

  setTarget(target: Vec3Like): this {
    this.target.set(...readVec3(target));
    this.applyCamera();
    return this;
  }

  /**
   * Programmatic rotation.
   *
   * In trackball mode these values mean:
   *   deltaAzimuthRadians -> rotate around current camera up
   *   deltaPolarRadians   -> rotate around current camera right
   *
   * That gives the same intuitive horizontal/vertical controls while removing
   * the old vertical pole clamp.
   */
  orbitBy(
    deltaAzimuthRadians: number,
    deltaPolarRadians: number,
  ): this {
    if (
      !Number.isFinite(deltaAzimuthRadians) ||
	!Number.isFinite(deltaPolarRadians)
    ) {
      throw new RangeError("Orbit deltas must be finite.");
    }

    if (this.rotationMode === "trackball") {
      return this.trackballRotateBy(
        deltaAzimuthRadians,
        deltaPolarRadians,
      );
    }

    this.syncSphericalFromOffset();
    this.spherical.theta += deltaAzimuthRadians;
    this.spherical.phi = clamp(
      this.spherical.phi + deltaPolarRadians,
      this.minPolarAngle,
      this.maxPolarAngle,
    );
    this.spherical.makeSafe();
    this.offset.setFromSpherical(this.spherical);

    /* Legacy orbit mode uses the world's +Y direction as camera up. */
    this.cameraUp.set(0, 1, 0);

    this.applyCamera();
    return this;
  }

  /** Scale camera distance: factor < 1 zooms in, factor > 1 zooms out. */
  dollyBy(factor: number): this {
    if (!(factor > 0) || !Number.isFinite(factor)) {
      throw new RangeError(
        "Orbit dolly factor must be positive and finite.",
      );
    }

    const radius = clamp(
      this.offset.length() * factor,
      this.minDistance,
      this.maxDistance,
    );

    if (this.offset.lengthSq() <= 1e-12) {
      this.offset.set(0, 0, radius);
    } else {
      this.offset.setLength(radius);
    }

    this.applyCamera();
    return this;
  }

  /** Re-read camera position and orientation while preserving our target. */
  syncFromScene(): this {
    this.offset
      .copy(this.scene.camera.position)
      .sub(this.target);

    if (this.offset.lengthSq() <= 1e-12) {
      this.offset.set(0, 0, this.minDistance);
    }

    this.clampOffsetDistance();

    this.cameraUp.copy(this.scene.camera.up);
    if (this.cameraUp.lengthSq() <= 1e-12) {
      this.cameraUp.set(0, 1, 0);
    } else {
      this.cameraUp.normalize();
    }

    this.makeUpOrthogonalToView();
    this.syncSphericalFromOffset();
    this.applyCamera();

    return this;
  }

  destroy(): void {
    const { canvas } = this.scene;

    canvas.removeEventListener("pointerdown", this.handlePointerDown);
    canvas.removeEventListener("pointermove", this.handlePointerMove);
    canvas.removeEventListener("pointerup", this.handlePointerUp);
    canvas.removeEventListener("pointercancel", this.handlePointerCancel);
    canvas.removeEventListener("lostpointercapture", this.handleLostCapture);
    canvas.removeEventListener("wheel", this.handleWheel);

    for (const pointerId of this.pointers.keys()) {
      if (canvas.hasPointerCapture(pointerId)) {
        canvas.releasePointerCapture(pointerId);
      }
    }

    this.pointers.clear();
    this.lastPinchDistance = null;
    canvas.style.touchAction = this.previousTouchAction;
    canvas.style.cursor = this.previousCursor;
  }

  /**
   * Free trackball-style rotation with no polar singularity.
   *
   * The camera offset and its up vector are rotated together. This is the key
   * difference from spherical turntable controls: after passing over the top of
   * the object, the camera does not hit a clamp or snap back.
   */
  private trackballRotateBy(
    deltaHorizontal: number,
    deltaVertical: number,
  ): this {
    if (this.offset.lengthSq() <= 1e-12) {
      return this;
    }

    /* Horizontal drag: yaw around the camera's CURRENT up direction. */
    if (Math.abs(deltaHorizontal) > 1e-15) {
      const yawAxis = this.cameraUp.clone().normalize();
      this.offset.applyAxisAngle(yawAxis, deltaHorizontal);
    }

    /*
     * Vertical drag: pitch around the camera's CURRENT right direction.
     *
     * right = forward x up
     * forward points from camera toward target, i.e. -offset.
     */
    if (Math.abs(deltaVertical) > 1e-15) {
      const forward = this.offset.clone().negate().normalize();
      let right = new Vector3().crossVectors(forward, this.cameraUp);

      /*
       * Numerical fallback for the extremely unlikely case that up and forward
       * have become almost parallel.
       */
      if (right.lengthSq() <= 1e-12) {
        right = new Vector3(1, 0, 0)
          .applyQuaternion(this.scene.camera.quaternion)
          .normalize();
      } else {
        right.normalize();
      }

      this.offset.applyAxisAngle(right, deltaVertical);
      this.cameraUp.applyAxisAngle(right, deltaVertical).normalize();
    }

    this.makeUpOrthogonalToView();
    this.syncSphericalFromOffset();
    this.applyCamera();

    return this;
  }

  /**
   * Keep camera.up perpendicular to the viewing direction so lookAt() remains
   * stable even after many complete flips around the object.
   */
  private makeUpOrthogonalToView(): void {
    if (this.offset.lengthSq() <= 1e-12) return;

    const forward = this.offset.clone().negate().normalize();

    this.cameraUp.addScaledVector(
      forward,
      -this.cameraUp.dot(forward),
    );

    if (this.cameraUp.lengthSq() <= 1e-12) {
      const fallbackRight = new Vector3(1, 0, 0)
        .applyQuaternion(this.scene.camera.quaternion)
        .normalize();

      this.cameraUp
        .crossVectors(fallbackRight, forward)
        .normalize();
    } else {
      this.cameraUp.normalize();
    }
  }

  private syncSphericalFromOffset(): void {
    this.spherical.setFromVector3(this.offset);
  }

  private clampOffsetDistance(): void {
    const radius = clamp(
      this.offset.length(),
      this.minDistance,
      this.maxDistance,
    );

    if (this.offset.lengthSq() <= 1e-12) {
      this.offset.set(0, 0, radius);
    } else {
      this.offset.setLength(radius);
    }
  }

  private applyCamera(): void {
    const position = this.target.clone().add(this.offset);

    /*
     * MathScene3D.setCamera() calls camera.lookAt(). Supplying our carried up
     * direction first makes that lookAt fully trackball-aware.
     */
    this.scene.camera.up.copy(this.cameraUp);

    this.scene.setCamera({
      position: [position.x, position.y, position.z],
      target: [this.target.x, this.target.y, this.target.z],
    });
  }

  private getPinchDistance(): number | null {
    if (this.pointers.size < 2) return null;

    const [first, second] = Array.from(this.pointers.values()).slice(0, 2);

    return Math.hypot(
      second.x - first.x,
      second.y - first.y,
    );
  }

  private finishPointer(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);

    if (this.scene.canvas.hasPointerCapture(event.pointerId)) {
      this.scene.canvas.releasePointerCapture(event.pointerId);
    }

    this.lastPinchDistance = this.getPinchDistance();

    if (this.pointers.size === 0) {
      this.scene.canvas.style.cursor = this.enabled
        ? this.idleCursor
        : this.previousCursor;
    }
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.preventDefault();

    this.pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    this.scene.canvas.setPointerCapture(event.pointerId);
    this.scene.canvas.style.cursor = "grabbing";
    this.lastPinchDistance = this.getPinchDistance();
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.enabled) return;

    const previous = this.pointers.get(event.pointerId);
    if (!previous) return;

    event.preventDefault();

    const next = {
      x: event.clientX,
      y: event.clientY,
    };

    if (this.pointers.size === 1 && this.enableRotate) {
      const dx = next.x - previous.x;
      const dy = next.y - previous.y;

      this.pointers.set(event.pointerId, next);

      this.orbitBy(
        -dx * this.rotationSpeed,
        -dy * this.rotationSpeed,
      );

      return;
    }

    this.pointers.set(event.pointerId, next);

    if (this.pointers.size >= 2 && this.enableZoom) {
      const distance = this.getPinchDistance();

      if (
        distance !== null &&
          distance > 0 &&
          this.lastPinchDistance !== null &&
          this.lastPinchDistance > 0
      ) {
        this.dollyBy(
          this.lastPinchDistance / distance,
        );
      }

      this.lastPinchDistance = distance;
    }
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    this.finishPointer(event);
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    this.finishPointer(event);
  };

  private readonly handleLostCapture = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId);
    this.lastPinchDistance = this.getPinchDistance();
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    if (!this.enabled || !this.enableZoom) return;

    event.preventDefault();

    const factor = Math.exp(
      event.deltaY * 0.0015 * this.zoomSpeed,
    );

    this.dollyBy(factor);
  };
}
