import {
  HUES,
  createCoordinatePlane2D,
  createMathScene2D,
  createParametricShape2D,
  createTextLabel2D,
  type Vec2Tuple,
} from "../math-graphics";

const TAU = Math.PI * 2;
const UNIT_RADIUS = 1;
const UNIT_SIZE_PIXELS = 125;
const ORIGIN: Vec2Tuple = [0, 0];

interface ReferenceAnglePoint {
  degrees: number;
  radiansLatex: string;
  position: Vec2Tuple;
}

const canvas = document.querySelector<HTMLCanvasElement>(
  "#about-reference-angles-scene",
);

if (!canvas) {
  throw new Error(
    'The canvas "#about-reference-angles-scene" could not be found.',
  );
}

const scene = createMathScene2D(canvas, {
  unitSizePixels: UNIT_SIZE_PIXELS,
  center: [0, 0],
  background: null,
});

const coordinatePlane = createCoordinatePlane2D({
  name: "reference-angles-coordinate-plane",
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
  name: "reference-angles-unit-circle",
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
    fillOpacity: 0.04,
  },
});

function createDot(
  name: string,
  center: Vec2Tuple,
  radius: number,
  fill: string,
  outline = "rgba(255,255,255,0.88)",
) {
  return createParametricShape2D({
    name,
    curve: (parameter) => [
      center[0] + radius * Math.cos(parameter),
      center[1] + radius * Math.sin(parameter),
    ],
    domain: [0, TAU],
    segments: 48,
    style: {
      outline,
      outlineWidth: 1.5,
      outlineOpacity: 0.85,
      fill,
      fillOpacity: 0.95,
    },
  });
}

function createDottedRay(
  name: string,
  angleRadians: number,
  count = 8,
) {
  const dots = [];

  for (let index = 1; index <= count; index += 1) {
    const t = index / count;
    const radius = 0.12 + (UNIT_RADIUS - 0.12) * t;

    dots.push(
      createDot(
        `${name}-dot-${index}`,
        [
          radius * Math.cos(angleRadians),
          radius * Math.sin(angleRadians),
        ],
        0.014,
        "rgba(223, 215, 244, 0.82)",
        "rgba(223, 215, 244, 0.0)",
      ),
    );
  }

  return dots;
}

const referenceAngles: ReferenceAnglePoint[] = [
  { degrees: 0, radiansLatex: "0", position: [1, 0] },
  { degrees: 30, radiansLatex: String.raw`\frac{\pi}{6}`, position: [Math.sqrt(3) / 2, 1 / 2] },
  { degrees: 60, radiansLatex: String.raw`\frac{\pi}{3}`, position: [1 / 2, Math.sqrt(3) / 2] },
  { degrees: 90, radiansLatex: String.raw`\frac{\pi}{2}`, position: [0, 1] },
  { degrees: 120, radiansLatex: String.raw`\frac{2\pi}{3}`, position: [-1 / 2, Math.sqrt(3) / 2] },
  { degrees: 150, radiansLatex: String.raw`\frac{5\pi}{6}`, position: [-Math.sqrt(3) / 2, 1 / 2] },
  { degrees: 180, radiansLatex: String.raw`\pi`, position: [-1, 0] },
  { degrees: 210, radiansLatex: String.raw`\frac{7\pi}{6}`, position: [-Math.sqrt(3) / 2, -1 / 2] },
  { degrees: 240, radiansLatex: String.raw`\frac{4\pi}{3}`, position: [-1 / 2, -Math.sqrt(3) / 2] },
  { degrees: 270, radiansLatex: String.raw`\frac{3\pi}{2}`, position: [0, -1] },
  { degrees: 300, radiansLatex: String.raw`\frac{5\pi}{3}`, position: [1 / 2, -Math.sqrt(3) / 2] },
  { degrees: 330, radiansLatex: String.raw`\frac{11\pi}{6}`, position: [Math.sqrt(3) / 2, -1 / 2] },
];

const dottedRayObjects = referenceAngles.flatMap((angleData) =>
  createDottedRay(
    `reference-angle-ray-${angleData.degrees}`,
    angleData.degrees * Math.PI / 180,
  ),
);

