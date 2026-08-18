import {
  BufferGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  Vector3,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  type ColorRepresentation,
} from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { HUES } from "../core/colors";
import { MathObject2D } from "../core/MathObject2D";
import type { Vec2Tuple } from "../core/types";
import {
  calculatePolylineLength2D,
  type FourierCoefficient2D,
  type FourierStroke2DAsset,
} from "../geometry/fourierSeries2D";
import { OutlineTraceLineMaterial } from "../materials/OutlineTraceLineMaterial";

const TAU = Math.PI * 2;
const EPSILON = 1e-9;
const CIRCLE_QUAD_OVERSCAN = 1.5;
const CIRCLE_SHADER_RADIUS = 1 / CIRCLE_QUAD_OVERSCAN;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be finite.`);
  }
}

function assertNonnegativeFinite(value: number, label: string): void {
  if (!(value >= 0) || !Number.isFinite(value)) {
    throw new RangeError(`${label} must be nonnegative and finite.`);
  }
}

function assertFinitePoint(point: Vec2Tuple, label: string): void {
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    throw new RangeError(`${label} must contain two finite numbers.`);
  }
}

function assertCoefficient(
  coefficient: FourierCoefficient2D,
  index: number,
): void {
  if (!Number.isInteger(coefficient.frequency)) {
    throw new RangeError(`stroke.coefficients[${index}].frequency must be an integer.`);
  }
  assertFinite(coefficient.real, `stroke.coefficients[${index}].real`);
  assertFinite(coefficient.imaginary, `stroke.coefficients[${index}].imaginary`);
}

function assertStroke(stroke: FourierStroke2DAsset): void {
  if (stroke.coefficients.length === 0) {
    throw new RangeError("A Fourier stroke requires at least one coefficient.");
  }

  stroke.coefficients.forEach(assertCoefficient);

  if (stroke.trace.length < 2) {
    throw new RangeError("A Fourier stroke trace requires at least two points.");
  }
  stroke.trace.forEach((point, index) =>
    assertFinitePoint(point, `stroke.trace[${index}]`),
  );

  const range = stroke.parameterRange ?? [0, 1];
  assertFinite(range[0], "stroke.parameterRange[0]");
  assertFinite(range[1], "stroke.parameterRange[1]");
  if (Math.abs(range[1] - range[0]) <= EPSILON) {
    throw new RangeError("stroke.parameterRange must span a nonzero interval.");
  }
}

/** Visual controls for one prepared Fourier stroke. */
export interface FourierEpicycles2DStyle {
  circleColor?: ColorRepresentation;
  /** Circle outline width in CSS-like screen pixels. */
  circleWidth?: number;
  circleOpacity?: number;

  vectorColor?: ColorRepresentation;
  vectorOpacity?: number;
  /** Shaft width in mathematical world units, matching Vector2D. */
  vectorShaftWidth?: number;
  vectorHeadLength?: number;
  vectorHeadWidth?: number;

  traceColor?: ColorRepresentation;
  /** Trace width in screen pixels, matching the engine's Line2 primitives. */
  traceWidth?: number;
  traceOpacity?: number;

  tipColor?: ColorRepresentation;
  tipOpacity?: number;
  tipRadius?: number;
  tipSegments?: number;

  /** Components below this radius still affect the sum but are not drawn. */
  minimumVisibleRadius?: number;
}

export interface FourierEpicycles2DOptions {
  stroke: FourierStroke2DAsset;
  style?: FourierEpicycles2DStyle;
  progress?: number;
  name?: string;
}

interface ResolvedFourierEpicycles2DStyle {
  circleColor: ColorRepresentation;
  circleWidth: number;
  circleOpacity: number;
  vectorColor: ColorRepresentation;
  vectorOpacity: number;
  vectorShaftWidth: number;
  vectorHeadLength: number;
  vectorHeadWidth: number;
  traceColor: ColorRepresentation;
  traceWidth: number;
  traceOpacity: number;
  tipColor: ColorRepresentation;
  tipOpacity: number;
  tipRadius: number;
  tipSegments: number;
  minimumVisibleRadius: number;
}

interface PreparedCoefficient2D {
  frequency: number;
  real: number;
  imaginary: number;
  angularVelocity: number;
  radius: number;
}

const DEFAULT_STYLE: ResolvedFourierEpicycles2DStyle = {
  circleColor: HUES.purple.light,
  circleWidth: 1.25,
  circleOpacity: 0.34,
  vectorColor: HUES.gold.light,
  vectorOpacity: 0.84,
  vectorShaftWidth: 0.025,
  vectorHeadLength: 0.13,
  vectorHeadWidth: 0.095,
  traceColor: HUES.cyan.light,
  traceWidth: 3.2,
  traceOpacity: 0.98,
  tipColor: HUES.cyan.base,
  tipOpacity: 0.95,
  tipRadius: 0.055,
  tipSegments: 32,
  minimumVisibleRadius: 0.012,
};

function resolveStyle(
  style: FourierEpicycles2DStyle,
): ResolvedFourierEpicycles2DStyle {
  const resolved = {
    ...DEFAULT_STYLE,
    ...style,
  };

  assertNonnegativeFinite(resolved.circleWidth, "circleWidth");
  assertNonnegativeFinite(resolved.vectorShaftWidth, "vectorShaftWidth");
  assertNonnegativeFinite(resolved.vectorHeadLength, "vectorHeadLength");
  assertNonnegativeFinite(resolved.vectorHeadWidth, "vectorHeadWidth");
  assertNonnegativeFinite(resolved.traceWidth, "traceWidth");
  assertNonnegativeFinite(resolved.tipRadius, "tipRadius");
  assertNonnegativeFinite(resolved.minimumVisibleRadius, "minimumVisibleRadius");

  if (!Number.isInteger(resolved.tipSegments) || resolved.tipSegments < 3) {
    throw new RangeError("tipSegments must be an integer of at least 3.");
  }

  resolved.circleOpacity = clamp01(resolved.circleOpacity);
  resolved.vectorOpacity = clamp01(resolved.vectorOpacity);
  resolved.traceOpacity = clamp01(resolved.traceOpacity);
  resolved.tipOpacity = clamp01(resolved.tipOpacity);

  return resolved;
}

function createUnitArrowheadGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      [
        0, -0.5, 0,
        1, 0, 0,
        0, 0.5, 0,
      ],
      3,
    ),
  );
  geometry.setIndex([0, 1, 2]);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * One instanced quad per epicycle. The fragment shader turns each quad into a
 * screen-space anti-aliased ring, so circle width does not grow with radius.
 */
function createCircleMaterial(
  color: ColorRepresentation,
  widthPixels: number,
  opacity: number,
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      circleColor: { value: new Color(color) },
      circleWidthPixels: { value: widthPixels },
      circleOpacity: { value: opacity },
      circleRadiusInQuad: { value: CIRCLE_SHADER_RADIUS },
    },
    vertexShader: /* glsl */ `
    varying vec2 vCircleUv;

    void main() {
    vCircleUv = uv * 2.0 - 1.0;
    vec4 instancePosition = instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * instancePosition;
    }
    `,
    fragmentShader: /* glsl */ `
    uniform vec3 circleColor;
    uniform float circleWidthPixels;
    uniform float circleOpacity;
    uniform float circleRadiusInQuad;
    varying vec2 vCircleUv;

    void main() {
    float radius = length(vCircleUv);
    float derivative = max(fwidth(radius), 1e-6);
    float halfWidth = 0.5 * circleWidthPixels * derivative;
    float feather = derivative;
    float distanceFromRing = abs(radius - circleRadiusInQuad);
    float coverage = 1.0 - smoothstep(
    halfWidth,
    halfWidth + feather,
    distanceFromRing
    );

    if (coverage <= 0.0) discard;
    gl_FragColor = vec4(circleColor, circleOpacity * coverage);
    }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
  });
}

