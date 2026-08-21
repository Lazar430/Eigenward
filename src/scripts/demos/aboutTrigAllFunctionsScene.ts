import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  type Material,
  type Object3D,
} from "three";

import {
  HUES,
  PointDragController2D,
  createAngleSector2D,
  createCoordinatePlane2D,
  createMathScene2D,
  createParametricShape2D,
  createTextLabel2D,
  createVector2D,
  type Vec2Tuple,
} from "../math-graphics";

const TAU = Math.PI * 2;
const UNIT_RADIUS = 1;
const UNIT_SIZE_PIXELS = 120;
const ORIGIN: Vec2Tuple = [0, 0];

const EPSILON = 1e-9;
const ASYMPTOTE_SURROGATE = 1e6;

/*
 * Keep the six functions visually distinct. The two geometric copies of
 * sine share one color, and the two copies of cosine share another.
 */
const FUNCTION_COLORS = {
  sin: "#ff4f9a",
  cos: "#29c7f6",
  tan: "#ffb000",
  cot: "#8b5cf6",
  sec: "#20d89b",
  csc: "#ff633e",
} as const;

const FUNCTION_HOVER_RADIUS_PIXELS = 10;
const FUNCTION_LABEL_OPACITY = 1;

const TRIANGLE_HOVER_OPACITY = 0.22;
const TRIANGLE_FOCUS_OPACITY = 0.14;
const TRIANGLE_FOCUS_HOVER_OPACITY = 0.22;
const TRIANGLE_FOCUS_ANIMATION_SECONDS = 0.86;
const TRIANGLE_FOCUS_EDGE_WIDTH = 0.052;
const TRIANGLE_SIDE_LABEL_OFFSET = 0.18;
const TRIANGLE_CLICK_MOVE_TOLERANCE_PIXELS = 6;

const TRIANGLE_COLORS = {
  lower: "#ffb000",
  upper: "#8b5cf6",
  radius: "#dff8ff",
} as const;

/* -------------------------------------------------------------------------- */
/* Scene                                                                      */
/* -------------------------------------------------------------------------- */

const canvas = document.querySelector<HTMLCanvasElement>(
  "#about-trig-all-functions-scene",
);

if (!canvas) {
  throw new Error(
    "The all-functions trigonometric demonstration canvas could not be found.",
  );
}

/*
 * Match the normal trigonometric scene: the circle remains mathematically
 * radius 1 while one unit occupies a fixed number of CSS pixels.
 */
const scene = createMathScene2D(canvas, {
  unitSizePixels: UNIT_SIZE_PIXELS,
  center: ORIGIN,
  background: null,
});

const coordinatePlane = createCoordinatePlane2D({
  name: "all-trigonometric-functions-coordinate-plane",
  scene,
  edgePaddingPixels: 20,
  gridStep: 1,
  integerStep: 1,
  gridColor: 0x777087,
  gridOpacity: 0.2,
  axisColor: 0xeee9ff,
  axisOpacity: 0.9,
  axisWidth: 2.1,
  tickColor: 0xded7f2,
  tickOpacity: 0.8,
  tickLength: 0.12,
  labelColor: "rgba(239, 234, 255, 0.78)",
  labelFontSizePx: 12,
});

coordinatePlane.setAxisReveal(0);
coordinatePlane.setIntegerReveal(0);

const unitCircle = createParametricShape2D({
  name: "all-trigonometric-functions-unit-circle",
  curve: (parameter) => [
    UNIT_RADIUS * Math.cos(parameter),
    UNIT_RADIUS * Math.sin(parameter),
  ],
  domain: [0, TAU],
  segments: 192,
  style: {
    outline: HUES.gold.light,
    outlineWidth: 2.6,
    outlineOpacity: 0.94,
    fill: HUES.gold.base,
    fillOpacity: 0.045,
  },
});

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

type SegmentPair = readonly [Vec2Tuple, Vec2Tuple];
type TriangleVertices = readonly [Vec2Tuple, Vec2Tuple, Vec2Tuple];

type DynamicTriangleFill = {
  mesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  geometry: BufferGeometry;
  positionAttribute: Float32BufferAttribute;
  material: MeshBasicMaterial;
};

type FocusTriangleSideSpec = {
  text: string;
  color: string;
};

type FocusTriangleVisual = {
  firstEdge: ReturnType<typeof createVector2D>;
  secondEdge: ReturnType<typeof createVector2D>;
  thirdEdge: ReturnType<typeof createVector2D>;
  firstLabel: ReturnType<typeof createTextLabel2D>;
  secondLabel: ReturnType<typeof createTextLabel2D>;
  thirdLabel: ReturnType<typeof createTextLabel2D>;
};

interface ViewBounds2D {
  left: number;
  right: number;
  bottom: number;
  top: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeAngle(angle: number): number {
  const normalized = ((angle % TAU) + TAU) % TAU;
  return Math.abs(normalized - TAU) < 1e-10 ? 0 : normalized;
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function midpoint(a: Vec2Tuple, b: Vec2Tuple): Vec2Tuple {
  return [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];
}

function lerp(a: number, b: number, progress: number): number {
  return a + (b - a) * progress;
}

function triangleCentroid(vertices: TriangleVertices): Vec2Tuple {
  return [
    (vertices[0][0] + vertices[1][0] + vertices[2][0]) / 3,
    (vertices[0][1] + vertices[1][1] + vertices[2][1]) / 3,
  ];
}

function triangleSignedAreaTwice(vertices: TriangleVertices): number {
  const [a, b, c] = vertices;
  return (
    (b[0] - a[0]) * (c[1] - a[1]) -
    (b[1] - a[1]) * (c[0] - a[0])
  );
}

function pointInTriangle(
  point: Vec2Tuple,
  vertices: TriangleVertices,
): boolean {
  if (Math.abs(triangleSignedAreaTwice(vertices)) <= 1e-7) {
    return false;
  }

  const [a, b, c] = vertices;
  const cross = (p: Vec2Tuple, q: Vec2Tuple, r: Vec2Tuple) =>
    (q[0] - p[0]) * (r[1] - p[1]) -
    (q[1] - p[1]) * (r[0] - p[0]);

  const c1 = cross(a, b, point);
  const c2 = cross(b, c, point);
  const c3 = cross(c, a, point);

  /*
   * Treat the boundary itself as non-interior. This keeps clicks on the
   * draggable unit-vector endpoint or on a triangle side from accidentally
   * triggering the area interaction.
   */
  if (
    Math.abs(c1) <= 1e-8 ||
    Math.abs(c2) <= 1e-8 ||
    Math.abs(c3) <= 1e-8
  ) {
    return false;
  }

  const hasNegative = c1 < 0 || c2 < 0 || c3 < 0;
  const hasPositive = c1 > 0 || c2 > 0 || c3 > 0;

  return !(hasNegative && hasPositive);
}

function normalizeSignedAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function rotateAroundOrigin(point: Vec2Tuple, angle: number): Vec2Tuple {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return [
    point[0] * cosine - point[1] * sine,
    point[0] * sine + point[1] * cosine,
  ];
}

function normalizedPerpendicular(
  start: Vec2Tuple,
  end: Vec2Tuple,
): Vec2Tuple {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);

  if (length <= EPSILON) {
    return [0, 0];
  }

  return [-dy / length, dx / length];
}

function viewportBounds(marginPixels = 0): ViewBounds2D {
  const bounds = scene.getViewBounds(marginPixels);

  return {
    left: bounds.left,
    right: bounds.right,
    bottom: bounds.bottom,
    top: bounds.top,
  };
}

/*
 * Infinite-function geometry is deliberately clipped to a rectangle slightly
 * LARGER than the camera. The renderer then clips it at the canvas boundary,
 * which makes the line visibly continue through the edge instead of appearing
 * to terminate in mid-air.
 */
function overscanViewportBounds(): ViewBounds2D {
  return viewportBounds(-36);
}

/*
 * Labels should remain comfortably inside the visible canvas even though the
 * associated geometry itself overscans it.
 */
function labelViewportBounds(): ViewBounds2D {
  return viewportBounds(18);
}

/**
 * Clip a finite line segment to the current visible world rectangle.
 * Liang-Barsky is convenient here because sec/csc/tan/cot can become enormous
 * close to their asymptotes, while the actual scene should stay readable.
 */
function clipSegmentToBounds(
  start: Vec2Tuple,
  end: Vec2Tuple,
  bounds: ViewBounds2D,
): SegmentPair {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];

