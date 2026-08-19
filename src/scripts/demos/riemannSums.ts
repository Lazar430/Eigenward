import {
  HUES,
  createCoordinatePlane2D,
  createFunctionGraph2D,
  createMathScene2D,
  createPolygon2D,
  createTextLabel2D,
  createVector2D,
} from "../math-graphics";

type SumMode = "lower" | "upper";

const INTERVAL_START = -2.4;
const INTERVAL_END = 2.4;
const MIN_RECTANGLES = 1;
const MAX_RECTANGLES = 64;
const INITIAL_RECTANGLES = 4;

const RECTANGLE_INTRO_STAGGER_SECONDS = 0.12;
const RECTANGLE_INTRO_RISE_SECONDS = 0.42;

/*
  Positive and strictly increasing on [INTERVAL_START, INTERVAL_END], so
  left-endpoint rectangles form a lower sum and right-endpoint rectangles
  form an upper sum.
*/
function f(x: number): number {
  return 0.11 * (x + 3) * (x + 3) + 0.65;
}

const canvas = document.querySelector<HTMLCanvasElement>("#riemann-sums");

if (!canvas) {
  throw new Error("The Riemann-sum demonstration canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  // Match the responsive function-graph laboratory scene: one mathematical
  // unit occupies a fixed number of CSS pixels and the visible domain follows
  // the canvas dimensions automatically.
  unitSizePixels: 55,
  center: [0, 0],
  background: null,
});

const coordinatePlane = createCoordinatePlane2D({
  name: "riemann-sums-coordinate-plane",
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
  name: "riemann-sums-function",
  equation: f,
  scene,
  samplesPerUnit: 90,
  minimumSegments: 480,
  maximumSegments: 2600,
  style: {
    color: HUES.gold.light,
    width: 3.4,
    opacity: 0.98,
  },
});

graph.setGraphTraceRange(0, 0);

const intervalLeftGuide = createVector2D({
  name: "riemann-sums-left-guide",
  start: [INTERVAL_START, 0],
  end: [INTERVAL_START, f(INTERVAL_START)],
  style: {
    color: HUES.gold.light,
    opacity: 0.35,
    shaftWidth: 0.018,
    headLength: 0,
    headWidth: 0,
  },
});

const intervalRightGuide = createVector2D({
  name: "riemann-sums-right-guide",
  start: [INTERVAL_END, 0],
  end: [INTERVAL_END, f(INTERVAL_END)],
  style: {
    color: HUES.gold.light,
    opacity: 0.35,
    shaftWidth: 0.018,
    headLength: 0,
    headWidth: 0,
  },
});

/*
  Every rectangle is one persistent unit square. Refining the partition changes
  only transforms, colors, and visibility; no rectangle geometry is rebuilt.
*/
const rectangles = Array.from({ length: MAX_RECTANGLES }, (_, index) => {
  const rectangle = createPolygon2D({
    name: `riemann-rectangle-${index}`,
    vertices: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    style: {
      fill: HUES.cyan.base,
      fillOpacity: 0.24,
      outline: HUES.cyan.light,
      outlineWidth: 1.25,
      outlineOpacity: 0.72,
    },
  });

  rectangle.position.z = 0.012;
  rectangle.hide();

  return rectangle;
});

const statusLabel = createTextLabel2D({
  name: "riemann-sums-status",
  text: "",
  position: [-4.35, 4.5],
  anchor: [0, 0.5],
  color: "rgba(232, 247, 255, 0.98)",
  fontSizePx: 15,
  fontWeight: 760,
  background: "rgba(17, 14, 30, 0.82)",
  border: "1px solid rgba(112, 231, 255, 0.18)",
  borderRadiusPx: 8,
  padding: "0.22rem 0.48rem",
});

statusLabel.hide();
intervalLeftGuide.hide();
intervalRightGuide.hide();

scene.add(
  coordinatePlane,
  ...rectangles,
  intervalLeftGuide,
  intervalRightGuide,
  graph,
  statusLabel,
);

let mode: SumMode = "lower";
let currentRectangleCount = INITIAL_RECTANGLES;
let approximationVisible = false;

function formatArea(value: number): string {
  return value.toFixed(4);
}

function rectangleColors(): {
  fill: string;
  outline: string;
} {
  return mode === "lower"
    ? {
        fill: HUES.cyan.base,
        outline: HUES.cyan.light,
      }
    : {
        fill: HUES.magenta.base,
        outline: HUES.magenta.light,
      };
}

