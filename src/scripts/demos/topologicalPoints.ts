import {
  createMathScene2D,
} from "../math-graphics/core/MathScene2D";
import {
  createTextLabel2D,
} from "../math-graphics/primitives/TextLabel2D";
import {
  createNumberLine2D,
  type NumberLinePoint2DOptions,
} from "../math-graphics/presentation/NumberLine2D";
import type {
  ParametricShape2D,
} from "../math-graphics/primitives/ParametricShape2D";

const START_VISIBILITY_RATIO = 0.15;

const canvas =
  document.querySelector<HTMLCanvasElement>(
    "#topological-points-scene",
  );

if (!canvas) {
  throw new Error(
    "The topological-points canvas could not be found.",
  );
}

/* -------------------------------------------------------------------------- */
/* Hard-coded subset of R                                                     */
/* -------------------------------------------------------------------------- */

/*
 * A = (-5,-3] ∪ [-1.5,1) ∪ {2.5} ∪ {3.4,4.1}
 *
 * This single set gives us:
 *
 *   Int(A)  = (-5,-3) ∪ (-1.5,1)
 *
 *   cl(A)   = [-5,-3] ∪ [-1.5,1] ∪ {2.5,3.4,4.1}
 *
 *   Fr(A)   = {-5,-3,-1.5,1,2.5,3.4,4.1}
 *
 *   Ext(A)  = R \ cl(A)
 *
 *   isolated points = {2.5,3.4,4.1}
 *
 *   accumulation points =
 *     [-5,-3] ∪ [-1.5,1]
 *
 * The dots below are deliberately only REPRESENTATIVE sample points from
 * these sets. The intervals themselves encode the continua.
 */

type ModeId =
  | "all"
  | "interior"
  | "closure"
  | "frontier"
  | "exterior"
  | "isolated"
  | "accumulation";

interface ModeDefinition {
  id: ModeId;
  label: string;
  fill: number;
  outline: number;
  textColor: string;
  activeBackground: string;
  activeBorder: string;
}

const MODES: readonly ModeDefinition[] = [
  {
    id: "all",
    label: "all points",
    fill: 0xe9ebff,
    outline: 0x20243a,
    textColor: "rgba(239, 241, 255, 0.98)",
    activeBackground: "rgba(75, 82, 126, 0.78)",
    activeBorder: "rgba(181, 190, 255, 0.42)",
  },
  {
    id: "interior",
    label: "interior points",
    fill: 0x77e7ff,
    outline: 0x102831,
    textColor: "rgba(220, 249, 255, 0.98)",
    activeBackground: "rgba(24, 77, 92, 0.82)",
    activeBorder: "rgba(119, 231, 255, 0.42)",
  },
  {
    id: "closure",
    label: "closure points",
    fill: 0xffd776,
    outline: 0x382811,
    textColor: "rgba(255, 244, 216, 0.98)",
    activeBackground: "rgba(91, 66, 22, 0.82)",
    activeBorder: "rgba(255, 215, 118, 0.42)",
  },
  {
    id: "frontier",
    label: "frontier points",
    fill: 0xff8ecc,
    outline: 0x41162b,
    textColor: "rgba(255, 229, 244, 0.98)",
    activeBackground: "rgba(92, 30, 63, 0.82)",
    activeBorder: "rgba(255, 142, 204, 0.42)",
  },
  {
    id: "exterior",
    label: "exterior points",
    fill: 0xffa16f,
    outline: 0x412113,
    textColor: "rgba(255, 235, 225, 0.98)",
    activeBackground: "rgba(91, 47, 25, 0.82)",
    activeBorder: "rgba(255, 161, 111, 0.42)",
  },
  {
    id: "isolated",
    label: "isolated points",
    fill: 0x91e67e,
    outline: 0x173515,
    textColor: "rgba(231, 255, 226, 0.98)",
    activeBackground: "rgba(39, 88, 31, 0.82)",
    activeBorder: "rgba(145, 230, 126, 0.42)",
  },
  {
    id: "accumulation",
    label: "accumulation points",
    fill: 0xc19cff,
    outline: 0x281743,
    textColor: "rgba(239, 230, 255, 0.98)",
    activeBackground: "rgba(65, 42, 102, 0.82)",
    activeBorder: "rgba(193, 156, 255, 0.42)",
  },
];

