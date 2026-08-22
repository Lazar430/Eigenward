/* -------------------------------------------------------------------------- */
/* Measurement presentation                                                   */
/* -------------------------------------------------------------------------- */

export type MeasurementDisplayMode =
  | "raw"
  | "platonic";

export interface MeasurementDisplayControllerOptions {
  initialMode?: MeasurementDisplayMode;
}

export type MeasurementDisplayModeListener = (
  mode: MeasurementDisplayMode,
) => void;

/**
 * Reusable state holder for scenes that can switch between:
 *
 * raw:
 *   rounded approximations of the actual continuous geometry;
 *
 * platonic:
 *   deliberately idealized / jointly quantized measurements.
 *
 * The controller knows nothing about geometry or rendering.
 */
export class MeasurementDisplayController {
  private mode: MeasurementDisplayMode;
  private readonly listeners =
    new Set<MeasurementDisplayModeListener>();

  constructor({
    initialMode = "platonic",
  }: MeasurementDisplayControllerOptions = {}) {
    this.mode = initialMode;
  }

  getMode(): MeasurementDisplayMode {
    return this.mode;
  }

  setMode(mode: MeasurementDisplayMode): this {
    if (mode === this.mode) {
      return this;
    }

    this.mode = mode;

    for (const listener of this.listeners) {
      listener(mode);
    }

    return this;
  }

  toggleMode(): MeasurementDisplayMode {
    const nextMode: MeasurementDisplayMode =
      this.mode === "raw"
        ? "platonic"
        : "raw";

    this.setMode(nextMode);
    return nextMode;
  }

  subscribe(
    listener: MeasurementDisplayModeListener,
  ): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}

export function createMeasurementDisplayController(
  options: MeasurementDisplayControllerOptions = {},
): MeasurementDisplayController {
  return new MeasurementDisplayController(options);
}

/* -------------------------------------------------------------------------- */
/* Ordinary numeric formatting                                                */
/* -------------------------------------------------------------------------- */

export interface RoundedNumberFormatOptions {
  decimals?: number;
  trimTrailingZeros?: boolean;
}

export function roundToDecimals(
  value: number,
  decimals = 0,
): number {
  if (!Number.isFinite(value)) {
    return value;
  }

  const safeDecimals =
    Math.max(0, Math.floor(decimals));

  const factor = 10 ** safeDecimals;
  return Math.round(value * factor) / factor;
}

export function formatRoundedNumber(
  value: number,
  {
    decimals = 0,
    trimTrailingZeros = true,
  }: RoundedNumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }

  const safeDecimals =
    Math.max(0, Math.floor(decimals));

  const rounded =
    roundToDecimals(value, safeDecimals);

  if (!trimTrailingZeros) {
    return rounded.toFixed(safeDecimals);
  }

  if (Number.isInteger(rounded)) {
    return rounded.toFixed(0);
  }

  return rounded
    .toFixed(safeDecimals)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

export function quantizeToStep(
  value: number,
  step: number,
): number {
  if (
    !Number.isFinite(value) ||
    !(step > 0) ||
    !Number.isFinite(step)
  ) {
    return value;
  }

  return Math.round(value / step) * step;
}

/* -------------------------------------------------------------------------- */
/* Exact-total Platonic quantization                                          */
/* -------------------------------------------------------------------------- */

export interface QuantizePartitionToTotalOptions {
  /** Exact displayed total after quantization. */
  total: number;

  /** Quantization granularity. Default: 1. */
  step?: number;

  /** Optional minimum displayed value for every entry. */
  minimum?: number;
}

function assertFiniteArray(
  values: readonly number[],
  label: string,
): void {
  for (const value of values) {
    if (!Number.isFinite(value)) {
      throw new RangeError(
        `${label} must contain only finite numbers.`,
      );
    }
  }
}

/**
 * Quantize a list while preserving one exact total.
 *
 * The values are normalized to the requested total, rounded to the nearest
 * step, then any rounding discrepancy is redistributed one step at a time
 * toward whichever entry is currently furthest from its ideal value.
 *
 * Examples:
 *   triangle angles         -> total 180
 *   complementary angles    -> total 90
 *   angles around a point   -> total 360
 */
