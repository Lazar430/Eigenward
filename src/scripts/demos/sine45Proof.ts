import {
  HUES,
  createDimensionBrace2D,
  createMathScene2D,
  createTextLabel2D,
  type Vec2Tuple,
} from "../math-graphics";
import {
  createProofSectorHighlight2D,
  createProofSegment2D,
} from "../math-graphics/animation/proofHelpers2D";

const canvas =
  document.querySelector<HTMLCanvasElement>(
    "#sine45-proof",
  );

if (!canvas) {
  throw new Error(
    "The right-isosceles triangle canvas could not be found.",
  );
}

const scene = createMathScene2D(
  canvas,
  {
    viewHeight: 6.6,
    center: [0.4, 1.55],
    background: null,
  },
);

/* -------------------------------------------------------------------------- */
/* Geometry                                                                   */
/* -------------------------------------------------------------------------- */

const LEG = 3.6;

const A: Vec2Tuple = [0, 0];
const B: Vec2Tuple = [LEG, 0];
const C: Vec2Tuple = [0, LEG];

/* -------------------------------------------------------------------------- */
/* Edges                                                                      */
/* -------------------------------------------------------------------------- */

const edges = {
  AB: createProofSegment2D({
    name: "isosceles-edge-ab",
    color: HUES.cyan.light,
    width: 2.8,
    opacity: 0.97,
  }),

  AC: createProofSegment2D({
    name: "isosceles-edge-ac",
    color: HUES.cyan.light,
    width: 2.8,
    opacity: 0.97,
  }),

  BC: createProofSegment2D({
    name: "isosceles-edge-bc",
    color: HUES.cyan.light,
    width: 2.8,
    opacity: 0.97,
  }),
};

edges.AB.setEndpoints(A, B);
edges.AC.setEndpoints(A, C);
edges.BC.setEndpoints(B, C);

/* -------------------------------------------------------------------------- */
/* Angles                                                                     */
/* -------------------------------------------------------------------------- */

const angleB45 =
  createProofSectorHighlight2D({
    name: "isosceles-angle-b-45",
    vertex: B,
    firstArmPoint: C,
    secondArmPoint: A,
    fill: HUES.gold.base,
    fillOpacity: 0.24,
    outline: HUES.gold.light,
    outlineOpacity: 0.94,
  });

const angleC45 =
  createProofSectorHighlight2D({
    name: "isosceles-angle-c-45",
    vertex: C,
    firstArmPoint: A,
    secondArmPoint: B,
    fill: HUES.magenta.base,
    fillOpacity: 0.24,
    outline: HUES.magenta.light,
    outlineOpacity: 0.94,
  });

const angleA90 =
  createProofSectorHighlight2D({
    name: "isosceles-angle-a-90",
    vertex: A,
    firstArmPoint: B,
    secondArmPoint: C,
    shape: "right-angle",
    fill: HUES.cyan.base,
    fillOpacity: 0.16,
    outline: HUES.cyan.light,
    outlineOpacity: 0.96,
  });

angleB45
  .show()
  .setRadius(0.58);

angleC45
  .show()
  .setRadius(0.58);

angleA90
  .show()
  .setRadius(0.28);

function createAngleLabel(
  name: string,
  text: string,
  position: Vec2Tuple,
  color: string,
  background: string,
  border: string,
) {
  return createTextLabel2D({
    name,
    text,
    position,
    anchor: [0.5, 0.5],
    color,
    fontSizePx: 14,
    fontWeight: 760,
    background,
    border,
    borderRadiusPx: 7,
    padding:
      "0.10rem 0.32rem",
  });
}

const angleLabels = {
  b45: createAngleLabel(
    "isosceles-label-b-45",
    "45°",
    angleB45.getLabelPosition(1.42),
    "rgba(255, 240, 203, 0.98)",
    "rgba(54, 42, 18, 0.78)",
    "1px solid rgba(255, 226, 138, 0.18)",
  ),

  c45: createAngleLabel(
    "isosceles-label-c-45",
    "45°",
    angleC45.getLabelPosition(1.42),
    "rgba(255, 222, 237, 0.98)",
    "rgba(54, 19, 41, 0.78)",
    "1px solid rgba(255, 152, 187, 0.18)",
  ),
};

/* -------------------------------------------------------------------------- */
/* Smooth braces                                                              */
/* -------------------------------------------------------------------------- */

const BRACE_STYLE = {
  color: HUES.mint.light,
  width: 3.8,
  opacity: 0.94,
  offset: 0.34,
  hookDepth: 0.34,
  cuspDepth: 0.23,
  samples: 96,
} as const;

