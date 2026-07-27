import {
  CircleGeometry,
  Mesh,
  MeshBasicMaterial,
  type ColorRepresentation,
} from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { COLORS } from "../core/colors";
import { MathObject2D } from "../core/MathObject2D";
import type { Vec2Tuple } from "../core/types";
import { TextLabel2D, type TextLabel2DOptions } from "./TextLabel2D";

export type PointLabelVisibility2D = "always" | "hover" | "hidden";

export interface PointMarker2DLabelOptions
  extends Omit<TextLabel2DOptions, "text" | "position" | "name"> {
  text: string;
  offset?: Vec2Tuple;
  visibility?: PointLabelVisibility2D;
}

export interface PointMarker2DOptions {
  position: Vec2Tuple;
  radius?: number;
  fill?: ColorRepresentation;
  fillOpacity?: number;
  outline?: ColorRepresentation | null;
  outlineOpacity?: number;
  outlineWidth?: number;
  label?: PointMarker2DLabelOptions;
  /** Browser-pixel radius of the invisible hover target. */
  hoverRadiusPixels?: number;
  name?: string;
}

function clampOpacity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function assertFinitePoint(point: Vec2Tuple): void {
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    throw new RangeError("Point-marker position must contain finite numbers.");
  }
}

/** A reusable mathematical point with an optional always/hover label. */
export class PointMarker2D extends MathObject2D {
  private readonly circleGeometry = new CircleGeometry(1, 48);
  private readonly outlineMaterial: MeshBasicMaterial;
  private readonly fillMaterial: MeshBasicMaterial;
  private readonly outlineMesh: Mesh<CircleGeometry, MeshBasicMaterial>;
  private readonly fillMesh: Mesh<CircleGeometry, MeshBasicMaterial>;

  private readonly label: TextLabel2D | null;
  private readonly hitElement: HTMLDivElement | null;
  private readonly hitObject: CSS2DObject | null;

  private point: Vec2Tuple;
  private radius: number;
  private outlineWidth: number;
  private labelVisibility: PointLabelVisibility2D;

