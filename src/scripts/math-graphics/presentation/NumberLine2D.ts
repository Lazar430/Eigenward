import { HUES } from "../core/colors";
import type { MathScene2D } from "../core/MathScene2D";
import {
  createParametricShape2D,
  type ParametricShape2D,
} from "../primitives/ParametricShape2D";
import {
  createSegment2D,
  type Segment2D,
} from "../primitives/Segment2D";
import {
  createTextLabel2D,
  type TextLabel2D,
} from "../primitives/TextLabel2D";

const TAU = Math.PI * 2;

export interface NumberLine2DStyle {
  axisColor?: number;
  axisOpacity?: number;
  axisWidth?: number;

  tickColor?: number;
  tickOpacity?: number;
  tickWidth?: number;
  tickLabelColor?: string;
  tickLabelFontSizePx?: number;

  pointFill?: number;
  pointOutline?: number;
  pointOutlineWidth?: number;
  pointRadiusPixels?: number;

  intervalColor?: string;
  intervalDelimiterFontSizePx?: number;
  intervalEndpointColor?: string;
  intervalEndpointFontSizePx?: number;
}

export interface ResolvedNumberLine2DStyle {
  axisColor: number;
  axisOpacity: number;
  axisWidth: number;

  tickColor: number;
  tickOpacity: number;
  tickWidth: number;
  tickLabelColor: string;
  tickLabelFontSizePx: number;

  pointFill: number;
  pointOutline: number;
  pointOutlineWidth: number;
  pointRadiusPixels: number;

  intervalColor: string;
  intervalDelimiterFontSizePx: number;
  intervalEndpointColor: string;
  intervalEndpointFontSizePx: number;
}

export interface NumberLine2DOptions {
  scene: MathScene2D;
  centerX: number;
  span: number;
  targetTickCount?: number;
  style?: NumberLine2DStyle;
  name?: string;
}

export interface NumberLinePoint2DOptions {
  name: string;
  x: number;
  fill?: number;
  outline?: number;
  outlineWidth?: number;
}

export interface NumberLineInterval2DOptions {
  name: string;
  left: number;
  right: number;
  leftClosed: boolean;
  rightClosed: boolean;

  /**
   * Visual vertical displacement from the axis in CSS pixels.
   * Zero places the interval directly on the number line.
   */
  yOffsetPixels?: number;

  /**
   * Optional set-membership stroke between the two delimiters.
   * Sequence epsilon-neighborhoods normally omit this; topology intervals
   * normally enable it.
   */
  showStroke?: boolean;
  strokeColor?: number;
  strokeOpacity?: number;
  strokeWidth?: number;

  showEndpointLabels?: boolean;
  endpointFormatter?: (value: number) => string;
  endpointLabelOffsetPixels?: number;

  color?: string;
  delimiterFontSizePx?: number;
  endpointColor?: string;
  endpointFontSizePx?: number;
}

export interface NumberLineFiniteSet2DOptions {
  name: string;
  values: readonly number[];

  /**
   * Screen-space padding from the outermost point to the set brace.
   * This keeps singleton and finite-set braces visually stable under zoom.
   */
  bracePaddingPixels?: number;

  yOffsetPixels?: number;
  color?: string;
  braceFontSizePx?: number;
}

interface TickEntry {
  x: number;
  segment: Segment2D;
  label: TextLabel2D;
}

function resolveStyle(
  style: NumberLine2DStyle = {},
): ResolvedNumberLine2DStyle {
  return {
    /*
     * These defaults are deliberately the same values used by
     * SequencePointsPlayer2D. This module is the visual-language source of
     * truth for all number-line scenes.
     */
    axisColor: style.axisColor ?? 0xeee9ff,
    axisOpacity: style.axisOpacity ?? 0.92,
    axisWidth: style.axisWidth ?? 2.3,

    tickColor: style.tickColor ?? 0xded7f2,
    tickOpacity: style.tickOpacity ?? 0.76,
    tickWidth: style.tickWidth ?? 1.8,
    tickLabelColor:
      style.tickLabelColor ?? "rgba(239, 234, 255, 0.76)",
    tickLabelFontSizePx:
      style.tickLabelFontSizePx ?? 11,

    pointFill: style.pointFill ?? HUES.cyan.light,
    pointOutline: style.pointOutline ?? 0x1a2230,
    pointOutlineWidth: style.pointOutlineWidth ?? 0.025,
    pointRadiusPixels: style.pointRadiusPixels ?? 6,

    intervalColor:
      style.intervalColor ?? "rgba(255, 222, 150, 0.98)",
    intervalDelimiterFontSizePx:
      style.intervalDelimiterFontSizePx ?? 30,
    intervalEndpointColor:
      style.intervalEndpointColor ?? "rgba(255, 237, 198, 0.94)",
    intervalEndpointFontSizePx:
      style.intervalEndpointFontSizePx ?? 12,
  };
}