function rectangleGeometry(index: number, count: number): {
  left: number;
  width: number;
  height: number;
} {
  const width = (INTERVAL_END - INTERVAL_START) / count;
  const left = INTERVAL_START + index * width;
  const right = left + width;
  const sampleX = mode === "lower" ? left : right;

  return {
    left,
    width,
    height: f(sampleX),
  };
}

function updateApproximation(): void {
  if (!approximationVisible) return;

  const n = currentRectangleCount;
  const colors = rectangleColors();

  let sum = 0;

  for (let index = 0; index < rectangles.length; index += 1) {
    const rectangle = rectangles[index];

    if (index >= n) {
      rectangle.hide();
      continue;
    }

    const { left, width, height } = rectangleGeometry(index, n);

    sum += width * height;

    rectangle
      .show()
      .setFillColor(colors.fill)
      .setOutlineColor(colors.outline)
      .setScale(width, height)
      .moveTo(left, 0);
  }

  const symbol = mode === "lower" ? "L" : "U";
  const modeText = mode === "lower" ? "Lower sum" : "Upper sum";

  statusLabel.setText(
    `${modeText} · n = ${n} · ${symbol}${n} ≈ ${formatArea(sum)}`,
  );
}

/* -------------------------------------------------------------------------- */
/* HTML controls overlaid on the MathCanvas2D shell                           */
/* -------------------------------------------------------------------------- */

const shell = canvas.parentElement;

if (!shell) {
  throw new Error("The Riemann-sum canvas requires a parent container.");
}

const controls = document.createElement("div");
controls.className = "riemann-sum-controls";

Object.assign(controls.style, {
  position: "absolute",
  right: "0.85rem",
  bottom: "0.85rem",
  zIndex: "30",
  display: "flex",
  alignItems: "center",
  gap: "0.7rem",
  padding: "0.55rem 0.65rem",
  border: "1px solid rgba(198, 180, 255, 0.22)",
  borderRadius: "0.8rem",
  background: "rgba(20, 16, 34, 0.88)",
  boxShadow: "0 0.65rem 1.6rem rgba(3, 1, 10, 0.24)",
  backdropFilter: "blur(8px)",
  opacity: "0",
  transform: "translateY(6px)",
  pointerEvents: "none",
  transition: "opacity 220ms ease, transform 220ms ease",
});

const sliderGroup = document.createElement("label");

Object.assign(sliderGroup.style, {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  color: "rgba(239, 234, 255, 0.9)",
  fontSize: "0.78rem",
  fontWeight: "720",
  whiteSpace: "nowrap",
});

const sliderText = document.createElement("span");
sliderText.textContent = `Rectangles: ${currentRectangleCount}`;

const rectangleSlider = document.createElement("input");
rectangleSlider.type = "range";
rectangleSlider.min = String(MIN_RECTANGLES);
rectangleSlider.max = String(MAX_RECTANGLES);
rectangleSlider.step = "1";
rectangleSlider.value = String(currentRectangleCount);
rectangleSlider.disabled = true;
rectangleSlider.setAttribute("aria-label", "Number of Riemann rectangles");

Object.assign(rectangleSlider.style, {
  width: "8.5rem",
  accentColor: HUES.cyan.light,
  cursor: "pointer",
});

sliderGroup.append(sliderText, rectangleSlider);

const toggleButton = document.createElement("button");
toggleButton.type = "button";
toggleButton.className = "riemann-sum-toggle";
toggleButton.disabled = true;

Object.assign(toggleButton.style, {
  padding: "0.42rem 0.62rem",
  border: "1px solid rgba(198, 180, 255, 0.24)",
  borderRadius: "0.65rem",
  background: "rgba(40, 31, 63, 0.92)",
  color: "#f7f4ff",
  font: "inherit",
  fontSize: "0.76rem",
  fontWeight: "760",
  letterSpacing: "0.015em",
  cursor: "pointer",
  whiteSpace: "nowrap",
});

function updateButtonText(): void {
  toggleButton.textContent =
    mode === "lower" ? "Switch to upper sum" : "Switch to lower sum";

  toggleButton.setAttribute(
    "aria-label",
    mode === "lower"
      ? "Switch the Riemann approximation to the upper sum"
      : "Switch the Riemann approximation to the lower sum",
  );

  toggleButton.setAttribute("aria-pressed", mode === "upper" ? "true" : "false");
}

rectangleSlider.addEventListener("input", () => {
  currentRectangleCount = Number(rectangleSlider.value);
  sliderText.textContent = `Rectangles: ${currentRectangleCount}`;
  updateApproximation();
});