  let t0 = 0;
  let t1 = 1;

  const p = [-dx, dx, -dy, dy];
  const q = [
    start[0] - bounds.left,
    bounds.right - start[0],
    start[1] - bounds.bottom,
    bounds.top - start[1],
  ];

  for (let index = 0; index < 4; index += 1) {
    if (Math.abs(p[index]) <= EPSILON) {
      if (q[index] < 0) {
        return [start, start];
      }
      continue;
    }

    const ratio = q[index] / p[index];

    if (p[index] < 0) {
      if (ratio > t1) return [start, start];
      t0 = Math.max(t0, ratio);
    } else {
      if (ratio < t0) return [start, start];
      t1 = Math.min(t1, ratio);
    }
  }

  return [
    [
      start[0] + dx * t0,
      start[1] + dy * t0,
    ],
    [
      start[0] + dx * t1,
      start[1] + dy * t1,
    ],
  ];
}

function reciprocalWithAsymptote(value: number): number {
  if (Math.abs(value) > EPSILON) {
    return 1 / value;
  }

  /*
   * The true point is at infinity.  A very distant surrogate lets the clipping
   * routine draw the correct limiting direction without putting Infinity into
   * the geometry buffers.
   */
  return (value < 0 ? -1 : 1) * ASYMPTOTE_SURROGATE;
}

function createSegment(
  name: string,
  color: string,
  opacity = 1,
  width = 0.046,
) {
  return createVector2D({
    name,
    start: ORIGIN,
    end: ORIGIN,
    style: {
      color,
      opacity,
      shaftWidth: width,
      headLength: 0,
      headWidth: 0,
    },
  });
}

function createFunctionLabel(
  name: string,
  text: string,
  color: string,
) {
  return createTextLabel2D({
    name,
    text,
    position: ORIGIN,
    anchor: [0.5, 0.5],
    color,
    fontSizePx: 14,
    fontWeight: 760,
    background: "rgba(16, 14, 28, 0.72)",
    border: "1px solid rgba(220, 212, 255, 0.12)",
    borderRadiusPx: 7,
    padding: "0.08rem 0.28rem",
  });
}

function createDynamicTriangleFill(
  name: string,
  color: string,
): DynamicTriangleFill {
  const geometry = new BufferGeometry();
  const positionAttribute = new Float32BufferAttribute(
    new Float32Array(9),
    3,
  );

  geometry.setAttribute("position", positionAttribute);
  geometry.setIndex([0, 1, 2]);

  const material = new MeshBasicMaterial({
    color,
    opacity: 0,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
  });

  const mesh = new Mesh(geometry, material);
  mesh.name = name;
  mesh.renderOrder = 1;
  mesh.visible = false;

  return {
    mesh,
    geometry,
    positionAttribute,
    material,
  };
}

function setTriangleFillVertices(
  triangle: DynamicTriangleFill,
  vertices: TriangleVertices,
): void {
  for (let index = 0; index < 3; index += 1) {
    const [x, y] = vertices[index];
    triangle.positionAttribute.setXYZ(index, x, y, 0.014);
  }

  triangle.positionAttribute.needsUpdate = true;
  triangle.geometry.computeBoundingSphere();
}

function setTriangleFillOpacity(
  triangle: DynamicTriangleFill,
  opacity: number,
): void {
  triangle.material.opacity = clamp(opacity, 0, 1);
  triangle.mesh.visible = triangle.material.opacity > 0;
}

function createFocusSideLabel(
  name: string,
  text: string,
  color: string,
) {
  return createTextLabel2D({
    name,
    text,
    position: ORIGIN,
    anchor: [0.5, 0.5],
    color,
    fontSizePx: 15,
    fontWeight: 780,
    background: "rgba(16, 14, 28, 0.82)",
    border: "1px solid rgba(235, 231, 255, 0.16)",
    borderRadiusPx: 7,
    padding: "0.1rem 0.3rem",
    opacity: 0,
  });
}

function createFocusTriangleVisual(
  prefix: string,
  sides: readonly [
    FocusTriangleSideSpec,
    FocusTriangleSideSpec,
    FocusTriangleSideSpec,
  ],
): FocusTriangleVisual {
  const [first, second, third] = sides;

  return {
    firstEdge: createSegment(
      `${prefix}:side-1`,
      first.color,
      0,
      TRIANGLE_FOCUS_EDGE_WIDTH,
    ),
    secondEdge: createSegment(
      `${prefix}:side-2`,
      second.color,
      0,
      TRIANGLE_FOCUS_EDGE_WIDTH,
    ),
    thirdEdge: createSegment(
      `${prefix}:side-3`,
      third.color,
      0,
      TRIANGLE_FOCUS_EDGE_WIDTH,
    ),
    firstLabel: createFocusSideLabel(
      `${prefix}:side-1-label`,
      first.text,
      first.color,
    ),
    secondLabel: createFocusSideLabel(
      `${prefix}:side-2-label`,
      second.text,
      second.color,
    ),
    thirdLabel: createFocusSideLabel(
      `${prefix}:side-3-label`,
      third.text,
      third.color,
    ),
  };
}

function positionLabelOutsideTriangle(
  label: ReturnType<typeof createTextLabel2D>,
  start: Vec2Tuple,
  end: Vec2Tuple,
  opposite: Vec2Tuple,
  distance = TRIANGLE_SIDE_LABEL_OFFSET,
): void {
  const middle = midpoint(start, end);
  let normal = normalizedPerpendicular(start, end);

  const towardOpposite =
    normal[0] * (opposite[0] - middle[0]) +
    normal[1] * (opposite[1] - middle[1]);

  if (towardOpposite > 0) {
    normal = [-normal[0], -normal[1]];
  }

  label.moveTo(
    middle[0] + normal[0] * distance,
    middle[1] + normal[1] * distance,
  );
}

function updateFocusTriangleVisual(
  visual: FocusTriangleVisual,
  vertices: TriangleVertices,
): void {
  const [a, b, c] = vertices;

  // Ordered side correspondence: AB, BC, CA.
  visual.firstEdge.setEndpoints(a, b);
  visual.secondEdge.setEndpoints(b, c);
  visual.thirdEdge.setEndpoints(c, a);

  positionLabelOutsideTriangle(
    visual.firstLabel,
    a,
    b,
    c,
  );
  positionLabelOutsideTriangle(
    visual.secondLabel,
    b,
    c,
    a,
  );
  positionLabelOutsideTriangle(
    visual.thirdLabel,
    c,
    a,
    b,
  );
}

function setFocusTriangleOpacity(
  visual: FocusTriangleVisual,
  edgeOpacity: number,
  labelOpacity: number,
): void {
  visual.firstEdge.setOpacity(edgeOpacity);
  visual.secondEdge.setOpacity(edgeOpacity);
  visual.thirdEdge.setOpacity(edgeOpacity);
  visual.firstLabel.setOpacity(labelOpacity);
  visual.secondLabel.setOpacity(labelOpacity);
  visual.thirdLabel.setOpacity(labelOpacity);
}

