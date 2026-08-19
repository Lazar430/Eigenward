import {
  HUES,
  PanZoomController2D,
  ProofStageController2D,
  altitudeToLine2D,
  angleBisectorRay2D,
  createAngleSector2D,
  createMathScene2D,
  createParametricShape2D,
  createRightAngleMarker2D,
  createSegment2D,
  createTextLabel2D,
  currentSceneView2D,
  lineIntersection2D,
  midpoint2D,
  minorAngleSector2D,
  rayLineIntersection2D,
  type AngleSector2D,
  type ProofStage2D,
  type Segment2D,
  type TextLabel2D,
  type Vec2Tuple,
} from "../math-graphics";

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
type LabelOffset = readonly [number, number];

interface VisualPoint2D {
  marker: ReturnType<typeof createParametricShape2D>;
  label: TextLabel2D;
}

const A: MutablePoint = [-4.3, -2.05];
const B: MutablePoint = [2.1, -2.05];
const D: MutablePoint = [-1.55, 2.05];

/*
  C is derived rather than guessed: AB and DC share one displacement, AD and BC
  share the other, so ABCD remains a parallelogram if A/B/D are edited.
*/
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
/* Visual helpers                                                             */
/* -------------------------------------------------------------------------- */

const TAU = Math.PI * 2;
const POINT_RADIUS = 0.105;

function unitCircle(parameter: number): Vec2Tuple {
  return [Math.cos(parameter), Math.sin(parameter)];
}

function createProofSegment(
  name: string,
  color: string,
  width = 2.7,
  opacity = 0.96,
): Segment2D {
  return createSegment2D({
    name,
    start: [0, 0],
    end: [0, 0],
    style: {
      color,
      width,
      opacity,
    },
  });
}

function createDashedProofSegment(
  name: string,
  color: string,
  width = 2.2,
  opacity = 0.9,
): Segment2D {
  return createSegment2D({
    name,
    start: [0, 0],
    end: [0, 0],
    style: {
      color,
      width,
      opacity,
      dashed: true,
      dashSize: 0.2,
      gapSize: 0.13,
    },
  });
}

function createLabeledPoint(
  name: string,
  text: string,
  position: Vec2Tuple,
  offset: LabelOffset,
  fill = HUES.cyan.base,
): VisualPoint2D {
  const marker = createParametricShape2D({
    name: `${name}:marker`,
    curve: unitCircle,
    domain: [0, TAU],
    segments: 72,
    style: {
      outline: HUES.purple.soft,
      outlineWidth: 1.6,
      outlineOpacity: 0.95,
      fill,
      fillOpacity: 0.98,
    },
  })
    .resizeTo(POINT_RADIUS)
    .moveTo(position[0], position[1]);

  marker.position.z = 0.08;

  const label = createTextLabel2D({
    name: `${name}:label`,
    text,
    position: [position[0] + offset[0], position[1] + offset[1]],
    anchor: [0.5, 0.5],
    color: "rgba(245, 242, 255, 0.98)",
    fontSizePx: 15,
    fontWeight: 780,
    background: "rgba(18, 14, 31, 0.7)",
    border: "1px solid rgba(198, 180, 255, 0.12)",
    borderRadiusPx: 7,
    padding: "0.1rem 0.3rem",
  });

  return { marker, label };
}

function createProofAngle(
  name: string,
  fill: string,
  outline: string,
): AngleSector2D {
  return createAngleSector2D({
    name,
    center: [0, 0],
    startAngle: 0,
    endAngle: 0,
    direction: "counterclockwise",
    radius: 0,
    fill,
    fillOpacity: 0.24,
    outline,
    outlineOpacity: 0.92,
  });
}

async function revealPoint(
  proof: ProofStageController2D,
  point: VisualPoint2D,
  durationSeconds = 0.3,
): Promise<void> {
  point.marker.show().resizeTo(0);
  point.label.show().setOpacity(0);

  await proof.animate(durationSeconds, (progress) => {
    point.marker.resizeTo(POINT_RADIUS * progress);
    point.label.setOpacity(progress);
  });
}

/* -------------------------------------------------------------------------- */
/* Persistent objects                                                         */
/* -------------------------------------------------------------------------- */

const edges = {
  AB: createProofSegment("edge-ab", HUES.cyan.light),
  BC: createProofSegment("edge-bc", HUES.cyan.light),
  CD: createProofSegment("edge-cd", HUES.cyan.light),
  DA: createProofSegment("edge-da", HUES.cyan.light),
};

const auxiliaries = {
  AN: createProofSegment("aux-an", HUES.gold.light, 2.35, 0.92),
  BN: createProofSegment("aux-bn", HUES.gold.light, 2.35, 0.92),
  TN: createProofSegment("aux-tn", HUES.gold.light, 2.35, 0.92),
};

const perpendicularBToTN = createProofSegment(
  "perpendicular-b-to-tn",
  HUES.magenta.light,
  2.45,
);