export function quantizePartitionToTotal(
  values: readonly number[],
  {
    total,
    step = 1,
    minimum = 0,
  }: QuantizePartitionToTotalOptions,
): number[] {
  if (values.length === 0) {
    return [];
  }

  assertFiniteArray(values, "values");

  if (!Number.isFinite(total)) {
    throw new RangeError(
      "total must be finite.",
    );
  }

  if (!(step > 0) || !Number.isFinite(step)) {
    throw new RangeError(
      "step must be positive and finite.",
    );
  }

  if (
    !(minimum >= 0) ||
    !Number.isFinite(minimum)
  ) {
    throw new RangeError(
      "minimum must be nonnegative and finite.",
    );
  }

  const targetUnits =
    Math.round(total / step);

  const minimumUnits =
    Math.ceil(minimum / step - 1e-12);

  if (
    minimumUnits * values.length >
    targetUnits
  ) {
    throw new RangeError(
      "The requested minimum leaves too few units to reach the total.",
    );
  }

  const positiveValues =
    values.map(
      (value) => Math.max(0, value),
    );

  const rawSum =
    positiveValues.reduce(
      (sum, value) => sum + value,
      0,
    );

  const idealUnits =
    rawSum > 0
      ? positiveValues.map(
          (value) =>
            (value / rawSum) *
            targetUnits,
        )
      : positiveValues.map(
          () =>
            targetUnits /
            values.length,
        );

  const units =
    idealUnits.map(
      (ideal) =>
        Math.max(
          minimumUnits,
          Math.round(ideal),
        ),
    );

  let currentTotal =
    units.reduce(
      (sum, value) => sum + value,
      0,
    );

  while (currentTotal !== targetUnits) {
    const direction =
      currentTotal < targetUnits
        ? 1
        : -1;

    let bestIndex = -1;
    let bestNeed =
      Number.NEGATIVE_INFINITY;

    for (
      let index = 0;
      index < units.length;
      index += 1
    ) {
      if (
        direction < 0 &&
        units[index] <= minimumUnits
      ) {
        continue;
      }

      const need =
        direction > 0
          ? idealUnits[index] -
            units[index]
          : units[index] -
            idealUnits[index];

      if (need > bestNeed) {
        bestNeed = need;
        bestIndex = index;
      }
    }

    if (bestIndex < 0) {
      throw new Error(
        "Could not satisfy the requested quantized total.",
      );
    }

    units[bestIndex] += direction;
    currentTotal += direction;
  }

  return units.map(
    (unitCount) =>
      roundToDecimals(
        unitCount * step,
        12,
      ),
  );
}

/* -------------------------------------------------------------------------- */
/* Angle presentation                                                         */
/* -------------------------------------------------------------------------- */

export interface AngleDisplayOptions {
  mode: MeasurementDisplayMode;
  rawDecimals?: number;
  platonicStepDegrees?: number;
  suffix?: string;
}

export function radiansToDegrees(
  radians: number,
): number {
  return radians * 180 / Math.PI;
}

function decimalPlacesForStep(
  step: number,
): number {
  if (
    !Number.isFinite(step) ||
    !(step > 0)
  ) {
    return 0;
  }

  const source = String(step);

  if (!source.includes(".")) {
    return 0;
  }

  return (
    source.length -
    source.indexOf(".") -
    1
  );
}

export function formatAngleRadians(
  radians: number,
  {
    mode,
    rawDecimals = 1,
    platonicStepDegrees = 1,
    suffix = "°",
  }: AngleDisplayOptions,
): string {
  const degrees =
    radiansToDegrees(radians);

  const displayed =
    mode === "platonic"
      ? quantizeToStep(
          degrees,
          platonicStepDegrees,
        )
      : degrees;

  const decimals =
    mode === "platonic"
      ? decimalPlacesForStep(
          platonicStepDegrees,
        )
      : rawDecimals;

  return (
    formatRoundedNumber(
      displayed,
      { decimals },
    ) +
    suffix
  );
}

export interface AnglePartitionDisplayOptions
  extends AngleDisplayOptions {
  /** Exact Platonic total. Default: 180°. */
  totalDegrees?: number;

  /** Minimum Platonic angle shown for every member. */
  minimumPlatonicDegrees?: number;
}

/**
 * Format a group of angles.
 *
 * Raw mode formats every real angle independently.
 *
 * Platonic mode jointly quantizes them so the displayed values satisfy the
 * requested total exactly.
 */
