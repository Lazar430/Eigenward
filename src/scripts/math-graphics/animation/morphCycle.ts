import {
  easeInOutCubic,
  type EasingFunction,
} from "./easing";

export type MorphCyclePhase =
  | "hold-start"
  | "forward"
  | "hold-end"
  | "reverse"
  | "complete";

export interface MorphCycleOptions {
  /** Seconds spent motionless at progress 0 before the forward morph. */
  holdStartSeconds?: number;
  /** Seconds used for progress 0 -> 1. */
  forwardDurationSeconds?: number;
  /** Seconds spent motionless at progress 1. */
  holdEndSeconds?: number;
  /** Seconds used for progress 1 -> 0. Defaults to the forward duration. */
  reverseDurationSeconds?: number;
  loop?: boolean;
  easing?: EasingFunction;
}

export interface MorphCycleState {
  progress: number;
  phase: MorphCyclePhase;
  elapsedSeconds: number;
  cycleElapsedSeconds: number;
  cycleDurationSeconds: number;
  cycleIndex: number;
  completed: boolean;
}

interface ResolvedMorphCycleOptions {
  holdStartSeconds: number;
  forwardDurationSeconds: number;
  holdEndSeconds: number;
  reverseDurationSeconds: number;
  loop: boolean;
  easing: EasingFunction;
}

function finiteNonnegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be finite and nonnegative.`);
  }

  return value;
}

function finitePositive(value: number, label: string): number {
  if (!Number.isFinite(value) || !(value > 0)) {
    throw new RangeError(`${label} must be finite and greater than zero.`);
  }

  return value;
}

function resolveMorphCycleOptions(
  options: MorphCycleOptions = {},
): ResolvedMorphCycleOptions {
  const forwardDurationSeconds = finitePositive(
    options.forwardDurationSeconds ?? 2.4,
    "forwardDurationSeconds",
  );

  return {
    holdStartSeconds: finiteNonnegative(
      options.holdStartSeconds ?? 0.65,
      "holdStartSeconds",
    ),
    forwardDurationSeconds,
    holdEndSeconds: finiteNonnegative(
      options.holdEndSeconds ?? 0.75,
      "holdEndSeconds",
    ),
    reverseDurationSeconds: finitePositive(
      options.reverseDurationSeconds ?? forwardDurationSeconds,
      "reverseDurationSeconds",
    ),
    loop: options.loop ?? true,
    easing: options.easing ?? easeInOutCubic,
  };
}

function cycleDuration(options: ResolvedMorphCycleOptions): number {
  return (
    options.holdStartSeconds +
      options.forwardDurationSeconds +
      options.holdEndSeconds +
      options.reverseDurationSeconds
  );
}

/**
 * Deterministically sample a hold -> morph -> hold -> reverse timeline.
 *
 * The function is pure, so scenes can either drive it directly from elapsed
 * time or use MorphCycle below as a tiny stateful clock.
 */
export function sampleMorphCycle(
  elapsedSeconds: number,
  options: MorphCycleOptions = {},
): MorphCycleState {
  if (!Number.isFinite(elapsedSeconds)) {
    throw new RangeError("elapsedSeconds must be finite.");
  }

  const resolved = resolveMorphCycleOptions(options);
  const total = cycleDuration(resolved);
  const elapsed = Math.max(0, elapsedSeconds);

  if (!resolved.loop && elapsed >= total) {
    return {
      progress: 0,
      phase: "complete",
      elapsedSeconds: elapsed,
      cycleElapsedSeconds: total,
      cycleDurationSeconds: total,
      cycleIndex: 0,
      completed: true,
    };
  }

  const cycleIndex = resolved.loop ? Math.floor(elapsed / total) : 0;
  const local = resolved.loop ? elapsed % total : elapsed;

  const forwardStart = resolved.holdStartSeconds;
  const endHoldStart = forwardStart + resolved.forwardDurationSeconds;
  const reverseStart = endHoldStart + resolved.holdEndSeconds;

  if (local < forwardStart) {
    return {
      progress: 0,
      phase: "hold-start",
      elapsedSeconds: elapsed,
      cycleElapsedSeconds: local,
      cycleDurationSeconds: total,
      cycleIndex,
      completed: false,
    };
  }

  if (local < endHoldStart) {
    const raw =
      (local - forwardStart) / resolved.forwardDurationSeconds;

    return {
      progress: resolved.easing(raw),
      phase: "forward",
      elapsedSeconds: elapsed,
      cycleElapsedSeconds: local,
      cycleDurationSeconds: total,
      cycleIndex,
      completed: false,
    };
  }

  if (local < reverseStart) {
    return {
      progress: 1,
      phase: "hold-end",
      elapsedSeconds: elapsed,
      cycleElapsedSeconds: local,
      cycleDurationSeconds: total,
      cycleIndex,
      completed: false,
    };
  }

  const raw =
    (local - reverseStart) / resolved.reverseDurationSeconds;

  return {
    progress: 1 - resolved.easing(raw),
    phase: "reverse",
    elapsedSeconds: elapsed,
    cycleElapsedSeconds: local,
    cycleDurationSeconds: total,
    cycleIndex,
    completed: false,
  };
}

/** Stateful convenience clock around sampleMorphCycle(). */
export class MorphCycle {
  private elapsedSeconds = 0;
  private readonly options: MorphCycleOptions;

  constructor(options: MorphCycleOptions = {}) {
    // Resolve once for early validation, while retaining the public option shape.
    resolveMorphCycleOptions(options);
    this.options = { ...options };
  }

  advance(deltaTimeSeconds: number): MorphCycleState {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds < 0) {
      throw new RangeError(
        "MorphCycle deltaTimeSeconds must be finite and nonnegative.",
      );
    }

    this.elapsedSeconds += deltaTimeSeconds;
    return this.getState();
  }

  getState(): MorphCycleState {
    return sampleMorphCycle(this.elapsedSeconds, this.options);
  }

  seek(elapsedSeconds: number): MorphCycleState {
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
      throw new RangeError(
        "MorphCycle elapsedSeconds must be finite and nonnegative.",
      );
    }

    this.elapsedSeconds = elapsedSeconds;
    return this.getState();
  }

  reset(): MorphCycleState {
    this.elapsedSeconds = 0;
    return this.getState();
  }

  getElapsedSeconds(): number {
    return this.elapsedSeconds;
  }
}
