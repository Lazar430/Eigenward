import type { Vec2Tuple } from "../core/types";
import {
  FOURIER_DRAWING_ASSET_VERSION_2D,
  applyPointNormalizationTransform2D,
  calculatePolylineLength2D,
  computeFourierCoefficients2D,
  createPeriodicFourierSamples2D,
  normalizePointSamples2D,
  orderFourierCoefficients2D,
  resamplePolylineByArcLength2D,
  sampleFourierReconstructionRange2D,
  type FourierCoefficientOrder2D,
  type FourierDrawing2DAsset,
  type FourierStroke2DAsset,
} from "../geometry/fourierSeries2D";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const GEOMETRY_SELECTOR = "path,circle,ellipse,rect,line,polyline,polygon";
const EPSILON = 1e-9;

export type FourierSvgGeometryTag2D =
  | "path"
  | "circle"
  | "ellipse"
  | "rect"
  | "line"
  | "polyline"
  | "polygon";

export type FourierOpenStrokeMode2D = "ping-pong" | "reject";

export type FourierSvgDiagnosticSeverity2D = "info" | "warning";

export interface FourierSvgDiagnostic2D {
  severity: FourierSvgDiagnosticSeverity2D;
  code: string;
  message: string;
  elementId?: string;
}

export interface CompileFourierSvg2DOptions {
  /** Equal-arc-length source samples retained per SVG stroke. */
  sourceSampleCount?: number;
  /** Extra local samples taken before transforms, then re-resampled globally. */
  oversampleFactor?: number;
  /** Fourier coefficient count per retained stroke. */
  termCount?: number;
  /** Dense reconstruction points stored for the final visible trace. */
  traceSampleCount?: number;
  /** Largest normalized drawing dimension. */
  targetSpan?: number;
  /** Destination center in mathematical coordinates. */
  center?: Vec2Tuple;
  /** SVG y points down; mathematical y usually points up. */
  flipY?: boolean;
  /** Visual order of vectors in the future epicycle chain. */
  coefficientOrder?: FourierCoefficientOrder2D;
  /** Open SVG strokes are periodicized by retracing them unless rejected. */
  openStrokeMode?: FourierOpenStrokeMode2D;
  /** Ignore normalized strokes shorter than this amount. Default 0 keeps all. */
  minimumStrokeLength?: number;
  /** Guardrail against feeding a huge auto-vectorized photograph straight in. */
  maximumStrokeCount?: number;
  /** Compile only these element ids when supplied. */
  includeElementIds?: readonly string[];
  /** Never compile these element ids. */
  excludeElementIds?: readonly string[];
  /**
   * A path element containing multiple M/m commands is ambiguous because one
   * SVG element may encode disconnected subpaths. Reject by default rather than
   * inventing connector segments.
   */
  allowMultipleSubpathsPerPath?: boolean;
  /** Discard coefficients smaller than this normalized amplitude. */
  minimumCoefficientAmplitude?: number;
}

export interface CompileFourierSvg2DResult {
  asset: FourierDrawing2DAsset;
  diagnostics: FourierSvgDiagnostic2D[];
  sourceGeometryCount: number;
  compiledStrokeCount: number;
}

export interface SerializeFourierDrawingAsset2DOptions {
  /** Decimal places retained in JSON. 6-8 is normally ample for screen art. */
  precision?: number;
  pretty?: boolean;
}

type Matrix2D = readonly [
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
];

interface SourceStroke2D {
  id: string;
  closed: boolean;
  points: Vec2Tuple[];
}

const IDENTITY_MATRIX: Matrix2D = [1, 0, 0, 1, 0, 0];

const GEOMETRY_ATTRIBUTES: Record<FourierSvgGeometryTag2D, readonly string[]> = {
  path: ["d"],
  circle: ["cx", "cy", "r"],
  ellipse: ["cx", "cy", "rx", "ry"],
  rect: ["x", "y", "width", "height", "rx", "ry"],
  line: ["x1", "y1", "x2", "y2"],
  polyline: ["points"],
  polygon: ["points"],
};

