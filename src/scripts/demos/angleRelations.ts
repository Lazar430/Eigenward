import {
  HUES,
  PointDragController2D,
  createAngleSector2D,
  createMathScene2D,
  createParametricShape2D,
  createTextLabel2D,
  createVector2D,
  type Vec2Tuple,
} from "../math-graphics";

const TAU = Math.PI * 2;
const DEG = 180 / Math.PI;

type MeasurementDisplayMode = "raw" | "platonic";

const DEFAULT_MEASUREMENT_DISPLAY_MODE: MeasurementDisplayMode = "platonic";

const MEASUREMENT_DISPLAY = {
  raw: {
    angleDecimals: 1,
  },
  platonic: {
    minimumAngleDegrees: 1,
  },
} as const;

const canvas = document.querySelector<HTMLCanvasElement>(
  "#angle-relations-scene",
);

if (!canvas) {
  throw new Error("The angle-relations scene canvas could not be found.");
}

/*
 * Compared with the first version, the view is tighter and the constructions
 * themselves are larger. The three demonstrations still occupy independent
 * horizontal regions of the same canvas.
 */
const scene = createMathScene2D(canvas, {
  viewHeight: 7.2,
  center: [0, 0.15],
  background: null,
});

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function unitCircle(parameter: number): Vec2Tuple {
  return [Math.cos(parameter), Math.sin(parameter)];
}

function toDegrees(angleRadians: number): number {
  return angleRadians * DEG;
}

function formatRawAngle(angleDegrees: number): string {
  const decimals = MEASUREMENT_DISPLAY.raw.angleDecimals;
  const rounded = Number(angleDegrees.toFixed(decimals));
  return Number.isInteger(rounded)
    ? `${rounded.toFixed(0)}°`
    : `${rounded.toFixed(decimals)}°`;
}

/**
 * Move an atan2 angle onto the 2π branch nearest the previous angle.
 *
 * This is important for drag constraints: a pointer crossing atan2's -π/π
 * branch cut must hit the nearest angular boundary, not teleport to the
 * opposite boundary of the allowed interval.
 */
function unwrapAngleNear(angle: number, reference: number): number {
  let unwrapped = angle;

  while (unwrapped - reference > Math.PI) unwrapped -= TAU;
  while (unwrapped - reference < -Math.PI) unwrapped += TAU;

  return unwrapped;
}

/**
 * Integer rounding with exact total preservation and a minimum-angle bound.
 */
function quantizeAnglesToTotal(
  rawAnglesDegrees: readonly number[],
  totalDegrees: number,
  minimumAngleDegrees = 1,
): number[] {
  const count = rawAnglesDegrees.length;
  const minimumTotal = count * minimumAngleDegrees;
  const adjustedTarget = totalDegrees - minimumTotal;

  const shifted = rawAnglesDegrees.map((value) =>
    clamp(value - minimumAngleDegrees, 0, adjustedTarget),
  );

  const floors = shifted.map((value) => Math.floor(value));
  const remainders = shifted.map((value, index) => ({
    index,
    remainder: value - floors[index],
  }));

  const used = floors.reduce((sum, value) => sum + value, 0);
  const leftover = adjustedTarget - used;

  remainders.sort((a, b) => b.remainder - a.remainder);

  const values = [...floors];
  for (let index = 0; index < leftover; index += 1) {
    values[remainders[index % remainders.length].index] += 1;
  }

  return values.map((value) => value + minimumAngleDegrees);
}

function displayAngles(
  rawAnglesDegrees: readonly number[],
  totalDegrees: number,
  mode: MeasurementDisplayMode,
): number[] {
  if (mode === "raw") return [...rawAnglesDegrees];

  return quantizeAnglesToTotal(
    rawAnglesDegrees,
    totalDegrees,
    MEASUREMENT_DISPLAY.platonic.minimumAngleDegrees,
  );
}

function formatDisplayedAngle(
  angleDegrees: number,
  mode: MeasurementDisplayMode,
): string {
  if (mode === "raw") return formatRawAngle(angleDegrees);
  return `${Math.round(angleDegrees)}°`;
}

function pointAt(center: Vec2Tuple, radius: number, angle: number): Vec2Tuple {
  return [
    center[0] + radius * Math.cos(angle),
    center[1] + radius * Math.sin(angle),
  ];
}

