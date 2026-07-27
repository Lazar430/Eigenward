import {
  FunctionGraphPointerController2D,
  HUES,
  createCoordinatePlane2D,
  createFunctionGraph2D,
  createMathScene2D,
  createPointMarker2D,
  formatMathCoordinate2D,
  type FunctionAxisIntersection2D,
  type PointMarker2D,
  type Vec2Tuple,
} from "../math-graphics";

const canvas = document.querySelector<HTMLCanvasElement>(
  "#about-function-graph-scene",
);

if (!canvas) {
  throw new Error("The function-graph demonstration canvas could not be found.");
}

/*
 * Function definitions you can paste into `functionDefinition` below.
 * All of these are ordinary JavaScript functions; the graph engine only needs
 * a number in and a real number, NaN, or Infinity out.
 *
 * Powers:
 *   (x) => x ** 2
 *   (x) => x ** 3
 *   (x) => x ** 5 - 3 * x
 *
 * Real nth roots:
 *   (x) => Math.sqrt(x)                         // square root
 *   (x) => Math.cbrt(x)                         // cube root
 *   (x) => x < 0 ? Number.NaN : x ** (1 / 4)   // fourth root
 *   (x) => Math.sign(x) * Math.abs(x) ** (1 / 5)
 *
 * Exponentials:
 *   (x) => Math.exp(x)       // e^x
 *   (x) => 2 ** x
 *   (x) => 0.5 ** x
 *
 * Logarithms:
 *   (x) => Math.log(x)                         // ln x
 *   (x) => Math.log(x) / Math.log(2)           // log base 2
 *   (x) => Math.log10(x)                       // log base 10
 *
 * Rational functions:
 *   (x) => 1 / x
 *   (x) => (x + 1) / (x - 2)
 *   (x) => (x * x - 1) / (x * x - 4)
 *
 * Trigonometric functions:
 *   (x) => Math.sin(x)
 *   (x) => Math.cos(x)
 *   (x) => Math.tan(x)
 *   (x) => 1 / Math.cos(x)                     // sec x
 *   (x) => 1 / Math.sin(x)                     // csc x
 *   (x) => Math.cos(x) / Math.sin(x)           // cot x
 *
 * Inverse trigonometric functions:
 *   (x) => Math.asin(x)
 *   (x) => Math.acos(x)
 *   (x) => Math.atan(x)
 *
 * Absolute-value and piecewise examples:
 *   (x) => Math.abs(x)
 *   (x) => x < 0 ? -x - 1 : Math.sqrt(x)
 */
const functionDefinition = (x: number): number =>
  Math.abs(x)

const scene = createMathScene2D(canvas, {
  // One mathematical unit always occupies this many CSS pixels. The visible
  // x/y intervals now follow the actual canvas dimensions automatically.
  unitSizePixels: 25,
  center: [0, 0],
  background: null,
});

const coordinatePlane = createCoordinatePlane2D({
  name: "function-coordinate-plane",
  scene,
  edgePaddingPixels: 20,
  gridStep: 1,
  integerStep: 1,
  gridColor: 0x777087,
  gridOpacity: 0.2,
  axisColor: 0xeee9ff,
  axisOpacity: 0.9,
  axisWidth: 2.1,
  tickColor: 0xded7f2,
  tickOpacity: 0.8,
  tickLength: 0.12,
  labelColor: "rgba(239, 234, 255, 0.78)",
  labelFontSizePx: 12,
});
coordinatePlane.setAxisReveal(0);
coordinatePlane.setIntegerReveal(0);

const graph = createFunctionGraph2D({
  name: "sample-explicit-function",
  equation: functionDefinition,
  scene,
  samplesPerUnit: 90,
  minimumSegments: 480,
  maximumSegments: 2600,
  style: {
    color: HUES.cyan.light,
    width: 3.2,
    opacity: 0.98,
  },
});
graph.setGraphTraceRange(0, 0);

const selectedPoint = createPointMarker2D({
  name: "selected-function-point",
  position: [0, 0],
  radius: 0.105,
  fill: HUES.magenta.light,
  outline: 0x261328,
  outlineWidth: 0.03,
  label: {
    text: "(0, 0)",
    visibility: "always",
    offset: [0.16, 0.16],
    anchor: [0, 1],
    color: "rgba(255, 230, 248, 0.99)",
    fontSizePx: 13,
    fontWeight: 720,
    background: "rgba(37, 17, 43, 0.88)",
    border: "1px solid rgba(255, 126, 206, 0.3)",
    borderRadiusPx: 7,
    padding: "0.22rem 0.42rem",
  },
});
selectedPoint.hide();

scene.add(coordinatePlane, graph, selectedPoint);

interface IntersectionMarkerEntry {
  intersection: FunctionAxisIntersection2D;
  marker: PointMarker2D;
  revealProgress: number;
}

const intersectionStyle = {
  radius: 0.09,
  fill: HUES.gold.light,
  outline: 0x21172d,
  outlineWidth: 0.028,
} as const;

let intersectionEntries: IntersectionMarkerEntry[] = [];
let currentGraphReveal = 0;

