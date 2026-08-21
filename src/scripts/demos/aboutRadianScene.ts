import {
  HUES,
  createAngleSector2D,
  createCoordinatePlane2D,
  createMathScene2D,
  createParametricShape2D,
  createTextLabel2D,
  createVector2D,
  type Vec2Tuple,
} from "../math-graphics";

const TAU = Math.PI * 2;
const UNIT_RADIUS = 1;
const UNIT_SIZE_PIXELS = 180;
const ORIGIN: Vec2Tuple = [0, 0];

/*
 * One radian on the unit circle: the radius and the intercepted arc both
 * have length 1, so the highlighted angle is exactly 1 radian.
 */
const THETA = 1;

const canvas = document.querySelector<HTMLCanvasElement>(
  "#about-radian-scene",
);

if (!canvas) {
  throw new Error('The canvas "#about-radian-scene" could not be found.');
}

const scene = createMathScene2D(canvas, {
  unitSizePixels: UNIT_SIZE_PIXELS,
  center: [0, 0],
  background: null,
});

const coordinatePlane = createCoordinatePlane2D({
  name: "radian-coordinate-plane",
  scene,
  edgePaddingPixels: 20,
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
  name: "radian-unit-circle",
  curve: (parameter) => [
    UNIT_RADIUS * Math.cos(parameter),
    UNIT_RADIUS * Math.sin(parameter),
  ],
  domain: [0, TAU],
  segments: 192,
  style: {
    outline: HUES.gold.light,
    outlineWidth: 2.6,
    outlineOpacity: 0.94,
    fill: HUES.gold.base,
    fillOpacity: 0.045,
  },
});

const radiusVector = createVector2D({
  name: "radian-radius-vector",
  start: ORIGIN,
  end: [Math.cos(THETA), Math.sin(THETA)],
  style: {
    color: HUES.cyan.light,
    opacity: 1,
    shaftWidth: 0.055,
    headLength: 0.2,
    headWidth: 0.17,
  },
});

const angleSector = createAngleSector2D({
  name: "radian-angle-sector",
  center: ORIGIN,
  startAngle: 0,
  endAngle: THETA,
  direction: "counterclockwise",
  radius: 0.54,
  segments: 96,
  fill: HUES.purple.base,
  fillOpacity: 0.30,
  outline: HUES.magenta.light,
  outlineOpacity: 0.82,
});

const highlightedArc = createParametricShape2D({
  name: "radian-highlighted-arc",
  curve: (parameter) => [
    UNIT_RADIUS * Math.cos(parameter),
    UNIT_RADIUS * Math.sin(parameter),
  ],
  domain: [0, THETA],
  segments: 96,
  style: {
    outline: HUES.magenta.light,
    outlineWidth: 5.5,
    outlineOpacity: 0.98,
    fillOpacity: 0,
  },
});

const tipMarker = createParametricShape2D({
  name: "radian-tip-marker",
  curve: (parameter) => [
    Math.cos(THETA) + 0.038 * Math.cos(parameter),
    Math.sin(THETA) + 0.038 * Math.sin(parameter),
  ],
  domain: [0, TAU],
  segments: 64,
  style: {
    outline: HUES.cyan.light,
    outlineWidth: 1.8,
    outlineOpacity: 0.95,
    fill: HUES.cyan.base,
    fillOpacity: 0.95,
  },
});

function polarPoint(
  angle: number,
  radius: number,
): Vec2Tuple {
  return [
    radius * Math.cos(angle),
    radius * Math.sin(angle),
  ];
}

const radiusMidpoint = polarPoint(THETA, 0.56);
const radiusNormalOffset: Vec2Tuple = [
  -0.12 * Math.sin(THETA),
  0.12 * Math.cos(THETA),
];

const radiusLabel = createTextLabel2D({
  name: "radian-radius-label",
  text: "1",
  position: [
    radiusMidpoint[0] + radiusNormalOffset[0],
    radiusMidpoint[1] + radiusNormalOffset[1],
  ],
  anchor: [0.5, 0.5],
  color: "rgba(222, 250, 255, 0.98)",
  fontSizePx: 16,
  fontWeight: 760,
  background: "rgba(15, 24, 40, 0.78)",
  border: "1px solid rgba(111, 232, 255, 0.25)",
  borderRadiusPx: 8,
  padding: "0.18rem 0.38rem",
});

const arcLabel = createTextLabel2D({
  name: "radian-arc-label",
  text: "1",
  position: polarPoint(THETA / 2, 1.16),
  anchor: [0.5, 0.5],
  color: "rgba(255, 230, 250, 0.98)",
  fontSizePx: 16,
  fontWeight: 760,
  background: "rgba(31, 20, 51, 0.72)",
  border: "1px solid rgba(255, 132, 195, 0.24)",
  borderRadiusPx: 8,
  padding: "0.18rem 0.38rem",
});

const angleLabel = createTextLabel2D({
  name: "radian-angle-label",
  latex: String.raw`\theta = 1\ \text{radian}`,
  position: angleSector.getLabelPosition(0.78),
  anchor: [0.5, 0.5],
  color: "rgba(255, 241, 212, 0.98)",
  fontSizePx: 15,
  fontWeight: 720,
  background: "rgba(54, 34, 18, 0.76)",
  border: "1px solid rgba(255, 204, 112, 0.24)",
  borderRadiusPx: 8,
  padding: "0.22rem 0.42rem",
});

scene.add(
  coordinatePlane,
  unitCircle,
  angleSector,
  highlightedArc,
  radiusVector,
  tipMarker,
  radiusLabel,
  arcLabel,
  angleLabel,
);

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(value: number): number {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

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

Object.assign(window, {
  mathRadianDemo: {
    scene,
    coordinatePlane,
    unitCircle,
    angleSector,
    highlightedArc,
    radiusVector,
    radiusLabel,
    arcLabel,
    angleLabel,
  },
});

const destroy = (): void => {
  stopIntro();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
