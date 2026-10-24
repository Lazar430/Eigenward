import {
  HUES,
  createDimensionBrace2D,
  createMathScene2D,
  createPolygon2D,
  currentSceneView2D,
  type Vec2Tuple,
} from "../math-graphics";

import {
  createDashedProofSegment2D,
  createProofSegment2D,
} from "../math-graphics/animation/proofHelpers2D";

import {
  ALGEBRA_BRACE_LABEL_STYLE,
  ALGEBRA_BRACE_STYLE,
  ALGEBRA_FINAL_HOLD_SECONDS,
  ALGEBRA_FORMULA_STEP_HOLD_SECONDS,
  ALGEBRA_SHORT_STAGE_PAUSE_SECONDS,
  ALGEBRA_STAGE_PAUSE_SECONDS,
  ViewportTriggeredSequence2D,
  createAreaLabel,
  createFormulaLabel,
  polygonCentroid2D,
} from "./algebraIdentityHelpers2D";

const canvas = document.querySelector<HTMLCanvasElement>(
  "#binomial-square-difference-scene",
);

if (!canvas) {
  throw new Error(
    "The binomial-square-difference scene canvas could not be found.",
  );
}

const scene = createMathScene2D(canvas, {
  viewHeight: 10,
  center: [0, 1.8],
  background: null,
});

const initialView = currentSceneView2D(scene);

const a = 5;
const b = 1.6;
const inner = a - b;
const left = -2.5;
const bottom = 0.5;
const right = left + a;
const top = bottom + a;
const splitX = left + inner;
const splitY = bottom + b;

const figureCenter: Vec2Tuple = [
  (left + right) / 2,
  (bottom + top) / 2,
];

const TL: Vec2Tuple = [left, top];
const TR: Vec2Tuple = [right, top];
const BR: Vec2Tuple = [right, bottom];
const BL: Vec2Tuple = [left, bottom];
const topSplit: Vec2Tuple = [splitX, top];
const bottomSplit: Vec2Tuple = [splitX, bottom];
const leftSplit: Vec2Tuple = [left, splitY];
const rightSplit: Vec2Tuple = [right, splitY];

const edges = {
  top: createProofSegment2D({
    name: "difference-square-edge-top",
    color: HUES.cyan.light,
    width: 2.95,
    opacity: 0.98,
  }),
  right: createProofSegment2D({
    name: "difference-square-edge-right",
    color: HUES.cyan.light,
    width: 2.95,
    opacity: 0.98,
  }),
  bottom: createProofSegment2D({
    name: "difference-square-edge-bottom",
    color: HUES.cyan.light,
    width: 2.95,
    opacity: 0.98,
  }),
  left: createProofSegment2D({
    name: "difference-square-edge-left",
    color: HUES.cyan.light,
    width: 2.95,
    opacity: 0.98,
  }),
};

const dotted = {
  vertical: createDashedProofSegment2D({
    name: "difference-square-dotted-vertical",
    color: HUES.purple.light,
    width: 2.15,
    opacity: 0.84,
    dashSize: 0.12,
    gapSize: 0.1,
  }),
  horizontal: createDashedProofSegment2D({
    name: "difference-square-dotted-horizontal",
    color: HUES.purple.light,
    width: 2.15,
    opacity: 0.84,
    dashSize: 0.12,
    gapSize: 0.1,
  }),
};

const solidPartitions = {
  vertical: createProofSegment2D({
    name: "difference-square-solid-vertical",
    color: HUES.gold.light,
    width: 2.45,
    opacity: 0.95,
  }),
  horizontal: createProofSegment2D({
    name: "difference-square-solid-horizontal",
    color: HUES.gold.light,
    width: 2.45,
    opacity: 0.95,
  }),
};

const braces = {
  topInner: createDimensionBrace2D({
    name: "difference-square-brace-top-inner",
    start: TL,
    end: topSplit,
    referencePoint: figureCenter,
    side: "away-from-reference",
    style: ALGEBRA_BRACE_STYLE,
    label: {
      latex: String.raw`a-b`,
      style: ALGEBRA_BRACE_LABEL_STYLE,
    },
  }),
  topB: createDimensionBrace2D({
    name: "difference-square-brace-top-b",
    start: topSplit,
    end: TR,
    referencePoint: figureCenter,
    side: "away-from-reference",
    style: ALGEBRA_BRACE_STYLE,
    label: {
      latex: String.raw`b`,
      style: ALGEBRA_BRACE_LABEL_STYLE,
    },
  }),

  rightInner: createDimensionBrace2D({
    name: "difference-square-brace-right-inner",
    start: rightSplit,
    end: TR,
    referencePoint: figureCenter,
    side: "away-from-reference",
    style: ALGEBRA_BRACE_STYLE,
    label: {
      latex: String.raw`a-b`,
      style: {
        ...ALGEBRA_BRACE_LABEL_STYLE,
        offset: 0.72,
      },
    },
  }),
  rightB: createDimensionBrace2D({
    name: "difference-square-brace-right-b",
    start: BR,
    end: rightSplit,
    referencePoint: figureCenter,
    side: "away-from-reference",
    style: ALGEBRA_BRACE_STYLE,
    label: {
      latex: String.raw`b`,
      style: ALGEBRA_BRACE_LABEL_STYLE,
    },
  }),

  bottomInner: createDimensionBrace2D({
    name: "difference-square-brace-bottom-inner",
    start: BL,
    end: bottomSplit,
    referencePoint: figureCenter,
    side: "away-from-reference",
    style: ALGEBRA_BRACE_STYLE,
    label: {
      latex: String.raw`a-b`,
      style: ALGEBRA_BRACE_LABEL_STYLE,
    },
  }),
  bottomB: createDimensionBrace2D({
    name: "difference-square-brace-bottom-b",
    start: bottomSplit,
    end: BR,
    referencePoint: figureCenter,
    side: "away-from-reference",
    style: ALGEBRA_BRACE_STYLE,
    label: {
      latex: String.raw`b`,
      style: ALGEBRA_BRACE_LABEL_STYLE,
    },
  }),

  leftInner: createDimensionBrace2D({
    name: "difference-square-brace-left-inner",
    start: leftSplit,
    end: TL,
    referencePoint: figureCenter,
    side: "away-from-reference",
    style: ALGEBRA_BRACE_STYLE,
    label: {
      latex: String.raw`a-b`,
      style: {
        ...ALGEBRA_BRACE_LABEL_STYLE,
        offset: 0.72,
      },
    },
  }),
  leftB: createDimensionBrace2D({
    name: "difference-square-brace-left-b",
    start: BL,
    end: leftSplit,
    referencePoint: figureCenter,
    side: "away-from-reference",
    style: ALGEBRA_BRACE_STYLE,
    label: {
      latex: String.raw`b`,
      style: ALGEBRA_BRACE_LABEL_STYLE,
    },
  }),
};

const regionVertices = {
  innerSquare: [
    leftSplit,
    [splitX, splitY] as Vec2Tuple,
    topSplit,
    TL,
  ] as Vec2Tuple[],
  rightStrip: [
    bottomSplit,
    BR,
    TR,
    topSplit,
  ] as Vec2Tuple[],
  bottomStrip: [
    BL,
    BR,
    rightSplit,
    leftSplit,
  ] as Vec2Tuple[],
  overlapSquare: [
    bottomSplit,
    BR,
    rightSplit,
    [splitX, splitY] as Vec2Tuple,
  ] as Vec2Tuple[],
};

const regions = {
  innerSquare: createPolygon2D({
    name: "difference-square-region-inner-square",
    vertices: regionVertices.innerSquare,
    style: {
      outlineOpacity: 0,
      fill: HUES.cyan.base,
      fillOpacity: 0.22,
    },
  }),
  rightStrip: createPolygon2D({
    name: "difference-square-region-right-strip",
    vertices: regionVertices.rightStrip,
    style: {
      outlineOpacity: 0,
      fill: HUES.gold.base,
      fillOpacity: 0.16,
    },
  }),
  bottomStrip: createPolygon2D({
    name: "difference-square-region-bottom-strip",
    vertices: regionVertices.bottomStrip,
    style: {
      outlineOpacity: 0,
      fill: HUES.gold.base,
      fillOpacity: 0.16,
    },
  }),
  overlapSquare: createPolygon2D({
    name: "difference-square-region-overlap-square",
    vertices: regionVertices.overlapSquare,
    style: {
      outlineOpacity: 0,
      fill: HUES.magenta.base,
      fillOpacity: 0.22,
    },
  }),
};

const areaLabels = {
  innerSquare: createAreaLabel(
    "difference-square-label-inner-square",
    String.raw`(a-b)^2`,
    polygonCentroid2D(regionVertices.innerSquare),
  ),
  rightStrip: createAreaLabel(
    "difference-square-label-right-strip",
    String.raw`ab`,
    polygonCentroid2D(regionVertices.rightStrip),
  ),
  bottomStrip: createAreaLabel(
    "difference-square-label-bottom-strip",
    String.raw`ab`,
    polygonCentroid2D(regionVertices.bottomStrip),
  ),
  overlapSquare: createAreaLabel(
    "difference-square-label-overlap-square",
    String.raw`b^2`,
    polygonCentroid2D(regionVertices.overlapSquare),
  ),
};

const formulas = {
  top: createFormulaLabel(
    "difference-square-formula-top",
    String.raw`a^2`,
    [0.45, -1.10],
  ),
  bottom: createFormulaLabel(
    "difference-square-formula-bottom",
    String.raw``,
    [0.45, -1.90],
  ),
};

scene.add(
  ...Object.values(edges),
  ...Object.values(dotted),
  ...Object.values(solidPartitions),
  ...Object.values(braces),
  ...Object.values(regions),
  ...Object.values(areaLabels),
  ...Object.values(formulas),
);

function resetScene(): void {
  scene.setView({
    viewHeight: initialView.viewHeight,
    center: initialView.center,
    unitSizePixels: null,
  });

  for (const segment of [
    ...Object.values(edges),
    ...Object.values(dotted),
    ...Object.values(solidPartitions),
  ]) {
    segment.hide();
  }

  for (const brace of Object.values(braces)) {
    brace.hide().setRevealProgress(0).setLabelOpacity(0);
  }

  for (const region of Object.values(regions)) {
    region.hide().setFillOpacity(0);
  }

  for (const label of [
    ...Object.values(areaLabels),
    ...Object.values(formulas),
  ]) {
    label.hide().setOpacity(0);
  }

  formulas.top.setLatex(String.raw`a^2`);
  formulas.bottom.setLatex(String.raw``);
}

const sequence = new ViewportTriggeredSequence2D({
  scene,
  reset: resetScene,
  async run(anim) {
    await anim.drawSegment(edges.top, TL, TR, 0.45);
    await anim.drawSegment(edges.right, TR, BR, 0.45);
    await anim.drawSegment(edges.bottom, BR, BL, 0.45);
    await anim.drawSegment(edges.left, BL, TL, 0.45);

    await anim.wait(ALGEBRA_STAGE_PAUSE_SECONDS);

    await Promise.all([
      anim.revealBrace(braces.topInner, 0.62),
      anim.revealBrace(braces.topB, 0.62),
      anim.revealBrace(braces.rightInner, 0.62),
      anim.revealBrace(braces.rightB, 0.62),
      anim.revealBrace(braces.bottomInner, 0.62),
      anim.revealBrace(braces.bottomB, 0.62),
      anim.revealBrace(braces.leftInner, 0.62),
      anim.revealBrace(braces.leftB, 0.62),
    ]);

    await anim.wait(ALGEBRA_STAGE_PAUSE_SECONDS);
    await anim.revealLabel(formulas.top, 0.36);
    await anim.wait(ALGEBRA_STAGE_PAUSE_SECONDS);

    await Promise.all([
      anim.drawSegment(dotted.vertical, topSplit, bottomSplit, 0.75),
      anim.drawSegment(dotted.horizontal, leftSplit, rightSplit, 0.75),
    ]);

    await anim.wait(ALGEBRA_SHORT_STAGE_PAUSE_SECONDS);

    await Promise.all([
      anim.drawSegment(solidPartitions.vertical, topSplit, bottomSplit, 0.65),
      anim.drawSegment(solidPartitions.horizontal, leftSplit, rightSplit, 0.65),
    ]);

    await anim.wait(ALGEBRA_STAGE_PAUSE_SECONDS);

    await anim.revealFill(regions.innerSquare, 0.24, 0.42);
    await anim.revealLabel(areaLabels.innerSquare, 0.24);
    await anim.wait(ALGEBRA_STAGE_PAUSE_SECONDS);

    await anim.revealFill(regions.rightStrip, 0.17, 0.38);
    await anim.revealLabel(areaLabels.rightStrip, 0.24);
    await anim.wait(ALGEBRA_SHORT_STAGE_PAUSE_SECONDS);

    await anim.revealFill(regions.bottomStrip, 0.17, 0.38);
    await anim.revealLabel(areaLabels.bottomStrip, 0.24);
    await anim.wait(ALGEBRA_SHORT_STAGE_PAUSE_SECONDS);

    await anim.revealFill(regions.overlapSquare, 0.22, 0.38);
    await anim.revealLabel(areaLabels.overlapSquare, 0.24);
    await anim.wait(ALGEBRA_STAGE_PAUSE_SECONDS);

    const topSteps = [
      String.raw`a^2`,
      String.raw`a^2 = (a-b)^2`,
      String.raw`a^2 = (a-b)^2 + ab`,
      String.raw`a^2 = (a-b)^2 + ab + ab`,
      String.raw`a^2 = (a-b)^2 + ab + ab - b^2`,
    ];

    for (let index = 1; index < topSteps.length; index += 1) {
      await anim.setFormula(
        formulas.top,
        topSteps[index],
        ALGEBRA_FORMULA_STEP_HOLD_SECONDS,
        0.14,
      );
    }

    await anim.setFormula(
      formulas.bottom,
      String.raw`(a-b)^2 = a^2 - 2ab + b^2`,
      ALGEBRA_FINAL_HOLD_SECONDS,
      0.18,
    );
  },
});

Object.assign(window, {
  binomialSquareDifferenceScene: {
    scene,
    sequence,
    braces,
    formulas,
  },
});

const destroy = (): void => {
  sequence.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
