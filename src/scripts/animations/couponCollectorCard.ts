import {
  clearCanvas,
  mountCanvasAnimations,
  roundedRectanglePath,
  type CanvasAnimationContext,
} from "./canvasRuntime";

const COUPON_COUNT = 8;
const DRAW_INTERVAL_MS = 500;
const COMPLETION_HOLD_MS = 1300;

type CouponState = {
  collected: Set<number>;
  activeCoupon: number;
  pulse: number;
  lastDraw: number;
  completedAt: number;
};

function createCouponCollectorAnimation(initial: CanvasAnimationContext) {
  const state: CouponState = {
    collected: new Set<number>(),
    activeCoupon: -1,
    pulse: 0,
    lastDraw: 0,
    completedAt: 0,
  };

  function reset() {
    state.collected.clear();
    state.activeCoupon = -1;
    state.pulse = 0;
    state.lastDraw = 0;
    state.completedAt = 0;
  }

  function setReducedMotionFrame() {
    state.collected.clear();

    for (let index = 0; index < 5; index += 1) {
      state.collected.add(index);
    }

    state.activeCoupon = 4;
    state.pulse = 0;
  }

  function drawRandomCoupon(time: number) {
    state.activeCoupon = Math.floor(Math.random() * COUPON_COUNT);
    state.collected.add(state.activeCoupon);
    state.pulse = 1;
    state.lastDraw = time;

    if (state.collected.size === COUPON_COUNT) {
      state.completedAt = time;
    }
  }

  function renderBackground(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) {
    const gradient = context.createLinearGradient(0, 0, width, height);

    gradient.addColorStop(0, "rgba(119, 83, 205, 0.16)");
    gradient.addColorStop(0.55, "rgba(84, 213, 203, 0.08)");
    gradient.addColorStop(1, "rgba(255, 107, 146, 0.12)");

    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "rgba(255, 255, 255, 0.045)";
    context.lineWidth = 1;

    for (let x = 0; x < width; x += 34) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    for (let y = 0; y < height; y += 34) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
  }

  function renderProgress(
    context: CanvasRenderingContext2D,
    x: number,
    width: number,
    y: number,
  ) {
    const progress = state.collected.size / COUPON_COUNT;

    roundedRectanglePath(context, x, y, width, 8, 4);
    context.fillStyle = "rgba(255, 255, 255, 0.08)";
    context.fill();

    if (progress > 0) {
      roundedRectanglePath(context, x, y, width * progress, 8, 4);

      const gradient = context.createLinearGradient(x, 0, x + width, 0);
      gradient.addColorStop(0, "rgba(113, 230, 255, 0.94)");
      gradient.addColorStop(1, "rgba(255, 111, 151, 0.9)");

      context.fillStyle = gradient;
      context.fill();
    }

    context.fillStyle = "rgba(239, 234, 255, 0.66)";
    context.font = "600 13px system-ui";
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.fillText(
      `${state.collected.size} of ${COUPON_COUNT} coupon types collected`,
      x,
      y + 31,
    );
  }

  function renderCoupons(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) {
    const padding = Math.max(22, width * 0.055);
    const availableWidth = width - padding * 2;
    const gap = Math.max(7, availableWidth * 0.012);
    const couponWidth =
      (availableWidth - gap * (COUPON_COUNT - 1)) / COUPON_COUNT;
    const couponHeight = Math.min(96, height * 0.34);
    const couponY = Math.max(52, height * 0.23);

    state.pulse *= 0.9;

    for (let index = 0; index < COUPON_COUNT; index += 1) {
      const x = padding + index * (couponWidth + gap);
      const isCollected = state.collected.has(index);
      const lift = index === state.activeCoupon ? state.pulse * 10 : 0;

      context.save();
      context.translate(0, -lift);

      roundedRectanglePath(
	context,
	x,
	couponY,
	couponWidth,
	couponHeight,
	12,
      );

      context.fillStyle = isCollected
	? "rgba(104, 214, 230, 0.18)"
	: "rgba(255, 255, 255, 0.035)";
      context.fill();

      context.strokeStyle = isCollected
	? "rgba(115, 232, 255, 0.68)"
	: "rgba(255, 255, 255, 0.15)";
      context.lineWidth = index === state.activeCoupon ? 2 : 1;
      context.stroke();

      context.fillStyle = isCollected
	? "rgba(245, 251, 255, 0.94)"
	: "rgba(240, 232, 255, 0.4)";
      context.font =
`700 ${Math.max(13, Math.min(21, couponWidth * 0.24))}px system-ui`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(
	String.fromCharCode(65 + index),
	x + couponWidth / 2,
	couponY + couponHeight / 2,
      );

      context.restore();
    }

    renderProgress(
      context,
      padding,
      availableWidth,
      couponY + couponHeight + 48,
    );
  }

  if (initial.reducedMotion) {
    setReducedMotionFrame();
  }

  return {
    resize(frame: CanvasAnimationContext) {
      if (frame.reducedMotion) setReducedMotionFrame();
    },

    render({
      context,
      width,
      height,
      time,
      reducedMotion,
    }: CanvasAnimationContext & { time: number; deltaTime: number }) {
      clearCanvas(context, width, height);

      if (!reducedMotion) {
	if (
	  state.completedAt > 0 &&
	    time - state.completedAt > COMPLETION_HOLD_MS
	) {
	  reset();
	  state.lastDraw = time;
	} else if (
	  state.completedAt === 0 &&
	    time - state.lastDraw > DRAW_INTERVAL_MS
	) {
	  drawRandomCoupon(time);
	}
      }

      renderBackground(context, width, height);
      renderCoupons(context, width, height);
    },
  };
}

mountCanvasAnimations(
  "[data-coupon-canvas]",
  createCouponCollectorAnimation,
);
