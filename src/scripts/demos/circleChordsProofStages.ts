import {
  HUES,
  PanZoomController2D,
  ProofStageController2D,
  altitudeToLine2D,
  angleBisectorRay2D,
  createMathScene2D,
  lineIntersection2D,
  rayLineIntersection2D,
  type ProofStage2D,
  type Vec2Tuple,
} from "../math-graphics";
import {
  createDashedProofSegment2D,
  createProofBoundaryRegion2D,
  createProofCircleOutline2D,
  createProofPoint2D,
  createProofSectorHighlight2D,
  createProofSegment2D,
  proofArcPieceFromPoints2D,
  revealProofFill2D,
  revealProofPoint2D,
  revealProofSector2D,
  traceProofShape2D,
} from "../math-graphics/animation/proofHelpers2D";

const canvas = document.querySelector<HTMLCanvasElement>(
  "#circle-chords-proof-scene",
);

if (!canvas) {
  throw new Error("The circle-chords proof scene canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: 15.2,
  center: [0, -0.25],
  background: null,
});

const panZoom = new PanZoomController2D(scene, {
  minimumViewHeight: 4.5,
  maximumViewHeight: 34,
});

/* -------------------------------------------------------------------------- */
/* Construction data                                                          */
/* -------------------------------------------------------------------------- */

const CIRCLE_RADIUS = 6;
const CHORD_HEIGHT = 3;
const VERTICAL_CHORD_X = 1.5;

const O: Vec2Tuple = [0, 0];
const M: Vec2Tuple = [0, CHORD_HEIGHT];
const A: Vec2Tuple = [
  -Math.sqrt(CIRCLE_RADIUS ** 2 - CHORD_HEIGHT ** 2),
  CHORD_HEIGHT,
];
const B: Vec2Tuple = [
  Math.sqrt(CIRCLE_RADIUS ** 2 - CHORD_HEIGHT ** 2),
  CHORD_HEIGHT,
];
const circleYAtVerticalChord = Math.sqrt(
  CIRCLE_RADIUS ** 2 - VERTICAL_CHORD_X ** 2,
);
const C: Vec2Tuple = [VERTICAL_CHORD_X, circleYAtVerticalChord];
const D: Vec2Tuple = [VERTICAL_CHORD_X, -circleYAtVerticalChord];
const N: Vec2Tuple = [VERTICAL_CHORD_X, CHORD_HEIGHT];
const E: Vec2Tuple = [-VERTICAL_CHORD_X, -circleYAtVerticalChord];

const bisectorCNB = angleBisectorRay2D(N, C, B);
const bisectorHitOnCB = rayLineIntersection2D(
  bisectorCNB.origin,
  bisectorCNB.direction,
  C,
  B,
)?.point;

if (!bisectorHitOnCB) {
  throw new Error("The bisector of ∠CNB does not meet segment CB.");
}

const altitudeOToAE = altitudeToLine2D(O, A, E);
const altitudeOToBD = altitudeToLine2D(O, B, D);

const aeBdIntersection = lineIntersection2D(A, E, B, D)?.point;

if (!aeBdIntersection) {
  throw new Error("Lines AE and BD are parallel in the current configuration.");
}

/* -------------------------------------------------------------------------- */
/* Persistent objects                                                         */
/* -------------------------------------------------------------------------- */

const circle = createProofCircleOutline2D({
  name: "main-circle",
  center: O,
  radius: CIRCLE_RADIUS,
  segments: 220,
  outline: HUES.purple.soft,
  outlineWidth: 2.25,
  outlineOpacity: 0.98,
  fill: null,
});

const baseSegments = {
  AB: createProofSegment2D({
    name: "chord-ab",
    color: HUES.cyan.light,
    width: 2.75,
    opacity: 0.97,
  }),
  CD: createProofSegment2D({
    name: "chord-cd",
    color: HUES.cyan.light,
    width: 2.75,
    opacity: 0.97,
  }),
  OM: createProofSegment2D({
    name: "radius-om",
    color: HUES.gold.light,
    width: 2.45,
    opacity: 0.97,
  }),
};

