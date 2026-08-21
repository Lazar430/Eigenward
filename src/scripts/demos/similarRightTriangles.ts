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
const EPSILON = 1e-8;

type MeasurementDisplayMode = "platonic" | "raw";

/*
  Measurement presentation is intentionally separate from geometry. Dragging is
  always continuous; only the displayed measurements are idealized.

  Change this one value to "raw" to restore the previous decimal labels.
*/
const DEFAULT_MEASUREMENT_DISPLAY_MODE: MeasurementDisplayMode = "platonic";
let measurementDisplayMode: MeasurementDisplayMode = DEFAULT_MEASUREMENT_DISPLAY_MODE;

/*
  Keep the geometric similarity transform deliberately friendly. In Platonic mode
  the same ratio is used for the integer display labels, so every corresponding
  side ratio is literally equal to 1/2 = 0.5.
*/
const SIMILARITY_RATIO = 0.5;

const MEASUREMENT_DISPLAY = {
  raw: {
    lengthDecimals: 2,
    angleDecimals: 1,
    ratioDecimals: 2,
  },
  platonic: {
    ratioMaxDenominator: 2,
    lengthDensity: 2,
  },
} as const;
const MIN_LEG_LENGTH = 0.52;

const VIEW_HEIGHT = 7.4;
const VIEW_CENTER: Vec2Tuple = [0.2, 0.05];
const VIEWPORT_PADDING = 0.34;

const BIG_CENTER: Vec2Tuple = [-2.75, 0.2];
const SMALL_CENTER: Vec2Tuple = [3.15, 0.35];

/*
  This is deliberately not drawn. It is an interaction boundary only: the
  canonical triangle remains in the left half-plane and its mirrored similar
  copy remains in the right half-plane.
*/
const SEPARATION_X = 0.2;
const SEPARATION_HALF_GAP = 0.6;
const LEFT_REGION_MAX_X = SEPARATION_X - SEPARATION_HALF_GAP;
const RIGHT_REGION_MIN_X = SEPARATION_X + SEPARATION_HALF_GAP;

const CANONICAL_MAX_X = Math.min(
  LEFT_REGION_MAX_X,
  BIG_CENTER[0] +
    (SMALL_CENTER[0] - RIGHT_REGION_MIN_X) / SIMILARITY_RATIO,
);

const canvas = document.querySelector<HTMLCanvasElement>(
  "#similar-right-triangles",
);

if (!canvas) {
  throw new Error(
    "The similar-right-triangles demonstration canvas could not be found.",
  );
}

const scene = createMathScene2D(canvas, {
  viewHeight: VIEW_HEIGHT,
  center: VIEW_CENTER,
  background: null,
});

type MutablePoint2D = [number, number];

type BraceStyle = {
  offset: number;
  kinkHeight: number;
  kinkHalfWidth: number;
  tickHalfHeight: number;
  labelOffset: number;
  lineColor: string;
  labelColor: string;
  labelBackground: string;
  labelBorder: string;
};

type AngleStyle = {
  fill: string;
  outline: string;
  labelColor: string;
  labelBackground: string;
  labelBorder: string;
};

/*
  Vertex order is A, B, C, with the right angle at A.

  Only B and C are direct user controls. A is always reconstructed as

      A = (B_x, C_y),

  so AB is vertical and AC is horizontal. Consequently AB ⟂ AC for every
  permitted drag, while the two acute vertices can still move independently.
*/
const bigVertices: [MutablePoint2D, MutablePoint2D, MutablePoint2D] = [
  [0, 0],
  [BIG_CENTER[0] - 1.55, BIG_CENTER[1] - 1.4],
  [BIG_CENTER[0] + 1.35, BIG_CENTER[1] + 1.25],
];

const smallVertices: [MutablePoint2D, MutablePoint2D, MutablePoint2D] = [
  [0, 0],
  [0, 0],
  [0, 0],
];

const unitCircle = (parameter: number): Vec2Tuple => [
  Math.cos(parameter),
  Math.sin(parameter),
];

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function formatRawLength(length: number): string {
  const factor = 10 ** MEASUREMENT_DISPLAY.raw.lengthDecimals;
  const rounded = Math.round(length * factor) / factor;
  return Number.isInteger(rounded)
    ? rounded.toFixed(0)
    : rounded.toFixed(MEASUREMENT_DISPLAY.raw.lengthDecimals);
}