function positionLabelAlongSegment(
  label: ReturnType<typeof createTextLabel2D>,
  start: Vec2Tuple,
  end: Vec2Tuple,
  normalOffset = 0,
): void {
  const middle = midpoint(start, end);
  const normal = normalizedPerpendicular(start, end);

  label.moveTo(
    middle[0] + normal[0] * normalOffset,
    middle[1] + normal[1] * normalOffset,
  );
}

function setRightAngleMarker(
  marker: ReturnType<typeof createAngleSector2D>,
  center: Vec2Tuple,
  firstArmPoint: Vec2Tuple,
  secondArmPoint: Vec2Tuple,
  radius: number,
): void {
  const firstAngle = Math.atan2(
    firstArmPoint[1] - center[1],
    firstArmPoint[0] - center[0],
  );
  const secondAngle = Math.atan2(
    secondArmPoint[1] - center[1],
    secondArmPoint[0] - center[0],
  );

  const ccwSweep = positiveModulo(secondAngle - firstAngle, TAU);

  marker
    .setCenter(center)
    .setRadius(radius)
    .setAngles(firstAngle, secondAngle)
    .setDirection(
      ccwSweep <= Math.PI
        ? "counterclockwise"
        : "clockwise",
    )
    .setShape("right-angle");
}

/* -------------------------------------------------------------------------- */
/* Geometry and labels                                                        */
/* -------------------------------------------------------------------------- */

let currentAngle = Math.PI / 6;

const angleSector = createAngleSector2D({
  name: "all-trigonometric-functions-angle-sector",
  center: ORIGIN,
  startAngle: 0,
  endAngle: currentAngle,
  direction: "counterclockwise",
  radius: 0.62,
  segments: 144,
  fill: HUES.purple.base,
  fillOpacity: 0.3,
  outline: HUES.magenta.light,
  outlineOpacity: 0.78,
});

const unitVector = createVector2D({
  name: "all-trigonometric-functions-unit-vector",
  start: ORIGIN,
  end: [
    Math.cos(currentAngle),
    Math.sin(currentAngle),
  ],
  style: {
    color: HUES.cyan.light,
    opacity: 1,
    shaftWidth: 0.055,
    headLength: 0.2,
    headWidth: 0.17,
  },
});

/*
 * Two copies of sin and cos make the projection construction readable in the
 * same way as the reference diagram:
 *
 *   O -> (cos θ, 0)                         = cos
 *   (cos θ, 0) -> (cos θ, sin θ)            = sin
 *   O -> (0, sin θ)                         = sin
 *   (0, sin θ) -> (cos θ, sin θ)            = cos
 */
const cosineOnXAxis = createSegment(
  "all-trig-cos-x-axis",
  FUNCTION_COLORS.cos,
);
const sineAtPoint = createSegment(
  "all-trig-sin-at-point",
  FUNCTION_COLORS.sin,
);
const sineOnYAxis = createSegment(
  "all-trig-sin-y-axis",
  FUNCTION_COLORS.sin,
);
const cosineAtPoint = createSegment(
  "all-trig-cos-at-point",
  FUNCTION_COLORS.cos,
);

/*
 * The tangent at P = (cos θ, sin θ) meets:
 *
 *   the x-axis at (sec θ, 0),
 *   the y-axis at (0, csc θ).
 *
 * Thus:
 *   OP_x-intercept   visualizes sec,
 *   OP_y-intercept   visualizes csc,
 *   P -> x-intercept visualizes tan,
 *   y-intercept -> P visualizes cot.
 */
const secantSegment = createSegment(
  "all-trig-sec",
  FUNCTION_COLORS.sec,
  0.96,
  0.05,
);
const cosecantSegment = createSegment(
  "all-trig-csc",
  FUNCTION_COLORS.csc,
  0.96,
  0.05,
);
const tangentSegment = createSegment(
  "all-trig-tan",
  FUNCTION_COLORS.tan,
  0.98,
  0.052,
);
const cotangentSegment = createSegment(
  "all-trig-cot",
  FUNCTION_COLORS.cot,
  0.98,
  0.052,
);

const projectionRightAngle = createAngleSector2D({
  name: "all-trig-projection-right-angle-x",
  center: ORIGIN,
  startAngle: 0,
  endAngle: Math.PI / 2,
  direction: "counterclockwise",
  radius: 0.13,
  shape: "right-angle",
  fill: HUES.cyan.base,
  fillOpacity: 0.08,
  outline: HUES.cyan.light,
  outlineOpacity: 0.82,
});

const projectionLeftAngle = createAngleSector2D({
  name: "all-trig-projection-right-angle-y",
  center: ORIGIN,
  startAngle: 0,
  endAngle: Math.PI / 2,
  direction: "counterclockwise",
  radius: 0.13,
  shape: "right-angle",
  fill: HUES.cyan.base,
  fillOpacity: 0.08,
  outline: HUES.cyan.light,
  outlineOpacity: 0.82,
});

const tangentRightAngle = createAngleSector2D({
  name: "all-trig-tangent-right-angle",
  center: ORIGIN,
  startAngle: 0,
  endAngle: Math.PI / 2,
  direction: "counterclockwise",
  radius: 0.15,
  shape: "right-angle",
  fill: HUES.gold.base,
  fillOpacity: 0.08,
  outline: HUES.gold.light,
  outlineOpacity: 0.9,
});

const sinePointLabel = createFunctionLabel(
  "all-trig-sin-point-label",
  "sin",
  FUNCTION_COLORS.sin,
);
const cosinePointLabel = createFunctionLabel(
  "all-trig-cos-point-label",
  "cos",
  FUNCTION_COLORS.cos,
);
const secantLabel = createFunctionLabel(
  "all-trig-sec-label",
  "sec",
  FUNCTION_COLORS.sec,
);
const cosecantLabel = createFunctionLabel(
  "all-trig-csc-label",
  "csc",
  FUNCTION_COLORS.csc,
);
const tangentLabel = createFunctionLabel(
  "all-trig-tan-label",
  "tan",
  FUNCTION_COLORS.tan,
);
const cotangentLabel = createFunctionLabel(
  "all-trig-cot-label",
  "cot",
  FUNCTION_COLORS.cot,
);

const functionLabels = [
  sinePointLabel,
  cosinePointLabel,
  secantLabel,
  cosecantLabel,
  tangentLabel,
  cotangentLabel,
] as const;

for (const label of functionLabels) {
  label.setOpacity(0);
}

const lowerTriangleFill = createDynamicTriangleFill(
  "all-trig-lower-right-triangle-fill",
  TRIANGLE_COLORS.lower,
);
const upperTriangleFill = createDynamicTriangleFill(
  "all-trig-upper-right-triangle-fill",
  TRIANGLE_COLORS.upper,
);

const similarityLargeTriangleFill = createDynamicTriangleFill(
  "all-trig-sec-tan-radius-triangle-fill",
  FUNCTION_COLORS.sec,
);

const smallSecTanFocusTriangle = createFocusTriangleVisual(
  "all-trig-small-sec-tan-similarity-triangle",
  [
    { text: "cos", color: FUNCTION_COLORS.cos },
    { text: "sin", color: FUNCTION_COLORS.sin },
    { text: "1", color: TRIANGLE_COLORS.radius },
  ],
);

const largeSecTanFocusTriangle = createFocusTriangleVisual(
  "all-trig-large-sec-tan-similarity-triangle",
  [
    /*
     * Large ordered vertices are P -> O -> S_sec:
     * AB = radius = 1
     * BC = sec
     * CA = tan
     */
    { text: "1", color: TRIANGLE_COLORS.radius },
    { text: "sec", color: FUNCTION_COLORS.sec },
    { text: "tan", color: FUNCTION_COLORS.tan },
  ],
);

const smallCscCotFocusTriangle = createFocusTriangleVisual(
  "all-trig-small-csc-cot-similarity-triangle",
  [
    /*
     * Ordered vertices will be Y -> O -> P:
     * AB = sin, BC = radius, CA = cos.
     */
    { text: "sin", color: FUNCTION_COLORS.sin },
    { text: "1", color: TRIANGLE_COLORS.radius },
    { text: "cos", color: FUNCTION_COLORS.cos },
  ],
);