function createSegment(name: string, color: string, width = 0.055) {
  return createVector2D({
    name,
    start: [0, 0],
    end: [0, 0],
    style: {
      color,
      opacity: 0.96,
      shaftWidth: width,
      headLength: 0,
      headWidth: 0,
    },
  });
}

function createHandle(name: string, color: string, initial: Vec2Tuple) {
  const handle = createParametricShape2D({
    name,
    curve: unitCircle,
    domain: [0, TAU],
    segments: 72,
    style: {
      outline: color,
      outlineWidth: 1.8,
      outlineOpacity: 1,
      fill: color,
      fillOpacity: 0.95,
    },
  })
    .resizeTo(0.125)
    .moveTo(initial[0], initial[1]);

  handle.position.z = 0.08;
  return handle;
}

function createAngleDisplay(
  name: string,
  fill: string,
  outline: string,
  labelColor: string,
  labelBackground: string,
  labelBorder: string,
) {
  const sector = createAngleSector2D({
    name: `${name}:sector`,
    center: [0, 0],
    startAngle: 0,
    endAngle: Math.PI / 3,
    direction: "counterclockwise",
    radius: 0.5,
    segments: 144,
    fill,
    fillOpacity: 0.24,
    outline,
    outlineOpacity: 0.88,
  });

  const label = createTextLabel2D({
    name: `${name}:label`,
    text: "",
    position: [0, 0],
    anchor: [0.5, 0.5],
    color: labelColor,
    fontSizePx: 14,
    fontWeight: 760,
    background: labelBackground,
    border: labelBorder,
    borderRadiusPx: 7,
    padding: "0.08rem 0.28rem",
  });

  function update(
    center: Vec2Tuple,
    startAngle: number,
    endAngle: number,
    direction: "clockwise" | "counterclockwise",
    radius: number,
    text: string,
    labelRadiusFactor = 1.45,
  ): void {
    sector
      .setCenter(center)
      .setRadius(radius)
      .setDirection(direction)
      .setAngles(startAngle, endAngle);

    const labelPosition = sector.getLabelPosition(labelRadiusFactor);
    label.setText(text).moveTo(labelPosition[0], labelPosition[1]);
  }

  return { sector, label, update };
}

const angleStyles = [
  {
    fill: HUES.cyan.base,
    outline: HUES.cyan.light,
    labelColor: "rgba(226, 248, 255, 0.98)",
    labelBackground: "rgba(14, 27, 34, 0.76)",
    labelBorder: "1px solid rgba(112, 231, 255, 0.18)",
  },
  {
    fill: HUES.magenta.base,
    outline: HUES.magenta.light,
    labelColor: "rgba(255, 228, 240, 0.98)",
    labelBackground: "rgba(45, 17, 34, 0.76)",
    labelBorder: "1px solid rgba(255, 154, 187, 0.18)",
  },
  {
    fill: HUES.gold.base,
    outline: HUES.gold.light,
    labelColor: "rgba(255, 241, 201, 0.98)",
    labelBackground: "rgba(50, 37, 14, 0.76)",
    labelBorder: "1px solid rgba(255, 226, 138, 0.18)",
  },
];

const modeState = {
  current: DEFAULT_MEASUREMENT_DISPLAY_MODE,
};

/* -------------------------------------------------------------------------- */
/* Layout                                                                     */
/* -------------------------------------------------------------------------- */

const supplementaryCenter: Vec2Tuple = [-3.75, 1.0];
const complementaryCenter: Vec2Tuple = [0, 1.0];
const aroundPointCenter: Vec2Tuple = [3.75, 1.0];

const titleY = 2.75;
const summaryY = -1.95;

/* -------------------------------------------------------------------------- */
/* Supplementary                                                              */
/* -------------------------------------------------------------------------- */

const suppBaseHalfLength = 1.72;
const suppRayLength = 1.62;
const suppMinAngle = 0.22;
let suppRayAngle = 1.08;

const suppLineLeft = createSegment("supplementary:left", HUES.cyan.soft, 0.062);
const suppLineRight = createSegment("supplementary:right", HUES.cyan.soft, 0.062);
const suppRay = createSegment("supplementary:ray", HUES.magenta.light, 0.062);

