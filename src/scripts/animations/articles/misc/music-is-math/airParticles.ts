import {
  CircleGeometry,
  DynamicDrawUsage,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
} from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

import {
  HUES,
  createMathScene2D,
  createPolygon2D,
} from "../../../../math-graphics";

const CANVAS_SELECTOR = "#air-particles";

const VIEW_HEIGHT = 6;
const START_VISIBILITY_RATIO = 0.15;

const COLUMNS = 13;
const ROWS = 7;

const GRID_CENTER_X = 1.85;
const COLUMN_SPACING = 0.56;
const ROW_SPACING = 0.62;
const PARTICLE_RADIUS = 0.075;

const SOURCE_X = -3.38;
const SOURCE_Y = 0;

const WAVELENGTH = 0.86;
const WAVE_SPEED = 1.6;
const PACKET_LENGTH = WAVELENGTH * 3.2;
const PARTICLE_AMPLITUDE = 0.18;
const REST_SECONDS = 0.85;

const WAVEFRONT_COUNT = 3;
const WAVEFRONT_SEGMENTS = 72;

const canvas = document.querySelector<HTMLCanvasElement>(CANVAS_SELECTOR);

if (!canvas) {
  throw new Error(
    `The air-particles demonstration canvas (${CANVAS_SELECTOR}) could not be found.`,
  );
}

const scene = createMathScene2D(canvas, {
  viewHeight: VIEW_HEIGHT,
  center: [0, 0],
  background: null,
});

/* -------------------------------------------------------------------------- */
/* Megaphone                                                                  */
/* -------------------------------------------------------------------------- */

const horn = createPolygon2D({
  name: "air-particles-megaphone-horn",
  vertices: [
    [-4.68, -0.34],
    [-3.52, -0.92],
    [-3.52, 0.92],
    [-4.68, 0.34],
  ],
  style: {
    outline: HUES.cyan.light,
    outlineWidth: 2.4,
    outlineOpacity: 0.96,
    fill: HUES.cyan.base,
    fillOpacity: 0.14,
  },
});

const rearCap = createPolygon2D({
  name: "air-particles-megaphone-rear-cap",
  vertices: [
    [-4.92, -0.27],
    [-4.66, -0.27],
    [-4.66, 0.27],
    [-4.92, 0.27],
  ],
  style: {
    outline: HUES.cyan.light,
    outlineWidth: 2.2,
    fill: HUES.cyan.base,
    fillOpacity: 0.3,
  },
});

const mouthRim = createPolygon2D({
  name: "air-particles-megaphone-mouth-rim",
  vertices: [
    [-3.59, -1.02],
    [-3.43, -1.02],
    [-3.43, 1.02],
    [-3.59, 1.02],
  ],
  style: {
    outline: HUES.cyan.light,
    outlineWidth: 2,
    fill: HUES.cyan.light,
    fillOpacity: 0.35,
  },
});

const handle = createPolygon2D({
  name: "air-particles-megaphone-handle",
  vertices: [
    [-4.43, -0.44],
    [-4.02, -0.44],
    [-3.9, -1.22],
    [-4.28, -1.22],
  ],
  style: {
    outline: HUES.cyan.light,
    outlineWidth: 2.2,
    fill: HUES.cyan.base,
    fillOpacity: 0.18,
  },
});

scene.add(horn, rearCap, mouthRim, handle);

/* -------------------------------------------------------------------------- */
/* Air molecules                                                              */
/* -------------------------------------------------------------------------- */

interface Particle {
  baseX: number;
  baseY: number;
  distanceFromSource: number;
  directionX: number;
  directionY: number;
}

const particles: Particle[] = [];

const gridWidth = (COLUMNS - 1) * COLUMN_SPACING;
const gridHeight = (ROWS - 1) * ROW_SPACING;

const gridLeft = GRID_CENTER_X - gridWidth / 2;
const gridBottom = -gridHeight / 2;

for (let row = 0; row < ROWS; row += 1) {
  for (let column = 0; column < COLUMNS; column += 1) {
    const baseX = gridLeft + column * COLUMN_SPACING;
    const baseY = gridBottom + row * ROW_SPACING;

    const dx = baseX - SOURCE_X;
    const dy = baseY - SOURCE_Y;
    const distance = Math.hypot(dx, dy) || 1;

    particles.push({
      baseX,
      baseY,
      distanceFromSource: distance,
      directionX: dx / distance,
      directionY: dy / distance,
    });
  }
}

const particleGeometry = new CircleGeometry(PARTICLE_RADIUS, 24);

const particleMaterial = new MeshBasicMaterial({
  color: HUES.cyan.light,
  transparent: true,
  opacity: 0.97,
  depthWrite: false,
});

const particleMesh = new InstancedMesh(
  particleGeometry,
  particleMaterial,
  particles.length,
);

particleMesh.name = "air-particle-grid";
particleMesh.instanceMatrix.setUsage(DynamicDrawUsage);
particleMesh.frustumCulled = false;

scene.add(particleMesh);

const transform = new Object3D();

function particleDisplacement(
  distanceFromSource: number,
  leadingRadius: number,
): number {
  const s = leadingRadius - distanceFromSource;

  if (s <= 0 || s >= PACKET_LENGTH) {
    return 0;
  }

  const envelope = Math.sin(Math.PI * s / PACKET_LENGTH) ** 2;
  const oscillation = Math.sin((Math.PI * 2 * s) / WAVELENGTH);

  return PARTICLE_AMPLITUDE * envelope * oscillation;
}

