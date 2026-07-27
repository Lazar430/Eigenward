import {
  HUES,
  createMathScene2D,
  createParametricShape2D,
  type ParametricCurve2D,
} from "../math-graphics";

const trigCanvas =
  document.querySelector<HTMLCanvasElement>(
    "#about-curve-scene",
  );

if (!trigCanvas) {
  throw new Error(
    "The About-page trigonometry canvas could not be found.",
  );
}

const trigScene = createMathScene2D(trigCanvas, {
  viewHeight: 7.2,
  center: [0, 0],
  background: null,
});

/*
 * A parametric unit circle:
 *
 *     x(t) = cos(t)
 *     y(t) = sin(t)
 *
 * for 0 <= t <= 2π.

const unitCircle: ParametricCurve2D = (t) => [
  Math.cos(t),
  Math.sin(t),
];

const parametricCircle = createParametricShape2D({
  curve: unitCircle,
  domain: [0, 2 * Math.PI],
  segments: 160,

  style: {
    outline: HUES.gold.light,
    outlineWidth: 4,
    fill: HUES.gold.base,
    fillOpacity: 0.16,
  },
});

parametricCircle.resizeTo(1.6);

trigScene.add(parametricCircle);
*/

/*
const ellipse: ParametricCurve2D = (t) => [
  1.5 * Math.cos(t),
  0.8 * Math.sin(t),
];

const parametricEllipse =
  createParametricShape2D({
    curve: ellipse,
    domain: [0, 2 * Math.PI],
    segments: 160,
    style: {
      outline: HUES.cyan.light,
      outlineWidth: 4,
      fill: HUES.cyan.base,
      fillOpacity: 0.15,
    },
  });

trigScene.add(parametricEllipse);

trigScene.onFrame(({ time }) => {
  const seconds = time / 1000;

  parametricEllipse.setRotation(
    seconds * 2.5,
  );
});

 */


const trigCurve: ParametricCurve2D = (t) => [
  2 * Math.sin(3 * t),
  1.5 * Math.sin(2 * t),
];

const trigShape = createParametricShape2D({
  curve: trigCurve,
  domain: [0, 2 * Math.PI],
  segments: 300,

  style: {
    outline: HUES.magenta.light,
    outlineWidth: 3,
    fillOpacity: 0.1,
  },
});

trigScene.add(trigShape);

trigShape.traceOutline({
  speed: 0.25,
  loop: true,
  loopPause: 0.3,
});