function formatRawAngleDegrees(degrees: number): string {
  const factor = 10 ** MEASUREMENT_DISPLAY.raw.angleDecimals;
  const rounded = Math.round(degrees * factor) / factor;
  return Number.isInteger(rounded)
    ? `${rounded.toFixed(0)}°`
    : `${rounded.toFixed(MEASUREMENT_DISPLAY.raw.angleDecimals)}°`;
}

function formatRawAngle(angleRadians: number): string {
  return formatRawAngleDegrees(angleRadians * 180 / Math.PI);
}

function formatRawRatio(value: number): string {
  return value.toFixed(MEASUREMENT_DISPLAY.raw.ratioDecimals);
}

type RationalApproximation = {
  numerator: number;
  denominator: number;
  value: number;
};

type MeasurementPresentation = {
  bigLengths: [string, string, string];
  smallLengths: [string, string, string];
  angles: [string, string, string];
  ratioText: string;
};

function greatestCommonDivisor(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));

  while (y !== 0) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }

  return x || 1;
}

function approximateRational(
  value: number,
  maxDenominator: number,
): RationalApproximation {
  let bestNumerator = Math.round(value);
  let bestDenominator = 1;
  let bestError = Math.abs(value - bestNumerator);

  for (let denominator = 1; denominator <= maxDenominator; denominator += 1) {
    const numerator = Math.max(1, Math.round(value * denominator));
    const error = Math.abs(value - numerator / denominator);

    if (
      error < bestError - EPSILON ||
      (Math.abs(error - bestError) <= EPSILON && denominator < bestDenominator)
    ) {
      bestNumerator = numerator;
      bestDenominator = denominator;
      bestError = error;
    }
  }

  const divisor = greatestCommonDivisor(bestNumerator, bestDenominator);
  const numerator = bestNumerator / divisor;
  const denominator = bestDenominator / divisor;

  return {
    numerator,
    denominator,
    value: numerator / denominator,
  };
}

function formatTerminatingRationalDecimal(
  numerator: number,
  denominator: number,
): string | null {
  let reducedDenominator = denominator / greatestCommonDivisor(numerator, denominator);
  let twos = 0;
  let fives = 0;

  while (reducedDenominator % 2 === 0) {
    reducedDenominator /= 2;
    twos += 1;
  }

  while (reducedDenominator % 5 === 0) {
    reducedDenominator /= 5;
    fives += 1;
  }

  if (reducedDenominator !== 1) return null;

  const decimals = Math.max(twos, fives);
  return (numerator / denominator).toFixed(decimals);
}

function formatPlatonicRatio(ratio: RationalApproximation): string {
  const decimal = formatTerminatingRationalDecimal(
    ratio.numerator,
    ratio.denominator,
  );

  return decimal ?? `${ratio.numerator}/${ratio.denominator}`;
}

function triangleInteriorAnglesDegrees(
  vertices: readonly Vec2Tuple[],
): [number, number, number] {
  const angleAt = (
    center: Vec2Tuple,
    firstArm: Vec2Tuple,
    secondArm: Vec2Tuple,
  ): number => {
    const ax = firstArm[0] - center[0];
    const ay = firstArm[1] - center[1];
    const bx = secondArm[0] - center[0];
    const by = secondArm[1] - center[1];
    const aLength = Math.hypot(ax, ay);
    const bLength = Math.hypot(bx, by);

    if (aLength <= EPSILON || bLength <= EPSILON) return Number.NaN;

    const cosine = clamp(
      (ax * bx + ay * by) / (aLength * bLength),
      -1,
      1,
    );

    return Math.acos(cosine) * 180 / Math.PI;
  };

  const [a, b, c] = vertices;
  return [
    angleAt(a, b, c),
    angleAt(b, c, a),
    angleAt(c, a, b),
  ];
}

function distance(a: Vec2Tuple, b: Vec2Tuple): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}


function sideLengths(vertices: readonly Vec2Tuple[]): [number, number, number] {
  return [
    distance(vertices[0], vertices[1]),
    distance(vertices[1], vertices[2]),
    distance(vertices[2], vertices[0]),
  ];
}

