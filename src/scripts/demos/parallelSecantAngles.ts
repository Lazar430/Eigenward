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
  "#parallel-secant-angles-scene",
);

if (!canvas) {
  throw new Error("The parallel-secant-angles scene canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: 7.1,
  center: [0, -0.05],
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

function formatDisplayedAngle(
  angleDegrees: number,
  mode: MeasurementDisplayMode,
): string {
  if (mode === "raw") return formatRawAngle(angleDegrees);
  return `${Math.round(angleDegrees)}°`;
}

function unwrapAngleNear(angle: number, reference: number): number {
  let unwrapped = angle;

  while (unwrapped - reference > Math.PI) unwrapped -= TAU;
  while (unwrapped - reference < -Math.PI) unwrapped += TAU;

  return unwrapped;
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
      fillOpacity: 0.96,
    },
  })
    .resizeTo(0.11)
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
    radius: 0.44,
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
    fontSizePx: 13,
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
    labelRadiusFactor = 1.4,
  ): void {
    sector
      .setCenter(center)
      .setRadius(radius)
      .setDirection(direction)
      .setAngles(startAngle, endAngle);

    const position = sector.getLabelPosition(labelRadiusFactor);
    label.setText(text).moveTo(position[0], position[1]);
  }

  return { sector, label, update };
}

const angleStyles = {
  corresponding: {
    fill: HUES.cyan.base,
    outline: HUES.cyan.light,
    labelColor: "rgba(226, 248, 255, 0.98)",
    labelBackground: "rgba(14, 27, 34, 0.76)",
    labelBorder: "1px solid rgba(112, 231, 255, 0.18)",
  },
  alternateInterior: {
    fill: HUES.magenta.base,
    outline: HUES.magenta.light,
    labelColor: "rgba(255, 228, 240, 0.98)",
    labelBackground: "rgba(45, 17, 34, 0.76)",
    labelBorder: "1px solid rgba(255, 154, 187, 0.18)",
  },
  alternateExterior: {
    fill: HUES.gold.base,
    outline: HUES.gold.light,
    labelColor: "rgba(255, 241, 201, 0.98)",
    labelBackground: "rgba(50, 37, 14, 0.76)",
    labelBorder: "1px solid rgba(255, 226, 138, 0.18)",
  },
};

const modeState = {
  current: DEFAULT_MEASUREMENT_DISPLAY_MODE,
};

const center: Vec2Tuple = [0, 0];
const topY = 1.35;
const bottomY = -1.35;
const lineHalfLength = 4.35;

/*
 * The secant is rendered only a short distance beyond the two intersections,
 * rather than as one long fixed segment centered at the origin.
 */
const SECANT_EXTENSION = 0.68;

/*
 * Allow essentially the entire unoriented 180° family of secants while keeping
 * a safety margin from horizontal, where the intersections would run to
 * infinity and the resulting angles would collapse to 0°/180°.
 */
const minSecantAngle = 0.29;
const maxSecantAngle = Math.PI - minSecantAngle;
let secantAngle = 0.86;

const parallelTop = createSegment("parallel-top", HUES.cyan.soft, 0.05);
const parallelBottom = createSegment("parallel-bottom", HUES.cyan.soft, 0.05);
const secant = createSegment("secant", HUES.magenta.light, 0.055);

const secantHandle = createHandle(
  "secant:handle",
  HUES.magenta.light,
  [0, 0],
);

const correspondingTop = createAngleDisplay(
  "corresponding-top",
  angleStyles.corresponding.fill,
  angleStyles.corresponding.outline,
  angleStyles.corresponding.labelColor,
  angleStyles.corresponding.labelBackground,
  angleStyles.corresponding.labelBorder,
);

const correspondingBottom = createAngleDisplay(
  "corresponding-bottom",
  angleStyles.corresponding.fill,
  angleStyles.corresponding.outline,
  angleStyles.corresponding.labelColor,
  angleStyles.corresponding.labelBackground,
  angleStyles.corresponding.labelBorder,
);

const alternateInteriorTop = createAngleDisplay(
  "alternate-interior-top",
  angleStyles.alternateInterior.fill,
  angleStyles.alternateInterior.outline,
  angleStyles.alternateInterior.labelColor,
  angleStyles.alternateInterior.labelBackground,
  angleStyles.alternateInterior.labelBorder,
);

const alternateInteriorBottom = createAngleDisplay(
  "alternate-interior-bottom",
  angleStyles.alternateInterior.fill,
  angleStyles.alternateInterior.outline,
  angleStyles.alternateInterior.labelColor,
  angleStyles.alternateInterior.labelBackground,
  angleStyles.alternateInterior.labelBorder,
);

const alternateExteriorTop = createAngleDisplay(
  "alternate-exterior-top",
  angleStyles.alternateExterior.fill,
  angleStyles.alternateExterior.outline,
  angleStyles.alternateExterior.labelColor,
  angleStyles.alternateExterior.labelBackground,
  angleStyles.alternateExterior.labelBorder,
);

const alternateExteriorBottom = createAngleDisplay(
  "alternate-exterior-bottom",
  angleStyles.alternateExterior.fill,
  angleStyles.alternateExterior.outline,
  angleStyles.alternateExterior.labelColor,
  angleStyles.alternateExterior.labelBackground,
  angleStyles.alternateExterior.labelBorder,
);