const MODE_BY_ID = Object.fromEntries(
  MODES.map((mode) => [
    mode.id,
    mode,
  ]),
) as Record<ModeId, ModeDefinition>;

interface SamplePointDefinition {
  id: string;
  x: number;
  modes: readonly ModeId[];
}

const SAMPLE_POINTS: readonly SamplePointDefinition[] = [
  /* exterior to the left */
  {
    id: "outside-left",
    x: -5.75,
    modes: ["all", "exterior"],
  },

  /* first interval and its endpoints */
  {
    id: "endpoint-open-left",
    x: -5,
    modes: [
      "all",
      "closure",
      "frontier",
      "accumulation",
    ],
  },
  {
    id: "interval-one-a",
    x: -4.65,
    modes: [
      "all",
      "interior",
      "closure",
      "accumulation",
    ],
  },
  {
    id: "interval-one-b",
    x: -4.10,
    modes: [
      "all",
      "interior",
      "closure",
      "accumulation",
    ],
  },
  {
    id: "interval-one-c",
    x: -3.45,
    modes: [
      "all",
      "interior",
      "closure",
      "accumulation",
    ],
  },
  {
    id: "endpoint-closed-right",
    x: -3,
    modes: [
      "all",
      "closure",
      "frontier",
      "accumulation",
    ],
  },

  /* exterior gap */
  {
    id: "gap-one",
    x: -2.25,
    modes: ["all", "exterior"],
  },

  /* second interval and its endpoints */
  {
    id: "endpoint-closed-left-two",
    x: -1.5,
    modes: [
      "all",
      "closure",
      "frontier",
      "accumulation",
    ],
  },
  {
    id: "interval-two-a",
    x: -1.05,
    modes: [
      "all",
      "interior",
      "closure",
      "accumulation",
    ],
  },
  {
    id: "interval-two-b",
    x: -0.35,
    modes: [
      "all",
      "interior",
      "closure",
      "accumulation",
    ],
  },
  {
    id: "interval-two-c",
    x: 0.35,
    modes: [
      "all",
      "interior",
      "closure",
      "accumulation",
    ],
  },
  {
    id: "interval-two-d",
    x: 0.78,
    modes: [
      "all",
      "interior",
      "closure",
      "accumulation",
    ],
  },
  {
    id: "endpoint-open-right-two",
    x: 1,
    modes: [
      "all",
      "closure",
      "frontier",
      "accumulation",
    ],
  },

  /* exterior before the finite sets */
  {
    id: "gap-two",
    x: 1.70,
    modes: ["all", "exterior"],
  },

  /* isolated points */
  {
    id: "singleton",
    x: 2.5,
    modes: [
      "all",
      "closure",
      "frontier",
      "isolated",
    ],
  },
  {
    id: "gap-three",
    x: 2.92,
    modes: ["all", "exterior"],
  },
  {
    id: "doubleton-a",
    x: 3.4,
    modes: [
      "all",
      "closure",
      "frontier",
      "isolated",
    ],
  },
  {
    id: "between-doubleton",
    x: 3.76,
    modes: ["all", "exterior"],
  },
  {
    id: "doubleton-b",
    x: 4.1,
    modes: [
      "all",
      "closure",
      "frontier",
      "isolated",
    ],
  },
  {
    id: "outside-right",
    x: 4.85,
    modes: ["all", "exterior"],
  },
];

const VIEW_LEFT = -6.35;
const VIEW_RIGHT = 5.35;
const VIEW_SPAN =
  VIEW_RIGHT -
  VIEW_LEFT;

const VIEW_CENTER =
  (VIEW_LEFT + VIEW_RIGHT) / 2;

const POINT_RADIUS_PIXELS = 6.4;
const MODE_TRANSITION_SECONDS = 0.22;

const INITIAL_DELAY_SECONDS = 0.34;
const INITIAL_POINT_INTERVAL_SECONDS = 0.065;
const INITIAL_POINT_POP_SECONDS = 0.24;

/* -------------------------------------------------------------------------- */
/* Scene + shared number-line presentation                                    */
/* -------------------------------------------------------------------------- */