function assertPositiveInteger(value: number, label: string, minimum = 1): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${label} must be an integer of at least ${minimum}.`);
  }
}

function assertPositiveFinite(value: number, label: string): void {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new RangeError(`${label} must be positive and finite.`);
  }
}

function multiplyMatrix2D(left: Matrix2D, right: Matrix2D): Matrix2D {
  const [a1, b1, c1, d1, e1, f1] = left;
  const [a2, b2, c2, d2, e2, f2] = right;

  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

function transformPoint2D(point: Vec2Tuple, matrix: Matrix2D): Vec2Tuple {
  const [a, b, c, d, e, f] = matrix;
  return [
    a * point[0] + c * point[1] + e,
    b * point[0] + d * point[1] + f,
  ];
}

function parseNumbers(source: string): number[] {
  const matches = source.match(
    /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g,
  );

  return matches?.map(Number) ?? [];
}

/** Parse the ordinary SVG transform functions needed by web line art. */
export function parseSvgTransform2D(source: string | null | undefined): Matrix2D {
  if (!source?.trim()) return IDENTITY_MATRIX;

  let result: Matrix2D = IDENTITY_MATRIX;
  let matchedSource = "";
  const expression = /([A-Za-z]+)\s*\(([^)]*)\)/g;

  for (const match of source.matchAll(expression)) {
    const [whole, rawName, argumentsSource] = match;
    const name = rawName.toLowerCase();
    const values = parseNumbers(argumentsSource);
    let local: Matrix2D;

    switch (name) {
      case "matrix": {
        if (values.length !== 6) {
          throw new Error("SVG matrix() requires exactly six numbers.");
        }
        local = values as unknown as Matrix2D;
        break;
      }

      case "translate": {
        if (values.length < 1 || values.length > 2) {
          throw new Error("SVG translate() requires one or two numbers.");
        }
        local = [1, 0, 0, 1, values[0], values[1] ?? 0];
        break;
      }

      case "scale": {
        if (values.length < 1 || values.length > 2) {
          throw new Error("SVG scale() requires one or two numbers.");
        }
        const sx = values[0];
        const sy = values[1] ?? sx;
        local = [sx, 0, 0, sy, 0, 0];
        break;
      }

      case "rotate": {
        if (values.length !== 1 && values.length !== 3) {
          throw new Error("SVG rotate() requires one angle or angle,cx,cy.");
        }
        const angle = (values[0] * Math.PI) / 180;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const rotation: Matrix2D = [cosine, sine, -sine, cosine, 0, 0];

        if (values.length === 1) {
          local = rotation;
        } else {
          const cx = values[1];
          const cy = values[2];
          local = multiplyMatrix2D(
            multiplyMatrix2D([1, 0, 0, 1, cx, cy], rotation),
            [1, 0, 0, 1, -cx, -cy],
          );
        }
        break;
      }

      case "skewx": {
        if (values.length !== 1) {
          throw new Error("SVG skewX() requires exactly one angle.");
        }
        local = [1, 0, Math.tan((values[0] * Math.PI) / 180), 1, 0, 0];
        break;
      }

      case "skewy": {
        if (values.length !== 1) {
          throw new Error("SVG skewY() requires exactly one angle.");
        }
        local = [1, Math.tan((values[0] * Math.PI) / 180), 0, 1, 0, 0];
        break;
      }

      default:
        throw new Error(`Unsupported SVG transform function ${rawName}().`);
    }

    // SVG transform lists compose in textual order as matrix products.
    result = multiplyMatrix2D(result, local);
    matchedSource += whole;
  }

  const normalizedOriginal = source.replace(/[\s,]+/g, "");
  const normalizedMatched = matchedSource.replace(/[\s,]+/g, "");

  if (normalizedOriginal !== normalizedMatched) {
    throw new Error(`Could not completely parse SVG transform: ${source}`);
  }

  return result;
}

function cumulativeSvgTransform2D(element: Element, root: Element): Matrix2D {
  const chain: Element[] = [];
  let current: Element | null = element;

  while (current) {
    chain.push(current);
    if (current === root) break;
    current = current.parentElement;
  }

  let matrix: Matrix2D = IDENTITY_MATRIX;

  for (const node of chain.reverse()) {
    matrix = multiplyMatrix2D(
      matrix,
      parseSvgTransform2D(node.getAttribute("transform")),
    );
  }

  return matrix;
}

function hasIgnoredAncestor(element: Element, root: Element): boolean {
  const nonRenderedContainers = new Set([
    "defs",
    "clippath",
    "mask",
    "pattern",
    "symbol",
    "marker",
  ]);

  let current: Element | null = element;

  while (current) {
    if (current.getAttribute("data-fourier-ignore") === "true") return true;
    if (nonRenderedContainers.has(current.localName.toLowerCase())) return true;

    const display = current.getAttribute("display")?.trim().toLowerCase();
    const visibility = current.getAttribute("visibility")?.trim().toLowerCase();
    const opacityAttribute = current.getAttribute("opacity");
    const opacity = opacityAttribute === null ? null : Number(opacityAttribute);
    const style = current.getAttribute("style")?.toLowerCase() ?? "";

    if (
      display === "none" ||
	visibility === "hidden" ||
	(opacity !== null && Number.isFinite(opacity) && opacity <= 0) ||
	/(?:^|;)\s*display\s*:\s*none\s*(?:;|$)/.test(style) ||
	/(?:^|;)\s*visibility\s*:\s*hidden\s*(?:;|$)/.test(style) ||
	/(?:^|;)\s*opacity\s*:\s*0(?:\.0+)?\s*(?:;|$)/.test(style)
    ) {
      return true;
    }

    if (current === root) break;
    current = current.parentElement;
  }

  return false;
}

function countPathSubpaths(pathData: string): number {
  return pathData.match(/[Mm]/g)?.length ?? 0;
}

function inferGeometryClosed(
  element: Element,
  sampledLocalPoints: readonly Vec2Tuple[],
  localLength: number,
): boolean {
  const tag = element.localName.toLowerCase();

  if (["circle", "ellipse", "rect", "polygon"].includes(tag)) return true;
  if (["line", "polyline"].includes(tag)) return false;

  const pathData = element.getAttribute("d") ?? "";
  if (/[Zz]/.test(pathData)) return true;

  const first = sampledLocalPoints[0];
  const last = sampledLocalPoints[sampledLocalPoints.length - 1];
  const distance = Math.hypot(last[0] - first[0], last[1] - first[1]);
  return distance <= Math.max(EPSILON, localLength * 1e-7);
}

function createSafeScratchGeometry(
  scratchSvg: SVGSVGElement,
  source: Element,
): SVGGeometryElement {
  const tag = source.localName.toLowerCase() as FourierSvgGeometryTag2D;
  const geometry = document.createElementNS(
    SVG_NAMESPACE,
    tag,
  ) as SVGGeometryElement;

  for (const attribute of GEOMETRY_ATTRIBUTES[tag]) {
    const value = source.getAttribute(attribute);
    if (value !== null) geometry.setAttribute(attribute, value);
  }

  scratchSvg.appendChild(geometry);
  return geometry;
}

function createScratchSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("width", "1");
  svg.setAttribute("height", "1");
  svg.setAttribute("aria-hidden", "true");
  Object.assign(svg.style, {
    position: "fixed",
    width: "1px",
    height: "1px",
    left: "-10000px",
    top: "-10000px",
    overflow: "hidden",
    pointerEvents: "none",
    opacity: "0",
  });
  document.body.appendChild(svg);
  return svg;
}

function sampleSvgGeometry2D(
  source: Element,
  root: Element,
  scratchSvg: SVGSVGElement,
  sourceSampleCount: number,
  oversampleFactor: number,
): SourceStroke2D {
  const liveGeometry = createSafeScratchGeometry(scratchSvg, source);

  try {
    const localLength = liveGeometry.getTotalLength();
    if (!(localLength > EPSILON) || !Number.isFinite(localLength)) {
      throw new Error("geometry has zero or non-finite length");
    }

    const oversampleCount = Math.max(
      64,
      Math.ceil(sourceSampleCount * oversampleFactor),
    );
    const localPoints: Vec2Tuple[] = Array.from(
      { length: oversampleCount + 1 },
      (_, index) => {
        const point = liveGeometry.getPointAtLength(
          (localLength * index) / oversampleCount,
        );
        return [point.x, point.y];
      },
    );

    const closed = inferGeometryClosed(source, localPoints, localLength);
    const transform = cumulativeSvgTransform2D(source, root);
    const transformed = localPoints.map((point) =>
      transformPoint2D(point, transform),
    );

    const points = resamplePolylineByArcLength2D(
      transformed,
      sourceSampleCount,
      closed,
    );

    return {
      id: source.id || `${source.localName}-stroke`,
      closed,
      points,
    };
  } finally {
    liveGeometry.remove();
  }
}

function makeUniqueStrokeId(baseId: string, usedIds: Set<string>): string {
  const cleaned = baseId.trim() || "stroke";
  if (!usedIds.has(cleaned)) {
    usedIds.add(cleaned);
    return cleaned;
  }

  let suffix = 2;
  while (usedIds.has(`${cleaned}-${suffix}`)) suffix += 1;
  const result = `${cleaned}-${suffix}`;
  usedIds.add(result);
  return result;
}

function validateCompilerOptions(options: Required<CompileFourierSvg2DOptions>): void {
  assertPositiveInteger(options.sourceSampleCount, "sourceSampleCount", 2);
  assertPositiveFinite(options.oversampleFactor, "oversampleFactor");
  assertPositiveInteger(options.termCount, "termCount");
  assertPositiveInteger(options.traceSampleCount, "traceSampleCount", 2);
  assertPositiveFinite(options.targetSpan, "targetSpan");
  assertPositiveInteger(options.maximumStrokeCount, "maximumStrokeCount");

  if (!(options.minimumStrokeLength >= 0) || !Number.isFinite(options.minimumStrokeLength)) {
    throw new RangeError("minimumStrokeLength must be nonnegative and finite.");
  }
  if (
    !(options.minimumCoefficientAmplitude >= 0) ||
      !Number.isFinite(options.minimumCoefficientAmplitude)
  ) {
    throw new RangeError(
      "minimumCoefficientAmplitude must be nonnegative and finite.",
    );
  }
}

function resolveCompilerOptions(
  options: CompileFourierSvg2DOptions,
): Required<CompileFourierSvg2DOptions> {
  return {
    sourceSampleCount: options.sourceSampleCount ?? 2048,
    oversampleFactor: options.oversampleFactor ?? 3,
    termCount: options.termCount ?? 101,
    traceSampleCount: options.traceSampleCount ?? 900,
    targetSpan: options.targetSpan ?? 4.6,
    center: options.center ?? [0, 0],
    flipY: options.flipY ?? true,
    coefficientOrder: options.coefficientOrder ?? "frequency",
    openStrokeMode: options.openStrokeMode ?? "ping-pong",
    minimumStrokeLength: options.minimumStrokeLength ?? 0,
    maximumStrokeCount: options.maximumStrokeCount ?? 128,
    includeElementIds: options.includeElementIds ?? [],
    excludeElementIds: options.excludeElementIds ?? [],
    allowMultipleSubpathsPerPath:
      options.allowMultipleSubpathsPerPath ?? false,
    minimumCoefficientAmplitude: options.minimumCoefficientAmplitude ?? 0,
  };
}

function parseSvgDocument(svgText: string): XMLDocument {
  if (typeof DOMParser === "undefined") {
    throw new Error(
      "The SVG authoring compiler requires browser DOM APIs. Run it in an " +
        "Eigenward development/authoring page, not in the published article runtime.",
    );
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(svgText, "image/svg+xml");
  const parserError = document.querySelector("parsererror");

  if (parserError) {
    throw new Error(`Invalid SVG: ${parserError.textContent?.trim() ?? "parse error"}`);
  }

  if (document.documentElement.localName.toLowerCase() !== "svg") {
    throw new Error("The supplied document is not an SVG root element.");
  }

  return document;
}

/**
 * Compile an SVG string into the runtime-only Fourier drawing format.
 *
 * The original SVG is never inserted into the live document. Only whitelisted
 * geometry attributes are copied into a hidden scratch SVG, which lets browser
 * SVGGeometryElement APIs measure paths without executing scripts, images, or
 * other active content from a web-downloaded SVG.
 */
export function compileSvgTextToFourierDrawing2D(
  svgText: string,
  options: CompileFourierSvg2DOptions = {},
): CompileFourierSvg2DResult {
  if (typeof document === "undefined") {
    throw new Error(
      "compileSvgTextToFourierDrawing2D() requires a browser authoring context.",
    );
  }

  const resolved = resolveCompilerOptions(options);
  validateCompilerOptions(resolved);

  const parsed = parseSvgDocument(svgText);
  const root = parsed.documentElement;
  const diagnostics: FourierSvgDiagnostic2D[] = [];
  const includeIds = new Set(resolved.includeElementIds);
  const excludeIds = new Set(resolved.excludeElementIds);

  if (root.querySelector("image")) {
    diagnostics.push({
      severity: "warning",
      code: "raster-image-ignored",
      message:
        "The SVG contains <image> elements. Raster pixels are intentionally " +
          "ignored; only genuine SVG geometry can become Fourier strokes.",
    });
  }

  if (root.querySelector("use")) {
    diagnostics.push({
      severity: "warning",
      code: "use-element-ignored",
      message:
        "The SVG contains <use> elements. Expand/flatten them to ordinary paths " +
          "or shapes before compiling.",
    });
  }

  if (root.querySelector("svg svg")) {
    diagnostics.push({
      severity: "warning",
      code: "nested-svg",
      message:
        "Nested <svg> viewports are not interpreted in Batch 2. Flatten the SVG " +
          "if their viewport transforms are visually significant.",
    });
  }

  const candidates = Array.from(root.querySelectorAll(GEOMETRY_SELECTOR));
  const sourceGeometryCount = candidates.length;
  const scratchSvg = createScratchSvg();
  const sourceStrokes: SourceStroke2D[] = [];
  const usedIds = new Set<string>();

  try {
    for (let index = 0; index < candidates.length; index += 1) {
      const element = candidates[index];
      const elementId = element.id || undefined;

      if (hasIgnoredAncestor(element, root)) continue;
      if (includeIds.size > 0 && (!elementId || !includeIds.has(elementId))) {
        continue;
      }
      if (elementId && excludeIds.has(elementId)) continue;

      if (
        element.localName.toLowerCase() === "path" &&
          !resolved.allowMultipleSubpathsPerPath
      ) {
        const subpathCount = countPathSubpaths(element.getAttribute("d") ?? "");
        if (subpathCount > 1) {
          diagnostics.push({
            severity: "warning",
            code: "multiple-subpaths-rejected",
            elementId,
            message:
              `Skipped ${elementId ?? "a path"} because one <path> contains ` +
		`${subpathCount} move-to subpaths. Split it into separate path ` +
		"elements, or explicitly opt into allowMultipleSubpathsPerPath.",
          });
          continue;
        }
      }

      try {
        const stroke = sampleSvgGeometry2D(
          element,
          root,
          scratchSvg,
          resolved.sourceSampleCount,
          resolved.oversampleFactor,
        );
        stroke.id = makeUniqueStrokeId(
          elementId || `${element.localName}-${index + 1}`,
          usedIds,
        );
        sourceStrokes.push(stroke);
      } catch (error) {
        diagnostics.push({
          severity: "warning",
          code: "geometry-skipped",
          elementId,
          message:
            `Skipped ${elementId ?? `<${element.localName}>`}: ` +
              (error instanceof Error ? error.message : String(error)),
        });
      }
    }
  } finally {
    scratchSvg.remove();
  }

  if (sourceStrokes.length === 0) {
    throw new Error(
      "No usable SVG geometry remained after filtering. Supply actual vector " +
        "paths/shapes rather than a raster image wrapped in SVG.",
    );
  }

  if (sourceStrokes.length > resolved.maximumStrokeCount) {
    throw new Error(
      `The SVG produced ${sourceStrokes.length} strokes, exceeding the configured ` +
        `maximum of ${resolved.maximumStrokeCount}. This usually means an ` +
        "auto-vectorized photograph needs simplification or explicit path selection.",
    );
  }

  const allSourcePoints = sourceStrokes.flatMap((stroke) => stroke.points);
  const normalization = normalizePointSamples2D(allSourcePoints, {
    targetSpan: resolved.targetSpan,
    center: resolved.center,
    flipY: resolved.flipY,
  });

  const normalizedStrokes = sourceStrokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((point) =>
      applyPointNormalizationTransform2D(point, normalization.transform),
    ),
  }));

  const compiledStrokes: FourierStroke2DAsset[] = [];

  for (const stroke of normalizedStrokes) {
    const length = calculatePolylineLength2D(stroke.points, stroke.closed);

    if (length < resolved.minimumStrokeLength) {
      diagnostics.push({
        severity: "info",
        code: "short-stroke-discarded",
        elementId: stroke.id,
        message:
          `Discarded ${stroke.id} because its normalized length ${length.toFixed(4)} ` +
            `is below ${resolved.minimumStrokeLength}.`,
      });
      continue;
    }

    if (!stroke.closed && resolved.openStrokeMode === "reject") {
      diagnostics.push({
        severity: "warning",
        code: "open-stroke-rejected",
        elementId: stroke.id,
        message:
          `Skipped open stroke ${stroke.id}. Set openStrokeMode to \"ping-pong\" ` +
            "to periodicize it by retracing the path mathematically.",
      });
      continue;
    }

    const periodicSamples = createPeriodicFourierSamples2D(
      stroke.points,
      stroke.closed,
    );

    let coefficients = orderFourierCoefficients2D(
      computeFourierCoefficients2D(periodicSamples, {
        termCount: resolved.termCount,
      }),
      resolved.coefficientOrder,
    );

    if (resolved.minimumCoefficientAmplitude > 0) {
      coefficients = coefficients.filter((coefficient) =>
        coefficient.frequency === 0 ||
          Math.hypot(coefficient.real, coefficient.imaginary) >=
            resolved.minimumCoefficientAmplitude,
      );
    }

    const parameterRange: readonly [number, number] = stroke.closed
      ? [0, 1]
      : [0, 0.5];

    const trace = sampleFourierReconstructionRange2D(
      coefficients,
      resolved.traceSampleCount,
      parameterRange,
      !stroke.closed,
    );

    compiledStrokes.push({
      id: stroke.id,
      closed: stroke.closed,
      coefficients,
      trace,
      parameterRange,
      durationWeight: length,
    });
  }

  if (compiledStrokes.length === 0) {
    throw new Error("No SVG strokes satisfied the compiler options.");
  }

  return {
    asset: {
      version: FOURIER_DRAWING_ASSET_VERSION_2D,
      strokes: compiledStrokes,
    },
    diagnostics,
    sourceGeometryCount,
    compiledStrokeCount: compiledStrokes.length,
  };
}

