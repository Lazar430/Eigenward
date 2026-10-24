import katex from "katex";

import {
  HUES,
  createCoordinatePlane2D,
  createFunctionGraph2D,
  createMathScene2D,
  type FunctionGraph2D,
} from "../../../../math-graphics";

const CANVAS_SELECTOR = "#wave-equation";

const canvas = document.querySelector<HTMLCanvasElement>(CANVAS_SELECTOR);

if (!canvas) {
  throw new Error(
    `The wave-equation demonstration canvas (${CANVAS_SELECTOR}) could not be found.`,
  );
}

const shell = canvas.parentElement;

if (!shell) {
  throw new Error("The wave-equation canvas requires a parent container.");
}

const scene = createMathScene2D(canvas, {
  unitSizePixels: 48,
  center: [0, 0],
  background: null,
});

const coordinatePlane = createCoordinatePlane2D({
  name: "wave-equation-coordinate-plane",
  scene,
  edgePaddingPixels: 18,
  gridStep: 1,
  integerStep: 1,
  gridColor: 0x777087,
  gridOpacity: 0.17,
  axisColor: 0xeee9ff,
  axisOpacity: 0.88,
  axisWidth: 2,
  tickColor: 0xded7f2,
  tickOpacity: 0.72,
  tickLength: 0.11,
  labelColor: "rgba(239, 234, 255, 0.72)",
  labelFontSizePx: 11,
});

scene.add(coordinatePlane);

/* -------------------------------------------------------------------------- */
/* Wave model                                                                 */
/* -------------------------------------------------------------------------- */

/*
  Canonical travelling sinusoidal wave:

      y(x,t) = A sin(kx - ωt + φ)

  A   amplitude
  k   wave number
  ω   angular frequency
  φ   phase constant

  Derived quantities:
      wavelength λ = 2π/k
      ordinary frequency f = ω/(2π)
      phase speed v = ω/k
*/

let amplitude = 1.35;
let waveNumber = 1.35;
let angularFrequency = 2.6;
let phase = 0;
let time = 0;

const GRAPH_DOMAIN: [number, number] = [-24, 24];

function createWaveGraph(): FunctionGraph2D {
  const capturedAmplitude = amplitude;
  const capturedWaveNumber = waveNumber;

  return createFunctionGraph2D({
    name: "interactive-physics-wave",
    equation: (x: number) =>
      capturedAmplitude * Math.sin(capturedWaveNumber * x),
    domain: GRAPH_DOMAIN,
    segments: 2600,
    style: {
      color: HUES.cyan.light,
      width: 3.35,
      opacity: 0.99,
    },
  });
}

let graph = createWaveGraph();
scene.add(graph);

function wavelength(): number {
  return (Math.PI * 2) / waveNumber;
}

function ordinaryFrequency(): number {
  return angularFrequency / (Math.PI * 2);
}

function phaseSpeed(): number {
  return angularFrequency / waveNumber;
}

function wrapSymmetric(value: number, period: number): number {
  if (!(period > 0)) return 0;

  return (
    ((value + period / 2) % period + period) % period -
    period / 2
  );
}

function updateGraphTransform(): void {
  /*
    The stored graph is A sin(kx). Translating it horizontally by s displays

      A sin(k(x - s)).

    Choosing

      s = (ωt - φ)/k

    therefore gives exactly A sin(kx - ωt + φ).
  */
  const lambda = wavelength();
  const rawShift =
    (angularFrequency * time - phase) / waveNumber;

  graph.moveTo(
    wrapSymmetric(rawShift, lambda),
    0,
  );
}

function rebuildGraph(): void {
  scene.remove(graph);
  graph.dispose();

  graph = createWaveGraph();
  scene.add(graph);

  updateGraphTransform();
}

updateGraphTransform();

/* -------------------------------------------------------------------------- */
/* Formula/status overlay                                                     */
/* -------------------------------------------------------------------------- */

const formulaPanel = document.createElement("div");
formulaPanel.className = "wave-equation-formula";

