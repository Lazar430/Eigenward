import {
  HUES,
  MorphCycle,
  OrbitController3D,
  assertCompatibleSurfaceTopologies3D,
  createLightingRig3D,
  createMathScene3D,
  createMorphableSurface3D,
  createSurfaceMorphTargetFromGeometry3D,
  createSurfaceMorphTarget3D,
  createTextLabel3D,
  easeInOutCubic,
  lerpSurfacePositions3D,
  linear,
  sampleMorphCycle,
  sampleParametricSurface3D,
} from "../math-graphics";

const TAU = Math.PI * 2;

const firstCanvas = document.querySelector<HTMLCanvasElement>(
  "#mug-to-donut-scene",
);
const secondCanvas = document.querySelector<HTMLCanvasElement>(
  "#cow-to-sphere-scene",
);

if (!firstCanvas || !secondCanvas) {
  throw new Error(
    "Batch 3 3D test requires both topology lesson canvases to be present.",
  );
}

const WIDTH_SEGMENTS = 88;
const HEIGHT_SEGMENTS = 44;
const BASE_RADIUS = 1.55;

function sampleSphereFamily(
  map: (
    longitude: number,
    colatitude: number,
    radius: number,
  ) => readonly [number, number, number],
) {
  return sampleParametricSurface3D({
    surface: (longitude, colatitude) =>
      map(longitude, colatitude, BASE_RADIUS),
    uDomain: [0, TAU],
    vDomain: [0, Math.PI],
    uSegments: WIDTH_SEGMENTS,
    vSegments: HEIGHT_SEGMENTS,
    wrapU: true,
    wrapV: false,
  });
}

const sphereGeometry = sampleSphereFamily(
  (longitude, colatitude, radius) => {
    const ring = radius * Math.sin(colatitude);
    return [
      ring * Math.cos(longitude),
      radius * Math.cos(colatitude),
      ring * Math.sin(longitude),
    ];
  },
);

const ellipsoidGeometry = sampleSphereFamily(
  (longitude, colatitude, radius) => {
    const ring = radius * Math.sin(colatitude);
    return [
      1.42 * ring * Math.cos(longitude),
      0.72 * radius * Math.cos(colatitude),
      1.08 * ring * Math.sin(longitude),
    ];
  },
);

const pinchedGeometry = sampleSphereFamily(
  (longitude, colatitude, radius) => {
    const ring = radius * Math.sin(colatitude);
    const vertical = Math.cos(colatitude);
    const waist =
      0.68 + 0.32 * Math.pow(Math.abs(vertical), 0.72);

    return [
      waist * ring * Math.cos(longitude),
      1.12 * radius * vertical,
      waist * ring * Math.sin(longitude),
    ];
  },
);

const rippledGeometry = sampleSphereFamily(
  (longitude, colatitude, radius) => {
    const sineLatitude = Math.sin(colatitude);
    const ripple =
      1 +
	0.13 *
          Math.sin(4 * longitude) *
          sineLatitude *
          sineLatitude;

    const resolvedRadius = radius * ripple;
    const ring = resolvedRadius * sineLatitude;

    return [
      ring * Math.cos(longitude),
      resolvedRadius * Math.cos(colatitude),
      ring * Math.sin(longitude),
    ];
  },
);

const ellipsoidTarget = createSurfaceMorphTargetFromGeometry3D(
  "ellipsoid",
  sphereGeometry,
  ellipsoidGeometry,
);

const pinchedTarget = createSurfaceMorphTargetFromGeometry3D(
  "pinched",
  sphereGeometry,
  pinchedGeometry,
);

const rippledTarget = createSurfaceMorphTargetFromGeometry3D(
  "rippled",
  sphereGeometry,
  rippledGeometry,
);

/* ------------------------------------------------------------------ */
/* Canvas 1: the core diagnostic requested for Batch 3.                */
/* ------------------------------------------------------------------ */

const firstScene = createMathScene3D(firstCanvas, {
  cameraPosition: [5.4, 3.2, 6.9],
  target: [0, 0, 0],
  fovDegrees: 39,
  background: null,
});

const firstLights = createLightingRig3D({
  keyPosition: [5.5, 6.5, 5],
  fillPosition: [-4.5, 2.7, -4],
});