const suppHandle = createHandle(
  "supplementary:handle",
  HUES.magenta.light,
  pointAt(supplementaryCenter, suppRayLength, suppRayAngle),
);

const suppAngleLeft = createAngleDisplay(
  "supplementary:left-angle",
  angleStyles[0].fill,
  angleStyles[0].outline,
  angleStyles[0].labelColor,
  angleStyles[0].labelBackground,
  angleStyles[0].labelBorder,
);

const suppAngleRight = createAngleDisplay(
  "supplementary:right-angle",
  angleStyles[1].fill,
  angleStyles[1].outline,
  angleStyles[1].labelColor,
  angleStyles[1].labelBackground,
  angleStyles[1].labelBorder,
);

const suppTitle = createTextLabel2D({
  name: "supplementary:title",
  text: "Supplementary angles",
  position: [supplementaryCenter[0], titleY],
  anchor: [0.5, 0.5],
  color: "rgba(236, 242, 255, 0.98)",
  fontSizePx: 15,
  fontWeight: 800,
  background: "rgba(17, 14, 30, 0.72)",
  border: "1px solid rgba(160, 185, 255, 0.14)",
  borderRadiusPx: 8,
  padding: "0.14rem 0.38rem",
});

const suppSummary = createTextLabel2D({
  name: "supplementary:summary",
  text: "",
  position: [supplementaryCenter[0], summaryY],
  anchor: [0.5, 0.5],
  color: "rgba(236, 242, 255, 0.98)",
  fontSizePx: 13,
  fontWeight: 760,
  background: "rgba(17, 14, 30, 0.82)",
  border: "1px solid rgba(160, 185, 255, 0.14)",
  borderRadiusPx: 8,
  padding: "0.18rem 0.42rem",
});

function updateSupplementary(): void {
  const leftEnd: Vec2Tuple = [
    supplementaryCenter[0] - suppBaseHalfLength,
    supplementaryCenter[1],
  ];
  const rightEnd: Vec2Tuple = [
    supplementaryCenter[0] + suppBaseHalfLength,
    supplementaryCenter[1],
  ];
  const rayEnd = pointAt(supplementaryCenter, suppRayLength, suppRayAngle);

  suppLineLeft.setEndpoints(leftEnd, supplementaryCenter);
  suppLineRight.setEndpoints(supplementaryCenter, rightEnd);
  suppRay.setEndpoints(supplementaryCenter, rayEnd);
  suppHandle.moveTo(rayEnd[0], rayEnd[1]);

  const rawLeft = toDegrees(Math.PI - suppRayAngle);
  const rawRight = toDegrees(suppRayAngle);

  const displayed = displayAngles([rawLeft, rawRight], 180, modeState.current);

  const leftText = formatDisplayedAngle(displayed[0], modeState.current);
  const rightText = formatDisplayedAngle(displayed[1], modeState.current);

  suppAngleLeft.update(
    supplementaryCenter,
    suppRayAngle,
    Math.PI,
    "counterclockwise",
    0.72,
    leftText,
  );

  suppAngleRight.update(
    supplementaryCenter,
    0,
    suppRayAngle,
    "counterclockwise",
    0.56,
    rightText,
  );

  suppSummary.setText(`${leftText} + ${rightText} = 180°`);
}

/* -------------------------------------------------------------------------- */
/* Complementary                                                              */
/* -------------------------------------------------------------------------- */

const compArmLength = 1.68;
const compRayLength = 1.5;
const compMinAngle = 0.2;
let compRayAngle = 0.67;

const compArmRight = createSegment("complementary:right-arm", HUES.cyan.soft, 0.062);
const compArmUp = createSegment("complementary:up-arm", HUES.cyan.soft, 0.062);
const compRay = createSegment("complementary:ray", HUES.magenta.light, 0.062);

const compHandle = createHandle(
  "complementary:handle",
  HUES.magenta.light,
  pointAt(complementaryCenter, compRayLength, compRayAngle),
);

const compOuterRightAngle = createAngleSector2D({
  name: "complementary:outer-right-angle",
  center: complementaryCenter,
  startAngle: 0,
  endAngle: Math.PI / 2,
  direction: "counterclockwise",
  radius: 0.34,
  shape: "right-angle",
  fill: HUES.gold.base,
  fillOpacity: 0.08,
  outline: HUES.gold.light,
  outlineOpacity: 0.9,
});

