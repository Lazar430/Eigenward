import {
  HUES,
  PointDragController2D,
  createCoordinatePlane2D,
  createFunctionGraph2D,
  createMathScene2D,
  createParametricShape2D,
  createTextLabel2D,
  createVector2D,
} from "../math-graphics";

const TAU = Math.PI * 2;

type Vec2Tuple = readonly [number, number];

const LEFT_CENTER_X = -5.1;
const RIGHT_CENTER_X = 5.1;
const GRAPH_CENTER_Y = 0;

const X_DOMAIN: readonly [number, number] = [-3.1, 3.1];
const LEFT_Y_RANGE: readonly [number, number] = [-2.25, 2.25];
const RIGHT_Y_RANGE: readonly [number, number] = [-1.35, 2.75];

const POINT_RADIUS = 0.12;
const DERIVATIVE_POINT_RADIUS = 0.11;
const TANGENT_HALF_SPAN = 3.05;

const AXIS_DURATION = 1.15;
const INTEGER_DELAY = 0.95;
const INTEGER_DURATION = 0.9;
const GRAPH_DELAY = 1.6;
const GRAPH_DURATION = 2.25;

function f(x: number): number {
  return 0.12 * x * x * x - 0.8 * x + 0.35;
}

function df(x: number): number {
  return 0.36 * x * x - 0.8;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function easeOutCubic(value: number): number {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

function formatNumber(value: number): string {
  const rounded = Math.abs(value) < 1e-9 ? 0 : value;
  return rounded.toFixed(3);
}

function normalizedDomainPosition(x: number): number {
  return (x - X_DOMAIN[0]) / (X_DOMAIN[1] - X_DOMAIN[0]);
}

function unitCircle(parameter: number): Vec2Tuple {
  return [Math.cos(parameter), Math.sin(parameter)];
}

const canvas = document.querySelector<HTMLCanvasElement>(
  "#derivative-tangent-scene",
) ?? document.querySelector<HTMLCanvasElement>("#tangent-derivative-scene");

if (!canvas) {
  throw new Error(
    "The derivative-tangent demonstration canvas could not be found.",
  );
}

const scene = createMathScene2D(canvas, {
  unitSizePixels: 38,
  center: [0, 0.18],
  background: null,
});

const leftPlane = createCoordinatePlane2D({
  name: "derivative-tangent-left-plane",
  xRange: X_DOMAIN,
  yRange: LEFT_Y_RANGE,
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
  showAxisNames: true,
}).moveTo(LEFT_CENTER_X, GRAPH_CENTER_Y);
leftPlane.setAxisReveal(0);
leftPlane.setIntegerReveal(0);

const rightPlane = createCoordinatePlane2D({
  name: "derivative-tangent-right-plane",
  xRange: X_DOMAIN,
  yRange: RIGHT_Y_RANGE,
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
  showAxisNames: true,
}).moveTo(RIGHT_CENTER_X, GRAPH_CENTER_Y);
rightPlane.setAxisReveal(0);
rightPlane.setIntegerReveal(0);

const functionGraph = createFunctionGraph2D({
  name: "derivative-tangent-function-graph",
  equation: f,
  domain: X_DOMAIN,
  segments: 900,
  style: {
    color: HUES.cyan.light,
    width: 3.2,
    opacity: 0.98,
  },
}).moveTo(LEFT_CENTER_X, GRAPH_CENTER_Y);
functionGraph.setGraphTraceRange(0, 0);

const derivativeGraph = createFunctionGraph2D({
  name: "derivative-tangent-derivative-graph",
  equation: df,
  domain: X_DOMAIN,
  segments: 900,
  style: {
    color: HUES.magenta.light,
    width: 3.2,
    opacity: 0.98,
  },
}).moveTo(RIGHT_CENTER_X, GRAPH_CENTER_Y);
derivativeGraph.setGraphTraceRange(0, 0);

const tangentLine = createVector2D({
  name: "derivative-tangent-line",
  start: [LEFT_CENTER_X - TANGENT_HALF_SPAN, 0],
  end: [LEFT_CENTER_X + TANGENT_HALF_SPAN, 0],
  style: {
    color: HUES.gold.light,
    opacity: 0.92,
    shaftWidth: 0.04,
    headLength: 0,
    headWidth: 0,
  },
});
tangentLine.hide();

const functionPoint = createParametricShape2D({
  name: "derivative-tangent-function-point",
  curve: unitCircle,
  domain: [0, TAU],
  segments: 84,
  style: {
    fill: HUES.gold.base,
    fillOpacity: 0.98,
    outline: 0x2a1a05,
    outlineWidth: 1.8,
    outlineOpacity: 1,
  },
}).resizeTo(POINT_RADIUS);
functionPoint.hide();

const derivativePoint = createParametricShape2D({
  name: "derivative-tangent-derivative-point",
  curve: unitCircle,
  domain: [0, TAU],
  segments: 84,
  style: {
    fill: HUES.magenta.base,
    fillOpacity: 0.98,
    outline: 0x311329,
    outlineWidth: 1.8,
    outlineOpacity: 1,
  },
}).resizeTo(DERIVATIVE_POINT_RADIUS);
derivativePoint.hide();

const leftTitle = createTextLabel2D({
  name: "derivative-tangent-left-title",
  text: "f(x)",
  position: [LEFT_CENTER_X, 2.82],
  anchor: [0.5, 0.5],
  color: "rgba(145, 239, 255, 0.98)",
  fontSizePx: 17,
  fontWeight: 760,
  background: "rgba(15, 12, 27, 0.8)",
  border: "1px solid rgba(145, 239, 255, 0.22)",
  borderRadiusPx: 8,
  padding: "0.16rem 0.48rem",
  opacity: 0,
});

const rightTitle = createTextLabel2D({
  name: "derivative-tangent-right-title",
  text: "f'(x)",
  position: [RIGHT_CENTER_X, 2.82],
  anchor: [0.5, 0.5],
  color: "rgba(255, 154, 187, 0.98)",
  fontSizePx: 17,
  fontWeight: 760,
  background: "rgba(22, 11, 26, 0.8)",
  border: "1px solid rgba(255, 154, 187, 0.22)",
  borderRadiusPx: 8,
  padding: "0.16rem 0.48rem",
  opacity: 0,
});

const instructionLabel = createTextLabel2D({
  name: "derivative-tangent-instructions",
  text: "",
  position: [0, -2.88],
  anchor: [0.5, 0.5],
  color: "rgba(239, 234, 255, 0.96)",
  fontSizePx: 14,
  fontWeight: 700,
  background: "rgba(17, 14, 30, 0.84)",
  border: "1px solid rgba(198, 180, 255, 0.18)",
  borderRadiusPx: 8,
  padding: "0.22rem 0.5rem",
  opacity: 0,
});

const functionPointLabel = createTextLabel2D({
  name: "derivative-tangent-function-point-label",
  text: "",
  position: [0, 0],
  anchor: [0, 1],
  color: "rgba(255, 242, 205, 0.98)",
  fontSizePx: 13,
  fontWeight: 700,
  background: "rgba(35, 25, 21, 0.86)",
  border: "1px solid rgba(255, 219, 121, 0.28)",
  borderRadiusPx: 7,
  padding: "0.22rem 0.4rem",
  opacity: 0,
});

const derivativePointLabel = createTextLabel2D({
  name: "derivative-tangent-derivative-point-label",
  text: "",
  position: [0, 0],
  anchor: [0, 1],
  color: "rgba(255, 230, 248, 0.98)",
  fontSizePx: 13,
  fontWeight: 700,
  background: "rgba(37, 17, 43, 0.88)",
  border: "1px solid rgba(255, 126, 206, 0.3)",
  borderRadiusPx: 7,
  padding: "0.22rem 0.4rem",
  opacity: 0,
});

scene.add(
  leftPlane,
  rightPlane,
  derivativeGraph,
  functionGraph,
  tangentLine,
  functionPoint,
  derivativePoint,
  leftTitle,
  rightTitle,
  instructionLabel,
  functionPointLabel,
  derivativePointLabel,
);

let currentX = X_DOMAIN[0];
let introComplete = false;
let derivativeHasBegun = false;

function updateTangentAndDerivative(x: number): void {
  currentX = clamp(x, X_DOMAIN[0], X_DOMAIN[1]);

  const y = f(currentX);
  const slope = df(currentX);
  const tangentLeftX = X_DOMAIN[0];
  const tangentRightX = X_DOMAIN[1];
  const tangentLeftY = y + slope * (tangentLeftX - currentX);
  const tangentRightY = y + slope * (tangentRightX - currentX);

  functionPoint.moveTo(LEFT_CENTER_X + currentX, y);
  tangentLine.setEndpoints(
    [LEFT_CENTER_X + tangentLeftX, tangentLeftY],
    [LEFT_CENTER_X + tangentRightX, tangentRightY],
  );

  functionPointLabel
    .setText(`(${formatNumber(currentX)}, ${formatNumber(y)})`)
    .moveTo(LEFT_CENTER_X + currentX + 0.18, y + 0.18)
    .setAnchor([0, 1]);

  if (derivativeHasBegun) {
    const trace = normalizedDomainPosition(currentX);
    derivativeGraph.setGraphTraceRange(0, trace);
    derivativePoint
      .show()
      .moveTo(RIGHT_CENTER_X + currentX, slope);
    derivativePointLabel
      .setOpacity(1)
      .setText(`f'(${formatNumber(currentX)}) = ${formatNumber(slope)}`)
      .moveTo(RIGHT_CENTER_X + currentX + 0.18, slope + 0.18)
      .setAnchor([0, 1]);
  } else {
    derivativeGraph.setGraphTraceRange(0, 0);
    derivativePoint.hide();
    derivativePointLabel.setOpacity(0);
  }

  instructionLabel.setText(
    `Drag the gold point · x = ${formatNumber(currentX)} · slope = ${formatNumber(slope)}`,
  );
}

updateTangentAndDerivative(currentX);

const dragController = new PointDragController2D(scene);

const unregisterPoint = dragController.registerPoint({
  getPosition: () => [LEFT_CENTER_X + currentX, f(currentX)],
  onDrag: ([worldX]) => {
    if (!introComplete) return;
    derivativeHasBegun = true;
    updateTangentAndDerivative(worldX - LEFT_CENTER_X);
  },
  hitRadiusPixels: 18,
  hoverCursor: "grab",
});

let introStartTime: number | null = null;
const stopIntro = scene.onFrame(({ time }) => {
  if (introStartTime === null) introStartTime = time;
  const elapsed = (time - introStartTime) / 1000;

  const axisProgress = easeOutCubic(elapsed / AXIS_DURATION);
  const integerProgress = easeOutCubic(
    (elapsed - INTEGER_DELAY) / INTEGER_DURATION,
  );
  const graphProgress = easeOutCubic((elapsed - GRAPH_DELAY) / GRAPH_DURATION);

  leftPlane.setAxisReveal(axisProgress);
  rightPlane.setAxisReveal(axisProgress);
  leftPlane.setIntegerReveal(integerProgress);
  rightPlane.setIntegerReveal(integerProgress);
  functionGraph.setGraphTraceRange(0, graphProgress);

  leftTitle.setOpacity(graphProgress);
  rightTitle.setOpacity(graphProgress);

  if (
    axisProgress >= 1 &&
    integerProgress >= 1 &&
    graphProgress >= 1
  ) {
    functionGraph.showCompleteGraph();
    introComplete = true;
    functionPoint.show();
    tangentLine.show();
    functionPointLabel.setOpacity(1);
    instructionLabel.setOpacity(1);
    updateTangentAndDerivative(X_DOMAIN[0]);
    stopIntro();
  }
});

Object.assign(window, {
  derivativeTangentDemo: {
    scene,
    leftPlane,
    rightPlane,
    functionGraph,
    derivativeGraph,
    tangentLine,
    setX(x: number) {
      derivativeHasBegun = true;
      updateTangentAndDerivative(x);
    },
    resetDerivative() {
      derivativeHasBegun = false;
      updateTangentAndDerivative(currentX);
    },
  },
});

const destroy = (): void => {
  stopIntro();
  unregisterPoint();
  dragController.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
