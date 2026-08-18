import {
  FOURIER_DRAWING_ASSET_VERSION_2D,
  type FourierCoefficient2D,
  type FourierDrawing2DAsset,
  type FourierStroke2DAsset,
} from "../geometry/fourierSeries2D";
import type { Vec2Tuple } from "../core/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  return value;
}

function finiteInteger(value: unknown, label: string): number {
  const number = finiteNumber(value, label);
  if (!Number.isInteger(number)) {
    throw new TypeError(`${label} must be an integer.`);
  }
  return number;
}

function parsePoint(value: unknown, label: string): Vec2Tuple {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new TypeError(`${label} must be a two-number array.`);
  }

  return [
    finiteNumber(value[0], `${label}[0]`),
    finiteNumber(value[1], `${label}[1]`),
  ];
}

function parseCoefficient(
  value: unknown,
  label: string,
): FourierCoefficient2D {
  if (!isRecord(value)) {
    throw new TypeError(`${label} must be an object.`);
  }

  return {
    frequency: finiteInteger(value.frequency, `${label}.frequency`),
    real: finiteNumber(value.real, `${label}.real`),
    imaginary: finiteNumber(value.imaginary, `${label}.imaginary`),
  };
}

function parseStroke(value: unknown, index: number): FourierStroke2DAsset {
  const label = `strokes[${index}]`;

  if (!isRecord(value)) {
    throw new TypeError(`${label} must be an object.`);
  }

  if (typeof value.closed !== "boolean") {
    throw new TypeError(`${label}.closed must be boolean.`);
  }

  if (!Array.isArray(value.coefficients) || value.coefficients.length === 0) {
    throw new TypeError(`${label}.coefficients must be a non-empty array.`);
  }

  if (!Array.isArray(value.trace) || value.trace.length < 2) {
    throw new TypeError(`${label}.trace must contain at least two points.`);
  }

  let parameterRange: readonly [number, number] | undefined;
  if (value.parameterRange !== undefined) {
    if (!Array.isArray(value.parameterRange) || value.parameterRange.length !== 2) {
      throw new TypeError(`${label}.parameterRange must be a two-number array.`);
    }

    const start = finiteNumber(value.parameterRange[0], `${label}.parameterRange[0]`);
    const end = finiteNumber(value.parameterRange[1], `${label}.parameterRange[1]`);
    if (start === end) {
      throw new RangeError(`${label}.parameterRange must span a nonzero interval.`);
    }
    parameterRange = [start, end];
  }

  let durationWeight: number | undefined;
  if (value.durationWeight !== undefined) {
    durationWeight = finiteNumber(value.durationWeight, `${label}.durationWeight`);
    if (!(durationWeight > 0)) {
      throw new RangeError(`${label}.durationWeight must be greater than zero.`);
    }
  }

  if (value.id !== undefined && typeof value.id !== "string") {
    throw new TypeError(`${label}.id must be a string when supplied.`);
  }

  return {
    id: value.id as string | undefined,
    closed: value.closed,
    coefficients: value.coefficients.map((coefficient, coefficientIndex) =>
      parseCoefficient(coefficient, `${label}.coefficients[${coefficientIndex}]`),
    ),
    trace: value.trace.map((point, pointIndex) =>
      parsePoint(point, `${label}.trace[${pointIndex}]`),
    ),
    parameterRange,
    durationWeight,
  };
}

/**
 * Validate untrusted JSON before it reaches the renderer.
 *
 * Published Fourier assets are plain numeric data, but they may still come from
 * fetch(), CMS content, or hand-edited files. Keeping validation at this I/O
 * boundary lets the rest of the engine work with a trustworthy typed asset.
 */
export function parseFourierDrawingAsset2D(value: unknown): FourierDrawing2DAsset {
  if (!isRecord(value)) {
    throw new TypeError("Fourier drawing asset must be an object.");
  }

  if (value.version !== FOURIER_DRAWING_ASSET_VERSION_2D) {
    throw new RangeError(
      `Unsupported Fourier drawing asset version ${String(value.version)}. ` +
        `Expected ${FOURIER_DRAWING_ASSET_VERSION_2D}.`,
    );
  }

  if (!Array.isArray(value.strokes) || value.strokes.length === 0) {
    throw new TypeError("Fourier drawing asset must contain at least one stroke.");
  }

  return {
    version: FOURIER_DRAWING_ASSET_VERSION_2D,
    strokes: value.strokes.map(parseStroke),
  };
}

export interface LoadFourierDrawingAsset2DOptions {
  fetchOptions?: RequestInit;
}

/** Load and validate a static .fourier.json runtime asset. */
export async function loadFourierDrawingAsset2D(
  source: string | URL,
  options: LoadFourierDrawingAsset2DOptions = {},
): Promise<FourierDrawing2DAsset> {
  const response = await fetch(source, options.fetchOptions);

  if (!response.ok) {
    throw new Error(
      `Could not load Fourier drawing asset (${response.status} ${response.statusText}).`,
    );
  }

  let value: unknown;
  try {
    value = await response.json();
  } catch (error) {
    throw new Error("Fourier drawing asset is not valid JSON.", { cause: error });
  }

  return parseFourierDrawingAsset2D(value);
}
