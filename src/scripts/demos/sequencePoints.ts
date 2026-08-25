import {
  createSequencePointsPlayer2D,
} from "../math-graphics/animation/SequencePointsPlayer2D";

const canvas =
  document.querySelector<HTMLCanvasElement>(
    "#sequence-points-scene",
  );

if (!canvas) {
  throw new Error(
    "The sequence-points canvas could not be found.",
  );
}

/* -------------------------------------------------------------------------- */
/* Sequence configuration                                                     */
/* -------------------------------------------------------------------------- */

/*
 * Change only this block for ordinary variants of the scene.
 *
 * Finite-limit example:
 *
 *   const sequenceDefinition = (n: number) => 1 / n;
 *   const sequenceFormulaLatex = String.raw`a_n=\frac1n`;
 *   const sequenceLimit = 0;
 *   const epsilon = 0.2;
 *
 * Divergence to +infinity:
 *
 *   const sequenceDefinition = (n: number) => n;
 *   const sequenceFormulaLatex = String.raw`a_n=n`;
 *   const sequenceLimit = Infinity;
 *
 * Divergence to -infinity:
 *
 *   const sequenceDefinition = (n: number) => -(n ** 2);
 *   const sequenceFormulaLatex = String.raw`a_n=-n^2`;
 *   const sequenceLimit = -Infinity;
 */
const sequenceDefinition = (
  n: number,
): number =>
  1 / n;

const sequenceFormulaLatex =
  String.raw`a_n=\frac{1}{n}`;

/* The program does not infer the limit. */
const sequenceLimit = 0;

/* Used only when sequenceLimit is finite. */
const epsilon = 0.2;

/* Newly animated points requested in each round. */
const numberOfTermsPerBatch = 50;
const firstIndex = 1;

/*
 * Progressive term sampling.
 *
 * The INITIAL batch always evaluates every index.
 *
 * This scene currently doubles the stride at EVERY recursive transition:
 *
 *   initial batch: every term
 *   round 1:       every 2nd term
 *   round 2:       every 4th term
 *   round 3:       every 8th term
 *   round 4:       every 16th term
 *   ...
 *
 * Increase termStrideGrowthEveryTransitions if you later want the growth to be
 * gentler.
 */
const termStrideGrowthFactor = 2;
const termStrideGrowthEveryTransitions = 1;

/*
 * Do not let the exponentially-growing sampling stride become absurdly large.
 * After reaching this value, subsequent rounds keep the same stride.
 */
const maximumTermStride = 128;

/*
 * This is now an automatic animation rather than a click-driven one.
 * 512 rounds is intentionally a very large practical guard; when it is ever
 * reached, the scene freezes at its current scale instead of looping back.
 */
const maximumAutomaticTransitions = 512;

/* -------------------------------------------------------------------------- */
/* Scene                                                                      */
/* -------------------------------------------------------------------------- */

const player =
  createSequencePointsPlayer2D(
    canvas,
    {
      sequence:
        sequenceDefinition,

      formulaLatex:
        sequenceFormulaLatex,

      limit:
        sequenceLimit,

      epsilon,

      termCount:
        numberOfTermsPerBatch,

      startIndex:
        firstIndex,

      /*
       * The first batch still uses every term. Recursive batches progressively
       * thin the sequence indices according to the schedule above.
       */
      termStrideGrowthFactor,
      termStrideGrowthEveryTransitions,
      maximumTermStride,

      finitePaddingFraction:
        0.10,

      divergentPaddingFraction:
        0.10,

      targetTickCount: 7,

      initialDelaySeconds:
        0.42,

      termIntervalSeconds:
        0.1,

      popDurationSeconds:
        0.28,

      /* Pause after one batch has finished before the next recursive step. */
      roundHoldSeconds:
        0.72,

      epsilonShrinkFactor:
        0.92,

      /*
       * The important changed behavior:
       *
       * after a new smaller neighborhood appears, the camera does NOT zoom
       * inside it. Instead, it only zooms until the PREVIOUS epsilon endpoints
       * have just passed outside the screen. The new interval plus most of the
       * gap between the two intervals remains visible.
       */
      zoomPastPreviousIntervalFraction:
        0.975,

      neighborhoodHoldSeconds:
        0.55,

      cameraDurationSeconds:
        0.95,

      postCameraPauseSeconds:
        0.34,

      /*
       * For ±Infinity the camera keeps the same zoom and pans by at least one
       * old viewport width, so every previously visible point is left behind.
       */
      divergentPanGapFraction:
        0.06,

      maximumScanTermsPerBatch:
        50_000,

      maxAutomaticTransitions:
        maximumAutomaticTransitions,

      /*
       * Opt into the two extra pedagogical HUD labels added by the updated
       * SequencePointsPlayer2D.
       *
       * n = current animated sequence index
       *
       * mu = ? resets at each new epsilon-neighborhood. It turns green and
       * becomes mu = n at the first newly animated term satisfying
       * |a_n - L| < epsilon.
       */
      showCurrentIndexLabel:
        true,

      showRankLabel:
        true,

      rankSymbolLatex:
        String.raw`\mu`,

      startVisibilityRatio:
        0.15,

      name:
        "sequence-points-demo",
    },
  );

Object.assign(window, {
  sequencePointsDemo:
    player,
});

const destroy = (): void => {
  player.destroy();
};

window.addEventListener(
  "pagehide",
  destroy,
  { once: true },
);

document.addEventListener(
  "astro:before-swap",
  destroy,
  { once: true },
);
