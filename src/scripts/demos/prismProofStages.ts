import {
  HUES,
  OrbitController3D,
  ProofStageController3D,
  altitudeToLine3D,
  createMathScene3D,
  createTextLabel3D,
  lineDirection3D,
  lineIntersection3D,
  midpoint3D,
  pointOnLine3D,
  scale3D,
  add3D,
  type ProofStage3D,
} from "../math-graphics";
import {
  createDashedProofSegment3D,
  createProofAngle3D,
  createProofPoint3D,
  createProofPolygon3D,
  createProofSegment3D,
  revealProofAngle3D,
  revealProofLabel3D,
  revealProofPoint3D,
  revealProofPolygon3D,
} from "../math-graphics/animation/proofHelpers3D";

type Vec3Tuple = [number, number, number];

const canvas = document.querySelector<HTMLCanvasElement>(
  "#prism-proof-scene",
);

if (!canvas) {
  throw new Error("The prism-proof scene canvas could not be found.");
}

const scene = createMathScene3D(canvas, {
  cameraPosition: [-3.6, 7.2, -11.4],
  target: [2.0, 2.45, 2.0],
  fovDegrees: 30,
  background: null,
  maxPixelRatio: 2,
});

const initialCamera = scene.getCameraState();

const orbit = new OrbitController3D(scene, {
  target: [2.0, 2.45, 2.0],
  minDistance: 5.5,
  maxDistance: 26,
  enableRotate: true,
  enableZoom: true,
  rotationMode: "orbit",
});

/* -------------------------------------------------------------------------- */
/* Prism coordinates                                                           */
/* -------------------------------------------------------------------------- */

const SIDE = 4;
const HEIGHT = 4 * Math.sqrt(2);

const A: Vec3Tuple = [SIDE, 0, 0];
const B: Vec3Tuple = [0, 0, 0];
const C: Vec3Tuple = [0, 0, SIDE];
const D: Vec3Tuple = [SIDE, 0, SIDE];

const Aprime: Vec3Tuple = [SIDE, HEIGHT, 0];
const Bprime: Vec3Tuple = [0, HEIGHT, 0];
const Cprime: Vec3Tuple = [0, HEIGHT, SIDE];
const Dprime: Vec3Tuple = [SIDE, HEIGHT, SIDE];

const topCenter = lineIntersection3D(Aprime, Cprime, Bprime, Dprime);
const baseCenter = lineIntersection3D(A, C, B, D);
const bodyCenter = lineIntersection3D(A, Cprime, Dprime, B);

if (!topCenter || !baseCenter || !bodyCenter) {
  throw new Error("The prism construction lines should intersect.");
}

const Oprime = topCenter.point;
const O = baseCenter.point;
const M = bodyCenter.point;
const OdoublePrime = midpoint3D(O, Oprime);

const altitudeFromAprime = altitudeToLine3D(Aprime, D, B);
const altitudeFromCprime = altitudeToLine3D(Cprime, D, B);
const S = altitudeFromAprime.foot;

const directionAprimeS = lineDirection3D(Aprime, S);
const parallelThroughCScaleToBase = -Cprime[1] / directionAprimeS[1];
const parallelThroughCBaseIntersection = add3D(
  Cprime,
  scale3D(directionAprimeS, parallelThroughCScaleToBase),
);

/* -------------------------------------------------------------------------- */
/* Persistent proof objects                                                    */
/* -------------------------------------------------------------------------- */

const visibleEdges = {
  AB: createProofSegment3D({
    name: "edge-ab",
    color: HUES.cyan.light,
    width: 2.8,
  }),
  BC: createProofSegment3D({
    name: "edge-bc",
    color: HUES.cyan.light,
    width: 2.8,
  }),
  AAprime: createProofSegment3D({
    name: "edge-aa-prime",
    color: HUES.cyan.light,
    width: 2.8,
  }),
  BBprime: createProofSegment3D({
    name: "edge-bb-prime",
    color: HUES.cyan.light,
    width: 2.8,
  }),
  CCprime: createProofSegment3D({
    name: "edge-cc-prime",
    color: HUES.cyan.light,
    width: 2.8,
  }),
  BprimeCprime: createProofSegment3D({
    name: "edge-b-prime-c-prime",
    color: HUES.cyan.light,
    width: 2.8,
  }),
  AprimeBprime: createProofSegment3D({
    name: "edge-a-prime-b-prime",
    color: HUES.cyan.light,
    width: 2.8,
  }),
  AprimeDprime: createProofSegment3D({
    name: "edge-a-prime-d-prime",
    color: HUES.cyan.light,
    width: 2.8,
  }),
  DprimeCprime: createProofSegment3D({
    name: "edge-d-prime-c-prime",
    color: HUES.cyan.light,
    width: 2.8,
  }),
};

