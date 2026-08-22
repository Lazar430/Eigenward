import {
  HUES,
  ProofStageController2D,
  createDimensionBrace2D,
  createMathScene2D,
  createTextLabel2D,
  currentSceneView2D,
  type ProofStage2D,
  type Vec2Tuple,
} from "../math-graphics";
import {
  createProofSectorHighlight2D,
  createProofSegment2D,
  revealProofSector2D,
} from "../math-graphics/animation/proofHelpers2D";

const SQRT3 = Math.sqrt(3);

const canvas = document.querySelector<HTMLCanvasElement>(
  "#sine30-proof",
);

if (!canvas) {
  throw new Error(
    "The sine-30 proof canvas could not be found.",
  );
}

const scene = createMathScene2D(canvas, {
  viewHeight: 8.2,
  center: [0, 1.72],
  background: null,
});

const initialView =
  currentSceneView2D(scene);

/* -------------------------------------------------------------------------- */
/* Geometry                                                                   */
/* -------------------------------------------------------------------------- */

const SIDE = 4.6;
const HALF = SIDE / 2;
const HEIGHT =
  SIDE * SQRT3 / 2;

/*
 * Stage 1 is triangle ACB:
 *
 *             C  (30°)
 *             |\
 *             | \
 *             |  \
 *          90°|   \ 60°
 *             A----B
 *
 * Stage 2 extends AB leftward to D and joins D to C, producing equilateral
 * triangle DCB. AC is its altitude and median.
 */
const D: Vec2Tuple = [
  -HALF,
  0,
];

const A: Vec2Tuple = [
  0,
  0,
];

const B: Vec2Tuple = [
  HALF,
  0,
];

const C: Vec2Tuple = [
  0,
  HEIGHT,
];

/* -------------------------------------------------------------------------- */
/* Visual helpers                                                             */
/* -------------------------------------------------------------------------- */

function createAngleLabel(
  name: string,
  text: string,
  color: string,
  background: string,
  border: string,
) {
  return createTextLabel2D({
    name,
    text,
    position: [0, 0],
    anchor: [0.5, 0.5],
    color,
    fontSizePx: 14,
    fontWeight: 760,
    background,
    border,
    borderRadiusPx: 7,
    padding: "0.10rem 0.32rem",
  });
}

function placeAngleLabel(
  label: ReturnType<typeof createTextLabel2D>,
  sector: ReturnType<typeof createProofSectorHighlight2D>,
  radiusFactor = 1.42,
): void {
  const [x, y] =
    sector.getLabelPosition(
      radiusFactor,
    );

  label.moveTo(x, y);
}

/* -------------------------------------------------------------------------- */
/* Triangle edges                                                             */
/* -------------------------------------------------------------------------- */

const edges = {
  AB: createProofSegment2D({
    name: "sine30-edge-ab",
    color: HUES.cyan.light,
    width: 2.85,
    opacity: 0.97,
  }),

  AC: createProofSegment2D({
    name: "sine30-edge-ac",
    color: HUES.cyan.light,
    width: 2.85,
    opacity: 0.97,
  }),

  BC: createProofSegment2D({
    name: "sine30-edge-bc",
    color: HUES.cyan.light,
    width: 2.85,
    opacity: 0.97,
  }),

  AD: createProofSegment2D({
    name: "sine30-edge-ad",
    color: HUES.gold.light,
    width: 2.65,
    opacity: 0.94,
  }),

  DC: createProofSegment2D({
    name: "sine30-edge-dc",
    color: HUES.gold.light,
    width: 2.65,
    opacity: 0.94,
  }),
};

/* -------------------------------------------------------------------------- */
/* Angle highlights                                                           */
/* -------------------------------------------------------------------------- */

/* Stage 1 angles. */
const angleC30Right =
  createProofSectorHighlight2D({
    name: "sine30-angle-c-right-30",
    vertex: C,
    firstArmPoint: A,
    secondArmPoint: B,
    fill: HUES.magenta.base,
    fillOpacity: 0.24,
    outline: HUES.magenta.light,
    outlineOpacity: 0.94,
  });