Object.assign(formulaPanel.style, {
  position: "absolute",
  left: "0.75rem",
  top: "0.75rem",
  zIndex: "35",
  maxWidth: "calc(100% - 1.5rem)",
  padding: "0.55rem 0.72rem",
  border: "1px solid rgba(198, 180, 255, 0.2)",
  borderRadius: "0.75rem",
  background: "rgba(16, 12, 28, 0.82)",
  boxShadow: "0 0.55rem 1.5rem rgba(3, 1, 10, 0.2)",
  backdropFilter: "blur(8px)",
  pointerEvents: "none",
});

const formula = document.createElement("div");

Object.assign(formula.style, {
  color: "rgba(246, 244, 255, 0.98)",
  fontSize: "clamp(0.78rem, 1.65vw, 1rem)",
  overflowX: "auto",
  whiteSpace: "nowrap",
});

const derivedReadout = document.createElement("div");

Object.assign(derivedReadout.style, {
  marginTop: "0.28rem",
  color: "rgba(239, 234, 255, 0.62)",
  fontSize: "0.69rem",
  fontWeight: "650",
  letterSpacing: "0.025em",
  whiteSpace: "nowrap",
});

formulaPanel.append(formula, derivedReadout);
shell.append(formulaPanel);

function renderFormula(): void {
  formula.innerHTML = katex.renderToString(
    String.raw`y(x,t)=A\sin(kx-\omega t+\varphi)`,
    {
      throwOnError: false,
      displayMode: false,
    },
  );

  derivedReadout.textContent =
    `A=${amplitude.toFixed(2)} · ` +
    `k=${waveNumber.toFixed(2)} · ` +
    `ω=${angularFrequency.toFixed(2)} · ` +
    `φ=${phase.toFixed(2)} rad · ` +
    `λ=${wavelength().toFixed(2)} · ` +
    `f=${ordinaryFrequency().toFixed(2)} Hz · ` +
    `v=${phaseSpeed().toFixed(2)}`;
}

/* -------------------------------------------------------------------------- */
/* Sliders                                                                    */
/* -------------------------------------------------------------------------- */

interface SliderConfig {
  symbol: string;
  description: string;
  min: number;
  max: number;
  step: number;
  get: () => number;
  set: (value: number) => void;
  format?: (value: number) => string;
}

const controls = document.createElement("div");
controls.className = "wave-equation-controls";

Object.assign(controls.style, {
  position: "absolute",
  left: "50%",
  bottom: "0.7rem",
  zIndex: "40",
  width: "min(92%, 38rem)",
  transform: "translateX(-50%)",
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "0.48rem 0.8rem",
  padding: "0.65rem 0.75rem",
  border: "1px solid rgba(198, 180, 255, 0.22)",
  borderRadius: "0.85rem",
  background: "rgba(20, 16, 34, 0.9)",
  boxShadow: "0 0.7rem 1.8rem rgba(3, 1, 10, 0.27)",
  backdropFilter: "blur(9px)",
});

function makeSlider(config: SliderConfig): HTMLInputElement {
  const label = document.createElement("label");

  Object.assign(label.style, {
    display: "grid",
    gridTemplateColumns: "auto minmax(4.5rem, 1fr)",
    alignItems: "center",
    gap: "0.38rem",
    minWidth: "0",
    color: "rgba(239, 234, 255, 0.9)",
    fontSize: "0.72rem",
    fontWeight: "700",
  });

  const text = document.createElement("span");
  text.style.whiteSpace = "nowrap";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = String(config.min);
  slider.max = String(config.max);
  slider.step = String(config.step);
  slider.value = String(config.get());
  slider.setAttribute(
    "aria-label",
    `${config.description} (${config.symbol})`,
  );

  Object.assign(slider.style, {
    width: "100%",
    minWidth: "0",
    accentColor: HUES.cyan.light,
    cursor: "pointer",
  });

  const updateLabel = (): void => {
    const value = config.get();
    const formatted =
      config.format?.(value) ?? value.toFixed(2);

    text.textContent = `${config.symbol}: ${formatted}`;
  };

  slider.addEventListener("input", () => {
    config.set(Number(slider.value));
    updateLabel();
    renderFormula();
  });

  updateLabel();
  label.append(text, slider);
  controls.append(label);

  return slider;
}

const amplitudeSlider = makeSlider({
  symbol: "A",
  description: "Amplitude",
  min: 0,
  max: 3,
  step: 0.05,
  get: () => amplitude,
  set: (value) => {
    amplitude = value;
    rebuildGraph();
  },
});