  constructor({
    position,
    radius = 0.085,
    fill = COLORS.white,
    fillOpacity = 1,
    outline = 0x171021,
    outlineOpacity = 0.95,
    outlineWidth = 0.025,
    label,
    hoverRadiusPixels = 18,
    name = "point-marker-2d",
  }: PointMarker2DOptions) {
    super();

    assertFinitePoint(position);

    this.name = name;
    this.point = [position[0], position[1]];
    this.radius = Math.max(0, radius);
    this.outlineWidth = Math.max(0, outlineWidth);
    this.labelVisibility = label?.visibility ?? "hidden";

    this.outlineMaterial = new MeshBasicMaterial({
      color: outline ?? fill,
      opacity: outline === null ? 0 : clampOpacity(outlineOpacity),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this.fillMaterial = new MeshBasicMaterial({
      color: fill,
      opacity: clampOpacity(fillOpacity),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this.outlineMesh = new Mesh(this.circleGeometry, this.outlineMaterial);
    this.fillMesh = new Mesh(this.circleGeometry, this.fillMaterial);
    this.outlineMesh.name = `${name}:outline`;
    this.fillMesh.name = `${name}:fill`;
    this.outlineMesh.renderOrder = 6;
    this.fillMesh.renderOrder = 7;
    this.fillMesh.position.z = 0.001;

    this.add(this.outlineMesh, this.fillMesh);

    if (label) {
      const {
        text,
        offset = [0.14, 0.14],
        visibility: _visibility,
        ...textOptions
      } = label;

      this.label = new TextLabel2D({
        ...textOptions,
        name: `${name}:label`,
        text,
        position: offset,
      });
      this.add(this.label);

      if (this.labelVisibility === "hover") {
        this.hitElement = document.createElement("div");
        Object.assign(this.hitElement.style, {
          width: `${Math.max(1, hoverRadiusPixels * 2)}px`,
          height: `${Math.max(1, hoverRadiusPixels * 2)}px`,
          borderRadius: "50%",
          pointerEvents: "auto",
          cursor: "help",
          background: "transparent",
        });
        this.hitElement.setAttribute("aria-hidden", "true");
        this.hitElement.addEventListener("pointerenter", this.handlePointerEnter);
        this.hitElement.addEventListener("pointerleave", this.handlePointerLeave);

        this.hitObject = new CSS2DObject(this.hitElement);
        this.hitObject.name = `${name}:hover-target`;
        this.hitObject.center.set(0.5, 0.5);
        this.add(this.hitObject);
      } else {
        this.hitElement = null;
        this.hitObject = null;
      }
    } else {
      this.label = null;
      this.hitElement = null;
      this.hitObject = null;
    }

    this.updateGeometryAndTransform();
    this.updateLabelVisibility();
  }

  getPoint(): Vec2Tuple {
    return [this.point[0], this.point[1]];
  }

  setPoint(point: Vec2Tuple): this {
    assertFinitePoint(point);
    this.point = [point[0], point[1]];
    this.updateGeometryAndTransform();
    return this.changed();
  }

  setRadius(radius: number): this {
    this.radius = Math.max(0, radius);
    this.updateGeometryAndTransform();
    return this.changed();
  }

  setFillColor(color: ColorRepresentation): this {
    this.fillMaterial.color.set(color);
    return this.changed();
  }

  setOutlineColor(color: ColorRepresentation | null): this {
    if (color === null) {
      this.outlineMaterial.opacity = 0;
    } else {
      this.outlineMaterial.color.set(color);
      if (this.outlineMaterial.opacity === 0) this.outlineMaterial.opacity = 1;
    }

    this.updateGeometryAndTransform();
    return this.changed();
  }

  setLabelText(text: string): this {
    this.label?.setText(text);
    return this.changed();
  }

  setLabelOffset(offset: Vec2Tuple): this {
    this.label?.moveTo(offset[0], offset[1]);
    return this.changed();
  }

  setLabelAnchor(anchor: Vec2Tuple): this {
    this.label?.setAnchor(anchor);
    return this.changed();
  }

  setLabelVisibility(visibility: PointLabelVisibility2D): this {
    this.labelVisibility = visibility;
    this.updateLabelVisibility();
    return this.changed();
  }

  override moveTo(x: number, y: number): this {
    return this.setPoint([x, y]);
  }

  override moveBy(dx: number, dy: number): this {
    return this.setPoint([this.point[0] + dx, this.point[1] + dy]);
  }

  dispose(): void {
    this.hitElement?.removeEventListener(
      "pointerenter",
      this.handlePointerEnter,
    );
    this.hitElement?.removeEventListener(
      "pointerleave",
      this.handlePointerLeave,
    );
    this.hitElement?.remove();
    this.circleGeometry.dispose();
    this.outlineMaterial.dispose();
    this.fillMaterial.dispose();
  }

  private readonly handlePointerEnter = (): void => {
    if (this.labelVisibility === "hover") {
      this.label?.show();
    }
  };

  private readonly handlePointerLeave = (): void => {
    if (this.labelVisibility === "hover") {
      this.label?.hide();
    }
  };

  private updateGeometryAndTransform(): void {
    const innerRadius = Math.max(0, this.radius - this.outlineWidth);

    this.outlineMesh.scale.set(this.radius, this.radius, 1);
    this.fillMesh.scale.set(innerRadius, innerRadius, 1);
    this.outlineMesh.visible =
      this.radius > 0 && this.outlineMaterial.opacity > 0;
    this.fillMesh.visible = innerRadius > 0 && this.fillMaterial.opacity > 0;

    this.position.set(this.point[0], this.point[1], 0.04);
    this.rotation.set(0, 0, 0);
    this.scale.set(1, 1, 1);
  }

  private updateLabelVisibility(): void {
    if (!this.label) return;

    if (this.labelVisibility === "always") {
      this.label.show();
    } else {
      this.label.hide();
    }
  }
}

export function createPointMarker2D(
  options: PointMarker2DOptions,
): PointMarker2D {
  return new PointMarker2D(options);
}
