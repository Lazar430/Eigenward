import {
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  Object3D,
  type ColorRepresentation,
} from "three";
import { HUES } from "../core/colors";
import { MathObject3D } from "../core/MathObject3D";
import type { Vec3Tuple } from "../core/types3D";

export interface LightingRig3DOptions {
  ambientColor?: ColorRepresentation;
  ambientIntensity?: number;
  skyColor?: ColorRepresentation;
  groundColor?: ColorRepresentation;
  hemisphereIntensity?: number;
  keyColor?: ColorRepresentation;
  keyIntensity?: number;
  keyPosition?: Vec3Tuple;
  fillColor?: ColorRepresentation;
  fillIntensity?: number;
  fillPosition?: Vec3Tuple;
  name?: string;
}

function nonnegative(value: number): number {
  return Math.max(0, Number.isFinite(value) ? value : 0);
}

/**
 * A compact reusable light setup for educational mathematical surfaces.
 * The whole rig is an Object3D, so it can be moved/rotated as one unit.
 */
export class LightingRig3D extends MathObject3D {
  readonly ambient: AmbientLight;
  readonly hemisphere: HemisphereLight;
  readonly key: DirectionalLight;
  readonly fill: DirectionalLight;

  private readonly keyTarget = new Object3D();
  private readonly fillTarget = new Object3D();

  constructor({
    ambientColor = 0xffffff,
    ambientIntensity = 0.28,
    skyColor = HUES.cyan.soft,
    groundColor = HUES.purple.deep,
    hemisphereIntensity = 0.72,
    keyColor = 0xffffff,
    keyIntensity = 2.15,
    keyPosition = [4.5, 6, 5],
    fillColor = HUES.cyan.light,
    fillIntensity = 0.7,
    fillPosition = [-5, 2.5, -3.5],
    name = "lighting-rig-3d",
  }: LightingRig3DOptions = {}) {
    super();
    this.name = name;

    this.ambient = new AmbientLight(
      ambientColor,
      nonnegative(ambientIntensity),
    );
    this.hemisphere = new HemisphereLight(
      skyColor,
      groundColor,
      nonnegative(hemisphereIntensity),
    );
    this.key = new DirectionalLight(keyColor, nonnegative(keyIntensity));
    this.fill = new DirectionalLight(fillColor, nonnegative(fillIntensity));

    this.key.position.set(...keyPosition);
    this.fill.position.set(...fillPosition);
    this.key.target = this.keyTarget;
    this.fill.target = this.fillTarget;

    this.ambient.name = `${name}:ambient`;
    this.hemisphere.name = `${name}:hemisphere`;
    this.key.name = `${name}:key`;
    this.fill.name = `${name}:fill`;
    this.keyTarget.name = `${name}:key-target`;
    this.fillTarget.name = `${name}:fill-target`;

    this.add(
      this.ambient,
      this.hemisphere,
      this.key,
      this.fill,
      this.keyTarget,
      this.fillTarget,
    );
  }

  setIntensityScale(scale: number): this {
    const factor = nonnegative(scale);
    this.ambient.intensity *= factor;
    this.hemisphere.intensity *= factor;
    this.key.intensity *= factor;
    this.fill.intensity *= factor;
    return this.changed();
  }

  setKeyPosition(position: Vec3Tuple): this {
    this.key.position.set(...position);
    return this.changed();
  }

  setFillPosition(position: Vec3Tuple): this {
    this.fill.position.set(...position);
    return this.changed();
  }

  setTarget(target: Vec3Tuple): this {
    this.keyTarget.position.set(...target);
    this.fillTarget.position.set(...target);
    return this.changed();
  }

  dispose(): void {
    // Three.js light objects own no disposable GPU geometry/material resources.
  }
}

export function createLightingRig3D(
  options?: LightingRig3DOptions,
): LightingRig3D {
  return new LightingRig3D(options);
}
