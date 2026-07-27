import {
  HUES,
  createAngleSector2D,
  createCoordinatePlane2D,
  createFunctionGraph2D,
  createMathScene2D,
  createParametricShape2D,
  createTextLabel2D,
  createVector2D,
  type ParametricCurve2D,
  type Vec2Tuple,
} from "../math-graphics";

const TAU = Math.PI * 2;
const ORIGIN: Vec2Tuple = [0, 0];
const UNIT_RADIUS = 1;

/*
  Layout:
  - left: unit circle + rotating unit vector + shaded angle
  - right upper strip: cosine curve
  - right lower strip: sine curve
*/
const GRAPH_LEFT = 2.25;
const GRAPH_RIGHT = 8.05;
const GRAPH_WIDTH = GRAPH_RIGHT - GRAPH_LEFT;

const COS_BASE_Y = 1.55;
const SIN_BASE_Y = -1.65;
const GRAPH_AMPLITUDE = 0.82;

const CYCLE_SECONDS = 8.5;

const canvas = document.querySelector<HTMLCanvasElement>("#about-curve-scene");

if (!canvas) {
  throw new Error("The trigonometric curve demonstration canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: 7.2,
  center: [2.15, 0],
  background: null,
});

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(value: number): number {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

function angleToGraphX(angle: number): number {
  return GRAPH_LEFT + (GRAPH_WIDTH * angle) / TAU;
}

function cosineGraphY(angle: number): number {
  return COS_BASE_Y + GRAPH_AMPLITUDE * Math.cos(angle);
}

function sineGraphY(angle: number): number {
  return SIN_BASE_Y + GRAPH_AMPLITUDE * Math.sin(angle);
}

const unitCircleCurve: ParametricCurve2D = (parameter) => [
  UNIT_RADIUS * Math.cos(parameter),
  UNIT_RADIUS * Math.sin(parameter),
];

const coordinatePlane = createCoordinatePlane2D({
  name: "trig-curves-coordinate-plane",
  xRange: [-3.9, 8.4],
  yRange: [-3.1, 3.1],
  gridStep: 1,
  integerStep: 1,
  gridColor: 0x777087,
  gridOpacity: 0.2,
  axisColor: 0xeee9ff,
  axisOpacity: 0.9,
  axisWidth: 2.1,
  tickColor: 0xded7f2,
  tickOpacity: 0.8,
  tickLength: 0.12,
  labelColor: "rgba(239, 234, 255, 0.78)",
  labelFontSizePx: 12,
});

coordinatePlane.setAxisReveal(0);
coordinatePlane.setIntegerReveal(0);

const unitCircle = createParametricShape2D({
  name: "trig-curves-unit-circle",
  curve: unitCircleCurve,
  domain: [0, TAU],
  segments: 192,
  style: {
    outline: HUES.gold.light,
    outlineWidth: 2.6,
    outlineOpacity: 0.94,
    fill: HUES.gold.base,
    fillOpacity: 0.05,
  },
});

const angleSector = createAngleSector2D({
  name: "trig-curves-angle-sector",
  center: ORIGIN,
  startAngle: 0,
  endAngle: Math.PI / 6,
  direction: "counterclockwise",
  radius: 0.58,
  segments: 144,
  fill: HUES.purple.base,
  fillOpacity: 0.26,
  outline: HUES.magenta.light,
  outlineOpacity: 0.76,
});

const unitVector = createVector2D({
  name: "trig-curves-unit-vector",
  start: ORIGIN,
  end: [1, 0],
  style: {
    color: HUES.cyan.light,
    opacity: 1,
    shaftWidth: 0.055,
    headLength: 0.2,
    headWidth: 0.17,
  },
});

/* Projection guides from the rotating tip to the axes */
const cosineProjection = createVector2D({
  name: "cosine-projection",
  start: [1, 0],
  end: [1, 0],
  style: {
    color: HUES.gold.light,
    opacity: 0.7,
    shaftWidth: 0.03,
    headLength: 0,
    headWidth: 0,
  },
});

const sineProjection = createVector2D({
  name: "sine-projection",
  start: [1, 0],
  end: [0, 0],
  style: {
    color: HUES.magenta.light,
    opacity: 0.7,
    shaftWidth: 0.03,
    headLength: 0,
    headWidth: 0,
  },
});

/* Subtle strip baselines so the separate curves read clearly */
const cosineBaseline = createVector2D({
  name: "cosine-baseline",
  start: [GRAPH_LEFT, COS_BASE_Y],
  end: [GRAPH_RIGHT, COS_BASE_Y],
  style: {
    color: HUES.gold.light,
    opacity: 0.28,
    shaftWidth: 0.02,
    headLength: 0.14,
    headWidth: 0.12,
  },
});

const sineBaseline = createVector2D({
  name: "sine-baseline",
  start: [GRAPH_LEFT, SIN_BASE_Y],
  end: [GRAPH_RIGHT, SIN_BASE_Y],
  style: {
    color: HUES.magenta.light,
    opacity: 0.28,
    shaftWidth: 0.02,
    headLength: 0.14,
    headWidth: 0.12,
  },
});

/* Faint connector lines from the circle tip to the current graph points */
const cosineConnector = createVector2D({
  name: "cosine-connector",
  start: [1, 0],
  end: [GRAPH_LEFT, COS_BASE_Y + GRAPH_AMPLITUDE],
  style: {
    color: HUES.gold.light,
    opacity: 0.28,
    shaftWidth: 0.02,
    headLength: 0,
    headWidth: 0,
  },
});

const sineConnector = createVector2D({
  name: "sine-connector",
  start: [1, 0],
  end: [GRAPH_LEFT, SIN_BASE_Y],
  style: {
    color: HUES.magenta.light,
    opacity: 0.28,
    shaftWidth: 0.02,
    headLength: 0,
    headWidth: 0,
  },
});

/*
  These are graphs of angle -> cosine(angle) and angle -> sine(angle),
  remapped into separate horizontal strips on the right side of the scene.
*/
const cosineGraph = createFunctionGraph2D({
  name: "cosine-graph",
  equation: (x) => {
    const angle = ((x - GRAPH_LEFT) / GRAPH_WIDTH) * TAU;
    return COS_BASE_Y + GRAPH_AMPLITUDE * Math.cos(angle);
  },
  domain: [GRAPH_LEFT, GRAPH_RIGHT],
  segments: 420,
  style: {
    color: HUES.gold.light,
    width: 3.2,
    opacity: 0.96,
  },
});

const sineGraph = createFunctionGraph2D({
  name: "sine-graph",
  equation: (x) => {
    const angle = ((x - GRAPH_LEFT) / GRAPH_WIDTH) * TAU;
    return SIN_BASE_Y + GRAPH_AMPLITUDE * Math.sin(angle);
  },
  domain: [GRAPH_LEFT, GRAPH_RIGHT],
  segments: 420,
  style: {
    color: HUES.magenta.light,
    width: 3.2,
    opacity: 0.96,
  },
});

cosineGraph.setGraphTraceRange(0, 0);
sineGraph.setGraphTraceRange(0, 0);

/* Moving marker dots */
const tipMarker = createParametricShape2D({
  name: "tip-marker",
  curve: unitCircleCurve,
  domain: [0, TAU],
  segments: 72,
  style: {
    outline: HUES.cyan.light,
    outlineWidth: 1.4,
    fill: HUES.cyan.base,
    fillOpacity: 0.92,
  },
}).resizeTo(0.06);

const cosineMarker = createParametricShape2D({
  name: "cosine-marker",
  curve: unitCircleCurve,
  domain: [0, TAU],
  segments: 72,
  style: {
    outline: HUES.gold.light,
    outlineWidth: 1.3,
    fill: HUES.gold.base,
    fillOpacity: 0.94,
  },
}).resizeTo(0.055);

const sineMarker = createParametricShape2D({
  name: "sine-marker",
  curve: unitCircleCurve,
  domain: [0, TAU],
  segments: 72,
  style: {
    outline: HUES.magenta.light,
    outlineWidth: 1.3,
    fill: HUES.magenta.base,
    fillOpacity: 0.94,
  },
}).resizeTo(0.055);

const cosineLabel = createTextLabel2D({
  name: "cosine-label",
  text: "cos θ",
  position: [GRAPH_RIGHT - 0.2, COS_BASE_Y + GRAPH_AMPLITUDE + 0.42],
  anchor: [1, 0.5],
  color: "rgba(255, 228, 173, 0.98)",
  fontSizePx: 16,
  fontWeight: 760,
  background: "rgba(44, 34, 14, 0.55)",
  border: "1px solid rgba(255, 209, 122, 0.2)",
  borderRadiusPx: 8,
  padding: "0.18rem 0.42rem",
});

const sineLabel = createTextLabel2D({
  name: "sine-label",
  text: "sin θ",
  position: [GRAPH_RIGHT - 0.2, SIN_BASE_Y + GRAPH_AMPLITUDE + 0.42],
  anchor: [1, 0.5],
  color: "rgba(255, 212, 241, 0.98)",
  fontSizePx: 16,
  fontWeight: 760,
  background: "rgba(50, 18, 46, 0.55)",
  border: "1px solid rgba(255, 142, 225, 0.2)",
  borderRadiusPx: 8,
  padding: "0.18rem 0.42rem",
});

scene.add(
  coordinatePlane,
  unitCircle,
  angleSector,
  unitVector,
  cosineProjection,
  sineProjection,
  cosineBaseline,
  sineBaseline,
  cosineConnector,
  sineConnector,
  cosineGraph,
  sineGraph,
  tipMarker,
  cosineMarker,
  sineMarker,
  cosineLabel,
  sineLabel,
);

function updateScene(angle: number): void {
  const tip: Vec2Tuple = [Math.cos(angle), Math.sin(angle)];
  const graphX = angleToGraphX(angle);

  const cosinePoint: Vec2Tuple = [graphX, cosineGraphY(angle)];
  const sinePoint: Vec2Tuple = [graphX, sineGraphY(angle)];

  unitVector.setEnd(tip);
  tipMarker.moveTo(tip[0], tip[1]);

  angleSector.setAngles(0, angle);

  cosineProjection.setEndpoints(tip, [tip[0], 0]);
  sineProjection.setEndpoints(tip, [0, tip[1]]);

  cosineConnector.setEndpoints(tip, cosinePoint);
  sineConnector.setEndpoints(tip, sinePoint);

  cosineMarker.moveTo(cosinePoint[0], cosinePoint[1]);
  sineMarker.moveTo(sinePoint[0], sinePoint[1]);

  const progress = angle / TAU;
  cosineGraph.setGraphTraceRange(0, progress);
  sineGraph.setGraphTraceRange(0, progress);
}

/* Intro animation for axes / integer labels */
let introStartTime: number | null = null;
let stopIntro = (): void => {};

stopIntro = scene.onFrame(({ time }) => {
  introStartTime ??= time;
  const elapsed = (time - introStartTime) / 1000;

  const axisProgress = easeOutCubic(elapsed / 1.15);
  const integerProgress = easeOutCubic((elapsed - 0.95) / 0.9);

  coordinatePlane.setAxisReveal(axisProgress);
  coordinatePlane.setIntegerReveal(integerProgress);

  if (axisProgress >= 1 && integerProgress >= 1) {
    stopIntro();
  }
});

/* Main looping animation */
const stopAnimation = scene.onFrame(({ time }) => {
  const seconds = time / 1000;
  const progress = (seconds % CYCLE_SECONDS) / CYCLE_SECONDS;
  const angle = progress * TAU;

  updateScene(angle);
});

updateScene(0);

Object.assign(window, {
  mathCurveDemo: {
    scene,
    coordinatePlane,
    unitCircle,
    unitVector,
    angleSector,
    cosineGraph,
    sineGraph,
  },
});

const destroy = (): void => {
  stopIntro();
  stopAnimation();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
