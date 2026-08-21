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
 * Keep the angle strictly inside the first quadrant.  36° makes the two legs
 * visibly different in length, which makes the side correspondence easier to
 * see than a 45° example would.
 */
const FIXED_ANGLE = Math.PI / 5;

const COSINE_COLOR = "#32c7f4";
const SINE_COLOR = "#ff5aa5";
const RADIUS_COLOR = "#68e6b5";

const ANGLE_A_FILL = HUES.purple.base;
const ANGLE_A_OUTLINE = HUES.magenta.light;

const COMPLEMENT_FILL = HUES.gold.base;
const COMPLEMENT_OUTLINE = HUES.gold.light;

/* -------------------------------------------------------------------------- */
/* Scene                                                                      */
/* -------------------------------------------------------------------------- */

const canvas = document.querySelector<HTMLCanvasElement>(
  "#about-trig-congruent-triangles-scene",
);

if (!canvas) {
  throw new Error(
    'The canvas "#about-trig-congruent-triangles-scene" could not be found.',
  );
}

const scene = createMathScene2D(canvas, {
  unitSizePixels: UNIT_SIZE_PIXELS,
  center: ORIGIN,
  background: null,
});

const coordinatePlane = createCoordinatePlane2D({
  name: "trig-congruent-coordinate-plane",
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

/* -------------------------------------------------------------------------- */
/* Fixed trigonometric geometry                                               */
/* -------------------------------------------------------------------------- */

const point: Vec2Tuple = [
  Math.cos(FIXED_ANGLE),
  Math.sin(FIXED_ANGLE),
];

const xProjection: Vec2Tuple = [
  point[0],
  0,
];

const yProjection: Vec2Tuple = [
  0,
  point[1],
];

const unitCircle = createParametricShape2D({
  name: "trig-congruent-unit-circle",
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

function createSegment(
  name: string,
  start: Vec2Tuple,
  end: Vec2Tuple,
  color: string,
  width = 0.052,
) {
  return createVector2D({
    name,
    start,
    end,
    style: {
      color,
      opacity: 1,
      shaftWidth: width,
      headLength: 0,
      headWidth: 0,
    },
  });
}

/*
 * Triangle O-X-P:
 *
 *   OX = cos(a)
 *   XP = sin(a)
 *   OP = 1
 */
const lowerCosineSide = createSegment(
  "trig-congruent-lower-cosine",
  ORIGIN,
  xProjection,
  COSINE_COLOR,
);

const lowerSineSide = createSegment(
  "trig-congruent-lower-sine",
  xProjection,
  point,
  SINE_COLOR,
);

/*
 * Triangle O-Y-P:
 *
 *   YP = cos(a)
 *   OY = sin(a)
 *   OP = 1
 *
 * Corresponding legs therefore receive exactly the same colors as in O-X-P.
 */
const upperCosineSide = createSegment(
  "trig-congruent-upper-cosine",
  yProjection,
  point,
  COSINE_COLOR,
);

const upperSineSide = createSegment(
  "trig-congruent-upper-sine",
  ORIGIN,
  yProjection,
  SINE_COLOR,
);

const unitVector = createVector2D({
  name: "trig-congruent-unit-radius",
  start: ORIGIN,
  end: point,
  style: {
    color: RADIUS_COLOR,
    opacity: 1,
    shaftWidth: 0.058,
    headLength: 0.2,
    headWidth: 0.17,
  },
});

/* -------------------------------------------------------------------------- */
/* Right-angle markers                                                        */
/* -------------------------------------------------------------------------- */

const lowerRightAngle = createAngleSector2D({
  name: "trig-congruent-lower-right-angle",
  center: xProjection,
  startAngle: Math.PI,
  endAngle: Math.PI / 2,
  direction: "clockwise",
  radius: 0.115,
  shape: "right-angle",
  fill: SINE_COLOR,
  fillOpacity: 0.08,
  outline: "rgba(235, 246, 255, 0.92)",
  outlineOpacity: 0.82,
});

const upperRightAngle = createAngleSector2D({
  name: "trig-congruent-upper-right-angle",
  center: yProjection,
  startAngle: -Math.PI / 2,
  endAngle: 0,
  direction: "counterclockwise",
  radius: 0.115,
  shape: "right-angle",
  fill: COSINE_COLOR,
  fillOpacity: 0.08,
  outline: "rgba(235, 246, 255, 0.92)",
  outlineOpacity: 0.82,
});

/* -------------------------------------------------------------------------- */
/* Angle a and its complement                                                 */
/* -------------------------------------------------------------------------- */

const angleSector = createAngleSector2D({
  name: "trig-congruent-angle-a",
  center: ORIGIN,
  startAngle: 0,
  endAngle: FIXED_ANGLE,
  direction: "counterclockwise",
  radius: 0.38,
  segments: 96,
  fill: ANGLE_A_FILL,
  fillOpacity: 0.30,
  outline: ANGLE_A_OUTLINE,
  outlineOpacity: 0.82,
});

const complementaryAngleSector = createAngleSector2D({
  name: "trig-congruent-complementary-angle",
  center: ORIGIN,
  startAngle: FIXED_ANGLE,
  endAngle: Math.PI / 2,
  direction: "counterclockwise",
  radius: 0.42,
  segments: 96,
  fill: COMPLEMENT_FILL,
  fillOpacity: 0.22,
  outline: COMPLEMENT_OUTLINE,
  outlineOpacity: 0.82,
});

const angleLabelPosition =
  angleSector.getLabelPosition(0.68);

const angleLabel = createTextLabel2D({
  name: "trig-congruent-angle-a-label",
  text: "a",
  position: angleLabelPosition,
  anchor: [0.5, 0.5],
  color: "rgba(255, 230, 250, 0.98)",
  fontSizePx: 15,
  fontWeight: 760,
  background: "rgba(31, 20, 51, 0.72)",
  border: "1px solid rgba(255, 132, 195, 0.24)",
  borderRadiusPx: 7,
  padding: "0.2rem 0.38rem",
  opacity: 0,
});

const complementaryLabelPosition =
  complementaryAngleSector.getLabelPosition(0.69);

const complementaryAngleLabel = createTextLabel2D({
  name: "trig-congruent-complementary-label",
  text: "90 - a",
  position: complementaryLabelPosition,
  anchor: [0.5, 0.5],
  color: "rgba(255, 237, 190, 0.98)",
  fontSizePx: 14,
  fontWeight: 760,
  background: "rgba(49, 35, 13, 0.72)",
  border: "1px solid rgba(255, 207, 112, 0.25)",
  borderRadiusPx: 7,
  padding: "0.2rem 0.38rem",
  opacity: 0,
});

function normalizeAngle(angle: number): number {
  const normalized = ((angle % TAU) + TAU) % TAU;
  return Math.abs(normalized - TAU) < 1e-10 ? 0 : normalized;
}

function pointInPolarSector(
  pointWorld: Vec2Tuple,
  startAngle: number,
  endAngle: number,
  radius: number,
): boolean {
  const dx = pointWorld[0] - ORIGIN[0];
  const dy = pointWorld[1] - ORIGIN[1];
  const distance = Math.hypot(dx, dy);

  if (distance > radius) {
    return false;
  }

  const angle = normalizeAngle(Math.atan2(dy, dx));
  const start = normalizeAngle(startAngle);
  const end = normalizeAngle(endAngle);

  if (start <= end) {
    return angle >= start && angle <= end;
  }

  return angle >= start || angle <= end;
}

function updateAngleLabelHover(
  clientX: number,
  clientY: number,
): void {
  const pointerWorld = scene.clientToWorld(clientX, clientY);
  const hoversAngleA = pointInPolarSector(
    pointerWorld,
    0,
    FIXED_ANGLE,
    0.58,
  );

  const hoversComplement = pointInPolarSector(
    pointerWorld,
    FIXED_ANGLE,
    Math.PI / 2,
    0.58,
  );

  angleLabel.setOpacity(hoversAngleA ? 1 : 0);
  complementaryAngleLabel.setOpacity(
    hoversComplement ? 1 : 0,
  );
}

const handlePointerMove = (
  event: PointerEvent,
): void => {
  updateAngleLabelHover(event.clientX, event.clientY);
};

const handlePointerLeave = (): void => {
  angleLabel.setOpacity(0);
  complementaryAngleLabel.setOpacity(0);
};

/* -------------------------------------------------------------------------- */
/* Assembly                                                                   */
/* -------------------------------------------------------------------------- */

scene.add(
  coordinatePlane,
  unitCircle,

  lowerCosineSide,
  lowerSineSide,
  upperCosineSide,
  upperSineSide,

  angleSector,
  complementaryAngleSector,
  lowerRightAngle,
  upperRightAngle,

  unitVector,

  angleLabel,
  complementaryAngleLabel,
);

canvas.addEventListener(
  "pointermove",
  handlePointerMove,
);

canvas.addEventListener(
  "pointerleave",
  handlePointerLeave,
);


/* -------------------------------------------------------------------------- */
/* Intro                                                                      */
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
  mathTrigCongruentTrianglesDemo: {
    scene,
    coordinatePlane,
    unitCircle,
    unitVector,

    triangles: {
      lower: {
        cosineSide: lowerCosineSide,
        sineSide: lowerSineSide,
        rightAngle: lowerRightAngle,
      },
      upper: {
        cosineSide: upperCosineSide,
        sineSide: upperSineSide,
        rightAngle: upperRightAngle,
      },
    },

    angles: {
      a: angleSector,
      complement: complementaryAngleSector,
      aLabel: angleLabel,
      complementLabel: complementaryAngleLabel,
    },
  },
});

/* -------------------------------------------------------------------------- */
/* Cleanup                                                                    */
/* -------------------------------------------------------------------------- */

const destroy = (): void => {
  stopIntro();

  canvas.removeEventListener(
    "pointermove",
    handlePointerMove,
  );
  canvas.removeEventListener(
    "pointerleave",
    handlePointerLeave,
  );

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