const compAngleLower = createAngleDisplay(
  "complementary:lower-angle",
  angleStyles[0].fill,
  angleStyles[0].outline,
  angleStyles[0].labelColor,
  angleStyles[0].labelBackground,
  angleStyles[0].labelBorder,
);

const compAngleUpper = createAngleDisplay(
  "complementary:upper-angle",
  angleStyles[1].fill,
  angleStyles[1].outline,
  angleStyles[1].labelColor,
  angleStyles[1].labelBackground,
  angleStyles[1].labelBorder,
);

const compTitle = createTextLabel2D({
  name: "complementary:title",
  text: "Complementary angles",
  position: [complementaryCenter[0], titleY],
  anchor: [0.5, 0.5],
  color: "rgba(236, 242, 255, 0.98)",
  fontSizePx: 15,
  fontWeight: 800,
  background: "rgba(17, 14, 30, 0.72)",
  border: "1px solid rgba(160, 185, 255, 0.14)",
  borderRadiusPx: 8,
  padding: "0.14rem 0.38rem",
});

const compSummary = createTextLabel2D({
  name: "complementary:summary",
  text: "",
  position: [complementaryCenter[0], summaryY],
  anchor: [0.5, 0.5],
  color: "rgba(236, 242, 255, 0.98)",
  fontSizePx: 13,
  fontWeight: 760,
  background: "rgba(17, 14, 30, 0.82)",
  border: "1px solid rgba(160, 185, 255, 0.14)",
  borderRadiusPx: 8,
  padding: "0.18rem 0.42rem",
});

function updateComplementary(): void {
  const rightEnd: Vec2Tuple = [
    complementaryCenter[0] + compArmLength,
    complementaryCenter[1],
  ];
  const upEnd: Vec2Tuple = [
    complementaryCenter[0],
    complementaryCenter[1] + compArmLength,
  ];
  const rayEnd = pointAt(complementaryCenter, compRayLength, compRayAngle);

  compArmRight.setEndpoints(complementaryCenter, rightEnd);
  compArmUp.setEndpoints(complementaryCenter, upEnd);
  compRay.setEndpoints(complementaryCenter, rayEnd);
  compHandle.moveTo(rayEnd[0], rayEnd[1]);

  compOuterRightAngle
    .setCenter(complementaryCenter)
    .setRadius(0.34)
    .setDirection("counterclockwise")
    .setAngles(0, Math.PI / 2)
    .setShape("right-angle");

  const rawLower = toDegrees(compRayAngle);
  const rawUpper = 90 - rawLower;

  const displayed = displayAngles([rawLower, rawUpper], 90, modeState.current);

  const lowerText = formatDisplayedAngle(displayed[0], modeState.current);
  const upperText = formatDisplayedAngle(displayed[1], modeState.current);

  compAngleLower.update(
    complementaryCenter,
    0,
    compRayAngle,
    "counterclockwise",
    0.62,
    lowerText,
  );

  compAngleUpper.update(
    complementaryCenter,
    compRayAngle,
    Math.PI / 2,
    "counterclockwise",
    0.46,
    upperText,
    1.7,
  );

  compSummary.setText(`${lowerText} + ${upperText} = 90°`);
}

/* -------------------------------------------------------------------------- */
/* Angles around a point                                                      */
/* -------------------------------------------------------------------------- */

const aroundRayLength = 1.58;
const aroundBaseAngle = -Math.PI / 2;
const aroundMinGap = 0.33;
let aroundSweep1 = 2.25;
let aroundSweep2 = 4.55;

const aroundRayFixed = createSegment("around-point:fixed-ray", HUES.cyan.soft, 0.062);
const aroundRayFirst = createSegment("around-point:first-ray", HUES.magenta.light, 0.062);
const aroundRaySecond = createSegment("around-point:second-ray", HUES.gold.light, 0.062);

const aroundHandle1 = createHandle(
  "around-point:handle-1",
  HUES.magenta.light,
  pointAt(aroundPointCenter, aroundRayLength, aroundBaseAngle + aroundSweep1),
);

const aroundHandle2 = createHandle(
  "around-point:handle-2",
  HUES.gold.light,
  pointAt(aroundPointCenter, aroundRayLength, aroundBaseAngle + aroundSweep2),
);

