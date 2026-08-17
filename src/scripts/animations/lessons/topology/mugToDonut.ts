import {
  HUES,
  MorphCycle,
  OrbitController3D,
  assertCompatibleSurfaceTopologies3D,
  clamp01,
  createLightingRig3D,
  createMathScene3D,
  createMorphableSurface3D,
  createSurfaceMorphTargetFromGeometry3D,
  easeInOutCubic,
} from "../../../math-graphics";
import {
  MORPH_TIMING,
  MUG,
  TORUS,
  createMugToDonutGeometry,
  mugPoint,
  torusPoint,
} from "./geometry/mugToDonutGeometry";

/* Geometry */
const { mugGeometry, torusGeometry } = createMugToDonutGeometry();

assertCompatibleSurfaceTopologies3D(mugGeometry, torusGeometry);

const torusTarget = createSurfaceMorphTargetFromGeometry3D(
  "torus",
  mugGeometry,
  torusGeometry,
);

/* Scene */
const canvas = document.querySelector<HTMLCanvasElement>(
  "#mug-to-donut-scene",
);

if (!canvas) {
  throw new Error('The canvas "#mug-to-donut-scene" could not be found.');
}

const scene = createMathScene3D(canvas, {
  cameraPosition: [4.9, 3.15, 7.9],
  target: [-0.05, 0, 0],
  fovDegrees: 36,
  background: null,
  maxPixelRatio: 2,
});

const lights = createLightingRig3D({
  ambientIntensity: 0.28,
  hemisphereIntensity: 0.8,
  keyIntensity: 2.35,
  keyPosition: [5.4, 6.4, 6.3],
  fillIntensity: 0.8,
  fillPosition: [-4.8, 2.5, -4],
});

const surface = createMorphableSurface3D({
  geometry: mugGeometry,
  baseTargetName: "mug",
  targets: [torusTarget],
  name: "mug-to-donut",
  style: {
    color: HUES.gold.base,
    roughness: 0.32,
    metalness: 0.02,
    wireframe: false,
  },
});

surface.setMorphTargets("mug", "torus");
scene.add(lights, surface);

const orbit = new OrbitController3D(scene, {
  target: [-0.05, 0, 0],
  minDistance: 4.2,
  maxDistance: 13,
  rotationMode: "orbit",
});

/* Animation */
const cycle = new MorphCycle({
  ...MORPH_TIMING,
  loop: true,
  easing: easeInOutCubic,
});

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

let playing = false;
let stopFrame = (): void => {};

function setProgress(progress: number): void {
  surface.setMorphProgress(clamp01(progress));
}

function start(): void {
  if (playing || reducedMotion) return;

  playing = true;
  stopFrame = scene.onFrame(({ deltaTime }) => {
    setProgress(cycle.advance(deltaTime).progress);
  });
}

function stop(): void {
  if (!playing) return;

  playing = false;
  stopFrame();
  stopFrame = () => {};
}

if (reducedMotion) setProgress(0.5);
else start();

/* Optional console controls for hand-tuning. */
Object.assign(window, {
  mugToDonutAnimation: {
    scene,
    surface,
    mugParameters: MUG,
    torusParameters: TORUS,
    mugPoint,
    torusPoint,

    setProgress(progress: number) {
      stop();
      setProgress(progress);
    },
    showMug() {
      stop();
      setProgress(0);
    },
    showHalfway() {
      stop();
      setProgress(0.5);
    },
    showTorus() {
      stop();
      setProgress(1);
    },
    start,
    stop,
  },
});

const destroy = (): void => {
  stop();
  orbit.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
