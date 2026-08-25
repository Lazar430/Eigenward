import {
  createMathScene2D,
} from "../math-graphics/core/MathScene2D";
import {
  createTextLabel2D,
  type TextLabel2D,
} from "../math-graphics/primitives/TextLabel2D";
import {
  createNumberLine2D,
  type NumberLineInterval2D,
} from "../math-graphics/presentation/NumberLine2D";

const START_VISIBILITY_RATIO = 0.15;

const canvas =
  document.querySelector<HTMLCanvasElement>(
    "#nested-open-intervals-to-closed-scene",
  );

if (!canvas) {
  throw new Error(
    "The nested-open-intervals-to-closed canvas could not be found.",
  );
}

/* -------------------------------------------------------------------------- */
/* Hard-coded mathematics                                                     */
/* -------------------------------------------------------------------------- */

/*
 * J_n = (-1/n, 1 + 1/n),  n = 1,2,3,...
 *
 * These are nested DECREASING open intervals:
 *
 *   J_1 ⊃ J_2 ⊃ J_3 ⊃ ...
 *
 * Their intersection is the CLOSED interval
 *
 *   ⋂_{n=1}^∞ J_n = [0,1].
 *
 * This is exactly the phenomenon we want to illustrate:
 * an intersection of open sets need not be open.
 *
 * Every interval is drawn directly on the real line. Older intervals remain
 * faintly visible through their endpoints/strokes so the nesting is readable.
 */
const INTERVALS = [
  { index: 1, left: -1, right: 2 },
  { index: 2, left: -1 / 2, right: 1 + 1 / 2 },
  { index: 3, left: -1 / 3, right: 1 + 1 / 3 },
  { index: 4, left: -1 / 4, right: 1 + 1 / 4 },
  { index: 6, left: -1 / 6, right: 1 + 1 / 6 },
  { index: 10, left: -1 / 10, right: 1 + 1 / 10 },
] as const;

const VIEW_LEFT = -1.30;
const VIEW_RIGHT = 2.30;
const VIEW_CENTER =
  (VIEW_LEFT + VIEW_RIGHT) / 2;
const VIEW_SPAN =
  VIEW_RIGHT - VIEW_LEFT;

const INITIAL_DELAY_SECONDS = 0.45;
const INTERVAL_FADE_SECONDS = 0.32;
const INTERVAL_HOLD_SECONDS = 0.44;
const FINAL_CLOSED_DELAY_SECONDS = 0.48;
const FINAL_CLOSED_FADE_SECONDS = 0.42;

const CURRENT_STROKE_OPACITY = 0.62;
const OLD_STROKE_OPACITY = 0.16;
const CURRENT_DELIMITER_OPACITY = 1;
const OLD_DELIMITER_OPACITY = 0.28;

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
        width / VIEW_SPAN,
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
      "nested-open-intervals-to-closed-number-line",
    centerX:
      VIEW_CENTER,
    span:
      VIEW_SPAN,
    targetTickCount: 8,
  });

const formulaLabel =
  createTextLabel2D({
    name:
      "nested-open-intervals-to-closed-formula",
    latex:
      String.raw`J_n=\left(-\frac1n,\,1+\frac1n\right)`,
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
      "nested-open-intervals-to-closed-current",
    latex:
      String.raw`J_1`,
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
      "nested-open-intervals-to-closed-result",
    latex:
      String.raw`\bigcap_{n=1}^{\infty}J_n=[0,1]`,
    position: [
      0.5,
      0,
    ],
    anchor: [
      0.5,
      1,
    ],
    color:
      "rgba(229, 255, 224, 0.98)",
    fontSizePx: 15,
    fontWeight: 720,
    background:
      "rgba(26, 54, 23, 0.82)",
    border:
      "1px solid rgba(145, 230, 126, 0.22)",
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
      left,
      right,
    }) => {
      const interval =
        numberLine.createInterval({
          name:
            `nested-open-to-closed-${index}`,
          left,
          right,
          leftClosed:
            false,
          rightClosed:
            false,

          /*
           * Same visual basis as the sequence/topological scenes:
           * every interval is literally on the real line.
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
            `nested-open-to-closed-index-${index}`,
          latex:
            String.raw`J_${index}`,
          position: [
            left,
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

/*
 * The final object is not another approximation: it is the actual intersection
 * of all J_n, shown with CLOSED brackets.
 */
const finalClosedInterval =
  numberLine.createInterval({
    name:
      "nested-open-to-closed-final",
    left:
      0,
    right:
      1,
    leftClosed:
      true,
    rightClosed:
      true,
    yOffsetPixels:
      0,

    showStroke:
      true,
    strokeColor:
      0x91e67e,
    strokeOpacity:
      0.80,
    strokeWidth:
      5.5,

    showEndpointLabels:
      true,
    endpointLabelOffsetPixels:
      24,

    color:
      "rgba(145, 230, 126, 0.98)",
    endpointColor:
      "rgba(229, 255, 224, 0.98)",
  });

finalClosedInterval.hide();

/* -------------------------------------------------------------------------- */
/* Layout                                                                     */
/* -------------------------------------------------------------------------- */

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
    0.5,
    31 * worldPerPixel,
  );

  INTERVALS.forEach(
    (
      {
        left,
      },
      index,
    ) => {
      intervalEntries[index]
        .label
        .moveTo(
          left -
            10 * worldPerPixel,
          25 * worldPerPixel,
        );
    },
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
   * Retain the old parentheses as visual nesting landmarks, but remove the
   * endpoint-number chips to keep the number line readable.
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

function setClosedIntervalOpacity(
  opacity: number,
): void {
  const value =
    clamp01(
      opacity,
    );

  finalClosedInterval.stroke
    ?.setOpacity(
      0.80 *
        value,
    );

  finalClosedInterval.leftDelimiter
    .setOpacity(
      value,
    );

  finalClosedInterval.rightDelimiter
    .setOpacity(
      value,
    );

  finalClosedInterval.leftEndpointLabel
    ?.setOpacity(
      value,
    );

  finalClosedInterval.rightEndpointLabel
    ?.setOpacity(
      value,
    );
}

function fadeInFinalClosedInterval(): Promise<void> {
  finalClosedInterval.show();

  setClosedIntervalOpacity(
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
                  FINAL_CLOSED_FADE_SECONDS,
              );

            setClosedIntervalOpacity(
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
        String.raw`J_${INTERVALS[index].index}`,
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
    FINAL_CLOSED_DELAY_SECONDS,
  );

  await fadeInFinalClosedInterval();

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
    nestedOpenIntervalsToClosedDemo: {
      scene,
      numberLine,
      intervals:
        intervalEntries,
      finalClosedInterval,
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