function makeTracePositions(
  points: readonly Vec2Tuple[],
  closed: boolean,
): number[] {
  const positions: number[] = [];

  for (const point of points) {
    positions.push(point[0], point[1], 0.005);
  }

  if (closed) {
    const first = points[0];
    const last = points[points.length - 1];

    if (
      Math.abs(first[0] - last[0]) > EPSILON ||
	Math.abs(first[1] - last[1]) > EPSILON
    ) {
      positions.push(first[0], first[1], 0.005);
    }
  }

  return positions;
}

/**
 * High-performance renderer for one already-prepared Fourier stroke.
 *
 * The primitive owns a constant number of Three.js drawables regardless of the
 * number of Fourier terms:
 *   - one instanced circle mesh,
 *   - one instanced shaft mesh,
 *   - one instanced arrowhead mesh,
 *   - one immutable wide-line trace,
 *   - one tip marker.
 *
 * setProgress() mutates only instance transforms, shader uniforms, and the
 * trace reveal range. It never reconstructs per-term Three.js objects or trace
 * geometry during animation.
 */
export class FourierEpicycles2D extends MathObject2D {
  private readonly stroke: FourierStroke2DAsset;
  private readonly parameterRange: readonly [number, number];
  private readonly coefficients: PreparedCoefficient2D[];
  private readonly style: ResolvedFourierEpicycles2DStyle;

