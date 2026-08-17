import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshNormalMaterial,
  SphereGeometry,
  TorusGeometry,
  type Material,
  type Object3D,
} from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import {
  HUES,
  MathObject3D,
  createMathScene2D,
  createMathScene3D,
  createVector2D,
} from "../math-graphics";

const firstCanvas = document.querySelector<HTMLCanvasElement>(
  "#mug-to-donut-scene",
);
const secondCanvas = document.querySelector<HTMLCanvasElement>(
  "#cow-to-sphere-scene",
);

if (!firstCanvas || !secondCanvas) {
  throw new Error(
    "Batch 1 3D test requires both topology lesson canvases to be present.",
  );
}

function makeLabel(text: string, accent: string): {
  element: HTMLDivElement;
  object: CSS2DObject;
} {
  const element = document.createElement("div");
  element.textContent = text;
  Object.assign(element.style, {
    padding: "0.28rem 0.5rem",
    borderRadius: "0.55rem",
    border: `1px solid ${accent}55`,
    background: "rgba(14, 10, 28, 0.78)",
    color: accent,
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: "12px",
    fontWeight: "750",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    textShadow: "0 1px 4px rgba(0,0,0,0.72)",
  });

  const object = new CSS2DObject(element);
  object.center.set(0.5, 1);
  return { element, object };
}

function disposeMaterial(material: Material | Material[]): void {
  if (Array.isArray(material)) {
    for (const item of material) item.dispose();
  } else {
    material.dispose();
  }
}

class TransformDiagnostic3D extends MathObject3D {
  private readonly boxGeometry = new BoxGeometry(1.6, 1.6, 1.6, 2, 2, 2);
  private readonly sphereGeometry = new SphereGeometry(0.32, 28, 18);
  private readonly boxMaterial = new MeshNormalMaterial({ flatShading: false });
  private readonly cyanMaterial = new MeshBasicMaterial({ color: HUES.cyan.base });
  private readonly magentaMaterial = new MeshBasicMaterial({
    color: HUES.magenta.base,
  });
  private readonly goldMaterial = new MeshBasicMaterial({ color: HUES.gold.base });

  private readonly box = new Mesh(this.boxGeometry, this.boxMaterial);
  private readonly satelliteA = new Mesh(this.sphereGeometry, this.cyanMaterial);
  private readonly satelliteB = new Mesh(this.sphereGeometry, this.magentaMaterial);
  private readonly satelliteC = new Mesh(this.sphereGeometry, this.goldMaterial);

  private readonly label = makeLabel(
    "MathObject3D · click the object",
    HUES.cyan.light,
  );
  private pulse = 0;

  constructor() {
    super();
    this.name = "batch-1-transform-diagnostic";

    this.box.name = `${this.name}:box`;
    this.satelliteA.name = `${this.name}:satellite-a`;
    this.satelliteB.name = `${this.name}:satellite-b`;
    this.satelliteC.name = `${this.name}:satellite-c`;

    this.satelliteA.position.set(1.55, 0, 0);
    this.satelliteB.position.set(0, 1.55, 0);
    this.satelliteC.position.set(0, 0, 1.55);

    this.label.object.position.set(0, 1.45, 0);

    this.add(
      this.box,
      this.satelliteA,
      this.satelliteB,
      this.satelliteC,
      this.label.object,
    );
  }

  getPickTargets(): Object3D[] {
    return [this.box, this.satelliteA, this.satelliteB, this.satelliteC];
  }

  setStatus(text: string): void {
    this.label.element.textContent = text;
  }

  triggerPulse(): void {
    this.pulse = 1;
  }

  startDiagnosticMotion(): () => void {
    return this.onFrame(({ time, deltaTime }) => {
      const seconds = time / 1000;
      this.pulse = Math.max(0, this.pulse - deltaTime * 2.8);

      this
        .moveTo(0, Math.sin(seconds * 1.2) * 0.18, 0)
        .setRotation(seconds * 0.25, seconds * 0.52, seconds * 0.16)
        .resizeTo(1 + this.pulse * 0.12);
    });
  }

  dispose(): void {
    this.boxGeometry.dispose();
    this.sphereGeometry.dispose();
    disposeMaterial(this.boxMaterial);
    disposeMaterial(this.cyanMaterial);
    disposeMaterial(this.magentaMaterial);
    disposeMaterial(this.goldMaterial);
    this.label.element.remove();
  }
}

