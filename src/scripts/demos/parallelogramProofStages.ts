import {
  HUES,
  PanZoomController2D,
  ProofStageController2D,
  altitudeToLine2D,
  angleBisectorRay2D,
  createMathScene2D,
  currentSceneView2D,
  lineIntersection2D,
  midpoint2D,
  rayLineIntersection2D,
  type ProofStage2D,
  type Vec2Tuple,
} from "../math-graphics";
import {
  createDashedProofSegment2D,
  createProofPoint2D,
  createProofSectorHighlight2D,
  createProofSegment2D,
  revealProofPoint2D,
  revealProofSector2D,
} from "../math-graphics/animation/proofHelpers2D";

const canvas = document.querySelector<HTMLCanvasElement>(
  "#parallelogram-proof-scene",
);

if (!canvas) {
  throw new Error("The parallelogram-proof scene canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: 7.6,
  center: [0.25, 0.1],
  background: null,
});

const initialView = currentSceneView2D(scene);

const panZoom = new PanZoomController2D(scene, {
  minimumViewHeight: 2.5,
  maximumViewHeight: 24,
});

/* -------------------------------------------------------------------------- */
/* Construction                                                               */
/* -------------------------------------------------------------------------- */

type MutablePoint = [number, number];

const A: MutablePoint = [-4.3, -2.05];
const B: MutablePoint = [2.1, -2.05];
const D: MutablePoint = [-1.55, 2.05];

const C: Vec2Tuple = [
  B[0] + D[0] - A[0],
  B[1] + D[1] - A[1],
];

const N = midpoint2D(D, C);
const M = midpoint2D(C, B);
const T = midpoint2D(B, A);

const altitudeBToTN = altitudeToLine2D(B, T, N);
const altitudeCToAB = altitudeToLine2D(C, A, B);

const cBisectorRay = angleBisectorRay2D(C, B, D);
const cBisectorHit = rayLineIntersection2D(
  cBisectorRay.origin,
  cBisectorRay.direction,
  A,
  B,
);

if (!cBisectorHit) {
  throw new Error("The internal bisector of angle C does not meet line AB.");
}

const P = lineIntersection2D(B, N, A, D)?.point;

if (!P) {
  throw new Error("BN and AD are parallel in the current configuration.");
}

/* -------------------------------------------------------------------------- */
/* Persistent visuals                                                         */
/* -------------------------------------------------------------------------- */

const edges = {
  AB: createProofSegment2D({
    name: "edge-ab",
    color: HUES.cyan.light,
    width: 2.7,
    opacity: 0.96,
  }),
  BC: createProofSegment2D({
    name: "edge-bc",
    color: HUES.cyan.light,
    width: 2.7,
    opacity: 0.96,
  }),
  CD: createProofSegment2D({
    name: "edge-cd",
    color: HUES.cyan.light,
    width: 2.7,
    opacity: 0.96,
  }),
  DA: createProofSegment2D({
    name: "edge-da",
    color: HUES.cyan.light,
    width: 2.7,
    opacity: 0.96,
  }),
};

const auxiliaries = {
  AN: createProofSegment2D({
    name: "aux-an",
    color: HUES.gold.light,
    width: 2.35,
    opacity: 0.92,
  }),
  BN: createProofSegment2D({
    name: "aux-bn",
    color: HUES.gold.light,
    width: 2.35,
    opacity: 0.92,
  }),
  TN: createProofSegment2D({
    name: "aux-tn",
    color: HUES.gold.light,
    width: 2.35,
    opacity: 0.92,
  }),
};

const perpendicularBToTN = createProofSegment2D({
  name: "perpendicular-b-to-tn",
  color: HUES.magenta.light,
  width: 2.45,
  opacity: 0.96,
});

const cAngleBisector = createProofSegment2D({
  name: "angle-bisector-c",
  color: HUES.mint.light,
  width: 2.45,
  opacity: 0.96,
});

const abExtension = createDashedProofSegment2D({
  name: "ab-dotted-extension",
  color: HUES.purple.light,
  width: 2.2,
  opacity: 0.9,
  dashSize: 0.2,
  gapSize: 0.13,
});

const altitudeFromC = createProofSegment2D({
  name: "altitude-from-c",
  color: HUES.purple.light,
  width: 2.45,
  opacity: 0.96,
});

const bnExtension = createProofSegment2D({
  name: "bn-extension",
  color: HUES.blue.light,
  width: 2.45,
  opacity: 0.96,
});

const adExtension = createProofSegment2D({
  name: "ad-extension",
  color: HUES.blue.light,
  width: 2.45,
  opacity: 0.96,
});

