import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Shape,
  ShapeGeometry,
  type ColorRepresentation,
  type Vector2,
} from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { COLORS } from "../core/colors";
import { MathObject2D } from "../core/MathObject2D";
import type {
  OutlineTraceOptions,
  ParametricShape2DOptions,
  ShapeStyle2D,
} from "../core/types";
import { sampleParametricCurve2D } from "../geometry/sampleParametricCurve2D";
import { OutlineTraceLineMaterial } from "../materials/OutlineTraceLineMaterial";

const DEFAULT_STYLE: Required<ShapeStyle2D> = {
  outline: COLORS.white,
  outlineWidth: 2,
  outlineOpacity: 1,
  fill: null,
  fillOpacity: 0.18,
};

const TRACE_VISIBILITY_EPSILON = 1e-7;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function clampOpacity(value: number): number {
  return clamp(value, 0, 1);
}

/**
 * Convert a closed point list to the flat xyz sequence expected by LineGeometry.
 * Repeating the first point creates the final segment back to the start.
 */
function makeClosedLinePositions(points: readonly Vector2[]): number[] {
  const positions: number[] = [];

  for (const point of points) {
    positions.push(point.x, point.y, 0.01);
  }

  const first = points[0];
  positions.push(first.x, first.y, 0.01);

  return positions;
}

function calculateClosedLength(points: readonly Vector2[]): number {
  let totalLength = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    totalLength += current.distanceTo(next);
  }

  return totalLength;
}

/**
 * A persistent filled-and-outlined 2D object built from sampled points.
 *
 * Outline tracing uses the same complete, immutable LineGeometry as the normal
 * outline. A dedicated solid-line shader reveals a normalized arc-length range,
 * so tracing never rebuilds or resizes GPU geometry and never enables dashes.
 */
export class ParametricShape2D extends MathObject2D {
  private readonly fillGeometry: ShapeGeometry;
  private readonly fillMaterial: MeshBasicMaterial;
  private readonly fillMesh: Mesh<ShapeGeometry, MeshBasicMaterial>;

  /** Shared immutable geometry used by both complete and traced outlines. */
  private readonly outlineGeometry: LineGeometry;
  private readonly outlineMaterial: LineMaterial;
  private readonly traceMaterial: OutlineTraceLineMaterial;
  private readonly outlineLine: Line2;
  private readonly traceLine: Line2;
  private readonly outlineLength: number;

  private fillEnabled: boolean;
  private outlineEnabled: boolean;
  private traceMode = false;
  private traceRangeVisible = false;
  private stopTraceFrame: (() => void) | null = null;

  constructor(
    points: readonly Vector2[],
    style: ShapeStyle2D = {},
    name = "parametric-shape-2d",
  ) {
    super();

    if (points.length < 3) {
      throw new RangeError(
        "A closed shape requires at least three sampled points.",
      );
    }

    this.name = name;
    this.outlineLength = calculateClosedLength(points);

    if (!(this.outlineLength > 0) || !Number.isFinite(this.outlineLength)) {
      throw new RangeError("The shape outline must have positive finite length.");
    }

    const resolvedStyle = {
      ...DEFAULT_STYLE,
      ...style,
    };

    this.fillEnabled = resolvedStyle.fill !== null;
    this.outlineEnabled = resolvedStyle.outline !== null;

    const shape = new Shape([...points]);
    this.fillGeometry = new ShapeGeometry(shape);
    this.fillMaterial = new MeshBasicMaterial({
      color: resolvedStyle.fill ?? COLORS.white,
      opacity: clampOpacity(resolvedStyle.fillOpacity),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    });
    this.fillMesh = new Mesh(this.fillGeometry, this.fillMaterial);
    this.fillMesh.name = `${name}:fill`;
    this.fillMesh.renderOrder = 0;

    this.outlineGeometry = new LineGeometry();
    this.outlineGeometry.setPositions(makeClosedLinePositions(points));

    // The ordinary complete outline remains a fully solid Line2 material.
    this.outlineMaterial = new LineMaterial({
      color: resolvedStyle.outline ?? COLORS.white,
      opacity: clampOpacity(resolvedStyle.outlineOpacity),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      alphaToCoverage: false,
      dashed: false,
    });
    this.outlineMaterial.linewidth = Math.max(0, resolvedStyle.outlineWidth);

    // The trace material is also solid. Its custom fragment mask reveals the
    // requested arc-length interval without dashes or geometry mutation.
    this.traceMaterial = new OutlineTraceLineMaterial({
      color: resolvedStyle.outline ?? COLORS.white,
      opacity: clampOpacity(resolvedStyle.outlineOpacity),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      alphaToCoverage: false,
    });
    this.traceMaterial.linewidth = Math.max(0, resolvedStyle.outlineWidth);
    this.traceMaterial.setTraceTotalLength(this.outlineLength);

    this.outlineLine = new Line2(this.outlineGeometry, this.outlineMaterial);
    this.outlineLine.name = `${name}:outline`;
    this.outlineLine.renderOrder = 1;

    this.traceLine = new Line2(this.outlineGeometry, this.traceMaterial);
    this.traceLine.name = `${name}:trace-outline`;
    this.traceLine.renderOrder = 1;

    // This installs cumulative distance attributes once on the shared geometry.
    // The custom trace shader reads them; neither line ever changes geometry.
    this.traceLine.computeLineDistances();

    this.add(this.fillMesh, this.outlineLine, this.traceLine);
    this.showCompleteOutline();
    this.refreshVisibility();
  }

