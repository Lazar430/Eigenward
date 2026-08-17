import {
  Color,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type ColorRepresentation,
  type Intersection,
} from "three";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { disposeObjectTree } from "./disposeObjectTree";
import { MathObject3D } from "./MathObject3D";
import type { FrameCallback } from "./types";
import type { CameraState3D, Vec3Like, Vec3Tuple } from "./types3D";

export interface MathScene3DOptions {
  cameraPosition?: Vec3Tuple;
  target?: Vec3Tuple;
  fovDegrees?: number;
  near?: number;
  far?: number;
  /** null keeps the WebGL canvas transparent. */
  background?: ColorRepresentation | null;
  maxPixelRatio?: number;
}

function readVec3(value: Vec3Like): Vec3Tuple {
  if ("x" in value) {
    return [value.x, value.y, value.z];
  }

  return [value[0], value[1], value[2]];
}

function assertFiniteVec3(value: Vec3Like, label: string): void {
  const [x, y, z] = readVec3(value);
  if (![x, y, z].every(Number.isFinite)) {
    throw new RangeError(`${label} must contain three finite numbers.`);
  }
}

function copyTuple(value: Vec3Like): Vec3Tuple {
  const [x, y, z] = readVec3(value);
  return [x, y, z];
}

/**
 * Responsive perspective 3D scene with one shared on-demand frame loop.
 *
 * The lifecycle deliberately mirrors MathScene2D: one renderer, one CSS label
 * layer, centralized resize/visibility handling, invalidation, shared animation,
 * and deterministic teardown. Interaction helpers can use the public canvas,
 * camera, coordinate projection, and raycast methods without owning rendering.
 */
export class MathScene3D {
  readonly threeScene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  readonly labelRenderer: CSS2DRenderer;

  private readonly resizeObserver: ResizeObserver;
  private readonly intersectionObserver: IntersectionObserver;
  private readonly frameCallbacks = new Set<FrameCallback>();
  private readonly labelContainer: HTMLElement;
  private readonly previousContainerPosition: string;
  private readonly changedContainerPosition: boolean;
  private readonly raycaster = new Raycaster();
  private readonly pointerNdc = new Vector2();

  private target: Vec3Tuple;
  private maxPixelRatio: number;

  private animationFrame = 0;
  private previousTime = 0;
  private canvasVisible = true;
  private disposed = false;