const angleB60 =
  createProofSectorHighlight2D({
    name: "sine30-angle-b-60",
    vertex: B,
    firstArmPoint: C,
    secondArmPoint: A,
    fill: HUES.gold.base,
    fillOpacity: 0.24,
    outline: HUES.gold.light,
    outlineOpacity: 0.94,
  });

const angleARight =
  createProofSectorHighlight2D({
    name: "sine30-angle-a-right",
    vertex: A,
    firstArmPoint: B,
    secondArmPoint: C,
    shape: "right-angle",
    fill: HUES.cyan.base,
    fillOpacity: 0.16,
    outline: HUES.cyan.light,
    outlineOpacity: 0.96,
  });

/* Stage 2 angles created by the reflected half. */
const angleC30Left =
  createProofSectorHighlight2D({
    name: "sine30-angle-c-left-30",
    vertex: C,
    firstArmPoint: D,
    secondArmPoint: A,
    fill: HUES.magenta.base,
    fillOpacity: 0.24,
    outline: HUES.magenta.light,
    outlineOpacity: 0.94,
  });

const angleD60 =
  createProofSectorHighlight2D({
    name: "sine30-angle-d-60",
    vertex: D,
    firstArmPoint: A,
    secondArmPoint: C,
    fill: HUES.gold.base,
    fillOpacity: 0.24,
    outline: HUES.gold.light,
    outlineOpacity: 0.94,
  });

const angleALeftRight =
  createProofSectorHighlight2D({
    name: "sine30-angle-a-left-right",
    vertex: A,
    firstArmPoint: D,
    secondArmPoint: C,
    shape: "right-angle",
    fill: HUES.cyan.base,
    fillOpacity: 0.16,
    outline: HUES.cyan.light,
    outlineOpacity: 0.96,
  });

/* -------------------------------------------------------------------------- */
/* Angle labels                                                               */
/* -------------------------------------------------------------------------- */

const angleLabels = {
  c30Right: createAngleLabel(
    "sine30-label-c-right-30",
    "30°",
    "rgba(255, 222, 237, 0.98)",
    "rgba(54, 19, 41, 0.78)",
    "1px solid rgba(255, 152, 187, 0.18)",
  ),

  b60: createAngleLabel(
    "sine30-label-b-60",
    "60°",
    "rgba(255, 240, 203, 0.98)",
    "rgba(54, 42, 18, 0.78)",
    "1px solid rgba(255, 226, 138, 0.18)",
  ),

  c30Left: createAngleLabel(
    "sine30-label-c-left-30",
    "30°",
    "rgba(255, 222, 237, 0.98)",
    "rgba(54, 19, 41, 0.78)",
    "1px solid rgba(255, 152, 187, 0.18)",
  ),

  d60: createAngleLabel(
    "sine30-label-d-60",
    "60°",
    "rgba(255, 240, 203, 0.98)",
    "rgba(54, 42, 18, 0.78)",
    "1px solid rgba(255, 226, 138, 0.18)",
  ),
};

/* -------------------------------------------------------------------------- */
/* Smooth measurement braces                                                  */
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
  color: "rgba(221, 255, 242, 0.98)",
  fontSizePx: 20,
  fontWeight: 760,
  background: "rgba(17, 46, 38, 0.80)",
  border:
    "1px solid rgba(136, 242, 206, 0.20)",
  borderRadiusPx: 7,
  padding: "0.10rem 0.32rem",
  offset: 0.24,
} as const;