const largeCscCotFocusTriangle = createFocusTriangleVisual(
  "all-trig-large-csc-cot-similarity-triangle",
  [
    /*
     * Ordered vertices are P -> O -> S_csc:
     * AB = radius = 1
     * BC = csc
     * CA = cot
     */
    { text: "1", color: TRIANGLE_COLORS.radius },
    { text: "csc", color: FUNCTION_COLORS.csc },
    { text: "cot", color: FUNCTION_COLORS.cot },
  ],
);

scene.add(
  coordinatePlane,
  unitCircle,

  secantSegment,
  cosecantSegment,
  tangentSegment,
  cotangentSegment,

  cosineOnXAxis,
  sineAtPoint,
  sineOnYAxis,
  cosineAtPoint,

  angleSector,
  unitVector,

  projectionRightAngle,
  projectionLeftAngle,
  tangentRightAngle,

  sinePointLabel,
  cosinePointLabel,
  secantLabel,
  cosecantLabel,
  tangentLabel,
  cotangentLabel,

  lowerTriangleFill.mesh,
  upperTriangleFill.mesh,
  similarityLargeTriangleFill.mesh,

  smallSecTanFocusTriangle.firstEdge,
  smallSecTanFocusTriangle.secondEdge,
  smallSecTanFocusTriangle.thirdEdge,
  smallSecTanFocusTriangle.firstLabel,
  smallSecTanFocusTriangle.secondLabel,
  smallSecTanFocusTriangle.thirdLabel,

  largeSecTanFocusTriangle.firstEdge,
  largeSecTanFocusTriangle.secondEdge,
  largeSecTanFocusTriangle.thirdEdge,
  largeSecTanFocusTriangle.firstLabel,
  largeSecTanFocusTriangle.secondLabel,
  largeSecTanFocusTriangle.thirdLabel,

  smallCscCotFocusTriangle.firstEdge,
  smallCscCotFocusTriangle.secondEdge,
  smallCscCotFocusTriangle.thirdEdge,
  smallCscCotFocusTriangle.firstLabel,
  smallCscCotFocusTriangle.secondLabel,
  smallCscCotFocusTriangle.thirdLabel,

  largeCscCotFocusTriangle.firstEdge,
  largeCscCotFocusTriangle.secondEdge,
  largeCscCotFocusTriangle.thirdEdge,
  largeCscCotFocusTriangle.firstLabel,
  largeCscCotFocusTriangle.secondLabel,
  largeCscCotFocusTriangle.thirdLabel,
);

/* -------------------------------------------------------------------------- */
/* Dynamic placement                                                          */
/* -------------------------------------------------------------------------- */

type TriangleFocusState =
  | "normal"
  | "entering"
  | "focused"
  | "leaving";

type TriangleFocusKind =
  | "sec-tan"
  | "csc-cot";

type TriangleFocusSnapshot = {
  kind: TriangleFocusKind;
  smallSource: TriangleVertices;
  largeSource: TriangleVertices;
  smallSourceCentroid: Vec2Tuple;
  largeSourceCentroid: Vec2Tuple;
  smallRotationDelta: number;
  largeRotationDelta: number;
};

let focusState: TriangleFocusState = "normal";
let focusProgress = 0;
let focusSnapshot: TriangleFocusSnapshot | null = null;
let stopFocusAnimation = (): void => {};

let lowerTriangleVertices: TriangleVertices = [ORIGIN, ORIGIN, ORIGIN];
let upperTriangleVertices: TriangleVertices = [ORIGIN, ORIGIN, ORIGIN];

/*
 * The large triangle used in the similarity comparison is the actual
 * radius–sec–tan triangle O-P-S_sec, not a transformed copy of either
 * sin/cos triangle.
 *
 * We order it as P -> O -> S_sec so its first side is the radius. That first
 * side corresponds to the small triangle's cosine side under similarity.
 */
let secTanLargeTriangleVertices: TriangleVertices = [
  ORIGIN,
  ORIGIN,
  ORIGIN,
];

let cscCotLargeTriangleVertices: TriangleVertices = [
  ORIGIN,
  ORIGIN,
  ORIGIN,
];

let displayedSmallTriangleVertices: TriangleVertices = [
  ORIGIN,
  ORIGIN,
  ORIGIN,
];
let displayedLargeTriangleVertices: TriangleVertices = [
  ORIGIN,
  ORIGIN,
  ORIGIN,
];

let lowerTriangleHovered = false;
let upperTriangleHovered = false;
let similarityLargeTriangleHovered = false;
let lastPointerClient: Vec2Tuple | null = null;

let sinePointHoverSegment: SegmentPair = [ORIGIN, ORIGIN];
let cosinePointHoverSegment: SegmentPair = [ORIGIN, ORIGIN];
let secantHoverSegment: SegmentPair = [ORIGIN, ORIGIN];
let cosecantHoverSegment: SegmentPair = [ORIGIN, ORIGIN];
let tangentHoverSegment: SegmentPair = [ORIGIN, ORIGIN];
let cotangentHoverSegment: SegmentPair = [ORIGIN, ORIGIN];

