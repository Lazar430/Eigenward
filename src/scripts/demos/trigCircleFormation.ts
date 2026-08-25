import {
  HUES,
  PointDragController2D,
  createAngleSector2D,
  createMathScene2D,
  createParametricShape2D,
  type Vec2Tuple,
} from "../math-graphics";
import {
  createProofSegment2D,
} from "../math-graphics/animation/proofHelpers2D";

const TAU = Math.PI * 2;

const RADIUS = 2.15;
const START_ANGLE = Math.PI / 6;

/*
 * Very large per-event angular jumps are more likely to be pointer
 * discontinuities than a genuine continuous drag. Rejecting them also avoids
 * accidentally interpreting a teleport across the circle as forward motion.
 */
const MAX_FORWARD_STEP = Math.PI / 2;
const COMPLETION_EPSILON = 0.012;

const ORIGIN: Vec2Tuple = [0, 0];

const canvas =
  document.querySelector<HTMLCanvasElement>(
    "#trig-circle-formation",
  );

if (!canvas) {
  throw new Error(
    "The trigonometric-circle formation canvas could not be found.",
  );
}

const scene = createMathScene2D(
  canvas,
  {
    viewHeight: 5.7,
    center: [0, 0],
    background: null,
  },
);

/* -------------------------------------------------------------------------- */
/* Circle trace                                                               */
/* -------------------------------------------------------------------------- */

/*
 * The complete circle exists as persistent geometry, but the visible outline
 * starts with zero length. Its parameterization begins at START_ANGLE, so the
 * trace starts exactly at the initial hypotenuse tip and advances
 * counterclockwise from there.
 */
const circleTrace =
  createParametricShape2D({
    name:
      "trig-circle-formation-trace",

    curve: (parameter) => {
      const angle =
        START_ANGLE +
        parameter;

      return [
        RADIUS *
          Math.cos(angle),

        RADIUS *
          Math.sin(angle),
      ];
    },

    domain: [0, TAU],
    segments: 320,

    style: {
      fill: null,
      fillOpacity: 0,

      outline:
        HUES.gold.light,

      outlineWidth: 3.1,
      outlineOpacity: 0.96,
    },
  });

circleTrace
  .show()
  .setOutlineTraceRange(0, 0);

/* -------------------------------------------------------------------------- */
/* Triangle                                                                   */
/* -------------------------------------------------------------------------- */

const hypotenuse =
  createProofSegment2D({
    name:
      "trig-circle-formation-hypotenuse",

    color:
      HUES.cyan.light,

    width: 3,
    opacity: 0.98,
  });

const adjacentLeg =
  createProofSegment2D({
    name:
      "trig-circle-formation-adjacent",

    color:
      HUES.gold.light,

    width: 2.7,
    opacity: 0.95,
  });

const oppositeLeg =
  createProofSegment2D({
    name:
      "trig-circle-formation-opposite",

    color:
      HUES.magenta.light,

    width: 2.7,
    opacity: 0.95,
  });

/* -------------------------------------------------------------------------- */
/* Angle                                                                      */
/* -------------------------------------------------------------------------- */

const angleSector =
  createAngleSector2D({
    name:
      "trig-circle-formation-angle",

    center: ORIGIN,

    startAngle: 0,
    endAngle: START_ANGLE,
    direction: "counterclockwise",

    radius: 0.62,
    segments: 180,

    fill:
      HUES.purple.base,

    fillOpacity: 0.27,

    outline:
      HUES.purple.light,

    outlineOpacity: 0.88,
  });

scene.add(
  circleTrace,
  adjacentLeg,
  oppositeLeg,
  hypotenuse,
  angleSector,
);

/* -------------------------------------------------------------------------- */
/* State                                                                      */
/* -------------------------------------------------------------------------- */

let sweptAngle = 0;
let currentAngle = START_ANGLE;
let currentTip: Vec2Tuple = [
  RADIUS *
    Math.cos(START_ANGLE),

  RADIUS *
    Math.sin(START_ANGLE),
];

let completed = false;

function normalizeAngle(
  angle: number,
): number {
  return (
    (angle % TAU) +
    TAU
  ) % TAU;
}

/*
 * Return the signed shortest displacement from `from` to `to`.
 *
 * With continuous pointer movement, genuine counterclockwise motion gives a
 * small positive value even across the 2π -> 0 seam.
 */
function signedShortestAngularDelta(
  from: number,
  to: number,
): number {
  let delta = to - from;

  while (delta <= -Math.PI) {
    delta += TAU;
  }

  while (delta > Math.PI) {
    delta -= TAU;
  }

  return delta;
}

