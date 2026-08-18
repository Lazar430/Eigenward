import {
  HUES,
  buildFourierEpicycleChain2D,
  calculateFourierRmsError2D,
  computeFourierCoefficients2D,
  createMathScene2D,
  createParametricShape2D,
  createVector2D,
  getFourierCoefficientAmplitude2D,
  normalizePointSamples2D,
  orderFourierCoefficients2D,
  reconstructFourierPoint2D,
  resamplePolylineByArcLength2D,
  type FourierCoefficient2D,
  type ParametricCurve2D,
  type Vec2Tuple,
} from "../math-graphics";

const TAU = Math.PI * 2;
const SOURCE_SAMPLE_COUNT = 2048;
const TERM_COUNT = 21;
const DRAW_SECONDS = 4.5;
const HOLD_SECONDS = 0.8;
const CYCLE_SECONDS = DRAW_SECONDS + HOLD_SECONDS;
const EPICYCLE_VISIBILITY_RADIUS = 0.012;

const canvas = document.querySelector<HTMLCanvasElement>("#fourier-epicycles");

if (!canvas) {
  throw new Error("The Fourier epicycle test canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: 6.2,
  center: [0, 0],
  background: null,
});

/*
 * Batch 1 intentionally starts from a plain closed polyline rather than SVG.
 * Batch 2 will replace this hand-authored source with the SVG asset compiler.
 *
 * A sharp five-point star is useful here because it makes truncation visible:
 * more Fourier terms progressively recover its corners.
 */
const rawStarVertices: Vec2Tuple[] = Array.from({ length: 10 }, (_, index) => {
  const angle = -Math.PI / 2 + (TAU * index) / 10;
  const radius = index % 2 === 0 ? 2.25 : 0.92;
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
});

const arcLengthSamples = resamplePolylineByArcLength2D(
  rawStarVertices,
  SOURCE_SAMPLE_COUNT,
  true,
);

const sourceSamples = normalizePointSamples2D(arcLengthSamples, {
  targetSpan: 4.6,
  center: [0, 0],
}).points;

const coefficients = orderFourierCoefficients2D(
  computeFourierCoefficients2D(sourceSamples, {
    termCount: TERM_COUNT,
  }),
  "frequency",
);

/*
 * Tiny sign-convention sanity check: a counterclockwise unit circle should be
 * represented almost entirely by the n = +1 coefficient.
 */
function verifyFourierConvention(): void {
  const circleSamples: Vec2Tuple[] = Array.from(
    { length: 512 },
    (_, index) => {
      const angle = (TAU * index) / 512;
      return [Math.cos(angle), Math.sin(angle)];
    },
  );

  const circleCoefficients = computeFourierCoefficients2D(circleSamples, {
    frequencies: [-1, 0, 1],
  });

  const positiveOne = circleCoefficients.find(
    (coefficient) => coefficient.frequency === 1,
  );

  if (
    !positiveOne ||
    Math.abs(getFourierCoefficientAmplitude2D(positiveOne) - 1) > 1e-8
  ) {
    throw new Error(
      "Fourier convention check failed: the unit circle should have c_1 = 1.",
    );
  }
}

verifyFourierConvention();

const unitCircleCurve: ParametricCurve2D = (parameter) => [
  Math.cos(parameter),
  Math.sin(parameter),
];

/*
 * The reconstructed trace uses existing immutable outline geometry plus the
 * engine's shader reveal. Batch 3 will turn this idea into a dedicated Fourier
 * primitive instead of composing many general-purpose objects.
 */
const reconstructedTrace = createParametricShape2D({
  name: "fourier-batch1-reconstruction",
  curve: (progress) => reconstructFourierPoint2D(coefficients, progress),
  domain: [0, 1],
  segments: 1400,
  style: {
    outline: HUES.cyan.light,
    outlineWidth: 3.2,
    outlineOpacity: 0.98,
    fill: null,
  },
});
reconstructedTrace.setOutlineTraceRange(0, 0);

const epicycleCircles = coefficients.map((_, index) =>
  createParametricShape2D({
    name: `fourier-batch1-circle-${index}`,
    curve: unitCircleCurve,
    domain: [0, TAU],
    segments: 96,
    style: {
      outline: HUES.purple.light,
      outlineWidth: 1.25,
      outlineOpacity: 0.34,
      fill: null,
    },
  }),
);

const epicycleVectors = coefficients.map((_, index) =>
  createVector2D({
    name: `fourier-batch1-vector-${index}`,
    start: [0, 0],
    end: [0, 0],
    style: {
      color: HUES.gold.light,
      opacity: 0.84,
      shaftWidth: 0.025,
      headLength: 0.13,
      headWidth: 0.095,
    },
  }),
);

const tipMarker = createParametricShape2D({
  name: "fourier-batch1-tip",
  curve: unitCircleCurve,
  domain: [0, TAU],
  segments: 64,
  style: {
    outline: HUES.cyan.soft,
    outlineWidth: 1.1,
    outlineOpacity: 0.95,
    fill: HUES.cyan.base,
    fillOpacity: 0.95,
  },
}).resizeTo(0.055);

scene.add(
  reconstructedTrace,
  ...epicycleCircles,
  ...epicycleVectors,
  tipMarker,
);

function updateScene(progress: number): void {
  const chain = buildFourierEpicycleChain2D(coefficients, progress);

  chain.forEach((link, index) => {
    const circle = epicycleCircles[index];
    const vector = epicycleVectors[index];
    const visible = link.radius > EPICYCLE_VISIBILITY_RADIUS;

    circle.visible = visible;
    if (visible) {
      circle.moveTo(link.center[0], link.center[1]);
      circle.resizeTo(link.radius);
    }

    vector.setEndpoints(link.center, link.tip);
    vector.visible = visible;
  });

  const finalTip = chain.at(-1)?.tip ?? [0, 0];
  tipMarker.moveTo(finalTip[0], finalTip[1]);
  reconstructedTrace.setOutlineTraceRange(0, progress);
}

let elapsedSeconds = 0;

const stopAnimation = scene.onFrame(({ deltaTime }) => {
  // Using deltaTime rather than absolute RAF time means the diagnostic animation
  // naturally pauses while MathScene2D is offscreen or the document is hidden.
  elapsedSeconds += deltaTime;

  const cycleTime = elapsedSeconds % CYCLE_SECONDS;
  const progress = Math.min(cycleTime / DRAW_SECONDS, 1);
  updateScene(progress);
});

updateScene(0);

const rmsError = calculateFourierRmsError2D(sourceSamples, coefficients);
console.info(
  `[Fourier batch 1] ${TERM_COUNT}-term star reconstruction RMS error: ${rmsError.toFixed(4)}`,
);

Object.assign(window, {
  fourierEpicycleBatch1: {
    scene,
    coefficients,
    sourceSamples,
    rmsError,
  },
});

const destroy = (): void => {
  stopAnimation();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