function quantizeTriangleLengthMultipliers(
  rawLengths: readonly [number, number, number],
): [number, number, number] {
  const density = MEASUREMENT_DISPLAY.platonic.lengthDensity;
  const multipliers = rawLengths.map((length) =>
    Math.max(1, Math.round(length * density)),
  ) as [number, number, number];

  /*
    Keep the three displayed side labels triangle-like, but deliberately do not
    force them onto a Pythagorean triple. Independent integer approximation is
    much smoother while dragging and avoids discontinuous jumps between triples.
  */
  const longestIndex = multipliers.indexOf(Math.max(...multipliers));
  const otherIndices = [0, 1, 2].filter((index) => index !== longestIndex);
  const otherSum =
    multipliers[otherIndices[0]] + multipliers[otherIndices[1]];

  if (multipliers[longestIndex] >= otherSum) {
    multipliers[longestIndex] = Math.max(1, otherSum - 1);
  }

  return multipliers;
}

function buildMeasurementPresentation(): MeasurementPresentation {
  const bigRawLengths = sideLengths(bigVertices);
  const smallRawLengths = sideLengths(smallVertices);

  if (measurementDisplayMode === "raw") {
    const rawAngles = triangleInteriorAnglesDegrees(bigVertices);
    const fractions = smallRawLengths.map((smallLength, index) => {
      const bigLength = bigRawLengths[index];
      return bigLength <= EPSILON
        ? "—"
        : `${formatRawLength(smallLength)}/${formatRawLength(bigLength)}`;
    });

    return {
      bigLengths: bigRawLengths.map(formatRawLength) as [string, string, string],
      smallLengths: smallRawLengths.map(formatRawLength) as [string, string, string],
      angles: rawAngles.map((angle) =>
        Number.isFinite(angle) ? formatRawAngleDegrees(angle) : "—",
      ) as [string, string, string],
      ratioText:
        `${fractions[0]} = ${fractions[1]} = ${fractions[2]} = ` +
        formatRawRatio(SIMILARITY_RATIO),
    };
  }

  const ratio = approximateRational(
    SIMILARITY_RATIO,
    MEASUREMENT_DISPLAY.platonic.ratioMaxDenominator,
  );
  const multipliers = quantizeTriangleLengthMultipliers(bigRawLengths);
  const bigIntegerLengths = multipliers.map(
    (multiplier) => multiplier * ratio.denominator,
  ) as [number, number, number];
  const smallIntegerLengths = multipliers.map(
    (multiplier) => multiplier * ratio.numerator,
  ) as [number, number, number];

  /*
    The geometry itself is exactly right-angled. For display, keep A at 90° and
    round one acute angle from the live geometry; define the other as its exact
    complement. This keeps all labels integral and guarantees a 180° total
    without tying the side labels to discrete Pythagorean triples.
  */
  const rawAngles = triangleInteriorAnglesDegrees(bigVertices);
  const angleB = clamp(Math.round(rawAngles[1]), 1, 89);
  const integerAngles: [number, number, number] = [90, angleB, 90 - angleB];
  const fractions = smallIntegerLengths.map(
    (smallLength, index) => `${smallLength}/${bigIntegerLengths[index]}`,
  );

  return {
    bigLengths: bigIntegerLengths.map(String) as [string, string, string],
    smallLengths: smallIntegerLengths.map(String) as [string, string, string],
    angles: integerAngles.map((angle) => `${angle}°`) as [string, string, string],
    ratioText:
      `${fractions[0]} = ${fractions[1]} = ${fractions[2]} = ` +
      formatPlatonicRatio(ratio),
  };
}

type ViewportBounds2D = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function clamp(value: number, minimum: number, maximum: number): number {
  if (minimum > maximum) return (minimum + maximum) / 2;
  return Math.min(maximum, Math.max(minimum, value));
}

function getViewportBounds(): ViewportBounds2D {
  const rect = canvas.getBoundingClientRect();
  const pixelWidth = rect.width || canvas.clientWidth || canvas.width || 1;
  const pixelHeight = rect.height || canvas.clientHeight || canvas.height || 1;
  const aspect = pixelWidth / Math.max(pixelHeight, 1);
  const halfHeight = VIEW_HEIGHT / 2;
  const halfWidth = halfHeight * aspect;
  const paddingX = Math.min(VIEWPORT_PADDING, halfWidth * 0.45);
  const paddingY = Math.min(VIEWPORT_PADDING, halfHeight * 0.45);

  return {
    minX: VIEW_CENTER[0] - halfWidth + paddingX,
    maxX: VIEW_CENTER[0] + halfWidth - paddingX,
    minY: VIEW_CENTER[1] - halfHeight + paddingY,
    maxY: VIEW_CENTER[1] + halfHeight - paddingY,
  };
}

function getCanonicalDragBounds(): ViewportBounds2D {
  const viewport = getViewportBounds();
  const smallMinX = Math.max(viewport.minX, RIGHT_REGION_MIN_X);
  const smallMaxX = viewport.maxX;

  return {
    minX: Math.max(
      viewport.minX,
      BIG_CENTER[0] + (SMALL_CENTER[0] - smallMaxX) / SIMILARITY_RATIO,
    ),
    maxX: Math.min(
      viewport.maxX,
      CANONICAL_MAX_X,
      BIG_CENTER[0] + (SMALL_CENTER[0] - smallMinX) / SIMILARITY_RATIO,
    ),
    minY: Math.max(
      viewport.minY,
      BIG_CENTER[1] + (viewport.minY - SMALL_CENTER[1]) / SIMILARITY_RATIO,
    ),
    maxY: Math.min(
      viewport.maxY,
      BIG_CENTER[1] + (viewport.maxY - SMALL_CENTER[1]) / SIMILARITY_RATIO,
    ),
  };
}

function bigToSmall(point: Vec2Tuple): Vec2Tuple {
  const localX = point[0] - BIG_CENTER[0];
  const localY = point[1] - BIG_CENTER[1];

  return [
    SMALL_CENTER[0] - SIMILARITY_RATIO * localX,
    SMALL_CENTER[1] + SIMILARITY_RATIO * localY,
  ];
}

function smallToBig(point: Vec2Tuple): Vec2Tuple {
  const localX = point[0] - SMALL_CENTER[0];
  const localY = point[1] - SMALL_CENTER[1];

  return [
    BIG_CENTER[0] - localX / SIMILARITY_RATIO,
    BIG_CENTER[1] + localY / SIMILARITY_RATIO,
  ];
}

function reconstructRightAngleVertex(): void {
  const b = bigVertices[1];
  const c = bigVertices[2];
  bigVertices[0][0] = b[0];
  bigVertices[0][1] = c[1];
}

function synchronizeSmallVertices(): void {
  for (let index = 0; index < 3; index += 1) {
    const mapped = bigToSmall(bigVertices[index]);
    smallVertices[index][0] = mapped[0];
    smallVertices[index][1] = mapped[1];
  }
}

/*
  Preserve the initial orientation B_x < C_x and B_y < C_y. Besides avoiding
  degenerate triangles, these inequalities make the derived right-angle corner
  stable and predictable while dragging.
*/
function constrainAcuteVertex(
  index: 1 | 2,
  candidate: Vec2Tuple,
): Vec2Tuple {
  const b = bigVertices[1];
  const c = bigVertices[2];
  const bounds = getCanonicalDragBounds();

  if (index === 1) {
    return [
      clamp(
        candidate[0],
        bounds.minX,
        Math.min(bounds.maxX, c[0] - MIN_LEG_LENGTH),
      ),
      clamp(
        candidate[1],
        bounds.minY,
        Math.min(bounds.maxY, c[1] - MIN_LEG_LENGTH),
      ),
    ];
  }

  return [
    clamp(
      candidate[0],
      Math.max(bounds.minX, b[0] + MIN_LEG_LENGTH),
      bounds.maxX,
    ),
    clamp(
      candidate[1],
      Math.max(bounds.minY, b[1] + MIN_LEG_LENGTH),
      bounds.maxY,
    ),
  ];
}

function constrainRightTriangleToViewport(): void {
  const bounds = getCanonicalDragBounds();
  const b = bigVertices[1];
  const c = bigVertices[2];

  b[0] = clamp(b[0], bounds.minX, bounds.maxX - MIN_LEG_LENGTH);
  c[0] = clamp(c[0], b[0] + MIN_LEG_LENGTH, bounds.maxX);

  b[1] = clamp(b[1], bounds.minY, bounds.maxY - MIN_LEG_LENGTH);
  c[1] = clamp(c[1], b[1] + MIN_LEG_LENGTH, bounds.maxY);

  reconstructRightAngleVertex();
}

