import {
  HUES,
  createFourierDrawingPlayer2D,
  createMathScene2D,
  loadFourierDrawingAsset2D,
} from "../math-graphics";
import {
  createManagedAnimationHandle,
  installManagedAnimationAutoMount,
  type ManagedAnimationHandle,
} from "../math-graphics/animation/ManagedAnimationHandle";

export async function mountFourierEpicycles(
  canvas: HTMLCanvasElement,
): Promise<ManagedAnimationHandle> {
  const assetUrl = new URL(
    "./assets/fourier.fourier.json",
    import.meta.url,
  );

  const asset = await loadFourierDrawingAsset2D(assetUrl);

  const scene = createMathScene2D(canvas, {
    viewHeight: 5.4,
    center: [0, 0],
    background: null,
  });

  const player = createFourierDrawingPlayer2D({
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

  const debugHandle = {
    scene,
    asset,
    player,
    replay: () => player.replay(),
    complete: () => player.complete(),
  };

  Object.assign(window, {
    fourierEpicycleBatch4: debugHandle,
  });

  return createManagedAnimationHandle(scene, {
    beforeDestroy() {
      player.destroy();
      if ((window as any).fourierEpicycleBatch4 === debugHandle) {
        delete (window as any).fourierEpicycleBatch4;
      }
    },
  });
}

installManagedAnimationAutoMount("#fourier-epicycles", mountFourierEpicycles);