const title = createTextLabel2D({
  name: "parallel-secant:title",
  text: "Parallel lines cut by a secant",
  position: [0, 2.85],
  anchor: [0.5, 0.5],
  color: "rgba(236, 242, 255, 0.98)",
  fontSizePx: 16,
  fontWeight: 800,
  background: "rgba(17, 14, 30, 0.74)",
  border: "1px solid rgba(160, 185, 255, 0.14)",
  borderRadiusPx: 8,
  padding: "0.14rem 0.4rem",
});

/**
 * In Platonic mode, jointly quantize the two supplementary intersection angles
 * so their displayed measures still add to exactly 180°.
 */
function displayedIntersectionAngles(): [number, number] {
  const firstRaw = toDegrees(secantAngle);
  const secondRaw = 180 - firstRaw;

  if (modeState.current === "raw") return [firstRaw, secondRaw];

  const minimum = MEASUREMENT_DISPLAY.platonic.minimumAngleDegrees;
  const first = clamp(Math.round(firstRaw), minimum, 180 - minimum);
  return [first, 180 - first];
}

function secantIntersection(y: number): Vec2Tuple {
  const sine = Math.sin(secantAngle);
  const cosine = Math.cos(secantAngle);
  const t = (y - center[1]) / sine;
  return [center[0] + t * cosine, y];
}

function secantEndpoints(
  bottomPoint: Vec2Tuple,
  topPoint: Vec2Tuple,
): readonly [Vec2Tuple, Vec2Tuple] {
  const direction: Vec2Tuple = [
    Math.cos(secantAngle),
    Math.sin(secantAngle),
  ];

  return [
    [
      bottomPoint[0] - direction[0] * SECANT_EXTENSION,
      bottomPoint[1] - direction[1] * SECANT_EXTENSION,
    ],
    [
      topPoint[0] + direction[0] * SECANT_EXTENSION,
      topPoint[1] + direction[1] * SECANT_EXTENSION,
    ],
  ];
}

function updateScene(): void {
  parallelTop.setEndpoints([-lineHalfLength, topY], [lineHalfLength, topY]);
  parallelBottom.setEndpoints(
    [-lineHalfLength, bottomY],
    [lineHalfLength, bottomY],
  );

  const topPoint = secantIntersection(topY);
  const bottomPoint = secantIntersection(bottomY);
  const [secantStart, secantEnd] = secantEndpoints(bottomPoint, topPoint);

  secant.setEndpoints(secantStart, secantEnd);
  secantHandle.moveTo(secantEnd[0], secantEnd[1]);

  const [thetaValue, supplementValue] = displayedIntersectionAngles();
  const thetaText = formatDisplayedAngle(thetaValue, modeState.current);
  const supplementText = formatDisplayedAngle(
    supplementValue,
    modeState.current,
  );

  /*
   * These representatives remain the same named families throughout the full
   * allowed 0..π orientation range. Their numerical roles naturally exchange
   * between acute and obtuse after the secant passes 90°.
   */
  correspondingTop.update(
    topPoint,
    secantAngle,
    Math.PI,
    "counterclockwise",
    0.48,
    supplementText,
    1.38,
  );

  correspondingBottom.update(
    bottomPoint,
    secantAngle,
    Math.PI,
    "counterclockwise",
    0.48,
    supplementText,
    1.38,
  );

  alternateInteriorTop.update(
    topPoint,
    Math.PI,
    secantAngle + Math.PI,
    "counterclockwise",
    0.38,
    thetaText,
    1.62,
  );

  alternateInteriorBottom.update(
    bottomPoint,
    0,
    secantAngle,
    "counterclockwise",
    0.38,
    thetaText,
    1.62,
  );

  alternateExteriorTop.update(
    topPoint,
    0,
    secantAngle,
    "counterclockwise",
    0.62,
    thetaText,
    1.28,
  );

  alternateExteriorBottom.update(
    bottomPoint,
    Math.PI,
    secantAngle + Math.PI,
    "counterclockwise",
    0.62,
    thetaText,
    1.28,
  );
}

scene.add(
  parallelTop,
  parallelBottom,
  secant,
  secantHandle,

  correspondingTop.sector,
  correspondingTop.label,
  correspondingBottom.sector,
  correspondingBottom.label,

  alternateInteriorTop.sector,
  alternateInteriorTop.label,
  alternateInteriorBottom.sector,
  alternateInteriorBottom.label,

  alternateExteriorTop.sector,
  alternateExteriorTop.label,
  alternateExteriorBottom.sector,
  alternateExteriorBottom.label,

  title,
);

updateScene();

const dragging = new PointDragController2D(scene);

dragging.registerPoint({
  getPosition: () => {
    const topPoint = secantIntersection(topY);
    const bottomPoint = secantIntersection(bottomY);
    return secantEndpoints(bottomPoint, topPoint)[1];
  },
  onDrag: (pointerPosition) => {
    const rawAngle = Math.atan2(
      pointerPosition[1] - center[1],
      pointerPosition[0] - center[0],
    );

    const continuousAngle = unwrapAngleNear(rawAngle, secantAngle);
    secantAngle = clamp(
      continuousAngle,
      minSecantAngle,
      maxSecantAngle,
    );
    updateScene();
  },
  hitRadiusPixels: 24,
  hoverCursor: "grab",
});

Object.assign(window, {
  parallelSecantAnglesScene: {
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