  constructor(
    /** Public so reusable interaction helpers can attach pointer listeners. */
    readonly canvas: HTMLCanvasElement,
    options: MathScene3DOptions = {},
  ) {
    const cameraPosition = options.cameraPosition ?? [4.5, 3.2, 6.5];
    const target = options.target ?? [0, 0, 0];
    const fovDegrees = options.fovDegrees ?? 42;
    const near = options.near ?? 0.05;
    const far = options.far ?? 1000;

    assertFiniteVec3(cameraPosition, "cameraPosition");
    assertFiniteVec3(target, "target");

    if (!(fovDegrees > 0 && fovDegrees < 180)) {
      throw new RangeError("fovDegrees must be between 0 and 180 degrees.");
    }
    if (!(near > 0)) {
      throw new RangeError("near must be greater than zero.");
    }
    if (!(far > near)) {
      throw new RangeError("far must be greater than near.");
    }

    this.target = copyTuple(target);
    this.maxPixelRatio = options.maxPixelRatio ?? 2;

    if (!(this.maxPixelRatio > 0)) {
      throw new RangeError("maxPixelRatio must be greater than zero.");
    }

    const container = canvas.parentElement;
    if (!container) {
      throw new Error(
        "MathScene3D requires the canvas to have a positioned parent element.",
      );
    }

    this.labelContainer = container;
    this.previousContainerPosition = container.style.position;
    this.changedContainerPosition =
      window.getComputedStyle(container).position === "static";

    if (this.changedContainerPosition) {
      container.style.position = "relative";
    }

    this.camera = new PerspectiveCamera(fovDegrees, 1, near, far);
    this.camera.position.set(...cameraPosition);
    this.camera.lookAt(...this.target);
    this.threeScene.add(this.camera);

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = SRGBColorSpace;

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = "math-scene-3d-label-layer";
    this.labelRenderer.domElement.setAttribute("aria-hidden", "true");
    Object.assign(this.labelRenderer.domElement.style, {
      position: "absolute",
      inset: "0",
      overflow: "hidden",
      pointerEvents: "none",
      userSelect: "none",
    });
    container.appendChild(this.labelRenderer.domElement);

    if (options.background == null) {
      this.renderer.setClearColor(0x000000, 0);
    } else {
      this.renderer.setClearColor(new Color(options.background), 1);
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);

    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.canvasVisible = entry?.isIntersecting ?? true;

        if (this.canvasVisible) {
          this.invalidate();
        } else {
          this.cancelFrame();
        }
      },
      { threshold: 0.01 },
    );
    this.intersectionObserver.observe(canvas);

    document.addEventListener("visibilitychange", this.handleVisibility);
    this.resize();
  }

  add(...objects: Object3D[]): this {
    for (const object of objects) {
      object.traverse((child) => {
        if (child instanceof MathObject3D) {
          child.bindSceneHooks(
            () => this.invalidate(),
            (callback: FrameCallback) => this.onFrame(callback),
          );
        }
      });

      this.threeScene.add(object);
    }

    this.invalidate();
    return this;
  }

  remove(...objects: Object3D[]): this {
    this.threeScene.remove(...objects);
    this.invalidate();
    return this;
  }

  setBackground(color: ColorRepresentation | null): this {
    if (color === null) {
      this.renderer.setClearColor(0x000000, 0);
    } else {
      this.renderer.setClearColor(new Color(color), 1);
    }

    this.invalidate();
    return this;
  }

  setCamera(options: {
    position?: Vec3Like;
    target?: Vec3Like;
    fovDegrees?: number;
    near?: number;
    far?: number;
  }): this {
    const nextNear = options.near ?? this.camera.near;
    const nextFar = options.far ?? this.camera.far;
    const nextFov = options.fovDegrees ?? this.camera.fov;

    if (!(nextFov > 0 && nextFov < 180)) {
      throw new RangeError("fovDegrees must be between 0 and 180 degrees.");
    }
    if (!(nextNear > 0)) {
      throw new RangeError("near must be greater than zero.");
    }
    if (!(nextFar > nextNear)) {
      throw new RangeError("far must be greater than near.");
    }

    if (options.position !== undefined) {
      assertFiniteVec3(options.position, "camera position");
      const [x, y, z] = readVec3(options.position);
      this.camera.position.set(x, y, z);
    }

    if (options.target !== undefined) {
      assertFiniteVec3(options.target, "camera target");
      this.target = copyTuple(options.target);
    }

    this.camera.fov = nextFov;
    this.camera.near = nextNear;
    this.camera.far = nextFar;
    this.camera.lookAt(...this.target);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.invalidate();
    return this;
  }

  getCameraState(): CameraState3D {
    return {
      position: [
        this.camera.position.x,
        this.camera.position.y,
        this.camera.position.z,
      ],
      target: [...this.target] as Vec3Tuple,
      fovDegrees: this.camera.fov,
      near: this.camera.near,
      far: this.camera.far,
    };
  }

  /** Convert browser client coordinates to normalized device coordinates. */
  clientToNDC(clientX: number, clientY: number): readonly [number, number] {
    const rectangle = this.canvas.getBoundingClientRect();

    if (rectangle.width <= 0 || rectangle.height <= 0) {
      return [0, 0];
    }

    return [
      ((clientX - rectangle.left) / rectangle.width) * 2 - 1,
      -((clientY - rectangle.top) / rectangle.height) * 2 + 1,
    ];
  }

  /** Convert a 3D world point to browser client coordinates. */
  worldToClient(point: Vec3Like): readonly [number, number] {
    const rectangle = this.canvas.getBoundingClientRect();
    const [x, y, z] = readVec3(point);

    this.camera.updateMatrixWorld();
    const projected = new Vector3(x, y, z).project(this.camera);

    return [
      rectangle.left + ((projected.x + 1) / 2) * rectangle.width,
      rectangle.top + ((1 - projected.y) / 2) * rectangle.height,
    ];
  }

  /**
   * Raycast from a browser pointer position through the perspective camera.
   * Reusable interaction controllers can build picking/dragging on top of this.
   */
  raycastFromClient(
    clientX: number,
    clientY: number,
    objects: readonly Object3D[],
    recursive = true,
  ): Intersection<Object3D>[] {
    const [x, y] = this.clientToNDC(clientX, clientY);
    this.pointerNdc.set(x, y);
    this.camera.updateMatrixWorld();
    this.threeScene.updateMatrixWorld(true);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    return this.raycaster.intersectObjects([...objects], recursive);
  }

  /** Explicit redraw request for direct Three.js property changes. */
  invalidate(): void {
    this.requestFrame();
  }

  onFrame(callback: FrameCallback): () => void {
    this.frameCallbacks.add(callback);
    this.requestFrame();

    return () => {
      this.frameCallbacks.delete(callback);
      if (this.frameCallbacks.size === 0) this.previousTime = 0;
    };
  }

  destroy(): void {
    if (this.disposed) return;

    this.disposed = true;
    this.cancelFrame();
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.frameCallbacks.clear();

    disposeObjectTree(this.threeScene);
    this.renderer.dispose();
    this.labelRenderer.domElement.remove();

    if (this.changedContainerPosition) {
      this.labelContainer.style.position = this.previousContainerPosition;
    }
  }

  private readonly handleVisibility = (): void => {
    if (document.hidden) this.cancelFrame();
    else this.invalidate();
  };

  private resize(): void {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;

    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, this.maxPixelRatio),
    );
    this.renderer.setSize(width, height, false);
    this.labelRenderer.setSize(width, height);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  private requestFrame(): void {
    if (
      this.disposed ||
	this.animationFrame !== 0 ||
	!this.canvasVisible ||
	document.hidden
    ) {
      return;
    }

    this.animationFrame = requestAnimationFrame(this.renderFrame);
  }

  private cancelFrame(): void {
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
    this.previousTime = 0;
  }

  private readonly renderFrame = (time: number): void => {
    this.animationFrame = 0;

    if (this.disposed || !this.canvasVisible || document.hidden) return;

    const deltaTime =
      this.previousTime === 0
        ? 0
        : Math.min((time - this.previousTime) / 1000, 0.1);

    this.previousTime = time;

    for (const callback of this.frameCallbacks) {
      callback({ time, deltaTime });
    }

    this.renderer.render(this.threeScene, this.camera);
    this.labelRenderer.render(this.threeScene, this.camera);

    if (this.frameCallbacks.size > 0) this.requestFrame();
    else this.previousTime = 0;
  };
}

export function createMathScene3D(
  canvas: HTMLCanvasElement,
  options?: MathScene3DOptions,
): MathScene3D {
  return new MathScene3D(canvas, options);
}