function setAcuteVertex(index: 1 | 2, point: Vec2Tuple): void {
  const constrained = constrainAcuteVertex(index, point);
  bigVertices[index][0] = constrained[0];
  bigVertices[index][1] = constrained[1];
  reconstructRightAngleVertex();
}

function createSegment(name: string, color: string, opacity = 1) {
  return createVector2D({
    name,
    start: [0, 0],
    end: [0, 0],
    style: {
      color,
      opacity,
      shaftWidth: 0.032,
      headLength: 0,
      headWidth: 0,
    },
  });
}

function createDimensionBrace(name: string, style: BraceStyle) {
  const segments = Array.from({ length: 6 }, (_, index) =>
    createSegment(
      `${name}:segment-${index}`,
      style.lineColor,
      index === 0 || index === 5 ? 0.68 : 0.88,
    ),
  );

  const label = createTextLabel2D({
    name: `${name}:label`,
    text: "0",
    position: [0, 0],
    anchor: [0.5, 0.5],
    color: style.labelColor,
    fontSizePx: 14,
    fontWeight: 760,
    background: style.labelBackground,
    border: style.labelBorder,
    borderRadiusPx: 7,
    padding: "0.10rem 0.32rem",
  });

  function update(
    start: Vec2Tuple,
    end: Vec2Tuple,
    opposite: Vec2Tuple,
    measurementText?: string,
  ): void {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = Math.hypot(dx, dy);

    if (length <= EPSILON) {
      for (const segment of segments) {
        segment.setEndpoints(start, start);
      }

      label
        .setText("0")
        .moveTo(start[0], start[1] + style.offset + style.labelOffset);
      return;
    }

    const ux = dx / length;
    const uy = dy / length;

    let nx = -uy;
    let ny = ux;

    const midpointX = (start[0] + end[0]) / 2;
    const midpointY = (start[1] + end[1]) / 2;
    const towardOppositeX = opposite[0] - midpointX;
    const towardOppositeY = opposite[1] - midpointY;

    if (towardOppositeX * nx + towardOppositeY * ny > 0) {
      nx *= -1;
      ny *= -1;
    }

    const braceStart: Vec2Tuple = [
      start[0] + nx * style.offset,
      start[1] + ny * style.offset,
    ];
    const braceEnd: Vec2Tuple = [
      end[0] + nx * style.offset,
      end[1] + ny * style.offset,
    ];

    const kinkHalfWidth = Math.min(style.kinkHalfWidth, length * 0.16);
    const leftShoulder: Vec2Tuple = [
      midpointX - ux * kinkHalfWidth + nx * style.offset,
      midpointY - uy * kinkHalfWidth + ny * style.offset,
    ];
    const rightShoulder: Vec2Tuple = [
      midpointX + ux * kinkHalfWidth + nx * style.offset,
      midpointY + uy * kinkHalfWidth + ny * style.offset,
    ];
    const kinkPeak: Vec2Tuple = [
      midpointX + nx * (style.offset + style.kinkHeight),
      midpointY + ny * (style.offset + style.kinkHeight),
    ];

    const startTickA: Vec2Tuple = [
      braceStart[0] - nx * style.tickHalfHeight,
      braceStart[1] - ny * style.tickHalfHeight,
    ];
    const startTickB: Vec2Tuple = [
      braceStart[0] + nx * style.tickHalfHeight,
      braceStart[1] + ny * style.tickHalfHeight,
    ];
    const endTickA: Vec2Tuple = [
      braceEnd[0] - nx * style.tickHalfHeight,
      braceEnd[1] - ny * style.tickHalfHeight,
    ];
    const endTickB: Vec2Tuple = [
      braceEnd[0] + nx * style.tickHalfHeight,
      braceEnd[1] + ny * style.tickHalfHeight,
    ];

    segments[0].setEndpoints(startTickA, startTickB);
    segments[1].setEndpoints(braceStart, leftShoulder);
    segments[2].setEndpoints(leftShoulder, kinkPeak);
    segments[3].setEndpoints(kinkPeak, rightShoulder);
    segments[4].setEndpoints(rightShoulder, braceEnd);
    segments[5].setEndpoints(endTickA, endTickB);

    label
      .setText(measurementText ?? formatRawLength(length))
      .moveTo(
        midpointX + nx * (style.offset + style.kinkHeight + style.labelOffset),
        midpointY + ny * (style.offset + style.kinkHeight + style.labelOffset),
      );
  }

  return { segments, label, update };
}

