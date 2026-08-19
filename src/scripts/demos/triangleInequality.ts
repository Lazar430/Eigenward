import {
  HUES,
  PointDragController2D,
  createMathScene2D,
  createParametricShape2D,
  createTextLabel2D,
  createVector2D,
  type TextLabel2D,
  type Vec2Tuple,
  type Vector2D,
} from "../math-graphics";

const TAU = Math.PI * 2;
const EPSILON = 1e-8;

const BRACE_OFFSET = 0.28;
const BRACE_KINK_HEIGHT = 0.16;
const BRACE_KINK_HALF_WIDTH = 0.22;
const BRACE_TICK_HALF_HEIGHT = 0.08;
const LABEL_OFFSET = 0.19;

const canvas = document.querySelector<HTMLCanvasElement>("#triangle-inequality");

if (!canvas) {
  throw new Error("The triangle inequality demonstration canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: 6.4,
  center: [0, 0.15],
  background: null,
});

type MutablePoint2D = [number, number];

type DimensionBrace2D = {
  segments: Vector2D[];
  label: TextLabel2D;
  update: (start: Vec2Tuple, end: Vec2Tuple, opposite: Vec2Tuple) => void;
};

const vertices: [MutablePoint2D, MutablePoint2D, MutablePoint2D] = [
  [-2.25, -1.25],
  [2.25, -1.05],
  [0.25, 1.75],
];

const unitCircle = (parameter: number): Vec2Tuple => [
  Math.cos(parameter),
  Math.sin(parameter),
];

