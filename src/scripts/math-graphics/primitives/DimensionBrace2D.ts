import type { ColorRepresentation } from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { COLORS } from "../core/colors";
import { MathObject2D } from "../core/MathObject2D";
import type { Vec2Tuple } from "../core/types";
import {
  TextLabel2D,
  createTextLabel2D,
} from "./TextLabel2D";

const EPSILON = 1e-10;

export type DimensionBraceSide2D =
  | "left"
  | "right"
  | "away-from-reference"
  | "toward-reference";

export interface DimensionBrace2DStyle {
  color?: ColorRepresentation;
  opacity?: number;

  /** Screen-space width in CSS/WebGL pixels. */
  width?: number;

  /**
   * Distance from the measured segment to the brace's straight stems.
   * World units.
   */
  offset?: number;

  /**
   * How far the terminal hooks curl back toward the measured segment.
   * World units.
   */
  hookDepth?: number;

  /**
   * How far the central cusp projects away from the measured segment.
   * World units.
   */
  cuspDepth?: number;

  /**
   * Samples along the complete brace curve.
   * Higher values make the Bézier shape smoother.
   */
  samples?: number;
}

export interface DimensionBrace2DLabelStyle {
  color?: string;
  fontSizePx?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  background?: string;
  border?: string;
  borderRadiusPx?: number;
  padding?: string;
  opacity?: number;

  /**
   * Extra spacing beyond the central cusp, away from the measured geometry.
   *
   * Increase this to push the label farther away from the measured side;
   * decrease it to pull the label toward the brace.
   */
  offset?: number;

  /**
   * Shift the label parallel to the measured side, in world units.
   *
   * Positive values move from start toward end.
   * Negative values move from end toward start.
   *
   * Default: 0, which keeps the label centered at the brace cusp.
   */
  alongOffset?: number;
}

export type DimensionBrace2DLabel =
  | {
      text: string;
      latex?: never;
      style?: DimensionBrace2DLabelStyle;
    }
  | {
      latex: string;
      text?: never;
      style?: DimensionBrace2DLabelStyle;
    };

export interface DimensionBrace2DOptions {
  start: Vec2Tuple;
  end: Vec2Tuple;

  /**
   * A reference point used to determine which side is the outside.
   *
   * For a triangle side AB, pass the opposite vertex C and use
   * side: "away-from-reference".
   */
  referencePoint?: Vec2Tuple;

  side?: DimensionBraceSide2D;
  style?: DimensionBrace2DStyle;
  label?: DimensionBrace2DLabel;
  name?: string;
}

type BraceProfilePoint = readonly [
  along: number,
  transverse: number,
];

type CubicBracePiece = readonly [
  BraceProfilePoint,
  BraceProfilePoint,
  BraceProfilePoint,
  BraceProfilePoint,
];

/*
 * A genuine curly-brace profile.
 *
 * Local coordinates:
 *   along       = 0..1 from start to end of the measured side
 *   transverse = -1..+1 relative to the brace stem
 *
 * IMPORTANT:
 *   - terminal hooks are NEGATIVE: they curl toward the measured geometry;
 *   - central cusp is POSITIVE: it projects away from the geometry.
 *
 * This is the defining geometry of a conventional { / } brace.
 *
 * The six cubic Bézier pieces are mirror-symmetric about along = 1/2:
 *
 *   hook -> upper stem -> upper cusp
 *        -> lower cusp -> lower stem -> hook
 */
const CURLY_BRACE_PROFILE:
  readonly CubicBracePiece[] = [
  [
    [0.00, -1.00],
    [0.00, -0.56],
    [0.048, 0.00],
    [0.13, 0.00],
  ],
  [
    [0.13, 0.00],
    [0.19, 0.00],
    [0.31, 0.00],
    [0.38, 0.00],
  ],
  [
    [0.38, 0.00],
    [0.455, 0.00],
    [0.50, 0.42],
    [0.50, 0.68],
  ],
  [
    [0.50, 0.68],
    [0.50, 0.42],
    [0.545, 0.00],
    [0.62, 0.00],
  ],
  [
    [0.62, 0.00],
    [0.69, 0.00],
    [0.81, 0.00],
    [0.87, 0.00],
  ],
  [
    [0.87, 0.00],
    [0.952, 0.00],
    [1.00, -0.56],
    [1.00, -1.00],
  ],
];

function clampOpacity(
  value: number,
): number {
  return Math.min(
    1,
    Math.max(0, value),
  );
}