const initialWidth = Math.max(
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
        initialWidth /
        VIEW_SPAN,
      center: [
        VIEW_CENTER,
        0,
      ],
      background: null,
    },
  );

/*
 * This is the same NumberLine2D presentation layer used by the sequence
 * diagrams: same axis, same ticks, same CSS-pixel point sizing and same
 * interval delimiter vocabulary.
 */
const numberLine =
  createNumberLine2D({
    scene,
    name:
      "topological-points-number-line",
    centerX:
      VIEW_CENTER,
    span:
      VIEW_SPAN,
    targetTickCount: 8,
  });

const setLabel =
  createTextLabel2D({
    name:
      "topological-points-set-label",
    latex:
      String.raw`A=(-5,-3]\cup[-1.5,1)\cup\{2.5\}\cup\{3.4,4.1\}`,
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

scene.add(setLabel);

/*
 * The interval strokes are the only extra visual element beyond the sequence
 * vocabulary: they indicate that every point BETWEEN the endpoint delimiters
 * belongs to the interval component, not just the sampled dots.
 *
 * The numerical endpoint labels are placed ABOVE the line in this scene so
 * they do not compete with the ordinary tick labels below the axis.
 */
numberLine.createInterval({
  name: "topological-set-interval-one",
  left: -5,
  right: -3,
  leftClosed: false,
  rightClosed: true,
  showStroke: true,
  showEndpointLabels: true,
  strokeColor: 0x8f84b7,
  strokeOpacity: 0.52,
  strokeWidth: 5.0,
  endpointLabelOffsetPixels: -28,
});

numberLine.createInterval({
  name: "topological-set-interval-two",
  left: -1.5,
  right: 1,
  leftClosed: true,
  rightClosed: false,
  showStroke: true,
  showEndpointLabels: true,
  strokeColor: 0x8f84b7,
  strokeOpacity: 0.52,
  strokeWidth: 5.0,
  endpointLabelOffsetPixels: -28,
});

numberLine.createFiniteSet({
  name: "topological-set-singleton",
  values: [2.5],
  bracePaddingPixels: 15,
});

numberLine.createFiniteSet({
  name: "topological-set-doubleton",
  values: [
    3.4,
    4.1,
  ],
  bracePaddingPixels: 15,
});

/* -------------------------------------------------------------------------- */
/* Mode-specific point layers                                                 */
/* -------------------------------------------------------------------------- */

interface MarkerEntry {
  point:
    SamplePointDefinition;

  marker:
    ParametricShape2D;

  scale:
    number;
}

const markersByMode =
  new Map<
    ModeId,
    MarkerEntry[]
  >();

function pointOptions(
  point: SamplePointDefinition,
  mode: ModeDefinition,
): NumberLinePoint2DOptions {
  return {
    name:
      `topological-${mode.id}-${point.id}`,
    x:
      point.x,
    fill:
      mode.fill,
    outline:
      mode.outline,
  };
}

for (const mode of MODES) {
  const definitions =
    mode.id === "all"
      ? SAMPLE_POINTS
      : SAMPLE_POINTS.filter(
          (point) =>
            point.modes.includes(
              mode.id,
            ),
        );

  const entries =
    definitions.map(
      (point): MarkerEntry => {
        const marker =
          numberLine.createPoint(
            pointOptions(
              point,
              mode,
            ),
          );

        marker
          .hide()
          .resizeTo(0);

        scene.add(marker);

        return {
          point,
          marker,
          scale: 0,
        };
      },
    );

  markersByMode.set(
    mode.id,
    entries,
  );
}

/* -------------------------------------------------------------------------- */
/* Integrated mode controls                                                   */
/* -------------------------------------------------------------------------- */

const controls =
  document.createElement(
    "div",
  );

controls.className =
  "topological-points-mode-controls";

controls.setAttribute(
  "aria-label",
  "Choose which topological point class to highlight",
);

Object.assign(
  controls.style,
  {
    position:
      "absolute",
    /*
     * Keep the mode labels farther from the lower canvas edge. Using explicit
     * left/right insets instead of 50% + translateX also avoids fractional
     * compositing positions that can make small DOM text look slightly soft.
     */
    left:
      "12px",
    right:
      "12px",
    bottom:
      "46px",
    zIndex:
      "20",
    display:
      "flex",
    flexWrap:
      "wrap",
    justifyContent:
      "center",
    gap:
      "0.42rem",
    width:
      "auto",
    pointerEvents:
      "auto",
  },
);

const buttons =
  new Map<
    ModeId,
    HTMLButtonElement
  >();

let currentMode:
  ModeId =
  "all";

function styleButtons(): void {
  for (
    const mode of
    MODES
  ) {
    const button =
      buttons.get(
        mode.id,
      );

    if (!button) {
      continue;
    }

    const active =
      mode.id ===
      currentMode;

    Object.assign(
      button.style,
      {
        appearance:
          "none",
        cursor:
          "pointer",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, sans-serif",
        fontSize:
          "12px",
        fontWeight:
          "650",
        lineHeight:
          "1",
        color:
          active
            ? mode.textColor
            : "rgba(235, 232, 246, 0.80)",
        background:
          active
            ? mode.activeBackground
            : "rgba(20, 18, 29, 0.74)",
        border:
          active
            ? `1px solid ${mode.activeBorder}`
            : "1px solid rgba(184, 176, 211, 0.18)",
        borderRadius:
          "999px",
        padding:
          "0.48rem 0.68rem",
        boxShadow:
          active
            ? `0 0 0 1px ${mode.activeBorder}, 0 4px 14px rgba(0,0,0,0.18)`
            : "0 3px 11px rgba(0,0,0,0.15)",
        transform:
          active
            ? "translateY(-1px)"
            : "translateY(0)",
        transition:
          "background 140ms ease, border-color 140ms ease, color 140ms ease, transform 140ms ease",
      },
    );

    button.setAttribute(
      "aria-pressed",
      active
        ? "true"
        : "false",
    );
  }
}

for (
  const mode of
  MODES
) {
  const button =
    document.createElement(
      "button",
    );

  button.type =
    "button";

  button.textContent =
    mode.label;

  button.addEventListener(
    "click",
    () => {
      setMode(mode.id);
    },
  );

  buttons.set(
    mode.id,
    button,
  );

  controls.appendChild(
    button,
  );
}

const container =
  canvas.parentElement;

if (!container) {
  throw new Error(
    "The topological-points canvas requires a parent container.",
  );
}

container.appendChild(
  controls,
);

styleButtons();

/* -------------------------------------------------------------------------- */
/* Responsive layout                                                          */
/* -------------------------------------------------------------------------- */

function layout(): void {
  numberLine.layout();

  const worldPerPixel =
    numberLine.getWorldPerPixel();

  const height =
    numberLine.getCanvasHeightPixels();

  const formulaY =
    (
      height / 2 -
      28
    ) *
    worldPerPixel;

  setLabel.moveTo(
    VIEW_CENTER,
    formulaY,
  );

  for (
    const mode of
    MODES
  ) {
    const entries =
      markersByMode.get(
        mode.id,
      ) ?? [];

    for (
      const entry of
      entries
    ) {
      entry.marker.moveTo(
        entry.point.x,
        0,
      );

      numberLine.resizePoint(
        entry.marker,
        POINT_RADIUS_PIXELS,
        entry.scale,
      );
    }
  }
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
/* Initial sequence-style point reveal                                        */
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

let stopIntro =
  (): void => {};

let introComplete =
  false;

function startIntro(): void {
  const entries =
    markersByMode.get(
      "all",
    ) ?? [];

  let elapsed = 0;

  stopIntro =
    scene.onFrame(
      ({
        deltaTime,
      }) => {
        elapsed +=
          deltaTime;

        let complete =
          true;

        for (
          let index = 0;
          index <
            entries.length;
          index += 1
        ) {
          const entry =
            entries[index];

          const startTime =
            INITIAL_DELAY_SECONDS +
            index *
              INITIAL_POINT_INTERVAL_SECONDS;

          const progress =
            (
              elapsed -
              startTime
            ) /
            INITIAL_POINT_POP_SECONDS;

          if (
            progress < 0
          ) {
            complete =
              false;
            continue;
          }

          const clamped =
            clamp01(
              progress,
            );

          entry.scale =
            Math.max(
              0,
              easeOutBack(
                clamped,
              ),
            );

          entry.marker.show();

          numberLine.resizePoint(
            entry.marker,
            POINT_RADIUS_PIXELS,
            entry.scale,
          );

          if (
            clamped < 1
          ) {
            complete =
              false;
          } else {
            entry.scale = 1;
          }
        }

        if (complete) {
          introComplete =
            true;

          stopIntro();
        }
      },
    );
}

/* -------------------------------------------------------------------------- */
/* Mode transitions                                                           */
/* -------------------------------------------------------------------------- */

let stopModeTransition =
  (): void => {};

function hideEveryModeExcept(
  modeId: ModeId,
): void {
  for (
    const mode of
    MODES
  ) {
    if (
      mode.id ===
      modeId
    ) {
      continue;
    }

    for (
      const entry of
      markersByMode.get(
        mode.id,
      ) ?? []
    ) {
      entry.scale = 0;
      entry.marker.hide();
    }
  }
}

function showModeImmediately(
  modeId: ModeId,
): void {
  hideEveryModeExcept(
    modeId,
  );

  for (
    const entry of
    markersByMode.get(
      modeId,
    ) ?? []
  ) {
    entry.scale = 1;
    entry.marker.show();

    numberLine.resizePoint(
      entry.marker,
      POINT_RADIUS_PIXELS,
      1,
    );
  }
}

function setMode(
  nextMode: ModeId,
): void {
  if (
    nextMode ===
    currentMode &&
    introComplete
  ) {
    return;
  }

  stopIntro();
  stopModeTransition();

  introComplete =
    true;

  const oldMode =
    currentMode;

  currentMode =
    nextMode;

  styleButtons();

  /*
   * A user can click again before the previous transition has finished.
   * Remove any third, partially-visible layer before starting the new pair.
   */
  hideEveryModeExcept(
    oldMode,
  );

  const oldEntries =
    markersByMode.get(
      oldMode,
    ) ?? [];

  const newEntries =
    markersByMode.get(
      nextMode,
    ) ?? [];

  /*
   * Start the new layer at zero scale. The old and new marker layers use the
   * same engine point primitive, so the transition preserves the sequence
   * scene's "dot pop" vocabulary instead of replacing points with DOM badges.
   */
  for (
    const entry of
    newEntries
  ) {
    entry.scale = 0;
    entry.marker.show();

    numberLine.resizePoint(
      entry.marker,
      POINT_RADIUS_PIXELS,
      0,
    );
  }

  let elapsed = 0;

  stopModeTransition =
    scene.onFrame(
      ({
        deltaTime,
      }) => {
        elapsed +=
          deltaTime;

        const progress =
          clamp01(
            elapsed /
            MODE_TRANSITION_SECONDS,
          );

        const incoming =
          easeOutBack(
            progress,
          );

        const outgoing =
          1 -
          progress;

        for (
          const entry of
          oldEntries
        ) {
          entry.scale =
            Math.max(
              0,
              outgoing,
            );

          numberLine.resizePoint(
            entry.marker,
            POINT_RADIUS_PIXELS,
            entry.scale,
          );
        }

        for (
          const entry of
          newEntries
        ) {
          entry.scale =
            Math.max(
              0,
              incoming,
            );

          numberLine.resizePoint(
            entry.marker,
            POINT_RADIUS_PIXELS,
            entry.scale,
          );
        }

        if (
          progress >= 1
        ) {
          stopModeTransition();

          hideEveryModeExcept(
            nextMode,
          );

          showModeImmediately(
            nextMode,
          );
        }
      },
    );
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

            startIntro();
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
  startIntro();
}

Object.assign(
  window,
  {
    topologicalPointsDemo: {
      scene,
      numberLine,

      setMode,

      getMode:
        () =>
          currentMode,

      modes:
        MODES.map(
          ({ id }) =>
            id,
        ),
    },
  },
);

const destroy =
  (): void => {
    visibilityObserver
      ?.disconnect();

    resizeObserver
      .disconnect();

    stopIntro();
    stopModeTransition();

    controls.remove();

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