export function niceNumberLineTickStep2D(
  span: number,
  targetTickCount: number,
): number {
  const rough =
    span / Math.max(2, targetTickCount);

  const exponent = Math.floor(
    Math.log10(Math.max(rough, Number.MIN_VALUE)),
  );

  const power = 10 ** exponent;
  const normalized = rough / power;

  const factor =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 5
          ? 5
          : 10;

  return factor * power;
}

export function formatNumberLineTick2D(
  value: number,
  step: number,
): string {
  if (Math.abs(value) <= Math.abs(step) * 1e-8) {
    return "0";
  }

  const absolute = Math.abs(value);

  if (absolute >= 1e5 || absolute < 1e-4) {
    return value
      .toExponential(2)
      .replace(/(\.\d*?[1-9])0+e/, "$1e")
      .replace(/\.0+e/, "e")
      .replace("e+", "e");
  }

  const decimals = Math.min(
    8,
    Math.max(
      0,
      Math.ceil(-Math.log10(Math.abs(step))) + 1,
    ),
  );

  return Number(value.toFixed(decimals)).toString();
}

export function createNumberLinePoint2D(
  options: NumberLinePoint2DOptions,
  style: NumberLine2DStyle = {},
): ParametricShape2D {
  const resolved = resolveStyle(style);

  const marker = createParametricShape2D({
    name: options.name,
    curve: (parameter) => [
      Math.cos(parameter),
      Math.sin(parameter),
    ],
    domain: [0, TAU],
    segments: 72,
    style: {
      fill:
        options.fill ??
        resolved.pointFill,
      fillOpacity: 1,
      outline:
        options.outline ??
        resolved.pointOutline,
      outlineWidth:
        options.outlineWidth ??
        resolved.pointOutlineWidth,
      outlineOpacity: 1,
    },
  }).moveTo(options.x, 0);

  /*
   * Keep point markers in front of the axis and interval membership strokes.
   */
  marker.position.z = 0.03;

  return marker;
}

export class NumberLineInterval2D {
  readonly stroke: Segment2D | null;
  readonly leftDelimiter: TextLabel2D;
  readonly rightDelimiter: TextLabel2D;
  readonly leftEndpointLabel: TextLabel2D | null;
  readonly rightEndpointLabel: TextLabel2D | null;

  private left: number;
  private right: number;
  private readonly yOffsetPixels: number;
  private readonly endpointLabelOffsetPixels: number;