// These three are the ordinary angles requested in stage 3.
const angleBNT = createProofSectorHighlight2D({
  name: "angle-bnt",
  vertex: N,
  firstArmPoint: B,
  secondArmPoint: T,
  fill: HUES.cyan.base,
  fillOpacity: 0.24,
  outline: HUES.cyan.light,
  outlineOpacity: 0.92,
});

const angleADC = createProofSectorHighlight2D({
  name: "angle-adc",
  vertex: D,
  firstArmPoint: A,
  secondArmPoint: C,
  fill: HUES.gold.base,
  fillOpacity: 0.24,
  outline: HUES.gold.light,
  outlineOpacity: 0.92,
});

const angleDCB = createProofSectorHighlight2D({
  name: "angle-dcb",
  vertex: C,
  firstArmPoint: D,
  secondArmPoint: B,
  fill: HUES.magenta.base,
  fillOpacity: 0.24,
  outline: HUES.magenta.light,
  outlineOpacity: 0.92,
});

// These are separate square markers at the actual perpendicular feet.
const bToTnRightAngle = createProofSectorHighlight2D({
  name: "right-angle-b-to-tn",
  vertex: altitudeBToTN.foot,
  firstArmPoint: T,
  secondArmPoint: B,
  shape: "right-angle",
  fill: HUES.magenta.base,
  fillOpacity: 0.17,
  outline: HUES.magenta.light,
  outlineOpacity: 0.95,
});

const cAltitudeRightAngle = createProofSectorHighlight2D({
  name: "right-angle-c-to-ab",
  vertex: altitudeCToAB.foot,
  firstArmPoint: B,
  secondArmPoint: C,
  shape: "right-angle",
  fill: HUES.purple.base,
  fillOpacity: 0.17,
  outline: HUES.purple.light,
  outlineOpacity: 0.95,
});

const points = {
  A: createProofPoint2D({
    name: "point-a",
    text: "A",
    position: A,
    offset: [-0.28, -0.18],
  }),
  B: createProofPoint2D({
    name: "point-b",
    text: "B",
    position: B,
    offset: [0.22, -0.18],
  }),
  C: createProofPoint2D({
    name: "point-c",
    text: "C",
    position: C,
    offset: [0.23, 0.18],
  }),
  D: createProofPoint2D({
    name: "point-d",
    text: "D",
    position: D,
    offset: [-0.24, 0.18],
  }),
  M: createProofPoint2D({
    name: "point-m",
    text: "M",
    position: M,
    offset: [0.22, 0.02],
    fill: HUES.gold.base,
  }),
  N: createProofPoint2D({
    name: "point-n",
    text: "N",
    position: N,
    offset: [0, 0.27],
    fill: HUES.gold.base,
  }),
  T: createProofPoint2D({
    name: "point-t",
    text: "T",
    position: T,
    offset: [0, -0.27],
    fill: HUES.gold.base,
  }),
  P: createProofPoint2D({
    name: "point-p",
    text: "P",
    position: P,
    offset: [0.22, 0.12],
    fill: HUES.blue.base,
  }),
};

scene.add(
  ...Object.values(edges),
  ...Object.values(auxiliaries),
  perpendicularBToTN,
  cAngleBisector,
  abExtension,
  altitudeFromC,
  bnExtension,
  adExtension,
  angleBNT,
  angleADC,
  angleDCB,
  bToTnRightAngle,
  cAltitudeRightAngle,
  ...Object.values(points).flatMap(({ marker, label }) => [marker, label]),
);

/* -------------------------------------------------------------------------- */
/* Reset                                                                      */
/* -------------------------------------------------------------------------- */

const allSegments = [
  ...Object.values(edges),
  ...Object.values(auxiliaries),
  perpendicularBToTN,
  cAngleBisector,
  abExtension,
  altitudeFromC,
  bnExtension,
  adExtension,
];

function resetScene(): void {
  scene.setView({
    viewHeight: initialView.viewHeight,
    center: initialView.center,
    unitSizePixels: null,
  });

  for (const segment of allSegments) segment.hide();

  angleBNT.hide().setRadius(0);
  angleADC.hide().setRadius(0);
  angleDCB.hide().setRadius(0);
  bToTnRightAngle.hide().setRadius(0);
  cAltitudeRightAngle.hide().setRadius(0);

  for (const point of Object.values(points)) {
    point.marker.hide().resizeTo(0);
    point.label.hide().setOpacity(0);
  }
}

/* -------------------------------------------------------------------------- */
/* Stages — intentionally preserves the original choreography and timings     */
/* -------------------------------------------------------------------------- */

