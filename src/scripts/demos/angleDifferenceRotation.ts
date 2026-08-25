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
import {
  createProofSegment2D,
} from "../math-graphics/animation/proofHelpers2D";

const TAU = Math.PI * 2;
const UNIT_SIZE_PIXELS = 200;
const ORIGIN: Vec2Tuple = [0, 0];
const UNIT_CIRCLE_RADIUS = 1;

const ALPHA = 150 * Math.PI / 180;
const BETA = 100 * Math.PI / 180;
const DIFFERENCE = ALPHA - BETA;

const ALPHA_SECTOR_RADIUS = 0.74;
const BETA_SECTOR_RADIUS = 0.46;
const DIFFERENCE_SECTOR_RADIUS = 0.60;

const ALPHA_BASE_FILL_OPACITY = 0.18;
const BETA_BASE_FILL_OPACITY = 0.18;
const DIFFERENCE_FILL_OPACITY = 0.26;

const EXTREME_EPSILON = 1e-3;
const ENDPOINT_HIT_RADIUS_WORLD = 0.085;
const SEGMENT_HIT_RADIUS_WORLD = 0.09;

const canvas = document.querySelector<HTMLCanvasElement>(
  "#angle-difference-rotation",
);

if (!canvas) {
  throw new Error(
    "The angle-difference rotation canvas could not be found.",
  );
}

const scene = createMathScene2D(canvas, {
  unitSizePixels: UNIT_SIZE_PIXELS,
  center: [0, 0],
  background: null,
});