  private readonly circleGeometry = new PlaneGeometry(2, 2);
  private readonly circleMaterial: ShaderMaterial;
  private readonly circleInstances: InstancedMesh<PlaneGeometry, ShaderMaterial>;

  private readonly shaftGeometry = new PlaneGeometry(1, 1);
  private readonly arrowheadGeometry = createUnitArrowheadGeometry();
  private readonly vectorMaterial: MeshBasicMaterial;
  private readonly shaftInstances: InstancedMesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly arrowheadInstances: InstancedMesh<BufferGeometry, MeshBasicMaterial>;

  private readonly traceGeometry = new LineGeometry();
  private readonly traceMaterial: OutlineTraceLineMaterial;
  private readonly traceLine: Line2;

  private readonly tipGeometry: CircleGeometry;
  private readonly tipMaterial: MeshBasicMaterial;
  private readonly tipMesh: Mesh<CircleGeometry, MeshBasicMaterial>;

  private readonly matrix = new Matrix4();
  private readonly scaleVector = new Vector3();
  private progress = 0;
  private currentTipX = 0;
  private currentTipY = 0;
  private epicyclesEnabled = true;
  private traceEnabled = true;
  private tipEnabled = true;

  constructor({
    stroke,
    style = {},
    progress = 0,
    name = "fourier-epicycles-2d",
  }: FourierEpicycles2DOptions) {
    super();

    assertStroke(stroke);
    this.name = name;
    this.stroke = stroke;
    this.parameterRange = stroke.parameterRange ?? [0, 1];
    this.style = resolveStyle(style);
    this.coefficients = stroke.coefficients.map((coefficient) => ({
      frequency: coefficient.frequency,
      real: coefficient.real,
      imaginary: coefficient.imaginary,
      angularVelocity: TAU * coefficient.frequency,
      radius: Math.hypot(coefficient.real, coefficient.imaginary),
    }));

    const instanceCapacity = Math.max(1, this.coefficients.length);

    this.circleMaterial = createCircleMaterial(
      this.style.circleColor,
      this.style.circleWidth,
      this.style.circleOpacity,
    );
    this.circleInstances = new InstancedMesh(
      this.circleGeometry,
      this.circleMaterial,
      instanceCapacity,
    );
    this.circleInstances.name = `${name}:circles`;
    this.circleInstances.instanceMatrix.setUsage(DynamicDrawUsage);
    this.circleInstances.count = 0;
    this.circleInstances.frustumCulled = false;
    this.circleInstances.renderOrder = 1;

    this.vectorMaterial = new MeshBasicMaterial({
      color: this.style.vectorColor,
      opacity: this.style.vectorOpacity,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    });

    this.shaftInstances = new InstancedMesh(
      this.shaftGeometry,
      this.vectorMaterial,
      instanceCapacity,
    );
    this.shaftInstances.name = `${name}:vector-shafts`;
    this.shaftInstances.instanceMatrix.setUsage(DynamicDrawUsage);
    this.shaftInstances.count = 0;
    this.shaftInstances.frustumCulled = false;
    this.shaftInstances.renderOrder = 2;

    this.arrowheadInstances = new InstancedMesh(
      this.arrowheadGeometry,
      this.vectorMaterial,
      instanceCapacity,
    );
    this.arrowheadInstances.name = `${name}:vector-heads`;
    this.arrowheadInstances.instanceMatrix.setUsage(DynamicDrawUsage);
    this.arrowheadInstances.count = 0;
    this.arrowheadInstances.frustumCulled = false;
    this.arrowheadInstances.renderOrder = 2;

    this.traceGeometry.setPositions(makeTracePositions(stroke.trace, stroke.closed));
    this.traceMaterial = new OutlineTraceLineMaterial({
      color: this.style.traceColor,
      opacity: this.style.traceOpacity,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      alphaToCoverage: false,
    });
    this.traceMaterial.linewidth = this.style.traceWidth;
    this.traceMaterial.setTraceTotalLength(
      calculatePolylineLength2D(stroke.trace, stroke.closed),
    );
    this.traceLine = new Line2(this.traceGeometry, this.traceMaterial);
    this.traceLine.name = `${name}:trace`;
    this.traceLine.renderOrder = 0;
    this.traceLine.computeLineDistances();

    this.tipGeometry = new CircleGeometry(1, this.style.tipSegments);
    this.tipMaterial = new MeshBasicMaterial({
      color: this.style.tipColor,
      opacity: this.style.tipOpacity,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    });
    this.tipMesh = new Mesh(this.tipGeometry, this.tipMaterial);
    this.tipMesh.name = `${name}:tip`;
    this.tipMesh.scale.set(this.style.tipRadius, this.style.tipRadius, 1);
    this.tipMesh.position.z = 0.03;
    this.tipMesh.renderOrder = 3;

    this.add(
      this.traceLine,
      this.circleInstances,
      this.shaftInstances,
      this.arrowheadInstances,
      this.tipMesh,
    );

    this.setProgress(progress);
  }