export function formatAnglePartitionRadians(
  anglesRadians: readonly number[],
  {
    mode,
    rawDecimals = 1,
    platonicStepDegrees = 1,
    totalDegrees = 180,
    minimumPlatonicDegrees = 0,
    suffix = "°",
  }: AnglePartitionDisplayOptions,
): string[] {
  if (mode === "raw") {
    return anglesRadians.map(
      (angle) =>
        formatAngleRadians(
          angle,
          {
            mode,
            rawDecimals,
            platonicStepDegrees,
            suffix,
          },
        ),
    );
  }

  const displayedDegrees =
    quantizePartitionToTotal(
      anglesRadians.map(
        radiansToDegrees,
      ),
      {
        total: totalDegrees,
        step: platonicStepDegrees,
        minimum:
          minimumPlatonicDegrees,
      },
    );

  const decimals =
    decimalPlacesForStep(
      platonicStepDegrees,
    );

  return displayedDegrees.map(
    (degrees) =>
      formatRoundedNumber(
        degrees,
        { decimals },
      ) +
      suffix,
  );
}


/* -------------------------------------------------------------------------- */
/* Order-preserving exact-total quantization                                  */
/* -------------------------------------------------------------------------- */

export interface QuantizeOrderedPartitionToTotalOptions
  extends QuantizePartitionToTotalOptions {
  /**
   * Values whose difference is at most this amount are treated as genuinely
   * equal and therefore receive exactly equal quantized outputs.
   *
   * This is especially useful for geometric measurements: equal sides produce
   * equal opposite angles, and floating-point noise should not split them.
   */
  equalityTolerance?: number;

  /**
   * Require distinct input groups to remain strictly ordered after
   * quantization. Default: true.
   *
   * Thus x < y implies Q(x) < Q(y), while x = y implies Q(x) = Q(y).
   */
  strictOrder?: boolean;
}

type OrderedQuantizationGroup = {
  indices: number[];
  multiplicity: number;
  idealUnits: number;
};

type OrderedQuantizationSolution = {
  cost: number;
  values: number[];
};

function approximatelyEqual(
  a: number,
  b: number,
  tolerance: number,
): boolean {
  return Math.abs(a - b) <= tolerance;
}

/**
 * Quantize a partition while preserving:
 *
 *   1. the exact requested total;
 *   2. equality classes;
 *   3. the ordering of distinct values.
 *
 * This is deliberately stronger than quantizePartitionToTotal(). It is useful
 * when the displayed numbers encode an actual mathematical relation rather
 * than merely needing to add to a total.
 *
 * Example for triangle annotations:
 *
 *   equal displayed sides
 *     => equal derived ideal angles
 *     => exactly equal integer angle labels
 *
 * and
 *
 *   longer displayed opposite side
 *     => larger integer angle label.
 *
 * Internally this solves a tiny discrete least-squares problem in integer
 * "step units". For the small partitions used by geometry scenes (2-4 values,
 * totals such as 90, 180 or 360) the search is negligible.
 */
