import {
  HUES,
  createMathScene2D,
  createPolygon2D,
  type Vec2Tuple,
} from "../../../../math-graphics";

import {
  RegionRevealSequence2D,
  createIntersectionMarker2D,
  createRegionCoordinatePlane2D,
  createViewportDashedLineTrace2D,
} from "./regionReveal2D";

const canvas =
  document.querySelector<HTMLCanvasElement>("#triangle_ball");

if (!canvas) {
  throw new Error("The triangle_ball canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: 5.8,
  center: [0, 0.75],
  background: null,
});

const coordinatePlane = createRegionCoordinatePlane2D(
  scene,
  "triangle-ball-coordinate-plane",
);

const vertices: Vec2Tuple[] = [
  [0, 0],
  [2, 2],
  [-2, 2],
];

const region = createPolygon2D({
  name: "triangle-ball-region",
  vertices,
  style: {
    outline: HUES.cyan.light,
    outlineWidth: 3.1,
    outlineOpacity: 1,
    fill: HUES.cyan.base,
    fillOpacity: 0.2,
  },
});

const dottedLines = [
  createViewportDashedLineTrace2D({
    scene,
    name: "triangle-construction-y-equals-x",
    point: [0, 0],
    direction: [1, 1],
  }),
  createViewportDashedLineTrace2D({
    scene,
    name: "triangle-construction-y-equals-minus-x",
    point: [0, 0],
    direction: [1, -1],
  }),
  createViewportDashedLineTrace2D({
    scene,
    name: "triangle-construction-y-equals-two",
    point: [0, 2],
    direction: [1, 0],
  }),
];

const markers = [
  createIntersectionMarker2D({
    name: "triangle-point-origin",
    position: [0, 0],
    text: "(0, 0)",
    offset: [0.14, -0.15],
    anchor: [0, 0],
  }),
  createIntersectionMarker2D({
    name: "triangle-point-right",
    position: [2, 2],
    text: "(2, 2)",
    offset: [-0.15, 0.15],
    anchor: [1, 1],
  }),
  createIntersectionMarker2D({
    name: "triangle-point-left",
    position: [-2, 2],
    text: "(-2, 2)",
    offset: [0.15, 0.15],
    anchor: [0, 1],
  }),
];

scene.add(
  coordinatePlane,
  region,
  ...markers,
);

const sequence = new RegionRevealSequence2D({
  scene,
  coordinatePlane,
  constructionTraces: dottedLines,
  region,
  markers,
  fillOpacity: 0.2,
});

Object.assign(window, {
  triangleBallDemo: {
    scene,
    coordinatePlane,
    region,
    markers,
    sequence,
  },
});

const destroy = (): void => {
  sequence.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