const stage2Segments = {
  AO: createProofSegment2D({
    name: "segment-ao",
    color: HUES.gold.light,
    width: 2.35,
    opacity: 0.97,
  }),
  DO: createProofSegment2D({
    name: "segment-do",
    color: HUES.gold.light,
    width: 2.35,
    opacity: 0.97,
  }),
  CB: createProofSegment2D({
    name: "segment-cb",
    color: HUES.magenta.light,
    width: 2.35,
    opacity: 0.97,
  }),
};

const stage5Diameter = createProofSegment2D({
  name: "diameter-ce",
  color: HUES.blue.light,
  width: 2.45,
  opacity: 0.97,
});

const stage6Segments = {
  AE: createProofSegment2D({
    name: "segment-ae",
    color: HUES.mint.light,
    width: 2.35,
    opacity: 0.97,
  }),
  BD: createProofSegment2D({
    name: "segment-bd",
    color: HUES.mint.light,
    width: 2.35,
    opacity: 0.97,
  }),
  OtoAE: createProofSegment2D({
    name: "altitude-o-to-ae",
    color: HUES.gold.light,
    width: 2.25,
    opacity: 0.97,
  }),
  OtoBD: createProofSegment2D({
    name: "altitude-o-to-bd",
    color: HUES.gold.light,
    width: 2.25,
    opacity: 0.97,
  }),
};

const stage7Extensions = {
  fromEToIntersection: createProofSegment2D({
    name: "extension-e-to-intersection",
    color: HUES.blue.light,
    width: 2.3,
    opacity: 0.97,
  }),
  fromDToIntersection: createProofSegment2D({
    name: "extension-d-to-intersection",
    color: HUES.blue.light,
    width: 2.3,
    opacity: 0.97,
  }),
};

const bisectorSegment = createDashedProofSegment2D({
  name: "bisector-angle-cnb",
  color: HUES.blue.light,
  width: 2.15,
  opacity: 0.92,
  dashSize: 0.2,
  gapSize: 0.13,
});

const sectorAOD = createProofSectorHighlight2D({
  name: "sector-aod",
  vertex: O,
  firstArmPoint: A,
  secondArmPoint: D,
  radius: 0,
  fill: HUES.gold.base,
  fillOpacity: 0.18,
  outline: HUES.gold.light,
  outlineOpacity: 0.34,
});

// This generic region description has exactly the same boundary as the original
// custom piecewise curve: N -> B -> minor arc BD -> D -> N.
const regionNBD = createProofBoundaryRegion2D({
  name: "region-nbd",
  pieces: [
    { type: "segment", from: N, to: B },
    proofArcPieceFromPoints2D({
      center: O,
      radius: CIRCLE_RADIUS,
      startPoint: B,
      endPoint: D,
      direction: "clockwise",
    }),
    { type: "segment", from: D, to: N },
  ],
  segments: 180,
  fill: HUES.mint.base,
  fillOpacity: 0.18,
  outline: null,
});

const rightAngles = {
  AND: createProofSectorHighlight2D({
    name: "right-angle-and",
    vertex: N,
    firstArmPoint: A,
    secondArmPoint: D,
    shape: "right-angle",
    fill: HUES.cyan.base,
    fillOpacity: 0.17,
    outline: HUES.cyan.light,
    outlineOpacity: 0.95,
  }),
  CNB: createProofSectorHighlight2D({
    name: "right-angle-cnb",
    vertex: N,
    firstArmPoint: C,
    secondArmPoint: B,
    shape: "right-angle",
    fill: HUES.magenta.base,
    fillOpacity: 0.17,
    outline: HUES.magenta.light,
    outlineOpacity: 0.95,
  }),
  OAE: createProofSectorHighlight2D({
    name: "right-angle-oae",
    vertex: altitudeOToAE.foot,
    firstArmPoint: A,
    secondArmPoint: O,
    shape: "right-angle",
    fill: HUES.gold.base,
    fillOpacity: 0.17,
    outline: HUES.gold.light,
    outlineOpacity: 0.95,
  }),
  OBD: createProofSectorHighlight2D({
    name: "right-angle-obd",
    vertex: altitudeOToBD.foot,
    firstArmPoint: D,
    secondArmPoint: O,
    shape: "right-angle",
    fill: HUES.gold.base,
    fillOpacity: 0.17,
    outline: HUES.gold.light,
    outlineOpacity: 0.95,
  }),
};

