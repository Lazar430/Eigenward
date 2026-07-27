import type { Vec2Tuple } from "../core/types";

/** A conventional row-major 2 × 2 matrix. */
export type Matrix2 = readonly [
  readonly [number, number],
  readonly [number, number],
];

export const IDENTITY_MATRIX_2: Matrix2 = [
  [1, 0],
  [0, 1],
];

export function applyMatrix2(
  matrix: Matrix2,
  vector: Vec2Tuple,
): Vec2Tuple {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1],
  ];
}

export function multiplyMatrix2(
  left: Matrix2,
  right: Matrix2,
): Matrix2 {
  return [
    [
      left[0][0] * right[0][0] + left[0][1] * right[1][0],
      left[0][0] * right[0][1] + left[0][1] * right[1][1],
    ],
    [
      left[1][0] * right[0][0] + left[1][1] * right[1][0],
      left[1][0] * right[0][1] + left[1][1] * right[1][1],
    ],
  ];
}

export function determinantMatrix2(matrix: Matrix2): number {
  return (
    matrix[0][0] * matrix[1][1] -
    matrix[0][1] * matrix[1][0]
  );
}

export function inverseMatrix2(matrix: Matrix2): Matrix2 {
  const determinant = determinantMatrix2(matrix);

  if (Math.abs(determinant) < 1e-12) {
    throw new RangeError("A singular 2 × 2 matrix has no inverse.");
  }

  const inverseDeterminant = 1 / determinant;

  return [
    [
      matrix[1][1] * inverseDeterminant,
      -matrix[0][1] * inverseDeterminant,
    ],
    [
      -matrix[1][0] * inverseDeterminant,
      matrix[0][0] * inverseDeterminant,
    ],
  ];
}

/** Entrywise interpolation, useful for displaying a matrix deformation. */
export function lerpMatrix2(
  from: Matrix2,
  to: Matrix2,
  progress: number,
): Matrix2 {
  const t = Math.min(1, Math.max(0, progress));
  const mix = (a: number, b: number): number => a + (b - a) * t;

  return [
    [mix(from[0][0], to[0][0]), mix(from[0][1], to[0][1])],
    [mix(from[1][0], to[1][0]), mix(from[1][1], to[1][1])],
  ];
}
