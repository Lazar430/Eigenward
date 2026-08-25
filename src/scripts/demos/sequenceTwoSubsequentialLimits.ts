import { HUES } from "../math-graphics/core/colors";
import {
  createMathScene2D,
} from "../math-graphics/core/MathScene2D";
import {
  createTextLabel2D,
} from "../math-graphics/primitives/TextLabel2D";
import type {
  ParametricShape2D,
} from "../math-graphics/primitives/ParametricShape2D";
import {
  createNumberLine2D,
} from "../math-graphics/presentation/NumberLine2D";

const START_VISIBILITY_RATIO = 0.15;

const canvas =
  document.querySelector<HTMLCanvasElement>(
    "#sequence-two-subsequential-limits-scene",
  );

if (!canvas) {
  throw new Error(
    "The two-subsequential-limits sequence canvas could not be found.",
  );
}

const sequenceDefinition = (
  n: number,
): number =>
  (-1) ** n *
  (n + 1) / n;

const TERM_COUNT = 64;
const EPSILON = 0.18;

const LEFT_LIMIT = -1;
const RIGHT_LIMIT = 1;

const VIEW_LEFT = -2.32;
const VIEW_RIGHT = 2.32;
const VIEW_SPAN =
  VIEW_RIGHT -
  VIEW_LEFT;
const VIEW_CENTER =
  (VIEW_LEFT + VIEW_RIGHT) / 2;

const TERM_INTERVAL_SECONDS = 0.105;
const POP_DURATION_SECONDS = 0.28;
const INITIAL_DELAY_SECONDS = 0.45;

