import {
  COLORS,
  HUES,
  createExplicitShape2D,
  createMathScene2D,
  createParametricShape2D,
  createPolygon2D,
  createRegularPolygonVertices,
  type ParametricCurve2D,
} from "../math-graphics";

const TAU = Math.PI * 2;

/** Unit circle in parametric form: t ↦ (cos t, sin t). */
const unitCircle: ParametricCurve2D = (t) => [
  Math.cos(t),
  Math.sin(t),
];

const canvas = document.querySelector<HTMLCanvasElement>(
  "#about-primitives-scene",
);

if (!canvas) {
  throw new Error("The About-page math canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: 7.2,
  center: [0, 0],
  background: null,
});

const parametricCircle = createParametricShape2D({
  name: "parametric-circle",
  curve: unitCircle,
  domain: [0, TAU],
  segments: 160,
  style: {
    outline: HUES.cyan.light,
    outlineWidth: 20,
    fill: HUES.cyan.base,
    fillOpacity: 0.13,
  },
})
  .moveTo(-3.35, 1.15)
  .setScale(1.1, 0.78);

/**
 * The same kind of closed object, now defined by explicit equations:
 *   -sqrt(1 - x²) ≤ y ≤ sqrt(1 - x²),  -1 ≤ x ≤ 1.
 */
const explicitCircle = createExplicitShape2D({
  name: "explicit-circle",
  independentVariable: "x",
  domain: [-1, 1],
  segments: 96,
  upper: (x) => Math.sqrt(Math.max(0, 1 - x * x)),
  lower: (x) => -Math.sqrt(Math.max(0, 1 - x * x)),
  style: {
    outline: HUES.gold.light,
    outlineWidth: 3,
    fill: HUES.gold.base,
    fillOpacity: 0.12,
  },
})
  .moveTo(-0.85, -1.15)
  .resizeTo(1.05);

const pentagon = createPolygon2D({
  name: "regular-pentagon",
  vertices: createRegularPolygonVertices(5, 2.05),
  style: {
    outline: HUES.magenta.light,
    outlineWidth: 1,
    fill: HUES.purple.base,
    fillOpacity: 0.17,
  },
})
  .moveTo(2.2, 1.05)
  .setRotation(-0.15);

const irregularPolygon = createPolygon2D({
  name: "irregular-polygon",
  vertices: [
    [-1.05, -0.55],
    [-0.2, -1.05],
    [0.9, -0.7],
    [1.15, 0.25],
    [0.25, 1.0],
    [-0.85, 0.65],
  ],
  style: {
    outline: HUES.mint.light,
    outlineWidth: 1,
    fill: HUES.mint.base,
    fillOpacity: 0.12,
  },
})
  .moveTo(3.65, -1.45)
  .resizeTo(0.82);

scene.add(
  parametricCircle,
  explicitCircle,
  pentagon,
  irregularPolygon,
);

// Both tracing animations use the scene's shared requestAnimationFrame loop.
const stopExplicitTrace = explicitCircle.traceOutline({
  speed: 0.38,
  loop: true,
  loopPause: 0.35,
});

const stopPentagonTrace = pentagon.traceOutline({
  speed: 0.5,
  loop: true,
  loopPause: 0.2,
});

const stopMotion = scene.onFrame(({ time }) => {
  const seconds = time / 1000;

  parametricCircle.moveTo(
    -3.35 + 0.28 * Math.cos(seconds * 0.7),
    1.15 + 0.22 * Math.sin(seconds * 1.25),
  );

  const pulse = 1.02 + 0.08 * Math.sin(seconds * 1.6);
  explicitCircle.resizeTo(pulse);

  pentagon.setRotation(-0.15 + seconds * 1.42);

  irregularPolygon
    .setRotation(-seconds * 0.28)
    .moveTo(3.65, -1.45 + 0.2 * Math.sin(seconds * 0.9));
});

/** Temporary console handle for experimentation. */
Object.assign(window, {
  mathAboutDemo: {
    scene,
    parametricCircle,
    explicitCircle,
    pentagon,
    irregularPolygon,
    colors: COLORS,
    hues: HUES,
    stopMotion,
    stopTraces() {
      stopExplicitTrace();
      stopPentagonTrace();
    },
  },
});

const destroy = (): void => {
  stopMotion();
  stopExplicitTrace();
  stopPentagonTrace();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });

