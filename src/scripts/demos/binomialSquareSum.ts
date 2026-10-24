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
  "#binomial-square-sum-scene",
);

if (!canvas) {
  throw new Error("The binomial-square-sum scene canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: 10,
  center: [0, 1.8],
  background: null,
});

const initialView = currentSceneView2D(scene);

const a = 3.4;
const b = 1.6;
const left = -2.5;
const bottom = 0.5;
const right = left + a + b;
const top = bottom + a + b;
const splitX = left + a;
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
    name: "sum-square-edge-top",
    color: HUES.cyan.light,
    width: 2.95,
    opacity: 0.98,
  }),
  right: createProofSegment2D({
    name: "sum-square-edge-right",
    color: HUES.cyan.light,
    width: 2.95,
    opacity: 0.98,
  }),
  bottom: createProofSegment2D({
    name: "sum-square-edge-bottom",
    color: HUES.cyan.light,
    width: 2.95,
    opacity: 0.98,
  }),
  left: createProofSegment2D({
    name: "sum-square-edge-left",
    color: HUES.cyan.light,
    width: 2.95,
    opacity: 0.98,
  }),
};

const dotted = {
  vertical: createDashedProofSegment2D({
    name: "sum-square-dotted-vertical",
    color: HUES.purple.light,
    width: 2.15,
    opacity: 0.84,
    dashSize: 0.12,
    gapSize: 0.1,
  }),
  horizontal: createDashedProofSegment2D({
    name: "sum-square-dotted-horizontal",
    color: HUES.purple.light,
    width: 2.15,
    opacity: 0.84,
    dashSize: 0.12,
    gapSize: 0.1,
  }),
};

const solidPartitions = {
  vertical: createProofSegment2D({
    name: "sum-square-solid-vertical",
    color: HUES.gold.light,
    width: 2.45,
    opacity: 0.95,
  }),
  horizontal: createProofSegment2D({
    name: "sum-square-solid-horizontal",
    color: HUES.gold.light,
    width: 2.45,
    opacity: 0.95,
  }),
};