export async function compileSvgFileToFourierDrawing2D(
  file: File,
  options: CompileFourierSvg2DOptions = {},
): Promise<CompileFourierSvg2DResult> {
  return compileSvgTextToFourierDrawing2D(await file.text(), options);
}

function roundFiniteNumber(value: number, precision: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError("Fourier assets may contain only finite numbers.");
  }
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

/** Compact, deterministic JSON suitable for committing under src/assets. */
export function serializeFourierDrawingAsset2D(
  asset: FourierDrawing2DAsset,
  options: SerializeFourierDrawingAsset2DOptions = {},
): string {
  const precision = options.precision ?? 7;
  const pretty = options.pretty ?? true;

  if (!Number.isInteger(precision) || precision < 0 || precision > 15) {
    throw new RangeError("precision must be an integer between 0 and 15.");
  }

  const rounded: FourierDrawing2DAsset = {
    version: asset.version,
    strokes: asset.strokes.map((stroke) => ({
      id: stroke.id,
      closed: stroke.closed,
      coefficients: stroke.coefficients.map((coefficient) => ({
        frequency: coefficient.frequency,
        real: roundFiniteNumber(coefficient.real, precision),
        imaginary: roundFiniteNumber(coefficient.imaginary, precision),
      })),
      trace: stroke.trace.map(([x, y]) => [
        roundFiniteNumber(x, precision),
        roundFiniteNumber(y, precision),
      ]),
      parameterRange: stroke.parameterRange
        ? [
          roundFiniteNumber(stroke.parameterRange[0], precision),
          roundFiniteNumber(stroke.parameterRange[1], precision),
        ]
        : undefined,
      durationWeight:
        stroke.durationWeight === undefined
          ? undefined
          : roundFiniteNumber(stroke.durationWeight, precision),
    })),
  };

  return JSON.stringify(rounded, null, pretty ? 2 : undefined);
}

/** Convenience for a local authoring page; never needed by published articles. */
export function downloadFourierDrawingAsset2D(
  asset: FourierDrawing2DAsset,
  fileName = "drawing.fourier.json",
  options: SerializeFourierDrawingAsset2DOptions = {},
): void {
  const json = serializeFourierDrawingAsset2D(asset, options);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