const points = {
  A: createProofPoint2D({ name: "point-a", text: "A", position: A, offset: [-0.34, 0.05] }),
  B: createProofPoint2D({ name: "point-b", text: "B", position: B, offset: [0.34, 0.05] }),
  C: createProofPoint2D({ name: "point-c", text: "C", position: C, offset: [0.28, 0.28] }),
  D: createProofPoint2D({ name: "point-d", text: "D", position: D, offset: [0.25, -0.28] }),
  M: createProofPoint2D({ name: "point-m", text: "M", position: M, offset: [0, 0.42], fill: HUES.gold.base }),
  O: createProofPoint2D({ name: "point-o", text: "O", position: O, offset: [0, -0.42], fill: HUES.gold.base }),
  N: createProofPoint2D({ name: "point-n", text: "N", position: N, offset: [0.28, 0.38], fill: HUES.mint.base }),
  E: createProofPoint2D({ name: "point-e", text: "E", position: E, offset: [-0.3, -0.28], fill: HUES.blue.base }),
};

scene.add(
  circle,
  regionNBD,
  sectorAOD,
  baseSegments.AB,
  baseSegments.CD,
  baseSegments.OM,
  stage2Segments.AO,
  stage2Segments.DO,
  stage2Segments.CB,
  stage5Diameter,
  stage6Segments.AE,
  stage6Segments.BD,
  stage6Segments.OtoAE,
  stage6Segments.OtoBD,
  stage7Extensions.fromEToIntersection,
  stage7Extensions.fromDToIntersection,
  bisectorSegment,
  rightAngles.AND,
  rightAngles.CNB,
  rightAngles.OAE,
  rightAngles.OBD,
  points.A.marker,
  points.A.label,
  points.B.marker,
  points.B.label,
  points.C.marker,
  points.C.label,
  points.D.marker,
  points.D.label,
  points.M.marker,
  points.M.label,
  points.O.marker,
  points.O.label,
  points.N.marker,
  points.N.label,
  points.E.marker,
  points.E.label,
);

/* -------------------------------------------------------------------------- */
/* Reset                                                                      */
/* -------------------------------------------------------------------------- */

function resetScene(): void {
  circle.hide().setOutlineTraceRange(0, 0);

  regionNBD.hide().setFillOpacity(0);
  sectorAOD.hide().setRadius(0);

  for (const segment of Object.values(baseSegments)) segment.hide();
  for (const segment of Object.values(stage2Segments)) segment.hide();
  for (const segment of Object.values(stage6Segments)) segment.hide();
  for (const segment of Object.values(stage7Extensions)) segment.hide();

  stage5Diameter.hide();
  bisectorSegment.hide();

  rightAngles.AND.hide().setRadius(0);
  rightAngles.CNB.hide().setRadius(0);
  rightAngles.OAE.hide().setRadius(0);
  rightAngles.OBD.hide().setRadius(0);

  for (const point of Object.values(points)) {
    point.marker.hide().resizeTo(0);
    point.label.hide().setOpacity(0);
  }

  scene.setView({
    viewHeight: 15.2,
    center: [0, -0.25],
    unitSizePixels: null,
  });
}

/* -------------------------------------------------------------------------- */
/* Stages — intentionally preserves the original choreography and timings     */
/* -------------------------------------------------------------------------- */