function createAngleDecoration(
  name: string,
  style: AngleStyle,
  shape: "sector" | "right-angle" = "sector",
) {
  const sector = createAngleSector2D({
    name: `${name}:sector`,
    center: [0, 0],
    startAngle: 0,
    endAngle: Math.PI / 2,
    direction: "counterclockwise",
    radius: 0.45,
    segments: 144,
    shape,
    fill: style.fill,
    fillOpacity: shape === "right-angle" ? 0.16 : 0.22,
    outline: style.outline,
    outlineOpacity: 0.86,
  });

  const label = createTextLabel2D({
    name: `${name}:label`,
    text: shape === "right-angle" ? "90°" : "0°",
    position: [0, 0],
    anchor: [0.5, 0.5],
    color: style.labelColor,
    fontSizePx: 13,
    fontWeight: 750,
    background: style.labelBackground,
    border: style.labelBorder,
    borderRadiusPx: 7,
    padding: "0.08rem 0.28rem",
  });

  function update(
    center: Vec2Tuple,
    firstArm: Vec2Tuple,
    secondArm: Vec2Tuple,
    radiusScale: number,
    measurementText?: string,
  ): void {
    const firstDx = firstArm[0] - center[0];
    const firstDy = firstArm[1] - center[1];
    const secondDx = secondArm[0] - center[0];
    const secondDy = secondArm[1] - center[1];

    const firstLength = Math.hypot(firstDx, firstDy);
    const secondLength = Math.hypot(secondDx, secondDy);

    if (firstLength <= EPSILON || secondLength <= EPSILON) {
      sector.setCenter(center).setRadius(0);
      label.setText("—").moveTo(center[0], center[1] + 0.2);
      return;
    }

    const startAngle = Math.atan2(firstDy, firstDx);
    const endAngle = Math.atan2(secondDy, secondDx);
    const counterclockwiseSweep = positiveModulo(endAngle - startAngle, TAU);
    const direction =
      counterclockwiseSweep <= Math.PI ? "counterclockwise" : "clockwise";
    const interiorAngle =
      direction === "counterclockwise"
        ? counterclockwiseSweep
        : TAU - counterclockwiseSweep;

    const radius = Math.min(
      0.58 * radiusScale,
      Math.max(
        0.14 * radiusScale,
        Math.min(firstLength, secondLength) * 0.22,
      ),
    );

    sector
      .setCenter(center)
      .setRadius(radius)
      .setDirection(direction)
      .setAngles(startAngle, endAngle);

    const labelPosition = sector.getLabelPosition(
      shape === "right-angle" ? 1.38 : 1.55,
    );

    label
      .setText(
        measurementText ??
          (shape === "right-angle" ? "90°" : formatRawAngle(interiorAngle)),
      )
      .moveTo(labelPosition[0], labelPosition[1]);
  }

  return { sector, label, update };
}

const rightAngleStyle: AngleStyle = {
  fill: HUES.gold.base,
  outline: HUES.gold.light,
  labelColor: "rgba(255, 239, 198, 0.98)",
  labelBackground: "rgba(45, 34, 14, 0.72)",
  labelBorder: "1px solid rgba(255, 226, 138, 0.18)",
};

const acuteAngleStyles: [AngleStyle, AngleStyle] = [
  {
    fill: HUES.purple.base,
    outline: HUES.purple.light,
    labelColor: "rgba(232, 224, 255, 0.98)",
    labelBackground: "rgba(31, 22, 55, 0.72)",
    labelBorder: "1px solid rgba(198, 180, 255, 0.18)",
  },
  {
    fill: HUES.magenta.base,
    outline: HUES.magenta.light,
    labelColor: "rgba(255, 224, 239, 0.98)",
    labelBackground: "rgba(52, 20, 38, 0.72)",
    labelBorder: "1px solid rgba(255, 154, 187, 0.18)",
  },
];

