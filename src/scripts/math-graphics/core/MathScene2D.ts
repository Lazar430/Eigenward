import {
  Color,
  Object3D,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type ColorRepresentation,
} from "three";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { MathObject2D } from "./MathObject2D";
import type {
  DisposableObject3D,
  FrameCallback,
  Vec2Tuple,
} from "./types";

export interface ViewBounds2D {
  left: number;
  right: number;
  bottom: number;
  top: number;
  width: number;
  height: number;
}

export type ViewChangeCallback2D = (bounds: ViewBounds2D) => void;

export interface MathScene2DOptions {
  /**
   * Vertical world extent. Retained for compatibility with existing scenes.
   * Ignored when unitSizePixels is supplied.
   */
  viewHeight?: number;
  /**
   * CSS pixels occupied by one mathematical unit. This makes the visible
   * world adapt automatically to the canvas size.
   */
  unitSizePixels?: number;
  /** Point placed at the center of the canvas. */
  center?: Vec2Tuple;
  /** null keeps the WebGL canvas transparent. */
  background?: ColorRepresentation | null;
  maxPixelRatio?: number;
}

function disposeSceneGraph(root: Object3D): void {
  const disposed = new Set<DisposableObject3D>();

  root.traverse((object) => {
    const disposable = object as DisposableObject3D;

    if (disposable.dispose && !disposed.has(disposable)) {
      disposable.dispose();
      disposed.add(disposable);
    }
  });
}