const pointObjects = referenceAngles.map((angleData) =>
  createDot(
    `reference-angle-point-${angleData.degrees}`,
    angleData.position,
    0.038,
    angleData.degrees % 90 === 0
      ? HUES.cyan.base
      : HUES.magenta.base,
  ),
);

const hoverLabel = createTextLabel2D({
  name: "reference-angles-hover-label",
  latex: String.raw`0 = 0^\circ`,
  position: [0, 0],
  anchor: [0.5, 1],
  color: "rgba(247, 244, 255, 0.98)",
  fontSizePx: 15,
  fontWeight: 720,
  background: "rgba(20, 18, 35, 0.82)",
  border: "1px solid rgba(181, 172, 255, 0.24)",
  borderRadiusPx: 8,
  padding: "0.26rem 0.45rem",
  opacity: 0,
});

scene.add(
  coordinatePlane,
  unitCircle,
  ...dottedRayObjects,
  ...pointObjects,
  hoverLabel,
);

function labelLatexForPoint(
  point: ReferenceAnglePoint,
): string {
  return `${point.radiansLatex}\\ \\text{radians} = ${point.degrees}^\\circ`;
}

function hoverLabelPositionForPoint(
  point: ReferenceAnglePoint,
): Vec2Tuple {
  const angleRadians = point.degrees * Math.PI / 180;
  const radialOffset = 0.18;
  const tangentOffset = 0.06;

  return [
    point.position[0]
      + radialOffset * Math.cos(angleRadians)
      - tangentOffset * Math.sin(angleRadians),
    point.position[1]
      + radialOffset * Math.sin(angleRadians)
      + tangentOffset * Math.cos(angleRadians),
  ];
}

function findHoveredReferencePoint(
  worldPoint: Vec2Tuple,
): ReferenceAnglePoint | null {
  const HIT_RADIUS = 0.10;

  let bestMatch: ReferenceAnglePoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const point of referenceAngles) {
    const dx = worldPoint[0] - point.position[0];
    const dy = worldPoint[1] - point.position[1];
    const distance = Math.hypot(dx, dy);

    if (distance <= HIT_RADIUS && distance < bestDistance) {
      bestMatch = point;
      bestDistance = distance;
    }
  }

  return bestMatch;
}

const handlePointerMove = (event: PointerEvent): void => {
  const pointerWorld = scene.clientToWorld(
    event.clientX,
    event.clientY,
  );

  const hoveredPoint =
    findHoveredReferencePoint(pointerWorld);

  if (!hoveredPoint) {
    hoverLabel.setOpacity(0);
    canvas.style.cursor = "default";
    return;
  }

  const labelPosition =
    hoverLabelPositionForPoint(hoveredPoint);

  hoverLabel
    .setLatex(labelLatexForPoint(hoveredPoint))
    .moveTo(labelPosition[0], labelPosition[1])
    .setOpacity(1);

  canvas.style.cursor = "pointer";
};

const handlePointerLeave = (): void => {
  hoverLabel.setOpacity(0);
  canvas.style.cursor = "default";
};

canvas.addEventListener("pointermove", handlePointerMove);
canvas.addEventListener("pointerleave", handlePointerLeave);

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
  const elapsed = (time - introStartTime) / 1000;

  const axisProgress = easeOutCubic(elapsed / 1.15);
  const integerProgress = easeOutCubic((elapsed - 0.95) / 0.9);

  coordinatePlane.setAxisReveal(axisProgress);
  coordinatePlane.setIntegerReveal(integerProgress);

  if (axisProgress >= 1 && integerProgress >= 1) {
    stopIntro();
  }
});

Object.assign(window, {
  mathReferenceAnglesDemo: {
    scene,
    coordinatePlane,
    unitCircle,
    referenceAngles,
    hoverLabel,
  },
});

const destroy = (): void => {
  stopIntro();
  canvas.removeEventListener("pointermove", handlePointerMove);
  canvas.removeEventListener("pointerleave", handlePointerLeave);
  canvas.style.cursor = "default";
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