const sphereEllipsoid = createMorphableSurface3D({
  geometry: sphereGeometry,
  baseTargetName: "sphere",
  targets: [ellipsoidTarget],
  name: "batch-3-sphere-ellipsoid",
  style: {
    color: HUES.cyan.base,
    roughness: 0.31,
    metalness: 0.04,
    wireframe: true,
    wireframeColor: HUES.cyan.soft,
    wireframeOpacity: 0.13,
  },
});

sphereEllipsoid.setMorphTargets("sphere", "ellipsoid");

const firstLabel = createTextLabel3D({
  text: "sphere → ellipsoid · fixed topology",
  position: [0, 2.25, 0],
  color: HUES.cyan.soft,
  fontSizePx: 13,
  fontWeight: 760,
  background: "rgba(14, 10, 28, 0.78)",
  border: "1px solid rgba(145, 239, 255, 0.25)",
  borderRadiusPx: 8,
  padding: "0.28rem 0.5rem",
});

firstScene.add(firstLights, sphereEllipsoid, firstLabel);

const firstOrbit = new OrbitController3D(firstScene, {
  target: [0, 0, 0],
  minDistance: 4,
  maxDistance: 14,
});

const firstCycle = new MorphCycle({
  holdStartSeconds: 0.65,
  forwardDurationSeconds: 2.35,
  holdEndSeconds: 0.75,
  reverseDurationSeconds: 2.35,
  easing: easeInOutCubic,
});

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

let automaticTestsPassed: boolean | null = null;

function testStatusPrefix(): string {
  if (automaticTestsPassed === true) return "✓ · ";
  if (automaticTestsPassed === false) return "✗ · ";
  return "";
}

let stopFirstMotion = (): void => {};

if (reducedMotion) {
  sphereEllipsoid.setMorphProgress(0.5);
  firstLabel.setText("reduced motion · static 50% morph");
} else {
  stopFirstMotion = firstScene.onFrame(({ deltaTime, time }) => {
    const state = firstCycle.advance(deltaTime);
    sphereEllipsoid.setMorphProgress(state.progress);
    sphereEllipsoid.setRotation(0, time * 0.000065, 0);

    firstLabel.setText(
      `${testStatusPrefix()}${state.phase} · ${(state.progress * 100).toFixed(0)}% · fixed topology`,
    );
  });
}

/* ------------------------------------------------------------------ */
/* Canvas 2: non-base target interpolation + stronger deformation.     */
/* ------------------------------------------------------------------ */

const secondScene = createMathScene3D(secondCanvas, {
  cameraPosition: [5.8, 3.8, 7.2],
  target: [0, 0, 0],
  fovDegrees: 40,
  background: null,
});

const secondLights = createLightingRig3D({
  keyPosition: [4, 7, 5],
  fillPosition: [-5, 3, -3],
  hemisphereIntensity: 0.82,
});

const multiTargetSurface = createMorphableSurface3D({
  geometry: sphereGeometry,
  baseTargetName: "sphere",
  targets: [pinchedTarget, rippledTarget],
  name: "batch-3-multi-target-surface",
  style: {
    color: HUES.purple.base,
    roughness: 0.34,
    metalness: 0.03,
    wireframe: true,
    wireframeColor: HUES.magenta.light,
    wireframeOpacity: 0.2,
  },
});

multiTargetSurface.setMorphTargets("pinched", "rippled");

const secondLabel = createTextLabel3D({
  text: "pinched → rippled · same vertex/index buffers",
  position: [0, 2.35, 0],
  color: HUES.magenta.soft,
  fontSizePx: 13,
  fontWeight: 760,
  background: "rgba(24, 10, 31, 0.76)",
  border: "1px solid rgba(255, 154, 187, 0.24)",
  borderRadiusPx: 8,
  padding: "0.28rem 0.5rem",
});

secondScene.add(secondLights, multiTargetSurface, secondLabel);

const secondOrbit = new OrbitController3D(secondScene, {
  target: [0, 0, 0],
  minDistance: 4,
  maxDistance: 15,
});

const secondCycle = new MorphCycle({
  holdStartSeconds: 0.45,
  forwardDurationSeconds: 2.8,
  holdEndSeconds: 0.55,
  reverseDurationSeconds: 2.8,
  easing: easeInOutCubic,
});

