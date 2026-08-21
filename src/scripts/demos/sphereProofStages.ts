import {
  HUES,
  OrbitController3D,
  ProofStageController3D,
  createLightingRig3D,
  createMathScene3D,
  createSphere3D,
  sampleGreatCircle3D,
  sampleGreatCircleArc3D,
  sampleSphericalParallel3D,
  spherePointFromLatitudeLongitude3D,
  pointOnMinorGreatCircleArc3D,
  sphericalAltitudeFoot3D,
  sphericalOrthocenter3D,
  sphericalAngleBisector3D,
  type ProofStage3D,
} from "../math-graphics";
import {
  createDashedProofPolyline3D,
  createDashedProofSegment3D,
  createProofAngle3D,
  createProofPoint3D,
  createProofPolygon3D,
  createProofPolyline3D,
  createProofSegment3D,
  createProofSphericalAngle3D,
  createProofSphericalLune3D,
  createProofSphericalRightAngle3D,
  createProofSphericalWedge3D,
  revealProofAngle3D,
  revealProofPoint3D,
  revealProofPolygon3D,
  revealProofPolyline3D,
  revealProofSphericalAngle3D,
  revealProofSphericalLune3D,
  revealProofSphericalWedge3D,
} from "../math-graphics/animation/proofHelpers3D";

type Vec3Tuple = [number, number, number];

const canvas = document.querySelector<HTMLCanvasElement>(
  "#sphere-proof-scene",
);

if (!canvas) {
  throw new Error("The sphere-proof scene canvas could not be found.");
}

/* -------------------------------------------------------------------------- */
/* Scene                                                                       */
/* -------------------------------------------------------------------------- */

const O: Vec3Tuple = [0, 0, 0];
const R = 2.55;
const SURFACE_OFFSET = 0.028;
const SPHERE_OPACITY = 0.32;

const scene = createMathScene3D(canvas, {
  cameraPosition: [5.8, 3.45, 7.6],
  target: [0, 0.15, 0],
  fovDegrees: 31,
  background: null,
  maxPixelRatio: 2,
});

const initialCamera = scene.getCameraState();

const orbit = new OrbitController3D(scene, {
  target: initialCamera.target,
  minDistance: 5.2,
  maxDistance: 18,
  enableRotate: true,
  enableZoom: true,
  rotationMode: "orbit",
});

const lights = createLightingRig3D({
  ambientIntensity: 0.34,
  hemisphereIntensity: 0.82,
  keyIntensity: 2.15,
  keyPosition: [5.5, 7.2, 6.2],
  fillIntensity: 0.68,
  fillPosition: [-4.8, 2.5, -4.6],
});

/*
 * Smooth sphere only: no wireframe.
 *
 * The translucency is intentional because stages 2 and 4 contain planar/interior
 * constructions that should remain readable through the surface.
 */
const sphere = createSphere3D({
  radius: R,
  widthSegments: 96,
  heightSegments: 56,
  name: "spherical-proof-sphere",
  style: {
    color: HUES.cyan.base,
    opacity: SPHERE_OPACITY,
    roughness: 0.3,
    metalness: 0.025,
    wireframe: false,
  },
});

scene.add(lights, sphere);

/* -------------------------------------------------------------------------- */
/* Stage 2: great circle + parallel                                            */
/* -------------------------------------------------------------------------- */

const greatCircleForLine = sampleGreatCircle3D(
  O,
  R,
  [0, 1, 0],
  {
    segments: 180,
    surfaceOffset: SURFACE_OFFSET,
  },
);

const greatCircleForDisk = sampleGreatCircle3D(
  O,
  R,
  [0, 1, 0],
  {
    segments: 180,
  },
);

const PARALLEL_HEIGHT = 0.94;

const parallelForLine = sampleSphericalParallel3D(
  O,
  R,
  [0, 1, 0],
  PARALLEL_HEIGHT,
  {
    segments: 160,
    surfaceOffset: SURFACE_OFFSET,
  },
);

