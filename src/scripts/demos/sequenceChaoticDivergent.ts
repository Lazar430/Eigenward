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
    "#sequence-chaotic-divergent-scene",
  );

if (!canvas) {
  throw new Error(
    "The chaotic divergent-sequence canvas could not be found.",
  );
}

const sequenceDefinition = (
  n: number,
): number =>
  n *
  Math.sign(Math.sin(n));

const TERM_COUNT = 78;
const VIEW_BOUND = 84;
const VIEW_SPAN = VIEW_BOUND * 2;
const VIEW_CENTER = 0;

const TERM_INTERVAL_SECONDS = 0.095;
const POP_DURATION_SECONDS = 0.25;
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
  name: "chaotic-divergent-number-line",
  centerX: VIEW_CENTER,
  span: VIEW_SPAN,
  targetTickCount: 8,
});

const formulaLabel = createTextLabel2D({
  name: "chaotic-divergent-formula",
  latex: String.raw`a_n=n\,\operatorname{sgn}(\sin n)`,
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

const magnitudeLabel = createTextLabel2D({
  name: "chaotic-divergent-magnitude",
  latex: String.raw`|a_n|=n\longrightarrow\infty`,
  position: [VIEW_CENTER, 0],
  anchor: [0.5, 1],
  color: "rgba(218, 248, 255, 0.95)",
  fontSizePx: 14,
  fontWeight: 680,
  background: "rgba(15, 31, 40, 0.72)",
  border: "1px solid rgba(111, 232, 255, 0.16)",
  borderRadiusPx: 7,
  padding: "0.14rem 0.32rem",
});

scene.add(
  formulaLabel,
  magnitudeLabel,
);

const termEntries: TermEntry[] = [];

for (let n = 1; n <= TERM_COUNT; n += 1) {
  const value = sequenceDefinition(n);

  const marker = numberLine.createPoint({
    name: `chaotic-divergent-term-${n}`,
    x: value,
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

  formulaLabel.moveTo(
    VIEW_CENTER,
    (height / 2 - 28) * worldPerPixel,
  );

  magnitudeLabel.moveTo(
    VIEW_CENTER,
    27 * worldPerPixel,
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
  sequenceChaoticDivergentDemo: {
    scene,
    numberLine,
    sequenceDefinition,
    termEntries,
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
