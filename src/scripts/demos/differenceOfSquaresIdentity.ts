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
  "#difference-of-squares-scene",
);

if (!canvas) {
  throw new Error(
    "The difference-of-squares scene canvas could not be found.",
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
const left = -2.5;
const bottom = 0.5;
const right = left + a;
const top = bottom + a;
const splitX = left + (a - b);
const splitY = top - b;

const figureCenter: Vec2Tuple = [
  (left + right) / 2,
  (bottom + top) / 2,
];

const TL: Vec2Tuple = [left, top];
const TR: Vec2Tuple = [right, top];
const BR: Vec2Tuple = [right, bottom];
const BL: Vec2Tuple = [left, bottom];
const topSplit: Vec2Tuple = [splitX, top];
const sideSplit: Vec2Tuple = [right, splitY];
const notch: Vec2Tuple = [splitX, splitY];

const edges = {
  top: createProofSegment2D({
    name: "difference-of-squares-edge-top",
    color: HUES.cyan.light,
    width: 2.95,
    opacity: 0.98,
  }),
  right: createProofSegment2D({
    name: "difference-of-squares-edge-right",
    color: HUES.cyan.light,
    width: 2.95,
    opacity: 0.98,
  }),
  bottom: createProofSegment2D({
    name: "difference-of-squares-edge-bottom",
    color: HUES.cyan.light,
    width: 2.95,
    opacity: 0.98,
  }),
  left: createProofSegment2D({
    name: "difference-of-squares-edge-left",
    color: HUES.cyan.light,
    width: 2.95,
    opacity: 0.98,
  }),
};

const dotted = {
  vertical: createDashedProofSegment2D({
    name: "difference-of-squares-dotted-vertical",
    color: HUES.purple.light,
    width: 2.15,
    opacity: 0.84,
    dashSize: 0.12,
    gapSize: 0.1,
  }),
  horizontal: createDashedProofSegment2D({
    name: "difference-of-squares-dotted-horizontal",
    color: HUES.purple.light,
    width: 2.15,
    opacity: 0.84,
    dashSize: 0.12,
    gapSize: 0.1,
  }),
  diagonal: createDashedProofSegment2D({
    name: "difference-of-squares-dotted-diagonal",
    color: HUES.purple.light,
    width: 2.15,
    opacity: 0.84,
    dashSize: 0.12,
    gapSize: 0.1,
  }),
};

const solidPartitions = {
  vertical: createProofSegment2D({
    name: "difference-of-squares-solid-vertical",
    color: HUES.gold.light,
    width: 2.45,
    opacity: 0.95,
  }),
  horizontal: createProofSegment2D({
    name: "difference-of-squares-solid-horizontal",
    color: HUES.gold.light,
    width: 2.45,
    opacity: 0.95,
  }),
  diagonal: createProofSegment2D({
    name: "difference-of-squares-solid-diagonal",
    color: HUES.gold.light,
    width: 2.45,
    opacity: 0.95,
  }),
};

const braces = {
  topMain: createDimensionBrace2D({
    name: "difference-of-squares-brace-top-main",
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
    name: "difference-of-squares-brace-top-b",
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

  rightB: createDimensionBrace2D({
    name: "difference-of-squares-brace-right-b",
    start: sideSplit,
    end: TR,
    referencePoint: figureCenter,
    side: "away-from-reference",
    style: ALGEBRA_BRACE_STYLE,
    label: {
      latex: String.raw`b`,
      style: ALGEBRA_BRACE_LABEL_STYLE,
    },
  }),
  rightMain: createDimensionBrace2D({
    name: "difference-of-squares-brace-right-main",
    start: BR,
    end: sideSplit,
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

  bottomA: createDimensionBrace2D({
    name: "difference-of-squares-brace-bottom-a",
    start: BL,
    end: BR,
    referencePoint: figureCenter,
    side: "away-from-reference",
    style: ALGEBRA_BRACE_STYLE,
    label: {
      latex: String.raw`a`,
      style: ALGEBRA_BRACE_LABEL_STYLE,
    },
  }),

  leftA: createDimensionBrace2D({
    name: "difference-of-squares-brace-left-a",
    start: BL,
    end: TL,
    referencePoint: figureCenter,
    side: "away-from-reference",
    style: ALGEBRA_BRACE_STYLE,
    label: {
      latex: String.raw`a`,
      style: ALGEBRA_BRACE_LABEL_STYLE,
    },
  }),
};

const regionVertices = {
  upperTrapezoid: [
    BL,
    notch,
    topSplit,
    TL,
  ] as Vec2Tuple[],
  lowerTrapezoid: [
    BL,
    BR,
    sideSplit,
    notch,
  ] as Vec2Tuple[],
  b2: [
    notch,
    sideSplit,
    TR,
    topSplit,
  ] as Vec2Tuple[],
};

const regions = {
  upperTrapezoid: createPolygon2D({
    name: "difference-of-squares-region-upper-trapezoid",
    vertices: regionVertices.upperTrapezoid,
    style: {
      outlineOpacity: 0,
      fill: HUES.cyan.base,
      fillOpacity: 0.2,
    },
  }),
  lowerTrapezoid: createPolygon2D({
    name: "difference-of-squares-region-lower-trapezoid",
    vertices: regionVertices.lowerTrapezoid,
    style: {
      outlineOpacity: 0,
      fill: HUES.cyan.base,
      fillOpacity: 0.2,
    },
  }),
  b2: createPolygon2D({
    name: "difference-of-squares-region-b2",
    vertices: regionVertices.b2,
    style: {
      outlineOpacity: 0,
      fill: HUES.magenta.base,
      fillOpacity: 0.22,
    },
  }),
};

const areaLabels = {
  upperTrapezoid: createAreaLabel(
    "difference-of-squares-label-upper-trapezoid",
    String.raw`\frac{(a+b)(a-b)}{2}`,
    polygonCentroid2D(regionVertices.upperTrapezoid),
  ),
  lowerTrapezoid: createAreaLabel(
    "difference-of-squares-label-lower-trapezoid",
    String.raw`\frac{(a+b)(a-b)}{2}`,
    polygonCentroid2D(regionVertices.lowerTrapezoid),
  ),
  b2: createAreaLabel(
    "difference-of-squares-label-b2",
    String.raw`b^2`,
    polygonCentroid2D(regionVertices.b2),
  ),
};

const formulas = {
  top: createFormulaLabel(
    "difference-of-squares-formula-top",
    String.raw`a^2`,
    [0.0, -1.20],
  ),
  bottom: createFormulaLabel(
    "difference-of-squares-formula-bottom",
    String.raw``,
    [0.0, -1.92],
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
      anim.revealBrace(braces.topMain, 0.62),
      anim.revealBrace(braces.topB, 0.62),
      anim.revealBrace(braces.rightB, 0.62),
      anim.revealBrace(braces.rightMain, 0.62),
      anim.revealBrace(braces.bottomA, 0.62),
      anim.revealBrace(braces.leftA, 0.62),
    ]);

    await anim.wait(ALGEBRA_STAGE_PAUSE_SECONDS);
    await anim.revealLabel(formulas.top, 0.36);
    await anim.wait(ALGEBRA_STAGE_PAUSE_SECONDS);

    await Promise.all([
      anim.drawSegment(dotted.vertical, topSplit, notch, 0.72),
      anim.drawSegment(dotted.horizontal, notch, sideSplit, 0.72),
      anim.drawSegment(dotted.diagonal, BL, notch, 0.9),
    ]);

    await anim.wait(ALGEBRA_SHORT_STAGE_PAUSE_SECONDS);

    await Promise.all([
      anim.drawSegment(solidPartitions.vertical, topSplit, notch, 0.62),
      anim.drawSegment(solidPartitions.horizontal, notch, sideSplit, 0.62),
      anim.drawSegment(solidPartitions.diagonal, BL, notch, 0.78),
    ]);

    await anim.wait(ALGEBRA_STAGE_PAUSE_SECONDS);

    await anim.revealFill(regions.upperTrapezoid, 0.22, 0.42);
    await anim.revealLabel(areaLabels.upperTrapezoid, 0.24);
    await anim.wait(ALGEBRA_SHORT_STAGE_PAUSE_SECONDS);

    await anim.revealFill(regions.lowerTrapezoid, 0.22, 0.42);
    await anim.revealLabel(areaLabels.lowerTrapezoid, 0.24);
    await anim.wait(ALGEBRA_STAGE_PAUSE_SECONDS);

    await anim.revealFill(regions.b2, 0.22, 0.38);
    await anim.revealLabel(areaLabels.b2, 0.24);
    await anim.wait(ALGEBRA_STAGE_PAUSE_SECONDS);

    await anim.setFormula(
      formulas.top,
      String.raw`a^2 = (a+b)(a-b) + b^2`,
      ALGEBRA_FORMULA_STEP_HOLD_SECONDS,
      0.16,
    );

    await anim.setFormula(
      formulas.bottom,
      String.raw`(a+b)(a-b) = a^2 - b^2`,
      ALGEBRA_FINAL_HOLD_SECONDS,
      0.18,
    );
  },
});

Object.assign(window, {
  differenceOfSquaresScene: {
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