const hiddenEdges = {
  AD: createProofSegment3D({
    name: "edge-ad",
    color: HUES.cyan.light,
    width: 2.8,
  }),
  DC: createProofSegment3D({
    name: "edge-dc",
    color: HUES.cyan.light,
    width: 2.8,
  }),
  DB: createDashedProofSegment3D({
    name: "inner-diagonal-db",
    color: HUES.purple.light,
    width: 2.15,
  }),
  DDprime: createProofSegment3D({
    name: "edge-dd-prime",
    color: HUES.cyan.light,
    width: 2.8,
  }),
};

const stage2Segments = {
  AprimeCprime: createProofSegment3D({
    name: "diag-a-prime-c-prime",
    color: HUES.gold.light,
    width: 2.45,
  }),
  BprimeDprime: createProofSegment3D({
    name: "diag-b-prime-d-prime",
    color: HUES.gold.light,
    width: 2.45,
  }),
  AC: createDashedProofSegment3D({
    name: "diag-ac",
    color: HUES.gold.light,
    width: 2.2,
  }),
  OprimeO: createDashedProofSegment3D({
    name: "segment-o-prime-o",
    color: HUES.gold.soft,
    width: 2.2,
  }),
};

const stage3Segments = {
  ADprime: createProofSegment3D({
    name: "diag-a-d-prime",
    color: HUES.magenta.light,
    width: 2.5,
  }),
  DprimeB: createDashedProofSegment3D({
    name: "diag-d-prime-b",
    color: HUES.magenta.light,
    width: 2.2,
  }),
  ACprime: createDashedProofSegment3D({
    name: "diag-a-c-prime",
    color: HUES.mint.light,
    width: 2.2,
  }),
  BCprime: createProofSegment3D({
    name: "diag-b-c-prime",
    color: HUES.mint.light,
    width: 2.2,
  }),
};

const stage4Segments = {
  AprimeS: createProofSegment3D({
    name: "altitude-a-prime-to-db",
    color: HUES.blue.light,
    width: 2.5,
  }),
  CprimeS: createDashedProofSegment3D({
    name: "altitude-c-prime-to-db",
    color: HUES.blue.light,
    width: 2.25,
  }),
};

const stage5Segments = {
  throughCToBase: createProofSegment3D({
    name: "parallel-through-c-prime-to-base",
    color: HUES.mint.light,
    width: 2.45,
  }),
};

const anglesAtM = {
  AMDprime: createProofAngle3D({
    name: "angle-am-d-prime",
    center: M,
    firstArmPoint: A,
    secondArmPoint: Dprime,
    fill: HUES.cyan.base,
    fillOpacity: 0.2,
    outline: HUES.cyan.light,
  }),
  DprimeMCprime: createProofAngle3D({
    name: "angle-d-prime-m-c-prime",
    center: M,
    firstArmPoint: Dprime,
    secondArmPoint: Cprime,
    fill: HUES.gold.base,
    fillOpacity: 0.2,
    outline: HUES.gold.light,
  }),
  CprimeMB: createProofAngle3D({
    name: "angle-c-prime-m-b",
    center: M,
    firstArmPoint: Cprime,
    secondArmPoint: B,
    fill: HUES.magenta.base,
    fillOpacity: 0.2,
    outline: HUES.magenta.light,
  }),
  BMA: createProofAngle3D({
    name: "angle-b-m-a",
    center: M,
    firstArmPoint: B,
    secondArmPoint: A,
    fill: HUES.mint.base,
    fillOpacity: 0.2,
    outline: HUES.mint.light,
  }),
};

