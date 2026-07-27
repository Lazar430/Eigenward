export type CanvasAnimationContext = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  pixelRatio: number;
  reducedMotion: boolean;
};

export type CanvasAnimation = {
  render: (
    frame: CanvasAnimationContext & {
      time: number;
      deltaTime: number;
    },
  ) => void;
  resize?: (frame: CanvasAnimationContext) => void;
  destroy?: () => void;
};

export type CanvasAnimationFactory = (
  initial: CanvasAnimationContext,
) => CanvasAnimation;

export type MountCanvasAnimationOptions = {
  maxPixelRatio?: number;
  pauseWhenHidden?: boolean;
};

/**
 * Responsive canvas-animation runtime.
 *
 * Handles DPR scaling, ResizeObserver, requestAnimationFrame, frame deltas,
 * reduced-motion preferences, visibility pausing, and teardown.
 */
export function mountCanvasAnimation(
  canvas: HTMLCanvasElement,
  createAnimation: CanvasAnimationFactory,
  options: MountCanvasAnimationOptions = {},
): () => void {
  const context = canvas.getContext("2d");

  if (!context) {
    console.warn("A 2D canvas context could not be created.", canvas);
    return () => {};
  }

  const { maxPixelRatio = 2, pauseWhenHidden = true } = options;
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let reducedMotion = motionQuery.matches;
  let frameId = 0;
  let previousTime = 0;
  let running = false;
  let destroyed = false;

  const getContext = (): CanvasAnimationContext => ({
    canvas,
    context,
    width,
    height,
    pixelRatio,
    reducedMotion,
  });

  function resizeCanvas() {
    const rectangle = canvas.getBoundingClientRect();

    width = rectangle.width;
    height = rectangle.height;
    pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);

    canvas.width = Math.max(1, Math.round(width * pixelRatio));
    canvas.height = Math.max(1, Math.round(height * pixelRatio));
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  resizeCanvas();
  const animation = createAnimation(getContext());

  function render(time: number) {
    if (!running || destroyed) return;

    const deltaTime =
      previousTime === 0
        ? 0
        : Math.min((time - previousTime) / 1000, 0.1);

    previousTime = time;

    animation.render({
      ...getContext(),
      time,
      deltaTime,
    });

    if (reducedMotion) {
      running = false;
    } else {
      frameId = requestAnimationFrame(render);
    }
  }

  function start() {
    if (running || destroyed) return;
    running = true;
    previousTime = 0;
    frameId = requestAnimationFrame(render);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frameId);
    previousTime = 0;
  }

  function redraw() {
    stop();
    start();
  }

  const resizeObserver = new ResizeObserver(() => {
    resizeCanvas();
    animation.resize?.(getContext());
    redraw();
  });

  function handleMotionChange(event: MediaQueryListEvent) {
    reducedMotion = event.matches;
    animation.resize?.(getContext());
    redraw();
  }

  function handleVisibilityChange() {
    if (!pauseWhenHidden) return;

    if (document.hidden) stop();
    else start();
  }

  function destroy() {
    if (destroyed) return;

    destroyed = true;
    stop();
    resizeObserver.disconnect();
    motionQuery.removeEventListener("change", handleMotionChange);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    animation.destroy?.();
  }

  resizeObserver.observe(canvas);
  motionQuery.addEventListener("change", handleMotionChange);

  if (pauseWhenHidden) {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  window.addEventListener("pagehide", destroy, { once: true });

  animation.resize?.(getContext());
  start();

  return destroy;
}

/** Mounts the same animation factory on all matching canvases. */
export function mountCanvasAnimations(
  selector: string,
  createAnimation: CanvasAnimationFactory,
  options?: MountCanvasAnimationOptions,
): () => void {
  const destroyers = Array.from(
    document.querySelectorAll<HTMLCanvasElement>(selector),
  ).map((canvas) => mountCanvasAnimation(canvas, createAnimation, options));

  return () => {
    for (const destroy of destroyers) destroy();
  };
}

/** Starts a rounded-rectangle path; the caller chooses fill and stroke. */
export function roundedRectanglePath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(
    x,
    y,
    width,
    height,
    Math.min(radius, width / 2, height / 2),
  );
}

/** Clears the logical CSS-pixel canvas after DPR scaling is applied. */
export function clearCanvas(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  context.clearRect(0, 0, width, height);
}