  constructor(
    private readonly numberLine: NumberLine2D,
    private readonly options: NumberLineInterval2DOptions,
  ) {
    if (!(options.right > options.left)) {
      throw new RangeError(
        "A number-line interval requires right > left.",
      );
    }

    this.left = options.left;
    this.right = options.right;
    this.yOffsetPixels = options.yOffsetPixels ?? 0;
    this.endpointLabelOffsetPixels =
      options.endpointLabelOffsetPixels ?? 24;

    const visual =
      numberLine.getResolvedStyle();

    const color =
      options.color ??
      visual.intervalColor;

    const delimiterFontSizePx =
      options.delimiterFontSizePx ??
      visual.intervalDelimiterFontSizePx;

    const endpointColor =
      options.endpointColor ??
      visual.intervalEndpointColor;

    const endpointFontSizePx =
      options.endpointFontSizePx ??
      visual.intervalEndpointFontSizePx;

    this.leftDelimiter = createTextLabel2D({
      name: `${options.name}:left-delimiter`,
      text: options.leftClosed ? "[" : "(",
      position: [this.left, 0],
      anchor: [0.5, 0.5],
      color,
      fontSizePx: delimiterFontSizePx,
      fontWeight: 500,
      background: "transparent",
      padding: "0",
    });

    this.rightDelimiter = createTextLabel2D({
      name: `${options.name}:right-delimiter`,
      text: options.rightClosed ? "]" : ")",
      position: [this.right, 0],
      anchor: [0.5, 0.5],
      color,
      fontSizePx: delimiterFontSizePx,
      fontWeight: 500,
      background: "transparent",
      padding: "0",
    });

    if (options.showStroke ?? false) {
      this.stroke = createSegment2D({
        name: `${options.name}:stroke`,
        start: [this.left, 0],
        end: [this.right, 0],
        style: {
          color: options.strokeColor ?? 0x8f84b7,
          opacity: options.strokeOpacity ?? 0.55,
          width: options.strokeWidth ?? 5.2,
        },
      });

      /*
       * The main number-line axis remains visually legible over the set stroke.
       */
      this.stroke.position.z = -0.02;
    } else {
      this.stroke = null;
    }

    const formatter =
      options.endpointFormatter ??
      ((value: number) => String(Number(value.toPrecision(7))));

    if (options.showEndpointLabels ?? true) {
      this.leftEndpointLabel = createTextLabel2D({
        name: `${options.name}:left-endpoint-label`,
        text: formatter(this.left),
        position: [this.left, 0],
        anchor: [0.5, 0],
        color: endpointColor,
        fontSizePx: endpointFontSizePx,
        fontWeight: 600,
        background: "rgba(18, 17, 24, 0.66)",
        borderRadiusPx: 5,
        padding: "0.08rem 0.22rem",
      });

      this.rightEndpointLabel = createTextLabel2D({
        name: `${options.name}:right-endpoint-label`,
        text: formatter(this.right),
        position: [this.right, 0],
        anchor: [0.5, 0],
        color: endpointColor,
        fontSizePx: endpointFontSizePx,
        fontWeight: 600,
        background: "rgba(18, 17, 24, 0.66)",
        borderRadiusPx: 5,
        padding: "0.08rem 0.22rem",
      });
    } else {
      this.leftEndpointLabel = null;
      this.rightEndpointLabel = null;
    }

    numberLine.scene.add(
      ...(this.stroke ? [this.stroke] : []),
      this.leftDelimiter,
      this.rightDelimiter,
      ...(this.leftEndpointLabel ? [this.leftEndpointLabel] : []),
      ...(this.rightEndpointLabel ? [this.rightEndpointLabel] : []),
    );

    numberLine.registerInterval(this);
    this.layout();
  }

  setBounds(
    left: number,
    right: number,
  ): this {
    if (!(right > left)) {
      throw new RangeError(
        "A number-line interval requires right > left.",
      );
    }

    this.left = left;
    this.right = right;

    const formatter =
      this.options.endpointFormatter ??
      ((value: number) => String(Number(value.toPrecision(7))));

    this.leftEndpointLabel?.setText(
      formatter(left),
    );

    this.rightEndpointLabel?.setText(
      formatter(right),
    );

    this.layout();
    return this;
  }

  show(): this {
    this.stroke?.show();
    this.leftDelimiter.show();
    this.rightDelimiter.show();
    this.leftEndpointLabel?.show();
    this.rightEndpointLabel?.show();
    return this;
  }

  hide(): this {
    this.stroke?.hide();
    this.leftDelimiter.hide();
    this.rightDelimiter.hide();
    this.leftEndpointLabel?.hide();
    this.rightEndpointLabel?.hide();
    return this;
  }

  layout(): void {
    const worldPerPixel =
      this.numberLine.getWorldPerPixel();

    const y =
      this.yOffsetPixels *
      worldPerPixel;

    this.stroke?.setEndpoints(
      [this.left, y],
      [this.right, y],
    );

    this.leftDelimiter.moveTo(
      this.left,
      y,
    );

    this.rightDelimiter.moveTo(
      this.right,
      y,
    );

    const endpointY =
      y -
      this.endpointLabelOffsetPixels *
        worldPerPixel;

    this.leftEndpointLabel?.moveTo(
      this.left,
      endpointY,
    );

    this.rightEndpointLabel?.moveTo(
      this.right,
      endpointY,
    );
  }
}

export class NumberLineFiniteSet2D {
  readonly leftBrace: TextLabel2D;
  readonly rightBrace: TextLabel2D;

  private readonly values: readonly number[];
  private readonly bracePaddingPixels: number;
  private readonly yOffsetPixels: number;