function assertFinitePoint(
  point: Vec2Tuple,
  label: string,
): void {
  if (
    !Number.isFinite(point[0]) ||
    !Number.isFinite(point[1])
  ) {
    throw new RangeError(
      `${label} must contain two finite numbers.`,
    );
  }
}

function cubicBezier(
  a: number,
  b: number,
  c: number,
  d: number,
  t: number,
): number {
  const u = 1 - t;

  return (
    u * u * u * a +
    3 * u * u * t * b +
    3 * u * t * t * c +
    t * t * t * d
  );
}

function sampleProfile(
  sampleCount: number,
): BraceProfilePoint[] {
  const samplesPerPiece =
    Math.max(
      6,
      Math.ceil(
        Math.max(36, sampleCount) /
        CURLY_BRACE_PROFILE.length,
      ),
    );

  const points:
    BraceProfilePoint[] = [];

  CURLY_BRACE_PROFILE.forEach(
    (piece, pieceIndex) => {
      const [
        p0,
        p1,
        p2,
        p3,
      ] = piece;

      for (
        let index = 0;
        index <= samplesPerPiece;
        index += 1
      ) {
        if (
          pieceIndex > 0 &&
          index === 0
        ) {
          continue;
        }

        const t =
          index /
          samplesPerPiece;

        points.push([
          cubicBezier(
            p0[0],
            p1[0],
            p2[0],
            p3[0],
            t,
          ),
          cubicBezier(
            p0[1],
            p1[1],
            p2[1],
            p3[1],
            t,
          ),
        ]);
      }
    },
  );

  return points;
}

function flattenPositions(
  points: readonly Vec2Tuple[],
): number[] {
  const positions: number[] = [];

  for (const point of points) {
    positions.push(
      point[0],
      point[1],
      0.025,
    );
  }

  return positions;
}

/**
 * Smooth conventional curly brace used for geometric dimension annotations.
 *
 * The primitive owns one persistent Line2 and one TextLabel2D.
 * Moving or resizing the measured side updates the existing GPU geometry.
 */
