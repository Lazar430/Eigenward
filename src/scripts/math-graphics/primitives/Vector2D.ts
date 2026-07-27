import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type ColorRepresentation,
} from "three";
import { COLORS } from "../core/colors";
import { MathObject2D } from "../core/MathObject2D";
import type { Vec2Tuple } from "../core/types";

const EPSILON = 1e-9;

export interface Vector2DStyle {
  color?: ColorRepresentation;
  opacity?: number;
  /** Width of the rectangular shaft in mathematical world units. */
  shaftWidth?: number;
  /** Preferred arrowhead length in mathematical world units. */
  headLength?: number;
  /** Arrowhead width in mathematical world units. */
  headWidth?: number;
}

export interface Vector2DOptions {
  start: Vec2Tuple;
  end: Vec2Tuple;
  style?: Vector2DStyle;
  name?: string;
}

function clampOpacity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function assertFinitePoint(point: Vec2Tuple, label: string): void {
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    throw new RangeError(`${label} must contain two finite numbers.`);
  }
}

/**
 * A unit triangle whose base lies on x = 0 and whose tip is (1, 0).
 * Scaling and translating this geometry produces every arrowhead.
 */
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
 * A mathematical vector drawn as a rectangle plus a triangular arrowhead.
 *
 * The class contains no event listeners and is therefore inert by default.
 * A scene may separately register its endpoint with PointDragController2D.
 */
export class Vector2D extends MathObject2D {
  private readonly shaftGeometry = new PlaneGeometry(1, 1);
  private readonly headGeometry = createUnitArrowheadGeometry();
  private readonly material: MeshBasicMaterial;
  private readonly shaftMesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly headMesh: Mesh<BufferGeometry, MeshBasicMaterial>;

  private startPoint: Vec2Tuple;
  private endPoint: Vec2Tuple;
  private readonly initialLength: number;

  private shaftWidth: number;
  private headLength: number;
  private headWidth: number;
  private lastNonzeroAngle = 0;

  constructor({
    start,
    end,
    style = {},
    name = "vector-2d",
  }: Vector2DOptions) {
    super();

    assertFinitePoint(start, "start");
    assertFinitePoint(end, "end");

    this.name = name;
    this.startPoint = [start[0], start[1]];
    this.endPoint = [end[0], end[1]];
    this.initialLength = Math.hypot(
      end[0] - start[0],
      end[1] - start[1],
    );

    this.shaftWidth = Math.max(0, style.shaftWidth ?? 0.09);
    this.headLength = Math.max(0, style.headLength ?? 0.42);
    this.headWidth = Math.max(0, style.headWidth ?? 0.34);

    this.material = new MeshBasicMaterial({
      color: style.color ?? COLORS.cyan,
      opacity: clampOpacity(style.opacity ?? 1),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    });

    this.shaftMesh = new Mesh(this.shaftGeometry, this.material);
    this.shaftMesh.name = `${name}:shaft`;
    this.shaftMesh.renderOrder = 2;

    this.headMesh = new Mesh(this.headGeometry, this.material);
    this.headMesh.name = `${name}:head`;
    this.headMesh.renderOrder = 2;

    this.add(this.shaftMesh, this.headMesh);
    this.updateGeometryAndTransform();
  }

  getStart(): Vec2Tuple {
    return [this.startPoint[0], this.startPoint[1]];
  }

  getEnd(): Vec2Tuple {
    return [this.endPoint[0], this.endPoint[1]];
  }

  getDisplacement(): Vec2Tuple {
    return [
      this.endPoint[0] - this.startPoint[0],
      this.endPoint[1] - this.startPoint[1],
    ];
  }

  getLength(): number {
    const [dx, dy] = this.getDisplacement();
    return Math.hypot(dx, dy);
  }

  setEndpoints(start: Vec2Tuple, end: Vec2Tuple): this {
    assertFinitePoint(start, "start");
    assertFinitePoint(end, "end");

    this.startPoint = [start[0], start[1]];
    this.endPoint = [end[0], end[1]];
    this.updateGeometryAndTransform();
    return this.changed();
  }

  setStart(start: Vec2Tuple): this {
    return this.setEndpoints(start, this.endPoint);
  }

  setEnd(end: Vec2Tuple): this {
    return this.setEndpoints(this.startPoint, end);
  }

  /** Set a tail point and a displacement vector rather than an endpoint. */
  setVector(origin: Vec2Tuple, displacement: Vec2Tuple): this {
    return this.setEndpoints(origin, [
      origin[0] + displacement[0],
      origin[1] + displacement[1],
    ]);
  }

  setColor(color: ColorRepresentation): this {
    this.material.color.set(color);
    return this.changed();
  }