  getProgress(): number {
    return this.progress;
  }

  getParameter(): number {
    const [start, end] = this.parameterRange;
    return start + (end - start) * this.progress;
  }

  getTip(): Vec2Tuple {
    return [this.currentTipX, this.currentTipY];
  }

  getStroke(): FourierStroke2DAsset {
    return this.stroke;
  }

  /**
   * Set normalized visible drawing progress. This is intentionally animation-
   * agnostic; scene/demo code owns clocks, easing, pause/resume, and sequencing.
   */
  setProgress(progress: number): this {
    this.progress = clamp01(progress);

    const [start, end] = this.parameterRange;
    const parameter = start + (end - start) * this.progress;

    let x = 0;
    let y = 0;
    let visibleCount = 0;

    for (const coefficient of this.coefficients) {
      const angle = coefficient.angularVelocity * parameter;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const dx = coefficient.real * cosine - coefficient.imaginary * sine;
      const dy = coefficient.real * sine + coefficient.imaginary * cosine;

      const startX = x;
      const startY = y;
      x += dx;
      y += dy;

      if (coefficient.radius <= this.style.minimumVisibleRadius) continue;

      const circleScale = coefficient.radius * CIRCLE_QUAD_OVERSCAN;
      this.matrix.makeScale(circleScale, circleScale, 1);
      this.matrix.setPosition(startX, startY, 0.01);
      this.circleInstances.setMatrixAt(visibleCount, this.matrix);

      const length = coefficient.radius;
      const vectorAngle = Math.atan2(dy, dx);
      const directionX = length > EPSILON ? dx / length : Math.cos(vectorAngle);
      const directionY = length > EPSILON ? dy / length : Math.sin(vectorAngle);
      const actualHeadLength = Math.min(
        this.style.vectorHeadLength,
        length * 0.42,
      );
      const shaftLength = Math.max(0, length - actualHeadLength);

      this.matrix.makeRotationZ(vectorAngle);
      this.scaleVector.set(
        shaftLength,
        this.style.vectorShaftWidth,
        1,
      );
      this.matrix.scale(this.scaleVector);
      this.matrix.setPosition(
        startX + directionX * shaftLength * 0.5,
        startY + directionY * shaftLength * 0.5,
        0.02,
      );
      this.shaftInstances.setMatrixAt(visibleCount, this.matrix);

      this.matrix.makeRotationZ(vectorAngle);
      this.scaleVector.set(
        actualHeadLength,
        this.style.vectorHeadWidth,
        1,
      );
      this.matrix.scale(this.scaleVector);
      this.matrix.setPosition(
        startX + directionX * shaftLength,
        startY + directionY * shaftLength,
        0.021,
      );
      this.arrowheadInstances.setMatrixAt(visibleCount, this.matrix);

      visibleCount += 1;
    }

    this.circleInstances.count = visibleCount;
    this.shaftInstances.count = visibleCount;
    this.arrowheadInstances.count = visibleCount;
    this.circleInstances.instanceMatrix.needsUpdate = true;
    this.shaftInstances.instanceMatrix.needsUpdate = true;
    this.arrowheadInstances.instanceMatrix.needsUpdate = true;

    this.currentTipX = x;
    this.currentTipY = y;
    this.tipMesh.position.set(x, y, 0.03);
    this.traceMaterial.setTraceRange(0, this.progress);
    this.refreshVisibility();

    return this.changed();
  }

  reset(): this {
    this.epicyclesEnabled = true;
    this.traceEnabled = true;
    this.tipEnabled = true;
    return this.setProgress(0);
  }

  /** Show the finished stroke while removing the construction guides. */
  showCompletedTrace(): this {
    this.setProgress(1);
    this.epicyclesEnabled = false;
    this.tipEnabled = false;
    this.refreshVisibility();
    return this.changed();
  }