const parallelForDisk = sampleSphericalParallel3D(
  O,
  R,
  [0, 1, 0],
  PARALLEL_HEIGHT,
  {
    segments: 160,
  },
);

const K = parallelForDisk.center;

const equatorCurve = createDashedProofPolyline3D({
  name: "sphere-great-circle",
  points: greatCircleForLine.points,
  color: HUES.gold.light,
  width: 2.15,
  opacity: 0.94,
  dashSize: 0.19,
  gapSize: 0.12,
});

const parallelCurve = createProofPolyline3D({
  name: "sphere-upper-parallel",
  points: parallelForLine.points,
  color: HUES.magenta.light,
  width: 2.35,
  opacity: 0.96,
});

const equatorDisk = createProofPolygon3D({
  name: "great-circle-disk-highlight",
  vertices: greatCircleForDisk.points.slice(0, -1),
  fill: HUES.gold.base,
  fillOpacity: 0.13,
  outline: null,
  outlineOpacity: 0,
});

const parallelDisk = createProofPolygon3D({
  name: "parallel-disk-highlight",
  vertices: parallelForDisk.points.slice(0, -1),
  fill: HUES.magenta.base,
  fillOpacity: 0.16,
  outline: null,
  outlineOpacity: 0,
});

const pointO = createProofPoint3D({
  name: "sphere-center-o",
  text: "O",
  position: O,
  offset: [0.16, 0.13, 0.08],
  radius: 0.072,
  fill: HUES.cyan.light,
});

const pointK = createProofPoint3D({
  name: "parallel-center-k",
  text: "K",
  position: K,
  offset: [0.17, 0.13, 0.08],
  radius: 0.066,
  fill: HUES.magenta.light,
});

/* -------------------------------------------------------------------------- */
/* Stage 3: spherical triangles                                                */
/* -------------------------------------------------------------------------- */

/*
 * Both triangles live mainly on the camera-facing hemisphere so their
 * constructions remain readable in the initial view.
 *
 * spherePointFromLatitudeLongitude3D(latitude, longitude, center, radius)
 */
const T1 = {
  A: spherePointFromLatitudeLongitude3D(0.63, 0.56, O, R) as Vec3Tuple,
  B: spherePointFromLatitudeLongitude3D(0.08, 0.30, O, R) as Vec3Tuple,
  C: spherePointFromLatitudeLongitude3D(-0.42, 0.92, O, R) as Vec3Tuple,
};

const T2 = {
  P: spherePointFromLatitudeLongitude3D(0.58, 2.10, O, R) as Vec3Tuple,
  Q: spherePointFromLatitudeLongitude3D(0.06, 2.53, O, R) as Vec3Tuple,
  R: spherePointFromLatitudeLongitude3D(-0.45, 1.82, O, R) as Vec3Tuple,
};

function geodesic(
  name: string,
  start: Vec3Tuple,
  end: Vec3Tuple,
  color: string,
  dashed = false,
  arc: "minor" | "major" = "minor",
) {
  const points = sampleGreatCircleArc3D(
    start,
    end,
    {
      sphereCenter: O,
      sphereRadius: R,
      segments: 80,
      arc,
      surfaceOffset: SURFACE_OFFSET,
    },
  );

  return dashed
    ? createDashedProofPolyline3D({
        name,
        points,
        color,
        width: 2.0,
        opacity: 0.94,
        dashSize: 0.17,
        gapSize: 0.1,
      })
    : createProofPolyline3D({
        name,
        points,
        color,
        width: 2.35,
        opacity: 0.97,
      });
}

/**
 * Draw the shortest connected portion of one altitude great circle containing
 * the vertex, its perpendicular foot, and the chosen orthocenter.
 *
 * Usually one of the three points lies on the minor arc between the other two.
 * The final branch handles the less common configuration where the required
 * connected portion is a major arc.
 */
