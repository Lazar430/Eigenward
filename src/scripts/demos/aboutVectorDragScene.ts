import {
  HUES,
  PointDragController2D,
  createMathScene2D,
  createVector2D,
  type Vec2Tuple,
} from "../math-graphics";

const VIEW_HEIGHT = 5.6;
const VIEW_CENTER: Vec2Tuple = [0, 0];
const VIEWPORT_PADDING = 0.22;

const canvas = document.querySelector<HTMLCanvasElement>(
  "#about-vector-drag-scene",
);

if (!canvas) {
  throw new Error("The vector-drag demonstration canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: VIEW_HEIGHT,
  center: VIEW_CENTER,
  background: null,
});

// Both objects are ordinary, inert Vector2D instances.
const draggableVector = createVector2D({
  name: "draggable-vector",
  start: [-2.8, -1.1],
  end: [-0.25, 1.05],
  style: {
    color: HUES.cyan.light,
    shaftWidth: 0.1,
    headLength: 0.44,
    headWidth: 0.38,
  },
});

const staticVector = createVector2D({
  name: "static-vector",
  start: [0.35, -1.2],
  end: [2.75, 0.75],
  style: {
    color: HUES.magenta.light,
    shaftWidth: 0.1,
    headLength: 0.44,
    headWidth: 0.38,
  },
});

scene.add(draggableVector, staticVector);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function constrainToViewport(point: Vec2Tuple): Vec2Tuple {
  const rect = canvas.getBoundingClientRect();
  const pixelWidth = rect.width || canvas.clientWidth || canvas.width || 1;
  const pixelHeight = rect.height || canvas.clientHeight || canvas.height || 1;
  const aspect = pixelWidth / Math.max(pixelHeight, 1);
  const halfHeight = VIEW_HEIGHT / 2;
  const halfWidth = halfHeight * aspect;
  const paddingX = Math.min(VIEWPORT_PADDING, halfWidth * 0.45);
  const paddingY = Math.min(VIEWPORT_PADDING, halfHeight * 0.45);

  return [
    clamp(
      point[0],
      VIEW_CENTER[0] - halfWidth + paddingX,
      VIEW_CENTER[0] + halfWidth - paddingX,
    ),
    clamp(
      point[1],
      VIEW_CENTER[1] - halfHeight + paddingY,
      VIEW_CENTER[1] + halfHeight - paddingY,
    ),
  ];
}

// Interactivity is introduced here, at scene level. Only the cyan vector's
// endpoint is registered. The magenta vector remains completely inert.
const dragging = new PointDragController2D(scene);

dragging.registerPoint({
  getPosition: () => draggableVector.getEnd(),
  onDrag: (pointerPosition) => {
    draggableVector.setEnd(constrainToViewport(pointerPosition));
  },
  hitRadiusPixels: 24,
});

const resizeObserver = new ResizeObserver(() => {
  draggableVector.setEnd(constrainToViewport(draggableVector.getEnd()));
});
resizeObserver.observe(canvas);

const destroy = (): void => {
  resizeObserver.disconnect();
  dragging.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