function pointOnCircle(
  angle: number,
): Vec2Tuple {
  return [
    RADIUS *
      Math.cos(angle),

    RADIUS *
      Math.sin(angle),
  ];
}

/* -------------------------------------------------------------------------- */
/* Geometry update                                                            */
/* -------------------------------------------------------------------------- */

function displayAngle(
  unwrappedAngle: number,
): void {
  currentAngle =
    unwrappedAngle;

  const normalized =
    normalizeAngle(
      unwrappedAngle,
    );

  currentTip =
    pointOnCircle(
      normalized,
    );

  /*
   * Orthogonal projection onto the horizontal baseline. These are the two
   * legs whose lengths continuously grow and shrink as the hypotenuse tip
   * travels around the circle.
   */
  const foot: Vec2Tuple = [
    currentTip[0],
    0,
  ];

  adjacentLeg.setEndpoints(
    ORIGIN,
    foot,
  );

  oppositeLeg.setEndpoints(
    foot,
    currentTip,
  );

  hypotenuse.setEndpoints(
    ORIGIN,
    currentTip,
  );

  /*
   * The angle highlight is the ordinary standard angle measured from the
   * initial horizontal ray. The traced circle, rather than the sector, records
   * how far through the complete revolution the user has progressed.
   */
  angleSector.setAngles(
    0,
    normalized,
  );

  circleTrace.setOutlineTraceRange(
    0,
    Math.min(
      1,
      sweptAngle / TAU,
    ),
  );
}

displayAngle(START_ANGLE);

/* -------------------------------------------------------------------------- */
/* Dragging                                                                   */
/* -------------------------------------------------------------------------- */

const dragging =
  new PointDragController2D(
    scene,
  );

let unregisterTip =
  (): void => {};

function finishCircle(): void {
  if (completed) {
    return;
  }

  completed = true;
  sweptAngle = TAU;

  /*
   * Snap exactly to the starting point, close the trace, then remove the
   * draggable point. From this moment onward the scene is genuinely static.
   */
  displayAngle(
    START_ANGLE + TAU,
  );

  circleTrace
    .setOutlineTraceRange(0, 1)
    .showCompleteOutline();

  unregisterTip();
}

unregisterTip =
  dragging.registerPoint({
    getPosition: () => [
      currentTip[0],
      currentTip[1],
    ],

    onDrag: (
      pointerPosition,
    ) => {
      if (completed) {
        return;
      }

      const dx =
        pointerPosition[0] -
        ORIGIN[0];

      const dy =
        pointerPosition[1] -
        ORIGIN[1];

      if (
        Math.hypot(dx, dy) <
        1e-8
      ) {
        return;
      }

      const candidateAngle =
        normalizeAngle(
          Math.atan2(
            dy,
            dx,
          ),
        );

      const currentNormalized =
        normalizeAngle(
          currentAngle,
        );

      const delta =
        signedShortestAngularDelta(
          currentNormalized,
          candidateAngle,
        );

      /*
       * Counterclockwise only.
       *
       * If delta is negative, the pointer moved in the forbidden direction.
       * We simply leave the geometry at the most recent accepted position.
       * Because the drag stays active, the user can immediately reverse back
       * into the allowed direction and continue.
       */
      if (
        delta <= 0 ||
        delta >
          MAX_FORWARD_STEP
      ) {
        return;
      }

      sweptAngle =
        Math.min(
          TAU,
          sweptAngle + delta,
        );

      if (
        TAU - sweptAngle <=
        COMPLETION_EPSILON
      ) {
        finishCircle();
        return;
      }

      displayAngle(
        START_ANGLE +
          sweptAngle,
      );
    },

    hitRadiusPixels: 30,
    hoverCursor: "grab",
  });

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

Object.assign(window, {
  trigCircleFormationScene: {
    scene,
    dragging,

    circleTrace,
    angleSector,

    triangle: {
      hypotenuse,
      adjacentLeg,
      oppositeLeg,
    },

    getProgress(): number {
      return sweptAngle / TAU;
    },

    getAngleRadians(): number {
      return currentAngle;
    },

    isComplete(): boolean {
      return completed;
    },
  },
});

/* -------------------------------------------------------------------------- */
/* Cleanup                                                                    */
/* -------------------------------------------------------------------------- */

const destroy = (): void => {
  unregisterTip();
  dragging.destroy();
  scene.destroy();
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
