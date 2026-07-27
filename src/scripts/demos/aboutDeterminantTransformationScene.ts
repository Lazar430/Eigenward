import {
  HUES,
  IDENTITY_MATRIX_2,
  applyMatrix2,
  createMathScene2D,
  createParallelogramArea2D,
  createVector2D,
  inverseMatrix2,
  lerpMatrix2,
  multiplyMatrix2,
  type Matrix2,
  type Vec2Tuple,
} from "../math-graphics";

const canvas = document.querySelector<HTMLCanvasElement>(
  "#about-determinant-transformation-scene",
);

if (!canvas) {
  throw new Error(
    "The determinant-transformation demonstration canvas could not be found.",
  );
}

const scene = createMathScene2D(canvas, {
  viewHeight: 6.4,
  center: [0.35, 0],
  background: null,
});

const origin: Vec2Tuple = [-0.65, -0.7];
const originalU: Vec2Tuple = [2.15, 0.45];
const originalV: Vec2Tuple = [0.35, 1.95];

/*
 * This is the mathematical transformation shown by the animation.
 * Matrices are written row-by-row in the usual form:
 *
 *          [ 1.20   0.65 ]
 *     A =  [              ]
 *          [-0.30   1.05 ]
 */
const transformation: Matrix2 = [
  [1.2, 0.65],
  [-0.3, 1.05],
];

// Computed once from the literal matrix above.
const inverseTransformation = inverseMatrix2(transformation);

const area = createParallelogramArea2D({
  name: "animated-determinant-area",
  origin,
  u: originalU,
  v: originalV,
  color: HUES.purple.base,
  opacity: 0.24,
});

const vectorU = createVector2D({
  name: "animated-basis-u",
  start: origin,
  end: [origin[0] + originalU[0], origin[1] + originalU[1]],
  style: {
    color: HUES.cyan.light,
    shaftWidth: 0.095,
    headLength: 0.42,
    headWidth: 0.35,
  },
});

const vectorV = createVector2D({
  name: "animated-basis-v",
  start: origin,
  end: [origin[0] + originalV[0], origin[1] + originalV[1]],
  style: {
    color: HUES.magenta.light,
    shaftWidth: 0.095,
    headLength: 0.42,
    headWidth: 0.35,
  },
});

scene.add(area, vectorU, vectorV);

function easeInOutCubic(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function displayMatrix(matrix: Matrix2): void {
  const currentU = applyMatrix2(matrix, originalU);
  const currentV = applyMatrix2(matrix, originalV);

  vectorU.setVector(origin, currentU);
  vectorV.setVector(origin, currentV);
  area.setBasis(origin, currentU, currentV);
}

const forwardSeconds = 2.4;
const transformedHoldSeconds = 0.65;
const inverseSeconds = 2.4;
const originalHoldSeconds = 0.65;
const cycleSeconds =
  forwardSeconds +
  transformedHoldSeconds +
  inverseSeconds +
  originalHoldSeconds;

const stopAnimation = scene.onFrame(({ time }) => {
  const cycleTime = (time / 1000) % cycleSeconds;
  let displayedMatrix: Matrix2;

  if (cycleTime < forwardSeconds) {
    // Phase 1: continuously deform I into A, then apply that matrix.
    const progress = easeInOutCubic(cycleTime / forwardSeconds);
    displayedMatrix = lerpMatrix2(
      IDENTITY_MATRIX_2,
      transformation,
      progress,
    );
  } else if (cycleTime < forwardSeconds + transformedHoldSeconds) {
    // Phase 2: hold the fully transformed basis.
    displayedMatrix = transformation;
  } else if (
    cycleTime <
    forwardSeconds + transformedHoldSeconds + inverseSeconds
  ) {
    /*
     * Phase 3: start with the transformed basis A(v), then gradually apply
     * a matrix that moves from I to A^{-1}. At the end:
     *
     *     A^{-1} A(v) = v.
     */
    const inversePhaseTime =
      cycleTime - forwardSeconds - transformedHoldSeconds;
    const progress = easeInOutCubic(inversePhaseTime / inverseSeconds);
    const partialInverse = lerpMatrix2(
      IDENTITY_MATRIX_2,
      inverseTransformation,
      progress,
    );

    displayedMatrix = multiplyMatrix2(
      partialInverse,
      transformation,
    );
  } else {
    // Phase 4: hold the restored original basis before repeating.
    displayedMatrix = IDENTITY_MATRIX_2;
  }

  displayMatrix(displayedMatrix);
});

const destroy = (): void => {
  stopAnimation();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
