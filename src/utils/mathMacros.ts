import { MATH_COLORS } from "./mathColors";

export const MATH_MACROS = {
  "\\cyan": `\\color{${MATH_COLORS.cyan}}`,
  "\\blue": `\\color{${MATH_COLORS.blue}}`,
  "\\purple": `\\color{${MATH_COLORS.purple}}`,
  "\\magenta": `\\color{${MATH_COLORS.magenta}}`,
  "\\red": `\\color{${MATH_COLORS.red}}`,
  "\\orange": `\\color{${MATH_COLORS.orange}}`,
  "\\gold": `\\color{${MATH_COLORS.gold}}`,
  "\\yellow": `\\color{${MATH_COLORS.yellow}}`,
  "\\green": `\\color{${MATH_COLORS.green}}`,
  "\\mint": `\\color{${MATH_COLORS.mint}}`,
  "\\teal": `\\color{${MATH_COLORS.teal}}`,
  "\\gray": `\\color{${MATH_COLORS.gray}}`,
  "\\white": `\\color{${MATH_COLORS.white}}`,
} as const;
