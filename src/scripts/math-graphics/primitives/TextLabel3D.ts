import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { MathObject3D } from "../core/MathObject3D";
import type { Vec3Tuple } from "../core/types3D";
import type { Vec2Tuple } from "../core/types";

export interface TextLabel3DOptions {
  text: string;
  position?: Vec3Tuple;
  /** CSS2D anchor: [0,0] top-left, [0.5,0.5] center, [1,1] bottom-right. */
  anchor?: Vec2Tuple;
  color?: string;
  fontSizePx?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  background?: string;
  border?: string;
  borderRadiusPx?: number;
  padding?: string;
  opacity?: number;
  whiteSpace?: "normal" | "nowrap" | "pre" | "pre-wrap";
  zIndex?: number;
  className?: string;
  name?: string;
}

function clampOpacity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Crisp HTML text positioned in true 3D world coordinates. */
export class TextLabel3D extends MathObject3D {
  readonly element: HTMLDivElement;
  private readonly labelObject: CSS2DObject;

  constructor({
    text,
    position = [0, 0, 0],
    anchor = [0.5, 0.5],
    color = "rgba(245, 242, 255, 0.94)",
    fontSizePx = 14,
    fontFamily = "Inter, ui-sans-serif, system-ui, sans-serif",
    fontWeight = 600,
    background = "transparent",
    border = "none",
    borderRadiusPx = 6,
    padding = "0",
    opacity = 1,
    whiteSpace = "nowrap",
    zIndex = 1,
    className,
    name = "text-label-3d",
  }: TextLabel3DOptions) {
    super();

    this.name = name;
    this.element = document.createElement("div");
    this.element.textContent = text;
    this.element.className = className ?? "math-text-label-3d";

    Object.assign(this.element.style, {
      color,
      fontSize: `${Math.max(1, fontSizePx)}px`,
      fontFamily,
      fontWeight: String(fontWeight),
      lineHeight: "1.15",
      fontVariantNumeric: "tabular-nums",
      background,
      border,
      borderRadius: `${Math.max(0, borderRadiusPx)}px`,
      padding,
      opacity: String(clampOpacity(opacity)),
      whiteSpace,
      pointerEvents: "none",
      userSelect: "none",
      zIndex: String(zIndex),
      textShadow: "0 1px 4px rgba(0, 0, 0, 0.72)",
    });

    this.labelObject = new CSS2DObject(this.element);
    this.labelObject.name = `${name}:css-label`;
    this.labelObject.center.set(anchor[0], anchor[1]);

    this.add(this.labelObject);
    this.position.set(position[0], position[1], position[2]);
  }

  setText(text: string): this {
    this.element.textContent = text;
    return this.changed();
  }

  /** Only pass trusted application-authored HTML. */
  setHTML(html: string): this {
    this.element.innerHTML = html;
    return this.changed();
  }

  setColor(color: string): this {
    this.element.style.color = color;
    return this.changed();
  }

  setOpacity(opacity: number): this {
    this.element.style.opacity = String(clampOpacity(opacity));
    return this.changed();
  }

  setAnchor(anchor: Vec2Tuple): this {
    this.labelObject.center.set(anchor[0], anchor[1]);
    return this.changed();
  }

  setFontSize(fontSizePx: number): this {
    this.element.style.fontSize = `${Math.max(1, fontSizePx)}px`;
    return this.changed();
  }

  dispose(): void {
    this.element.remove();
  }
}

export function createTextLabel3D(
  options: TextLabel3DOptions,
): TextLabel3D {
  return new TextLabel3D(options);
}
