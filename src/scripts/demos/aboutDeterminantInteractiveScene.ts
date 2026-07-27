import {
  HUES,
  PointDragController2D,
  createMathScene2D,
  createParallelogramArea2D,
  createVector2D,
  type Vec2Tuple,
} from "../math-graphics";

const canvas = document.querySelector<HTMLCanvasElement>(
  "#about-determinant-interactive-scene",
);

if (!canvas) {
  throw new Error(
    "The interactive determinant demonstration canvas could not be found.",
  );
}

const scene = createMathScene2D(canvas, {
  viewHeight: 6.2,
  center: [0.15, 0],
  background: null,
});

const origin: Vec2Tuple = [-0.45, -0.8];
const u: Vec2Tuple = [2.55, 0.65];
const v: Vec2Tuple = [-0.45, 2.25];

const area = createParallelogramArea2D({
  name: "interactive-determinant-area",
  origin,
  u,
  v,
  color: HUES.mint.base,
  opacity: 0.22,
});

const vectorU = createVector2D({
  name: "interactive-basis-u",
  start: origin,
  end: [origin[0] + u[0], origin[1] + u[1]],
  style: {
    color: HUES.cyan.light,
    shaftWidth: 0.095,
    headLength: 0.42,
    headWidth: 0.35,
  },
});

const vectorV = createVector2D({
  name: "interactive-basis-v",
  start: origin,
  end: [origin[0] + v[0], origin[1] + v[1]],
  style: {
    color: HUES.magenta.light,
    shaftWidth: 0.095,
    headLength: 0.42,
    headWidth: 0.35,
  },
});

scene.add(area, vectorU, vectorV);

function updateParallelogram(): void {
  area.setBasis(
    origin,
    vectorU.getDisplacement(),
    vectorV.getDisplacement(),
  );
}

const dragging = new PointDragController2D(scene);

dragging.registerPoint({
  getPosition: () => vectorU.getEnd(),
  onDrag: (pointerPosition) => {
    vectorU.setEnd(pointerPosition);
    updateParallelogram();
  },
  hitRadiusPixels: 24,
});

dragging.registerPoint({
  getPosition: () => vectorV.getEnd(),
  onDrag: (pointerPosition) => {
    vectorV.setEnd(pointerPosition);
    updateParallelogram();
  },
  hitRadiusPixels: 24,
});

const destroy = (): void => {
  dragging.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