class PerspectiveDiagnostic3D extends MathObject3D {
  private readonly torusGeometry = new TorusGeometry(1.35, 0.34, 28, 96);
  private readonly coreGeometry = new IcosahedronGeometry(0.62, 2);
  private readonly markerGeometry = new SphereGeometry(0.1, 18, 12);

  private readonly torusMaterial = new MeshNormalMaterial();
  private readonly coreMaterial = new MeshBasicMaterial({
    color: HUES.purple.base,
    wireframe: true,
  });
  private readonly markerMaterial = new MeshBasicMaterial({
    color: HUES.gold.light,
  });

  private readonly torus = new Mesh(this.torusGeometry, this.torusMaterial);
  private readonly core = new Mesh(this.coreGeometry, this.coreMaterial);
  private readonly marker = new Mesh(this.markerGeometry, this.markerMaterial);

  private readonly axesGeometry = new BufferGeometry();
  private readonly axesMaterial = new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.62,
  });
  private readonly axes: LineSegments;

  private readonly label = makeLabel(
    "Perspective camera · projected point ✓",
    HUES.gold.light,
  );

  constructor() {
    super();
    this.name = "batch-1-perspective-diagnostic";

    this.axesGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(
        [
          0, 0, 0, 2.4, 0, 0,
          0, 0, 0, 0, 2.4, 0,
          0, 0, 0, 0, 0, 2.4,
        ],
        3,
      ),
    );
    this.axesGeometry.setAttribute(
      "color",
      new Float32BufferAttribute(
        [
          1, 0.35, 0.45, 1, 0.35, 0.45,
          0.35, 1, 0.72, 0.35, 1, 0.72,
          0.4, 0.72, 1, 0.4, 0.72, 1,
        ],
        3,
      ),
    );

    this.axes = new LineSegments(this.axesGeometry, this.axesMaterial);
    this.marker.position.set(1.7, 0, 0);
    this.label.object.position.set(0, 1.9, 0);

    this.add(
      this.torus,
      this.core,
      this.marker,
      this.axes,
      this.label.object,
    );
  }

  setStatus(text: string): void {
    this.label.element.textContent = text;
  }

  dispose(): void {
    this.torusGeometry.dispose();
    this.coreGeometry.dispose();
    this.markerGeometry.dispose();
    this.axesGeometry.dispose();
    disposeMaterial(this.torusMaterial);
    disposeMaterial(this.coreMaterial);
    disposeMaterial(this.markerMaterial);
    disposeMaterial(this.axesMaterial);
    this.label.element.remove();
  }
}

const transformScene = createMathScene3D(firstCanvas, {
  cameraPosition: [4.8, 3.5, 6.8],
  target: [0, 0, 0],
  fovDegrees: 42,
  background: null,
});

const transformObject = new TransformDiagnostic3D();
transformScene.add(transformObject);

/* Exercise every MathObject3D transform method before resetting the object. */
transformObject
  .moveTo(0.25, -0.1, 0.2)
  .moveBy(-0.25, 0.1, -0.2)
  .setScale(1.05, 0.95, 1.1)
  .resizeBy(0.9)
  .resizeTo(1)
  .setRotation(0.08, 0.12, 0.04)
  .rotateBy(-0.08, -0.12, -0.04);

console.assert(
  transformObject.position.length() < 1e-10,
  "Batch 1: MathObject3D translation methods failed.",
);
console.assert(
  Math.abs(transformObject.scale.x - 1) < 1e-10 &&
    Math.abs(transformObject.scale.y - 1) < 1e-10 &&
    Math.abs(transformObject.scale.z - 1) < 1e-10,
  "Batch 1: MathObject3D scaling methods failed.",
);

/* This deliberately uses MathObject3D.onFrame() through a public method,
 * verifying that MathScene3D correctly binds the shared frame registrar. */
const stopTransformAnimation = transformObject.startDiagnosticMotion();

const handleTransformPointer = (event: PointerEvent): void => {
  const hits = transformScene.raycastFromClient(
    event.clientX,
    event.clientY,
    transformObject.getPickTargets(),
    true,
  );

  if (hits.length === 0) return;

  transformObject.triggerPulse();
  transformObject.setStatus("Perspective raycast hit ✓");
};

firstCanvas.addEventListener("pointerdown", handleTransformPointer);

const perspectiveScene = createMathScene3D(secondCanvas, {
  cameraPosition: [5.6, 2.8, 5.6],
  target: [0, 0, 0],
  fovDegrees: 38,
  background: null,
});

const perspectiveObject = new PerspectiveDiagnostic3D();
perspectiveScene.add(perspectiveObject);