const braces = {
  topA: createDimensionBrace2D({
    name: "sum-square-brace-top-a",
    start: TL,
    end: topSplit,
    referencePoint: figureCenter,
    side: "away-from-reference",
    style: ALGEBRA_BRACE_STYLE,
    label: {
      latex: String.raw`a`,
      style: ALGEBRA_BRACE_LABEL_STYLE,
    },
  }),
  topB: createDimensionBrace2D({
    name: "sum-square-brace-top-b",
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

  rightA: createDimensionBrace2D({
    name: "sum-square-brace-right-a",
    start: rightSplit,
    end: TR,
    referencePoint: figureCenter,
    side: "away-from-reference",
    style: ALGEBRA_BRACE_STYLE,
    label: {
      latex: String.raw`a`,
      style: ALGEBRA_BRACE_LABEL_STYLE,
    },
  }),
  rightB: createDimensionBrace2D({
    name: "sum-square-brace-right-b",
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

  bottomA: createDimensionBrace2D({
    name: "sum-square-brace-bottom-a",
    start: BL,
    end: bottomSplit,
    referencePoint: figureCenter,
    side: "away-from-reference",
    style: ALGEBRA_BRACE_STYLE,
    label: {
      latex: String.raw`a`,
      style: ALGEBRA_BRACE_LABEL_STYLE,
    },
  }),
  bottomB: createDimensionBrace2D({
    name: "sum-square-brace-bottom-b",
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

  leftA: createDimensionBrace2D({
    name: "sum-square-brace-left-a",
    start: leftSplit,
    end: TL,
    referencePoint: figureCenter,
    side: "away-from-reference",
    style: ALGEBRA_BRACE_STYLE,
    label: {
      latex: String.raw`a`,
      style: ALGEBRA_BRACE_LABEL_STYLE,
    },
  }),
  leftB: createDimensionBrace2D({
    name: "sum-square-brace-left-b",
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
  a2: [
    leftSplit,
    [splitX, splitY] as Vec2Tuple,
    topSplit,
    TL,
  ] as Vec2Tuple[],
  abTop: [
    [splitX, splitY] as Vec2Tuple,
    rightSplit,
    TR,
    topSplit,
  ] as Vec2Tuple[],
  abBottom: [
    BL,
    bottomSplit,
    [splitX, splitY] as Vec2Tuple,
    leftSplit,
  ] as Vec2Tuple[],
  b2: [
    bottomSplit,
    BR,
    rightSplit,
    [splitX, splitY] as Vec2Tuple,
  ] as Vec2Tuple[],
};

const regions = {
  a2: createPolygon2D({
    name: "sum-square-region-a2",
    vertices: regionVertices.a2,
    style: {
      outlineOpacity: 0,
      fill: HUES.cyan.base,
      fillOpacity: 0.2,
    },
  }),
  abTop: createPolygon2D({
    name: "sum-square-region-ab-top",
    vertices: regionVertices.abTop,
    style: {
      outlineOpacity: 0,
      fill: HUES.gold.base,
      fillOpacity: 0.2,
    },
  }),
  abBottom: createPolygon2D({
    name: "sum-square-region-ab-bottom",
    vertices: regionVertices.abBottom,
    style: {
      outlineOpacity: 0,
      fill: HUES.gold.base,
      fillOpacity: 0.2,
    },
  }),
  b2: createPolygon2D({
    name: "sum-square-region-b2",
    vertices: regionVertices.b2,
    style: {
      outlineOpacity: 0,
      fill: HUES.magenta.base,
      fillOpacity: 0.2,
    },
  }),
};

const areaLabels = {
  a2: createAreaLabel(
    "sum-square-label-a2",
    String.raw`a^2`,
    polygonCentroid2D(regionVertices.a2),
  ),
  abTop: createAreaLabel(
    "sum-square-label-ab-top",
    String.raw`ab`,
    polygonCentroid2D(regionVertices.abTop),
  ),
  abBottom: createAreaLabel(
    "sum-square-label-ab-bottom",
    String.raw`ab`,
    polygonCentroid2D(regionVertices.abBottom),
  ),
  b2: createAreaLabel(
    "sum-square-label-b2",
    String.raw`b^2`,
    polygonCentroid2D(regionVertices.b2),
  ),
};

const formulas = {
  top: createFormulaLabel(
    "sum-square-formula-top",
    String.raw`(a+b)^2`,
    [0.45, -1.10],
  ),
  bottom: createFormulaLabel(
    "sum-square-formula-bottom",
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

  formulas.top.setLatex(String.raw`(a+b)^2`);
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
      anim.revealBrace(braces.topA, 0.62),
      anim.revealBrace(braces.topB, 0.62),
      anim.revealBrace(braces.rightA, 0.62),
      anim.revealBrace(braces.rightB, 0.62),
      anim.revealBrace(braces.bottomA, 0.62),
      anim.revealBrace(braces.bottomB, 0.62),
      anim.revealBrace(braces.leftA, 0.62),
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

    await anim.revealFill(regions.a2, 0.22, 0.42);
    await anim.revealLabel(areaLabels.a2, 0.24);
    await anim.wait(ALGEBRA_STAGE_PAUSE_SECONDS);

    await anim.revealFill(regions.abTop, 0.2, 0.38);
    await anim.revealLabel(areaLabels.abTop, 0.24);
    await anim.wait(ALGEBRA_SHORT_STAGE_PAUSE_SECONDS);

    await anim.revealFill(regions.abBottom, 0.2, 0.38);
    await anim.revealLabel(areaLabels.abBottom, 0.24);
    await anim.wait(ALGEBRA_SHORT_STAGE_PAUSE_SECONDS);

    await anim.revealFill(regions.b2, 0.2, 0.38);
    await anim.revealLabel(areaLabels.b2, 0.24);
    await anim.wait(ALGEBRA_STAGE_PAUSE_SECONDS);

    const topSteps = [
      String.raw`(a+b)^2`,
      String.raw`(a+b)^2 = a^2`,
      String.raw`(a+b)^2 = a^2 + ab`,
      String.raw`(a+b)^2 = a^2 + ab + ab`,
      String.raw`(a+b)^2 = a^2 + ab + ab + b^2`,
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
      String.raw`(a+b)^2 = a^2 + 2ab + b^2`,
      ALGEBRA_FINAL_HOLD_SECONDS,
      0.18,
    );
  },
});

Object.assign(window, {
  binomialSquareSumScene: {
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