const BRACE_LABEL_STYLE = {
  color:
    "rgba(221, 255, 242, 0.98)",
  fontSizePx: 20,
  fontWeight: 760,
  background:
    "rgba(17, 46, 38, 0.80)",
  border:
    "1px solid rgba(136, 242, 206, 0.20)",
  borderRadiusPx: 7,
  padding:
    "0.10rem 0.32rem",
  offset: 0.24,
} as const;

const braces = {
  AB: createDimensionBrace2D({
    name: "isosceles-brace-ab",
    start: A,
    end: B,
    referencePoint: C,
    side:
      "away-from-reference",
    style: BRACE_STYLE,
    label: {
      latex: String.raw`\ell`,
      style:
        BRACE_LABEL_STYLE,
    },
  }),

  AC: createDimensionBrace2D({
    name: "isosceles-brace-ac",
    start: A,
    end: C,
    referencePoint: B,
    side:
      "away-from-reference",
    style: BRACE_STYLE,
    label: {
      latex: String.raw`\ell`,
      style:
        BRACE_LABEL_STYLE,
    },
  }),

  BC: createDimensionBrace2D({
    name: "isosceles-brace-bc",
    start: B,
    end: C,
    referencePoint: A,
    side:
      "away-from-reference",
    style: BRACE_STYLE,
    label: {
      latex:
        String.raw`\ell\sqrt{2}`,
      style:
        BRACE_LABEL_STYLE,
    },
  }),
};

scene.add(
  edges.AB,
  edges.AC,
  edges.BC,

  angleB45,
  angleC45,
  angleA90,

  ...Object.values(
    angleLabels,
  ),

  ...Object.values(braces),
);

for (const brace of Object.values(braces)) {
  brace
    .setRevealProgress(0)
    .setLabelOpacity(0);
}

const BRACE_INTRO_START_VISIBILITY_RATIO =
  0.15;

let braceIntroStarted = false;
let braceIntroStart: number | null = null;
let stopBraceIntro = (): void => {};
let braceIntroObserver: IntersectionObserver | null = null;

function startBraceIntro(): void {
  if (braceIntroStarted) {
    return;
  }

  braceIntroStarted = true;
  braceIntroStart = null;

  stopBraceIntro = scene.onFrame(
    ({ time }) => {
      braceIntroStart ??= time;

      const elapsed =
        (time - braceIntroStart) /
        1000;

      const groups = [
        {
          braces: [
            braces.AB,
            braces.AC,
          ],
          start: 0,
          duration: 0.72,
        },
        {
          braces: [
            braces.BC,
          ],
          start: 0.24,
          duration: 0.78,
        },
      ] as const;

      let allDone = true;

      for (const group of groups) {
        const rawProgress =
          (
            elapsed -
            group.start
          ) /
          group.duration;

        const progress =
          Math.min(
            1,
            Math.max(
              0,
              rawProgress,
            ),
          );

        if (progress < 1) {
          allDone = false;
        }

        const eased =
          1 -
          Math.pow(
            1 - progress,
            3,
          );

        const labelProgress =
          Math.min(
            1,
            Math.max(
              0,
              (progress - 0.68) /
                0.32,
            ),
          );

        for (
          const brace
          of group.braces
        ) {
          brace
            .setRevealProgress(
              eased,
            )
            .setLabelOpacity(
              labelProgress,
            );
        }
      }

      if (allDone) {
        for (
          const brace
          of Object.values(braces)
        ) {
          brace
            .showCompleteBrace()
            .setLabelOpacity(1);
        }

        stopBraceIntro();
      }
    },
  );
}

if (
  typeof IntersectionObserver ===
  "function"
) {
  braceIntroObserver =
    new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (
            entry.target ===
              canvas &&
            entry.isIntersecting &&
            entry.intersectionRatio >=
              BRACE_INTRO_START_VISIBILITY_RATIO
          ) {
            startBraceIntro();
            braceIntroObserver?.disconnect();
            braceIntroObserver = null;
            break;
          }
        }
      },
      {
        threshold: [
          0,
          BRACE_INTRO_START_VISIBILITY_RATIO,
          0.5,
          1,
        ],
      },
    );

  braceIntroObserver.observe(
    canvas,
  );
} else {
  startBraceIntro();
}

Object.assign(window, {
  rightIsoscelesTriangleScene: {
    scene,

    points: {
      A,
      B,
      C,
    },

    edges,
    braces,

    angles: {
      angleB45,
      angleC45,
      angleA90,
    },
  },
});

const destroy = (): void => {
  braceIntroObserver?.disconnect();
  braceIntroObserver = null;
  stopBraceIntro();
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
