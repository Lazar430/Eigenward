import type { ColorRepresentation } from "three";

/**
 * Compact semantic colors for the site. Keeping them here prevents individual
 * articles from slowly drifting into unrelated palettes.
 */
export const COLORS = {
  white: "#f7f4ff",
  ink: "#171321",
  muted: "#9d95b3",
  cyan: "#70e7ff",
  blue: "#6ca8ff",
  violet: "#a78bfa",
  purple: "#8f6de8",
  magenta: "#ff6b9e",
  red: "#ff6f7f",
  orange: "#ffae57",
  gold: "#ffd166",
  mint: "#65e6b4",
  green: "#70d889",
} as const satisfies Record<string, ColorRepresentation>;

/** Ready-made shade families for common mathematical accents. */
export const HUES = {
  cyan: {
    soft: "#dffaff",
    light: "#91efff",
    base: "#36d8f4",
    deep: "#168aa4",
  },
  purple: {
    soft: "#eee8ff",
    light: "#c6b4ff",
    base: "#8f6de8",
    deep: "#55369e",
  },
  magenta: {
    soft: "#ffe4ee",
    light: "#ff9abb",
    base: "#ff5f95",
    deep: "#a82e5b",
  },
  gold: {
    soft: "#fff4cf",
    light: "#ffe28a",
    base: "#ffc94d",
    deep: "#a66d00",
  },
  mint: {
    soft: "#dffcef",
    light: "#9cf0cb",
    base: "#58d9a5",
    deep: "#237f60",
  },
  blue: {
    soft: "#e4efff",
    light: "#9bc2ff",
    base: "#6098f2",
    deep: "#315ba9",
  },
} as const satisfies Record<
  string,
  Record<string, ColorRepresentation>
>;
