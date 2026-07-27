import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  type ColorRepresentation,
} from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import {
  type MathScene2D,
  type ViewBounds2D,
} from "../core/MathScene2D";
import { MathObject2D } from "../core/MathObject2D";
import type { Domain } from "../core/types";
import { TextLabel2D } from "./TextLabel2D";

export interface CoordinatePlane2DOptions {
  /**
   * Responsive mode: derive all visible grid lines, ticks, labels, and axis
   * endpoints from this scene's camera.
   */
  scene?: MathScene2D;
  /** Fixed-range compatibility mode for older scenes. */
  xRange?: Domain;
  /** Fixed-range compatibility mode for older scenes. */
  yRange?: Domain;
  /** Keeps positive arrow tips and axis names this many CSS pixels from edges. */
  edgePaddingPixels?: number;
  gridStep?: number;
  integerStep?: number;
  gridColor?: ColorRepresentation;
  gridOpacity?: number;
  axisColor?: ColorRepresentation;
  axisOpacity?: number;
  axisWidth?: number;
  tickColor?: ColorRepresentation;
  tickOpacity?: number;
  tickLength?: number;
  labelColor?: string;
  labelFontSizePx?: number;
  showAxisNames?: boolean;
  name?: string;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function makeTriangleGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      [
        0, 0, 0,
        -0.22, -0.11, 0,
        -0.22, 0.11, 0,
      ],
      3,
    ),
  );
  geometry.setIndex([0, 1, 2]);
  return geometry;
}

function boundsFromRanges(xRange: Domain, yRange: Domain): ViewBounds2D {
  return {
    left: xRange[0],
    right: xRange[1],
    bottom: yRange[0],
    top: yRange[1],
    width: xRange[1] - xRange[0],
    height: yRange[1] - yRange[0],
  };
}

/** Grid, animated axes, integer ticks, and camera-aligned numeric labels. */
export class CoordinatePlane2D extends MathObject2D {
  private readonly scene: MathScene2D | null;
  private readonly edgePaddingPixels: number;
  private readonly gridStep: number;
  private readonly integerStep: number;
  private readonly tickLength: number;
  private readonly labelColor: string;
  private readonly labelFontSizePx: number;
  private readonly showAxisNames: boolean;
  private readonly axisOpacity: number;
  private readonly tickOpacity: number;

  private viewBounds: ViewBounds2D;
  private axisBounds: ViewBounds2D;
  private stopViewChange: (() => void) | null = null;

  private readonly gridGeometry: BufferGeometry;
  private readonly gridMaterial: LineBasicMaterial;
  private readonly gridLines: LineSegments;

  private readonly xAxisGeometry: LineGeometry;
  private readonly yAxisGeometry: LineGeometry;
  private readonly axisMaterial: LineMaterial;
  private readonly xAxis: Line2;
  private readonly yAxis: Line2;

  private readonly tickGeometry: BufferGeometry;
  private readonly tickMaterial: LineBasicMaterial;
  private readonly ticks: LineSegments;

  private readonly arrowGeometry: BufferGeometry;
  private readonly arrowMaterial: MeshBasicMaterial;
  private readonly xArrow: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly yArrow: Mesh<BufferGeometry, MeshBasicMaterial>;

  private readonly integerLabels: TextLabel2D[] = [];
  private readonly axisLabels: TextLabel2D[] = [];

  private axisReveal = 1;
  private integerReveal = 1;