function disposeIntersectionMarkers(): void {
  for (const { marker } of intersectionEntries) {
    scene.remove(marker);
    marker.dispose();
  }
  intersectionEntries = [];
}

function normalizedDomainPosition(x: number): number {
  const [minimumX, maximumX] = graph.getDomain();
  return (x - minimumX) / (maximumX - minimumX);
}

function labelPlacement(
  intersection: FunctionAxisIntersection2D,
): { offset: Vec2Tuple; anchor: Vec2Tuple } {
  if (intersection.axis === "both") {
    return { offset: [0.18, 0.18], anchor: [0, 1] };
  }

  if (intersection.axis === "x") {
    return { offset: [0, 0.2], anchor: [0.5, 1] };
  }

  return { offset: [0.18, 0], anchor: [0, 0.5] };
}

function updateIntersectionReveal(progress: number): void {
  currentGraphReveal = Math.min(1, Math.max(0, progress));

  for (const entry of intersectionEntries) {
    if (currentGraphReveal + 1e-8 >= entry.revealProgress) {
      entry.marker.show();
    } else {
      entry.marker.hide();
    }
  }
}

function rebuildIntersectionMarkers(): void {
  disposeIntersectionMarkers();

  const visibleBounds = scene.getViewBounds(12);
  const intersections = graph.findAxisIntersections({
    bounds: visibleBounds,
    rootTolerance: 1e-9,
  });

  intersectionEntries = intersections.map((intersection, index) => {
    const placement = labelPlacement(intersection);
    const marker = createPointMarker2D({
      name: `automatic-axis-intersection-${index}`,
      position: intersection.point,
      ...intersectionStyle,
      label: {
        text: formatMathCoordinate2D(intersection.point, {
          tolerance: 1e-6,
          maximumDenominator: 64,
          decimalPlaces: 4,
        }),
        visibility: "hover",
        offset: placement.offset,
        anchor: placement.anchor,
        color: "rgba(255, 242, 205, 0.98)",
        fontSizePx: 13,
        fontWeight: 700,
        background: "rgba(35, 25, 21, 0.86)",
        border: "1px solid rgba(255, 219, 121, 0.28)",
        borderRadiusPx: 7,
        padding: "0.22rem 0.4rem",
      },
    });

    marker.hide();
    scene.add(marker);

    return {
      intersection,
      marker,
      revealProgress: normalizedDomainPosition(intersection.point[0]),
    };
  });

  updateIntersectionReveal(currentGraphReveal);
}

const stopIntersectionUpdates = graph.onSamplesChanged(
  rebuildIntersectionMarkers,
);

function updateSelectedPoint(point: Vec2Tuple): void {
  const [x, y] = point;
  const bounds = scene.getViewBounds(24);
  const horizontalSign = x > bounds.right - 1.25 ? -1 : 1;
  const verticalSign = y > bounds.top - 0.8 ? -1 : 1;

  selectedPoint
    .show()
    .setPoint(point)
    .setLabelText(
      formatMathCoordinate2D(point, {
        tolerance: 1e-8,
        maximumDenominator: 24,
        decimalPlaces: 4,
        recognizePi: true,
      }),
    )
    .setLabelOffset([
      horizontalSign * 0.16,
      verticalSign * 0.16,
    ])
    .setLabelAnchor([
      horizontalSign > 0 ? 0 : 1,
      verticalSign > 0 ? 1 : 0,
    ]);
}

const graphPointer = new FunctionGraphPointerController2D({
  scene,
  graph,
  hitRadiusPixels: 16,
  hoverCursor: "crosshair",
  onPointChange: updateSelectedPoint,
  // The selected marker exists only during the active press/drag gesture.
  onPointRelease: () => selectedPoint.hide(),
});
graphPointer.setEnabled(false);

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(value: number): number {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

let introStartTime: number | null = null;
let stopIntro = (): void => {};

stopIntro = scene.onFrame(({ time }) => {
  if (introStartTime === null) introStartTime = time;
  const elapsed = (time - introStartTime) / 1000;

  const axisProgress = easeOutCubic(elapsed / 1.15);
  const integerProgress = easeOutCubic((elapsed - 0.95) / 0.9);
  const graphProgress = easeOutCubic((elapsed - 1.65) / 2.35);

  coordinatePlane.setAxisReveal(axisProgress);
  coordinatePlane.setIntegerReveal(integerProgress);
  graph.setGraphTraceRange(0, graphProgress);
  updateIntersectionReveal(graphProgress);

  if (
    axisProgress >= 1 &&
    integerProgress >= 1 &&
    graphProgress >= 1
  ) {
    graph.showCompleteGraph();
    updateIntersectionReveal(1);
    graphPointer.setEnabled(true);
    stopIntro();
  }
});

Object.assign(window, {
  mathFunctionGraphDemo: {
    scene,
    coordinatePlane,
    graph,
    selectedPoint,
    get intersections() {
      return intersectionEntries.map((entry) => entry.intersection);
    },
  },
});

const destroy = (): void => {
  stopIntro();
  stopIntersectionUpdates();
  graphPointer.destroy();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
