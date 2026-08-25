import {
  HUES,
  PointDragController2D,
  createAngleSector2D,
  createCoordinatePlane2D,
  createDimensionBrace2D,
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
const UNIT_RADIUS = 1;
const UNIT_SIZE_PIXELS = 200;
const EPSILON = 1e-8;
const ORIGIN: Vec2Tuple = [0, 0];

type MeasurementDisplayMode = "raw" | "platonic";
type TrigViewMode =
  | "coordinates"
  | "lower-triangle"
  | "upper-triangle"
  | "all-triangles";

const DEFAULT_MEASUREMENT_DISPLAY_MODE: MeasurementDisplayMode = "platonic";
const DEFAULT_VIEW_MODE: TrigViewMode = "coordinates";

const MEASUREMENT_DISPLAY = {
  raw: {
    angleDecimals: 1,
  },

  platonic: {
    angleStepDegrees: 1,
  },
} as const;

const VIEW_MODE_ORDER: readonly TrigViewMode[] = [
  "coordinates",
  "lower-triangle",
  "upper-triangle",
  "all-triangles",
] as const;

const VIEW_MODE_LABEL: Record<TrigViewMode, string> = {
  coordinates: "Coordinates",
  "lower-triangle": "Lower triangle",
  "upper-triangle": "Upper triangle",
  "all-triangles": "All braces",
};

let measurementDisplayMode: MeasurementDisplayMode =
  DEFAULT_MEASUREMENT_DISPLAY_MODE;

let currentViewMode: TrigViewMode = DEFAULT_VIEW_MODE;

const canvas = document.querySelector<HTMLCanvasElement>(
  "#about-trig-scene",
);

if (!canvas) {
  throw new Error(
    "The trigonometric demonstration canvas could not be found.",
  );
}

const scene = createMathScene2D(canvas, {
  unitSizePixels: UNIT_SIZE_PIXELS,
  center: [0, 0],
  background: null,
});

const coordinatePlane = createCoordinatePlane2D({
  name: "trigonometric-coordinate-plane",
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

const lowerHorizontal = createProofSegment2D({
  name: "trig-lower-horizontal",
  color: HUES.mint.light,
  width: 2.2,
  opacity: 0.9,
});

const lowerVertical = createProofSegment2D({
  name: "trig-lower-vertical",
  color: HUES.mint.light,
  width: 2.2,
  opacity: 0.9,
});

const upperVertical = createProofSegment2D({
  name: "trig-upper-vertical",
  color: HUES.blue.light,
  width: 2.2,
  opacity: 0.9,
});

const upperHorizontal = createProofSegment2D({
  name: "trig-upper-horizontal",
  color: HUES.blue.light,
  width: 2.2,
  opacity: 0.9,
});

const braceStyleLower = {
  color: HUES.mint.light,
  width: 3.3,
  opacity: 0.95,
  offset: 0.16,
  hookDepth: 0.16,
  cuspDepth: 0.13,
  samples: 96,
} as const;

const braceStyleUpper = {
  color: HUES.blue.light,
  width: 3.3,
  opacity: 0.95,
  offset: 0.16,
  hookDepth: 0.16,
  cuspDepth: 0.13,
  samples: 96,
} as const;

const braceLabelStyleLower = {
  color: "rgba(221, 255, 242, 0.98)",
  fontSizePx: 17,
  fontWeight: 760,
  background: "rgba(17, 46, 38, 0.82)",
  border: "1px solid rgba(136, 242, 206, 0.20)",
  borderRadiusPx: 7,
  padding: "0.08rem 0.28rem",
  offset: 0.12,
} as const;

const braceLabelStyleUpper = {
  color: "rgba(225, 236, 255, 0.98)",
  fontSizePx: 17,
  fontWeight: 760,
  background: "rgba(17, 29, 52, 0.82)",
  border: "1px solid rgba(144, 178, 255, 0.20)",
  borderRadiusPx: 7,
  padding: "0.08rem 0.28rem",
  offset: 0.12,
} as const;

const lowerCosBrace = createDimensionBrace2D({
  name: "trig-lower-cos-brace",
  start: [0, 0],
  end: [1, 0],
  referencePoint: [0, 1],
  side: "away-from-reference",
  style: braceStyleLower,
  label: {
    latex: String.raw`\cos 30^{\circ}`,
    style: braceLabelStyleLower,
  },
});

const lowerSinBrace = createDimensionBrace2D({
  name: "trig-lower-sin-brace",
  start: [1, 0],
  end: [1, 1],
  referencePoint: [0, 0],
  side: "away-from-reference",
  style: braceStyleLower,
  label: {
    latex: String.raw`\sin 30^{\circ}`,
    style: braceLabelStyleLower,
  },
});

const upperSinBrace = createDimensionBrace2D({
  name: "trig-upper-sin-brace",
  start: [0, 0],
  end: [0, 1],
  referencePoint: [1, 0],
  side: "away-from-reference",
  style: braceStyleUpper,
  label: {
    latex: String.raw`\sin 30^{\circ}`,
    style: braceLabelStyleUpper,
  },
});

const upperCosBrace = createDimensionBrace2D({
  name: "trig-upper-cos-brace",
  start: [0, 1],
  end: [1, 1],
  referencePoint: [0, 0],
  side: "away-from-reference",
  style: braceStyleUpper,
  label: {
    latex: String.raw`\cos 30^{\circ}`,
    style: braceLabelStyleUpper,
  },
});

scene.add(
  coordinatePlane,
  unitCircle,
  angleSector,
  lowerHorizontal,
  lowerVertical,
  upperVertical,
  upperHorizontal,
  lowerCosBrace,
  lowerSinBrace,
  upperSinBrace,
  upperCosBrace,
  unitVector,
  angleLabel,
  coordinateLabel,
);

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

function setSegmentVisible(
  segment: ReturnType<typeof createProofSegment2D>,
  start: Vec2Tuple,
  end: Vec2Tuple,
): void {
  if (Math.hypot(end[0] - start[0], end[1] - start[1]) <= EPSILON) {
    segment.hide();
    return;
  }

  segment
    .setEndpoints(start, end)
    .show();
}

function setBraceVisible(
  brace: ReturnType<typeof createDimensionBrace2D>,
  start: Vec2Tuple,
  end: Vec2Tuple,
  referencePoint: Vec2Tuple,
): void {
  if (Math.hypot(end[0] - start[0], end[1] - start[1]) <= EPSILON) {
    brace.hide();
    return;
  }

  brace
    .setEndpoints(start, end)
    .setReferencePoint(referencePoint)
    .show()
    .showCompleteBrace()
    .setLabelOpacity(1);
}

function hideLowerTriangleObjects(): void {
  lowerHorizontal.hide();
  lowerVertical.hide();
  lowerCosBrace.hide();
  lowerSinBrace.hide();
}

function hideUpperTriangleObjects(): void {
  upperVertical.hide();
  upperHorizontal.hide();
  upperSinBrace.hide();
  upperCosBrace.hide();
}

function applyViewMode(
  tip: Vec2Tuple,
): void {
  const lowerFoot: Vec2Tuple = [tip[0], 0];
  const upperFoot: Vec2Tuple = [0, tip[1]];

  coordinateLabel.hide();
  hideLowerTriangleObjects();
  hideUpperTriangleObjects();

  switch (currentViewMode) {
    case "coordinates": {
      coordinateLabel.show();
      break;
    }

    case "lower-triangle": {
      setSegmentVisible(lowerHorizontal, ORIGIN, lowerFoot);
      setSegmentVisible(lowerVertical, lowerFoot, tip);
      setBraceVisible(lowerCosBrace, ORIGIN, lowerFoot, tip);
      setBraceVisible(lowerSinBrace, lowerFoot, tip, ORIGIN);
      break;
    }

    case "upper-triangle": {
      setSegmentVisible(upperVertical, ORIGIN, upperFoot);
      setSegmentVisible(upperHorizontal, upperFoot, tip);
      setBraceVisible(upperSinBrace, ORIGIN, upperFoot, tip);
      setBraceVisible(upperCosBrace, upperFoot, tip, ORIGIN);
      break;
    }

    case "all-triangles": {
      setSegmentVisible(lowerHorizontal, ORIGIN, lowerFoot);
      setSegmentVisible(lowerVertical, lowerFoot, tip);
      setSegmentVisible(upperVertical, ORIGIN, upperFoot);
      setSegmentVisible(upperHorizontal, upperFoot, tip);

      setBraceVisible(lowerCosBrace, ORIGIN, lowerFoot, tip);
      setBraceVisible(lowerSinBrace, lowerFoot, tip, ORIGIN);
      setBraceVisible(upperSinBrace, ORIGIN, upperFoot, tip);
      setBraceVisible(upperCosBrace, upperFoot, tip, ORIGIN);
      break;
    }
  }
}

function updateBraceLabels(
  degreesText: string,
): void {
  const angleLatex =
    `${degreesText}^{\\circ}`;

  lowerCosBrace.setLabelLatex(
    `\\cos ${angleLatex}`,
  );

  lowerSinBrace.setLabelLatex(
    `\\sin ${angleLatex}`,
  );

  upperSinBrace.setLabelLatex(
    `\\sin ${angleLatex}`,
  );

  upperCosBrace.setLabelLatex(
    `\\cos ${angleLatex}`,
  );
}

function displayAngle(angleRadians: number): void {
  currentAngle = normalizeAngle(angleRadians);

  const tip: Vec2Tuple = [
    Math.cos(currentAngle),
    Math.sin(currentAngle),
  ];

  const degreesText =
    formatDisplayedDegrees(currentAngle);

  updateBraceLabels(
    degreesText,
  );

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
  applyViewMode(tip);
}

function setViewMode(
  mode: TrigViewMode,
): void {
  currentViewMode = mode;
  updateModeButtonText();
  displayAngle(currentAngle);
}

function cycleViewMode(): void {
  const currentIndex = VIEW_MODE_ORDER.indexOf(currentViewMode);
  const nextIndex =
    (currentIndex + 1) % VIEW_MODE_ORDER.length;

  setViewMode(VIEW_MODE_ORDER[nextIndex]);
}

const controlsHost = canvas.parentElement ?? canvas;
const previousHostPosition = controlsHost.style.position;

if (getComputedStyle(controlsHost).position === "static") {
  controlsHost.style.position = "relative";
}

const modeButton = document.createElement("button");
modeButton.type = "button";
modeButton.setAttribute("aria-label", "Switch trigonometric view mode");
modeButton.style.position = "absolute";
modeButton.style.top = "0.65rem";
modeButton.style.right = "0.65rem";
modeButton.style.zIndex = "20";
modeButton.style.padding = "0.45rem 0.7rem";
modeButton.style.borderRadius = "10px";
modeButton.style.border = "1px solid rgba(166, 221, 255, 0.28)";
modeButton.style.background = "rgba(11, 20, 35, 0.84)";
modeButton.style.color = "rgba(232, 246, 255, 0.98)";
modeButton.style.font = "600 0.9rem system-ui, sans-serif";
modeButton.style.cursor = "pointer";
modeButton.style.backdropFilter = "blur(8px)";
modeButton.style.boxShadow = "0 8px 22px rgba(0, 0, 0, 0.2)";

function updateModeButtonText(): void {
  modeButton.textContent = `Mode: ${VIEW_MODE_LABEL[currentViewMode]}`;
}

modeButton.addEventListener("click", cycleViewMode);
controlsHost.appendChild(modeButton);
updateModeButtonText();

displayAngle(currentAngle);

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

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(value: number): number {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

const INTRO_START_VISIBILITY_RATIO = 0.15;

let introStarted = false;
let introStartTime: number | null = null;
let stopIntro = (): void => {};
let introObserver: IntersectionObserver | null = null;

function startIntro(): void {
  if (introStarted) {
    return;
  }

  introStarted = true;
  introStartTime = null;

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
}

if (
  typeof IntersectionObserver === "function"
) {
  introObserver =
    new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (
            entry.target === canvas &&
            entry.isIntersecting &&
            entry.intersectionRatio >=
              INTRO_START_VISIBILITY_RATIO
          ) {
            startIntro();
            introObserver?.disconnect();
            introObserver = null;
            break;
          }
        }
      },
      {
        threshold: [
          0,
          INTRO_START_VISIBILITY_RATIO,
          0.5,
          1,
        ],
      },
    );

  introObserver.observe(canvas);
} else {
  startIntro();
}

Object.assign(window, {
  mathTrigViewModesDemo: {
    scene,
    coordinatePlane,
    unitCircle,
    unitVector,
    angleSector,
    angleLabel,
    coordinateLabel,
    lowerHorizontal,
    lowerVertical,
    upperVertical,
    upperHorizontal,
    braces: {
      lowerCosBrace,
      lowerSinBrace,
      upperSinBrace,
      upperCosBrace,
    },
    button: modeButton,

    setAngleDegrees(degrees: number) {
      displayAngle(degrees * Math.PI / 180);
    },

    viewModes: {
      getMode(): TrigViewMode {
        return currentViewMode;
      },

      setMode(mode: TrigViewMode) {
        setViewMode(mode);
      },

      cycle() {
        cycleViewMode();
      },
    },

    measurements: {
      getMode(): MeasurementDisplayMode {
        return measurementDisplayMode;
      },

      setMode(mode: MeasurementDisplayMode) {
        measurementDisplayMode = mode;
        displayAngle(currentAngle);
      },
    },
  },
});

const destroy = (): void => {
  introObserver?.disconnect();
  introObserver = null;
  stopIntro();
  dragging.destroy();
  modeButton.removeEventListener("click", cycleViewMode);
  modeButton.remove();

  if (getComputedStyle(controlsHost).position === "relative") {
    controlsHost.style.position = previousHostPosition;
  }

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