export class DimensionBrace2D
  extends MathObject2D {
  readonly label: TextLabel2D;

  private readonly geometry =
    new LineGeometry();

  private readonly material:
    LineMaterial;

  private readonly line: Line2;

  private startPoint: Vec2Tuple;
  private endPoint: Vec2Tuple;

  private referencePoint:
    Vec2Tuple | null;

  private side:
    DimensionBraceSide2D;

  private offset: number;
  private explicitHookDepth:
    number | null;

  private explicitCuspDepth:
    number | null;

  private sampleCount: number;
  private labelOffset: number;
  private labelAlongOffset: number;

  private fullWorldPoints: Vec2Tuple[] = [];
  private revealProgress = 1;

  constructor({
    start,
    end,
    referencePoint,
    side = referencePoint
      ? "away-from-reference"
      : "left",
    style = {},
    label,
    name = "dimension-brace-2d",
  }: DimensionBrace2DOptions) {
    super();

    assertFinitePoint(
      start,
      "start",
    );

    assertFinitePoint(
      end,
      "end",
    );

    if (referencePoint) {
      assertFinitePoint(
        referencePoint,
        "referencePoint",
      );
    }

    this.name = name;

    this.startPoint = [
      start[0],
      start[1],
    ];

    this.endPoint = [
      end[0],
      end[1],
    ];

    this.referencePoint =
      referencePoint
        ? [
            referencePoint[0],
            referencePoint[1],
          ]
        : null;

    this.side = side;

    this.offset =
      Math.max(
        0,
        style.offset ?? 0.34,
      );

    this.explicitHookDepth =
      style.hookDepth === undefined
        ? null
        : Math.max(
            0,
            style.hookDepth,
          );

    this.explicitCuspDepth =
      style.cuspDepth === undefined
        ? null
        : Math.max(
            0,
            style.cuspDepth,
          );

    this.sampleCount =
      Math.max(
        36,
        Math.floor(
          style.samples ?? 108,
        ),
      );

    const labelStyle =
      label?.style ?? {};

    this.labelOffset =
      Math.max(
        0,
        labelStyle.offset ?? 0.22,
      );

    this.labelAlongOffset =
      Number.isFinite(
        labelStyle.alongOffset,
      )
        ? labelStyle.alongOffset ?? 0
        : 0;

    this.material =
      new LineMaterial({
        color:
          style.color ??
          COLORS.white,

        opacity:
          clampOpacity(
            style.opacity ?? 1,
          ),

        transparent: true,
        depthTest: false,
        depthWrite: false,
        alphaToCoverage: true,
      });

    this.material.linewidth =
      Math.max(
        0,
        style.width ?? 3.4,
      );

    this.line =
      new Line2(
        this.geometry,
        this.material,
      );

    this.line.name =
      `${name}:brace`;

    this.line.renderOrder = 3;

    const labelBase = {
      name:
        `${name}:label`,

      position:
        [0, 0] as Vec2Tuple,

      anchor:
        [0.5, 0.5] as Vec2Tuple,

      color:
        labelStyle.color ??
        "rgba(239, 245, 255, 0.98)",

      fontSizePx:
        labelStyle.fontSizePx ??
        14,

      fontFamily:
        labelStyle.fontFamily,

      fontWeight:
        labelStyle.fontWeight ??
        760,

      background:
        labelStyle.background ??
        "rgba(20, 22, 38, 0.82)",

      border:
        labelStyle.border ??
        "1px solid rgba(130, 224, 205, 0.20)",

      borderRadiusPx:
        labelStyle.borderRadiusPx ??
        7,

      padding:
        labelStyle.padding ??
        "0.10rem 0.32rem",

      opacity:
        labelStyle.opacity ?? 1,
    };

    if (
      label &&
      "latex" in label
    ) {
      this.label =
        createTextLabel2D({
          ...labelBase,
          latex:
            label.latex,
        });
    } else {
      this.label =
        createTextLabel2D({
          ...labelBase,
          text:
            label?.text ?? "",
        });
    }

    this.add(
      this.line,
      this.label,
    );

    this.updateGeometry();
  }

  getStart(): Vec2Tuple {
    return [
      this.startPoint[0],
      this.startPoint[1],
    ];
  }

  getEnd(): Vec2Tuple {
    return [
      this.endPoint[0],
      this.endPoint[1],
    ];
  }

  setEndpoints(
    start: Vec2Tuple,
    end: Vec2Tuple,
  ): this {
    assertFinitePoint(
      start,
      "start",
    );

    assertFinitePoint(
      end,
      "end",
    );

    this.startPoint = [
      start[0],
      start[1],
    ];

    this.endPoint = [
      end[0],
      end[1],
    ];

    this.updateGeometry();
    return this.changed();
  }

  setReferencePoint(
    point: Vec2Tuple | null,
  ): this {
    if (point) {
      assertFinitePoint(
        point,
        "referencePoint",
      );
    }

    this.referencePoint =
      point
        ? [
            point[0],
            point[1],
          ]
        : null;

    this.updateGeometry();
    return this.changed();
  }

  setSide(
    side: DimensionBraceSide2D,
  ): this {
    this.side = side;
    this.updateGeometry();
    return this.changed();
  }

  setOffset(
    offset: number,
  ): this {
    this.offset =
      Math.max(0, offset);

    this.updateGeometry();
    return this.changed();
  }

  setHookDepth(
    hookDepth: number | null,
  ): this {
    this.explicitHookDepth =
      hookDepth === null
        ? null
        : Math.max(
            0,
            hookDepth,
          );

    this.updateGeometry();
    return this.changed();
  }

  setCuspDepth(
    cuspDepth: number | null,
  ): this {
    this.explicitCuspDepth =
      cuspDepth === null
        ? null
        : Math.max(
            0,
            cuspDepth,
          );

    this.updateGeometry();
    return this.changed();
  }

  setColor(
    color: ColorRepresentation,
  ): this {
    this.material.color.set(color);
    return this.changed();
  }

  setOpacity(
    opacity: number,
  ): this {
    const resolved =
      clampOpacity(opacity);

    this.material.opacity =
      resolved;

    this.material.visible =
      resolved > 0;

    this.label.setOpacity(
      resolved,
    );

    return this.changed();
  }

  setWidth(
    widthPixels: number,
  ): this {
    this.material.linewidth =
      Math.max(
        0,
        widthPixels,
      );

    return this.changed();
  }

  setLabelText(
    text: string,
  ): this {
    this.label.setText(text);
    return this.changed();
  }

  setLabelLatex(
    latex: string,
  ): this {
    this.label.setLatex(latex);
    return this.changed();
  }

  setLabelOpacity(
    opacity: number,
  ): this {
    this.label.setOpacity(
      opacity,
    );

    return this.changed();
  }

  setLabelOffset(
    offset: number,
  ): this {
    this.labelOffset =
      Math.max(0, offset);

    this.updateGeometry();
    return this.changed();
  }

  setLabelAlongOffset(
    alongOffset: number,
  ): this {
    this.labelAlongOffset =
      Number.isFinite(alongOffset)
        ? alongOffset
        : 0;

    this.updateGeometry();
    return this.changed();
  }

  setRevealProgress(
    progress: number,
  ): this {
    this.revealProgress =
      Math.min(
        1,
        Math.max(0, progress),
      );

    this.updateVisibleGeometry();
    return this.changed();
  }

  getRevealProgress(): number {
    return this.revealProgress;
  }

  showCompleteBrace(): this {
    return this.setRevealProgress(1);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private resolveOutwardNormal(
    ux: number,
    uy: number,
    midpoint: Vec2Tuple,
  ): Vec2Tuple {
    const leftNormal:
      Vec2Tuple = [
      -uy,
      ux,
    ];

    if (
      this.side === "left"
    ) {
      return leftNormal;
    }

    if (
      this.side === "right"
    ) {
      return [
        -leftNormal[0],
        -leftNormal[1],
      ];
    }

    if (!this.referencePoint) {
      return leftNormal;
    }

    const toReference:
      Vec2Tuple = [
      this.referencePoint[0] -
        midpoint[0],

      this.referencePoint[1] -
        midpoint[1],
    ];

    const leftDot =
      leftNormal[0] *
        toReference[0] +
      leftNormal[1] *
        toReference[1];

    const leftPointsTowardReference =
      leftDot >= 0;

    const wantToward =
      this.side ===
      "toward-reference";

    const useLeft =
      wantToward
        ? leftPointsTowardReference
        : !leftPointsTowardReference;

    return useLeft
      ? leftNormal
      : [
          -leftNormal[0],
          -leftNormal[1],
        ];
  }

  private updateVisibleGeometry(): void {
    const points = this.fullWorldPoints;

    if (points.length < 2) {
      return;
    }

    /*
     * IMPORTANT:
     *
     * Keep the LineGeometry topology CONSTANT throughout the animation.
     *
     * Line2 / LineGeometry is not a good fit for repeatedly changing the
     * number of sampled points every frame. Instead, every reveal state uses
     * exactly the same number of points as the complete brace:
     *
     *   - points before the reveal tip keep their real positions;
     *   - the segment containing the tip is interpolated;
     *   - every point after the tip collapses onto that same tip.
     *
     * The curve therefore grows visually while its GPU-side topology remains
     * fixed.
     */

    const progress =
      Math.min(
        1,
        Math.max(
          0,
          this.revealProgress,
        ),
      );

    const segmentLengths: number[] = [];
    const cumulativeLengths: number[] = [0];

    let totalLength = 0;

    for (
      let index = 0;
      index < points.length - 1;
      index += 1
    ) {
      const current = points[index];
      const next = points[index + 1];

      const length = Math.hypot(
        next[0] - current[0],
        next[1] - current[1],
      );

      segmentLengths.push(length);

      totalLength += length;
      cumulativeLengths.push(totalLength);
    }

    if (!(totalLength > EPSILON)) {
      const first = points[0];

      const collapsed =
        points.map(
          () =>
            [
              first[0],
              first[1],
            ] as Vec2Tuple,
        );

      this.geometry.setPositions(
        flattenPositions(
          collapsed,
        ),
      );

      this.line.computeLineDistances();
      return;
    }

    if (progress >= 1) {
      this.geometry.setPositions(
        flattenPositions(points),
      );

      this.line.computeLineDistances();
      return;
    }

    const targetLength =
      totalLength * progress;

    let tip: Vec2Tuple = [
      points[0][0],
      points[0][1],
    ];

    let tipSegmentIndex = 0;

    if (progress > 0) {
      for (
        let index = 0;
        index < segmentLengths.length;
        index += 1
      ) {
        const segmentStart =
          cumulativeLengths[index];

        const segmentEnd =
          cumulativeLengths[index + 1];

        if (
          targetLength <=
          segmentEnd + EPSILON
        ) {
          const current =
            points[index];

          const next =
            points[index + 1];

          const segmentLength =
            segmentLengths[index];

          const localProgress =
            segmentLength <= EPSILON
              ? 0
              : Math.min(
                  1,
                  Math.max(
                    0,
                    (
                      targetLength -
                      segmentStart
                    ) /
                      segmentLength,
                  ),
                );

          tip = [
            current[0] +
              (
                next[0] -
                current[0]
              ) *
                localProgress,

            current[1] +
              (
                next[1] -
                current[1]
              ) *
                localProgress,
          ];

          tipSegmentIndex = index;
          break;
        }
      }
    }

    const visiblePoints:
      Vec2Tuple[] =
      points.map(
        (point, index) => {
          /*
           * A sampled point is fully revealed only if its cumulative arc
           * distance lies behind the current reveal tip.
           */
          if (
            cumulativeLengths[index] <=
            targetLength + EPSILON
          ) {
            return [
              point[0],
              point[1],
            ];
          }

          /*
           * All unrevealed samples collapse onto the same moving tip. Because
           * the array length never changes, LineGeometry keeps a stable set of
           * line-segment instances throughout the animation.
           */
          return [
            tip[0],
            tip[1],
          ];
        },
      );

    /*
     * Make sure the first not-yet-fully-revealed sample is exactly the
     * interpolated tip. This matters at very small progress values.
     */
    const tipPointIndex =
      Math.min(
        visiblePoints.length - 1,
        tipSegmentIndex + 1,
      );

    visiblePoints[
      tipPointIndex
    ] = [
      tip[0],
      tip[1],
    ];

    this.geometry.setPositions(
      flattenPositions(
        visiblePoints,
      ),
    );

    this.line.computeLineDistances();
  }

  private updateGeometry(): void {
    const dx =
      this.endPoint[0] -
      this.startPoint[0];

    const dy =
      this.endPoint[1] -
      this.startPoint[1];

    const length =
      Math.hypot(dx, dy);

    if (
      length <= EPSILON
    ) {
      this.fullWorldPoints = [
        [this.startPoint[0], this.startPoint[1]],
        [this.startPoint[0], this.startPoint[1]],
      ];

      this.updateVisibleGeometry();

      this.label.moveTo(
        this.startPoint[0],
        this.startPoint[1],
      );

      return;
    }

    const ux =
      dx / length;

    const uy =
      dy / length;

    const midpoint:
      Vec2Tuple = [
      (
        this.startPoint[0] +
        this.endPoint[0]
      ) / 2,

      (
        this.startPoint[1] +
        this.endPoint[1]
      ) / 2,
    ];

    /*
     * outwardNormal points AWAY from the measured geometry.
     *
     * Therefore:
     *   negative transverse values -> toward geometry -> terminal hooks;
     *   positive transverse values -> away from geometry -> central cusp.
     */
    const outwardNormal =
      this.resolveOutwardNormal(
        ux,
        uy,
        midpoint,
      );

    const automaticHookDepth =
      Math.min(
        0.42,
        Math.max(
          0.20,
          length * 0.12,
        ),
      );

    /*
     * The terminal tip of a conventional dimension brace should meet the
     * measured segment, not cross through it.
     *
     * The old implementation allowed hookDepth > offset. Since the end of the
     * brace profile has transverse = -1, that produced
     *
     *   normalDistance = offset - hookDepth < 0,
     *
     * which visibly pushed inward braces beyond their endpoints.
     *
     * Capping the effective hook depth at the brace offset guarantees
     * normalDistance >= 0 for the entire hook and makes the terminal tips stop
     * at (or just outside) the measured side.
     */
    const requestedHookDepth =
      this.explicitHookDepth ??
      automaticHookDepth;

    const hookDepth =
      Math.min(
        this.offset,
        requestedHookDepth,
      );

    const cuspDepth =
      this.explicitCuspDepth ??
      hookDepth * 0.68;

    const profile =
      sampleProfile(
        this.sampleCount,
      );

    const worldPoints:
      Vec2Tuple[] =
      profile.map(
        ([
          along,
          transverse,
        ]) => {
          const transverseDistance =
            transverse < 0
              ? transverse *
                hookDepth

              : transverse /
                0.68 *
                cuspDepth;

          const normalDistance =
            this.offset +
            transverseDistance;

          return [
            this.startPoint[0] +
              ux *
                along *
                length +
              outwardNormal[0] *
                normalDistance,

            this.startPoint[1] +
              uy *
                along *
                length +
              outwardNormal[1] *
                normalDistance,
          ];
        },
      );

    this.fullWorldPoints =
      worldPoints;

    this.updateVisibleGeometry();

    /*
     * The label belongs beyond the central cusp, not merely beyond the stems.
     */
    this.label.moveTo(
      midpoint[0] +
        ux *
          this.labelAlongOffset +
        outwardNormal[0] *
          (
            this.offset +
            cuspDepth +
            this.labelOffset
          ),

      midpoint[1] +
        uy *
          this.labelAlongOffset +
        outwardNormal[1] *
          (
            this.offset +
            cuspDepth +
            this.labelOffset
          ),
    );
  }
}

export function createDimensionBrace2D(
  options: DimensionBrace2DOptions,
): DimensionBrace2D {
  return new DimensionBrace2D(
    options,
  );
}