const rightAnglesAtS = {
  fromAprime: createProofAngle3D({
    name: "right-angle-a-prime-s-b",
    center: S,
    firstArmPoint: Aprime,
    secondArmPoint: B,
    radius: 0,
    shape: "right-angle",
    fill: HUES.blue.base,
    fillOpacity: 0.18,
    outline: HUES.blue.light,
    outlineOpacity: 0.95,
  }),
  fromCprime: createProofAngle3D({
    name: "right-angle-c-prime-s-d",
    center: S,
    firstArmPoint: Cprime,
    secondArmPoint: D,
    radius: 0,
    shape: "right-angle",
    fill: HUES.purple.base,
    fillOpacity: 0.16,
    outline: HUES.purple.light,
    outlineOpacity: 0.95,
  }),
};

const triangleCprimeBD = createProofPolygon3D({
  name: "triangle-c-prime-b-d",
  vertices: [Cprime, B, D],
  fill: HUES.magenta.base,
  fillOpacity: 0.2,
  outline: HUES.magenta.light,
  outlineOpacity: 0.55,
});

const points = {
  A: createProofPoint3D({
    name: "point-a",
    text: "A",
    position: A,
    offset: [-0.34, -0.22, 0],
  }),
  B: createProofPoint3D({
    name: "point-b",
    text: "B",
    position: B,
    offset: [0.2, -0.22, 0],
  }),
  C: createProofPoint3D({
    name: "point-c",
    text: "C",
    position: C,
    offset: [0.24, -0.05, 0.08],
  }),
  D: createProofPoint3D({
    name: "point-d",
    text: "D",
    position: D,
    offset: [-0.2, -0.02, 0.08],
  }),
  Aprime: createProofPoint3D({
    name: "point-a-prime",
    text: "A'",
    position: Aprime,
    offset: [-0.36, 0.16, 0],
  }),
  Bprime: createProofPoint3D({
    name: "point-b-prime",
    text: "B'",
    position: Bprime,
    offset: [0.18, 0.16, 0],
  }),
  Cprime: createProofPoint3D({
    name: "point-c-prime",
    text: "C'",
    position: Cprime,
    offset: [0.2, 0.16, 0.1],
  }),
  Dprime: createProofPoint3D({
    name: "point-d-prime",
    text: "D'",
    position: Dprime,
    offset: [-0.18, 0.16, 0.1],
  }),
  Oprime: createProofPoint3D({
    name: "point-o-prime",
    text: "O'",
    position: Oprime,
    offset: [0.18, 0.16, 0],
    fill: HUES.gold.base,
  }),
  O: createProofPoint3D({
    name: "point-o",
    text: "O",
    position: O,
    offset: [0.2, -0.2, 0],
    fill: HUES.gold.base,
  }),
  M: createProofPoint3D({
    name: "point-m",
    text: "M",
    position: M,
    offset: [0.2, 0.1, 0.08],
    fill: HUES.magenta.base,
  }),
};

const oDoublePrimeLabel = createTextLabel3D({
  name: "o-double-prime-label",
  text: "O''",
  position: [
    OdoublePrime[0] + 0.18,
    OdoublePrime[1] + 0.12,
    OdoublePrime[2] + 0.08,
  ],
  color: "rgba(255, 243, 214, 0.98)",
  fontSizePx: 14,
  fontWeight: 740,
  background: "rgba(35, 27, 16, 0.84)",
  border: "1px solid rgba(255, 212, 118, 0.26)",
  borderRadiusPx: 7,
  padding: "0.14rem 0.34rem",
});

const sLabel = createTextLabel3D({
  name: "s-label",
  text: "S",
  position: [
    S[0] + 0.22,
    S[1] - 0.22,
    S[2] + 0.04,
  ],
  color: "rgba(232, 247, 255, 0.98)",
  fontSizePx: 14,
  fontWeight: 740,
  background: "rgba(17, 20, 35, 0.84)",
  border: "1px solid rgba(112, 181, 255, 0.26)",
  borderRadiusPx: 7,
  padding: "0.14rem 0.34rem",
});

scene.add(
  ...Object.values(visibleEdges),
  ...Object.values(hiddenEdges),
  ...Object.values(stage2Segments),
  ...Object.values(stage3Segments),
  ...Object.values(stage4Segments),
  ...Object.values(stage5Segments),
  ...Object.values(anglesAtM),
  ...Object.values(rightAnglesAtS),
  triangleCprimeBD,
  ...Object.values(points).flatMap(({ marker, label }) => [marker, label]),
  oDoublePrimeLabel,
  sLabel,
);

/* -------------------------------------------------------------------------- */
/* Reset                                                                       */
/* -------------------------------------------------------------------------- */