const stages: ProofStage2D[] = [
  {
    title: "Initial diagram",
    description:
      "Draw the circle, the perpendicular chords AB and CD, and the segment OM.",
    async run(proof) {
      await traceProofShape2D(proof, circle, { durationSeconds: 1.05 });
      await proof.drawSegment(baseSegments.AB, A, B, { durationSeconds: 0.55 });
      await Promise.all([
        revealProofPoint2D(proof, points.A, { durationSeconds: 0.22 }),
        revealProofPoint2D(proof, points.B, { durationSeconds: 0.22 }),
        revealProofPoint2D(proof, points.M, { durationSeconds: 0.22 }),
      ]);

      await proof.drawSegment(baseSegments.CD, C, D, { durationSeconds: 0.55 });
      await Promise.all([
        revealProofPoint2D(proof, points.C, { durationSeconds: 0.22 }),
        revealProofPoint2D(proof, points.D, { durationSeconds: 0.22 }),
      ]);

      await proof.drawSegment(baseSegments.OM, O, M, { durationSeconds: 0.45 });
      await revealProofPoint2D(proof, points.O, { durationSeconds: 0.22 });
    },
  },
  {
    title: "Join auxiliary segments and highlight sector AOD",
    description:
      "Connect A with O, D with O, and C with B, then color the sector AOD.",
    async run(proof) {
      await proof.drawSegment(stage2Segments.AO, A, O, { durationSeconds: 0.42 });
      await proof.drawSegment(stage2Segments.DO, D, O, { durationSeconds: 0.42 });
      await proof.drawSegment(stage2Segments.CB, C, B, { durationSeconds: 0.42 });
      await revealProofSector2D(proof, sectorAOD, CIRCLE_RADIUS, {
        durationSeconds: 0.38,
      });
    },
  },
  {
    title: "Introduce N and highlight the curvilinear region NBD",
    description:
      "Label the intersection N = AB ∩ CD and color the region bounded by NB, ND, and the arc BD.",
    async run(proof) {
      await revealProofPoint2D(proof, points.N, { durationSeconds: 0.26 });
      await revealProofFill2D(proof, regionNBD, 0.18, {
        durationSeconds: 0.42,
      });
    },
  },
  {
    title: "Right angles at N and the bisector of ∠CNB",
    description:
      "Mark the right angles ∠AND and ∠CNB, then draw the dotted bisector of ∠CNB until it meets CB.",
    async run(proof) {
      await revealProofSector2D(proof, rightAngles.AND, 0.31, {
        durationSeconds: 0.34,
      });
      await revealProofSector2D(proof, rightAngles.CNB, 0.31, {
        durationSeconds: 0.34,
      });
      await proof.drawSegment(bisectorSegment, N, bisectorHitOnCB, {
        durationSeconds: 0.42,
      });
    },
  },
  {
    title: "Draw the diameter through C and O",
    description:
      "Extend the line through C and O to the opposite point E and label E.",
    async run(proof) {
      await proof.drawSegment(stage5Diameter, C, E, { durationSeconds: 0.62 });
      await revealProofPoint2D(proof, points.E, { durationSeconds: 0.24 });
    },
  },
  {
    title: "Draw AE and BD, then the perpendiculars from O",
    description:
      "Join A to E and B to D. Then drop the perpendiculars from O to AE and to BD and mark both right angles.",
    async run(proof) {
      await proof.drawSegment(stage6Segments.AE, A, E, { durationSeconds: 0.5 });
      await proof.drawSegment(stage6Segments.BD, B, D, { durationSeconds: 0.5 });
      await proof.drawSegment(stage6Segments.OtoAE, O, altitudeOToAE.foot, {
        durationSeconds: 0.42,
      });
      await revealProofSector2D(proof, rightAngles.OAE, 0.27, {
        durationSeconds: 0.3,
      });
      await proof.drawSegment(stage6Segments.OtoBD, O, altitudeOToBD.foot, {
        durationSeconds: 0.42,
      });
      await revealProofSector2D(proof, rightAngles.OBD, 0.27, {
        durationSeconds: 0.3,
      });
    },
  },
  {
    title: "Extend AE and BD until they meet",
    description:
      "Continue the lines AE and BD beyond E and D until they intersect.",
    async run(proof) {
      await proof.ensurePointsVisible(
        [A, B, C, D, O, E, aeBdIntersection],
        {
          paddingFraction: 0.13,
          durationSeconds: 0.72,
        },
      );

      await proof.drawSegment(
        stage7Extensions.fromEToIntersection,
        E,
        aeBdIntersection,
        { durationSeconds: 0.58 },
      );
      await proof.drawSegment(
        stage7Extensions.fromDToIntersection,
        D,
        aeBdIntersection,
        { durationSeconds: 0.58 },
      );
    },
  },
];

const proof = new ProofStageController2D(scene, {
  stages,
  reset: resetScene,
  startVisibilityRatio: 0.15,
});

Object.assign(window, {
  circleChordsProofScene: {
    scene,
    proof,
    panZoom,
    points: { A, B, C, D, E, M, N, O },
    constructions: {
      bisectorHitOnCB,
      altitudeOToAE,
      altitudeOToBD,
      aeBdIntersection,
    },
  },
});

const destroy = (): void => {
  proof.destroy();
  panZoom.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