  setOpacity(opacity: number): this {
    this.material.opacity = clampOpacity(opacity);
    this.material.visible = this.material.opacity > 0;
    return this.changed();
  }

  setDimensions(options: {
    shaftWidth?: number;
    headLength?: number;
    headWidth?: number;
  }): this {
    if (options.shaftWidth !== undefined) {
      this.shaftWidth = Math.max(0, options.shaftWidth);
    }
    if (options.headLength !== undefined) {
      this.headLength = Math.max(0, options.headLength);
    }
    if (options.headWidth !== undefined) {
      this.headWidth = Math.max(0, options.headWidth);
    }

    this.updateGeometryAndTransform();
    return this.changed();
  }

  /** Move the vector's tail while preserving its displacement. */
  override moveTo(x: number, y: number): this {
    const [dx, dy] = this.getDisplacement();
    return this.setEndpoints([x, y], [x + dx, y + dy]);
  }

  override moveBy(dx: number, dy: number): this {
    return this.setEndpoints(
      [this.startPoint[0] + dx, this.startPoint[1] + dy],
      [this.endPoint[0] + dx, this.endPoint[1] + dy],
    );
  }

  /** Set the vector's mathematical direction while preserving its length. */
  override setRotation(angleRadians: number): this {
    const length = this.getLength();
    return this.setEnd([
      this.startPoint[0] + length * Math.cos(angleRadians),
      this.startPoint[1] + length * Math.sin(angleRadians),
    ]);
  }

  override rotateBy(angleRadians: number): this {
    const [dx, dy] = this.getDisplacement();
    const cosine = Math.cos(angleRadians);
    const sine = Math.sin(angleRadians);

    return this.setEnd([
      this.startPoint[0] + cosine * dx - sine * dy,
      this.startPoint[1] + sine * dx + cosine * dy,
    ]);
  }

  /** Scale the vector relative to its length at construction time. */
  override resizeTo(scale: number): this {
    const currentLength = this.getLength();
    const targetLength = Math.max(0, this.initialLength * scale);

    if (currentLength <= EPSILON) {
      return this.setEnd([
        this.startPoint[0] + targetLength * Math.cos(this.lastNonzeroAngle),
        this.startPoint[1] + targetLength * Math.sin(this.lastNonzeroAngle),
      ]);
    }

    const factor = targetLength / currentLength;
    const [dx, dy] = this.getDisplacement();
    return this.setEnd([
      this.startPoint[0] + factor * dx,
      this.startPoint[1] + factor * dy,
    ]);
  }

  override resizeBy(factor: number): this {
    const [dx, dy] = this.getDisplacement();
    return this.setEnd([
      this.startPoint[0] + factor * dx,
      this.startPoint[1] + factor * dy,
    ]);
  }

  /** Apply componentwise mathematical scaling to the displacement vector. */
  override setScale(x: number, y: number = x): this {
    const [dx, dy] = this.getDisplacement();
    return this.setEnd([
      this.startPoint[0] + x * dx,
      this.startPoint[1] + y * dy,
    ]);
  }

  dispose(): void {
    this.shaftGeometry.dispose();
    this.headGeometry.dispose();
    this.material.dispose();
  }

  private updateGeometryAndTransform(): void {
    const dx = this.endPoint[0] - this.startPoint[0];
    const dy = this.endPoint[1] - this.startPoint[1];
    const length = Math.hypot(dx, dy);

    this.position.set(this.startPoint[0], this.startPoint[1], 0.02);
    this.scale.set(1, 1, 1);

    if (length <= EPSILON) {
      this.shaftMesh.visible = false;
      this.headMesh.visible = false;
      this.rotation.z = this.lastNonzeroAngle;
      return;
    }

    const angle = Math.atan2(dy, dx);
    this.lastNonzeroAngle = angle;
    this.rotation.z = angle;

    // Keep the head visually reasonable when the vector becomes very short.
    const actualHeadLength = Math.min(this.headLength, length * 0.42);
    const shaftLength = Math.max(0, length - actualHeadLength);

    this.shaftMesh.visible = shaftLength > EPSILON && this.shaftWidth > 0;
    this.shaftMesh.position.set(shaftLength / 2, 0, 0);
    this.shaftMesh.scale.set(shaftLength, this.shaftWidth, 1);

    this.headMesh.visible = actualHeadLength > EPSILON && this.headWidth > 0;
    this.headMesh.position.set(shaftLength, 0, 0.001);
    this.headMesh.scale.set(actualHeadLength, this.headWidth, 1);
  }
}

export function createVector2D(options: Vector2DOptions): Vector2D {
  return new Vector2D(options);
}
