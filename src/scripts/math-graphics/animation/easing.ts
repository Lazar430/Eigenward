export type EasingFunction = (progress: number) => number;

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export const linear: EasingFunction = (progress) => clamp01(progress);

export const smoothstep: EasingFunction = (progress) => {
  const t = clamp01(progress);
  return t * t * (3 - 2 * t);
};

export const easeInOutCubic: EasingFunction = (progress) => {
  const t = clamp01(progress);

  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const easeInOutSine: EasingFunction = (progress) => {
  const t = clamp01(progress);
  return -(Math.cos(Math.PI * t) - 1) / 2;
};