const aroundAngle0 = createAngleDisplay(
  "around-point:angle-0",
  angleStyles[0].fill,
  angleStyles[0].outline,
  angleStyles[0].labelColor,
  angleStyles[0].labelBackground,
  angleStyles[0].labelBorder,
);

const aroundAngle1 = createAngleDisplay(
  "around-point:angle-1",
  angleStyles[1].fill,
  angleStyles[1].outline,
  angleStyles[1].labelColor,
  angleStyles[1].labelBackground,
  angleStyles[1].labelBorder,
);

const aroundAngle2 = createAngleDisplay(
  "around-point:angle-2",
  angleStyles[2].fill,
  angleStyles[2].outline,
  angleStyles[2].labelColor,
  angleStyles[2].labelBackground,
  angleStyles[2].labelBorder,
);

const aroundTitle = createTextLabel2D({
  name: "around-point:title",
  text: "Angles around a point",
  position: [aroundPointCenter[0], titleY],
  anchor: [0.5, 0.5],
  color: "rgba(236, 242, 255, 0.98)",
  fontSizePx: 15,
  fontWeight: 800,
  background: "rgba(17, 14, 30, 0.72)",
  border: "1px solid rgba(160, 185, 255, 0.14)",
  borderRadiusPx: 8,
  padding: "0.14rem 0.38rem",
});

const aroundSummary = createTextLabel2D({
  name: "around-point:summary",
  text: "",
  position: [aroundPointCenter[0], summaryY],
  anchor: [0.5, 0.5],
  color: "rgba(236, 242, 255, 0.98)",
  fontSizePx: 13,
  fontWeight: 760,
  background: "rgba(17, 14, 30, 0.82)",
  border: "1px solid rgba(160, 185, 255, 0.14)",
  borderRadiusPx: 8,
  padding: "0.18rem 0.42rem",
});

function updateAroundPoint(): void {
  const angle0 = aroundBaseAngle;
  const angle1 = aroundBaseAngle + aroundSweep1;
  const angle2 = aroundBaseAngle + aroundSweep2;

  const fixedEnd = pointAt(aroundPointCenter, aroundRayLength, angle0);
  const firstEnd = pointAt(aroundPointCenter, aroundRayLength, angle1);
  const secondEnd = pointAt(aroundPointCenter, aroundRayLength, angle2);

  aroundRayFixed.setEndpoints(aroundPointCenter, fixedEnd);
  aroundRayFirst.setEndpoints(aroundPointCenter, firstEnd);
  aroundRaySecond.setEndpoints(aroundPointCenter, secondEnd);

  aroundHandle1.moveTo(firstEnd[0], firstEnd[1]);
  aroundHandle2.moveTo(secondEnd[0], secondEnd[1]);

  const raw0 = toDegrees(aroundSweep1);
  const raw1 = toDegrees(aroundSweep2 - aroundSweep1);
  const raw2 = 360 - raw0 - raw1;

  const displayed = displayAngles([raw0, raw1, raw2], 360, modeState.current);

  const text0 = formatDisplayedAngle(displayed[0], modeState.current);
  const text1 = formatDisplayedAngle(displayed[1], modeState.current);
  const text2 = formatDisplayedAngle(displayed[2], modeState.current);

  aroundAngle0.update(
    aroundPointCenter,
    angle0,
    angle1,
    "counterclockwise",
    0.48,
    text0,
    1.65,
  );

  aroundAngle1.update(
    aroundPointCenter,
    angle1,
    angle2,
    "counterclockwise",
    0.66,
    text1,
    1.42,
  );

  aroundAngle2.update(
    aroundPointCenter,
    angle2,
    angle0,
    "counterclockwise",
    0.84,
    text2,
    1.18,
  );

  aroundSummary.setText(`${text0} + ${text1} + ${text2} = 360°`);
}

/* -------------------------------------------------------------------------- */
/* Scene update                                                               */
/* -------------------------------------------------------------------------- */

function updateScene(): void {
  updateSupplementary();
  updateComplementary();
  updateAroundPoint();
}