const braces = {
  /*
   * The two outer slanted sides of the completed equilateral triangle.
   * The opposite bottom-half endpoint is used as a reference so each brace is
   * automatically placed outside the triangle.
   */
  DC: createDimensionBrace2D({
    name: "sine30-brace-dc",
    start: D,
    end: C,
    referencePoint: A,
    side: "away-from-reference",
    style: BRACE_STYLE,
    label: {
      latex: String.raw`\ell`,
      style:
        BRACE_LABEL_STYLE,
    },
  }),

  BC: createDimensionBrace2D({
    name: "sine30-brace-bc",
    start: B,
    end: C,
    referencePoint: A,
    side: "away-from-reference",
    style: BRACE_STYLE,
    label: {
      latex: String.raw`\ell`,
      style:
        BRACE_LABEL_STYLE,
    },
  }),

  AD: createDimensionBrace2D({
    name: "sine30-brace-ad",
    start: D,
    end: A,
    referencePoint: C,
    side: "away-from-reference",
    style: {
      ...BRACE_STYLE,
      offset: 0.30,
      hookDepth: 0.25,
      cuspDepth: 0.17,
    },
    label: {
      latex:
        String.raw`\frac{\ell}{2}`,
      style:
        BRACE_LABEL_STYLE,
    },
  }),

  AB: createDimensionBrace2D({
    name: "sine30-brace-ab",
    start: A,
    end: B,
    referencePoint: C,
    side: "away-from-reference",
    style: {
      ...BRACE_STYLE,
      offset: 0.30,
      hookDepth: 0.25,
      cuspDepth: 0.17,
    },
    label: {
      latex:
        String.raw`\frac{\ell}{2}`,
      style:
        BRACE_LABEL_STYLE,
    },
  }),

  /*
   * AC lies inside the equilateral triangle, so we choose its right side
   * explicitly. This keeps the height annotation beside the original
   * 30-60-90 triangle rather than on top of the new left-hand half.
   */
  AC: createDimensionBrace2D({
    name: "sine30-brace-ac",
    start: A,
    end: C,
    side: "right",
    style: {
      ...BRACE_STYLE,
      offset: 0.24,
      hookDepth: 0.27,
      cuspDepth: 0.18,
    },
    label: {
      latex:
        String.raw`\frac{\ell\sqrt{3}}{2}`,
      style: {
        ...BRACE_LABEL_STYLE,
        offset: 0.20,
      },
    },
  }),
};

async function revealDimensionBrace(
  proof: ProofStageController2D,
  brace: ReturnType<typeof createDimensionBrace2D>,
  durationSeconds = 0.72,
): Promise<void> {
  brace
    .show()
    .setRevealProgress(0)
    .setLabelOpacity(0);

  await proof.animate(
    durationSeconds,
    (progress) => {
      brace.setRevealProgress(
        progress,
      );

      /*
       * Let the geometry almost finish drawing before the measurement text
       * fades in, so the annotation reads as "brace first, value second".
       */
      const labelProgress =
        Math.min(
          1,
          Math.max(
            0,
            (progress - 0.68) /
              0.32,
          ),
        );

      brace.setLabelOpacity(
        labelProgress,
      );
    },
  );

  brace
    .showCompleteBrace()
    .setLabelOpacity(1);
}

scene.add(
  edges.AB,
  edges.AC,
  edges.BC,
  edges.AD,
  edges.DC,

  angleC30Right,
  angleB60,
  angleARight,
  angleC30Left,
  angleD60,
  angleALeftRight,

  ...Object.values(
    angleLabels,
  ),

  ...Object.values(
    braces,
  ),
);

/* -------------------------------------------------------------------------- */
/* Reset                                                                      */
/* -------------------------------------------------------------------------- */

const allEdges =
  Object.values(edges);

const allAngleHighlights = [
  angleC30Right,
  angleB60,
  angleARight,
  angleC30Left,
  angleD60,
  angleALeftRight,
];

function resetScene(): void {
  scene.setView({
    viewHeight:
      initialView.viewHeight,
    center:
      initialView.center,
    unitSizePixels: null,
  });

  for (const edge of allEdges) {
    edge.hide();
  }

  for (
    const angle
    of allAngleHighlights
  ) {
    angle.hide().setRadius(0);
  }

  for (
    const label
    of Object.values(
      angleLabels,
    )
  ) {
    label
      .hide()
      .setOpacity(0);
  }

  for (
    const brace
    of Object.values(braces)
  ) {
    brace.hide();
  }
}

/* -------------------------------------------------------------------------- */
/* Stages                                                                     */
/* -------------------------------------------------------------------------- */