function extendedAltitudeGeodesic(
  name: string,
  vertex: Vec3Tuple,
  foot: Vec3Tuple,
  orthocenter: Vec3Tuple,
) {
  if (pointOnMinorGreatCircleArc3D(foot, vertex, orthocenter, O)) {
    return geodesic(name, vertex, orthocenter, HUES.gold.light, true);
  }

  if (pointOnMinorGreatCircleArc3D(vertex, foot, orthocenter, O)) {
    return geodesic(name, foot, orthocenter, HUES.gold.light, true);
  }

  if (pointOnMinorGreatCircleArc3D(orthocenter, vertex, foot, O)) {
    return geodesic(name, vertex, foot, HUES.gold.light, true);
  }

  const angularDistance = (first: Vec3Tuple, second: Vec3Tuple): number => {
    const ax = first[0] - O[0];
    const ay = first[1] - O[1];
    const az = first[2] - O[2];
    const bx = second[0] - O[0];
    const by = second[1] - O[1];
    const bz = second[2] - O[2];
    const aLength = Math.hypot(ax, ay, az);
    const bLength = Math.hypot(bx, by, bz);
    const cosine = (ax * bx + ay * by + az * bz) / (aLength * bLength);
    return Math.acos(Math.min(1, Math.max(-1, cosine)));
  };

  const pairs = [
    [vertex, foot] as const,
    [vertex, orthocenter] as const,
    [foot, orthocenter] as const,
  ];
  let endpoints = pairs[0];
  let largestMinorSeparation = angularDistance(...endpoints);

  for (const pair of pairs.slice(1)) {
    const separation = angularDistance(...pair);
    if (separation > largestMinorSeparation) {
      endpoints = pair;
      largestMinorSeparation = separation;
    }
  }

  return geodesic(
    name,
    endpoints[0],
    endpoints[1],
    HUES.gold.light,
    true,
    "major",
  );
}

const triangle1Edges = {
  AB: geodesic("triangle-1-ab", T1.A, T1.B, HUES.cyan.light),
  BC: geodesic("triangle-1-bc", T1.B, T1.C, HUES.cyan.light),
  CA: geodesic("triangle-1-ca", T1.C, T1.A, HUES.cyan.light),
};

const triangle2Edges = {
  PQ: geodesic("triangle-2-pq", T2.P, T2.Q, HUES.magenta.light),
  QR: geodesic("triangle-2-qr", T2.Q, T2.R, HUES.magenta.light),
  RP: geodesic("triangle-2-rp", T2.R, T2.P, HUES.magenta.light),
};

const triangle1Points = {
  A: createProofPoint3D({
    name: "triangle-1-a",
    text: "A",
    position: T1.A,
    offset: [0.14, 0.16, 0.09],
    radius: 0.058,
    fill: HUES.cyan.light,
  }),
  B: createProofPoint3D({
    name: "triangle-1-b",
    text: "B",
    position: T1.B,
    offset: [0.15, -0.12, 0.08],
    radius: 0.058,
    fill: HUES.cyan.light,
  }),
  C: createProofPoint3D({
    name: "triangle-1-c",
    text: "C",
    position: T1.C,
    offset: [0.1, -0.16, 0.1],
    radius: 0.058,
    fill: HUES.cyan.light,
  }),
};

const triangle2Points = {
  P: createProofPoint3D({
    name: "triangle-2-p",
    text: "P",
    position: T2.P,
    offset: [-0.18, 0.16, 0.08],
    radius: 0.058,
    fill: HUES.magenta.light,
  }),
  Q: createProofPoint3D({
    name: "triangle-2-q",
    text: "Q",
    position: T2.Q,
    offset: [-0.18, -0.08, 0.08],
    radius: 0.058,
    fill: HUES.magenta.light,
  }),
  R: createProofPoint3D({
    name: "triangle-2-r",
    text: "R",
    position: T2.R,
    offset: [-0.16, -0.16, 0.08],
    radius: 0.058,
    fill: HUES.magenta.light,
  }),
};

