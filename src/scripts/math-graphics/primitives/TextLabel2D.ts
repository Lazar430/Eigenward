import katex from "katex";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { MathObject2D } from "../core/MathObject2D";
import type { Vec2Tuple } from "../core/types";

export interface TextLabel2DBaseOptions {
  position?: Vec2Tuple;

  /**
   * CSS2D anchor:
   * [0,0] top-left,
   * [0.5,0.5] center,
   * [1,1] bottom-right.
   */
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

export interface TextLabel2DLatexRenderOptions {
  /**
   * KaTeX display mode.
   *
   * Labels normally want inline mathematics, so the default is false.
   */
  displayMode?: boolean;

  /**
   * Whether invalid TeX should throw.
   *
   * The website's existing mathematical content uses throwOnError: false,
   * so graphics labels follow the same forgiving default.
   */
  throwOnError?: boolean;

  /** KaTeX error color used when throwOnError is false. */
  errorColor?: string;
}

export type TextLabel2DOptions =
  TextLabel2DBaseOptions &
    (
      | {
          text: string;
          latex?: never;
          latexDisplayMode?: never;
          latexThrowOnError?: never;
          latexErrorColor?: never;
        }
      | {
          latex: string;
          text?: never;
          latexDisplayMode?: boolean;
          latexThrowOnError?: boolean;
          latexErrorColor?: string;
        }
    );

export type TextLabel2DContentMode =
  | "text"
  | "html"
  | "latex";

function clampOpacity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function renderLatex(
  latex: string,
  {
    displayMode = false,
    throwOnError = false,
    errorColor = "#ff6b81",
  }: TextLabel2DLatexRenderOptions = {},
): string {
  return katex.renderToString(latex, {
    displayMode,
    throwOnError,
    errorColor,

    /*
     * TextLabel2D receives formulas authored by the application itself.
     * No KaTeX HTML-producing trust features are needed here.
     */
    trust: false,
  });
}

/**
 * Crisp HTML / KaTeX text positioned by the same camera as the WebGL scene.
 *
 * Plain text:
 *
 *   createTextLabel2D({
 *     text: "A",
 *     position: [1, 2],
 *   });
 *
 * LaTeX:
 *
 *   createTextLabel2D({
 *     latex: String.raw`\theta = \frac{s}{r}`,
 *     position: [1, 2],
 *   });
 *
 * `setText()` switches the label back to ordinary escaped text.
 * `setLatex()` renders application-authored TeX through KaTeX.
 * `setHTML()` remains available for other trusted application-authored markup.
 *
 * KaTeX's stylesheet must exist on the page. Eigenward already imports
 * `katex/dist/katex.min.css` globally from BaseLayout.astro.
 */
export class TextLabel2D extends MathObject2D {
  readonly element: HTMLDivElement;
  private readonly labelObject: CSS2DObject;

  private contentMode: TextLabel2DContentMode;

  constructor(options: TextLabel2DOptions) {
    super();

    const {
      position = [0, 0],
      anchor = [0.5, 0.5],
      color = "rgba(245, 242, 255, 0.94)",
      fontSizePx = 14,
      fontFamily =
        "Inter, ui-sans-serif, system-ui, sans-serif",
      fontWeight = 600,
      background = "transparent",
      border = "none",
      borderRadiusPx = 6,
      padding = "0",
      opacity = 1,
      whiteSpace = "nowrap",
      zIndex = 1,
      className,
      name = "text-label-2d",
    } = options;

    this.name = name;
    this.element = document.createElement("div");
    this.element.className =
      className ?? "math-text-label-2d";

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
    this.position.set(
      position[0],
      position[1],
      0.04,
    );

    if ("latex" in options) {
      this.contentMode = "latex";

      this.applyLatex(options.latex, {
        displayMode:
          options.latexDisplayMode ?? false,
        throwOnError:
          options.latexThrowOnError ?? false,
        errorColor:
          options.latexErrorColor ?? "#ff6b81",
      });
    } else {
      this.contentMode = "text";
      this.element.textContent = options.text;
      this.updateContentModeClass();
    }
  }

  getContentMode(): TextLabel2DContentMode {
    return this.contentMode;
  }

  setText(text: string): this {
    this.contentMode = "text";
    this.element.textContent = text;
    this.updateContentModeClass();
    return this.changed();
  }

  /**
   * Render application-authored TeX through KaTeX.
   *
   * This is intentionally distinct from setHTML(): scenes should pass TeX
   * source here rather than pre-rendering KaTeX themselves.
   */
  setLatex(
    latex: string,
    options: TextLabel2DLatexRenderOptions = {},
  ): this {
    this.contentMode = "latex";
    this.applyLatex(latex, options);
    return this.changed();
  }

  /** Only pass trusted application-authored HTML. */
  setHTML(html: string): this {
    this.contentMode = "html";
    this.element.innerHTML = html;
    this.updateContentModeClass();
    return this.changed();
  }

  setColor(color: string): this {
    this.element.style.color = color;
    return this.changed();
  }

  setOpacity(opacity: number): this {
    this.element.style.opacity =
      String(clampOpacity(opacity));

    return this.changed();
  }

  setAnchor(anchor: Vec2Tuple): this {
    this.labelObject.center.set(
      anchor[0],
      anchor[1],
    );

    return this.changed();
  }

  setFontSize(fontSizePx: number): this {
    this.element.style.fontSize =
      `${Math.max(1, fontSizePx)}px`;

    return this.changed();
  }

  dispose(): void {
    this.element.remove();
  }

  private applyLatex(
    latex: string,
    options: TextLabel2DLatexRenderOptions,
  ): void {
    this.element.innerHTML =
      renderLatex(latex, options);

    this.updateContentModeClass();
  }

  private updateContentModeClass(): void {
    this.element.dataset.contentMode =
      this.contentMode;

    this.element.classList.toggle(
      "math-text-label-2d--latex",
      this.contentMode === "latex",
    );
  }
}

export function createTextLabel2D(
  options: TextLabel2DOptions,
): TextLabel2D {
  return new TextLabel2D(options);
}