const stages: ProofStage2D[] = [
  {
    title: "Initial configuration",
    description:
      "Construct parallelogram ABCD, mark M, N, T as the midpoints of CB, DC, BA, and draw AN, BN and TN. Use the mouse wheel to zoom; Alt-drag or middle-drag pans the diagram.",
    async run(proof) {
      await Promise.all([
        proof.drawSegment(edges.AB, A, B, { durationSeconds: 0.52 }),
        proof.drawSegment(edges.CD, D, C, { durationSeconds: 0.52 }),
      ]);

      await Promise.all([
        proof.drawSegment(edges.DA, A, D, { durationSeconds: 0.48 }),
        proof.drawSegment(edges.BC, B, C, { durationSeconds: 0.48 }),
      ]);

      await Promise.all([
        revealProofPoint2D(proof, points.A, { durationSeconds: 0.3 }),
        revealProofPoint2D(proof, points.B, { durationSeconds: 0.3 }),
        revealProofPoint2D(proof, points.C, { durationSeconds: 0.3 }),
        revealProofPoint2D(proof, points.D, { durationSeconds: 0.3 }),
      ]);

      await Promise.all([
        revealProofPoint2D(proof, points.M, { durationSeconds: 0.26 }),
        revealProofPoint2D(proof, points.N, { durationSeconds: 0.26 }),
        revealProofPoint2D(proof, points.T, { durationSeconds: 0.26 }),
      ]);

      await proof.drawSegment(auxiliaries.AN, A, N, {
        durationSeconds: 0.58,
      });
      await proof.drawSegment(auxiliaries.BN, B, N, {
        durationSeconds: 0.56,
      });
      await proof.drawSegment(auxiliaries.TN, T, N, {
        durationSeconds: 0.5,
      });
    },
  },
  {
    title: "Perpendicular from B to TN",
    description:
      "Drop the perpendicular from B to the infinite line TN. The square marker records the right angle at its foot.",
    async run(proof) {
      await proof.drawSegment(
        perpendicularBToTN,
        B,
        altitudeBToTN.foot,
        { durationSeconds: 0.62 },
      );

      await revealProofSector2D(proof, bToTnRightAngle, 0.27, {
        durationSeconds: 0.34,
      });
    },
  },
  {
    title: "Highlight the angles and bisect ∠C",
    description:
      "Highlight ∠BNT, ∠ADC and ∠DCB. Then draw the internal bisector of ∠C from C all the way to its exact intersection with line AB.",
    async run(proof) {
      await Promise.all([
        revealProofSector2D(proof, angleBNT, 0.6, {
          durationSeconds: 0.45,
        }),
        revealProofSector2D(proof, angleADC, 0.56, {
          durationSeconds: 0.45,
        }),
        revealProofSector2D(proof, angleDCB, 0.6, {
          durationSeconds: 0.45,
        }),
      ]);

      await proof.drawSegment(
        cAngleBisector,
        C,
        cBisectorHit.point,
        { durationSeconds: 0.7 },
      );
    },
  },
  {
    title: "Extend AB and drop the height from C",
    description:
      "Extend AB to the right of B using a dashed construction line, then drop the perpendicular from C to line AB and mark the new right angle.",
    async run(proof) {
      await proof.drawSegment(
        abExtension,
        B,
        altitudeCToAB.foot,
        { durationSeconds: 0.58 },
      );

      await proof.drawSegment(
        altitudeFromC,
        C,
        altitudeCToAB.foot,
        { durationSeconds: 0.66 },
      );

      await revealProofSector2D(proof, cAltitudeRightAngle, 0.27, {
        durationSeconds: 0.34,
      });
    },
  },
  {
    title: "Extend BN and AD to their intersection",
    description:
      "The intersection lies outside the initial camera. The scene first widens the view only if necessary, then continues BN and AD until they meet at P.",
    async run(proof) {
      await proof.ensurePointsVisible(
        [A, B, C, D, P],
        {
          paddingFraction: 0.11,
          minimumPaddingWorld: 0.45,
          paddingPixels: 38,
          durationSeconds: 0.72,
        },
      );

      await Promise.all([
        proof.drawSegment(bnExtension, N, P, {
          durationSeconds: 0.78,
        }),
        proof.drawSegment(adExtension, D, P, {
          durationSeconds: 0.78,
        }),
      ]);

      await revealProofPoint2D(proof, points.P, {
        durationSeconds: 0.32,
      });
    },
  },
];

const proof = new ProofStageController2D(scene, {
  stages,
  reset: resetScene,
  startVisibilityRatio: 0.15,
  nextButtonPosition: "bottom-right",
});

Object.assign(window, {
  parallelogramProofScene: {
    scene,
    proof,
    panZoom,
    points: { A, B, C, D, M, N, T, P },
    altitudeBToTN,
    altitudeCToAB,
    cBisectorHit,
  },
});

const destroy = (): void => {
  proof.destroy();
  panZoom.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