/* Spherical altitudes of triangle ABC. */
const altitudeAConstruction = sphericalAltitudeFoot3D(
  T1.A,
  T1.B,
  T1.C,
  O,
  R,
);
const altitudeBConstruction = sphericalAltitudeFoot3D(
  T1.B,
  T1.C,
  T1.A,
  O,
  R,
);
const altitudeCConstruction = sphericalAltitudeFoot3D(
  T1.C,
  T1.A,
  T1.B,
  O,
  R,
);

const orthocenterConstruction = sphericalOrthocenter3D(
  T1.A,
  T1.B,
  T1.C,
  O,
  R,
);
const H = orthocenterConstruction.point;

const triangle1Altitudes = {
  A: extendedAltitudeGeodesic(
    "triangle-1-altitude-a",
    T1.A,
    altitudeAConstruction.foot,
    H,
  ),
  B: extendedAltitudeGeodesic(
    "triangle-1-altitude-b",
    T1.B,
    altitudeBConstruction.foot,
    H,
  ),
  C: extendedAltitudeGeodesic(
    "triangle-1-altitude-c",
    T1.C,
    altitudeCConstruction.foot,
    H,
  ),
};

const triangle1Orthocenter = createProofPoint3D({
  name: "triangle-1-orthocenter",
  text: "H",
  position: H,
  offset: [0.15, 0.14, 0.1],
  radius: 0.062,
  fill: HUES.gold.light,
});

/*
 * The square markers live in the tangent plane of the sphere at each altitude
 * foot. The supplied arm points only determine the two intrinsic great-circle
 * tangent directions; the helper converts them to a conventional 3D marker.
 */
const triangle1RightAngles = {
  A: createProofSphericalRightAngle3D({
    name: "triangle-1-right-angle-a",
    sphereCenter: O,
    vertex: altitudeAConstruction.foot,
    firstArmPoint: T1.B,
    secondArmPoint: T1.A,
    radius: 0.17,
    surfaceOffset: 0.035,
    fill: HUES.gold.base,
    fillOpacity: 0.16,
    outline: HUES.gold.light,
    outlineOpacity: 0.98,
  }),
  B: createProofSphericalRightAngle3D({
    name: "triangle-1-right-angle-b",
    sphereCenter: O,
    vertex: altitudeBConstruction.foot,
    firstArmPoint: T1.C,
    secondArmPoint: T1.B,
    radius: 0.17,
    surfaceOffset: 0.035,
    fill: HUES.gold.base,
    fillOpacity: 0.16,
    outline: HUES.gold.light,
    outlineOpacity: 0.98,
  }),
  C: createProofSphericalRightAngle3D({
    name: "triangle-1-right-angle-c",
    sphereCenter: O,
    vertex: altitudeCConstruction.foot,
    firstArmPoint: T1.A,
    secondArmPoint: T1.C,
    radius: 0.17,
    surfaceOffset: 0.035,
    fill: HUES.gold.base,
    fillOpacity: 0.16,
    outline: HUES.gold.light,
    outlineOpacity: 0.98,
  }),
};

/*
 * For this particular spherical triangle, the feet of the altitudes from A and
 * C lie on extensions of BC and AB respectively. The B-altitude lands on AC
 * itself. These short dashed cyan geodesic extensions make the construction
 * explicit instead of leaving the gold altitude apparently floating outside
 * the triangle.
 */
const triangle1SideExtensions = {
  BCpastB: geodesic(
    "triangle-1-side-bc-extension-past-b",
    T1.B,
    altitudeAConstruction.foot,
    HUES.cyan.soft,
    true,
  ),
  ABpastB: geodesic(
    "triangle-1-side-ab-extension-past-b",
    T1.B,
    altitudeCConstruction.foot,
    HUES.cyan.soft,
    true,
  ),
};

/* Internal spherical angle bisectors of triangle PQR. */
const bisectorPConstruction = sphericalAngleBisector3D(
  T2.P,
  T2.Q,
  T2.R,
  O,
  R,
);
const bisectorQConstruction = sphericalAngleBisector3D(
  T2.Q,
  T2.R,
  T2.P,
  O,
  R,
);
const bisectorRConstruction = sphericalAngleBisector3D(
  T2.R,
  T2.P,
  T2.Q,
  O,
  R,
);