  constructor(
    private readonly numberLine: NumberLine2D,
    options: NumberLineFiniteSet2DOptions,
  ) {
    if (options.values.length === 0) {
      throw new RangeError(
        "A finite-set number-line decoration requires at least one value.",
      );
    }

    this.values = [...options.values].sort((a, b) => a - b);
    this.bracePaddingPixels =
      options.bracePaddingPixels ?? 14;
    this.yOffsetPixels =
      options.yOffsetPixels ?? 0;

    const visual =
      numberLine.getResolvedStyle();

    const color =
      options.color ??
      visual.intervalColor;

    const fontSizePx =
      options.braceFontSizePx ??
      visual.intervalDelimiterFontSizePx;

    this.leftBrace = createTextLabel2D({
      name: `${options.name}:left-brace`,
      text: "{",
      position: [this.values[0], 0],
      anchor: [0.5, 0.5],
      color,
      fontSizePx,
      fontWeight: 500,
      background: "transparent",
      padding: "0",
    });

    this.rightBrace = createTextLabel2D({
      name: `${options.name}:right-brace`,
      text: "}",
      position: [this.values[this.values.length - 1], 0],
      anchor: [0.5, 0.5],
      color,
      fontSizePx,
      fontWeight: 500,
      background: "transparent",
      padding: "0",
    });

    numberLine.scene.add(
      this.leftBrace,
      this.rightBrace,
    );

    numberLine.registerFiniteSet(this);
    this.layout();
  }

  show(): this {
    this.leftBrace.show();
    this.rightBrace.show();
    return this;
  }

  hide(): this {
    this.leftBrace.hide();
    this.rightBrace.hide();
    return this;
  }

  layout(): void {
    const worldPerPixel =
      this.numberLine.getWorldPerPixel();

    const y =
      this.yOffsetPixels *
      worldPerPixel;

    const padding =
      this.bracePaddingPixels *
      worldPerPixel;

    this.leftBrace.moveTo(
      this.values[0] - padding,
      y,
    );

    this.rightBrace.moveTo(
      this.values[this.values.length - 1] + padding,
      y,
    );
  }
}

/**
 * Shared visual foundation for one-dimensional diagrams.
 *
 * It intentionally reproduces the number-line appearance used by the sequence
 * scenes: the same axis weight, automatic 1/2/5 tick spacing, tick-label
 * styling, screen-space point sizing, and interval delimiters.
 *
 * The class owns the axis/ticks and lays out registered interval/finite-set
 * decorations whenever the camera scale changes.
 */
export class NumberLine2D {
  readonly scene: MathScene2D;
  readonly axis: Segment2D;

  private readonly canvas: HTMLCanvasElement;
  private readonly name: string;
  private readonly style: ResolvedNumberLine2DStyle;
  private readonly targetTickCount: number;

  private tickEntries: TickEntry[] = [];
  private readonly intervals =
    new Set<NumberLineInterval2D>();
  private readonly finiteSets =
    new Set<NumberLineFiniteSet2D>();

  private centerX: number;
  private span: number;
  private unitSizePixels = 1;

  constructor(options: NumberLine2DOptions) {
    if (!(options.span > 0)) {
      throw new RangeError(
        "A number line requires span > 0.",
      );
    }

    this.scene = options.scene;
    this.canvas = options.scene.canvas;
    this.name = options.name ?? "number-line-2d";
    this.style = resolveStyle(options.style);
    this.targetTickCount = Math.max(
      2,
      Math.floor(options.targetTickCount ?? 7),
    );

    this.centerX = options.centerX;
    this.span = options.span;

    this.axis = createSegment2D({
      name: `${this.name}:axis`,
      start: [
        this.centerX - this.span / 2,
        0,
      ],
      end: [
        this.centerX + this.span / 2,
        0,
      ],
      style: {
        color: this.style.axisColor,
        opacity: this.style.axisOpacity,
        width: this.style.axisWidth,
      },
    });

    this.axis.position.z = 0;

    this.scene.add(this.axis);

    this.layout();
    this.rebuildTicks();
  }

  getResolvedStyle(): Readonly<ResolvedNumberLine2DStyle> {
    return this.style;
  }

  getCenterX(): number {
    return this.centerX;
  }

  getSpan(): number {
    return this.span;
  }

  getUnitSizePixels(): number {
    return this.unitSizePixels;
  }

  getWorldPerPixel(): number {
    return 1 / this.unitSizePixels;
  }

  getBounds(): {
    left: number;
    right: number;
  } {
    return {
      left:
        this.centerX -
        this.span / 2,
      right:
        this.centerX +
        this.span / 2,
    };
  }

  getCanvasHeightPixels(): number {
    const rectangle =
      this.canvas.getBoundingClientRect();

    return (
      rectangle.height ||
      this.canvas.clientHeight ||
      450
    );
  }

  setView(
    centerX: number,
    span: number,
  ): this {
    if (!(span > 0)) {
      throw new RangeError(
        "A number line requires span > 0.",
      );
    }

    this.centerX = centerX;
    this.span = span;
    this.layout();
    return this;
  }