interface TermEntry {
  value: number;
  marker: ParametricShape2D;
  scale: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeOutBack(value: number): number {
  const t = clamp01(value);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = t - 1;

  return 1 + c3 * u * u * u + c1 * u * u;
}

const width = Math.max(
  320,
  canvas.getBoundingClientRect().width ||
    canvas.clientWidth ||
    800,
);

const scene = createMathScene2D(canvas, {
  unitSizePixels: width / VIEW_SPAN,
  center: [VIEW_CENTER, 0],
  background: null,
});

const numberLine = createNumberLine2D({
  scene,
  name: "two-subsequential-limits-number-line",
  centerX: VIEW_CENTER,
  span: VIEW_SPAN,
  targetTickCount: 7,
});

const formulaLabel = createTextLabel2D({
  name: "two-subsequential-limits-formula",
  latex: String.raw`a_n=(-1)^n\frac{n+1}{n}`,
  position: [VIEW_CENTER, 0],
  anchor: [0.5, 0],
  color: "rgba(244, 240, 255, 0.98)",
  fontSizePx: 18,
  fontWeight: 720,
  background: "rgba(22, 18, 35, 0.78)",
  border: "1px solid rgba(190, 176, 235, 0.16)",
  borderRadiusPx: 8,
  padding: "0.22rem 0.46rem",
});

const epsilonLabel = createTextLabel2D({
  name: "two-subsequential-limits-epsilon",
  latex: String.raw`\varepsilon=0.18`,
  position: [VIEW_RIGHT, 0],
  anchor: [1, 0],
  color: "rgba(255, 238, 194, 0.98)",
  fontSizePx: 14,
  fontWeight: 690,
  background: "rgba(48, 36, 15, 0.78)",
  border: "1px solid rgba(255, 220, 133, 0.18)",
  borderRadiusPx: 7,
  padding: "0.16rem 0.34rem",
});

const leftLimitMarker =
  numberLine.createPoint({
    name: "two-subsequential-limits-left-limit",
    x: LEFT_LIMIT,
    fill: HUES.gold.light,
    outline: 0x2a2113,
    outlineWidth: 0.03,
  });

const rightLimitMarker =
  numberLine.createPoint({
    name: "two-subsequential-limits-right-limit",
    x: RIGHT_LIMIT,
    fill: HUES.cyan.light,
    outline: 0x13252c,
    outlineWidth: 0.03,
  });

const leftLimitLabel = createTextLabel2D({
  name: "two-subsequential-limits-left-label",
  latex: String.raw`\lim_{k\to\infty}a_{2k-1}=-1`,
  position: [LEFT_LIMIT, 0],
  anchor: [0.5, 1],
  color: "rgba(255, 239, 193, 0.98)",
  fontSizePx: 14,
  fontWeight: 720,
  background: "rgba(48, 38, 15, 0.80)",
  border: "1px solid rgba(255, 219, 122, 0.20)",
  borderRadiusPx: 7,
  padding: "0.15rem 0.32rem",
});

const rightLimitLabel = createTextLabel2D({
  name: "two-subsequential-limits-right-label",
  latex: String.raw`\lim_{k\to\infty}a_{2k}=1`,
  position: [RIGHT_LIMIT, 0],
  anchor: [0.5, 1],
  color: "rgba(220, 248, 255, 0.98)",
  fontSizePx: 14,
  fontWeight: 720,
  background: "rgba(15, 38, 47, 0.80)",
  border: "1px solid rgba(119, 231, 255, 0.20)",
  borderRadiusPx: 7,
  padding: "0.15rem 0.32rem",
});

numberLine.createInterval({
  name: "two-subsequential-limits-left-neighborhood",
  left: LEFT_LIMIT - EPSILON,
  right: LEFT_LIMIT + EPSILON,
  leftClosed: false,
  rightClosed: false,
  showEndpointLabels: true,
});

numberLine.createInterval({
  name: "two-subsequential-limits-right-neighborhood",
  left: RIGHT_LIMIT - EPSILON,
  right: RIGHT_LIMIT + EPSILON,
  leftClosed: false,
  rightClosed: false,
  showEndpointLabels: true,
});

scene.add(
  formulaLabel,
  epsilonLabel,
  leftLimitMarker,
  rightLimitMarker,
  leftLimitLabel,
  rightLimitLabel,
);

const termEntries: TermEntry[] = [];

for (let n = 1; n <= TERM_COUNT; n += 1) {
  const value = sequenceDefinition(n);
  const even = n % 2 === 0;

  const marker = numberLine.createPoint({
    name: `two-subsequential-limits-term-${n}`,
    x: value,
    fill: even ? HUES.cyan.light : HUES.gold.light,
    outline: even ? 0x12252c : 0x2a2113,
  });

  marker.hide().resizeTo(0);
  scene.add(marker);

  termEntries.push({
    value,
    marker,
    scale: 0,
  });
}

function layout(): void {
  numberLine.layout();

  const worldPerPixel = numberLine.getWorldPerPixel();
  const height = numberLine.getCanvasHeightPixels();
  const bounds = numberLine.getBounds();

  formulaLabel.moveTo(
    VIEW_CENTER,
    (height / 2 - 28) * worldPerPixel,
  );

  epsilonLabel.moveTo(
    bounds.right - 18 * worldPerPixel,
    (height / 2 - 28) * worldPerPixel,
  );

  numberLine.resizePoint(
    leftLimitMarker,
    8,
    1,
  );

  numberLine.resizePoint(
    rightLimitMarker,
    8,
    1,
  );

  leftLimitLabel.moveTo(
    LEFT_LIMIT,
    26 * worldPerPixel,
  );

  rightLimitLabel.moveTo(
    RIGHT_LIMIT,
    26 * worldPerPixel,
  );

  for (const entry of termEntries) {
    entry.marker.moveTo(entry.value, 0);

    numberLine.resizePoint(
      entry.marker,
      6,
      entry.scale,
    );
  }
}

layout();

const resizeObserver =
  new ResizeObserver(layout);

resizeObserver.observe(canvas);

let stopAnimation = (): void => {};

function startAnimation(): void {
  let elapsed = 0;

  stopAnimation = scene.onFrame(({ deltaTime }) => {
    elapsed += deltaTime;
    let complete = true;

    for (
      let index = 0;
      index < termEntries.length;
      index += 1
    ) {
      const entry = termEntries[index];

      const startTime =
        INITIAL_DELAY_SECONDS +
        index * TERM_INTERVAL_SECONDS;

      const rawProgress =
        (elapsed - startTime) /
        POP_DURATION_SECONDS;

      if (rawProgress < 0) {
        complete = false;
        continue;
      }

      const progress = clamp01(rawProgress);

      entry.scale = Math.max(
        0,
        easeOutBack(progress),
      );

      entry.marker.show();

      numberLine.resizePoint(
        entry.marker,
        6,
        entry.scale,
      );

      if (progress < 1) {
        complete = false;
      } else {
        entry.scale = 1;
      }
    }

    if (complete) {
      stopAnimation();
    }
  });
}

let started = false;

const visibilityObserver =
  typeof IntersectionObserver === "undefined"
    ? null
    : new IntersectionObserver(
        (entries) => {
          if (started) return;

          const entry = entries.find(
            (candidate) =>
              candidate.target === canvas,
          );

          if (
            entry?.isIntersecting &&
            entry.intersectionRatio >=
              START_VISIBILITY_RATIO
          ) {
            started = true;
            visibilityObserver?.disconnect();
            startAnimation();
          }
        },
        {
          threshold: [
            0,
            START_VISIBILITY_RATIO,
            1,
          ],
        },
      );

if (visibilityObserver) {
  visibilityObserver.observe(canvas);
} else {
  started = true;
  startAnimation();
}

Object.assign(window, {
  sequenceTwoSubsequentialLimitsDemo: {
    scene,
    numberLine,
    sequenceDefinition,
    termEntries,
    leftLimitMarker,
    rightLimitMarker,
  },
});

const destroy = (): void => {
  visibilityObserver?.disconnect();
  resizeObserver.disconnect();
  stopAnimation();
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