function formatLength(length: number): string {
  const rounded = Math.round(length * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(2);
}

function createSegment(name: string, opacity = 1): Vector2D {
  return createVector2D({
    name,
    start: [0, 0],
    end: [0, 0],
    style: {
      color: HUES.gold.light,
      opacity,
      shaftWidth: 0.034,
      headLength: 0,
      headWidth: 0,
    },
  });
}

function createDimensionBrace(name: string): DimensionBrace2D {
  const segments = Array.from({ length: 6 }, (_, index) =>
    createSegment(`${name}:segment-${index}`, index === 0 || index === 5 ? 0.72 : 0.9),
  );

  const label = createTextLabel2D({
    name: `${name}:label`,
    text: "0",
    position: [0, 0],
    anchor: [0.5, 0.5],
    color: "rgba(255, 232, 176, 0.98)",
    fontSizePx: 15,
    fontWeight: 760,
    background: "rgba(18, 13, 34, 0.72)",
    border: "1px solid rgba(255, 218, 128, 0.16)",
    borderRadiusPx: 7,
    padding: "0.12rem 0.36rem",
  });

  function update(start: Vec2Tuple, end: Vec2Tuple, opposite: Vec2Tuple): void {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = Math.hypot(dx, dy);

    if (length <= EPSILON) {
      for (const segment of segments) {
        segment.setEndpoints(start, start);
      }
      label.setText("0").moveTo(start[0], start[1] + BRACE_OFFSET + LABEL_OFFSET);
      return;
    }

    const ux = dx / length;
    const uy = dy / length;

    let nx = -uy;
    let ny = ux;

    const midpointX = (start[0] + end[0]) / 2;
    const midpointY = (start[1] + end[1]) / 2;

    // Choose the normal pointing away from the triangle interior.
    const towardOppositeX = opposite[0] - midpointX;
    const towardOppositeY = opposite[1] - midpointY;
    if (towardOppositeX * nx + towardOppositeY * ny > 0) {
      nx *= -1;
      ny *= -1;
    }

    const braceStart: Vec2Tuple = [
      start[0] + nx * BRACE_OFFSET,
      start[1] + ny * BRACE_OFFSET,
    ];
    const braceEnd: Vec2Tuple = [
      end[0] + nx * BRACE_OFFSET,
      end[1] + ny * BRACE_OFFSET,
    ];

    const kinkHalfWidth = Math.min(BRACE_KINK_HALF_WIDTH, length * 0.16);
    const leftShoulder: Vec2Tuple = [
      midpointX - ux * kinkHalfWidth + nx * BRACE_OFFSET,
      midpointY - uy * kinkHalfWidth + ny * BRACE_OFFSET,
    ];
    const rightShoulder: Vec2Tuple = [
      midpointX + ux * kinkHalfWidth + nx * BRACE_OFFSET,
      midpointY + uy * kinkHalfWidth + ny * BRACE_OFFSET,
    ];
    const kinkPeak: Vec2Tuple = [
      midpointX + nx * (BRACE_OFFSET + BRACE_KINK_HEIGHT),
      midpointY + ny * (BRACE_OFFSET + BRACE_KINK_HEIGHT),
    ];

    const startTickA: Vec2Tuple = [
      braceStart[0] - nx * BRACE_TICK_HALF_HEIGHT,
      braceStart[1] - ny * BRACE_TICK_HALF_HEIGHT,
    ];
    const startTickB: Vec2Tuple = [
      braceStart[0] + nx * BRACE_TICK_HALF_HEIGHT,
      braceStart[1] + ny * BRACE_TICK_HALF_HEIGHT,
    ];
    const endTickA: Vec2Tuple = [
      braceEnd[0] - nx * BRACE_TICK_HALF_HEIGHT,
      braceEnd[1] - ny * BRACE_TICK_HALF_HEIGHT,
    ];
    const endTickB: Vec2Tuple = [
      braceEnd[0] + nx * BRACE_TICK_HALF_HEIGHT,
      braceEnd[1] + ny * BRACE_TICK_HALF_HEIGHT,
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
        midpointX + nx * (BRACE_OFFSET + BRACE_KINK_HEIGHT + LABEL_OFFSET),
        midpointY + ny * (BRACE_OFFSET + BRACE_KINK_HEIGHT + LABEL_OFFSET),
      );
  }

  return { segments, label, update };
}

const edges = [
  createVector2D({
    name: "triangle-edge-ab",
    start: vertices[0],
    end: vertices[1],
    style: {
      color: HUES.cyan.light,
      opacity: 0.96,
      shaftWidth: 0.052,
      headLength: 0,
      headWidth: 0,
    },
  }),
  createVector2D({
    name: "triangle-edge-bc",
    start: vertices[1],
    end: vertices[2],
    style: {
      color: HUES.cyan.light,
      opacity: 0.96,
      shaftWidth: 0.052,
      headLength: 0,
      headWidth: 0,
    },
  }),
  createVector2D({
    name: "triangle-edge-ca",
    start: vertices[2],
    end: vertices[0],
    style: {
      color: HUES.cyan.light,
      opacity: 0.96,
      shaftWidth: 0.052,
      headLength: 0,
      headWidth: 0,
    },
  }),
];

const markers = vertices.map((vertex, index) => {
  const marker = createParametricShape2D({
    name: `triangle-vertex-${index}`,
    curve: unitCircle,
    domain: [0, TAU],
    segments: 72,
    style: {
      outline: HUES.cyan.soft,
      outlineWidth: 1.8,
      outlineOpacity: 1,
      fill: HUES.cyan.base,
      fillOpacity: 0.98,
    },
  })
    .resizeTo(0.05)
    .moveTo(vertex[0], vertex[1]);

  marker.position.z = 0.08;
  return marker;
});

const braces = [
  createDimensionBrace("triangle-brace-ab"),
  createDimensionBrace("triangle-brace-bc"),
  createDimensionBrace("triangle-brace-ca"),
];

scene.add(
  ...edges,
  ...braces.flatMap((brace) => [...brace.segments, brace.label]),
  ...markers,
);

function updateTriangle(): void {
  const [a, b, c] = vertices;

  edges[0].setEndpoints(a, b);
  edges[1].setEndpoints(b, c);
  edges[2].setEndpoints(c, a);

  markers[0].moveTo(a[0], a[1]);
  markers[1].moveTo(b[0], b[1]);
  markers[2].moveTo(c[0], c[1]);

  braces[0].update(a, b, c);
  braces[1].update(b, c, a);
  braces[2].update(c, a, b);
}

updateTriangle();

const dragging = new PointDragController2D(scene);

vertices.forEach((vertex, index) => {
  dragging.registerPoint({
    getPosition: () => vertices[index],
    onDrag: (pointerPosition) => {
      vertex[0] = pointerPosition[0];
      vertex[1] = pointerPosition[1];
      updateTriangle();
    },
    hitRadiusPixels: 26,
    hoverCursor: "grab",
  });
});

Object.assign(window, {
  triangleInequalityDemo: {
    scene,
    vertices,
    edges,
    braces,
    markers,
  },
});

const destroy = (): void => {
  dragging.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
