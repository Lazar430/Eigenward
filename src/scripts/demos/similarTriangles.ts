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

const SIMILARITY_RATIO = 0.62;

const BIG_CENTER: Vec2Tuple = [-2.75, 0.2];
const SMALL_CENTER: Vec2Tuple = [3.15, 0.35];

const canvas = document.querySelector<HTMLCanvasElement>("#similar-triangles");

if (!canvas) {
  throw new Error("The similar-triangles demonstration canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: 7.4,
  center: [0.2, 0.05],
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

const bigVertices: [MutablePoint2D, MutablePoint2D, MutablePoint2D] = [
  [BIG_CENTER[0] - 1.9, BIG_CENTER[1] - 1.35],
  [BIG_CENTER[0] + 1.8, BIG_CENTER[1] - 1.15],
  [BIG_CENTER[0] + 0.15, BIG_CENTER[1] + 1.8],
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

function formatLength(length: number): string {
  const rounded = Math.round(length * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(2);
}

function formatAngle(angleRadians: number): string {
  const degrees = angleRadians * 180 / Math.PI;
  const rounded = Math.round(degrees * 10) / 10;

  return Number.isInteger(rounded)
    ? `${rounded.toFixed(0)}°`
    : `${rounded.toFixed(1)}°`;
}

function formatRatio(value: number): string {
  return value.toFixed(2);
}

function distance(a: Vec2Tuple, b: Vec2Tuple): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/*
  The smaller triangle is a horizontally mirrored and uniformly scaled copy
  of the larger one. The inverse transform lets either triangle drive the other.
*/
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

function synchronizeSmallVertices(): void {
  for (let index = 0; index < 3; index += 1) {
    const mapped = bigToSmall(bigVertices[index]);
    smallVertices[index][0] = mapped[0];
    smallVertices[index][1] = mapped[1];
  }
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

  function update(start: Vec2Tuple, end: Vec2Tuple, opposite: Vec2Tuple): void {
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

    // Keep the measurement brace on the exterior side of the triangle.
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
      .setText(formatLength(length))
      .moveTo(
        midpointX + nx * (style.offset + style.kinkHeight + style.labelOffset),
        midpointY + ny * (style.offset + style.kinkHeight + style.labelOffset),
      );
  }

  return { segments, label, update };
}

function createAngleDecoration(name: string, style: AngleStyle) {
  const sector = createAngleSector2D({
    name: `${name}:sector`,
    center: [0, 0],
    startAngle: 0,
    endAngle: Math.PI / 3,
    direction: "counterclockwise",
    radius: 0.45,
    segments: 144,
    fill: style.fill,
    fillOpacity: 0.22,
    outline: style.outline,
    outlineOpacity: 0.82,
  });

  const label = createTextLabel2D({
    name: `${name}:label`,
    text: "0°",
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

    const labelPosition = sector.getLabelPosition(1.55);

    label
      .setText(formatAngle(interiorAngle))
      .moveTo(labelPosition[0], labelPosition[1]);
  }

  return { sector, label, update };
}

const angleStyles: [AngleStyle, AngleStyle, AngleStyle] = [
  {
    fill: HUES.purple.base,
    outline: HUES.purple.light,
    labelColor: "rgba(232, 224, 255, 0.98)",
    labelBackground: "rgba(31, 22, 55, 0.72)",
    labelBorder: "1px solid rgba(198, 180, 255, 0.18)",
  },
  {
    fill: HUES.gold.base,
    outline: HUES.gold.light,
    labelColor: "rgba(255, 239, 198, 0.98)",
    labelBackground: "rgba(45, 34, 14, 0.72)",
    labelBorder: "1px solid rgba(255, 226, 138, 0.18)",
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
    const marker = createParametricShape2D({
      name: `${name}:vertex-${index}`,
      curve: unitCircle,
      domain: [0, TAU],
      segments: 72,
      style: {
        outline: markerOutline,
        outlineWidth: 1.8,
        outlineOpacity: 1,
        fill: markerFill,
        fillOpacity: 0.98,
      },
    })
      .resizeTo(0.115)
      .moveTo(vertex[0], vertex[1]);

    marker.position.z = 0.08;
    return marker;
  });

  const braces = [
    createDimensionBrace(`${name}:brace-ab`, braceStyle),
    createDimensionBrace(`${name}:brace-bc`, braceStyle),
    createDimensionBrace(`${name}:brace-ca`, braceStyle),
  ];

  const angles = angleStyles.map((style, index) =>
    createAngleDecoration(`${name}:angle-${index}`, style),
  );

  return {
    edges,
    markers,
    braces,
    angles,
    angleRadiusScale,
  };
}

synchronizeSmallVertices();

const bigTriangle = createTriangleVisual(
  "similar-big",
  bigVertices,
  HUES.cyan.light,
  HUES.cyan.soft,
  HUES.cyan.base,
  bigBraceStyle,
  1,
);

const smallTriangle = createTriangleVisual(
  "similar-small",
  smallVertices,
  HUES.magenta.light,
  HUES.magenta.soft,
  HUES.magenta.base,
  smallBraceStyle,
  0.82,
);

const ratioLabel = createTextLabel2D({
  name: "similarity-ratio-label",
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
): void {
  const [a, b, c] = vertices;

  visual.edges[0].setEndpoints(a, b);
  visual.edges[1].setEndpoints(b, c);
  visual.edges[2].setEndpoints(c, a);

  visual.markers[0].moveTo(a[0], a[1]);
  visual.markers[1].moveTo(b[0], b[1]);
  visual.markers[2].moveTo(c[0], c[1]);

  visual.braces[0].update(a, b, c);
  visual.braces[1].update(b, c, a);
  visual.braces[2].update(c, a, b);

  visual.angles[0].update(a, b, c, visual.angleRadiusScale);
  visual.angles[1].update(b, c, a, visual.angleRadiusScale);
  visual.angles[2].update(c, a, b, visual.angleRadiusScale);
}

function updateRatioLabel(): void {
  const bigLengths = [
    distance(bigVertices[0], bigVertices[1]),
    distance(bigVertices[1], bigVertices[2]),
    distance(bigVertices[2], bigVertices[0]),
  ];

  const smallLengths = [
    distance(smallVertices[0], smallVertices[1]),
    distance(smallVertices[1], smallVertices[2]),
    distance(smallVertices[2], smallVertices[0]),
  ];

  const fractions = smallLengths.map((smallLength, index) => {
    const bigLength = bigLengths[index];

    if (bigLength <= EPSILON) {
      return "—";
    }

    return `${formatLength(smallLength)}/${formatLength(bigLength)}`;
  });

  ratioLabel.setText(
    `${fractions[0]} = ${fractions[1]} = ${fractions[2]} = ${formatRatio(SIMILARITY_RATIO)}`,
  );
}

function updateScene(): void {
  synchronizeSmallVertices();

  updateTriangleVisual(bigTriangle, bigVertices);
  updateTriangleVisual(smallTriangle, smallVertices);
  updateRatioLabel();
}

updateScene();

const dragging = new PointDragController2D(scene);

/* Dragging any large-triangle vertex directly changes the canonical triangle. */
bigVertices.forEach((vertex, index) => {
  dragging.registerPoint({
    getPosition: () => bigVertices[index],
    onDrag: (pointerPosition) => {
      vertex[0] = pointerPosition[0];
      vertex[1] = pointerPosition[1];
      updateScene();
    },
    hitRadiusPixels: 26,
    hoverCursor: "grab",
  });
});

/*
  Dragging the smaller triangle applies the inverse similarity transform first,
  so the larger triangle changes immediately and the smaller one is regenerated
  from the same canonical geometry.
*/
smallVertices.forEach((_, index) => {
  dragging.registerPoint({
    getPosition: () => smallVertices[index],
    onDrag: (pointerPosition) => {
      const mapped = smallToBig(pointerPosition);

      bigVertices[index][0] = mapped[0];
      bigVertices[index][1] = mapped[1];

      updateScene();
    },
    hitRadiusPixels: 26,
    hoverCursor: "grab",
  });
});

Object.assign(window, {
  similarTrianglesDemo: {
    scene,
    similarityRatio: SIMILARITY_RATIO,
    bigVertices,
    smallVertices,
    bigTriangle,
    smallTriangle,
    ratioLabel,
  },
});

const destroy = (): void => {
  dragging.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