let stopSecondMotion = (): void => {};

if (reducedMotion) {
  multiTargetSurface.setMorphProgress(0.5);
  secondLabel.setText("reduced motion · static multi-target morph");
} else {
  stopSecondMotion = secondScene.onFrame(({ deltaTime, time }) => {
    const state = secondCycle.advance(deltaTime);
    multiTargetSurface.setMorphProgress(state.progress);
    multiTargetSurface.setRotation(
      0.08 * Math.sin(time * 0.0002),
      -time * 0.000055,
      0,
    );

    secondLabel.setText(
      `${testStatusPrefix()}pinched ↔ rippled · ${(state.progress * 100).toFixed(0)}%`,
    );
  });
}

/* ------------------------------------------------------------------ */
/* Automatic assertions.                                               */
/* ------------------------------------------------------------------ */

function allFinite(values: ArrayLike<number>): boolean {
  for (let index = 0; index < values.length; index += 1) {
    if (!Number.isFinite(Number(values[index]))) return false;
  }
  return true;
}

function arraysAlmostEqual(
  left: ArrayLike<number>,
  right: ArrayLike<number>,
  tolerance = 1e-6,
): boolean {
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    if (Math.abs(Number(left[index]) - Number(right[index])) > tolerance) {
      return false;
    }
  }

  return true;
}

function expectThrow(callback: () => void): boolean {
  try {
    callback();
    return false;
  } catch {
    return true;
  }
}

