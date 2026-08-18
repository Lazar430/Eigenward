import {
  compileSvgTextToFourierDrawing2D,
  downloadFourierDrawingAsset2D,
} from "../math-graphics";

const svgUrl = new URL(
  "./assets/fourier.svg",
  import.meta.url,
);

async function compile(): Promise<void> {
  const response = await fetch(svgUrl);
  const svgText = await response.text();

  const result = compileSvgTextToFourierDrawing2D(svgText, {
    sourceSampleCount: 4096,
    termCount: 201,
    traceSampleCount: 1800,
    targetSpan: 4.6,
  });

  console.table(result.diagnostics);

  downloadFourierDrawingAsset2D(
    result.asset,
    "fourier.fourier.json",
  );
}

void compile();