function updateFunctionGeometry(): void {
  const cosine = Math.cos(currentAngle);
  const sine = Math.sin(currentAngle);

  const point: Vec2Tuple = [cosine, sine];
  const xProjection: Vec2Tuple = [cosine, 0];
  const yProjection: Vec2Tuple = [0, sine];

  cosineOnXAxis.setEndpoints(ORIGIN, xProjection);
  sineAtPoint.setEndpoints(xProjection, point);
  sineOnYAxis.setEndpoints(ORIGIN, yProjection);
  cosineAtPoint.setEndpoints(yProjection, point);

  /*
   * The two ordinary hoverable sin/cos/radius triangles remain exactly where
   * they are in the full unit-circle construction.
   */
  lowerTriangleVertices = [ORIGIN, xProjection, point];
  upperTriangleVertices = [point, yProjection, ORIGIN];

  if (focusState === "normal") {
    displayedSmallTriangleVertices = lowerTriangleVertices;

    setTriangleFillVertices(
      lowerTriangleFill,
      lowerTriangleVertices,
    );
    setTriangleFillVertices(
      upperTriangleFill,
      upperTriangleVertices,
    );
    setTriangleFillOpacity(similarityLargeTriangleFill, 0);
  }

  const secantIntercept: Vec2Tuple = [
    reciprocalWithAsymptote(cosine),
    0,
  ];

  /*
   * Actual surrounding similarity triangle:
   *
   * P -> O       = radius = 1
   * O -> S_sec   = sec
   * S_sec -> P   = tan
   *
   * It is generally larger than the small cos/sin/radius triangle. We preserve
   * that size throughout the comparison animation.
   */
  secTanLargeTriangleVertices = [
    point,
    ORIGIN,
    secantIntercept,
  ];

  const cosecantIntercept: Vec2Tuple = [
    0,
    reciprocalWithAsymptote(sine),
  ];

  /*
   * The second actual large similarity triangle:
   *
   * P -> O       = radius = 1
   * O -> S_csc   = csc
   * S_csc -> P   = cot
   *
   * It is similar to the upper sin/cos/radius triangle with scale factor
   * 1 / |sin(theta)|.
   */
  cscCotLargeTriangleVertices = [
    point,
    ORIGIN,
    cosecantIntercept,
  ];

  const renderBounds = overscanViewportBounds();
  const labelBounds = labelViewportBounds();

  const visibleSecant = clipSegmentToBounds(
    ORIGIN,
    secantIntercept,
    renderBounds,
  );

  const visibleCosecant = clipSegmentToBounds(
    ORIGIN,
    cosecantIntercept,
    renderBounds,
  );

  const visibleTangent = clipSegmentToBounds(
    point,
    secantIntercept,
    renderBounds,
  );

  const visibleCotangent = clipSegmentToBounds(
    cosecantIntercept,
    point,
    renderBounds,
  );

  const labelSecant = clipSegmentToBounds(
    ORIGIN,
    secantIntercept,
    labelBounds,
  );

  const labelCosecant = clipSegmentToBounds(
    ORIGIN,
    cosecantIntercept,
    labelBounds,
  );

  const labelTangent = clipSegmentToBounds(
    point,
    secantIntercept,
    labelBounds,
  );

  const labelCotangent = clipSegmentToBounds(
    cosecantIntercept,
    point,
    labelBounds,
  );

  secantSegment.setEndpoints(
    visibleSecant[0],
    visibleSecant[1],
  );
  cosecantSegment.setEndpoints(
    visibleCosecant[0],
    visibleCosecant[1],
  );
  tangentSegment.setEndpoints(
    visibleTangent[0],
    visibleTangent[1],
  );
  cotangentSegment.setEndpoints(
    visibleCotangent[0],
    visibleCotangent[1],
  );

  sinePointHoverSegment = [xProjection, point];
  cosinePointHoverSegment = [yProjection, point];
  secantHoverSegment = visibleSecant;
  cosecantHoverSegment = visibleCosecant;
  tangentHoverSegment = visibleTangent;
  cotangentHoverSegment = visibleCotangent;

  /*
   * Right-angle marks:
   *
   * - the two Cartesian projection feet;
   * - OP perpendicular to the tangent at P.
   */
  setRightAngleMarker(
    projectionRightAngle,
    xProjection,
    ORIGIN,
    point,
    0.12,
  );

  setRightAngleMarker(
    projectionLeftAngle,
    yProjection,
    ORIGIN,
    point,
    0.12,
  );

  /*
   * Either tangent direction works.  The x-intercept supplies one naturally;
   * near cos θ = 0 the distant surrogate still gives the correct limiting
   * tangent direction after normalization inside AngleSector2D.
   */
  setRightAngleMarker(
    tangentRightAngle,
    point,
    ORIGIN,
    secantIntercept,
    0.14,
  );

  /*
   * Function labels are positioned continuously but remain invisible until
   * their corresponding segment is hovered.
   */
  positionLabelAlongSegment(
    sinePointLabel,
    xProjection,
    point,
    cosine >= 0 ? -0.20 : 0.20,
  );

  positionLabelAlongSegment(
    cosinePointLabel,
    yProjection,
    point,
    sine >= 0 ? 0.20 : -0.20,
  );

  positionLabelAlongSegment(
    secantLabel,
    labelSecant[0],
    labelSecant[1],
    secantIntercept[0] >= 0 ? -0.34 : 0.34,
  );

  positionLabelAlongSegment(
    cosecantLabel,
    labelCosecant[0],
    labelCosecant[1],
    cosecantIntercept[1] >= 0 ? 0.34 : -0.34,
  );

  positionLabelAlongSegment(
    tangentLabel,
    labelTangent[0],
    labelTangent[1],
    0.34,
  );

  /*
   * Keep cot on the opposite side of its line from the original scene.
   */
  positionLabelAlongSegment(
    cotangentLabel,
    labelCotangent[0],
    labelCotangent[1],
    0.34,
  );

}

/* -------------------------------------------------------------------------- */
/* Scene update                                                               */
/* -------------------------------------------------------------------------- */

function displayAngle(angleRadians: number): void {
  currentAngle = normalizeAngle(angleRadians);

  const tip: Vec2Tuple = [
    Math.cos(currentAngle),
    Math.sin(currentAngle),
  ];

  unitVector.setEnd(tip);
  angleSector.setAngles(0, currentAngle);
  updateFunctionGeometry();
}

displayAngle(currentAngle);

/* -------------------------------------------------------------------------- */
/* Triangle-area comparison focus                                             */
/* -------------------------------------------------------------------------- */

type MaterialCarrier = Object3D & {
  material?: Material | Material[];
};

const backgroundObjects: Object3D[] = [
  coordinatePlane,
  unitCircle,
  secantSegment,
  cosecantSegment,
  tangentSegment,
  cotangentSegment,
  cosineOnXAxis,
  sineAtPoint,
  sineOnYAxis,
  cosineAtPoint,
  angleSector,
  unitVector,
  projectionRightAngle,
  projectionLeftAngle,
  tangentRightAngle,
];

const backgroundMaterialBaseOpacity = new WeakMap<Material, number>();
let backgroundMaterialOpacityCaptured = false;

function eachObjectMaterial(
  root: Object3D,
  callback: (material: Material) => void,
): void {
  root.traverse((child) => {
    const carrier = child as MaterialCarrier;
    const material = carrier.material;

    if (!material) return;

    if (Array.isArray(material)) {
      for (const item of material) callback(item);
    } else {
      callback(material);
    }
  });
}

function captureBackgroundMaterialOpacity(): void {
  if (backgroundMaterialOpacityCaptured) return;

  for (const root of backgroundObjects) {
    eachObjectMaterial(root, (material) => {
      backgroundMaterialBaseOpacity.set(
        material,
        material.opacity,
      );
    });
  }

  backgroundMaterialOpacityCaptured = true;
}

function setCoordinatePlaneTextOpacity(opacity: number): void {
  coordinatePlane.traverse((child) => {
    if (child === coordinatePlane) return;

    const maybeLabel = child as Object3D & {
      setOpacity?: (value: number) => unknown;
    };

    if (typeof maybeLabel.setOpacity === "function") {
      maybeLabel.setOpacity(opacity);
    }
  });
}

function setBackgroundOpacity(opacity: number): void {
  const scale = clamp(opacity, 0, 1);
  captureBackgroundMaterialOpacity();

  for (const root of backgroundObjects) {
    eachObjectMaterial(root, (material) => {
      const baseOpacity =
        backgroundMaterialBaseOpacity.get(material) ?? material.opacity;

      material.opacity = baseOpacity * scale;
      material.visible = scale > 0.001;
    });
  }

  setCoordinatePlaneTextOpacity(scale);
  scene.invalidate();
}

function rotationDeltaToHorizontal(
  vertices: TriangleVertices,
): number {
  const [a, b] = vertices;
  const angle = Math.atan2(
    b[1] - a[1],
    b[0] - a[0],
  );

  return normalizeSignedAngle(-angle);
}

function rotatedLocalTriangle(
  source: TriangleVertices,
  sourceCentroid: Vec2Tuple,
  rotationDelta: number,
): TriangleVertices {
  return source.map((vertex) => {
    const local: Vec2Tuple = [
      vertex[0] - sourceCentroid[0],
      vertex[1] - sourceCentroid[1],
    ];

    return rotateAroundOrigin(local, rotationDelta);
  }) as unknown as TriangleVertices;
}

function triangleHorizontalBounds(
  vertices: TriangleVertices,
): readonly [number, number] {
  const xs = vertices.map((vertex) => vertex[0]);
  return [Math.min(...xs), Math.max(...xs)];
}