toggleButton.addEventListener("mouseenter", () => {
  if (!toggleButton.disabled) {
    toggleButton.style.borderColor = "rgba(145, 239, 255, 0.48)";
  }
});

toggleButton.addEventListener("mouseleave", () => {
  toggleButton.style.borderColor = "rgba(198, 180, 255, 0.24)";
});

toggleButton.addEventListener("click", () => {
  mode = mode === "lower" ? "upper" : "lower";
  updateButtonText();
  updateApproximation();
});

controls.append(sliderGroup, toggleButton);
shell.append(controls);

updateButtonText();

/* -------------------------------------------------------------------------- */
/* Intro: axes -> integer labels -> complete function graph -> approximation   */
/* -------------------------------------------------------------------------- */

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(value: number): number {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(value: number): number {
  const t = clamp01(value);
  const c1 = 1.70158;
  const c3 = c1 + 1;

  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

let stopRectangleIntro = (): void => {};

function revealApproximation(): void {
  if (approximationVisible) return;

  approximationVisible = true;

  intervalLeftGuide.show();
  intervalRightGuide.show();
  statusLabel.show();

  const colors = rectangleColors();
  const n = currentRectangleCount;

  let sum = 0;

  for (let index = 0; index < rectangles.length; index += 1) {
    const rectangle = rectangles[index];

    if (index >= n) {
      rectangle.hide();
      continue;
    }

    const { left, width, height } = rectangleGeometry(index, n);
    sum += width * height;

    rectangle
      .show()
      .setFillColor(colors.fill)
      .setOutlineColor(colors.outline)
      .setScale(width, 0)
      .moveTo(left, 0);
  }

  const symbol = mode === "lower" ? "L" : "U";
  const modeText = mode === "lower" ? "Lower sum" : "Upper sum";

  statusLabel.setText(
    `${modeText} · n = ${n} · ${symbol}${n} ≈ ${formatArea(sum)}`,
  );

  let rectangleIntroStartTime: number | null = null;

  stopRectangleIntro = scene.onFrame(({ time }) => {
    rectangleIntroStartTime ??= time;
    const elapsed = (time - rectangleIntroStartTime) / 1000;

    let allComplete = true;

    for (let index = 0; index < n; index += 1) {
      const { left, width, height } = rectangleGeometry(index, n);
      const localElapsed =
        elapsed - index * RECTANGLE_INTRO_STAGGER_SECONDS;
      const progress = clamp01(
        localElapsed / RECTANGLE_INTRO_RISE_SECONDS,
      );

      if (progress < 1) {
        allComplete = false;
      }

      rectangles[index]
        .setScale(width, height * easeOutBack(progress))
        .moveTo(left, 0);
    }

    if (!allComplete) return;

    rectangleSlider.disabled = false;
    toggleButton.disabled = false;

    controls.style.opacity = "1";
    controls.style.transform = "translateY(0)";
    controls.style.pointerEvents = "auto";

    stopRectangleIntro();
  });
}

let introStartTime: number | null = null;
let stopIntro = (): void => {};

stopIntro = scene.onFrame(({ time }) => {
  introStartTime ??= time;
  const elapsed = (time - introStartTime) / 1000;

  const axisProgress = easeOutCubic(elapsed / 1.15);
  const integerProgress = easeOutCubic((elapsed - 0.95) / 0.9);
  const graphProgress = easeOutCubic((elapsed - 1.65) / 2.35);

  coordinatePlane.setAxisReveal(axisProgress);
  coordinatePlane.setIntegerReveal(integerProgress);
  graph.setGraphTraceRange(0, graphProgress);

  if (
    axisProgress >= 1 &&
    integerProgress >= 1 &&
    graphProgress >= 1
  ) {
    graph.showCompleteGraph();
    revealApproximation();
    stopIntro();
  }
});

Object.assign(window, {
  riemannSumsDemo: {
    scene,
    coordinatePlane,
    graph,
    rectangles,
    slider: rectangleSlider,
    getMode: () => mode,
    getRectangleCount: () => currentRectangleCount,
    setRectangleCount(count: number) {
      const nextCount = Math.min(
        MAX_RECTANGLES,
        Math.max(MIN_RECTANGLES, Math.round(count)),
      );

      currentRectangleCount = nextCount;
      rectangleSlider.value = String(nextCount);
      sliderText.textContent = `Rectangles: ${nextCount}`;
      updateApproximation();
    },
    setMode(nextMode: SumMode) {
      mode = nextMode;
      updateButtonText();
      updateApproximation();
    },
  },
});

const destroy = (): void => {
  stopIntro();
  stopRectangleIntro();
  controls.remove();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