  setOutlineColor(color: ColorRepresentation | null): this {
    this.outlineEnabled = color !== null;

    if (color !== null) {
      this.outlineMaterial.color.set(color);
      this.traceMaterial.color.set(color);
    }

    this.refreshVisibility();
    return this.changed();
  }

  setOutlineWidth(widthPixels: number): this {
    const width = Math.max(0, widthPixels);
    this.outlineMaterial.linewidth = width;
    this.traceMaterial.linewidth = width;
    this.refreshVisibility();
    return this.changed();
  }

  setOutlineOpacity(opacity: number): this {
    const resolvedOpacity = clampOpacity(opacity);
    this.outlineMaterial.opacity = resolvedOpacity;
    this.traceMaterial.opacity = resolvedOpacity;
    this.refreshVisibility();
    return this.changed();
  }

  setFillColor(color: ColorRepresentation | null): this {
    this.fillEnabled = color !== null;

    if (color !== null) {
      this.fillMaterial.color.set(color);
    }

    this.refreshVisibility();
    return this.changed();
  }

  setFillOpacity(opacity: number): this {
    this.fillMaterial.opacity = clampOpacity(opacity);
    this.refreshVisibility();
    return this.changed();
  }

  /**
   * Reveal the normalized perimeter interval between `from` and `to`.
   *
   * The order is intentionally ignored here. `traceOutline()` decides the
   * direction of animation and expands the visible interval accordingly.
   */
  setOutlineTraceRange(from: number, to: number): this {
    const start = clamp(Math.min(from, to), 0, 1);
    const end = clamp(Math.max(from, to), 0, 1);

    this.traceMode = true;
    this.traceRangeVisible = end - start > TRACE_VISIBILITY_EPSILON;
    this.traceMaterial.setTraceRange(start, end);

    this.refreshVisibility();
    return this.changed();
  }

  showCompleteOutline(): this {
    this.traceMode = false;
    this.traceRangeVisible = false;
    this.traceMaterial.setTraceRange(0, 1);
    this.refreshVisibility();
    return this.changed();
  }

  /**
   * Animate the outline from one normalized perimeter location to another.
   * A speed of 0.5 reveals half of the chosen interval per second.
   */
  traceOutline(options: OutlineTraceOptions = {}): () => void {
    this.stopOutlineTrace(false);

    const speed = options.speed ?? 0.45;
    const from = clamp(options.from ?? 0, 0, 1);
    const to = clamp(options.to ?? 1, 0, 1);
    const loop = options.loop ?? false;
    const loopPause = Math.max(0, options.loopPause ?? 0);

    if (!(speed > 0) || !Number.isFinite(speed)) {
      throw new RangeError("Outline trace speed must be positive and finite.");
    }

    if (from === to) {
      this.setOutlineTraceRange(from, to);
      return () => this.stopOutlineTrace();
    }

    const direction = Math.sign(to - from);
    let progress = from;
    let pauseRemaining = 0;
    let waitingToRestart = false;

    this.setOutlineTraceRange(from, from);

    const stopFrame = this.onFrame(({ deltaTime }) => {
      if (waitingToRestart) {
        pauseRemaining -= deltaTime;

        if (pauseRemaining > 0) return;

        waitingToRestart = false;
        progress = from;
        this.setOutlineTraceRange(from, from);
        return;
      }

      progress += direction * speed * deltaTime;

      const completed = direction > 0
        ? progress >= to
        : progress <= to;

      if (completed) {
        progress = to;
      }

      if (direction > 0) {
        this.setOutlineTraceRange(from, progress);
      } else {
        this.setOutlineTraceRange(progress, from);
      }

      if (!completed) return;

      if (loop) {
        waitingToRestart = true;
        pauseRemaining = loopPause;
      } else {
        this.stopOutlineTrace(false);
      }
    });

    this.stopTraceFrame = stopFrame;
    return () => this.stopOutlineTrace();
  }

  stopOutlineTrace(showComplete = true): this {
    this.stopTraceFrame?.();
    this.stopTraceFrame = null;

    if (showComplete) {
      this.showCompleteOutline();
    }

    return this;
  }

  dispose(): void {
    this.stopOutlineTrace(false);
    this.fillGeometry.dispose();
    this.fillMaterial.dispose();
    this.outlineGeometry.dispose();
    this.outlineMaterial.dispose();
    this.traceMaterial.dispose();
  }

  private refreshVisibility(): void {
    this.fillMesh.visible =
      this.fillEnabled && this.fillMaterial.opacity > 0;

    const outlineCanRender =
      this.outlineEnabled &&
      this.outlineMaterial.opacity > 0 &&
      this.outlineMaterial.linewidth > 0;

    this.outlineLine.visible = outlineCanRender && !this.traceMode;
    this.traceLine.visible =
      outlineCanRender && this.traceMode && this.traceRangeVisible;
  }
}

export function createParametricShape2D({
  curve,
  domain,
  segments,
  style,
  name,
}: ParametricShape2DOptions): ParametricShape2D {
  const points = sampleParametricCurve2D({
    curve,
    domain,
    segments,
    closed: true,
  });

  return new ParametricShape2D(points, style, name);
}
