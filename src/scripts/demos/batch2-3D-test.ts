import {
  HUES,
  OrbitController3D,
  createLightingRig3D,
  createMathScene3D,
  createParametricSurface3D,
  createSphere3D,
  createTextLabel3D,
  createTorus3D,
  createSurfaceGrid3D,
  sampleParametricSurface3D,
} from "../math-graphics";

const firstCanvas = document.querySelector<HTMLCanvasElement>(
  "#mug-to-donut-scene",
);
const secondCanvas = document.querySelector<HTMLCanvasElement>(
  "#cow-to-sphere-scene",
);

if (!firstCanvas || !secondCanvas) {
  throw new Error(
    "Batch 2 3D test requires both topology lesson canvases to be present.",
  );
}

const firstScene = createMathScene3D(firstCanvas, {
  cameraPosition: [6.4, 3.8, 7.4],
  target: [0, 0, 0],
  fovDegrees: 39,
  background: null,
});

const firstLights = createLightingRig3D({
  keyPosition: [5, 7, 6],
  fillPosition: [-5, 2.5, -4],
});

const sphere = createSphere3D({
  radius: 1.35,
  widthSegments: 72,
  heightSegments: 36,
  name: "batch-2-sphere",
  style: {
    color: HUES.cyan.base,
    roughness: 0.28,
    metalness: 0.07,
    wireframe: true,
    wireframeColor: HUES.cyan.soft,
    wireframeOpacity: 0.13,
  },
}).moveTo(-1.85, 0, 0);

const torus = createTorus3D({
  majorRadius: 1.18,
  tubeRadius: 0.46,
  majorSegments: 96,
  tubeSegments: 40,
  name: "batch-2-torus",
  style: {
    color: HUES.gold.base,
    roughness: 0.34,
    metalness: 0.04,
    wireframe: true,
    wireframeColor: HUES.gold.soft,
    wireframeOpacity: 0.16,
  },
}).moveTo(1.8, 0, 0);

const firstLabel = createTextLabel3D({
  text: "drag to orbit · wheel / pinch to zoom",
  position: [0, 2.25, 0],
  color: HUES.cyan.soft,
  fontSizePx: 13,
  fontWeight: 760,
  background: "rgba(14, 10, 28, 0.78)",
  border: "1px solid rgba(145, 239, 255, 0.25)",
  borderRadiusPx: 8,
  padding: "0.28rem 0.5rem",
});

firstScene.add(firstLights, sphere, torus, firstLabel);

const firstOrbit = new OrbitController3D(firstScene, {
  target: [0, 0, 0],
  minDistance: 4.2,
  maxDistance: 16,
});

const stopFirstMotion = firstScene.onFrame(({ time }) => {
  const seconds = time / 1000;
  sphere.setRotation(0.08 * Math.sin(seconds * 0.4), seconds * 0.16, 0);
  torus.setRotation(Math.PI / 2 + seconds * 0.11, seconds * 0.18, 0.2);
});

const secondScene = createMathScene3D(secondCanvas, {
  cameraPosition: [6.2, 4.9, 7.6],
  target: [0, 0, 0],
  fovDegrees: 40,
  background: null,
});

const secondLights = createLightingRig3D({
  keyPosition: [4, 7, 4],
  fillPosition: [-5, 3, -2],
  hemisphereIntensity: 0.82,
});

const waveSurface = createParametricSurface3D({
  name: "batch-2-wave-surface",
  surface: (u, v) => [
    u,
    0.52 * Math.sin(1.4 * u) * Math.cos(1.55 * v),
    v,
  ],
  uDomain: [-2.7, 2.7],
  vDomain: [-2.7, 2.7],
  uSegments: 72,
  vSegments: 72,
  style: {
    color: HUES.purple.base,
    roughness: 0.38,
    metalness: 0.02,
    wireframe: true,
    wireframeColor: HUES.magenta.light,
    wireframeOpacity: 0.2,
  },
});

const secondLabel = createTextLabel3D({
  text: "general parametric surface · shared indexed mesh",
  position: [0, 1.25, -2.65],
  color: HUES.magenta.soft,
  fontSizePx: 13,
  fontWeight: 760,
  background: "rgba(24, 10, 31, 0.76)",
  border: "1px solid rgba(255, 154, 187, 0.24)",
  borderRadiusPx: 8,
  padding: "0.28rem 0.5rem",
});

secondScene.add(secondLights, waveSurface, secondLabel);

const secondOrbit = new OrbitController3D(secondScene, {
  target: [0, 0, 0],
  minDistance: 4,
  maxDistance: 18,
});

const stopSecondMotion = secondScene.onFrame(({ time }) => {
  const seconds = time / 1000;
  waveSurface.setRotation(0, 0.08 * Math.sin(seconds * 0.35), 0);
});

