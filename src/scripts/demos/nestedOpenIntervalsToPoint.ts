import { HUES } from "../math-graphics/core/colors";
import {
  createMathScene2D,
} from "../math-graphics/core/MathScene2D";
import {
  createTextLabel2D,
  type TextLabel2D,
} from "../math-graphics/primitives/TextLabel2D";
import type {
  ParametricShape2D,
} from "../math-graphics/primitives/ParametricShape2D";
import {
  createNumberLine2D,
  type NumberLineInterval2D,
} from "../math-graphics/presentation/NumberLine2D";

const START_VISIBILITY_RATIO = 0.15;

const canvas =
  document.querySelector<HTMLCanvasElement>(
    "#nested-open-intervals-to-point-scene",
  );

if (!canvas) {
  throw new Error(
    "The nested-open-intervals-to-point canvas could not be found.",
  );
}

/* -------------------------------------------------------------------------- */
/* Hard-coded mathematics                                                     */
/* -------------------------------------------------------------------------- */

/*
 * I_n = (-2^{-n}, 2^{-n}), n = 0,1,2,...
 *
 * I_0 ⊃ I_1 ⊃ I_2 ⊃ ...
 *
 * and
 *
 *   intersection I_n = {0}.
 *
 * Every interval is drawn DIRECTLY ON THE REAL LINE. Older intervals remain
 * faintly visible so the nesting can still be read from their endpoints.
 */
const INTERVALS = [
  { index: 0, radius: 1 },
  { index: 1, radius: 1 / 2 },
  { index: 2, radius: 1 / 4 },
  { index: 3, radius: 1 / 8 },
  { index: 4, radius: 1 / 16 },
  { index: 5, radius: 1 / 32 },
] as const;

const VIEW_LEFT = -1.30;
const VIEW_RIGHT = 1.30;
const VIEW_CENTER = 0;
const VIEW_SPAN =
  VIEW_RIGHT -
  VIEW_LEFT;

const INITIAL_DELAY_SECONDS = 0.45;
const INTERVAL_FADE_SECONDS = 0.32;
const INTERVAL_HOLD_SECONDS = 0.44;
const FINAL_POINT_DELAY_SECONDS = 0.46;
const FINAL_POINT_POP_SECONDS = 0.34;

const CURRENT_STROKE_OPACITY = 0.62;
const OLD_STROKE_OPACITY = 0.18;
const CURRENT_DELIMITER_OPACITY = 1;
const OLD_DELIMITER_OPACITY = 0.32;

interface IntervalEntry {
  interval: NumberLineInterval2D;
  label: TextLabel2D;
}

/* -------------------------------------------------------------------------- */
/* Scene                                                                      */
/* -------------------------------------------------------------------------- */

const width = Math.max(
  320,
  canvas.getBoundingClientRect().width ||
    canvas.clientWidth ||
    800,
);

const scene =
  createMathScene2D(
    canvas,
    {
      unitSizePixels:
        width /
        VIEW_SPAN,
      center: [
        VIEW_CENTER,
        0,
      ],
      background: null,
    },
  );

const numberLine =
  createNumberLine2D({
    scene,
    name:
      "nested-open-intervals-to-point-number-line",
    centerX:
      VIEW_CENTER,
    span:
      VIEW_SPAN,
    targetTickCount: 7,
  });

const formulaLabel =
  createTextLabel2D({
    name:
      "nested-open-intervals-to-point-formula",
    latex:
      String.raw`I_n=\left(-2^{-n},\,2^{-n}\right)`,
    position: [
      VIEW_CENTER,
      0,
    ],
    anchor: [
      0.5,
      0,
    ],
    color:
      "rgba(244, 240, 255, 0.98)",
    fontSizePx: 18,
    fontWeight: 720,
    background:
      "rgba(22, 18, 35, 0.78)",
    border:
      "1px solid rgba(190, 176, 235, 0.16)",
    borderRadiusPx: 8,
    padding:
      "0.22rem 0.46rem",
  });

const currentIntervalLabel =
  createTextLabel2D({
    name:
      "nested-open-intervals-to-point-current",
    latex:
      String.raw`I_0`,
    position: [
      VIEW_RIGHT,
      0,
    ],
    anchor: [
      1,
      0,
    ],
    color:
      "rgba(255, 238, 194, 0.98)",
    fontSizePx: 14,
    fontWeight: 690,
    background:
      "rgba(48, 36, 15, 0.78)",
    border:
      "1px solid rgba(255, 220, 133, 0.18)",
    borderRadiusPx: 7,
    padding:
      "0.16rem 0.34rem",
  });

const resultLabel =
  createTextLabel2D({
    name:
      "nested-open-intervals-to-point-result",
    latex:
      String.raw`\bigcap_{n=0}^{\infty}I_n=\{0\}`,
    position: [
      0,
      0,
    ],
    anchor: [
      0.5,
      1,
    ],
    color:
      "rgba(255, 229, 246, 0.98)",
    fontSizePx: 15,
    fontWeight: 720,
    background:
      "rgba(45, 18, 39, 0.82)",
    border:
      "1px solid rgba(255, 145, 211, 0.20)",
    borderRadiusPx: 7,
    padding:
      "0.16rem 0.34rem",
  });

resultLabel.hide();

scene.add(
  formulaLabel,
  currentIntervalLabel,
  resultLabel,
);

const intervalEntries: IntervalEntry[] =
  INTERVALS.map(
    ({
      index,
      radius,
    }) => {
      const interval =
        numberLine.createInterval({
          name:
            `nested-open-to-point-${index}`,
          left:
            -radius,
          right:
            radius,
          leftClosed:
            false,
          rightClosed:
            false,

          /*
           * Critical visual point: zero offset means the interval itself lies
           * on the same real line as the sequence/topology scenes.
           */
          yOffsetPixels:
            0,

          showStroke:
            true,
          strokeColor:
            0x8f84b7,
          strokeOpacity:
            CURRENT_STROKE_OPACITY,
          strokeWidth:
            5.0,

          showEndpointLabels:
            true,
          endpointLabelOffsetPixels:
            24,
        });

      const label =
        createTextLabel2D({
          name:
            `nested-open-to-point-index-${index}`,
          latex:
            String.raw`I_${index}`,
          position: [
            -radius,
            0,
          ],
          anchor: [
            1,
            1,
          ],
          color:
            "rgba(229, 224, 245, 0.88)",
          fontSizePx: 11,
          fontWeight: 650,
          background:
            "rgba(18, 17, 24, 0.60)",
          borderRadiusPx: 5,
          padding:
            "0.07rem 0.20rem",
        });

      interval.hide();
      label.hide();

      scene.add(
        label,
      );

      return {
        interval,
        label,
      };
    },
  );

const limitingPoint: ParametricShape2D =
  numberLine.createPoint({
    name:
      "nested-open-intervals-to-point-limit",
    x:
      0,
    fill:
      HUES.magenta.light,
    outline:
      0x2a1427,
    outlineWidth:
      0.03,
  });

limitingPoint
  .hide()
  .resizeTo(0);

scene.add(
  limitingPoint,
);

/* -------------------------------------------------------------------------- */
/* Layout                                                                     */
/* -------------------------------------------------------------------------- */

let limitingPointScale = 0;

function layout(): void {
  numberLine.layout();

  const worldPerPixel =
    numberLine.getWorldPerPixel();

  const height =
    numberLine.getCanvasHeightPixels();

  const bounds =
    numberLine.getBounds();

  const formulaY =
    (
      height / 2 -
      28
    ) *
    worldPerPixel;

  formulaLabel.moveTo(
    VIEW_CENTER,
    formulaY,
  );

  currentIntervalLabel.moveTo(
    bounds.right -
      18 * worldPerPixel,
    formulaY,
  );

  resultLabel.moveTo(
    0,
    31 * worldPerPixel,
  );

  INTERVALS.forEach(
    (
      {
        radius,
      },
      index,
    ) => {
      intervalEntries[index]
        .label
        .moveTo(
          -radius -
            10 * worldPerPixel,
          25 * worldPerPixel,
        );
    },
  );

  numberLine.resizePoint(
    limitingPoint,
    8,
    limitingPointScale,
  );
}

layout();

const resizeObserver =
  new ResizeObserver(
    layout,
  );

resizeObserver.observe(
  canvas,
);

/* -------------------------------------------------------------------------- */
/* Animation helpers                                                          */
/* -------------------------------------------------------------------------- */

function clamp01(
  value: number,
): number {
  return Math.min(
    1,
    Math.max(
      0,
      value,
    ),
  );
}

function easeOutBack(
  value: number,
): number {
  const t =
    clamp01(value);

  const c1 =
    1.70158;

  const c3 =
    c1 + 1;

  const u =
    t - 1;

  return (
    1 +
    c3 * u * u * u +
    c1 * u * u
  );
}

function wait(
  seconds: number,
): Promise<void> {
  if (!(seconds > 0)) {
    return Promise.resolve();
  }

  return new Promise(
    (resolve) => {
      let elapsed = 0;
      let stop =
        (): void => {};

      stop =
        scene.onFrame(
          ({
            deltaTime,
          }) => {
            elapsed +=
              deltaTime;

            if (
              elapsed >=
              seconds
            ) {
              stop();
              resolve();
            }
          },
        );
    },
  );
}

function setEntryOpacity(
  entry: IntervalEntry,
  strokeOpacity: number,
  delimiterOpacity: number,
): void {
  entry.interval.stroke
    ?.setOpacity(
      strokeOpacity,
    );

  entry.interval.leftDelimiter
    .setOpacity(
      delimiterOpacity,
    );

  entry.interval.rightDelimiter
    .setOpacity(
      delimiterOpacity,
    );

  entry.label.setOpacity(
    delimiterOpacity,
  );
}

function dimOldInterval(
  entry: IntervalEntry,
): void {
  setEntryOpacity(
    entry,
    OLD_STROKE_OPACITY,
    OLD_DELIMITER_OPACITY,
  );

  /*
   * Keep the old parentheses as nesting landmarks, but remove the numerical
   * endpoint chips so the real line does not become cluttered.
   */
  entry.interval.leftEndpointLabel
    ?.hide();

  entry.interval.rightEndpointLabel
    ?.hide();
}

function fadeInCurrentInterval(
  entry: IntervalEntry,
): Promise<void> {
  entry.interval.show();
  entry.label.show();

  setEntryOpacity(
    entry,
    0,
    0,
  );

  return new Promise(
    (resolve) => {
      let elapsed = 0;
      let stop =
        (): void => {};

      stop =
        scene.onFrame(
          ({
            deltaTime,
          }) => {
            elapsed +=
              deltaTime;

            const progress =
              clamp01(
                elapsed /
                  INTERVAL_FADE_SECONDS,
              );

            setEntryOpacity(
              entry,
              CURRENT_STROKE_OPACITY *
                progress,
              CURRENT_DELIMITER_OPACITY *
                progress,
            );

            if (
              progress >= 1
            ) {
              stop();
              resolve();
            }
          },
        );
    },
  );
}

function popLimitingPoint(): Promise<void> {
  limitingPoint.show();

  return new Promise(
    (resolve) => {
      let elapsed = 0;
      let stop =
        (): void => {};

      stop =
        scene.onFrame(
          ({
            deltaTime,
          }) => {
            elapsed +=
              deltaTime;

            const progress =
              clamp01(
                elapsed /
                  FINAL_POINT_POP_SECONDS,
              );

            limitingPointScale =
              Math.max(
                0,
                easeOutBack(
                  progress,
                ),
              );

            numberLine.resizePoint(
              limitingPoint,
              8,
              limitingPointScale,
            );

            if (
              progress >= 1
            ) {
              limitingPointScale =
                1;

              numberLine.resizePoint(
                limitingPoint,
                8,
                1,
              );

              stop();
              resolve();
            }
          },
        );
    },
  );
}

/* -------------------------------------------------------------------------- */
/* Automatic sequence                                                         */
/* -------------------------------------------------------------------------- */

let destroyed = false;

async function runAnimation(): Promise<void> {
  await wait(
    INITIAL_DELAY_SECONDS,
  );

  for (
    let index = 0;
    index <
      intervalEntries.length;
    index += 1
  ) {
    if (destroyed) {
      return;
    }

    if (index > 0) {
      dimOldInterval(
        intervalEntries[
          index - 1
        ],
      );
    }

    currentIntervalLabel
      .setLatex(
        String.raw`I_${INTERVALS[index].index}`,
      );

    await fadeInCurrentInterval(
      intervalEntries[index],
    );

    await wait(
      INTERVAL_HOLD_SECONDS,
    );
  }

  if (destroyed) {
    return;
  }

  dimOldInterval(
    intervalEntries[
      intervalEntries.length -
      1
    ],
  );

  await wait(
    FINAL_POINT_DELAY_SECONDS,
  );

  await popLimitingPoint();

  resultLabel.show();
}

/* -------------------------------------------------------------------------- */
/* Viewport-gated start                                                       */
/* -------------------------------------------------------------------------- */

let started = false;

const visibilityObserver =
  typeof IntersectionObserver ===
  "undefined"
    ? null
    : new IntersectionObserver(
        (entries) => {
          if (started) {
            return;
          }

          const entry =
            entries.find(
              (candidate) =>
                candidate.target ===
                canvas,
            );

          if (
            entry?.isIntersecting &&
            entry.intersectionRatio >=
              START_VISIBILITY_RATIO
          ) {
            started = true;

            visibilityObserver
              ?.disconnect();

            void runAnimation();
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
  visibilityObserver.observe(
    canvas,
  );
} else {
  started = true;
  void runAnimation();
}

Object.assign(
  window,
  {
    nestedOpenIntervalsToPointDemo: {
      scene,
      numberLine,
      intervals:
        intervalEntries,
      limitingPoint,
    },
  },
);

const destroy =
  (): void => {
    destroyed = true;

    visibilityObserver
      ?.disconnect();

    resizeObserver
      .disconnect();

    scene.destroy();
  };

window.addEventListener(
  "pagehide",
  destroy,
  {
    once: true,
  },
);

document.addEventListener(
  "astro:before-swap",
  destroy,
  {
    once: true,
  },
);