const stages:
  ProofStage2D[] = [
  {
    title:
      "The 30-60-90 triangle",

    description:
      "Start with a 30-60-90 right triangle. The 30° angle is at the top, the 60° angle is at the lower-right vertex, and the remaining angle is a right angle.",

    async run(proof) {
      await proof.drawSegment(
        edges.AB,
        A,
        B,
        {
          durationSeconds: 0.45,
        },
      );

      await Promise.all([
        proof.drawSegment(
          edges.AC,
          A,
          C,
          {
            durationSeconds: 0.45,
          },
        ),

        proof.drawSegment(
          edges.BC,
          B,
          C,
          {
            durationSeconds: 0.54,
          },
        ),
      ]);

      await Promise.all([
        revealProofSector2D(
          proof,
          angleC30Right,
          0.52,
          {
            durationSeconds: 0.34,
          },
        ),

        revealProofSector2D(
          proof,
          angleB60,
          0.60,
          {
            durationSeconds: 0.34,
          },
        ),

        revealProofSector2D(
          proof,
          angleARight,
          0.28,
          {
            durationSeconds: 0.32,
          },
        ),
      ]);

      placeAngleLabel(
        angleLabels.c30Right,
        angleC30Right,
      );

      placeAngleLabel(
        angleLabels.b60,
        angleB60,
      );

      angleLabels
        .c30Right
        .show()
        .setOpacity(1);

      angleLabels
        .b60
        .show()
        .setOpacity(1);
    },
  },

  {
    title:
      "Complete the equilateral triangle",

    description:
      "Extend the base through A to D and join D to the top vertex C. The completed outer triangle DCB is equilateral, and AC divides it into two congruent 30-60-90 triangles.",

    async run(proof) {
      await proof.drawSegment(
        edges.AD,
        A,
        D,
        {
          durationSeconds: 0.45,
        },
      );

      await proof.drawSegment(
        edges.DC,
        D,
        C,
        {
          durationSeconds: 0.55,
        },
      );

      await Promise.all([
        revealProofSector2D(
          proof,
          angleC30Left,
          0.52,
          {
            durationSeconds: 0.34,
          },
        ),

        revealProofSector2D(
          proof,
          angleD60,
          0.60,
          {
            durationSeconds: 0.34,
          },
        ),

        revealProofSector2D(
          proof,
          angleALeftRight,
          0.28,
          {
            durationSeconds: 0.32,
          },
        ),
      ]);

      placeAngleLabel(
        angleLabels.c30Left,
        angleC30Left,
      );

      placeAngleLabel(
        angleLabels.d60,
        angleD60,
      );

      angleLabels
        .c30Left
        .show()
        .setOpacity(1);

      angleLabels
        .d60
        .show()
        .setOpacity(1);
    },
  },

  {
    title:
      "Read off the side lengths",

    description:
      "The two outer sides have length ℓ. Since AC is the median of the equilateral triangle, each half of the base has length ℓ/2, while the height is ℓ√3/2.",

    async run(proof) {
      /*
       * Draw related measurements together:
       * outer equal sides, the two equal base halves, then the height.
       */
      await Promise.all([
        revealDimensionBrace(
          proof,
          braces.DC,
          0.78,
        ),
        revealDimensionBrace(
          proof,
          braces.BC,
          0.78,
        ),
      ]);

      await Promise.all([
        revealDimensionBrace(
          proof,
          braces.AD,
          0.66,
        ),
        revealDimensionBrace(
          proof,
          braces.AB,
          0.66,
        ),
      ]);

      await revealDimensionBrace(
        proof,
        braces.AC,
        0.74,
      );
    },
  },
];

const proof =
  new ProofStageController2D(
    scene,
    {
      stages,
      reset: resetScene,
      startVisibilityRatio: 0.15,
      nextButtonPosition:
        "bottom-right",
    },
  );

Object.assign(window, {
  sine30ProofScene: {
    scene,
    proof,

    points: {
      D,
      A,
      B,
      C,
    },

    edges,
    braces,

    angles: {
      angleC30Right,
      angleB60,
      angleARight,
      angleC30Left,
      angleD60,
      angleALeftRight,
    },
  },
});

const destroy = (): void => {
  proof.destroy();
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
