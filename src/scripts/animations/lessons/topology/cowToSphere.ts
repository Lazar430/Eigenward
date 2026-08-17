import { BufferAttribute } from "three";
import {
  assertCompatibleSurfaceTopologies3D,
  clamp01,
  createLightingRig3D,
  createMathScene3D,
  createMorphableSurface3D,
  createSurfaceMorphTargetFromGeometry3D,
  easeInOutCubic,
  MorphCycle,
  OrbitController3D,
} from "../../../math-graphics";
import {
  BODY,
  COW_TO_SPHERE_TIMING,
  HEAD,
  LEGS,
  cowPoint,
  createCowToSphereGeometry,
  spherePoint,
} from "./geometry/cowToSphereGeometry";

const { cowGeometry, sphereGeometry } = createCowToSphereGeometry();
assertCompatibleSurfaceTopologies3D(cowGeometry, sphereGeometry);

const sphereTarget = createSurfaceMorphTargetFromGeometry3D(
  "sphere",
  cowGeometry,
  sphereGeometry,
);

const canvas = document.querySelector<HTMLCanvasElement>("#cow-to-sphere-scene");
if (!canvas) {
  throw new Error('The canvas "#cow-to-sphere-scene" could not be found.');
}

const scene = createMathScene3D(canvas, {
  cameraPosition: [6.2, 3.9, 7.5],
  target: [0.05, -0.15, 0],
  fovDegrees: 34,
  background: null,
  maxPixelRatio: 2,
});

const lights = createLightingRig3D({
  ambientIntensity: 0.30,
  hemisphereIntensity: 0.95,
  keyIntensity: 2.5,
  keyPosition: [7.0, 7.4, 5.8],
  fillIntensity: 0.82,
  fillPosition: [-5.3, 2.5, -5.0],
});

const surface = createMorphableSurface3D({
  geometry: cowGeometry,
  baseTargetName: "cow",
  targets: [sphereTarget],
  name: "cow-to-sphere",
  style: {
    color: "#e9e5df",
    roughness: 0.56,
    metalness: 0.01,
    wireframe: false,
  },
});

const cowDetails = createCowDetailColors(cowGeometry.positions);

surface.setMorphTargets("cow", "sphere");
applyCowDetails(surface, cowDetails, 0);
scene.add(lights, surface);

const orbit = new OrbitController3D(scene, {
  target: [0.05, -0.15, 0],
  minDistance: 4.8,
  maxDistance: 14.5,
  rotationMode: "orbit",
});

