import {
  HUES,
  createMathScene2D,
  createParametricShape2D,
  createTextLabel2D,
} from "../math-graphics";

const TAU = Math.PI * 2;

const CIRCLE_RADIUS = 0.36;
const TOP_Y = 1.65;
const CHOICE_Y = -0.15;
const NUMBER_Y = -0.92;
const SLOT_SPACING = 1.25;

/*
  Set this to any integer from 1 through 5.
  5 shows the complete 5,4,3,2,1 selection process.
  3, for example, stops after three stages and leaves two circles above.
*/
const SELECTION_STAGES = 3;

const APPEAR_SECONDS = 0.28;
const CYCLE_ITEM_SECONDS = 0.23;
const REMOVE_SECONDS = 0.48;
const RECENTER_SECONDS = 0.62;
const BETWEEN_STAGES_SECONDS = 0.24;

const START_VISIBILITY_RATIO = 0.15;

const canvas =
  document.querySelector<HTMLCanvasElement>("#permutations-shuffling");

if (!canvas) {
  throw new Error(
    "The permutations-shuffling demonstration canvas could not be found.",
  );
}

const scene = createMathScene2D(canvas, {
  viewHeight: 5.4,
  center: [0, 0.15],
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

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeInOutCubic(value: number): number {
  const t = clamp01(value);

  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(value: number): number {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(value: number): number {
  const t = clamp01(value);
  return t * t * t;
}

function centeredSlots(count: number): number[] {
  return Array.from(
    { length: count },
    (_, index) => (index - (count - 1) / 2) * SLOT_SPACING,
  );
}

function shuffled<T>(values: readonly T[]): T[] {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));

    [result[index], result[swapIndex]] = [
      result[swapIndex],
      result[index],
    ];
  }

  return result;
}

function setCircleStyle(
  circle: ReturnType<typeof createParametricShape2D>,
  circleIndex: number,
): void {
  circle
    .setFillColor(circleStyles[circleIndex].fill)
    .setOutlineColor(circleStyles[circleIndex].outline);
}

const originalSlots = centeredSlots(circleStyles.length);

const topCircles = circleStyles.map((style, index) =>
  createParametricShape2D({
    name: `permutations-source-circle-${index}`,
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
    .moveTo(originalSlots[index], TOP_Y),
);

/*
  One persistent result circle exists for every possible stage. Each one first
  acts as the cycling display, then remains as the chosen entry.
*/
const choiceCircles = circleStyles.map((_, index) => {
  const circle = createParametricShape2D({
    name: `permutations-choice-circle-${index}`,
    curve: unitCircle,
    domain: [0, TAU],
    segments: 96,
    style: {
      fill: HUES.cyan.base,
      fillOpacity: 0.96,
      outline: HUES.cyan.light,
      outlineWidth: 2,
      outlineOpacity: 1,
    },
  })
    .resizeTo(0)
    .moveTo(originalSlots[index], CHOICE_Y);

  circle.hide();
  return circle;
});

const choiceLabels = circleStyles.map((_, index) => {
  const label = createTextLabel2D({
    name: `permutations-choice-count-${index}`,
    text: "",
    position: [originalSlots[index], NUMBER_Y],
    anchor: [0.5, 0.5],
    color: "rgba(239, 234, 255, 0.94)",
    fontSizePx: 18,
    fontWeight: 800,
    background: "rgba(20, 16, 34, 0.66)",
    border: "1px solid rgba(198, 180, 255, 0.16)",
    borderRadiusPx: 7,
    padding: "0.08rem 0.3rem",
  });

  label.setOpacity(0);
  label.hide();
  return label;
});

scene.add(...topCircles, ...choiceCircles, ...choiceLabels);

let remaining = [0, 1, 2, 3, 4];
let destroyed = false;
let activeStop = (): void => {};

function stopActiveMotion(): void {
  activeStop();
  activeStop = () => {};
}

function animate(
  durationSeconds: number,
  update: (progress: number) => void,
): Promise<void> {
  if (destroyed) return Promise.resolve();

  stopActiveMotion();

  return new Promise((resolve) => {
    let elapsed = 0;

    update(0);

    activeStop = scene.onFrame(({ deltaTime }) => {
      if (destroyed) {
        stopActiveMotion();
        resolve();
        return;
      }

      elapsed += deltaTime;
      const progress = clamp01(elapsed / durationSeconds);

      update(progress);

      if (progress >= 1) {
        stopActiveMotion();
        resolve();
      }
    });
  });
}

function wait(durationSeconds: number): Promise<void> {
  return animate(durationSeconds, () => {});
}

async function runStage(stageIndex: number): Promise<void> {
  if (destroyed || remaining.length === 0) return;

  const cycleOrder = shuffled(remaining);
  const selectedCircleIndex = cycleOrder[cycleOrder.length - 1];
  const choiceCircle = choiceCircles[stageIndex];
  const choiceLabel = choiceLabels[stageIndex];
  const choiceX = originalSlots[stageIndex];

  choiceCircle
    .show()
    .moveTo(choiceX, CHOICE_Y)
    .resizeTo(0);

  choiceLabel
    .show()
    .setText("0")
    .moveTo(choiceX, NUMBER_Y)
    .setOpacity(0);

  setCircleStyle(choiceCircle, cycleOrder[0]);

  /*
    The appearance is now simpler and less bouncy than before so that the
    visually meaningful "pulse" count is driven mainly by the actual cycle
    through the remaining choices.
  */
  await animate(APPEAR_SECONDS, (progress) => {
    const motion = easeOutCubic(progress);

    choiceCircle.resizeTo(CIRCLE_RADIUS * motion);
    choiceLabel.setOpacity(motion);
  });

  if (destroyed) return;

  /*
    Cycle exactly once through every remaining possibility, with the label
    explicitly counting 1, 2, ..., k underneath so the number of possibilities
    is visually obvious.
  */
  for (let index = 0; index < cycleOrder.length; index += 1) {
    const candidate = cycleOrder[index];

    setCircleStyle(choiceCircle, candidate);
    choiceLabel.setText(String(index + 1));

    await animate(CYCLE_ITEM_SECONDS, (progress) => {
      const pulse = Math.sin(Math.PI * progress);

      choiceCircle.resizeTo(CIRCLE_RADIUS * (1 + 0.085 * pulse));
      choiceLabel.setOpacity(0.72 + 0.28 * pulse);
    });

    if (destroyed) return;
  }

  setCircleStyle(choiceCircle, selectedCircleIndex);
  choiceCircle.resizeTo(CIRCLE_RADIUS);
  choiceLabel.setText(String(cycleOrder.length));
  choiceLabel.setOpacity(1);

  /*
    Remove the source counterpart of the color on which the cycling display
    settled. The remaining source row is then smoothly re-centered.
  */
  const selectedTopCircle = topCircles[selectedCircleIndex];
  const selectedStartX = selectedTopCircle.position.x;

  await animate(REMOVE_SECONDS, (progress) => {
    const motion = easeInCubic(progress);

    selectedTopCircle
      .resizeTo(CIRCLE_RADIUS * (1 - motion))
      .moveTo(selectedStartX, TOP_Y + 0.2 * motion);
  });

  selectedTopCircle.hide();

  remaining = remaining.filter(
    (circleIndex) => circleIndex !== selectedCircleIndex,
  );

  if (destroyed || remaining.length === 0) return;

  const startPositions = remaining.map(
    (circleIndex) => topCircles[circleIndex].position.x,
  );
  const targetPositions = centeredSlots(remaining.length);

  await animate(RECENTER_SECONDS, (progress) => {
    const motion = easeInOutCubic(progress);
    const lift = 0.09 * Math.sin(Math.PI * progress);

    remaining.forEach((circleIndex, index) => {
      topCircles[circleIndex].moveTo(
        startPositions[index] +
          (targetPositions[index] - startPositions[index]) * motion,
        TOP_Y + lift,
      );
    });
  });

  remaining.forEach((circleIndex, index) => {
    topCircles[circleIndex].moveTo(targetPositions[index], TOP_Y);
  });

  await wait(BETWEEN_STAGES_SECONDS);
}

async function runSelectionProcess(): Promise<void> {
  const stageCount = Math.min(
    circleStyles.length,
    Math.max(1, Math.floor(SELECTION_STAGES)),
  );

  for (let stageIndex = 0; stageIndex < stageCount; stageIndex += 1) {
    if (destroyed || remaining.length === 0) break;
    await runStage(stageIndex);
  }
}

/*
  Do not begin merely because the module was imported. Start only after the
  canvas has actually entered the viewport. Once started, MathScene2D pauses
  frame callbacks again whenever the scene leaves the viewport.
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
            void runSelectionProcess();
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
  void runSelectionProcess();
}

Object.assign(window, {
  permutationsShufflingDemo: {
    scene,
    topCircles,
    choiceCircles,
    choiceLabels,
    get remaining() {
      return [...remaining];
    },
  },
});

const destroy = (): void => {
  destroyed = true;
  visibilityObserver?.disconnect();
  stopActiveMotion();
  scene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