const triangle2Bisectors = {
  P: geodesic(
    "triangle-2-bisector-p",
    T2.P,
    bisectorPConstruction.target,
    HUES.purple.light,
    true,
  ),
  Q: geodesic(
    "triangle-2-bisector-q",
    T2.Q,
    bisectorQConstruction.target,
    HUES.purple.light,
    true,
  ),
  R: geodesic(
    "triangle-2-bisector-r",
    T2.R,
    bisectorRConstruction.target,
    HUES.purple.light,
    true,
  ),
};

/*
 * These are genuinely curved spherical angle patches. They use the real API:
 * sphereCenter / vertex / firstArmPoint / secondArmPoint.
 */
const triangle2Angles = {
  P: createProofSphericalAngle3D({
    name: "spherical-angle-p",
    sphereCenter: O,
    sphereRadius: R,
    vertex: T2.P,
    firstArmPoint: T2.Q,
    secondArmPoint: T2.R,
    geodesicRadiusRadians: 0,
    surfaceOffset: 0.04,
    fill: HUES.cyan.base,
    fillOpacity: 0.28,
    outline: HUES.cyan.light,
    outlineOpacity: 0.9,
  }),
  Q: createProofSphericalAngle3D({
    name: "spherical-angle-q",
    sphereCenter: O,
    sphereRadius: R,
    vertex: T2.Q,
    firstArmPoint: T2.R,
    secondArmPoint: T2.P,
    geodesicRadiusRadians: 0,
    surfaceOffset: 0.04,
    fill: HUES.gold.base,
    fillOpacity: 0.28,
    outline: HUES.gold.light,
    outlineOpacity: 0.9,
  }),
  R: createProofSphericalAngle3D({
    name: "spherical-angle-r",
    sphereCenter: O,
    sphereRadius: R,
    vertex: T2.R,
    firstArmPoint: T2.P,
    secondArmPoint: T2.Q,
    geodesicRadiusRadians: 0,
    surfaceOffset: 0.04,
    fill: HUES.mint.base,
    fillOpacity: 0.28,
    outline: HUES.mint.light,
    outlineOpacity: 0.9,
  }),
};

/* -------------------------------------------------------------------------- */
/* Stage 5: spherical lune + associated solid wedge                          */
/* -------------------------------------------------------------------------- */

/*
 * A lune is bounded by two great-circle semicircles with the same antipodal
 * endpoints. Here the common poles are the north/south points of the sphere
 * and the two equatorial points fix the bounding meridians.
 */
const lunePole: Vec3Tuple = [0, R, 0];
const luneFirstBoundaryPoint = spherePointFromLatitudeLongitude3D(
  0,
  -0.12,
  O,
  R,
) as Vec3Tuple;
const luneSecondBoundaryPoint = spherePointFromLatitudeLongitude3D(
  0,
  0.82,
  O,
  R,
) as Vec3Tuple;

const sphereWedge = createProofSphericalWedge3D({
  name: "spherical-wedge-volume",
  sphereCenter: O,
  sphereRadius: R,
  pole: lunePole,
  firstBoundaryPoint: luneFirstBoundaryPoint,
  secondBoundaryPoint: luneSecondBoundaryPoint,
  revealProgress: 0,
  surfaceOffset: -0.035,
  fill: HUES.purple.base,
  fillOpacity: 0.18,
});

const sphereLune = createProofSphericalLune3D({
  name: "spherical-lune",
  sphereCenter: O,
  sphereRadius: R,
  pole: lunePole,
  firstBoundaryPoint: luneFirstBoundaryPoint,
  secondBoundaryPoint: luneSecondBoundaryPoint,
  revealProgress: 0,
  surfaceOffset: 0.052,
  fill: HUES.mint.base,
  fillOpacity: 0.34,
  outline: HUES.mint.light,
  outlineOpacity: 0.98,
  outlineWidth: 2.15,
});

