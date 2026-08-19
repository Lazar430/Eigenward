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

const MIN_ANGLE_RADIUS = 0.16;
const MAX_ANGLE_RADIUS = 0.68;
const ANGLE_RADIUS_FRACTION = 0.26;
const LABEL_RADIUS_FACTOR = 1.58;

const canvas = document.querySelector<HTMLCanvasElement>("#angle-sum");

if (!canvas) {
  throw new Error("The triangle angle-sum demonstration canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: 6.4,
  center: [0, 0.15],
  background: null,
});

type MutablePoint2D = [number, number];

type AngleDecoration2D = {
  sector: ReturnType<typeof createAngleSector2D>;
  label: ReturnType<typeof createTextLabel2D>;
  update: (center: Vec2Tuple, firstArm: Vec2Tuple, secondArm: Vec2Tuple) => void;
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

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function formatAngle(angleRadians: number): string {
  const degrees = angleRadians * 180 / Math.PI;
  const rounded = Math.round(degrees * 10) / 10;

  return Number.isInteger(rounded)
    ? `${rounded.toFixed(0)}°`
    : `${rounded.toFixed(1)}°`;
}

function createAngleDecoration(
  name: string,
  fill: string,
  outline: string,
  labelColor: string,
  labelBackground: string,
  labelBorder: string,
): AngleDecoration2D {
  const sector = createAngleSector2D({
    name: `${name}:sector`,
    center: [0, 0],
    startAngle: 0,
    endAngle: Math.PI / 3,
    direction: "counterclockwise",
    radius: 0.55,
    segments: 144,
    fill,
    fillOpacity: 0.24,
    outline,
    outlineOpacity: 0.84,
  });

  const label = createTextLabel2D({
    name: `${name}:label`,
    text: "0°",
    position: [0, 0],
    anchor: [0.5, 0.5],
    color: labelColor,
    fontSizePx: 15,
    fontWeight: 760,
    background: labelBackground,
    border: labelBorder,
    borderRadiusPx: 7,
    padding: "0.12rem 0.36rem",
  });

  function update(
    center: Vec2Tuple,
    firstArm: Vec2Tuple,
    secondArm: Vec2Tuple,
  ): void {
    const firstDx = firstArm[0] - center[0];
    const firstDy = firstArm[1] - center[1];
    const secondDx = secondArm[0] - center[0];
    const secondDy = secondArm[1] - center[1];

    const firstLength = Math.hypot(firstDx, firstDy);
    const secondLength = Math.hypot(secondDx, secondDy);

    if (firstLength <= EPSILON || secondLength <= EPSILON) {
      sector.setCenter(center).setRadius(0);
      label.setText("—").moveTo(center[0], center[1] + 0.24);
      return;
    }

    const startAngle = Math.atan2(firstDy, firstDx);
    const endAngle = Math.atan2(secondDy, secondDx);
    const counterclockwiseSweep = positiveModulo(endAngle - startAngle, TAU);

    const direction = counterclockwiseSweep <= Math.PI
      ? "counterclockwise"
      : "clockwise";

    const interiorAngle = direction === "counterclockwise"
      ? counterclockwiseSweep
      : TAU - counterclockwiseSweep;

    const radius = Math.min(
      MAX_ANGLE_RADIUS,
      Math.max(
        MIN_ANGLE_RADIUS,
        Math.min(firstLength, secondLength) * ANGLE_RADIUS_FRACTION,
      ),
    );

    sector
      .setCenter(center)
      .setRadius(radius)
      .setDirection(direction)
      .setAngles(startAngle, endAngle);

    const labelPosition = sector.getLabelPosition(LABEL_RADIUS_FACTOR);

    label
      .setText(formatAngle(interiorAngle))
      .moveTo(labelPosition[0], labelPosition[1]);
  }

  return { sector, label, update };
}

const edges = [
  createVector2D({
    name: "angle-sum-edge-ab",
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
    name: "angle-sum-edge-bc",
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
    name: "angle-sum-edge-ca",
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
    name: `angle-sum-vertex-${index}`,
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
    .resizeTo(0.12)
    .moveTo(vertex[0], vertex[1]);

  marker.position.z = 0.08;
  return marker;
});

const angles = [
  createAngleDecoration(
    "angle-sum-angle-a",
    HUES.purple.base,
    HUES.purple.light,
    "rgba(231, 222, 255, 0.98)",
    "rgba(31, 22, 55, 0.74)",
    "1px solid rgba(198, 180, 255, 0.18)",
  ),
  createAngleDecoration(
    "angle-sum-angle-b",
    HUES.gold.base,
    HUES.gold.light,
    "rgba(255, 238, 194, 0.98)",
    "rgba(45, 34, 14, 0.74)",
    "1px solid rgba(255, 226, 138, 0.18)",
  ),
  createAngleDecoration(
    "angle-sum-angle-c",
    HUES.magenta.base,
    HUES.magenta.light,
    "rgba(255, 222, 237, 0.98)",
    "rgba(52, 20, 38, 0.74)",
    "1px solid rgba(255, 154, 187, 0.18)",
  ),
];

scene.add(
  ...edges,
  ...angles.flatMap((angle) => [angle.sector, angle.label]),
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

  // Each sector uses the smaller directed sweep between its two incident sides,
  // so it continues to represent the interior angle even if the triangle flips.
  angles[0].update(a, b, c);
  angles[1].update(b, c, a);
  angles[2].update(c, a, b);
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
  angleSumDemo: {
    scene,
    vertices,
    edges,
    angles,
    markers,
  },
});

const destroy = (): void => {
  dragging.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
