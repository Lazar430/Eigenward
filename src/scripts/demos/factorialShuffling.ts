import {
  HUES,
  createMathScene2D,
  createParametricShape2D,
} from "../math-graphics";

const TAU = Math.PI * 2;

const CIRCLE_RADIUS = 0.42;
const SLOT_SPACING = 1.35;
const SWAP_SECONDS = 0.88;
const BETWEEN_SWAPS_SECONDS = 0.48;
const START_VISIBILITY_RATIO = 0.15;

const canvas = document.querySelector<HTMLCanvasElement>("#factorial-shuffling");

if (!canvas) {
  throw new Error("The factorial-shuffling demonstration canvas could not be found.");
}

const scene = createMathScene2D(canvas, {
  viewHeight: 4.8,
  center: [0, 0],
  background: null,
});

const circleStyles = [
  { fill: HUES.cyan.base, outline: HUES.cyan.light },
  { fill: HUES.purple.base, outline: HUES.purple.light },
  { fill: HUES.magenta.base, outline: HUES.magenta.light },
  { fill: HUES.gold.base, outline: HUES.gold.light },
  { fill: HUES.mint.base, outline: HUES.mint.light },
] as const;

const unitCircle = (parameter: number): readonly [number, number] => [
  Math.cos(parameter),
  Math.sin(parameter),
];

function slotX(index: number): number {
  return (index - 2) * SLOT_SPACING;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeInOutCubic(value: number): number {
  const t = clamp01(value);

  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function randomInteger(maximumExclusive: number): number {
  return Math.floor(Math.random() * maximumExclusive);
}

const circles = circleStyles.map((style, index) =>
  createParametricShape2D({
    name: `factorial-shuffling-circle-${index}`,
    curve: unitCircle,
    domain: [0, TAU],
    segments: 96,
    style: {
      fill: style.fill,
      fillOpacity: 0.96,
      outline: style.outline,
      outlineWidth: 2,
      outlineOpacity: 1,
    },
  })
    .resizeTo(CIRCLE_RADIUS)
    .moveTo(slotX(index), 0),
);

scene.add(...circles);

/*
  order[slot] = circle index currently occupying that slot.
  Each shuffle is a single random transposition. The two participating circles
  travel on opposite arcs, so only one clean exchange happens at a time.
*/
const order = [0, 1, 2, 3, 4];

interface ActiveSwap {
  slotA: number;
  slotB: number;
  circleA: number;
  circleB: number;
  startAX: number;
  startBX: number;
  elapsed: number;
  arcDirection: number;
}

let activeSwap: ActiveSwap | null = null;
let holdRemaining = 0.45;
let previousPair = "";
let stopAnimation = (): void => {};

function beginRandomSwap(): void {
  let slotA = 0;
  let slotB = 1;
  let pairKey = "";

  for (let attempt = 0; attempt < 8; attempt += 1) {
    slotA = randomInteger(order.length);

    do {
      slotB = randomInteger(order.length);
    } while (slotB === slotA);

    if (slotA > slotB) {
      [slotA, slotB] = [slotB, slotA];
    }

    pairKey = `${slotA}:${slotB}`;
    if (pairKey !== previousPair) break;
  }

  previousPair = pairKey;

  activeSwap = {
    slotA,
    slotB,
    circleA: order[slotA],
    circleB: order[slotB],
    startAX: slotX(slotA),
    startBX: slotX(slotB),
    elapsed: 0,
    arcDirection: Math.random() < 0.5 ? -1 : 1,
  };
}

function finishSwap(swap: ActiveSwap): void {
  order[swap.slotA] = swap.circleB;
  order[swap.slotB] = swap.circleA;

  circles[swap.circleA]
    .moveTo(slotX(swap.slotB), 0)
    .resizeTo(CIRCLE_RADIUS);

  circles[swap.circleB]
    .moveTo(slotX(swap.slotA), 0)
    .resizeTo(CIRCLE_RADIUS);

  activeSwap = null;
  holdRemaining = BETWEEN_SWAPS_SECONDS;
}

function startAnimation(): void {
  stopAnimation();

  stopAnimation = scene.onFrame(({ deltaTime }) => {
    if (!activeSwap) {
      holdRemaining -= deltaTime;

      if (holdRemaining <= 0) {
        beginRandomSwap();
      }

      return;
    }

    activeSwap.elapsed += deltaTime;

    const progress = clamp01(activeSwap.elapsed / SWAP_SECONDS);
    const motion = easeInOutCubic(progress);
    const arc = Math.sin(Math.PI * progress);

    const distance = Math.abs(activeSwap.startBX - activeSwap.startAX);
    const arcHeight = 0.42 + 0.08 * distance;

    const circleA = circles[activeSwap.circleA];
    const circleB = circles[activeSwap.circleB];

    circleA
      .moveTo(
        activeSwap.startAX +
          (activeSwap.startBX - activeSwap.startAX) * motion,
        activeSwap.arcDirection * arcHeight * arc,
      )
      .resizeTo(CIRCLE_RADIUS * (1 + 0.085 * arc));

    circleB
      .moveTo(
        activeSwap.startBX +
          (activeSwap.startAX - activeSwap.startBX) * motion,
        -activeSwap.arcDirection * arcHeight * arc,
      )
      .resizeTo(CIRCLE_RADIUS * (1 - 0.045 * arc));

    if (progress >= 1) {
      finishSwap(activeSwap);
    }
  });
}

/*
  Do not register the animation clock until the canvas is actually in view.
  After that, MathScene2D's own offscreen handling pauses it when needed.
*/
let started = false;

const visibilityObserver =
  typeof IntersectionObserver === "undefined"
    ? null
    : new IntersectionObserver(
        (entries) => {
          if (started) return;

          const entry = entries.find((candidate) => candidate.target === canvas);

          if (
            entry?.isIntersecting &&
            entry.intersectionRatio >= START_VISIBILITY_RATIO
          ) {
            started = true;
            visibilityObserver?.disconnect();
            startAnimation();
          }
        },
        {
          threshold: [0, START_VISIBILITY_RATIO, 1],
        },
      );

if (visibilityObserver) {
  visibilityObserver.observe(canvas);
} else {
  started = true;
  startAnimation();
}

Object.assign(window, {
  factorialShufflingDemo: {
    scene,
    circles,
    order,
    start: startAnimation,
    stop: () => stopAnimation(),
  },
});

const destroy = (): void => {
  visibilityObserver?.disconnect();
  stopAnimation();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
