import {
  HUES,
  OrbitController3D,
  createLightingRig3D,
  createMathScene3D,
  createParametricSurface3D,
} from "../../../math-graphics";

const canvas =
  document.querySelector<HTMLCanvasElement>(
    "#klein-bottle-scene",
  );

if (!canvas) {
  throw new Error(
    'The canvas "#klein-bottle-scene" could not be found.',
  );
}

const scene = createMathScene3D(canvas, {
  cameraPosition: [5.8, 4.4, 7.4],
  target: [0, 0.15, 0],
  fovDegrees: 37,
  background: null,
  maxPixelRatio: 2,
});

const lights = createLightingRig3D({
  ambientIntensity: 0.30,
  hemisphereIntensity: 0.94,
  keyIntensity: 2.5,
  keyPosition: [5.5, 7.5, 5.2],
  fillIntensity: 0.80,
  fillPosition: [-5.0, 3.0, -4.2],
});

const R = 1.0;
const SCALE = 0.145;

/*
 * Classical bottle-shaped immersion of the Klein bottle in R^3.
 *
 * 0 <= u <= 2π,
 * 0 <= v < 2π.
 *
 * For 0 <= u < π:
 *
 * x = 6 cos(u)(1 + sin(u))
 *     + 4R(1 - cos(u)/2) cos(u) cos(v)
 *
 * y = 16 sin(u)
 *     + 4R(1 - cos(u)/2) sin(u) cos(v)
 *
 * z = 4R(1 - cos(u)/2) sin(v)
 *
 * For π <= u <= 2π:
 *
 * x = 6 cos(u)(1 + sin(u))
 *     - 4R(1 - cos(u)/2) cos(v)
 *
 * y = 16 sin(u)
 *
 * z = 4R(1 - cos(u)/2) sin(v)
 */
const kleinBottle = createParametricSurface3D({
  name: "klein-bottle",

  surface: (u, v) => {
    const sinU = Math.sin(u);
    const cosU = Math.cos(u);
    const cosV = Math.cos(v);
    const sinV = Math.sin(v);

    const tubeRadius =
      4 * R * (1 - cosU / 2);

    let x: number;
    let y: number;

    if (u < Math.PI) {
      x =
        6 * cosU * (1 + sinU) +
          tubeRadius * cosU * cosV;

      y =
        16 * sinU +
          tubeRadius * sinU * cosV;
    } else {
      x =
        6 * cosU * (1 + sinU) -
          tubeRadius * cosV;

      y =
        16 * sinU;
    }

    const z =
      tubeRadius * sinV;

    return [
      SCALE * x,
      SCALE * y,
      SCALE * z,
    ];
  },

  uDomain: [0, Math.PI * 2],
  vDomain: [0, Math.PI * 2],

  uSegments: 240,
  vSegments: 96,

  wrapU: false,
  wrapV: true,

  style: {
    color: HUES.purple.base,
    opacity: 0.48,
    roughness: 0.32,
    metalness: 0.02,

    wireframe: true,
    wireframeColor: HUES.magenta.soft,
    wireframeOpacity: 0.22,
  },
});

kleinBottle.setRotation(
  -0.08,
  -0.32,
  0.02,
);

scene.add(
  lights,
  kleinBottle,
);

const orbit =
  new OrbitController3D(
    scene,
    {
      target: [0, 0.15, 0],
      minDistance: 4.2,
      maxDistance: 16,
      /*
       * This gives the widest motion the current OrbitController3D supports.
       * It still is an orbit controller, not a free-roll / trackball controller,
       * so it cannot perform a true roll around the view axis or pass cleanly
       * through the poles.
       */
      minPolarAngle: 0.001,
      maxPolarAngle: Math.PI - 0.001,
    },
  );

const destroy = (): void => {
  orbit.destroy();
  scene.destroy();
};

window.addEventListener(
  "pagehide",
  destroy,
  { once: true },
);

document.addEventListener(
  "astro:before-swap",
  destroy,
  { once: true },
);
