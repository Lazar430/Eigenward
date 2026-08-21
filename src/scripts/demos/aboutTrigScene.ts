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
const UNIT_SIZE_PIXELS = 120;
const ORIGIN: Vec2Tuple = [0, 0];

/* -------------------------------------------------------------------------- */
/* Measurement display                                                        */
/* -------------------------------------------------------------------------- */

type MeasurementDisplayMode = "raw" | "platonic";

const DEFAULT_MEASUREMENT_DISPLAY_MODE: MeasurementDisplayMode = "platonic";

const MEASUREMENT_DISPLAY = {
  raw: {
    angleDecimals: 1,
  },

  platonic: {
    /**
     * Display angles as multiples of this many degrees.
     *
     * 1 -> whole degrees
     * 5 -> multiples of 5°
     * 10 -> multiples of 10°
     */
    angleStepDegrees: 1,
  },
} as const;

let measurementDisplayMode: MeasurementDisplayMode =
  DEFAULT_MEASUREMENT_DISPLAY_MODE;

/* -------------------------------------------------------------------------- */
/* Scene                                                                      */
/* -------------------------------------------------------------------------- */

const canvas = document.querySelector<HTMLCanvasElement>(
  "#about-trig-scene",
);

if (!canvas) {
  throw new Error(
    "The trigonometric demonstration canvas could not be found.",
  );
}

/*
 * Keep the trigonometric circle mathematically unit-sized (radius = 1), but
 * make one mathematical unit occupy more screen space.
 *
 * Increase/decrease UNIT_SIZE_PIXELS to zoom the mathematical scale without
 * changing any coordinates or the meaning of the unit circle.
 */
const scene = createMathScene2D(canvas, {
  unitSizePixels: UNIT_SIZE_PIXELS,
  center: [0, 0],
  background: null,
});

const coordinatePlane = createCoordinatePlane2D({
  name: "trigonometric-coordinate-plane",
  /*
   * Responsive mode: derive the visible grid/axes from the scene camera.
   * This is important when unitSizePixels is used; fixed xRange/yRange would
   * leave axis arrowheads outside a zoomed-in viewport.
   */
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

/* -------------------------------------------------------------------------- */
/* Angle state                                                                */
/* -------------------------------------------------------------------------- */

/**
 * This always stores the real geometric angle.
 *
 * Platonic mode affects only what the user sees in labels;
 * the vector itself remains perfectly smooth while dragging.
 */
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
  end: [
    Math.cos(currentAngle),
    Math.sin(currentAngle),
  ],
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

/* -------------------------------------------------------------------------- */
/* Angle formatting                                                           */
/* -------------------------------------------------------------------------- */

function normalizeAngle(angle: number): number {
  const normalized = ((angle % TAU) + TAU) % TAU;

  return Math.abs(normalized - TAU) < 1e-10
    ? 0
    : normalized;
}

function radiansToDegrees(angleRadians: number): number {
  return normalizeAngle(angleRadians) * 180 / Math.PI;
}

function quantizeDegrees(
  degrees: number,
  stepDegrees: number,
): number {
  if (!(stepDegrees > 0) || !Number.isFinite(stepDegrees)) {
    return degrees;
  }

  const quantized =
    Math.round(degrees / stepDegrees) * stepDegrees;

  /**
   * 359.8° should reasonably become 360° in Platonic mode.
   *
   * Unlike the geometric angle, this is only display text, so showing
   * 360° here is preferable to wrapping it immediately to 0°.
   */
  return Math.max(0, Math.min(360, quantized));
}

function getDisplayedDegrees(angleRadians: number): number {
  const rawDegrees = radiansToDegrees(angleRadians);

  if (measurementDisplayMode === "raw") {
    return rawDegrees;
  }

  return quantizeDegrees(
    rawDegrees,
    MEASUREMENT_DISPLAY.platonic.angleStepDegrees,
  );
}

function formatDisplayedDegrees(
  angleRadians: number,
): string {
  const degrees = getDisplayedDegrees(angleRadians);

  if (measurementDisplayMode === "platonic") {
    return String(Math.round(degrees));
  }

  const decimals = MEASUREMENT_DISPLAY.raw.angleDecimals;
  const factor = 10 ** decimals;

  const rounded =
    Math.round(degrees * factor) / factor;

  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(decimals);
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                     */
/* -------------------------------------------------------------------------- */

function updateCoordinateLabelPosition(
  tip: Vec2Tuple,
): void {
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

/* -------------------------------------------------------------------------- */
/* Scene update                                                               */
/* -------------------------------------------------------------------------- */

function displayAngle(angleRadians: number): void {
  currentAngle = normalizeAngle(angleRadians);

  /*
   * Geometry always follows the real angle.
   */
  const tip: Vec2Tuple = [
    Math.cos(currentAngle),
    Math.sin(currentAngle),
  ];

  /*
   * Labels may instead show the idealized Platonic angle.
   */
  const degreesText =
    formatDisplayedDegrees(currentAngle);

  unitVector.setEnd(tip);
  angleSector.setAngles(0, currentAngle);

  const angleLabelPosition =
    angleSector.getLabelPosition(0.66);

  angleLabel
    .setText(`${degreesText}°`)
    .moveTo(
      angleLabelPosition[0],
      angleLabelPosition[1],
    );

  coordinateLabel.setText(
    `(cos ${degreesText}°, sin ${degreesText}°)`,
  );

  updateCoordinateLabelPosition(tip);
}

displayAngle(currentAngle);

/* -------------------------------------------------------------------------- */
/* Dragging                                                                   */
/* -------------------------------------------------------------------------- */

const dragging = new PointDragController2D(scene);

dragging.registerPoint({
  getPosition: () => unitVector.getEnd(),

  onDrag: (pointerPosition) => {
    const dx =
      pointerPosition[0] - ORIGIN[0];

    const dy =
      pointerPosition[1] - ORIGIN[1];

    if (Math.hypot(dx, dy) < 1e-8) {
      return;
    }

    displayAngle(Math.atan2(dy, dx));
  },

  hitRadiusPixels: 26,
  hoverCursor: "grab",
});

/* -------------------------------------------------------------------------- */
/* Intro animation                                                            */
/* -------------------------------------------------------------------------- */

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

  const elapsed =
    (time - introStartTime) / 1000;

  const axisProgress =
    easeOutCubic(elapsed / 1.15);

  const integerProgress =
    easeOutCubic((elapsed - 0.95) / 0.9);

  coordinatePlane.setAxisReveal(axisProgress);
  coordinatePlane.setIntegerReveal(integerProgress);

  if (
    axisProgress >= 1 &&
    integerProgress >= 1
  ) {
    stopIntro();
  }
});

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

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

    measurements: {
      getMode(): MeasurementDisplayMode {
        return measurementDisplayMode;
      },

      setMode(mode: MeasurementDisplayMode) {
        measurementDisplayMode = mode;

        /*
         * Geometry does not change. Only regenerate the annotations.
         */
        displayAngle(currentAngle);
      },
    },
  },
});

/* -------------------------------------------------------------------------- */
/* Cleanup                                                                    */
/* -------------------------------------------------------------------------- */

const destroy = (): void => {
  stopIntro();
  dragging.destroy();
  scene.destroy();
};

window.addEventListener(
  "pagehide",
  destroy,
  { once: true },
);

document.addEventListener(
  "astro:before-swap",
  destroy,
  { once: true },
);