  createPoint(
    options: NumberLinePoint2DOptions,
  ): ParametricShape2D {
    return createNumberLinePoint2D(
      options,
      {
        pointFill:
          this.style.pointFill,
        pointOutline:
          this.style.pointOutline,
        pointOutlineWidth:
          this.style.pointOutlineWidth,
      },
    );
  }

  resizePoint(
    point: ParametricShape2D,
    radiusPixels =
      this.style.pointRadiusPixels,
    scale = 1,
  ): this {
    point.resizeTo(
      radiusPixels *
      this.getWorldPerPixel() *
      scale,
    );

    return this;
  }

  createInterval(
    options: NumberLineInterval2DOptions,
  ): NumberLineInterval2D {
    return new NumberLineInterval2D(
      this,
      options,
    );
  }

  createFiniteSet(
    options: NumberLineFiniteSet2DOptions,
  ): NumberLineFiniteSet2D {
    return new NumberLineFiniteSet2D(
      this,
      options,
    );
  }

  registerInterval(
    interval: NumberLineInterval2D,
  ): void {
    this.intervals.add(interval);
  }

  registerFiniteSet(
    finiteSet: NumberLineFiniteSet2D,
  ): void {
    this.finiteSets.add(finiteSet);
  }

  clearTicks(): void {
    for (
      const {
        segment,
        label,
      } of this.tickEntries
    ) {
      this.scene.remove(
        segment,
        label,
      );

      segment.dispose();
      label.dispose();
    }

    this.tickEntries = [];
  }

  rebuildTicks(
    nameSuffix = "",
  ): void {
    this.clearTicks();

    const step =
      niceNumberLineTickStep2D(
        this.span,
        this.targetTickCount,
      );

    const bounds =
      this.getBounds();

    const first =
      Math.ceil(
        bounds.left /
        step -
        1e-10,
      ) *
      step;

    for (
      let index = 0;
      index < 40;
      index += 1
    ) {
      const x =
        first +
        index * step;

      if (
        x >
        bounds.right +
        step * 1e-8
      ) {
        break;
      }

      const segment =
        createSegment2D({
          name:
            `${this.name}:tick${nameSuffix}:${index}`,
          start: [x, 0],
          end: [x, 0],
          style: {
            color:
              this.style.tickColor,
            opacity:
              this.style.tickOpacity,
            width:
              this.style.tickWidth,
          },
        });

      const label =
        createTextLabel2D({
          name:
            `${this.name}:tick-label${nameSuffix}:${index}`,
          text:
            formatNumberLineTick2D(
              x,
              step,
            ),
          position: [x, 0],
          anchor: [0.5, 0],
          color:
            this.style.tickLabelColor,
          fontSizePx:
            this.style.tickLabelFontSizePx,
          fontWeight: 560,
          background: "transparent",
          padding: "0",
        });

      this.tickEntries.push({
        x,
        segment,
        label,
      });

      this.scene.add(
        segment,
        label,
      );
    }

    this.layout();
  }

  layout(): void {
    const rectangle =
      this.canvas.getBoundingClientRect();

    const width =
      rectangle.width ||
      this.canvas.clientWidth ||
      800;

    if (width <= 0) {
      return;
    }

    this.unitSizePixels =
      width / this.span;

    const worldPerPixel =
      this.getWorldPerPixel();

    const bounds =
      this.getBounds();

    this.scene.setView({
      unitSizePixels:
        this.unitSizePixels,
      center: [
        this.centerX,
        0,
      ],
    });

    const edgeInset =
      7 * worldPerPixel;

    this.axis.setEndpoints(
      [
        bounds.left +
        edgeInset,
        0,
      ],
      [
        bounds.right -
        edgeInset,
        0,
      ],
    );

    const tickHalfHeight =
      5 * worldPerPixel;

    const tickLabelY =
      -17 * worldPerPixel;

    for (
      const {
        x,
        segment,
        label,
      } of this.tickEntries
    ) {
      segment.setEndpoints(
        [
          x,
          -tickHalfHeight,
        ],
        [
          x,
          tickHalfHeight,
        ],
      );

      label.moveTo(
        x,
        tickLabelY,
      );
    }

    for (
      const interval of
      this.intervals
    ) {
      interval.layout();
    }

    for (
      const finiteSet of
      this.finiteSets
    ) {
      finiteSet.layout();
    }
  }
}

export function createNumberLine2D(
  options: NumberLine2DOptions,
): NumberLine2D {
  return new NumberLine2D(options);
}