function focusTargetCentroids(
  snapshot: TriangleFocusSnapshot,
): readonly [Vec2Tuple, Vec2Tuple] {
  const smallLocal = rotatedLocalTriangle(
    snapshot.smallSource,
    snapshot.smallSourceCentroid,
    snapshot.smallRotationDelta,
  );

  const largeLocal = rotatedLocalTriangle(
    snapshot.largeSource,
    snapshot.largeSourceCentroid,
    snapshot.largeRotationDelta,
  );

  const [smallMinX, smallMaxX] =
    triangleHorizontalBounds(smallLocal);
  const [largeMinX, largeMaxX] =
    triangleHorizontalBounds(largeLocal);

  /*
   * The first side of each ordered triangle is a corresponding pair:
   *
   * The ordered first side of the small triangle corresponds to the ordered
   * first side of the large triangle:
   *
   * sec/tan focus: cos <-> radius
   * csc/cot focus: sin <-> radius
   *
   * Both are rotated to point horizontally to the right. Put those two sides
   * on the same y-level, then separate the triangles by a fixed visual gap.
   * Their original sizes are never changed.
   */
  const smallFirstSideY =
    (smallLocal[0][1] + smallLocal[1][1]) / 2;
  const largeFirstSideY =
    (largeLocal[0][1] + largeLocal[1][1]) / 2;

  const gap = 0.58;
  const centroidSeparation =
    smallMaxX - largeMinX + gap;

  /*
   * Center the combined pair as a whole rather than centering each triangle
   * independently. This matters because the sec/tan/radius triangle is larger.
   */
  const smallTargetX =
    -(
      smallMinX +
      centroidSeparation +
      largeMaxX
    ) / 2;

  const largeTargetX =
    smallTargetX + centroidSeparation;

  return [
    [smallTargetX, -smallFirstSideY],
    [largeTargetX, -largeFirstSideY],
  ];
}

function transformTriangleRigidly(
  source: TriangleVertices,
  sourceCentroid: Vec2Tuple,
  targetCentroid: Vec2Tuple,
  rotationDelta: number,
  progress: number,
): TriangleVertices {
  const rotation = rotationDelta * progress;
  const center: Vec2Tuple = [
    lerp(sourceCentroid[0], targetCentroid[0], progress),
    lerp(sourceCentroid[1], targetCentroid[1], progress),
  ];

  return source.map((vertex) => {
    const local: Vec2Tuple = [
      vertex[0] - sourceCentroid[0],
      vertex[1] - sourceCentroid[1],
    ];
    const rotated = rotateAroundOrigin(local, rotation);

    return [
      center[0] + rotated[0],
      center[1] + rotated[1],
    ] as Vec2Tuple;
  }) as unknown as TriangleVertices;
}

function triangleFocusEdgeOpacity(progress: number): number {
  return clamp(progress / 0.26, 0, 1);
}

function triangleFocusLabelOpacity(progress: number): number {
  return clamp((progress - 0.38) / 0.42, 0, 1);
}

function focusSmallFill(
  kind: TriangleFocusKind,
): DynamicTriangleFill {
  return kind === "sec-tan"
    ? lowerTriangleFill
    : upperTriangleFill;
}

function focusInactiveSmallFill(
  kind: TriangleFocusKind,
): DynamicTriangleFill {
  return kind === "sec-tan"
    ? upperTriangleFill
    : lowerTriangleFill;
}

function focusSmallVisual(
  kind: TriangleFocusKind,
): FocusTriangleVisual {
  return kind === "sec-tan"
    ? smallSecTanFocusTriangle
    : smallCscCotFocusTriangle;
}

function focusLargeVisual(
  kind: TriangleFocusKind,
): FocusTriangleVisual {
  return kind === "sec-tan"
    ? largeSecTanFocusTriangle
    : largeCscCotFocusTriangle;
}

function setAllFocusVisualOpacity(
  edgeOpacity: number,
  labelOpacity: number,
): void {
  setFocusTriangleOpacity(
    smallSecTanFocusTriangle,
    edgeOpacity,
    labelOpacity,
  );
  setFocusTriangleOpacity(
    largeSecTanFocusTriangle,
    edgeOpacity,
    labelOpacity,
  );
  setFocusTriangleOpacity(
    smallCscCotFocusTriangle,
    edgeOpacity,
    labelOpacity,
  );
  setFocusTriangleOpacity(
    largeCscCotFocusTriangle,
    edgeOpacity,
    labelOpacity,
  );
}

function renderFocusTriangles(progress: number): void {
  if (!focusSnapshot) return;

  const [smallTarget, largeTarget] =
    focusTargetCentroids(focusSnapshot);

  displayedSmallTriangleVertices = transformTriangleRigidly(
    focusSnapshot.smallSource,
    focusSnapshot.smallSourceCentroid,
    smallTarget,
    focusSnapshot.smallRotationDelta,
    progress,
  );

  displayedLargeTriangleVertices = transformTriangleRigidly(
    focusSnapshot.largeSource,
    focusSnapshot.largeSourceCentroid,
    largeTarget,
    focusSnapshot.largeRotationDelta,
    progress,
  );

  const smallFill = focusSmallFill(focusSnapshot.kind);
  const inactiveSmallFill =
    focusInactiveSmallFill(focusSnapshot.kind);

  setTriangleFillVertices(
    smallFill,
    displayedSmallTriangleVertices,
  );
  setTriangleFillVertices(
    similarityLargeTriangleFill,
    displayedLargeTriangleVertices,
  );

  setTriangleFillOpacity(inactiveSmallFill, 0);

  similarityLargeTriangleFill.material.color.set(
    focusSnapshot.kind === "sec-tan"
      ? FUNCTION_COLORS.sec
      : FUNCTION_COLORS.csc,
  );

  const smallVisual =
    focusSmallVisual(focusSnapshot.kind);
  const largeVisual =
    focusLargeVisual(focusSnapshot.kind);

  /*
   * Only the currently selected similarity pair is visible.
   */
  setAllFocusVisualOpacity(0, 0);

  updateFocusTriangleVisual(
    smallVisual,
    displayedSmallTriangleVertices,
  );
  updateFocusTriangleVisual(
    largeVisual,
    displayedLargeTriangleVertices,
  );

  const edgeOpacity = triangleFocusEdgeOpacity(progress);
  const labelOpacity = triangleFocusLabelOpacity(progress);

  setFocusTriangleOpacity(
    smallVisual,
    edgeOpacity,
    labelOpacity,
  );
  setFocusTriangleOpacity(
    largeVisual,
    edgeOpacity,
    labelOpacity,
  );

  const activeSmallHovered =
    focusSnapshot.kind === "sec-tan"
      ? lowerTriangleHovered
      : upperTriangleHovered;

  const smallFillOpacity = progress > 0.001
    ? (activeSmallHovered
      ? TRIANGLE_FOCUS_HOVER_OPACITY
      : TRIANGLE_FOCUS_OPACITY)
    : (activeSmallHovered ? TRIANGLE_HOVER_OPACITY : 0);

  const largeFillOpacity = progress > 0.001
    ? (similarityLargeTriangleHovered
      ? TRIANGLE_FOCUS_HOVER_OPACITY
      : TRIANGLE_FOCUS_OPACITY)
    : 0;

  setTriangleFillOpacity(
    smallFill,
    smallFillOpacity,
  );
  setTriangleFillOpacity(
    similarityLargeTriangleFill,
    largeFillOpacity,
  );

  scene.invalidate();
}

function makeFocusSnapshot(
  kind: TriangleFocusKind,
): TriangleFocusSnapshot {
  let smallSource: TriangleVertices;
  let largeSource: TriangleVertices;

  if (kind === "sec-tan") {
    /*
     * O -> X -> P gives:
     * cos, sin, radius.
     */
    smallSource = lowerTriangleVertices;
    largeSource = secTanLargeTriangleVertices;
  } else {
    /*
     * Reorder the same upper geometric triangle as Y -> O -> P so the first
     * side is sin. It then corresponds directly to the large triangle's
     * radius side:
     *
     * small: sin, radius, cos
     * large: radius, csc, cot
     */
    smallSource = [
      upperTriangleVertices[1],
      upperTriangleVertices[2],
      upperTriangleVertices[0],
    ];
    largeSource = cscCotLargeTriangleVertices;
  }

  return {
    kind,
    smallSource,
    largeSource,
    smallSourceCentroid: triangleCentroid(smallSource),
    largeSourceCentroid: triangleCentroid(largeSource),
    smallRotationDelta: rotationDeltaToHorizontal(smallSource),
    largeRotationDelta: rotationDeltaToHorizontal(largeSource),
  };
}