const stopPerspectiveAnimation = perspectiveScene.onFrame(({ time }) => {
  const seconds = time / 1000;
  const radius = 7.2;
  const angle = seconds * 0.23;

  perspectiveScene.setCamera({
    position: [
      radius * Math.cos(angle),
      2.7 + 0.55 * Math.sin(seconds * 0.37),
      radius * Math.sin(angle),
    ],
    target: [0, 0, 0],
  });

  perspectiveObject.setRotation(
    seconds * 0.11,
    -seconds * 0.18,
    seconds * 0.07,
  );
});

function runTwoDCompatibilitySmokeTest(): boolean {
  const shell = document.createElement("div");
  const canvas = document.createElement("canvas");

  Object.assign(shell.style, {
    position: "fixed",
    left: "-1000px",
    top: "0",
    width: "64px",
    height: "64px",
    opacity: "0",
    pointerEvents: "none",
  });
  Object.assign(canvas.style, {
    width: "100%",
    height: "100%",
  });

  shell.appendChild(canvas);
  document.body.appendChild(shell);

  try {
    const scene = createMathScene2D(canvas, { viewHeight: 4, background: null });
    const vector = createVector2D({
      start: [0, 0],
      end: [1, 1],
      style: { color: HUES.cyan.base },
    });

    scene.add(vector);
    vector.moveTo(-0.5, -0.5).setEnd([1, 0.75]).hide().show();
    scene.destroy();
    return true;
  } catch (error) {
    console.error("Batch 1: 2D compatibility smoke test failed.", error);
    return false;
  } finally {
    shell.remove();
  }
}

function runAutomaticAssertions(): boolean {
  transformScene.threeScene.updateMatrixWorld(true);
  perspectiveScene.threeScene.updateMatrixWorld(true);

  const [clientX, clientY] = transformScene.worldToClient([0, 0, 0]);
  const rectangle = firstCanvas.getBoundingClientRect();
  const projectionIsFinite = Number.isFinite(clientX) && Number.isFinite(clientY);
  const projectionIsInside =
    clientX >= rectangle.left &&
      clientX <= rectangle.right &&
      clientY >= rectangle.top &&
      clientY <= rectangle.bottom;

  const centerHits = transformScene.raycastFromClient(
    clientX,
    clientY,
    transformObject.getPickTargets(),
    true,
  );

  const cameraState = perspectiveScene.getCameraState();
  const cameraStateIsValid =
    cameraState.position.every(Number.isFinite) &&
      cameraState.target.every(Number.isFinite) &&
      cameraState.fovDegrees > 0 &&
      cameraState.near > 0 &&
      cameraState.far > cameraState.near;
  const twoDCompatibilityPassed = runTwoDCompatibilitySmokeTest();

  console.assert(
    projectionIsFinite && projectionIsInside,
    "Batch 1: worldToClient() failed its projection smoke test.",
  );
  console.assert(
    centerHits.length > 0,
    "Batch 1: raycastFromClient() failed its center-object smoke test.",
  );
  console.assert(
    cameraStateIsValid,
    "Batch 1: camera state failed validation.",
  );
  console.assert(
    twoDCompatibilityPassed,
    "Batch 1: MathObject2D/MathScene2D compatibility regression detected.",
  );

  const passed =
    projectionIsFinite &&
      projectionIsInside &&
      centerHits.length > 0 &&
      cameraStateIsValid &&
      twoDCompatibilityPassed;

  transformObject.setStatus(
    passed
      ? "Batch 1 core checks passed ✓ · click me"
      : "Batch 1 automatic check failed — see console",
  );
  perspectiveObject.setStatus(
    passed
      ? "Perspective + CSS2D + resize ready ✓"
      : "Batch 1 automatic check failed — see console",
  );

  return passed;
}

/* Wait until the first browser frame so projection/raycast matrices are settled. */
requestAnimationFrame(() => {
  runAutomaticAssertions();
});

Object.assign(window, {
  math3DBatch1: {
    transformScene,
    perspectiveScene,
    transformObject,
    perspectiveObject,
    runTests: runAutomaticAssertions,
  },
});

const destroy = (): void => {
  stopTransformAnimation();
  stopPerspectiveAnimation();
  firstCanvas.removeEventListener("pointerdown", handleTransformPointer);
  transformScene.destroy();
  perspectiveScene.destroy();
};

window.addEventListener("pagehide", destroy, { once: true });
document.addEventListener("astro:before-swap", destroy, { once: true });
