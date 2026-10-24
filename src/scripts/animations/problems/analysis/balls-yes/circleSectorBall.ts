import {
  HUES,
  createMathScene2D,
  type Vec2Tuple,
} from "../../../../math-graphics";

import {
  createProofBoundaryRegion2D,
} from "../../../../math-graphics/animation/proofHelpers2D";

import {
  RegionRevealSequence2D,
  createDashedCircleTrace2D,
  createIntersectionMarker2D,
  createRegionCoordinatePlane2D,
  createViewportDashedLineTrace2D,
} from "./regionReveal2D";

const canvas =
  document.querySelector<HTMLCanvasElement>("#circle_sector_ball");

if (!canvas) {
  throw new Error("The circle_sector_ball canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: 5.6,
  center: [0, 0],
  background: null,
});

const coordinatePlane = createRegionCoordinatePlane2D(
  scene,
  "circle-sector-ball-coordinate-plane",
);

const radius = Math.sqrt(3);
const sqrt15 = Math.sqrt(15);

const origin: Vec2Tuple = [0, 0];

const upper: Vec2Tuple = [
  (2 * sqrt15) / 5,
  sqrt15 / 5,
];

const lower: Vec2Tuple = [
  (2 * sqrt15) / 5,
  -sqrt15 / 5,
];

const upperAngle = Math.atan2(upper[1], upper[0]);
const lowerAngle = Math.PI * 2 - upperAngle;

const region = createProofBoundaryRegion2D({
  name: "circle-sector-ball-region",
  pieces: [
    {
      type: "segment",
      from: origin,
      to: upper,
    },
    {
      type: "arc",
      center: origin,
      radius,
      startAngle: upperAngle,
      endAngle: lowerAngle,
      direction: "counterclockwise",
    },
    {
      type: "segment",
      from: lower,
      to: origin,
    },
  ],
  segments: 260,
  fill: HUES.cyan.base,
  fillOpacity: 0.2,
  outline: HUES.cyan.light,
  outlineWidth: 3.1,
  outlineOpacity: 1,
});

const constructionTraces = [
  createDashedCircleTrace2D({
    scene,
    name: "circle-sector-construction-circle",
    center: origin,
    radius,
  }),
  createViewportDashedLineTrace2D({
    scene,
    name: "circle-sector-construction-x-equals-2y",
    point: origin,
    direction: [2, 1],
  }),
  createViewportDashedLineTrace2D({
    scene,
    name: "circle-sector-construction-x-equals-minus-2y",
    point: origin,
    direction: [2, -1],
  }),
];

const markers = [
  createIntersectionMarker2D({
    name: "circle-sector-point-origin",
    position: origin,
    text: "(0, 0)",
    offset: [-0.14, -0.15],
    anchor: [1, 0],
  }),
  createIntersectionMarker2D({
    name: "circle-sector-point-upper",
    position: upper,
    text: "(2√15/5, √15/5)",
    offset: [0.13, 0.15],
    anchor: [0, 1],
  }),
  createIntersectionMarker2D({
    name: "circle-sector-point-lower",
    position: lower,
    text: "(2√15/5, -√15/5)",
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
  constructionTraces,
  region,
  markers,
  fillOpacity: 0.2,
  durations: {
    dottedSeconds: 1.65,
    solidSeconds: 1.8,
  },
});

Object.assign(window, {
  circleSectorBallDemo: {
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