const waveNumberSlider = makeSlider({
  symbol: "k",
  description: "Wave number",
  min: 0.45,
  max: 4,
  step: 0.05,
  get: () => waveNumber,
  set: (value) => {
    waveNumber = value;
    rebuildGraph();
  },
});

const angularFrequencySlider = makeSlider({
  symbol: "ω",
  description: "Angular frequency",
  min: 0,
  max: 8,
  step: 0.05,
  get: () => angularFrequency,
  set: (value) => {
    angularFrequency = value;
    updateGraphTransform();
  },
});

const phaseSlider = makeSlider({
  symbol: "φ",
  description: "Phase constant",
  min: -Math.PI,
  max: Math.PI,
  step: 0.05,
  get: () => phase,
  set: (value) => {
    phase = value;
    updateGraphTransform();
  },
  format: (value) => `${value.toFixed(2)} rad`,
});

/* -------------------------------------------------------------------------- */
/* Playback controls                                                          */
/* -------------------------------------------------------------------------- */

const buttonRow = document.createElement("div");

Object.assign(buttonRow.style, {
  gridColumn: "1 / -1",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.5rem",
  marginTop: "0.1rem",
});

const playButton = document.createElement("button");
playButton.type = "button";

const resetButton = document.createElement("button");
resetButton.type = "button";
resetButton.textContent = "Reset";

for (const button of [playButton, resetButton]) {
  Object.assign(button.style, {
    padding: "0.35rem 0.58rem",
    border: "1px solid rgba(198, 180, 255, 0.24)",
    borderRadius: "0.58rem",
    background: "rgba(40, 31, 63, 0.94)",
    color: "#f7f4ff",
    font: "inherit",
    fontSize: "0.69rem",
    fontWeight: "760",
    cursor: "pointer",
  });
}

const timeReadout = document.createElement("span");

Object.assign(timeReadout.style, {
  flex: "1",
  textAlign: "center",
  color: "rgba(239, 234, 255, 0.62)",
  fontSize: "0.68rem",
  fontVariantNumeric: "tabular-nums",
});

buttonRow.append(playButton, timeReadout, resetButton);
controls.append(buttonRow);
shell.append(controls);

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

let playing = !prefersReducedMotion;
let stopClock = (): void => {};

function updatePlaybackUI(): void {
  playButton.textContent = playing ? "Pause" : "Play";
  playButton.setAttribute(
    "aria-label",
    playing
      ? "Pause wave animation"
      : "Play wave animation",
  );

  timeReadout.textContent = `t = ${time.toFixed(2)} s`;
}

function stopPlaybackClock(): void {
  stopClock();
  stopClock = (): void => {};
}

function startPlaybackClock(): void {
  stopPlaybackClock();

  if (!playing) return;

  stopClock = scene.onFrame(({ deltaTime }) => {
    time += deltaTime;
    updateGraphTransform();
    updatePlaybackUI();
  });
}

playButton.addEventListener("click", () => {
  playing = !playing;
  updatePlaybackUI();

  if (playing) {
    startPlaybackClock();
  } else {
    stopPlaybackClock();
  }
});

resetButton.addEventListener("click", () => {
  amplitude = 1.35;
  waveNumber = 1.35;
  angularFrequency = 2.6;
  phase = 0;
  time = 0;

  amplitudeSlider.value = String(amplitude);
  waveNumberSlider.value = String(waveNumber);
  angularFrequencySlider.value = String(angularFrequency);
  phaseSlider.value = String(phase);

  rebuildGraph();
  renderFormula();
  updatePlaybackUI();
});

renderFormula();
updatePlaybackUI();

if (playing) {
  startPlaybackClock();
}

Object.assign(window, {
  waveEquationDemo: {
    scene,
    coordinatePlane,
    get graph() {
      return graph;
    },
    controls,
    formulaPanel,
    play() {
      if (!playing) {
        playing = true;
        updatePlaybackUI();
        startPlaybackClock();
      }
    },
    pause() {
      playing = false;
      updatePlaybackUI();
      stopPlaybackClock();
    },
    reset() {
      resetButton.click();
    },
  },
});

const destroy = (): void => {
  stopPlaybackClock();
  controls.remove();
  formulaPanel.remove();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