function allFinite(values: ArrayLike<number>): boolean {
  for (let index = 0; index < values.length; index += 1) {
    if (!Number.isFinite(Number(values[index]))) return false;
  }
  return true;
}

function arraysAlmostEqual(
  left: readonly number[],
  right: readonly number[],
  tolerance = 1e-7,
): boolean {
  return left.length === right.length && left.every(
    (value, index) => Math.abs(value - right[index]) <= tolerance,
  );
}

function runAutomaticAssertions(): boolean {
  const openGrid = createSurfaceGrid3D({
    uSegments: 4,
    vSegments: 3,
  });
  const wrappedGrid = createSurfaceGrid3D({
    uSegments: 8,
    vSegments: 5,
    wrapU: true,
    wrapV: true,
  });

  const sampledPlane = sampleParametricSurface3D({
    surface: (u, v) => [u, u + v, v],
    uDomain: [-1, 1],
    vDomain: [-2, 2],
    uSegments: 4,
    vSegments: 3,
  });

  const gridCountsPass =
    openGrid.vertexCount === 20 &&
    openGrid.triangleCount === 24 &&
    openGrid.indices.length === 72 &&
    wrappedGrid.vertexCount === 40 &&
    wrappedGrid.triangleCount === 80 &&
    wrappedGrid.indices.length === 240;

  const maximumWrappedIndex = Math.max(...wrappedGrid.indices);
  const samplingPass =
    sampledPlane.positions.length === sampledPlane.vertexCount * 3 &&
    sampledPlane.uvs.length === sampledPlane.vertexCount * 2 &&
    allFinite(sampledPlane.positions) &&
    maximumWrappedIndex < wrappedGrid.vertexCount;

  const sphereGeometry = sphere.getGeometry();
  const torusGeometry = torus.getGeometry();
  const waveGeometry = waveSurface.getGeometry();
  const normalPass = [sphereGeometry, torusGeometry, waveGeometry].every(
    (geometry) => {
      const positions = geometry.getAttribute("position");
      const normals = geometry.getAttribute("normal");
      return Boolean(
        positions &&
        normals &&
        positions.count === normals.count &&
        allFinite(normals.array),
      );
    },
  );

  const spherePositions = sphere.getVertexPositions();
  let sphereRadiusError = 0;
  for (let index = 0; index < spherePositions.length; index += 3) {
    const radius = Math.hypot(
      spherePositions[index],
      spherePositions[index + 1],
      spherePositions[index + 2],
    );
    sphereRadiusError = Math.max(sphereRadiusError, Math.abs(radius - 1.35));
  }
  const spherePass = sphereRadiusError < 1e-5;

  const initialOrbit = firstOrbit.getState();
  const initialCamera = firstScene.getCameraState();

  firstOrbit.orbitBy(0.11, -0.06).dollyBy(0.94);
  const changedCamera = firstScene.getCameraState();
  const orbitChanged = !arraysAlmostEqual(
    [...initialCamera.position],
    [...changedCamera.position],
  );

  firstOrbit.setState(initialOrbit);
  const restoredCamera = firstScene.getCameraState();
  const orbitRestored = arraysAlmostEqual(
    [...initialCamera.position],
    [...restoredCamera.position],
    1e-6,
  );

  const lightingPass =
    firstLights.ambient.isAmbientLight &&
    firstLights.hemisphere.isHemisphereLight &&
    firstLights.key.isDirectionalLight &&
    firstLights.fill.isDirectionalLight;

  console.assert(gridCountsPass, "Batch 2: surface-grid counts failed.");
  console.assert(samplingPass, "Batch 2: parametric sampling failed.");
  console.assert(normalPass, "Batch 2: surface normals are invalid.");
  console.assert(spherePass, "Batch 2: sphere sampling radius is incorrect.");
  console.assert(orbitChanged, "Batch 2: programmatic orbit did not move camera.");
  console.assert(orbitRestored, "Batch 2: orbit state did not restore camera.");
  console.assert(lightingPass, "Batch 2: reusable lighting rig failed.");

  const passed =
    gridCountsPass &&
    samplingPass &&
    normalPass &&
    spherePass &&
    orbitChanged &&
    orbitRestored &&
    lightingPass;

  firstLabel.setText(
    passed
      ? "Batch 2 checks passed ✓ · drag / wheel / pinch"
      : "Batch 2 automatic check failed — see console",
  );
  secondLabel.setText(
    passed
      ? "parametric surface + lighting + wireframe ✓"
      : "Batch 2 automatic check failed — see console",
  );

  return passed;
}

const runAfterFirstRender = window.setTimeout(() => {
  runAutomaticAssertions();
}, 80);

Object.assign(window, {
  math3DBatch2: {
    firstScene,
    secondScene,
    sphere,
    torus,
    waveSurface,
    firstLights,
    secondLights,
    firstOrbit,
    secondOrbit,
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