function easeInOutCubic(value: number): number {
  const t = clamp01(value);
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function triangleAreaIsClickable(): boolean {
  if (focusState === "normal") {
    return lowerTriangleHovered || upperTriangleHovered;
  }

  if (focusState === "focused") {
    return (
      lowerTriangleHovered ||
      upperTriangleHovered ||
      similarityLargeTriangleHovered
    );
  }

  return false;
}

function updateTriangleCursor(): void {
  if (triangleAreaIsClickable()) {
    canvas.style.cursor = "pointer";
    return;
  }

  if (canvas.style.cursor === "pointer") {
    canvas.style.cursor = "";
  }
}

function updateTriangleHoverAtClientPoint(
  clientX: number,
  clientY: number,
): void {
  lastPointerClient = [clientX, clientY];

  if (focusState === "entering" || focusState === "leaving") {
    return;
  }

  const pointerWorld = scene.clientToWorld(clientX, clientY);

  if (focusState === "focused" && focusSnapshot) {
    const smallHovered = pointInTriangle(
      pointerWorld,
      displayedSmallTriangleVertices,
    );

    if (focusSnapshot.kind === "sec-tan") {
      lowerTriangleHovered = smallHovered;
      upperTriangleHovered = false;
    } else {
      lowerTriangleHovered = false;
      upperTriangleHovered = smallHovered;
    }

    similarityLargeTriangleHovered = pointInTriangle(
      pointerWorld,
      displayedLargeTriangleVertices,
    );

    renderFocusTriangles(1);
    updateTriangleCursor();
    return;
  }

  lowerTriangleHovered = pointInTriangle(
    pointerWorld,
    lowerTriangleVertices,
  );

  upperTriangleHovered = pointInTriangle(
    pointerWorld,
    upperTriangleVertices,
  );

  similarityLargeTriangleHovered = false;

  setTriangleFillOpacity(
    lowerTriangleFill,
    lowerTriangleHovered ? TRIANGLE_HOVER_OPACITY : 0,
  );

  setTriangleFillOpacity(
    upperTriangleFill,
    upperTriangleHovered ? TRIANGLE_HOVER_OPACITY : 0,
  );

  setTriangleFillOpacity(similarityLargeTriangleFill, 0);
  scene.invalidate();
  updateTriangleCursor();
}

function clearTriangleHover(): void {
  lowerTriangleHovered = false;
  upperTriangleHovered = false;
  similarityLargeTriangleHovered = false;

  if (focusState === "focused") {
    renderFocusTriangles(1);
  } else if (focusState === "normal") {
    setTriangleFillOpacity(lowerTriangleFill, 0);
    setTriangleFillOpacity(upperTriangleFill, 0);
    setTriangleFillOpacity(similarityLargeTriangleFill, 0);
    scene.invalidate();
  }

  updateTriangleCursor();
}

function completeFocusTransition(targetProgress: 0 | 1): void {
  stopFocusAnimation();
  stopFocusAnimation = (): void => {};
  focusProgress = targetProgress;

  if (targetProgress === 1) {
    focusState = "focused";
    setBackgroundOpacity(0);
    renderFocusTriangles(1);

    if (lastPointerClient) {
      updateTriangleHoverAtClientPoint(
        lastPointerClient[0],
        lastPointerClient[1],
      );
    } else {
      updateTriangleCursor();
    }
    return;
  }

  focusState = "normal";
  setBackgroundOpacity(1);
  setAllFocusVisualOpacity(0, 0);
  setTriangleFillOpacity(similarityLargeTriangleFill, 0);
  focusSnapshot = null;
  displayAngle(currentAngle);

  if (lastPointerClient) {
    updateTriangleHoverAtClientPoint(
      lastPointerClient[0],
      lastPointerClient[1],
    );
    updateFunctionLabelHover(
      lastPointerClient[0],
      lastPointerClient[1],
    );
  } else {
    clearTriangleHover();
  }
}

function animateFocusTo(targetProgress: 0 | 1): void {
  stopFocusAnimation();

  const startProgress = focusProgress;
  const distance = Math.abs(targetProgress - startProgress);

  if (distance <= 1e-8) {
    completeFocusTransition(targetProgress);
    return;
  }

  let elapsed = 0;
  const duration = TRIANGLE_FOCUS_ANIMATION_SECONDS * distance;

  stopFocusAnimation = scene.onFrame(({ deltaTime }) => {
    elapsed += deltaTime;

    const timeProgress = clamp01(elapsed / duration);
    const eased = easeInOutCubic(timeProgress);

    focusProgress = lerp(
      startProgress,
      targetProgress,
      eased,
    );

    setBackgroundOpacity(1 - focusProgress);
    renderFocusTriangles(focusProgress);

    if (timeProgress >= 1) {
      completeFocusTransition(targetProgress);
    }
  });
}

function enterTriangleFocus(kind: TriangleFocusKind): void {
  if (focusState !== "normal") return;

  /*
   * If the introductory axis animation is still running, finish it before
   * capturing material opacities so restoration returns to the normal fully
   * drawn scene rather than to a partially revealed frame.
   */
  stopIntro();
  coordinatePlane.setAxisReveal(1);
  coordinatePlane.setIntegerReveal(1);
  coordinatePlane.setGridOpacity(0.2);

  hideFunctionLabels();
  lowerTriangleHovered = false;
  upperTriangleHovered = false;
  similarityLargeTriangleHovered = false;
  setTriangleFillOpacity(lowerTriangleFill, 0);
  setTriangleFillOpacity(upperTriangleFill, 0);
  setTriangleFillOpacity(similarityLargeTriangleFill, 0);
  focusSnapshot = makeFocusSnapshot(kind);
  focusState = "entering";
  focusProgress = 0;
  renderFocusTriangles(0);
  animateFocusTo(1);
}

function leaveTriangleFocus(): void {
  if (focusState !== "focused") return;

  hideFunctionLabels();
  focusState = "leaving";
  animateFocusTo(0);
}

/* -------------------------------------------------------------------------- */
/* Function-label hover                                                       */
/* -------------------------------------------------------------------------- */

function squaredDistancePointToSegmentPixels(
  pointerClient: Vec2Tuple,
  segment: SegmentPair,
): number {
  const start = scene.worldToClient(segment[0]);
  const end = scene.worldToClient(segment[1]);

  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= 1e-8) {
    const px = pointerClient[0] - start[0];
    const py = pointerClient[1] - start[1];
    return px * px + py * py;
  }

  const t = clamp(
    (
      (pointerClient[0] - start[0]) * dx +
      (pointerClient[1] - start[1]) * dy
    ) / lengthSquared,
    0,
    1,
  );

  const closestX = start[0] + t * dx;
  const closestY = start[1] + t * dy;
  const px = pointerClient[0] - closestX;
  const py = pointerClient[1] - closestY;

  return px * px + py * py;
}

const hoverTargets = [
  {
    label: sinePointLabel,
    segment: () => sinePointHoverSegment,
  },
  {
    label: cosinePointLabel,
    segment: () => cosinePointHoverSegment,
  },
  {
    label: secantLabel,
    segment: () => secantHoverSegment,
  },
  {
    label: cosecantLabel,
    segment: () => cosecantHoverSegment,
  },
  {
    label: tangentLabel,
    segment: () => tangentHoverSegment,
  },
  {
    label: cotangentLabel,
    segment: () => cotangentHoverSegment,
  },
] as const;

function hideFunctionLabels(): void {
  for (const target of hoverTargets) {
    target.label.setOpacity(0);
  }
}

