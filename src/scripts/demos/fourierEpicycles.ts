import {
  HUES,
  createFourierDrawingPlayer2D,
  createMathScene2D,
  loadFourierDrawingAsset2D,
  type FourierDrawingPlayer2D,
  type MathScene2D,
} from "../math-graphics";

const canvas = document.querySelector<HTMLCanvasElement>("#fourier-epicycles");

if (!canvas) {
  throw new Error("The Fourier epicycle test canvas could not be found.");
}

let scene: MathScene2D | null = null;
let player: FourierDrawingPlayer2D | null = null;
let destroyed = false;

async function initialize(): Promise<void> {
  const assetUrl = new URL(
    "./assets/fourier.fourier.json",
    import.meta.url,
  );
  const asset = await loadFourierDrawingAsset2D(assetUrl);

  if (destroyed) return;

  scene = createMathScene2D(canvas, {
    viewHeight: 5.4,
    center: [0, 0],
    background: null,
  });

  player = createFourierDrawingPlayer2D({
    name: "fourier-batch4-portrait",
    scene,
    asset,
    totalDrawSeconds: 4.6,
    fadeSeconds: 0.36,
    minimumStrokeSeconds: 0.18,
    visibilityThreshold: 0.2,
    autoplay: true,
    pauseWhenBelowThreshold: true,
    reducedMotion: "complete",
    style: {
      circleColor: HUES.purple.light,
      circleWidth: 1.2,
      circleOpacity: 0.30,
      vectorColor: HUES.gold.light,
      vectorOpacity: 0.82,
      vectorShaftWidth: 0.022,
      vectorHeadLength: 0.12,
      vectorHeadWidth: 0.086,
      traceColor: HUES.cyan.light,
      traceWidth: 3.1,
      traceOpacity: 0.98,
      tipColor: HUES.cyan.base,
      tipOpacity: 0.96,
      tipRadius: 0.05,
      minimumVisibleRadius: 0.009,
    },
  });

  Object.assign(window, {
    fourierEpicycleBatch4: {
      scene,
      asset,
      player,
      replay: () => player?.replay(),
      complete: () => player?.complete(),
    },
  });
}

void initialize().catch((error) => {
  console.error("Could not initialize the Fourier epicycle demo.", error);
});

const destroy = (): void => {
  if (destroyed) return;
  destroyed = true;
  player?.destroy();
  player = null;
  scene?.destroy();
  scene = null;
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