const coordinatePlane = createCoordinatePlane2D({
  name: "angle-difference-coordinate-plane",
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

coordinatePlane.setAxisReveal(1);
coordinatePlane.setIntegerReveal(1);

const unitCircle = createParametricShape2D({
  name: "angle-difference-unit-circle",
  curve: (parameter) => [
    UNIT_CIRCLE_RADIUS * Math.cos(parameter),
    UNIT_CIRCLE_RADIUS * Math.sin(parameter),
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

const betaRay = createVector2D({
  name: "angle-difference-beta-ray",
  start: ORIGIN,
  end: [Math.cos(BETA), Math.sin(BETA)],
  style: {
    color: HUES.cyan.light,
    opacity: 1,
    shaftWidth: 0.055,
    headLength: 0.18,
    headWidth: 0.15,
  },
});

const alphaRay = createVector2D({
  name: "angle-difference-alpha-ray",
  start: ORIGIN,
  end: [Math.cos(ALPHA), Math.sin(ALPHA)],
  style: {
    color: HUES.magenta.light,
    opacity: 1,
    shaftWidth: 0.055,
    headLength: 0.18,
    headWidth: 0.15,
  },
});

const betaSector = createAngleSector2D({
  name: "angle-difference-beta-sector",
  center: ORIGIN,
  startAngle: 0,
  endAngle: BETA,
  direction: "counterclockwise",
  radius: BETA_SECTOR_RADIUS,
  segments: 120,
  fill: HUES.cyan.base,
  fillOpacity: BETA_BASE_FILL_OPACITY,
  outline: null,
  outlineOpacity: 0,
});

const alphaSector = createAngleSector2D({
  name: "angle-difference-alpha-sector",
  center: ORIGIN,
  startAngle: 0,
  endAngle: ALPHA,
  direction: "counterclockwise",
  radius: ALPHA_SECTOR_RADIUS,
  segments: 140,
  fill: HUES.gold.base,
  fillOpacity: ALPHA_BASE_FILL_OPACITY,
  outline: null,
  outlineOpacity: 0,
});

const differenceSector = createAngleSector2D({
  name: "angle-difference-difference-sector",
  center: ORIGIN,
  startAngle: BETA,
  endAngle: ALPHA,
  direction: "counterclockwise",
  radius: DIFFERENCE_SECTOR_RADIUS,
  segments: 120,
  fill: HUES.purple.base,
  fillOpacity: DIFFERENCE_FILL_OPACITY,
  outline: HUES.purple.light,
  outlineOpacity: 0.82,
});

const alphaLabel = createTextLabel2D({
  name: "angle-difference-alpha-label",
  text: "α",
  position: [0, 0],
  anchor: [0.5, 0.5],
  color: "rgba(255, 242, 196, 0.98)",
  fontSizePx: 15,
  fontWeight: 760,
  background: "rgba(51, 38, 17, 0.78)",
  border: "1px solid rgba(255, 222, 132, 0.18)",
  borderRadiusPx: 7,
  padding: "0.14rem 0.34rem",
});

const betaLabel = createTextLabel2D({
  name: "angle-difference-beta-label",
  text: "β",
  position: [0, 0],
  anchor: [0.5, 0.5],
  color: "rgba(220, 248, 255, 0.98)",
  fontSizePx: 15,
  fontWeight: 760,
  background: "rgba(18, 38, 49, 0.78)",
  border: "1px solid rgba(130, 230, 255, 0.18)",
  borderRadiusPx: 7,
  padding: "0.14rem 0.34rem",
});

const differenceLabel = createTextLabel2D({
  name: "angle-difference-difference-label",
  text: "α − β",
  position: [0, 0],
  anchor: [0.5, 0.5],
  color: "rgba(240, 229, 255, 0.98)",
  fontSizePx: 15,
  fontWeight: 760,
  background: "rgba(32, 21, 54, 0.82)",
  border: "1px solid rgba(201, 177, 255, 0.18)",
  borderRadiusPx: 7,
  padding: "0.14rem 0.34rem",
});

const connectingSegment = createProofSegment2D({
  name: "angle-difference-connecting-segment",
  color: HUES.mint.light,
  width: 2.7,
  opacity: 0.98,
});

const endpointCircleCurve = (parameter: number): Vec2Tuple => [
  Math.cos(parameter),
  Math.sin(parameter),
];

const betaEndpointMarker = createParametricShape2D({
  name: "angle-difference-beta-endpoint-marker",
  curve: endpointCircleCurve,
  domain: [0, TAU],
  segments: 72,
  style: {
    outline: HUES.cyan.soft,
    outlineWidth: 1.6,
    outlineOpacity: 1,
    fill: HUES.cyan.base,
    fillOpacity: 0.98,
  },
})
  .resizeTo(0.05)
  .moveTo(Math.cos(BETA), Math.sin(BETA));

const alphaEndpointMarker = createParametricShape2D({
  name: "angle-difference-alpha-endpoint-marker",
  curve: endpointCircleCurve,
  domain: [0, TAU],
  segments: 72,
  style: {
    outline: HUES.magenta.soft,
    outlineWidth: 1.6,
    outlineOpacity: 1,
    fill: HUES.magenta.base,
    fillOpacity: 0.98,
  },
})
  .resizeTo(0.05)
  .moveTo(Math.cos(ALPHA), Math.sin(ALPHA));

betaEndpointMarker.position.z = 0.08;
alphaEndpointMarker.position.z = 0.08;

const betaCoordinateLabel = createTextLabel2D({
  name: "angle-difference-beta-coordinate-label",
  text: "(cos β, sin β)",
  position: [0, 0],
  anchor: [0, 1],
  color: "rgba(222, 250, 255, 0.98)",
  fontSizePx: 13,
  fontWeight: 650,
  background: "rgba(15, 24, 40, 0.82)",
  border: "1px solid rgba(111, 232, 255, 0.25)",
  borderRadiusPx: 8,
  padding: "0.18rem 0.34rem",
});

const alphaCoordinateLabel = createTextLabel2D({
  name: "angle-difference-alpha-coordinate-label",
  text: "(cos α, sin α)",
  position: [0, 0],
  anchor: [0, 1],
  color: "rgba(255, 228, 245, 0.98)",
  fontSizePx: 13,
  fontWeight: 650,
  background: "rgba(40, 15, 31, 0.82)",
  border: "1px solid rgba(255, 151, 212, 0.25)",
  borderRadiusPx: 8,
  padding: "0.18rem 0.34rem",
});

scene.add(
  coordinatePlane,
  unitCircle,
  alphaSector,
  betaSector,
  differenceSector,
  betaRay,
  alphaRay,
  connectingSegment,
  betaEndpointMarker,
  alphaEndpointMarker,
  alphaLabel,
  betaLabel,
  differenceLabel,
  betaCoordinateLabel,
  alphaCoordinateLabel,
);

let rotationAmount = 0;
let isDraggingSegment = false;
let dragPointerAngleOffset = 0;
let hoveredEndpoint: "beta" | "alpha" | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeAngle(angle: number): number {
  return ((angle % TAU) + TAU) % TAU;
}

function getBetaAngle(): number {
  return BETA - rotationAmount;
}

function getAlphaAngle(): number {
  return ALPHA - rotationAmount;
}

function getTransitionProgress(): number {
  return clamp(rotationAmount / BETA, 0, 1);
}

function isAtInitialState(): boolean {
  return rotationAmount <= EXTREME_EPSILON;
}

function isAtFinalState(): boolean {
  return Math.abs(rotationAmount - BETA) <= EXTREME_EPSILON;
}

function getEndpointOnUnitCircle(angle: number): Vec2Tuple {
  return [Math.cos(angle), Math.sin(angle)];
}

function getMidAngle(): number {
  return (ALPHA + BETA) / 2 - rotationAmount;
}

function getCurrentEndpoints(): { betaPoint: Vec2Tuple; alphaPoint: Vec2Tuple } {
  return {
    betaPoint: getEndpointOnUnitCircle(getBetaAngle()),
    alphaPoint: getEndpointOnUnitCircle(getAlphaAngle()),
  };
}

function updateCoordinateLabelPosition(
  label: ReturnType<typeof createTextLabel2D>,
  point: Vec2Tuple,
): void {
  const horizontalSign = point[0] >= 0 ? 1 : -1;
  const verticalSign = point[1] >= 0 ? 1 : -1;
  const offset = 0.13;

  label
    .moveTo(
      point[0] + horizontalSign * offset,
      point[1] + verticalSign * offset,
    )
    .setAnchor([
      horizontalSign > 0 ? 0 : 1,
      verticalSign > 0 ? 1 : 0,
    ]);
}

function updateEndpointLabels(betaPoint: Vec2Tuple, alphaPoint: Vec2Tuple): void {
  if (isAtInitialState()) {
    betaCoordinateLabel.setText("(cos β, sin β)");
    alphaCoordinateLabel.setText("(cos α, sin α)");
  } else if (isAtFinalState()) {
    betaCoordinateLabel.setText("(1, 0)");
    alphaCoordinateLabel.setText("(cos(α − β), sin(α − β))");
  }

  updateCoordinateLabelPosition(betaCoordinateLabel, betaPoint);
  updateCoordinateLabelPosition(alphaCoordinateLabel, alphaPoint);
}

function updateSceneGeometry(): void {
  const betaAngle = getBetaAngle();
  const alphaAngle = getAlphaAngle();
  const progress = getTransitionProgress();
  const fade = 1 - progress;

  const { betaPoint, alphaPoint } = getCurrentEndpoints();

  betaRay.setEnd(betaPoint);
  alphaRay.setEnd(alphaPoint);
  connectingSegment.setEndpoints(betaPoint, alphaPoint);

  betaSector.setAngles(0, betaAngle);
  alphaSector.setAngles(0, alphaAngle);
  differenceSector.setAngles(betaAngle, alphaAngle);

  betaSector.setFillOpacity(BETA_BASE_FILL_OPACITY * fade);
  alphaSector.setFillOpacity(ALPHA_BASE_FILL_OPACITY * fade);
  differenceSector.setFillOpacity(DIFFERENCE_FILL_OPACITY);

  betaEndpointMarker.moveTo(betaPoint[0], betaPoint[1]);
  alphaEndpointMarker.moveTo(alphaPoint[0], alphaPoint[1]);

  const betaLabelPosition = betaSector.getLabelPosition(1.3);
  betaLabel
    .moveTo(betaLabelPosition[0], betaLabelPosition[1])
    .setOpacity(fade);

  const alphaLabelPosition = alphaSector.getLabelPosition(1.22);
  alphaLabel
    .moveTo(alphaLabelPosition[0], alphaLabelPosition[1])
    .setOpacity(fade);

  const differenceLabelPosition = differenceSector.getLabelPosition(1.3);
  differenceLabel.moveTo(
    differenceLabelPosition[0],
    differenceLabelPosition[1],
  );

  updateEndpointLabels(betaPoint, alphaPoint);

  const extreme = isAtInitialState() || isAtFinalState();

  if (extreme) {
    betaEndpointMarker.show();
    alphaEndpointMarker.show();
  } else {
    betaEndpointMarker.hide();
    alphaEndpointMarker.hide();
    betaCoordinateLabel.hide();
    alphaCoordinateLabel.hide();
    hoveredEndpoint = null;
  }

  if (extreme && !isDraggingSegment) {
    if (hoveredEndpoint === "beta") {
      betaCoordinateLabel.show();
    } else {
      betaCoordinateLabel.hide();
    }

    if (hoveredEndpoint === "alpha") {
      alphaCoordinateLabel.show();
    } else {
      alphaCoordinateLabel.hide();
    }
  } else if (!isDraggingSegment) {
    betaCoordinateLabel.hide();
    alphaCoordinateLabel.hide();
  }
}

function getWorldPointFromPointer(event: PointerEvent): Vec2Tuple {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left - rect.width / 2) / UNIT_SIZE_PIXELS;
  const y = (rect.height / 2 - (event.clientY - rect.top)) / UNIT_SIZE_PIXELS;
  return [x, y];
}

function distance(a: Vec2Tuple, b: Vec2Tuple): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function distancePointToSegment(point: Vec2Tuple, a: Vec2Tuple, b: Vec2Tuple): number {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const abLengthSquared = abx * abx + aby * aby;

  if (abLengthSquared <= 1e-10) {
    return distance(point, a);
  }

  const apx = point[0] - a[0];
  const apy = point[1] - a[1];
  const t = clamp((apx * abx + apy * aby) / abLengthSquared, 0, 1);
  const closest: Vec2Tuple = [a[0] + t * abx, a[1] + t * aby];

  return distance(point, closest);
}

function detectHoveredEndpoint(worldPoint: Vec2Tuple): "beta" | "alpha" | null {
  if (!(isAtInitialState() || isAtFinalState())) {
    return null;
  }

  const { betaPoint, alphaPoint } = getCurrentEndpoints();

  if (distance(worldPoint, betaPoint) <= ENDPOINT_HIT_RADIUS_WORLD) {
    return "beta";
  }

  if (distance(worldPoint, alphaPoint) <= ENDPOINT_HIT_RADIUS_WORLD) {
    return "alpha";
  }

  return null;
}

function isPointerNearSegment(worldPoint: Vec2Tuple): boolean {
  const { betaPoint, alphaPoint } = getCurrentEndpoints();
  return distancePointToSegment(worldPoint, betaPoint, alphaPoint) <= SEGMENT_HIT_RADIUS_WORLD;
}

function updateHoverState(event: PointerEvent): void {
  if (isDraggingSegment) {
    canvas.style.cursor = "grabbing";
    return;
  }

  const worldPoint = getWorldPointFromPointer(event);
  hoveredEndpoint = detectHoveredEndpoint(worldPoint);

  if (hoveredEndpoint !== null) {
    canvas.style.cursor = "pointer";
  } else if (isPointerNearSegment(worldPoint)) {
    canvas.style.cursor = "grab";
  } else {
    canvas.style.cursor = "default";
  }

  updateSceneGeometry();
}

function beginDragging(event: PointerEvent): void {
  const worldPoint = getWorldPointFromPointer(event);
  hoveredEndpoint = detectHoveredEndpoint(worldPoint);

  if (hoveredEndpoint === null && !isPointerNearSegment(worldPoint)) {
    return;
  }

  isDraggingSegment = true;
  betaCoordinateLabel.hide();
  alphaCoordinateLabel.hide();

  const pointerAngle = normalizeAngle(Math.atan2(worldPoint[1], worldPoint[0]));
  dragPointerAngleOffset = pointerAngle - getMidAngle();

  canvas.setPointerCapture(event.pointerId);
  canvas.style.cursor = "grabbing";
}

function dragSegment(event: PointerEvent): void {
  if (!isDraggingSegment) {
    updateHoverState(event);
    return;
  }

  const worldPoint = getWorldPointFromPointer(event);

  if (Math.hypot(worldPoint[0], worldPoint[1]) <= 1e-8) {
    return;
  }

  const pointerAngle = normalizeAngle(Math.atan2(worldPoint[1], worldPoint[0]));
  const desiredMidAngle = pointerAngle - dragPointerAngleOffset;
  rotationAmount = clamp((ALPHA + BETA) / 2 - desiredMidAngle, 0, BETA);

  updateSceneGeometry();
}

function endDragging(event?: PointerEvent): void {
  if (!isDraggingSegment) {
    return;
  }

  if (event) {
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore release failures when no capture is active.
    }
  }

  isDraggingSegment = false;
  hoveredEndpoint = null;
  canvas.style.cursor = "default";
  updateSceneGeometry();
}

canvas.addEventListener("pointerdown", beginDragging);
canvas.addEventListener("pointermove", dragSegment);
canvas.addEventListener("pointerup", endDragging);
canvas.addEventListener("pointercancel", endDragging);
canvas.addEventListener("pointerleave", () => {
  if (!isDraggingSegment) {
    hoveredEndpoint = null;
    canvas.style.cursor = "default";
    updateSceneGeometry();
  }
});

updateSceneGeometry();

Object.assign(window, {
  angleDifferenceRotationScene: {
    scene,
    coordinatePlane,
    unitCircle,
    betaRay,
    alphaRay,
    betaSector,
    alphaSector,
    differenceSector,
    labels: {
      alphaLabel,
      betaLabel,
      differenceLabel,
      betaCoordinateLabel,
      alphaCoordinateLabel,
    },
    connectingSegment,
    setProgress(progress: number) {
      rotationAmount = clamp(progress, 0, 1) * BETA;
      hoveredEndpoint = null;
      updateSceneGeometry();
    },
    getProgress() {
      return getTransitionProgress();
    },
  },
});

const destroy = (): void => {
  canvas.removeEventListener("pointerdown", beginDragging);
  canvas.removeEventListener("pointermove", dragSegment);
  canvas.removeEventListener("pointerup", endDragging);
  canvas.removeEventListener("pointercancel", endDragging);
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