const allSegments = [
  ...Object.values(visibleEdges),
  ...Object.values(hiddenEdges),
  ...Object.values(stage2Segments),
  ...Object.values(stage3Segments),
  ...Object.values(stage4Segments),
  ...Object.values(stage5Segments),
];

function resetScene(): void {
  scene.setCamera({
    position: initialCamera.position,
    target: initialCamera.target,
    fovDegrees: initialCamera.fovDegrees,
  });
  orbit.syncFromScene();

  for (const segment of allSegments) segment.hide();

  for (const angle of Object.values(anglesAtM)) {
    angle.hide().setRadius(0);
  }

  for (const angle of Object.values(rightAnglesAtS)) {
    angle.hide().setRadius(0);
  }

  triangleCprimeBD.hide().setFillOpacity(0);

  for (const point of Object.values(points)) {
    point.marker.hide().setRadius(0);
    point.label.hide().setOpacity(0);
  }

  oDoublePrimeLabel.hide().setOpacity(0);
  sLabel.hide().setOpacity(0);
}

/* -------------------------------------------------------------------------- */
/* Stages                                                                      */
/* -------------------------------------------------------------------------- */

const stages: ProofStage3D[] = [
  {
    title: "Initial prism configuration",
    description:
      "Draw the right prism ABCDA'B'C'D' with square base ABCD. All prism edges are shown as solid segments, while only genuine interior construction lines are dashed. You can drag to orbit and use the wheel to zoom in.",
    async run(proof) {
      await Promise.all([
        proof.drawSegment(visibleEdges.AB, A, B, { durationSeconds: 0.46 }),
        proof.drawSegment(hiddenEdges.AD, A, D, { durationSeconds: 0.46 }),
        proof.drawSegment(visibleEdges.AAprime, A, Aprime, { durationSeconds: 0.46 }),
        proof.drawSegment(visibleEdges.BBprime, B, Bprime, { durationSeconds: 0.46 }),
      ]);

      await Promise.all([
        proof.drawSegment(visibleEdges.BC, B, C, { durationSeconds: 0.42 }),
        proof.drawSegment(hiddenEdges.DC, D, C, { durationSeconds: 0.42 }),
        proof.drawSegment(hiddenEdges.DDprime, D, Dprime, { durationSeconds: 0.42 }),
        proof.drawSegment(visibleEdges.CCprime, C, Cprime, { durationSeconds: 0.42 }),
      ]);

      await Promise.all([
        proof.drawSegment(visibleEdges.AprimeBprime, Aprime, Bprime, { durationSeconds: 0.42 }),
        proof.drawSegment(visibleEdges.BprimeCprime, Bprime, Cprime, { durationSeconds: 0.42 }),
        proof.drawSegment(visibleEdges.AprimeDprime, Aprime, Dprime, { durationSeconds: 0.42 }),
        proof.drawSegment(visibleEdges.DprimeCprime, Dprime, Cprime, { durationSeconds: 0.42 }),
      ]);

      await proof.drawSegment(hiddenEdges.DB, D, B, { durationSeconds: 0.42 });

      await Promise.all([
        revealProofPoint3D(proof, points.A),
        revealProofPoint3D(proof, points.B),
        revealProofPoint3D(proof, points.C),
        revealProofPoint3D(proof, points.D),
        revealProofPoint3D(proof, points.Aprime),
        revealProofPoint3D(proof, points.Bprime),
        revealProofPoint3D(proof, points.Cprime),
        revealProofPoint3D(proof, points.Dprime),
      ]);
    },
  },
  {
    title: "Top and base diagonals; centers O', O and O''",
    description:
      "Draw the diagonals A'C' and B'D' of the top face, add the hidden base diagonal AC, mark the face centers O' and O, connect them with the interior segment O'O, and then label the midpoint O''.",
    async run(proof) {
      await Promise.all([
        proof.drawSegment(
          stage2Segments.AprimeCprime,
          Aprime,
          Cprime,
          { durationSeconds: 0.64 },
        ),
        proof.drawSegment(
          stage2Segments.BprimeDprime,
          Bprime,
          Dprime,
          { durationSeconds: 0.64 },
        ),
        proof.drawSegment(
          stage2Segments.AC,
          A,
          C,
          { durationSeconds: 0.64 },
        ),
      ]);

      await Promise.all([
        revealProofPoint3D(proof, points.Oprime, { durationSeconds: 0.28 }),
        revealProofPoint3D(proof, points.O, { durationSeconds: 0.28 }),
      ]);

      await proof.drawSegment(
        stage2Segments.OprimeO,
        Oprime,
        O,
        { durationSeconds: 0.56 },
      );

      await revealProofLabel3D(proof, oDoublePrimeLabel, {
        durationSeconds: 0.24,
      });
    },
  },
  {
    title: "Body diagonals and the four angles at M",
    description:
      "Add the dashed segment AD', then the body diagonals D'B and AC'. Their intersection is labeled M, and the four angles around that intersection are highlighted with distinct colors.",
    async run(proof) {
      oDoublePrimeLabel.hide().setOpacity(0);

      await Promise.all([
        proof.drawSegment(stage3Segments.ADprime, A, Dprime, {
          durationSeconds: 0.56,
        }),
        proof.drawSegment(stage3Segments.DprimeB, Dprime, B, {
          durationSeconds: 0.64,
        }),
        proof.drawSegment(stage3Segments.ACprime, A, Cprime, {
          durationSeconds: 0.64,
        }),
	proof.drawSegment(stage3Segments.BCprime, B, Cprime, {
          durationSeconds: 0.64,
        }),
      ]);

      await revealProofPoint3D(proof, points.M, {
        durationSeconds: 0.28,
      });

      await Promise.all([
        revealProofAngle3D(proof, anglesAtM.AMDprime, 0.62, {
          durationSeconds: 0.34,
        }),
        revealProofAngle3D(proof, anglesAtM.DprimeMCprime, 0.62, {
          durationSeconds: 0.34,
        }),
        revealProofAngle3D(proof, anglesAtM.CprimeMB, 0.62, {
          durationSeconds: 0.34,
        }),
        revealProofAngle3D(proof, anglesAtM.BMA, 0.62, {
          durationSeconds: 0.34,
        }),
      ]);
    },
  },
  {
    title: "Perpendiculars to DB and triangle C'BD",
    description:
      "Drop the perpendicular from A' to DB, then the perpendicular from C' to DB. The common foot is labeled S, square markers indicate the right angles, and triangle C'BD is highlighted.",
    async run(proof) {
      await proof.drawSegment(
        stage4Segments.AprimeS,
        Aprime,
        S,
        { durationSeconds: 0.62 },
      );

      await revealProofAngle3D(proof, rightAnglesAtS.fromAprime, 0.28, {
        durationSeconds: 0.28,
      });

      await proof.drawSegment(
        stage4Segments.CprimeS,
        Cprime,
        S,
        { durationSeconds: 0.62 },
      );

      await revealProofAngle3D(proof, rightAnglesAtS.fromCprime, 0.38, {
        durationSeconds: 0.28,
      });

      points.O.label.hide().setOpacity(0);
      await revealProofLabel3D(proof, sLabel, { durationSeconds: 0.22 });

      await revealProofPolygon3D(proof, triangleCprimeBD, 0.2, {
        durationSeconds: 0.42,
      });
    },
  },
  {
    title: "A line through C' parallel to A'S",
    description:
      "Finally, draw through C' the segment parallel to A'S, extending it only downward until it reaches the plane of the lower base. The camera widens automatically if needed so the entire construction remains visible.",
    async run(proof) {
      await proof.ensurePointsVisible(
        [A, B, C, D, Aprime, Cprime, parallelThroughCBaseIntersection],
        {
          durationSeconds: 0.72,
          paddingFactor: 1.22,
          minimumDistance: 7.5,
          maximumDistance: 26,
        },
      );

      await proof.drawSegment(
        stage5Segments.throughCToBase,
        Cprime,
        parallelThroughCBaseIntersection,
        { durationSeconds: 0.56 },
      );
    },
  },
];

const proof = new ProofStageController3D(scene, {
  stages,
  reset: resetScene,
  startVisibilityRatio: 0.15,
  nextButtonPosition: "bottom-right",
  syncCameraController: () => orbit.syncFromScene(),
});

Object.assign(window, {
  prismProofScene3D: {
    scene,
    orbit,
    proof,
    points: {
      A,
      B,
      C,
      D,
      Aprime,
      Bprime,
      Cprime,
      Dprime,
      Oprime,
      O,
      OdoublePrime,
      M,
      S,
    },
  },
});

const destroy = (): void => {
  proof.destroy();
  orbit.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