function runAutomaticAssertions(): boolean {
  let compatibleTopologyPass = true;

  try {
    assertCompatibleSurfaceTopologies3D(
      sphereGeometry,
      ellipsoidGeometry,
    );
    assertCompatibleSurfaceTopologies3D(
      sphereGeometry,
      pinchedGeometry,
    );
    assertCompatibleSurfaceTopologies3D(
      sphereGeometry,
      rippledGeometry,
    );
  } catch {
    compatibleTopologyPass = false;
  }

  const incompatibleGeometry = sampleParametricSurface3D({
    surface: (u, v) => [u, 0, v],
    uDomain: [-1, 1],
    vDomain: [-1, 1],
    uSegments: 11,
    vSegments: 9,
  });

  const mismatchRejectedPass = expectThrow(() => {
    assertCompatibleSurfaceTopologies3D(
      sphereGeometry,
      incompatibleGeometry,
    );
  });

  const midpointExpected = new Float32Array(
    sphereGeometry.positions.length,
  );

  for (let index = 0; index < midpointExpected.length; index += 1) {
    midpointExpected[index] =
      0.5 * (
        sphereGeometry.positions[index] +
          ellipsoidGeometry.positions[index]
      );
  }

  const midpoint = lerpSurfacePositions3D(
    sphereGeometry.positions,
    ellipsoidGeometry.positions,
    0.5,
  );

  const interpolationPass = arraysAlmostEqual(
    midpoint,
    midpointExpected,
    2e-6,
  );

  const geometryIdentity = sphereEllipsoid.getGeometry();
  const positionIdentity = geometryIdentity.getAttribute("position");
  const indexIdentity = geometryIdentity.getIndex();

  const savedFirstState = sphereEllipsoid.getMorphState();
  sphereEllipsoid.setMorphBetween("sphere", "ellipsoid", 0.5);

  const currentMidpoint = sphereEllipsoid.getVertexPositions();
  const persistencePass =
    sphereEllipsoid.getGeometry() === geometryIdentity &&
      geometryIdentity.getAttribute("position") === positionIdentity &&
      geometryIdentity.getIndex() === indexIdentity &&
      arraysAlmostEqual(currentMidpoint, midpointExpected, 2e-6);

  const normals = geometryIdentity.getAttribute("normal");
  const normalsPass = Boolean(
    normals &&
      normals.count === positionIdentity.count &&
      allFinite(normals.array),
  );

  sphereEllipsoid.setMorphBetween(
    savedFirstState.from,
    savedFirstState.to,
    savedFirstState.progress,
  );

  const targetRegistrationPass =
    multiTargetSurface.getMorphTargetNames().length === 3 &&
      multiTargetSurface.hasMorphTarget("sphere") &&
      multiTargetSurface.hasMorphTarget("pinched") &&
      multiTargetSurface.hasMorphTarget("rippled");

  const invalidTargetPass = expectThrow(() => {
    createSurfaceMorphTarget3D(
      "bad-target",
      new Float32Array([0, 1, 2]),
      sphereGeometry.positions.length,
    );
  });

  const timelineOptions = {
    holdStartSeconds: 1,
    forwardDurationSeconds: 2,
    holdEndSeconds: 1,
    reverseDurationSeconds: 2,
    loop: false,
    easing: linear,
  } as const;

  const holdStart = sampleMorphCycle(0.5, timelineOptions);
  const forward = sampleMorphCycle(2, timelineOptions);
  const holdEnd = sampleMorphCycle(3.5, timelineOptions);
  const reverse = sampleMorphCycle(5, timelineOptions);
  const complete = sampleMorphCycle(6.1, timelineOptions);

  const timelinePass =
    holdStart.phase === "hold-start" &&
      holdStart.progress === 0 &&
      forward.phase === "forward" &&
      Math.abs(forward.progress - 0.5) < 1e-12 &&
      holdEnd.phase === "hold-end" &&
      holdEnd.progress === 1 &&
      reverse.phase === "reverse" &&
      Math.abs(reverse.progress - 0.5) < 1e-12 &&
      complete.phase === "complete" &&
      complete.completed &&
      complete.progress === 0;

  const easingPass =
    easeInOutCubic(0) === 0 &&
      easeInOutCubic(1) === 1 &&
      easeInOutCubic(0.25) < easeInOutCubic(0.5) &&
      easeInOutCubic(0.5) < easeInOutCubic(0.75);

  console.assert(
    compatibleTopologyPass,
    "Batch 3: compatible topology was rejected.",
  );
  console.assert(
    mismatchRejectedPass,
    "Batch 3: incompatible topology was not rejected.",
  );
  console.assert(
    interpolationPass,
    "Batch 3: position-buffer interpolation failed.",
  );
  console.assert(
    persistencePass,
    "Batch 3: morph replaced persistent GPU geometry/attributes.",
  );
  console.assert(
    normalsPass,
    "Batch 3: normals became invalid after deformation.",
  );
  console.assert(
    targetRegistrationPass,
    "Batch 3: morph target registration failed.",
  );
  console.assert(
    invalidTargetPass,
    "Batch 3: invalid target-buffer length was not rejected.",
  );
  console.assert(
    timelinePass,
    "Batch 3: reusable morph-cycle timing failed.",
  );
  console.assert(
    easingPass,
    "Batch 3: easing functions failed basic endpoint/order tests.",
  );

  const passed =
    compatibleTopologyPass &&
      mismatchRejectedPass &&
      interpolationPass &&
      persistencePass &&
      normalsPass &&
      targetRegistrationPass &&
      invalidTargetPass &&
      timelinePass &&
      easingPass;

  automaticTestsPassed = passed;

  firstLabel.setText(
    passed
      ? reducedMotion
      ? "Batch 3 checks passed ✓ · reduced-motion midpoint"
      : "Batch 3 checks passed ✓ · sphere ↔ ellipsoid"
      : "Batch 3 automatic check failed — see console",
  );

  secondLabel.setText(
    passed
      ? "persistent topology + multi-target morphing ✓"
      : "Batch 3 automatic check failed — see console",
  );

  return passed;
}

const runAfterFirstRender = window.setTimeout(() => {
  runAutomaticAssertions();
}, 100);

Object.assign(window, {
  math3DBatch3: {
    firstScene,
    secondScene,
    sphereEllipsoid,
    multiTargetSurface,
    firstCycle,
    secondCycle,
    firstOrbit,
    secondOrbit,
    geometries: {
      sphereGeometry,
      ellipsoidGeometry,
      pinchedGeometry,
      rippledGeometry,
    },
    runTests: runAutomaticAssertions,
  },
});

const destroy = (): void => {
  window.clearTimeout(runAfterFirstRender);
  stopFirstMotion();
  stopSecondMotion();
  firstOrbit.destroy();
  secondOrbit.destroy();
  firstScene.destroy();
  secondScene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
