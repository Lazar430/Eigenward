import {
  HUES,
  OrbitController3D,
  createLightingRig3D,
  createMathScene3D,
  createParametricSurface3D,
} from "../../../math-graphics";

const canvas =
  document.querySelector<HTMLCanvasElement>(
    "#mobius-strip-scene",
  );

if (!canvas) {
  throw new Error(
    'The canvas "#mobius-strip-scene" could not be found.',
  );
}

const scene = createMathScene3D(canvas, {
  cameraPosition: [5.5, 3.7, 6.8],
  target: [0, 0, 0],
  fovDegrees: 38,
  background: null,
  maxPixelRatio: 2,
});

const lights = createLightingRig3D({
  ambientIntensity: 0.30,
  hemisphereIntensity: 0.92,
  keyIntensity: 2.35,
  keyPosition: [5.5, 7.0, 5.5],
  fillIntensity: 0.75,
  fillPosition: [-4.5, 2.8, -4.0],
});

const R = 1.72;
const HALF_WIDTH = 0.62;

/*
 * Möbius strip:
 *
 * x(u,v) = (R + v cos(u/2)) cos u
 * y(u,v) = v sin(u/2)
 * z(u,v) = (R + v cos(u/2)) sin u
 *
 * 0 <= u <= 2π,
 * -w <= v <= w.
 *
 * At u = 0 and u = 2π the strip closes with v identified with -v.
 */
const mobius = createParametricSurface3D({
  name: "mobius-strip",
  surface: (u, v) => {
    const radial =
      R + v * Math.cos(u / 2);

    return [
      radial * Math.cos(u),
      v * Math.sin(u / 2),
      radial * Math.sin(u),
    ];
  },
  uDomain: [0, Math.PI * 2],
  vDomain: [-HALF_WIDTH, HALF_WIDTH],
  uSegments: 180,
  vSegments: 42,

  /*
   * The ordinary engine sampler has direct periodic wrapping only.
   * A Möbius seam is twisted (v -> -v), so we leave u unwrapped here.
   * The two boundary curves occupy the same geometric seam.
   */
  wrapU: false,
  wrapV: false,

  style: {
    color: HUES.cyan.base,
    roughness: 0.34,
    metalness: 0.03,
    wireframe: true,
    wireframeColor: HUES.cyan.soft,
    wireframeOpacity: 0.14,
  },
});

mobius.setRotation(-0.28, 0.18, 0.12);

scene.add(lights, mobius);

const orbit = new OrbitController3D(scene, {
  target: [0, 0, 0],
  minDistance: 3.8,
  maxDistance: 15,
});

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