const cycle = new MorphCycle({
  ...COW_TO_SPHERE_TIMING,
  loop: true,
  easing: easeInOutCubic,
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let playing = false;
let stopFrame = (): void => {};

function detailVisibilityForMorph(progress: number): number {
  const cowness = 1 - clamp01(progress);
  return smoothstep01((cowness - 0.55) / 0.25);
}

function setProgress(progress: number): void {
  const clampedProgress = clamp01(progress);
  const detailVisibility = detailVisibilityForMorph(clampedProgress);

  surface.setMorphProgress(clampedProgress);
  applyCowDetails(surface, cowDetails, detailVisibility);
}

function start(): void {
  if (playing || reducedMotion) return;
  playing = true;
  stopFrame = scene.onFrame(({ deltaTime }) => {
    const state = cycle.advance(deltaTime);
    setProgress(state.progress);
  });
}

function stop(): void {
  if (!playing) return;
  playing = false;
  stopFrame();
  stopFrame = () => {};
}

if (reducedMotion) {
  setProgress(0);
} else {
  setProgress(0);
  start();
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep01(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function mixChannel(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function paint(
  color: readonly [number, number, number],
  target: readonly [number, number, number],
  alpha: number,
): [number, number, number] {
  const t = clamp(alpha, 0, 1);
  return [
    mixChannel(color[0], target[0], t),
    mixChannel(color[1], target[1], t),
    mixChannel(color[2], target[2], t),
  ];
}

function oneLegRegionMask(
  x: number,
  z: number,
  centerX: number,
  centerZ: number,
): number {
  const nx = Math.abs(x - centerX) / LEGS.halfWidthX;
  const nz = Math.abs(z - centerZ) / LEGS.halfWidthZ;
  const edge = Math.max(nx, nz);
  return smoothstep01((1.35 - edge) / 0.22);
}

function legsRegionMask(x: number, z: number): number {
  return Math.max(
    oneLegRegionMask(x, z, LEGS.centerX, LEGS.centerZ),
    oneLegRegionMask(x, z, LEGS.centerX, -LEGS.centerZ),
    oneLegRegionMask(x, z, -LEGS.centerX, LEGS.centerZ),
    oneLegRegionMask(x, z, -LEGS.centerX, -LEGS.centerZ),
  );
}

function isLikelyHeadRegion(x: number): boolean {
  return x > HEAD.backX - 0.1;
}

function frontPatchMask(
  x: number,
  y: number,
  z: number,
  centerY: number,
  centerZ: number,
  radiusY: number,
  radiusZ: number,
  frontStartX: number,
  softness = 0.24,
): number {
  const frontMask = smoothstep01((x - frontStartX) / 0.22);

  const dy = (y - centerY) / radiusY;
  const dz = (z - centerZ) / radiusZ;
  const radial = Math.sqrt(dy * dy + dz * dz);
  const shapeMask = smoothstep01((1 - radial) / softness);

  return frontMask * shapeMask;
}

function sideSpotMask(
  x: number,
  y: number,
  z: number,
  side: -1 | 1,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
): number {
  const dx = (x - centerX) / radiusX;
  const dy = (y - centerY) / radiusY;
  const radial = Math.sqrt(dx * dx + dy * dy);

  const patch = smoothstep01((1 - radial) / 0.24);
  const sideGate = smoothstep01((side * z - 0.68) / 0.24);

  return patch * sideGate;
}

function createCowDetailColors(positions: Float32Array): Float32Array {
  const colors = new Float32Array(positions.length);

  const coat: readonly [number, number, number] = [1, 1, 1];
  const dark: readonly [number, number, number] = [0.015, 0.015, 0.015];
  const pink: readonly [number, number, number] = [1.0, 0.42, 0.55];

  const legTopY = -BODY.halfHeightY + LEGS.bodyOverlap;
  const legBottomY = legTopY - LEGS.length;
  const hoofTopY = legBottomY + 0.25 * LEGS.length;
  const hoofBlendHeight = 0.075;

  for (let offset = 0; offset < positions.length; offset += 3) {
    const x = positions[offset];
    const y = positions[offset + 1];
    const z = positions[offset + 2];

    let color: [number, number, number] = [coat[0], coat[1], coat[2]];

    if (!isLikelyHeadRegion(x)) {
      const bodyGate = smoothstep01((HEAD.backX - 0.44 - x) / 0.30);

      const spotMask = bodyGate * Math.max(
        sideSpotMask(x, y, z, 1, -1.32, 0.34, 0.68, 0.46),
        sideSpotMask(x, y, z, 1, -0.30, -0.14, 0.46, 0.34),
        sideSpotMask(x, y, z, 1, 0.34, 0.24, 0.28, 0.22),
        sideSpotMask(x, y, z, -1, -0.92, 0.34, 0.62, 0.44),
        sideSpotMask(x, y, z, -1, 0.24, -0.04, 0.42, 0.30),
      );

      color = paint(color, dark, spotMask);
    }

    const noseMask = frontPatchMask(
      x,
      y,
      z,
      HEAD.frontCenterY - 0.10,
      0,
      0.34,
      0.58,
      HEAD.frontX - 0.48,
      0.20,
    );
    color = paint(color, pink, noseMask);

    const nostrilMask = Math.max(
      frontPatchMask(
        x,
        y,
        z,
        HEAD.frontCenterY - 0.14,
        HEAD.frontHalfWidth * 0.15,
        0.07,
        0.09,
        HEAD.frontX - 0.20,
        0.16,
      ),
      frontPatchMask(
        x,
        y,
        z,
        HEAD.frontCenterY - 0.14,
        -HEAD.frontHalfWidth * 0.15,
        0.07,
        0.09,
        HEAD.frontX - 0.20,
        0.16,
      ),
    );
    color = paint(color, dark, 0.92 * nostrilMask);

    const eyeMask = Math.max(
      frontPatchMask(
        x,
        y,
        z,
        HEAD.frontCenterY + 0.27,
        HEAD.frontHalfWidth * 0.46,
        0.12,
        0.13,
        HEAD.frontX - 0.22,
        0.18,
      ),
      frontPatchMask(
        x,
        y,
        z,
        HEAD.frontCenterY + 0.27,
        -HEAD.frontHalfWidth * 0.46,
        0.12,
        0.13,
        HEAD.frontX - 0.22,
        0.18,
      ),
    );
    color = paint(color, dark, eyeMask);

    const verticalMask = smoothstep01((hoofTopY - y) / hoofBlendHeight);
    const hoofMask = verticalMask * legsRegionMask(x, z);
    color = paint(color, dark, hoofMask);

    colors[offset] = color[0];
    colors[offset + 1] = color[1];
    colors[offset + 2] = color[2];
  }

  return colors;
}

function applyCowDetails(
  morphSurface: ReturnType<typeof createMorphableSurface3D>,
  detailColors: Float32Array,
  detailVisibility: number,
): void {
  const geometry = morphSurface.getGeometry();

  let colorAttribute = geometry.getAttribute("color") as BufferAttribute | undefined;
  if (!colorAttribute) {
    colorAttribute = new BufferAttribute(new Float32Array(detailColors.length), 3);
    geometry.setAttribute("color", colorAttribute);
  }

  const colors = colorAttribute.array as Float32Array;
  const t = clamp(detailVisibility, 0, 1);

  for (let i = 0; i < detailColors.length; i += 3) {
    colors[i] = mixChannel(1, detailColors[i], t);
    colors[i + 1] = mixChannel(1, detailColors[i + 1], t);
    colors[i + 2] = mixChannel(1, detailColors[i + 2], t);
  }

  colorAttribute.needsUpdate = true;

  const material = morphSurface.getSurfaceMesh().material;
  material.vertexColors = true;
  material.needsUpdate = true;
}

function allFinite(values: ArrayLike<number>): boolean {
  for (let i = 0; i < values.length; i += 1) {
    if (!Number.isFinite(Number(values[i]))) return false;
  }
  return true;
}

function runTests(): boolean {
  let topologyPass = true;
  try {
    assertCompatibleSurfaceTopologies3D(cowGeometry, sphereGeometry);
  } catch {
    topologyPass = false;
  }

  const finitePass = allFinite(cowGeometry.positions) && allFinite(sphereGeometry.positions);

  const geometry = surface.getGeometry();
  const positionAttribute = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const colorAttribute = geometry.getAttribute("color");
  const colorPass = colorAttribute !== undefined && colorAttribute.count === cowGeometry.vertexCount;

  setProgress(0.5);
  const persistencePass =
    surface.getGeometry() === geometry &&
      geometry.getAttribute("position") === positionAttribute &&
      geometry.getIndex() === index;

  setProgress(0);

  console.assert(topologyPass, "Cow and sphere topology mismatch.");
  console.assert(finitePass, "Cow/sphere geometry contains non-finite coordinates.");
  console.assert(persistencePass, "The morph replaced the persistent surface mesh.");
  console.assert(colorPass, "Cow detail colors were not attached correctly.");

  return topologyPass && finitePass && persistencePass && colorPass;
}

Object.assign(window, {
  cowToSphereAnimation: {
    scene,
    surface,
    cowPoint,
    spherePoint,
    bodyParameters: BODY,
    headParameters: HEAD,
    legParameters: LEGS,
    showCow() {
      stop();
      setProgress(0);
    },
    showQuarter() {
      stop();
      setProgress(0.25);
    },
    showHalfway() {
      stop();
      setProgress(0.5);
    },
    showSphere() {
      stop();
      setProgress(1);
    },
    setProgress(progress: number) {
      stop();
      setProgress(progress);
    },
    start,
    stop,
    runTests,
  },
});

const destroy = (): void => {
  stop();
  orbit.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
