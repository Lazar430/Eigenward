type Viewport = {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
};

type Point = {
    x: number;
    y: number;
};

const viewport: Viewport = {
    xMin: -5,
    xMax: 5,
    yMin: -3,
    yMax: 3
};

function css(name: string, fallback: string): string {
    const value = getComputedStyle(document.documentElement)
	  .getPropertyValue(name)
	  .trim();

    return value || fallback;
}

function resizeCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return {
	width: rect.width,
	height: rect.height
    };
}

function toScreen(point: Point, width: number, height: number): Point {
    const x =
	  ((point.x - viewport.xMin) / (viewport.xMax - viewport.xMin)) * width;

    const y =
	  height -
	  ((point.y - viewport.yMin) / (viewport.yMax - viewport.yMin)) * height;

    return { x, y };
}

function drawLine(
    ctx: CanvasRenderingContext2D,
    a: Point,
    b: Point,
    width: number,
    height: number
) {
    const A = toScreen(a, width, height);
    const B = toScreen(b, width, height);

    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
}

function drawPoint(
    ctx: CanvasRenderingContext2D,
    point: Point,
    width: number,
    height: number,
    radius = 4
) {
    const P = toScreen(point, width, height);

    ctx.beginPath();
    ctx.arc(P.x, P.y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawArrow(
    ctx: CanvasRenderingContext2D,
    a: Point,
    b: Point,
    width: number,
    height: number
) {
    const A = toScreen(a, width, height);
    const B = toScreen(b, width, height);

    const angle = Math.atan2(B.y - A.y, B.x - A.x);
    const size = 11;

    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(B.x, B.y);
    ctx.lineTo(
	B.x - size * Math.cos(angle - Math.PI / 6),
	B.y - size * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
	B.x - size * Math.cos(angle + Math.PI / 6),
	B.y - size * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
}

function drawLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    point: Point,
    width: number,
    height: number
) {
    const P = toScreen(point, width, height);

    ctx.font = "14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(text, P.x + 9, P.y - 9);
}

function drawGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
) {
    ctx.save();

    ctx.strokeStyle = css("--grid", "rgba(0,0,0,0.08)");
    ctx.lineWidth = 1;

    for (let x = Math.ceil(viewport.xMin); x <= viewport.xMax; x++) {
	drawLine(ctx, { x, y: viewport.yMin }, { x, y: viewport.yMax }, width, height);
    }

    for (let y = Math.ceil(viewport.yMin); y <= viewport.yMax; y++) {
	drawLine(ctx, { x: viewport.xMin, y }, { x: viewport.xMax, y }, width, height);
    }

    ctx.strokeStyle = css("--axis", "rgba(0,0,0,0.34)");
    ctx.lineWidth = 1.5;

    drawLine(ctx, { x: viewport.xMin, y: 0 }, { x: viewport.xMax, y: 0 }, width, height);
    drawLine(ctx, { x: 0, y: viewport.yMin }, { x: 0, y: viewport.yMax }, width, height);

    ctx.restore();
}

function drawCurve(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number
) {
    const xStart = viewport.xMin;
    const xEnd = viewport.xMin + (viewport.xMax - viewport.xMin) * progress;
    const steps = 220;

    ctx.save();
    ctx.strokeStyle = css("--accent", "#8f6a20");
    ctx.lineWidth = 3;
    ctx.beginPath();

    for (let i = 0; i <= steps; i++) {
	const u = i / steps;
	const x = xStart + (xEnd - xStart) * u;
	const y = Math.sin(1.7 * x) + 0.35 * Math.cos(3 * x);
	const P = toScreen({ x, y }, width, height);

	if (i === 0) {
	    ctx.moveTo(P.x, P.y);
	} else {
	    ctx.lineTo(P.x, P.y);
	}
    }

    ctx.stroke();
    ctx.restore();
}

function render(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    time: number
) {
    const { width, height } = resizeCanvas(canvas, ctx);

    const ink = css("--ink", "#17130d");
    const muted = css("--muted", "#716b61");
    const accent = css("--accent", "#8f6a20");

    ctx.clearRect(0, 0, width, height);

    drawGrid(ctx, width, height);

    const seconds = time / 1000;
    const progress = 0.5 + 0.5 * Math.sin(seconds * 0.55);

    drawCurve(ctx, width, height, 0.55 + 0.45 * progress);

    const t = seconds * 0.75;
    const movingPoint = {
	x: 3.4 * Math.cos(t),
	y: 1.25 * Math.sin(t) + 0.5 * Math.cos(2 * t)
    };

    ctx.save();

    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;
    ctx.lineWidth = 2.5;
    drawArrow(ctx, { x: 0, y: 0 }, movingPoint, width, height);

    ctx.fillStyle = ink;
    drawPoint(ctx, movingPoint, width, height, 5);

    ctx.fillStyle = muted;
    drawLabel(ctx, "v(t)", movingPoint, width, height);

    ctx.fillStyle = ink;
    drawLabel(ctx, "f(x)", { x: -4.45, y: 1.55 }, width, height);

    ctx.restore();
}

export function startHomeSketches() {
    const canvases = document.querySelectorAll<HTMLCanvasElement>(
	"canvas[data-home-sketch]"
    );

    canvases.forEach((canvas) => {
	if (canvas.dataset.ready === "true") return;

	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	canvas.dataset.ready = "true";

	function frame(time: number) {
	    render(canvas, ctx!, time);
	    requestAnimationFrame(frame);
	}

	requestAnimationFrame(frame);
    });
}