  setEpicyclesVisible(visible: boolean): this {
    this.epicyclesEnabled = visible;
    this.refreshVisibility();
    return this.changed();
  }

  setTraceVisible(visible: boolean): this {
    this.traceEnabled = visible;
    this.refreshVisibility();
    return this.changed();
  }

  setTipVisible(visible: boolean): this {
    this.tipEnabled = visible;
    this.refreshVisibility();
    return this.changed();
  }

  setCircleColor(color: ColorRepresentation): this {
    this.circleMaterial.uniforms.circleColor.value.set(color);
    return this.changed();
  }

  setCircleOpacity(opacity: number): this {
    this.circleMaterial.uniforms.circleOpacity.value = clamp01(opacity);
    this.refreshVisibility();
    return this.changed();
  }

  setCircleWidth(widthPixels: number): this {
    assertNonnegativeFinite(widthPixels, "widthPixels");
    this.circleMaterial.uniforms.circleWidthPixels.value = widthPixels;
    this.refreshVisibility();
    return this.changed();
  }

  setVectorColor(color: ColorRepresentation): this {
    this.vectorMaterial.color.set(color);
    return this.changed();
  }

  setVectorOpacity(opacity: number): this {
    this.vectorMaterial.opacity = clamp01(opacity);
    this.refreshVisibility();
    return this.changed();
  }

  setTraceColor(color: ColorRepresentation): this {
    this.traceMaterial.color.set(color);
    return this.changed();
  }

  setTraceOpacity(opacity: number): this {
    this.traceMaterial.opacity = clamp01(opacity);
    this.refreshVisibility();
    return this.changed();
  }

  setTraceWidth(widthPixels: number): this {
    assertNonnegativeFinite(widthPixels, "widthPixels");
    this.traceMaterial.linewidth = widthPixels;
    this.refreshVisibility();
    return this.changed();
  }

  setTipColor(color: ColorRepresentation): this {
    this.tipMaterial.color.set(color);
    return this.changed();
  }

  setTipOpacity(opacity: number): this {
    this.tipMaterial.opacity = clamp01(opacity);
    this.refreshVisibility();
    return this.changed();
  }

  /**
   * Fade the temporary construction guides without changing their configured
   * relative opacities. The completed trace is intentionally unaffected.
   */
  setConstructionOpacity(multiplier: number): this {
    const amount = clamp01(multiplier);
    this.circleMaterial.uniforms.circleOpacity.value =
      this.style.circleOpacity * amount;
    this.vectorMaterial.opacity = this.style.vectorOpacity * amount;
    this.tipMaterial.opacity = this.style.tipOpacity * amount;
    this.refreshVisibility();
    return this.changed();
  }

  setTipRadius(radius: number): this {
    assertNonnegativeFinite(radius, "radius");
    this.tipMesh.scale.set(radius, radius, 1);
    this.refreshVisibility();
    return this.changed();
  }

  dispose(): void {
    this.circleGeometry.dispose();
    this.circleMaterial.dispose();
    this.shaftGeometry.dispose();
    this.arrowheadGeometry.dispose();
    this.vectorMaterial.dispose();
    this.traceGeometry.dispose();
    this.traceMaterial.dispose();
    this.tipGeometry.dispose();
    this.tipMaterial.dispose();
  }

  private refreshVisibility(): void {
    const circleOpacity = Number(this.circleMaterial.uniforms.circleOpacity.value);
    const circleWidth = Number(this.circleMaterial.uniforms.circleWidthPixels.value);
    const traceHasLength = this.progress > EPSILON;

    this.circleInstances.visible =
      this.epicyclesEnabled && circleOpacity > 0 && circleWidth > 0;
    this.shaftInstances.visible =
      this.epicyclesEnabled &&
	this.vectorMaterial.opacity > 0 &&
	this.style.vectorShaftWidth > 0;
    this.arrowheadInstances.visible =
      this.epicyclesEnabled &&
	this.vectorMaterial.opacity > 0 &&
	this.style.vectorHeadLength > 0 &&
	this.style.vectorHeadWidth > 0;
    this.traceLine.visible =
      this.traceEnabled &&
	traceHasLength &&
	this.traceMaterial.opacity > 0 &&
	this.traceMaterial.linewidth > 0;
    this.tipMesh.visible =
      this.tipEnabled &&
	this.tipMaterial.opacity > 0 &&
	this.tipMesh.scale.x > 0;
  }
}

export function createFourierEpicycles2D(
  options: FourierEpicycles2DOptions,
): FourierEpicycles2D {
  return new FourierEpicycles2D(options);
}