const bigBraceStyle: BraceStyle = {
  offset: 0.28,
  kinkHeight: 0.15,
  kinkHalfWidth: 0.22,
  tickHalfHeight: 0.075,
  labelOffset: 0.17,
  lineColor: HUES.gold.light,
  labelColor: "rgba(255, 235, 188, 0.98)",
  labelBackground: "rgba(44, 34, 14, 0.72)",
  labelBorder: "1px solid rgba(255, 218, 128, 0.16)",
};

const smallBraceStyle: BraceStyle = {
  offset: 0.22,
  kinkHeight: 0.12,
  kinkHalfWidth: 0.18,
  tickHalfHeight: 0.06,
  labelOffset: 0.14,
  lineColor: HUES.purple.light,
  labelColor: "rgba(235, 228, 255, 0.98)",
  labelBackground: "rgba(31, 22, 55, 0.72)",
  labelBorder: "1px solid rgba(198, 180, 255, 0.16)",
};

function createTriangleVisual(
  name: string,
  initialVertices: readonly Vec2Tuple[],
  edgeColor: string,
  markerOutline: string,
  markerFill: string,
  braceStyle: BraceStyle,
  angleRadiusScale: number,
) {
  const edges = [
    createVector2D({
      name: `${name}:edge-ab`,
      start: initialVertices[0],
      end: initialVertices[1],
      style: {
        color: edgeColor,
        opacity: 0.96,
        shaftWidth: 0.052,
        headLength: 0,
        headWidth: 0,
      },
    }),
    createVector2D({
      name: `${name}:edge-bc`,
      start: initialVertices[1],
      end: initialVertices[2],
      style: {
        color: edgeColor,
        opacity: 0.96,
        shaftWidth: 0.052,
        headLength: 0,
        headWidth: 0,
      },
    }),
    createVector2D({
      name: `${name}:edge-ca`,
      start: initialVertices[2],
      end: initialVertices[0],
      style: {
        color: edgeColor,
        opacity: 0.96,
        shaftWidth: 0.052,
        headLength: 0,
        headWidth: 0,
      },
    }),
  ];

  const markers = initialVertices.map((vertex, index) => {
    const isRightAngleVertex = index === 0;
    const marker = createParametricShape2D({
      name: `${name}:vertex-${index}`,
      curve: unitCircle,
      domain: [0, TAU],
      segments: 72,
      style: {
        outline: isRightAngleVertex ? HUES.gold.light : markerOutline,
        outlineWidth: 1.8,
        outlineOpacity: 1,
        fill: isRightAngleVertex ? HUES.gold.base : markerFill,
        fillOpacity: isRightAngleVertex ? 0.78 : 0.98,
      },
    })
      .resizeTo(isRightAngleVertex ? 0.09 : 0.125)
      .moveTo(vertex[0], vertex[1]);

    marker.position.z = 0.08;
    return marker;
  });

  const braces = [
    createDimensionBrace(`${name}:brace-ab`, braceStyle),
    createDimensionBrace(`${name}:brace-bc`, braceStyle),
    createDimensionBrace(`${name}:brace-ca`, braceStyle),
  ];

  const angles = [
    createAngleDecoration(`${name}:angle-a`, rightAngleStyle, "right-angle"),
    createAngleDecoration(`${name}:angle-b`, acuteAngleStyles[0]),
    createAngleDecoration(`${name}:angle-c`, acuteAngleStyles[1]),
  ];

  return {
    edges,
    markers,
    braces,
    angles,
    angleRadiusScale,
  };
}

reconstructRightAngleVertex();
synchronizeSmallVertices();

const bigTriangle = createTriangleVisual(
  "similar-right-big",
  bigVertices,
  HUES.cyan.light,
  HUES.cyan.soft,
  HUES.cyan.base,
  bigBraceStyle,
  1,
);

const smallTriangle = createTriangleVisual(
  "similar-right-small",
  smallVertices,
  HUES.magenta.light,
  HUES.magenta.soft,
  HUES.magenta.base,
  smallBraceStyle,
  0.82,
);

