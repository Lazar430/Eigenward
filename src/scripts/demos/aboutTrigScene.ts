import {
  HUES,
  PointDragController2D,
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
const ORIGIN: Vec2Tuple = [0, 0];

const canvas = document.querySelector<HTMLCanvasElement>(
  "#about-trig-scene",
);

if (!canvas) {
  throw new Error("The trigonometric demonstration canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: 5.2,
  center: [0.25, 0],
  background: null,
});

const coordinatePlane = createCoordinatePlane2D({
  name: "trigonometric-coordinate-plane",
  xRange: [-4.1, 4.1],
  yRange: [-2.35, 2.35],
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
  name: "trigonometric-unit-circle",
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

let currentAngle = Math.PI / 6;

const angleSector = createAngleSector2D({
  name: "trigonometric-angle-sector",
  center: ORIGIN,
  startAngle: 0,
  endAngle: currentAngle,
  direction: "counterclockwise",
  radius: 0.62,
  segments: 144,
  fill: HUES.purple.base,
  fillOpacity: 0.3,
  outline: HUES.magenta.light,
  outlineOpacity: 0.78,
});

const unitVector = createVector2D({
  name: "trigonometric-unit-vector",
  start: ORIGIN,
  end: [Math.cos(currentAngle), Math.sin(currentAngle)],
  style: {
    color: HUES.cyan.light,
    opacity: 1,
    shaftWidth: 0.055,
    headLength: 0.2,
    headWidth: 0.17,
  },
});

const angleLabel = createTextLabel2D({
  name: "trigonometric-angle-label",
  text: "30°",
  position: angleSector.getLabelPosition(0.66),
  anchor: [0.5, 0.5],
  color: "rgba(255, 230, 250, 0.98)",
  fontSizePx: 14,
  fontWeight: 760,
  background: "rgba(31, 20, 51, 0.72)",
  border: "1px solid rgba(255, 132, 195, 0.24)",
  borderRadiusPx: 7,
  padding: "0.2rem 0.38rem",
});

const coordinateLabel = createTextLabel2D({
  name: "trigonometric-coordinate-label",
  text: "(cos 30°, sin 30°)",
  position: [1.15, 0.65],
  anchor: [0, 1],
  color: "rgba(222, 250, 255, 0.98)",
  fontSizePx: 14,
  fontWeight: 650,
  background: "rgba(15, 24, 40, 0.78)",
  border: "1px solid rgba(111, 232, 255, 0.25)",
  borderRadiusPx: 8,
  padding: "0.25rem 0.45rem",
});

scene.add(
  coordinatePlane,
  unitCircle,
  angleSector,
  unitVector,
  angleLabel,
  coordinateLabel,
);

function normalizeAngle(angle: number): number {
  const normalized = ((angle % TAU) + TAU) % TAU;
  return Math.abs(normalized - TAU) < 1e-10 ? 0 : normalized;
}

function formatDegrees(angleRadians: number): string {
  const degrees = normalizeAngle(angleRadians) * 180 / Math.PI;
  const rounded = Math.round(degrees * 10) / 10;

  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1);
}

function updateCoordinateLabelPosition(tip: Vec2Tuple): void {
  const horizontalSign = tip[0] >= 0 ? 1 : -1;
  const verticalSign = tip[1] >= 0 ? 1 : -1;
  const offset = 0.14;

  coordinateLabel
    .moveTo(
      tip[0] + horizontalSign * offset,
      tip[1] + verticalSign * offset,
    )
    .setAnchor([
      horizontalSign > 0 ? 0 : 1,
      verticalSign > 0 ? 1 : 0,
    ]);
}

function displayAngle(angleRadians: number): void {
  currentAngle = normalizeAngle(angleRadians);

  const tip: Vec2Tuple = [
    Math.cos(currentAngle),
    Math.sin(currentAngle),
  ];
  const degreesText = formatDegrees(currentAngle);

  unitVector.setEnd(tip);
  angleSector.setAngles(0, currentAngle);

  const angleLabelPosition = angleSector.getLabelPosition(0.66);
  angleLabel
    .setText(`${degreesText}°`)
    .moveTo(angleLabelPosition[0], angleLabelPosition[1]);

  coordinateLabel.setText(
    `(cos ${degreesText}°, sin ${degreesText}°)`,
  );
  updateCoordinateLabelPosition(tip);
}

displayAngle(currentAngle);

const dragging = new PointDragController2D(scene);

dragging.registerPoint({
  getPosition: () => unitVector.getEnd(),
  onDrag: (pointerPosition) => {
    const dx = pointerPosition[0] - ORIGIN[0];
    const dy = pointerPosition[1] - ORIGIN[1];

    if (Math.hypot(dx, dy) < 1e-8) return;
    displayAngle(Math.atan2(dy, dx));
  },
  hitRadiusPixels: 26,
  hoverCursor: "grab",
});

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
  mathTrigDemo: {
    scene,
    coordinatePlane,
    unitCircle,
    unitVector,
    angleSector,
    angleLabel,
    coordinateLabel,
    setAngleDegrees(degrees: number) {
      displayAngle(degrees * Math.PI / 180);
    },
  },
});

const destroy = (): void => {
  stopIntro();
  dragging.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
