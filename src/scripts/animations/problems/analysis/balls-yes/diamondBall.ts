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
  document.querySelector<HTMLCanvasElement>("#diamond_ball");

if (!canvas) {
  throw new Error("The diamond_ball canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: 5.1,
  center: [0, 0],
  background: null,
});

const coordinatePlane = createRegionCoordinatePlane2D(
  scene,
  "diamond-ball-coordinate-plane",
);

const vertices: Vec2Tuple[] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

const region = createPolygon2D({
  name: "diamond-ball-region",
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
    name: "diamond-construction-d1",
    point: [0, 1],
    direction: [1, -1],
  }),
  createViewportDashedLineTrace2D({
    scene,
    name: "diamond-construction-d2",
    point: [1, 0],
    direction: [1, 1],
  }),
  createViewportDashedLineTrace2D({
    scene,
    name: "diamond-construction-d3",
    point: [-1, 0],
    direction: [1, 1],
  }),
  createViewportDashedLineTrace2D({
    scene,
    name: "diamond-construction-d4",
    point: [-1, 0],
    direction: [1, -1],
  }),
];

const markers = [
  createIntersectionMarker2D({
    name: "diamond-point-right",
    position: [1, 0],
    text: "(1, 0)",
    offset: [0.15, 0.14],
    anchor: [0, 1],
  }),
  createIntersectionMarker2D({
    name: "diamond-point-top",
    position: [0, 1],
    text: "(0, 1)",
    offset: [0.13, 0.15],
    anchor: [0, 1],
  }),
  createIntersectionMarker2D({
    name: "diamond-point-left",
    position: [-1, 0],
    text: "(-1, 0)",
    offset: [-0.15, 0.14],
    anchor: [1, 1],
  }),
  createIntersectionMarker2D({
    name: "diamond-point-bottom",
    position: [0, -1],
    text: "(0, -1)",
    offset: [0.13, -0.15],
    anchor: [0, 0],
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
  diamondBallDemo: {
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
