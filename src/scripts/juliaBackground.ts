const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_c;

const int iterations = 200;
const float escapeRadius = 4.0;

bool escapes(vec2 z) {
  for (int i = 0; i < iterations; ++i) {
    z = vec2(
      z.x * z.x - z.y * z.y,
      2.0 * z.x * z.y
    ) + u_c;

    if (dot(z, z) > escapeRadius) {
      return true;
    }
  }

  return false;
}

void main() {
  vec2 z = gl_FragCoord.xy / u_resolution;

  z = z * 2.0 - 1.0;
  z.x *= u_resolution.x / u_resolution.y;

  if (!escapes(z)) {
    gl_FragColor = vec4(
      198.0 / 255.0,
      40.0 / 255.0,
      80.0 / 255.0,
      1.0
    );
  } else {
    discard;
  }
}
`;

const PRESETS: Array<[number, number]> = [
  [-0.8, 0.156],
  [-0.4, 0.6],
  [-0.123, 0.745],
  [-0.729, 0.1889],
  [0.285, 0],
  [-0.75, 0],
  [0.355, 0.355]
];

const FULLSCREEN_TRIANGLE = new Float32Array([
  -1, -1,
   3, -1,
  -1,  3
]);

const CLEAR_COLOR: [number, number, number, number] = [
  0.07,
  0.07,
  0.18,
  1.0
];

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);

  if (!shader) {
    console.error("Could not create WebGL shader.");
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

  if (!compiled) {
    console.error("Shader compilation failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram | null {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertexShader || !fragmentShader) {
    return null;
  }

  const program = gl.createProgram();

  if (!program) {
    console.error("Could not create WebGL program.");
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);

  if (!linked) {
    console.error("Program linking failed:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

function resizeCanvas(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext
) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  const width = Math.floor(canvas.clientWidth * pixelRatio);
  const height = Math.floor(canvas.clientHeight * pixelRatio);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  }
}

function randomPreset(): [number, number] {
  return PRESETS[Math.floor(Math.random() * PRESETS.length)];
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface JuliaBackgroundHandle {
  readonly canvas: HTMLCanvasElement;
  pause(): void;
  resume(): void;
  destroy(): void;
}

const juliaHandles = new WeakMap<HTMLCanvasElement, JuliaBackgroundHandle>();
const activeJuliaHandles = new Set<JuliaBackgroundHandle>();

function initializeCanvas(
  canvas: HTMLCanvasElement,
): JuliaBackgroundHandle | null {
  const existing = juliaHandles.get(canvas);
  if (existing) return existing;

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
  });

  if (!gl) {
    console.warn("WebGL is not available, so the Julia background was disabled.");
    return null;
  }

  const program = createProgram(
    gl,
    VERTEX_SHADER_SOURCE,
    FRAGMENT_SHADER_SOURCE,
  );

  if (!program) return null;

  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(program);
    return null;
  }

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_TRIANGLE, gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, "a_position");
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const cLocation = gl.getUniformLocation(program, "u_c");

  if (positionLocation < 0 || !resolutionLocation || !cLocation) {
    console.error("Could not initialize the Julia background shader interface.");
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    return null;
  }

  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  canvas.dataset.juliaReady = "true";

  const [baseCx, baseCy] = randomPreset();
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let tick = 0;
  let lastFrame = 0;
  let animationFrame = 0;
  let paused = false;
  let destroyed = false;
  let contextLost = false;

  const fps = 15;
  const frameDuration = 1000 / fps;
  const wiggle = 0.02;
  const speed = 0.03;

  function cancelFrame() {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function requestFrame() {
    if (
      destroyed ||
      paused ||
      contextLost ||
      document.hidden ||
      animationFrame !== 0
    ) {
      return;
    }

    animationFrame = requestAnimationFrame(draw);
  }

  function draw(now: number) {
    animationFrame = 0;

    if (destroyed || paused || contextLost || document.hidden) return;

    resizeCanvas(canvas, gl);

    if (now - lastFrame >= frameDuration || reducedMotionQuery.matches) {
      lastFrame = now;

      const cx = baseCx + Math.cos(tick * speed) * wiggle;
      const cy = baseCy + Math.sin(tick * speed) * wiggle;

      gl.clearColor(...CLEAR_COLOR);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform2f(cLocation, cx, cy);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      tick += 1;
    }

    if (!reducedMotionQuery.matches) requestFrame();
  }

  const handleVisibility = () => {
    if (document.hidden) cancelFrame();
    else requestFrame();
  };

  const handleReducedMotionChange = () => {
    cancelFrame();
    requestFrame();
  };

  const handleResize = () => {
    requestFrame();
  };

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    cancelFrame();
  };

  const handleContextRestored = () => {
    /*
     * A restored WebGL1 context invalidates the old program/buffer objects.
     * Recreating the lightweight background is safer than attempting to reuse
     * them. The next startJuliaBackground() call will initialize this canvas.
     */
    handle.destroy();
    delete canvas.dataset.juliaReady;
    queueMicrotask(() => startJuliaBackground());
  };

  const handle: JuliaBackgroundHandle = {
    canvas,

    pause() {
      if (destroyed || paused) return;
      paused = true;
      cancelFrame();
    },

    resume() {
      if (destroyed || !paused) return;
      paused = false;
      lastFrame = 0;
      requestFrame();
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelFrame();

      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotionQuery.removeEventListener("change", handleReducedMotionChange);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);

      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);

      delete canvas.dataset.juliaReady;
      juliaHandles.delete(canvas);
      activeJuliaHandles.delete(handle);
    },
  };

  document.addEventListener("visibilitychange", handleVisibility);
  reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
  window.addEventListener("resize", handleResize);
  canvas.addEventListener("webglcontextlost", handleContextLost);
  canvas.addEventListener("webglcontextrestored", handleContextRestored);

  juliaHandles.set(canvas, handle);
  activeJuliaHandles.add(handle);
  requestFrame();

  return handle;
}

export function startJuliaBackground(): JuliaBackgroundHandle[] {
  const canvases = document.querySelectorAll<HTMLCanvasElement>(
    "canvas[data-julia-background]",
  );

  return [...canvases]
    .map(initializeCanvas)
    .filter((handle): handle is JuliaBackgroundHandle => handle !== null);
}

export function stopJuliaBackground(): void {
  for (const handle of [...activeJuliaHandles]) {
    handle.destroy();
  }
}

let juliaLifecycleInstalled = false;

/** Install the Astro navigation hooks exactly once for the whole application. */
export function installJuliaBackgroundLifecycle(): void {
  startJuliaBackground();

  if (juliaLifecycleInstalled) return;
  juliaLifecycleInstalled = true;

  document.addEventListener("astro:page-load", () => {
    startJuliaBackground();
  });

  document.addEventListener("astro:before-swap", () => {
    stopJuliaBackground();
  });
}