/** Responsive orthographic 2D scene with one shared on-demand frame loop. */
export class MathScene2D {
  readonly threeScene = new Scene();
  readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 100);
  readonly renderer: WebGLRenderer;
  readonly labelRenderer: CSS2DRenderer;

  private readonly resizeObserver: ResizeObserver;
  private readonly intersectionObserver: IntersectionObserver;
  private readonly frameCallbacks = new Set<FrameCallback>();
  private readonly viewChangeCallbacks = new Set<ViewChangeCallback2D>();
  private readonly labelContainer: HTMLElement;
  private readonly previousContainerPosition: string;
  private readonly changedContainerPosition: boolean;

  private viewHeight: number;
  private unitSizePixels: number | null;
  private center: Vec2Tuple;
  private maxPixelRatio: number;

  private animationFrame = 0;
  private previousTime = 0;
  private canvasVisible = true;
  private disposed = false;

  constructor(
    /** Public so reusable interaction helpers can attach pointer listeners. */
    readonly canvas: HTMLCanvasElement,
    options: MathScene2DOptions = {},
  ) {
    this.viewHeight = options.viewHeight ?? 6;
    this.unitSizePixels = options.unitSizePixels ?? null;
    this.center = options.center ?? [0, 0];
    this.maxPixelRatio = options.maxPixelRatio ?? 2;

    if (!(this.viewHeight > 0)) {
      throw new RangeError("viewHeight must be greater than zero.");
    }

    if (
      this.unitSizePixels !== null &&
      !(this.unitSizePixels > 0)
    ) {
      throw new RangeError("unitSizePixels must be greater than zero.");
    }

    if (!(this.maxPixelRatio > 0)) {
      throw new RangeError("maxPixelRatio must be greater than zero.");
    }

    const container = canvas.parentElement;
    if (!container) {
      throw new Error(
        "MathScene2D requires the canvas to have a positioned parent element.",
      );
    }

    this.labelContainer = container;
    this.previousContainerPosition = container.style.position;
    this.changedContainerPosition =
      window.getComputedStyle(container).position === "static";

    if (this.changedContainerPosition) {
      container.style.position = "relative";
    }

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = SRGBColorSpace;

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = "math-scene-2d-label-layer";
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

    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);
    this.threeScene.add(this.camera);

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
        if (child instanceof MathObject2D) {
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

  setView(options: {
    viewHeight?: number;
    unitSizePixels?: number | null;
    center?: Vec2Tuple;
  }): this {
    if (options.viewHeight !== undefined) {
      if (!(options.viewHeight > 0)) {
        throw new RangeError("viewHeight must be greater than zero.");
      }
      this.viewHeight = options.viewHeight;

      // Supplying viewHeight without an explicit unit scale selects the
      // original fixed-height camera mode.
      if (options.unitSizePixels === undefined) {
        this.unitSizePixels = null;
      }
    }

    if (options.unitSizePixels !== undefined) {
      if (
        options.unitSizePixels !== null &&
        !(options.unitSizePixels > 0)
      ) {
        throw new RangeError("unitSizePixels must be greater than zero.");
      }
      this.unitSizePixels = options.unitSizePixels;
    }

    if (options.center !== undefined) {
      this.center = options.center;
    }

    this.resizeCamera();
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

  /**
   * Current visible mathematical rectangle. Positive padding moves each edge
   * inward; negative padding gives an overscan rectangle.
   */
  getViewBounds(paddingPixels = 0): ViewBounds2D {
    const rectangle = this.canvas.getBoundingClientRect();
    const widthPixels = Math.max(1, rectangle.width);
    const heightPixels = Math.max(1, rectangle.height);
    const worldPerPixelX = (this.camera.right - this.camera.left) / widthPixels;
    const worldPerPixelY = (this.camera.top - this.camera.bottom) / heightPixels;

    let left = this.camera.left + paddingPixels * worldPerPixelX;
    let right = this.camera.right - paddingPixels * worldPerPixelX;
    let bottom = this.camera.bottom + paddingPixels * worldPerPixelY;
    let top = this.camera.top - paddingPixels * worldPerPixelY;

    if (left > right) {
      const centerX = (this.camera.left + this.camera.right) / 2;
      left = centerX;
      right = centerX;
    }

    if (bottom > top) {
      const centerY = (this.camera.bottom + this.camera.top) / 2;
      bottom = centerY;
      top = centerY;
    }

    return {
      left,
      right,
      bottom,
      top,
      width: right - left,
      height: top - bottom,
    };
  }

  /** Run whenever resizing or setView changes the visible world rectangle. */
  onViewChange(
    callback: ViewChangeCallback2D,
    fireImmediately = true,
  ): () => void {
    this.viewChangeCallbacks.add(callback);

    if (fireImmediately) {
      callback(this.getViewBounds());
    }

    return () => {
      this.viewChangeCallbacks.delete(callback);
    };
  }

  /** Convert browser client coordinates to the z = worldZ math plane. */
  clientToWorld(
    clientX: number,
    clientY: number,
    worldZ = 0,
  ): Vec2Tuple {
    const rectangle = this.canvas.getBoundingClientRect();

    if (rectangle.width <= 0 || rectangle.height <= 0) {
      return [0, 0];
    }

    const ndcX = ((clientX - rectangle.left) / rectangle.width) * 2 - 1;
    const ndcY = -((clientY - rectangle.top) / rectangle.height) * 2 + 1;

    this.camera.updateMatrixWorld();
    const near = new Vector3(ndcX, ndcY, -1).unproject(this.camera);
    const far = new Vector3(ndcX, ndcY, 1).unproject(this.camera);
    const dz = far.z - near.z;

    if (Math.abs(dz) < 1e-12) {
      return [near.x, near.y];
    }

    const interpolation = (worldZ - near.z) / dz;
    return [
      near.x + interpolation * (far.x - near.x),
      near.y + interpolation * (far.y - near.y),
    ];
  }

  /** Convert a mathematical point to browser client coordinates. */
  worldToClient(point: Vec2Tuple, worldZ = 0): Vec2Tuple {
    const rectangle = this.canvas.getBoundingClientRect();
    this.camera.updateMatrixWorld();

    const projected = new Vector3(point[0], point[1], worldZ).project(
      this.camera,
    );

    return [
      rectangle.left + ((projected.x + 1) / 2) * rectangle.width,
      rectangle.top + ((1 - projected.y) / 2) * rectangle.height,
    ];
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
    this.viewChangeCallbacks.clear();

    disposeSceneGraph(this.threeScene);
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
    this.resizeCamera();
    this.invalidate();
  }

  private resizeCamera(): void {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;

    let halfWidth: number;
    let halfHeight: number;

    if (this.unitSizePixels !== null) {
      halfWidth = width / (2 * this.unitSizePixels);
      halfHeight = height / (2 * this.unitSizePixels);
    } else {
      const aspect = width / height;
      halfHeight = this.viewHeight / 2;
      halfWidth = halfHeight * aspect;
    }

    const [centerX, centerY] = this.center;

    this.camera.left = centerX - halfWidth;
    this.camera.right = centerX + halfWidth;
    this.camera.top = centerY + halfHeight;
    this.camera.bottom = centerY - halfHeight;
    this.camera.updateProjectionMatrix();

    const bounds = this.getViewBounds();
    for (const callback of this.viewChangeCallbacks) {
      callback(bounds);
    }
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

export function createMathScene2D(
  canvas: HTMLCanvasElement,
  options?: MathScene2DOptions,
): MathScene2D {
  return new MathScene2D(canvas, options);
}
