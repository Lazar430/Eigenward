import {
  HUES,
  PointDragController2D,
  createMathScene2D,
  createVector2D,
} from "../math-graphics";

const canvas = document.querySelector<HTMLCanvasElement>(
  "#about-vector-drag-scene",
);

if (!canvas) {
  throw new Error("The vector-drag demonstration canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: 5.6,
  center: [0, 0],
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

// Interactivity is introduced here, at scene level. Only the cyan vector's
// endpoint is registered. The magenta vector remains completely inert.
const dragging = new PointDragController2D(scene);

dragging.registerPoint({
  getPosition: () => draggableVector.getEnd(),
  onDrag: (pointerPosition) => {
    draggableVector.setEnd(pointerPosition);
  },
  hitRadiusPixels: 24,
});

const destroy = (): void => {
  dragging.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
