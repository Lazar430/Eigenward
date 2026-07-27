import type { Vec2Tuple } from "../core/types";

export interface MathNumberFormat2DOptions {
  tolerance?: number;
  maximumDenominator?: number;
  decimalPlaces?: number;
  recognizePi?: boolean;
}

function greatestCommonDivisor(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));

  while (y !== 0) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }

  return x || 1;
}

function approximateRational(
  value: number,
  maximumDenominator: number,
  tolerance: number,
): readonly [number, number] | null {
  let bestNumerator = 0;
  let bestDenominator = 1;
  let bestError = Number.POSITIVE_INFINITY;

  for (let denominator = 1; denominator <= maximumDenominator; denominator += 1) {
    const numerator = Math.round(value * denominator);
    const error = Math.abs(value - numerator / denominator);

    if (error < bestError) {
      bestError = error;
      bestNumerator = numerator;
      bestDenominator = denominator;
    }
  }

  if (bestError > tolerance * Math.max(1, Math.abs(value))) {
    return null;
  }

  const divisor = greatestCommonDivisor(bestNumerator, bestDenominator);
  return [bestNumerator / divisor, bestDenominator / divisor];
}

function formatFraction(numerator: number, denominator: number): string {
  if (denominator === 1) return String(numerator);
  return `${numerator}/${denominator}`;
}

/**
 * Numeric labels cannot perform symbolic algebra, but this formatter recognizes
 * integers, simple rational numbers, and rational multiples of π before falling
 * back to a concise decimal representation.
 */
export function formatMathNumber2D(
  value: number,
  options: MathNumberFormat2DOptions = {},
): string {
  const tolerance = Math.max(0, options.tolerance ?? 1e-7);
  const maximumDenominator = Math.max(
    1,
    Math.floor(options.maximumDenominator ?? 64),
  );
  const decimalPlaces = Math.max(0, Math.floor(options.decimalPlaces ?? 4));
  const recognizePi = options.recognizePi ?? true;

  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) <= tolerance) return "0";

  const nearestInteger = Math.round(value);
  if (Math.abs(value - nearestInteger) <= tolerance) {
    return String(nearestInteger);
  }

  if (recognizePi) {
    const piMultiple = approximateRational(
      value / Math.PI,
      Math.min(maximumDenominator, 24),
      tolerance,
    );

    if (piMultiple) {
      const [numerator, denominator] = piMultiple;
      const sign = numerator < 0 ? "−" : "";
      const absoluteNumerator = Math.abs(numerator);
      const coefficient = absoluteNumerator === 1
        ? ""
        : String(absoluteNumerator);
      const top = `${sign}${coefficient}π`;
      return denominator === 1 ? top : `${top}/${denominator}`;
    }
  }

  const rational = approximateRational(
    value,
    maximumDenominator,
    tolerance,
  );
  if (rational) {
    return formatFraction(rational[0], rational[1]).replace("-", "−");
  }

  const rounded = Number(value.toFixed(decimalPlaces));
  return String(rounded).replace("-", "−");
}

export function formatMathCoordinate2D(
  point: Vec2Tuple,
  options: MathNumberFormat2DOptions = {},
): string {
  return `(${formatMathNumber2D(point[0], options)}, ${formatMathNumber2D(
    point[1],
    options,
  )})`;
}