/* -------------------------------------------------------------------------- */
/* Stage 4: circle centers + radius construction                               */
/* -------------------------------------------------------------------------- */

const U = spherePointFromLatitudeLongitude3D(
  Math.asin(PARALLEL_HEIGHT / R),
  0.93,
  O,
  R,
) as Vec3Tuple;

const pointU = createProofPoint3D({
  name: "parallel-point-u",
  text: "U",
  position: U,
  offset: [0.16, 0.13, 0.08],
  radius: 0.06,
  fill: HUES.gold.light,
});

const centerConnection = createDashedProofSegment3D({
  name: "center-connection-ok",
  color: HUES.cyan.light,
  width: 2.2,
  opacity: 0.94,
});

const sphereRadiusToU = createDashedProofSegment3D({
  name: "sphere-radius-ou",
  color: HUES.gold.light,
  width: 2.2,
  opacity: 0.94,
});

/*
 * KU is the radius of the upper parallel. It makes the second resulting angle
 * geometrically explicit: OK is perpendicular to the parallel's plane.
 */
const parallelRadiusKU = createProofSegment3D({
  name: "parallel-radius-ku",
  color: HUES.magenta.light,
  width: 2.15,
  opacity: 0.9,
});

const angleKOU = createProofAngle3D({
  name: "angle-kou",
  center: O,
  firstArmPoint: K,
  secondArmPoint: U,
  radius: 0,
  fill: HUES.gold.base,
  fillOpacity: 0.2,
  outline: HUES.gold.light,
  outlineOpacity: 0.92,
});

const rightAngleOKU = createProofAngle3D({
  name: "right-angle-oku",
  center: K,
  firstArmPoint: O,
  secondArmPoint: U,
  radius: 0,
  shape: "right-angle",
  fill: HUES.blue.base,
  fillOpacity: 0.18,
  outline: HUES.blue.light,
  outlineOpacity: 0.95,
});

/* -------------------------------------------------------------------------- */
/* Add persistent objects                                                      */
/* -------------------------------------------------------------------------- */

scene.add(
  equatorDisk,
  parallelDisk,
  equatorCurve,
  parallelCurve,
  pointO.marker,
  pointO.label,
  pointK.marker,
  pointK.label,

  ...Object.values(triangle1Edges),
  ...Object.values(triangle2Edges),
  ...Object.values(triangle1Points).flatMap(({ marker, label }) => [
    marker,
    label,
  ]),
  ...Object.values(triangle2Points).flatMap(({ marker, label }) => [
    marker,
    label,
  ]),
  ...Object.values(triangle1Altitudes),
  ...Object.values(triangle1RightAngles),
  triangle1Orthocenter.marker,
  triangle1Orthocenter.label,
  ...Object.values(triangle1SideExtensions),
  ...Object.values(triangle2Bisectors),
  ...Object.values(triangle2Angles),
  sphereWedge,
  sphereLune,

  centerConnection,
  sphereRadiusToU,
  parallelRadiusKU,
  pointU.marker,
  pointU.label,
  angleKOU,
  rightAngleOKU,
);

/* -------------------------------------------------------------------------- */
/* Reset                                                                       */
/* -------------------------------------------------------------------------- */

const allPolylines = [
  equatorCurve,
  parallelCurve,
  ...Object.values(triangle1Edges),
  ...Object.values(triangle2Edges),
  ...Object.values(triangle1Altitudes),
  ...Object.values(triangle1SideExtensions),
  ...Object.values(triangle2Bisectors),
];

const allSegments = [
  centerConnection,
  sphereRadiusToU,
  parallelRadiusKU,
];

const allProofPoints = [
  pointO,
  pointK,
  pointU,
  triangle1Orthocenter,
  ...Object.values(triangle1Points),
  ...Object.values(triangle2Points),
];