const ratioLabel = createTextLabel2D({
  name: "similar-right-triangles-ratio-label",
  text: "",
  position: [6.1, -2.65],
  anchor: [1, 0.5],
  color: "rgba(235, 245, 255, 0.98)",
  fontSizePx: 13,
  fontWeight: 760,
  background: "rgba(17, 14, 30, 0.82)",
  border: "1px solid rgba(112, 231, 255, 0.18)",
  borderRadiusPx: 8,
  padding: "0.22rem 0.48rem",
});

scene.add(
  ...bigTriangle.edges,
  ...bigTriangle.braces.flatMap((brace) => [...brace.segments, brace.label]),
  ...bigTriangle.angles.flatMap((angle) => [angle.sector, angle.label]),
  ...bigTriangle.markers,

  ...smallTriangle.edges,
  ...smallTriangle.braces.flatMap((brace) => [...brace.segments, brace.label]),
  ...smallTriangle.angles.flatMap((angle) => [angle.sector, angle.label]),
  ...smallTriangle.markers,

  ratioLabel,
);

function updateTriangleVisual(
  visual: ReturnType<typeof createTriangleVisual>,
  vertices: readonly Vec2Tuple[],
  lengthLabels: readonly [string, string, string],
  angleLabels: readonly [string, string, string],
): void {
  const [a, b, c] = vertices;

  visual.edges[0].setEndpoints(a, b);
  visual.edges[1].setEndpoints(b, c);
  visual.edges[2].setEndpoints(c, a);

  visual.markers[0].moveTo(a[0], a[1]);
  visual.markers[1].moveTo(b[0], b[1]);
  visual.markers[2].moveTo(c[0], c[1]);

  visual.braces[0].update(a, b, c, lengthLabels[0]);
  visual.braces[1].update(b, c, a, lengthLabels[1]);
  visual.braces[2].update(c, a, b, lengthLabels[2]);

  visual.angles[0].update(a, b, c, visual.angleRadiusScale, angleLabels[0]);
  visual.angles[1].update(b, c, a, visual.angleRadiusScale, angleLabels[1]);
  visual.angles[2].update(c, a, b, visual.angleRadiusScale, angleLabels[2]);
}

function updateScene(): void {
  reconstructRightAngleVertex();
  synchronizeSmallVertices();

  const measurements = buildMeasurementPresentation();

  updateTriangleVisual(
    bigTriangle,
    bigVertices,
    measurements.bigLengths,
    measurements.angles,
  );
  updateTriangleVisual(
    smallTriangle,
    smallVertices,
    measurements.smallLengths,
    measurements.angles,
  );
  ratioLabel.setText(measurements.ratioText);
}

function setMeasurementDisplayMode(mode: MeasurementDisplayMode): void {
  measurementDisplayMode = mode;
  updateScene();
}

updateScene();

const dragging = new PointDragController2D(scene);

/*
  A (index 0) is intentionally not registered. Only the two acute vertices are
  direct controls; dragging them reconstructs the right-angle vertex.
*/
for (const index of [1, 2] as const) {
  dragging.registerPoint({
    getPosition: () => bigVertices[index],
    onDrag: (pointerPosition) => {
      setAcuteVertex(index, pointerPosition);
      updateScene();
    },
    hitRadiusPixels: 28,
    hoverCursor: "grab",
  });
}

for (const index of [1, 2] as const) {
  dragging.registerPoint({
    getPosition: () => smallVertices[index],
    onDrag: (pointerPosition) => {
      setAcuteVertex(index, smallToBig(pointerPosition));
      updateScene();
    },
    hitRadiusPixels: 28,
    hoverCursor: "grab",
  });
}

const resizeObserver = new ResizeObserver(() => {
  constrainRightTriangleToViewport();
  updateScene();
});
resizeObserver.observe(canvas);

Object.assign(window, {
  similarRightTrianglesDemo: {
    scene,
    similarityRatio: SIMILARITY_RATIO,
    bigVertices,
    smallVertices,
    bigTriangle,
    smallTriangle,
    ratioLabel,
    measurements: {
      config: MEASUREMENT_DISPLAY,
      getMode: () => measurementDisplayMode,
      setMode: setMeasurementDisplayMode,
    },
    separation: {
      centerX: SEPARATION_X,
      leftMaxX: LEFT_REGION_MAX_X,
      rightMinX: RIGHT_REGION_MIN_X,
    },
  },
});

const destroy = (): void => {
  resizeObserver.disconnect();
  dragging.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