scene.add(
  suppLineLeft,
  suppLineRight,
  suppRay,
  suppHandle,
  suppAngleLeft.sector,
  suppAngleLeft.label,
  suppAngleRight.sector,
  suppAngleRight.label,
  suppTitle,
  suppSummary,

  compArmRight,
  compArmUp,
  compRay,
  compHandle,
  compOuterRightAngle,
  compAngleLower.sector,
  compAngleLower.label,
  compAngleUpper.sector,
  compAngleUpper.label,
  compTitle,
  compSummary,

  aroundRayFixed,
  aroundRayFirst,
  aroundRaySecond,
  aroundHandle1,
  aroundHandle2,
  aroundAngle0.sector,
  aroundAngle0.label,
  aroundAngle1.sector,
  aroundAngle1.label,
  aroundAngle2.sector,
  aroundAngle2.label,
  aroundTitle,
  aroundSummary,
);

updateScene();

/* -------------------------------------------------------------------------- */
/* Dragging                                                                   */
/* -------------------------------------------------------------------------- */

const dragging = new PointDragController2D(scene);

dragging.registerPoint({
  getPosition: () => pointAt(supplementaryCenter, suppRayLength, suppRayAngle),
  onDrag: (pointerPosition) => {
    const rawAngle = Math.atan2(
      pointerPosition[1] - supplementaryCenter[1],
      pointerPosition[0] - supplementaryCenter[0],
    );

    const continuousAngle = unwrapAngleNear(rawAngle, suppRayAngle);
    suppRayAngle = clamp(
      continuousAngle,
      suppMinAngle,
      Math.PI - suppMinAngle,
    );
    updateScene();
  },
  hitRadiusPixels: 26,
  hoverCursor: "grab",
});

dragging.registerPoint({
  getPosition: () => pointAt(complementaryCenter, compRayLength, compRayAngle),
  onDrag: (pointerPosition) => {
    const rawAngle = Math.atan2(
      pointerPosition[1] - complementaryCenter[1],
      pointerPosition[0] - complementaryCenter[0],
    );

    const continuousAngle = unwrapAngleNear(rawAngle, compRayAngle);
    compRayAngle = clamp(
      continuousAngle,
      compMinAngle,
      Math.PI / 2 - compMinAngle,
    );
    updateScene();
  },
  hitRadiusPixels: 26,
  hoverCursor: "grab",
});

dragging.registerPoint({
  getPosition: () =>
    pointAt(
      aroundPointCenter,
      aroundRayLength,
      aroundBaseAngle + aroundSweep1,
    ),
  onDrag: (pointerPosition) => {
    const rawAngle = Math.atan2(
      pointerPosition[1] - aroundPointCenter[1],
      pointerPosition[0] - aroundPointCenter[0],
    );

    const currentAbsoluteAngle = aroundBaseAngle + aroundSweep1;
    const continuousAngle = unwrapAngleNear(rawAngle, currentAbsoluteAngle);
    const requestedSweep = continuousAngle - aroundBaseAngle;

    aroundSweep1 = clamp(
      requestedSweep,
      aroundMinGap,
      aroundSweep2 - aroundMinGap,
    );
    updateScene();
  },
  hitRadiusPixels: 26,
  hoverCursor: "grab",
});

dragging.registerPoint({
  getPosition: () =>
    pointAt(
      aroundPointCenter,
      aroundRayLength,
      aroundBaseAngle + aroundSweep2,
    ),
  onDrag: (pointerPosition) => {
    const rawAngle = Math.atan2(
      pointerPosition[1] - aroundPointCenter[1],
      pointerPosition[0] - aroundPointCenter[0],
    );

    const currentAbsoluteAngle = aroundBaseAngle + aroundSweep2;
    const continuousAngle = unwrapAngleNear(rawAngle, currentAbsoluteAngle);
    const requestedSweep = continuousAngle - aroundBaseAngle;

    aroundSweep2 = clamp(
      requestedSweep,
      aroundSweep1 + aroundMinGap,
      TAU - aroundMinGap,
    );
    updateScene();
  },
  hitRadiusPixels: 26,
  hoverCursor: "grab",
});

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

Object.assign(window, {
  angleRelationsScene: {
    scene,
    measurements: {
      getMode: (): MeasurementDisplayMode => modeState.current,
      setMode: (mode: MeasurementDisplayMode) => {
        modeState.current = mode;
        updateScene();
      },
    },
  },
});

const destroy = (): void => {
  dragging.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
