import type { ColorRepresentation } from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

export interface OutlineTraceLineMaterialOptions {
  color: ColorRepresentation;
  opacity: number;
  transparent?: boolean;
  depthTest?: boolean;
  depthWrite?: boolean;
  alphaToCoverage?: boolean;
}

type TraceUniforms = {
  traceStart: { value: number };
  traceEnd: { value: number };
  traceTotalLength: { value: number };
};

function insertAfter(
  source: string,
  marker: string,
  addition: string,
  shaderName: string,
): string {
  if (!source.includes(marker)) {
    throw new Error(
      `OutlineTraceLineMaterial could not patch the ${shaderName} shader. ` +
        "The installed Three.js LineMaterial shader has an unexpected structure.",
    );
  }

  return source.replace(marker, `${marker}\n${addition}`);
}

/**
 * Solid Three.js wide-line material with an arc-length reveal mask.
 *
 * This deliberately does not use LineMaterial's dashed mode. Dashed mode was
 * responsible for the stippled/radial artifacts visible on thick outlines.
 * Instead, the complete line remains on the GPU and the fragment shader hides
 * every fragment outside a normalized perimeter interval [traceStart, traceEnd].
 */
export class OutlineTraceLineMaterial extends LineMaterial {
  declare uniforms: LineMaterial["uniforms"] & TraceUniforms;

  constructor(options: OutlineTraceLineMaterialOptions) {
    super({
      ...options,
      dashed: false,
    });

    this.uniforms.traceStart = { value: 0 };
    this.uniforms.traceEnd = { value: 1 };
    this.uniforms.traceTotalLength = { value: 1 };

    this.vertexShader = insertAfter(
      this.vertexShader,
      "attribute vec3 instanceColorEnd;",
      /* glsl */ `

      // Added by OutlineTraceLineMaterial. Line2.computeLineDistances()
      // installs these cumulative arc-length attributes on the geometry.
      attribute float instanceDistanceStart;
      attribute float instanceDistanceEnd;
      varying float vOutlineTraceDistance;`,
      "vertex",
    );

    this.vertexShader = insertAfter(
      this.vertexShader,
      "vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );",
      /* glsl */ `

      // Each generated wide-line segment has vertices belonging either to its
      // start or its end. Interpolating these two cumulative distances gives a
      // continuous distance coordinate across every fragment of the segment.
      vOutlineTraceDistance = ( position.y < 0.5 )
        ? instanceDistanceStart
        : instanceDistanceEnd;`,
      "vertex",
    );

    this.fragmentShader = insertAfter(
      this.fragmentShader,
      "uniform float linewidth;",
      /* glsl */ `

      uniform float traceStart;
      uniform float traceEnd;
      uniform float traceTotalLength;
      varying float vOutlineTraceDistance;`,
      "fragment",
    );

    this.fragmentShader = insertAfter(
      this.fragmentShader,
      "#include <clipping_planes_fragment>",
      /* glsl */ `

      // Convert cumulative model-space arc length to a normalized [0, 1]
      // position around the complete closed outline.
      float outlineTracePosition = clamp(
        vOutlineTraceDistance / max( traceTotalLength, 1e-7 ),
        0.0,
        1.0
      );

      // Feather only the moving cut boundaries by approximately one fragment.
      // This avoids a jagged trace head without introducing the grain produced
      // by alpha-to-coverage or the LineMaterial dashed shader branch.
      float outlineTraceFeather = max( fwidth( outlineTracePosition ), 1e-6 );
      float outlineTraceStartMask = smoothstep(
        traceStart - outlineTraceFeather,
        traceStart,
        outlineTracePosition
      );
      float outlineTraceEndMask = 1.0 - smoothstep(
        traceEnd,
        traceEnd + outlineTraceFeather,
        outlineTracePosition
      );
      float outlineTraceMask = outlineTraceStartMask * outlineTraceEndMask;

      if ( outlineTraceMask <= 0.0 ) discard;
      alpha *= outlineTraceMask;`,
      "fragment",
    );

    // Shader source and uniforms were changed after the LineMaterial
    // constructor initialized its program description.
    this.needsUpdate = true;
  }

  /** Set the visible normalized perimeter interval. */
  setTraceRange(start: number, end: number): this {
    this.uniforms.traceStart.value = start;
    this.uniforms.traceEnd.value = end;
    return this;
  }

  /** Set the model-space length represented by normalized trace position 1. */
  setTraceTotalLength(totalLength: number): this {
    this.uniforms.traceTotalLength.value = Math.max(totalLength, 1e-7);
    return this;
  }
}