  constructor({
    scene,
    xRange,
    yRange,
    edgePaddingPixels = 18,
    gridStep = 1,
    integerStep = 1,
    gridColor = 0x6f6882,
    gridOpacity = 0.22,
    axisColor = 0xe9e3ff,
    axisOpacity = 0.92,
    axisWidth = 2.2,
    tickColor = 0xded7f2,
    tickOpacity = 0.82,
    tickLength = 0.12,
    labelColor = "rgba(239, 234, 255, 0.82)",
    labelFontSizePx = 12,
    showAxisNames = true,
    name = "coordinate-plane-2d",
  }: CoordinatePlane2DOptions) {
    super();

    if (!scene && (!xRange || !yRange)) {
      throw new Error(
        "CoordinatePlane2D requires either a scene or both xRange and yRange.",
      );
    }

    if (
      xRange &&
      (!(xRange[0] < xRange[1]) || !Number.isFinite(xRange[0]) ||
        !Number.isFinite(xRange[1]))
    ) {
      throw new RangeError("xRange must be finite and increasing.");
    }

    if (
      yRange &&
      (!(yRange[0] < yRange[1]) || !Number.isFinite(yRange[0]) ||
        !Number.isFinite(yRange[1]))
    ) {
      throw new RangeError("yRange must be finite and increasing.");
    }

    if (!(gridStep > 0) || !(integerStep > 0)) {
      throw new RangeError("Grid and integer steps must be positive.");
    }

    this.name = name;
    this.scene = scene ?? null;
    this.edgePaddingPixels = Math.max(0, edgePaddingPixels);
    this.gridStep = gridStep;
    this.integerStep = integerStep;
    this.tickLength = Math.max(0, tickLength);
    this.labelColor = labelColor;
    this.labelFontSizePx = Math.max(1, labelFontSizePx);
    this.showAxisNames = showAxisNames;
    this.axisOpacity = clamp(axisOpacity, 0, 1);
    this.tickOpacity = clamp(tickOpacity, 0, 1);

    const fixedBounds = xRange && yRange
      ? boundsFromRanges(xRange, yRange)
      : scene!.getViewBounds();
    this.viewBounds = fixedBounds;
    this.axisBounds = scene
      ? scene.getViewBounds(this.edgePaddingPixels)
      : fixedBounds;

    this.gridGeometry = new BufferGeometry();
    this.gridGeometry.setAttribute(
      "position",
      new Float32BufferAttribute([], 3),
    );
    this.gridMaterial = new LineBasicMaterial({
      color: gridColor,
      opacity: clamp(gridOpacity, 0, 1),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.gridLines = new LineSegments(this.gridGeometry, this.gridMaterial);
    this.gridLines.name = `${name}:grid`;
    this.gridLines.renderOrder = -20;

    this.xAxisGeometry = new LineGeometry();
    this.yAxisGeometry = new LineGeometry();
    this.axisMaterial = new LineMaterial({
      color: axisColor,
      opacity: this.axisOpacity,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      dashed: false,
      alphaToCoverage: false,
    });
    this.axisMaterial.linewidth = Math.max(0, axisWidth);

    this.xAxis = new Line2(this.xAxisGeometry, this.axisMaterial);
    this.yAxis = new Line2(this.yAxisGeometry, this.axisMaterial);
    this.xAxis.name = `${name}:x-axis`;
    this.yAxis.name = `${name}:y-axis`;
    this.xAxis.renderOrder = -10;
    this.yAxis.renderOrder = -10;

    this.tickGeometry = new BufferGeometry();
    this.tickGeometry.setAttribute(
      "position",
      new Float32BufferAttribute([], 3),
    );
    this.tickMaterial = new LineBasicMaterial({
      color: tickColor,
      opacity: this.tickOpacity,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.ticks = new LineSegments(this.tickGeometry, this.tickMaterial);
    this.ticks.name = `${name}:integer-ticks`;
    this.ticks.renderOrder = -5;

    this.arrowGeometry = makeTriangleGeometry();
    this.arrowMaterial = new MeshBasicMaterial({
      color: axisColor,
      opacity: this.axisOpacity,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    });

    this.xArrow = new Mesh(this.arrowGeometry, this.arrowMaterial);
    this.yArrow = new Mesh(this.arrowGeometry, this.arrowMaterial);
    this.xArrow.name = `${name}:x-arrow`;
    this.yArrow.name = `${name}:y-arrow`;
    this.yArrow.rotation.z = Math.PI / 2;
    this.xArrow.renderOrder = -9;
    this.yArrow.renderOrder = -9;

    this.add(
      this.gridLines,
      this.xAxis,
      this.yAxis,
      this.ticks,
      this.xArrow,
      this.yArrow,
    );

    this.rebuildVisiblePlane();

    if (this.scene) {
      this.stopViewChange = this.scene.onViewChange(() => {
        this.viewBounds = this.scene!.getViewBounds();
        this.axisBounds = this.scene!.getViewBounds(
          this.edgePaddingPixels,
        );
        this.rebuildVisiblePlane();
        this.changed();
      }, false);
    }
  }

  setAxisReveal(progress: number): this {
    this.axisReveal = clamp(progress, 0, 1);
    this.updateAxisGeometry();
    return this.changed();
  }

  setIntegerReveal(progress: number): this {
    this.integerReveal = clamp(progress, 0, 1);
    this.tickMaterial.opacity = this.tickOpacity * this.integerReveal;
    this.ticks.visible = this.integerReveal > 0;

    for (const label of this.integerLabels) {
      label.setOpacity(this.integerReveal);
    }

    return this.changed();
  }

  setGridOpacity(opacity: number): this {
    this.gridMaterial.opacity = clamp(opacity, 0, 1);
    this.gridLines.visible = this.gridMaterial.opacity > 0;
    return this.changed();
  }

  dispose(): void {
    this.stopViewChange?.();
    this.stopViewChange = null;
    this.gridGeometry.dispose();
    this.gridMaterial.dispose();
    this.xAxisGeometry.dispose();
    this.yAxisGeometry.dispose();
    this.axisMaterial.dispose();
    this.tickGeometry.dispose();
    this.tickMaterial.dispose();
    this.arrowGeometry.dispose();
    this.arrowMaterial.dispose();
  }

  private clearLabels(): void {
    for (const label of [...this.integerLabels, ...this.axisLabels]) {
      this.remove(label);
      label.dispose();
    }

    this.integerLabels.length = 0;
    this.axisLabels.length = 0;
  }

  private rebuildVisiblePlane(): void {
    this.clearLabels();

    const { left, right, bottom, top } = this.viewBounds;
    const gridPositions: number[] = [];
    const firstGridX = Math.ceil(left / this.gridStep) * this.gridStep;
    const firstGridY = Math.ceil(bottom / this.gridStep) * this.gridStep;

    for (let x = firstGridX; x <= right + 1e-9; x += this.gridStep) {
      if (Math.abs(x) < 1e-9) continue;
      gridPositions.push(x, bottom, -0.02, x, top, -0.02);
    }

    for (let y = firstGridY; y <= top + 1e-9; y += this.gridStep) {
      if (Math.abs(y) < 1e-9) continue;
      gridPositions.push(left, y, -0.02, right, y, -0.02);
    }

    this.gridGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(gridPositions, 3),
    );
    this.gridGeometry.computeBoundingSphere();

    const tickPositions: number[] = [];
    const firstIntegerX = Math.ceil(left / this.integerStep) * this.integerStep;
    const firstIntegerY = Math.ceil(bottom / this.integerStep) * this.integerStep;
    const xAxisVisible = bottom <= 0 && top >= 0;
    const yAxisVisible = left <= 0 && right >= 0;

    if (xAxisVisible) {
      for (
        let x = firstIntegerX;
        x <= right + 1e-9;
        x += this.integerStep
      ) {
        if (Math.abs(x) < 1e-9) continue;

        tickPositions.push(
          x, -this.tickLength / 2, 0.01,
          x, this.tickLength / 2, 0.01,
        );

        this.integerLabels.push(
          new TextLabel2D({
            name: `${this.name}:x-label-${x}`,
            text: String(Number(x.toFixed(8))),
            position: [x, -0.2],
            anchor: [0.5, 0],
            color: this.labelColor,
            fontSizePx: this.labelFontSizePx,
            fontWeight: 540,
            opacity: this.integerReveal,
          }),
        );
      }
    }

    if (yAxisVisible) {
      for (
        let y = firstIntegerY;
        y <= top + 1e-9;
        y += this.integerStep
      ) {
        if (Math.abs(y) < 1e-9) continue;

        tickPositions.push(
          -this.tickLength / 2, y, 0.01,
          this.tickLength / 2, y, 0.01,
        );

        this.integerLabels.push(
          new TextLabel2D({
            name: `${this.name}:y-label-${y}`,
            text: String(Number(y.toFixed(8))),
            position: [-0.16, y],
            anchor: [1, 0.5],
            color: this.labelColor,
            fontSizePx: this.labelFontSizePx,
            fontWeight: 540,
            opacity: this.integerReveal,
          }),
        );
      }
    }

    if (xAxisVisible && yAxisVisible) {
      this.integerLabels.push(
        new TextLabel2D({
          name: `${this.name}:origin-label`,
          text: "0",
          position: [-0.12, -0.16],
          anchor: [1, 0],
          color: this.labelColor,
          fontSizePx: this.labelFontSizePx,
          fontWeight: 540,
          opacity: this.integerReveal,
        }),
      );
    }

    if (this.showAxisNames) {
      if (xAxisVisible && this.axisBounds.right > 0) {
        this.axisLabels.push(
          new TextLabel2D({
            name: `${this.name}:x-name`,
            text: "x",
            position: [this.axisBounds.right - 0.28, -0.09],
            anchor: [1, 0.5],
            color: this.labelColor,
            fontSizePx: this.labelFontSizePx + 2,
            fontWeight: 700,
            opacity: this.axisReveal,
          }),
        );
      }

      if (yAxisVisible && this.axisBounds.top > 0) {
        this.axisLabels.push(
          new TextLabel2D({
            name: `${this.name}:y-name`,
            text: "y",
            position: [0.08, this.axisBounds.top - 0.27],
            anchor: [0, 0],
            color: this.labelColor,
            fontSizePx: this.labelFontSizePx + 2,
            fontWeight: 700,
            opacity: this.axisReveal,
          }),
        );
      }
    }

    this.tickGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(tickPositions, 3),
    );
    this.tickGeometry.computeBoundingSphere();

    this.add(...this.integerLabels, ...this.axisLabels);
    this.updateAxisGeometry();
    this.setIntegerReveal(this.integerReveal);
  }

  private updateAxisGeometry(): void {
    const { left, right, bottom, top } = this.axisBounds;
    const xMinimum = left * this.axisReveal;
    const xMaximum = right * this.axisReveal;
    const yMinimum = bottom * this.axisReveal;
    const yMaximum = top * this.axisReveal;
    const xAxisVisible = this.viewBounds.bottom <= 0 && this.viewBounds.top >= 0;
    const yAxisVisible = this.viewBounds.left <= 0 && this.viewBounds.right >= 0;

    this.xAxisGeometry.setPositions([
      xMinimum, 0, 0,
      xMaximum, 0, 0,
    ]);
    this.yAxisGeometry.setPositions([
      0, yMinimum, 0,
      0, yMaximum, 0,
    ]);

    this.axisMaterial.opacity = this.axisOpacity * this.axisReveal;
    this.xAxis.visible = xAxisVisible && this.axisReveal > 0;
    this.yAxis.visible = yAxisVisible && this.axisReveal > 0;

    this.xArrow.position.set(xMaximum, 0, 0.005);
    this.yArrow.position.set(0, yMaximum, 0.005);
    this.arrowMaterial.opacity = this.axisOpacity * this.axisReveal;
    this.xArrow.visible =
      xAxisVisible && xMaximum > 0 && this.axisReveal > 0.02;
    this.yArrow.visible =
      yAxisVisible && yMaximum > 0 && this.axisReveal > 0.02;

    for (const label of this.axisLabels) {
      label.setOpacity(this.axisReveal);
    }
  }
}

export function createCoordinatePlane2D(
  options: CoordinatePlane2DOptions,
): CoordinatePlane2D {
  return new CoordinatePlane2D(options);
}