export function quantizeOrderedPartitionToTotal(
  values: readonly number[],
  {
    total,
    step = 1,
    minimum = 0,
    equalityTolerance = 1e-9,
    strictOrder = true,
  }: QuantizeOrderedPartitionToTotalOptions,
): number[] {
  if (values.length === 0) {
    return [];
  }

  assertFiniteArray(values, "values");

  if (!Number.isFinite(total)) {
    throw new RangeError(
      "total must be finite.",
    );
  }

  if (!(step > 0) || !Number.isFinite(step)) {
    throw new RangeError(
      "step must be positive and finite.",
    );
  }

  if (
    !(minimum >= 0) ||
    !Number.isFinite(minimum)
  ) {
    throw new RangeError(
      "minimum must be nonnegative and finite.",
    );
  }

  if (
    !(equalityTolerance >= 0) ||
    !Number.isFinite(equalityTolerance)
  ) {
    throw new RangeError(
      "equalityTolerance must be nonnegative and finite.",
    );
  }

  const targetUnits =
    Math.round(total / step);

  const minimumUnits =
    Math.ceil(minimum / step - 1e-12);

  const positiveValues =
    values.map(
      (value) => Math.max(0, value),
    );

  const rawSum =
    positiveValues.reduce(
      (sum, value) => sum + value,
      0,
    );

  const idealUnits =
    rawSum > 0
      ? positiveValues.map(
          (value) =>
            (value / rawSum) *
            targetUnits,
        )
      : positiveValues.map(
          () =>
            targetUnits /
            values.length,
        );

  const sortedIndices =
    values
      .map((_, index) => index)
      .sort(
        (left, right) =>
          values[left] - values[right],
      );

  const groups: OrderedQuantizationGroup[] = [];

  for (const index of sortedIndices) {
    const previous =
      groups[groups.length - 1];

    if (
      previous &&
      approximatelyEqual(
        values[index],
        values[
          previous.indices[
            previous.indices.length - 1
          ]
        ],
        equalityTolerance,
      )
    ) {
      previous.indices.push(index);
      previous.multiplicity += 1;
      previous.idealUnits =
        previous.indices.reduce(
          (sum, memberIndex) =>
            sum +
            idealUnits[memberIndex],
          0,
        ) /
        previous.multiplicity;
    } else {
      groups.push({
        indices: [index],
        multiplicity: 1,
        idealUnits: idealUnits[index],
      });
    }
  }

  const minimumRequiredUnits =
    groups.reduce(
      (sum, group, groupIndex) =>
        sum +
        group.multiplicity *
          (
            minimumUnits +
            (
              strictOrder
                ? groupIndex
                : 0
            )
          ),
      0,
    );

  if (minimumRequiredUnits > targetUnits) {
    throw new RangeError(
      "The requested minimum/order constraints leave too few units to reach the total.",
    );
  }

  const memo =
    new Map<
      string,
      OrderedQuantizationSolution | null
    >();

  function solve(
    groupIndex: number,
    previousValue: number,
    remainingUnits: number,
  ): OrderedQuantizationSolution | null {
    if (groupIndex >= groups.length) {
      return remainingUnits === 0
        ? { cost: 0, values: [] }
        : null;
    }

    const key =
      `${groupIndex}|${previousValue}|${remainingUnits}`;

    if (memo.has(key)) {
      return memo.get(key) ?? null;
    }

    const group =
      groups[groupIndex];

    const minimumValue =
      groupIndex === 0
        ? minimumUnits
        : Math.max(
            minimumUnits,
            previousValue +
              (strictOrder ? 1 : 0),
          );

    const futureGroups =
      groups.slice(groupIndex + 1);

    let best:
      OrderedQuantizationSolution | null =
      null;

    const maximumValue =
      Math.floor(
        remainingUnits /
          group.multiplicity,
      );

    for (
      let candidate = minimumValue;
      candidate <= maximumValue;
      candidate += 1
    ) {
      const unitsAfterCurrent =
        remainingUnits -
        candidate *
          group.multiplicity;

      let minimumFutureUnits = 0;
      let futureMinimum = candidate;

      for (
        let futureIndex = 0;
        futureIndex < futureGroups.length;
        futureIndex += 1
      ) {
        futureMinimum +=
          strictOrder ? 1 : 0;

        futureMinimum =
          Math.max(
            futureMinimum,
            minimumUnits,
          );

        minimumFutureUnits +=
          futureMinimum *
          futureGroups[futureIndex]
            .multiplicity;
      }

      if (
        unitsAfterCurrent <
        minimumFutureUnits
      ) {
        break;
      }

      const tail = solve(
        groupIndex + 1,
        candidate,
        unitsAfterCurrent,
      );

      if (!tail) {
        continue;
      }

      const localError =
        candidate -
        group.idealUnits;

      const cost =
        group.multiplicity *
          localError *
          localError +
        tail.cost;

      if (
        !best ||
        cost < best.cost - 1e-12
      ) {
        best = {
          cost,
          values: [
            candidate,
            ...tail.values,
          ],
        };
      }
    }

    memo.set(key, best);
    return best;
  }

  const solution = solve(
    0,
    minimumUnits,
    targetUnits,
  );

  if (!solution) {
    /*
     * This can only happen for an arithmetically incompatible equality pattern
     * (for example, insisting that every one of two equal values sum to an odd
     * one-unit total). Fall back to the ordinary exact-total quantizer rather
     * than failing the entire scene.
     */
    return quantizePartitionToTotal(
      values,
      {
        total,
        step,
        minimum,
      },
    );
  }

  const outputUnits =
    Array<number>(values.length);

  groups.forEach(
    (group, groupIndex) => {
      const unitValue =
        solution.values[groupIndex];

      for (
        const originalIndex
        of group.indices
      ) {
        outputUnits[originalIndex] =
          unitValue;
      }
    },
  );

  return outputUnits.map(
    (unitCount) =>
      roundToDecimals(
        unitCount * step,
        12,
      ),
  );
}