function writeParticleTransforms(leadingRadius: number | null): void {
  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index];

    const displacement =
      leadingRadius === null
        ? 0
        : particleDisplacement(
            particle.distanceFromSource,
            leadingRadius,
          );

    transform.position.set(
      particle.baseX + particle.directionX * displacement,
      particle.baseY + particle.directionY * displacement,
      0,
    );

    transform.rotation.set(0, 0, 0);
    transform.scale.set(1, 1, 1);
    transform.updateMatrix();

    particleMesh.setMatrixAt(index, transform.matrix);
  }

  particleMesh.instanceMatrix.needsUpdate = true;
}

/* -------------------------------------------------------------------------- */
/* Three circular wavefronts                                                  */
/* -------------------------------------------------------------------------- */

interface Wavefront {
  geometry: LineGeometry;
  material: LineMaterial;
  line: Line2;
}

function createWavefront(
  index: number,
  opacity: number,
): Wavefront {
  const geometry = new LineGeometry();

  const material = new LineMaterial({
    color: HUES.cyan.light,
    linewidth: 2.35,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
  });

  const line = new Line2(geometry, material);
  line.name = `air-particles-wavefront-${index}`;
  line.renderOrder = 4;
  line.visible = false;

  scene.add(line);

  return { geometry, material, line };
}

const wavefronts = [
  createWavefront(0, 0.95),
  createWavefront(1, 0.72),
  createWavefront(2, 0.5),
];

function setWavefrontRadius(
  wavefront: Wavefront,
  radius: number,
): void {
  if (radius <= 0.035) {
    wavefront.line.visible = false;
    return;
  }

  const positions: number[] = [];

  for (
    let index = 0;
    index <= WAVEFRONT_SEGMENTS;
    index += 1
  ) {
    const t = index / WAVEFRONT_SEGMENTS;
    const angle = -Math.PI / 2 + t * Math.PI;

    positions.push(
      SOURCE_X + radius * Math.cos(angle),
      SOURCE_Y + radius * Math.sin(angle),
      0.04,
    );
  }

  wavefront.geometry.setPositions(positions);
  wavefront.line.computeLineDistances();
  wavefront.line.visible = true;
}

function updateWavefronts(leadingRadius: number): void {
  for (let index = 0; index < WAVEFRONT_COUNT; index += 1) {
    setWavefrontRadius(
      wavefronts[index],
      leadingRadius - index * WAVELENGTH,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Playback                                                                   */
/* -------------------------------------------------------------------------- */

const farthestParticleDistance = particles.reduce(
  (maximum, particle) =>
    Math.max(maximum, particle.distanceFromSource),
  0,
);

const TRAVEL_SECONDS =
  (farthestParticleDistance + PACKET_LENGTH) / WAVE_SPEED;

let elapsed = 0;
let stopAnimation = (): void => {};

function showRestState(): void {
  writeParticleTransforms(null);

  for (const wavefront of wavefronts) {
    wavefront.line.visible = false;
  }

  scene.invalidate();
}

function showReducedMotionState(): void {
  writeParticleTransforms(null);

  setWavefrontRadius(wavefronts[0], 0.58);
  setWavefrontRadius(wavefronts[1], 1.03);
  setWavefrontRadius(wavefronts[2], 1.48);

  scene.invalidate();
}

function reset(): void {
  elapsed = 0;
  showRestState();
}

function startAnimation(): void {
  stopAnimation();

  stopAnimation = scene.onFrame(({ deltaTime }) => {
    elapsed += deltaTime;

    const cycleSeconds = TRAVEL_SECONDS + REST_SECONDS;
    const cycleTime = elapsed % cycleSeconds;

    if (cycleTime >= TRAVEL_SECONDS) {
      showRestState();
      return;
    }

    const leadingRadius = cycleTime * WAVE_SPEED;

    updateWavefronts(leadingRadius);
    writeParticleTransforms(leadingRadius);
    scene.invalidate();
  });
}

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

let started = false;

const visibilityObserver =
  prefersReducedMotion || typeof IntersectionObserver === "undefined"
    ? null
    : new IntersectionObserver(
        (entries) => {
          if (started) return;

          const entry = entries.find(
            (candidate) => candidate.target === canvas,
          );

          if (
            entry?.isIntersecting &&
            entry.intersectionRatio >= START_VISIBILITY_RATIO
          ) {
            started = true;
            visibilityObserver?.disconnect();
            startAnimation();
          }
        },
        {
          threshold: [0, START_VISIBILITY_RATIO, 1],
        },
      );

if (prefersReducedMotion) {
  showReducedMotionState();
} else if (visibilityObserver) {
  visibilityObserver.observe(canvas);
} else {
  started = true;
  startAnimation();
}

Object.assign(window, {
  airParticlesDemo: {
    scene,
    horn,
    rearCap,
    mouthRim,
    handle,
    particleMesh,
    particles,
    wavefronts,
    start: startAnimation,
    stop: () => stopAnimation(),
    reset,
  },
});

const destroy = (): void => {
  visibilityObserver?.disconnect();
  stopAnimation();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
