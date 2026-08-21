import { Vector3 } from "three";
import type { MathScene3D } from "../core/MathScene3D";
import type { CameraState3D, Vec3Tuple } from "../core/types3D";
import {
  centroid3D,
  distance3D,
  normalize3D,
  subtract3D,
} from "./euclideanConstructions3D";

export interface FitPointsCamera3DOptions {
  paddingFactor?: number;
  minimumRadius?: number;
  minimumDistance?: number;
  maximumDistance?: number;
}

export interface CameraTarget3D {
  position: Vec3Tuple;
  target: Vec3Tuple;
  fovDegrees?: number;
}

function canvasAspect(scene: MathScene3D): number {
  const rectangle = scene.canvas.getBoundingClientRect();
  return Math.max(1e-6, rectangle.width / Math.max(1, rectangle.height));
}

export function sceneContainsPoints3D(
  scene: MathScene3D,
  points: readonly Vec3Tuple[],
  paddingNdc = 0.08,
): boolean {
  if (points.length === 0) return true;

  const safePadding = Math.min(0.45, Math.max(0, paddingNdc));
  const limit = 1 - safePadding;

  scene.camera.updateMatrixWorld();

  for (const point of points) {
    const projected = new Vector3(...point).project(scene.camera);

    if (
      projected.z < -1 ||
      projected.z > 1 ||
      Math.abs(projected.x) > limit ||
      Math.abs(projected.y) > limit
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Conservative perspective-camera fit based on a bounding sphere.
 *
 * The current viewing direction is preserved while the target is recentered on
 * the supplied points. Using the tighter of the horizontal and vertical FOVs
 * makes the result safe for arbitrary canvas aspect ratios.
 */
export function fitPointsCamera3D(
  scene: MathScene3D,
  points: readonly Vec3Tuple[],
  {
    paddingFactor = 1.18,
    minimumRadius = 0.25,
    minimumDistance = 1,
    maximumDistance = Number.POSITIVE_INFINITY,
  }: FitPointsCamera3DOptions = {},
): CameraTarget3D {
  if (points.length === 0) {
    const state = scene.getCameraState();
    return {
      position: state.position,
      target: state.target,
      fovDegrees: state.fovDegrees,
    };
  }

  const target = centroid3D(points);
  let radius = minimumRadius;

  for (const point of points) {
    radius = Math.max(radius, distance3D(target, point));
  }

  const state = scene.getCameraState();
  const currentDirectionRaw = subtract3D(state.position, state.target);
  const currentDirection =
    distance3D(state.position, state.target) <= 1e-8
      ? ([1, 1, 1] as Vec3Tuple)
      : currentDirectionRaw;
  const viewDirection = normalize3D(currentDirection);

  const verticalHalfFov =
    (state.fovDegrees * Math.PI) / 360;
  const horizontalHalfFov = Math.atan(
    Math.tan(verticalHalfFov) * canvasAspect(scene),
  );
  const limitingHalfFov = Math.max(
    1e-4,
    Math.min(verticalHalfFov, horizontalHalfFov),
  );

  const requiredDistance =
    (radius * Math.max(1, paddingFactor)) /
    Math.sin(limitingHalfFov);

  const distance = Math.min(
    maximumDistance,
    Math.max(minimumDistance, requiredDistance),
  );

  return {
    target,
    position: [
      target[0] + viewDirection[0] * distance,
      target[1] + viewDirection[1] * distance,
      target[2] + viewDirection[2] * distance,
    ],
    fovDegrees: state.fovDegrees,
  };
}

export function copyCameraState3D(
  state: CameraState3D,
): CameraState3D {
  return {
    position: [...state.position] as Vec3Tuple,
    target: [...state.target] as Vec3Tuple,
    fovDegrees: state.fovDegrees,
    near: state.near,
    far: state.far,
  };
}