function resetScene(): void {
  scene.setCamera({
    position: initialCamera.position,
    target: initialCamera.target,
    fovDegrees: initialCamera.fovDegrees,
  });
  orbit.syncFromScene();

  sphere.show().setOpacity(0);

  for (const polyline of allPolylines) {
    polyline.hide().setRevealProgress(0);
  }

  for (const segment of allSegments) {
    segment.hide();
  }

  equatorDisk.hide().setFillOpacity(0);
  parallelDisk.hide().setFillOpacity(0);

  for (const point of allProofPoints) {
    point.marker.hide().setRadius(0);
    point.label.hide().setOpacity(0);
  }

  for (const angle of Object.values(triangle2Angles)) {
    angle.hide().setGeodesicRadiusRadians(0);
  }

  for (const angle of Object.values(triangle1RightAngles)) {
    angle.hide().setRadius(0);
  }

  sphereWedge.hide().setRevealProgress(0);
  sphereLune.hide().setRevealProgress(0);

  angleKOU.hide().setRadius(0);
  rightAngleOKU.hide().setRadius(0);
}

/* -------------------------------------------------------------------------- */
/* Stages                                                                      */
/* -------------------------------------------------------------------------- */

const stages: ProofStage3D[] = [
  {
    title: "Sphere",
    description:
      "Begin with the sphere by itself. Drag to orbit around it and use the wheel to zoom.",
    async run(proof) {
      sphere.show().setOpacity(0);

      await proof.animate(0.62, (progress) => {
        sphere.setOpacity(SPHERE_OPACITY * progress);
      });
    },
  },

  {
    title: "Great circle and upper parallel",
    description:
      "Mark the sphere center O. Draw a dotted great circle, then a solid parallel above it. Highlight the planar circular regions and mark the upper circle's center K.",
    async run(proof) {
      await revealProofPoint3D(proof, pointO, {
        durationSeconds: 0.28,
      });

      await Promise.all([
        revealProofPolyline3D(proof, equatorCurve, {
          durationSeconds: 0.8,
        }),
        revealProofPolygon3D(proof, equatorDisk, 0.13, {
          durationSeconds: 0.56,
        }),
      ]);

      await Promise.all([
        revealProofPolyline3D(proof, parallelCurve, {
          durationSeconds: 0.75,
        }),
        revealProofPolygon3D(proof, parallelDisk, 0.16, {
          durationSeconds: 0.56,
        }),
        revealProofPoint3D(proof, pointK, {
          durationSeconds: 0.3,
        }),
      ]);
    },
  },

  {
    title: "Spherical triangles",
    description:
      "Construct two triangles using geodesic arcs on the sphere. For ABC, extend the opposite sides wherever an altitude foot falls outside the triangle, mark each perpendicular foot with a right-angle square, and continue the three altitude great-circle arcs until they meet at the spherical orthocenter H. For PQR, highlight its spherical angles and draw the three internal spherical angle bisectors.",
    async run(proof) {
      await Promise.all([
        ...Object.values(triangle1Edges).map((edge) =>
          revealProofPolyline3D(proof, edge, {
            durationSeconds: 0.62,
          }),
        ),
        ...Object.values(triangle2Edges).map((edge) =>
          revealProofPolyline3D(proof, edge, {
            durationSeconds: 0.62,
          }),
        ),
      ]);

      await Promise.all([
        ...Object.values(triangle1Points).map((point) =>
          revealProofPoint3D(proof, point, {
            durationSeconds: 0.25,
          }),
        ),
        ...Object.values(triangle2Points).map((point) =>
          revealProofPoint3D(proof, point, {
            durationSeconds: 0.25,
          }),
        ),
      ]);

      await Promise.all(
        Object.values(triangle1SideExtensions).map((extension) =>
          revealProofPolyline3D(proof, extension, {
            durationSeconds: 0.46,
          }),
        ),
      );

      await Promise.all(
        Object.values(triangle1Altitudes).map((altitude) =>
          revealProofPolyline3D(proof, altitude, {
            durationSeconds: 0.65,
          }),
        ),
      );

      await Promise.all([
        ...Object.values(triangle1RightAngles).map((angle) =>
          revealProofAngle3D(proof, angle, 0.17, {
            durationSeconds: 0.3,
          }),
        ),
        revealProofPoint3D(proof, triangle1Orthocenter, {
          durationSeconds: 0.3,
        }),
      ]);

      await Promise.all([
        revealProofSphericalAngle3D(proof, triangle2Angles.P, 0.21, {
          durationSeconds: 0.42,
        }),
        revealProofSphericalAngle3D(proof, triangle2Angles.Q, 0.21, {
          durationSeconds: 0.42,
        }),
        revealProofSphericalAngle3D(proof, triangle2Angles.R, 0.21, {
          durationSeconds: 0.42,
        }),
      ]);

      await Promise.all(
        Object.values(triangle2Bisectors).map((bisector) =>
          revealProofPolyline3D(proof, bisector, {
            durationSeconds: 0.65,
          }),
        ),
      );
    },
  },

  {
    title: "Centers, radius and resulting angles",
    description:
      "Join the sphere center O to the upper-circle center K and to a point U on that parallel. The auxiliary radius KU makes the right angle at K visible; the angle KOU at O is highlighted as well.",
    async run(proof) {
      await revealProofPoint3D(proof, pointU, {
        durationSeconds: 0.25,
      });

      await Promise.all([
        proof.drawSegment(centerConnection, O, K, {
          durationSeconds: 0.58,
        }),
        proof.drawSegment(sphereRadiusToU, O, U, {
          durationSeconds: 0.65,
        }),
      ]);

      await proof.drawSegment(parallelRadiusKU, K, U, {
        durationSeconds: 0.52,
      });

      await Promise.all([
        revealProofAngle3D(proof, angleKOU, 0.5, {
          durationSeconds: 0.36,
        }),
        revealProofAngle3D(proof, rightAngleOKU, 0.24, {
          durationSeconds: 0.34,
        }),
      ]);
    },
  },

  {
    title: "Spherical lune and wedge",
    description:
      "Highlight the spherical lune on the surface and, in a contrasting color, the associated 3D spherical wedge inside the ball. The wedge is bounded by the same two great-circle half-planes and by the lune on the sphere.",
    async run(proof) {
      /* Isolate the lune/wedge pair so both the surface and volume read clearly. */
      equatorCurve.hide();
      parallelCurve.hide();
      equatorDisk.hide();
      parallelDisk.hide();

      for (const point of [pointO, pointK, pointU]) {
        point.marker.hide();
        point.label.hide();
      }

      for (const segment of allSegments) {
        segment.hide();
      }
      angleKOU.hide();
      rightAngleOKU.hide();

      for (const curve of [
        ...Object.values(triangle1Edges),
        ...Object.values(triangle2Edges),
        ...Object.values(triangle1Altitudes),
        ...Object.values(triangle1SideExtensions),
        ...Object.values(triangle2Bisectors),
      ]) {
        curve.hide();
      }

      for (const angle of Object.values(triangle2Angles)) {
        angle.hide();
      }
      for (const angle of Object.values(triangle1RightAngles)) {
        angle.hide();
      }

      for (const point of [
        triangle1Orthocenter,
        ...Object.values(triangle1Points),
        ...Object.values(triangle2Points),
      ]) {
        point.marker.hide();
        point.label.hide();
      }

      await Promise.all([
        revealProofSphericalWedge3D(proof, sphereWedge, {
          durationSeconds: 0.82,
        }),
        revealProofSphericalLune3D(proof, sphereLune, {
          durationSeconds: 0.82,
        }),
      ]);
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
  sphereProofScene3D: {
    scene,
    orbit,
    proof,
    sphere,
    centers: { O, K },
    parallelPoint: U,
    triangle1: T1,
    triangle2: T2,
    orthocenter: H,
    wedge: sphereWedge,
    lune: sphereLune,
  },
});

const destroy = (): void => {
  proof.destroy();
  orbit.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