const cAngleBisector = createProofSegment(
  "angle-bisector-c",
  HUES.mint.light,
  2.45,
);

const abExtension = createDashedProofSegment(
  "ab-dotted-extension",
  HUES.purple.light,
);

const altitudeFromC = createProofSegment(
  "altitude-from-c",
  HUES.purple.light,
  2.45,
);

const bnExtension = createProofSegment(
  "bn-extension",
  HUES.blue.light,
  2.45,
);

const adExtension = createProofSegment(
  "ad-extension",
  HUES.blue.light,
  2.45,
);

const angleBNT = createProofAngle(
  "angle-bnt",
  HUES.cyan.base,
  HUES.cyan.light,
);
const angleADC = createProofAngle(
  "angle-adc",
  HUES.gold.base,
  HUES.gold.light,
);
const angleDCB = createProofAngle(
  "angle-dcb",
  HUES.magenta.base,
  HUES.magenta.light,
);

const bToTnRightAngle = createRightAngleMarker2D({
  name: "right-angle-b-to-tn",
  vertex: altitudeBToTN.foot,
  firstArmPoint: T,
  secondArmPoint: B,
  size: 0.27,
  fill: HUES.magenta.base,
  fillOpacity: 0.17,
  outline: HUES.magenta.light,
  outlineOpacity: 0.95,
});

const cAltitudeRightAngle = createRightAngleMarker2D({
  name: "right-angle-c-to-ab",
  vertex: altitudeCToAB.foot,
  firstArmPoint: B,
  secondArmPoint: C,
  size: 0.27,
  fill: HUES.purple.base,
  fillOpacity: 0.17,
  outline: HUES.purple.light,
  outlineOpacity: 0.95,
});

const points = {
  A: createLabeledPoint("point-a", "A", A, [-0.28, -0.18]),
  B: createLabeledPoint("point-b", "B", B, [0.22, -0.18]),
  C: createLabeledPoint("point-c", "C", C, [0.23, 0.18]),
  D: createLabeledPoint("point-d", "D", D, [-0.24, 0.18]),
  M: createLabeledPoint("point-m", "M", M, [0.22, 0.02], HUES.gold.base),
  N: createLabeledPoint("point-n", "N", N, [0, 0.27], HUES.gold.base),
  T: createLabeledPoint("point-t", "T", T, [0, -0.27], HUES.gold.base),
  P: createLabeledPoint("point-p", "P", P, [0.22, 0.12], HUES.blue.base),
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
/* Exact derived geometry                                                     */
/* -------------------------------------------------------------------------- */

edges.AB.setEndpoints(A, B);
edges.BC.setEndpoints(B, C);
edges.CD.setEndpoints(C, D);
edges.DA.setEndpoints(D, A);

auxiliaries.AN.setEndpoints(A, N);
auxiliaries.BN.setEndpoints(B, N);
auxiliaries.TN.setEndpoints(T, N);

perpendicularBToTN.setEndpoints(B, altitudeBToTN.foot);
cAngleBisector.setEndpoints(C, cBisectorHit.point);
abExtension.setEndpoints(B, altitudeCToAB.foot);
altitudeFromC.setEndpoints(C, altitudeCToAB.foot);
bnExtension.setEndpoints(N, P);
adExtension.setEndpoints(D, P);

const bnt = minorAngleSector2D(N, B, T);
angleBNT
  .setCenter(bnt.center)
  .setAngles(bnt.startAngle, bnt.endAngle)
  .setDirection(bnt.direction);

const adc = minorAngleSector2D(D, A, C);
angleADC
  .setCenter(adc.center)
  .setAngles(adc.startAngle, adc.endAngle)
  .setDirection(adc.direction);

const dcb = minorAngleSector2D(C, D, B);
angleDCB
  .setCenter(dcb.center)
  .setAngles(dcb.startAngle, dcb.endAngle)
  .setDirection(dcb.direction);

/* -------------------------------------------------------------------------- */
/* Reset + stages                                                             */
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

  bToTnRightAngle.hide().setReveal(0);
  cAltitudeRightAngle.hide().setReveal(0);

  for (const point of Object.values(points)) {
    point.marker.hide().resizeTo(0);
    point.label.hide().setOpacity(0);
  }
}

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
        revealPoint(proof, points.A),
        revealPoint(proof, points.B),
        revealPoint(proof, points.C),
        revealPoint(proof, points.D),
      ]);

      await Promise.all([
        revealPoint(proof, points.M, 0.26),
        revealPoint(proof, points.N, 0.26),
        revealPoint(proof, points.T, 0.26),
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

      await proof.revealRightAngle(bToTnRightAngle, {
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
        proof.revealAngleSector(angleBNT, 0.6, {
          durationSeconds: 0.45,
        }),
        proof.revealAngleSector(angleADC, 0.56, {
          durationSeconds: 0.45,
        }),
        proof.revealAngleSector(angleDCB, 0.6, {
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

      await proof.revealRightAngle(cAltitudeRightAngle, {
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

      await revealPoint(proof, points.P, 0.32);
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