function updateFunctionLabelHover(
  clientX: number,
  clientY: number,
): void {
  if (focusState !== "normal") {
    hideFunctionLabels();
    return;
  }

  const pointer: Vec2Tuple = [clientX, clientY];
  const radiusSquared =
    FUNCTION_HOVER_RADIUS_PIXELS * FUNCTION_HOVER_RADIUS_PIXELS;

  /* Function labels are ordinary hover annotations in the full scene. */
  for (const target of hoverTargets) {
    const distanceSquared =
      squaredDistancePointToSegmentPixels(
        pointer,
        target.segment(),
      );

    target.label.setOpacity(
      distanceSquared <= radiusSquared
        ? FUNCTION_LABEL_OPACITY
        : 0,
    );
  }
}

let pointerDownClient: Vec2Tuple | null = null;
let pointerMovedSinceDown = false;

const handleFunctionPointerMove = (
  event: PointerEvent,
): void => {
  if (pointerDownClient) {
    const movement = Math.hypot(
      event.clientX - pointerDownClient[0],
      event.clientY - pointerDownClient[1],
    );

    if (movement > TRIANGLE_CLICK_MOVE_TOLERANCE_PIXELS) {
      pointerMovedSinceDown = true;
    }
  }

  updateFunctionLabelHover(event.clientX, event.clientY);
  updateTriangleHoverAtClientPoint(event.clientX, event.clientY);
};

const handleFunctionPointerLeave = (): void => {
  hideFunctionLabels();
  clearTriangleHover();

  if (canvas.style.cursor === "pointer") {
    canvas.style.cursor = "";
  }
};

const handleTrianglePointerDown = (
  event: PointerEvent,
): void => {
  if (event.button !== 0) return;

  pointerDownClient = [event.clientX, event.clientY];
  pointerMovedSinceDown = false;
};

const handleTrianglePointerUp = (
  event: PointerEvent,
): void => {
  if (event.button !== 0 || !pointerDownClient) {
    pointerDownClient = null;
    return;
  }

  const wasClick = !pointerMovedSinceDown;
  pointerDownClient = null;
  pointerMovedSinceDown = false;

  if (!wasClick) return;

  const pointerWorld = scene.clientToWorld(
    event.clientX,
    event.clientY,
  );

  if (focusState === "normal") {
    if (
      pointInTriangle(
        pointerWorld,
        lowerTriangleVertices,
      )
    ) {
      enterTriangleFocus("sec-tan");
      return;
    }

    if (
      pointInTriangle(
        pointerWorld,
        upperTriangleVertices,
      )
    ) {
      enterTriangleFocus("csc-cot");
      return;
    }
  }

  if (
    focusState === "focused" &&
    (
      pointInTriangle(
        pointerWorld,
        displayedSmallTriangleVertices,
      ) ||
      pointInTriangle(
        pointerWorld,
        displayedLargeTriangleVertices,
      )
    )
  ) {
    leaveTriangleFocus();
  }
};

const handleTrianglePointerCancel = (): void => {
  pointerDownClient = null;
  pointerMovedSinceDown = false;
};

canvas.addEventListener(
  "pointermove",
  handleFunctionPointerMove,
);
canvas.addEventListener(
  "pointerleave",
  handleFunctionPointerLeave,
);
canvas.addEventListener(
  "pointerdown",
  handleTrianglePointerDown,
);
canvas.addEventListener(
  "pointerup",
  handleTrianglePointerUp,
);
canvas.addEventListener(
  "pointercancel",
  handleTrianglePointerCancel,
);

/* -------------------------------------------------------------------------- */
/* Dragging                                                                   */
/* -------------------------------------------------------------------------- */

const dragging = new PointDragController2D(scene);

dragging.registerPoint({
  getPosition: () => unitVector.getEnd(),

  onDrag: (pointerPosition) => {
    if (focusState !== "normal") return;

    const dx =
      pointerPosition[0] - ORIGIN[0];

    const dy =
      pointerPosition[1] - ORIGIN[1];

    if (Math.hypot(dx, dy) < 1e-8) {
      return;
    }

    /*
     * No quadrant restriction: exactly like the original trig scene, the
     * draggable endpoint is free to travel around the entire unit circle.
     */
    displayAngle(Math.atan2(dy, dx));
  },

  hitRadiusPixels: 26,
  hoverCursor: "grab",
});

/*
 * PointDragController2D also manages the canvas cursor. This listener is
 * intentionally registered after it, so clickable triangle interiors win over
 * the drag controller's ordinary cursor whenever the pointer is inside them.
 */
const handleTriangleCursorPointerMove = (): void => {
  updateTriangleCursor();
};

canvas.addEventListener(
  "pointermove",
  handleTriangleCursorPointerMove,
);


/*
 * The overscan-clipped sec/csc/tan/cot pieces depend on the live canvas
 * aspect ratio. Recompute them after resize so they continue cleanly through
 * the viewport boundary at every canvas size.
 */
const resizeObserver =
  typeof ResizeObserver === "undefined"
    ? null
    : new ResizeObserver(() => {
        updateFunctionGeometry();

        if (focusState !== "normal") {
          setBackgroundOpacity(1 - focusProgress);
          renderFocusTriangles(focusProgress);
        }
      });

resizeObserver?.observe(canvas);

/* -------------------------------------------------------------------------- */
/* Intro animation                                                            */
/* -------------------------------------------------------------------------- */

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(value: number): number {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

let introStartTime: number | null = null;
let stopIntro = (): void => {};

stopIntro = scene.onFrame(({ time }) => {
  introStartTime ??= time;

  const elapsed =
    (time - introStartTime) / 1000;

  const axisProgress =
    easeOutCubic(elapsed / 1.15);

  const integerProgress =
    easeOutCubic((elapsed - 0.95) / 0.9);

  coordinatePlane.setAxisReveal(axisProgress);
  coordinatePlane.setIntegerReveal(integerProgress);

  if (
    axisProgress >= 1 &&
    integerProgress >= 1
  ) {
    stopIntro();
  }
});

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

Object.assign(window, {
  mathTrigAllFunctionsDemo: {
    scene,
    coordinatePlane,
    unitCircle,
    unitVector,
    angleSector,

    functions: {
      cosineOnXAxis,
      sineAtPoint,
      sineOnYAxis,
      cosineAtPoint,
      secantSegment,
      cosecantSegment,
      tangentSegment,
      cotangentSegment,
    },

    triangles: {
      lowerFill: lowerTriangleFill.mesh,
      upperFill: upperTriangleFill.mesh,
      similarityLargeFill: similarityLargeTriangleFill.mesh,
      enterSecTanFocus: () => enterTriangleFocus("sec-tan"),
      enterCscCotFocus: () => enterTriangleFocus("csc-cot"),
      leaveFocus: leaveTriangleFocus,
      getFocusState: () => focusState,
      getFocusKind: () => focusSnapshot?.kind ?? null,
    },

    setAngleDegrees(degrees: number) {
      displayAngle(degrees * Math.PI / 180);
    },
  },
});

/* -------------------------------------------------------------------------- */
/* Cleanup                                                                    */
/* -------------------------------------------------------------------------- */

const destroy = (): void => {
  stopIntro();
  stopFocusAnimation();
  resizeObserver?.disconnect();

  canvas.removeEventListener(
    "pointermove",
    handleFunctionPointerMove,
  );
  canvas.removeEventListener(
    "pointerleave",
    handleFunctionPointerLeave,
  );
  canvas.removeEventListener(
    "pointerdown",
    handleTrianglePointerDown,
  );
  canvas.removeEventListener(
    "pointerup",
    handleTrianglePointerUp,
  );
  canvas.removeEventListener(
    "pointercancel",
    handleTrianglePointerCancel,
  );

  canvas.removeEventListener(
    "pointermove",
    handleTriangleCursorPointerMove,
  );

  dragging.destroy();
  scene.destroy();
};

window.addEventListener(
  "pagehide",
  destroy,
  { once: true },
);

document.addEventListener(
  "astro:before-swap",
  destroy,
  { once: true },
);
