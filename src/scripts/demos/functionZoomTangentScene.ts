import {
  HUES,
  createCoordinatePlane2D,
  createFunctionGraph2D,
  createMathScene2D,
  createPointMarker2D,
  createSegment2D,
  type MathScene2D,
  type PointMarker2D,
  type Segment2D,
  type Vec2Tuple,
} from "../math-graphics";

const canvas =
  document.querySelector<HTMLCanvasElement>(
    "#function-zoom-tangent-scene",
  );

if (!canvas) {
  throw new Error(
    "The function zoom / tangent demonstration canvas could not be found.",
  );
}

/* -------------------------------------------------------------------------- */
/* Function                                                                   */
/* -------------------------------------------------------------------------- */

const functionDefinition = (
  x: number,
): number =>
  0.12 * x * x * x -
    0.8 * x +
    0.35;

const derivativeDefinition = (
  x: number,
): number =>
  0.36 * x * x -
    0.8;

/* -------------------------------------------------------------------------- */
/* Visual / interaction constants                                             */
/* -------------------------------------------------------------------------- */

const BASE_UNIT_SIZE_PIXELS = 38;

const GRAPH_WIDTH_PIXELS = 3.2;
const TANGENT_WIDTH_PIXELS =
  GRAPH_WIDTH_PIXELS;

const MAGNIFIER_RADIUS_PIXELS = 138;
const MAGNIFIER_BORDER_PIXELS = 3;

const MIN_MAGNIFICATION = 1;
/*
 * 40x is high enough to make the local straight-line behavior extremely
 * pronounced while still leaving enough numerical headroom for stable
 * interaction.
 */
const MAX_MAGNIFICATION = 40;

/*
 * Wheel changes a target zoom exponentially. The actual zoom approaches that
 * target through the frame loop, so both wheel directions remain smooth.
 */
const WHEEL_ZOOM_SENSITIVITY = 0.0017;
const ZOOM_RESPONSE = 11;

const GRAPH_HIT_RADIUS_PIXELS = 16;

const TANGENT_SHRINK_SECONDS = 0.15;
const TANGENT_GROW_SECONDS = 0.20;

type InteractionMode =
  | "magnifier"
  | "tangent";

/* -------------------------------------------------------------------------- */
/* Small utilities                                                            */
/* -------------------------------------------------------------------------- */

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}

function clamp01(
  value: number,
): number {
  return clamp(
    value,
    0,
    1,
  );
}

function formatNumber(
  value: number,
): string {
  const rounded =
    Math.abs(value) <
      1e-10
      ? 0
      : value;

  return rounded.toFixed(3);
}

/*
 * Walk upward until a non-transparent CSS background is found. The magnified
 * WebGL scene must cover the ordinary scene inside the circular lens rather
 * than alpha-compositing a second graph on top of it.
 */
function effectiveBackgroundColor(
  element: HTMLElement,
): string {
  let current:
    HTMLElement | null =
    element;

  while (current) {
    const color =
      window
        .getComputedStyle(
          current,
        )
        .backgroundColor;

    if (
      color &&
	color !==
          "transparent" &&
	color !==
          "rgba(0, 0, 0, 0)"
    ) {
      return color.replace(
        /^rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)$/,
        "rgb($1,$2,$3)",
      );
    }

    current =
      current.parentElement;
  }

  return "rgb(15, 12, 27)";
}

/* -------------------------------------------------------------------------- */
/* Main scene                                                                 */
/* -------------------------------------------------------------------------- */

const scene =
  createMathScene2D(
    canvas,
    {
      unitSizePixels:
        BASE_UNIT_SIZE_PIXELS,
      center: [
        0,
        0,
      ],
      background: null,
    },
  );

const coordinatePlane =
  createCoordinatePlane2D({
    name:
      "function-zoom-tangent-plane",
    scene,
    edgePaddingPixels: 20,
    gridStep: 1,
    integerStep: 1,

    gridColor:
      0x777087,
    gridOpacity:
      0.2,

    axisColor:
      0xeee9ff,
    axisOpacity:
      0.9,
    axisWidth:
      2.1,

    tickColor:
      0xded7f2,
    tickOpacity:
      0.8,
    tickLength:
      0.12,

    labelColor:
      "rgba(239, 234, 255, 0.78)",
    labelFontSizePx:
      12,
  });

const graph =
  createFunctionGraph2D({
    name:
      "function-zoom-tangent-graph",
    equation:
      functionDefinition,
    scene,

    samplesPerUnit:
      100,
    minimumSegments:
      600,
    maximumSegments:
      3200,

    style: {
      color:
        HUES.cyan.light,
      width:
        GRAPH_WIDTH_PIXELS,
      opacity:
        0.98,
    },
  });

/*
 * Segment2D is deliberately used instead of Vector2D. Segment2D's width is a
 * CSS-pixel line width, so a 3.2 px tangent truly matches the 3.2 px graph.
 */
const tangentLine =
  createSegment2D({
    name:
      "function-zoom-tangent-line",
    start: [
      0,
      0,
    ],
    end: [
      0,
      0,
    ],
    style: {
      color:
        HUES.gold.light,
      opacity:
        0.96,
      width:
        TANGENT_WIDTH_PIXELS,
    },
  });

tangentLine.hide();

const tangentPoint =
  createPointMarker2D({
    name:
      "function-zoom-tangent-point",
    position: [
      0,
      0,
    ],
    radius:
      0.11,
    fill:
      HUES.gold.light,
    outline:
      0x2a1f08,
    outlineWidth:
      0.03,
  });

tangentPoint.hide();

scene.add(
  coordinatePlane,
  graph,
  tangentLine,
  tangentPoint,
);

/* -------------------------------------------------------------------------- */
/* Magnifier DOM                                                              */
/* -------------------------------------------------------------------------- */

const host =
  canvas.parentElement;

if (!host) {
  throw new Error(
    "The function zoom / tangent canvas requires a parent element.",
  );
}

const backgroundColor =
  effectiveBackgroundColor(
    host,
  );

/*
 * A second WebGL scene occupies the same rectangle as the original canvas,
 * but is clipped by CSS to the circular pointer lens.
 *
 * IMPORTANT:
 * The magnifier camera is NOT centered on the pointer world point. Instead,
 * its center is solved so that the pointer world point projects back to the
 * pointer's exact SCREEN coordinate. This is what makes the glass and cursor
 * coincide even when the pointer is nowhere near the canvas center.
 */
const magnifierLayer =
  document.createElement(
    "div",
  );

magnifierLayer.className =
  "function-local-magnifier-layer";

Object.assign(
  magnifierLayer.style,
  {
    /*
     * Fixed viewport positioning removes every ambiguity introduced by the
     * canvas wrapper's padding, borders, captions, or positioned children.
     * The layer is explicitly synchronized to getBoundingClientRect().
     */
    position:
      "fixed",
    left:
      "0px",
    top:
      "0px",
    width:
      "0px",
    height:
      "0px",
    overflow:
      "hidden",
    pointerEvents:
      "none",
    zIndex:
      "2147483000",
    clipPath:
      "circle(0px at 0px 0px)",
    opacity:
      "0",
  },
);

const magnifierCanvas =
  document.createElement(
    "canvas",
  );

Object.assign(
  magnifierCanvas.style,
  {
    display:
      "block",
    width:
      "100%",
    height:
      "100%",
  },
);

magnifierLayer.appendChild(
  magnifierCanvas,
);

document.body.appendChild(
  magnifierLayer,
);

/*
 * This is the actual mouse cursor in magnifier mode: a hollow circle with a
 * visible contour. There is deliberately no browser zoom-in icon underneath.
 */
const lensCursor =
  document.createElement(
    "div",
  );

Object.assign(
  lensCursor.style,
  {
    position:
      "fixed",

    left:
      "0px",

    top:
      "0px",

    width:
      `${MAGNIFIER_RADIUS_PIXELS * 2}px`,

    height:
      `${MAGNIFIER_RADIUS_PIXELS * 2}px`,

    boxSizing:
      "border-box",

    border:
      `${MAGNIFIER_BORDER_PIXELS}px solid rgba(238, 233, 255, 0.94)`,

    borderRadius:
      "50%",

    background:
      "transparent",

    boxShadow:
      "0 0 0 1px rgba(22, 17, 37, 0.82), 0 5px 16px rgba(0, 0, 0, 0.22)",

    pointerEvents:
      "none",

    zIndex:
      "2147483002",

    opacity:
      "0",

    /*
     * translate3d is updated so the geometric center of the hollow ring is
     * exactly the pointer location.
     */
    transform:
      "translate3d(-9999px, -9999px, 0)",
  },
);

document.body.appendChild(
  lensCursor,
);

/*
 * A small plus marker indicates the exact center of the magnifier. Since it is
 * also viewport-fixed, it stays perfectly aligned with the hollow circular
 * cursor and therefore clearly shows which point is being locally enlarged.
 */
const lensCenterMarker =
  document.createElement(
    "div",
  );

Object.assign(
  lensCenterMarker.style,
  {
    position:
      "fixed",
    left:
      "0px",
    top:
      "0px",
    width:
      "0px",
    height:
      "0px",
    pointerEvents:
      "none",
    zIndex:
      "2147483003",
    opacity:
      "0",
    transform:
      "translate3d(-9999px, -9999px, 0)",
  },
);

const lensCenterMarkerHorizontal =
  document.createElement(
    "div",
  );

Object.assign(
  lensCenterMarkerHorizontal.style,
  {
    position:
      "absolute",
    left:
      "-7px",
    top:
      "-1.5px",
    width:
      "14px",
    height:
      "3px",
    borderRadius:
      "999px",
    background:
      "rgba(238, 233, 255, 0.96)",
    boxShadow:
      "0 0 0 1px rgba(22, 17, 37, 0.78)",
  },
);

const lensCenterMarkerVertical =
  document.createElement(
    "div",
  );

Object.assign(
  lensCenterMarkerVertical.style,
  {
    position:
      "absolute",
    left:
      "-1.5px",
    top:
      "-7px",
    width:
      "3px",
    height:
      "14px",
    borderRadius:
      "999px",
    background:
      "rgba(238, 233, 255, 0.96)",
    boxShadow:
      "0 0 0 1px rgba(22, 17, 37, 0.78)",
  },
);

lensCenterMarker.append(
  lensCenterMarkerHorizontal,
  lensCenterMarkerVertical,
);

document.body.appendChild(
  lensCenterMarker,
);

/*
 * Lock the magnified render layer to the canvas's actual viewport rectangle.
 * The contour itself is viewport-fixed as well, so contour and clip share the
 * same coordinate system and cannot drift apart.
 */
function syncMagnifierLayerGeometry(): void {
  const rectangle =
    canvas.getBoundingClientRect();

  magnifierLayer.style.left =
    `${rectangle.left}px`;

  magnifierLayer.style.top =
    `${rectangle.top}px`;

  magnifierLayer.style.width =
    `${rectangle.width}px`;

  magnifierLayer.style.height =
    `${rectangle.height}px`;
}

syncMagnifierLayerGeometry();

/* -------------------------------------------------------------------------- */
/* Magnified rendering scene                                                  */
/* -------------------------------------------------------------------------- */

const magnifierScene =
  createMathScene2D(
    magnifierCanvas,
    {
      unitSizePixels:
        BASE_UNIT_SIZE_PIXELS,
      center: [
        0,
        0,
      ],

      /*
       * Unlike the ordinary scene, the lens must be opaque inside its clip or
       * the unzoomed graph would remain visible underneath the zoomed graph.
       */
      background:
        backgroundColor,
    },
  );

/*
 * DO NOT create a scene-responsive CoordinatePlane2D in the lens.
 *
 * The previous implementation did exactly that and then called setView()
 * continuously. CoordinatePlane2D rebuilds its CSS labels in response to every
 * view change, which is what led to the reported
 *
 *   THREE.Object3D.add ... undefined
 *
 * failure during rebuildVisiblePlane().
 *
 * Instead, reproduce the plane's WebGL grid/axes with stable Segment2D objects.
 * This is also cheaper: no DOM labels are destroyed/recreated on every wheel
 * frame.
 */
const baseBounds =
  scene.getViewBounds(
    -120,
  );

const magnifierGridObjects:
  Segment2D[] =
  [];

const gridLeft =
  Math.floor(
    baseBounds.left,
  ) -
    2;

const gridRight =
  Math.ceil(
    baseBounds.right,
  ) +
    2;

const gridBottom =
  Math.floor(
    baseBounds.bottom,
  ) -
    2;

const gridTop =
  Math.ceil(
    baseBounds.top,
  ) +
    2;

for (
  let x =
    Math.ceil(
      gridLeft,
    );
  x <=
    gridRight;
  x += 1
) {
  if (
    Math.abs(x) <
      1e-10
  ) {
    continue;
  }

  const line =
    createSegment2D({
      name:
        `function-magnifier-grid-x-${x}`,
      start: [
        x,
        gridBottom,
      ],
      end: [
        x,
        gridTop,
      ],
      style: {
        color:
          0x777087,
        opacity:
          0.2,
        width:
          1,
      },
    });

  magnifierGridObjects.push(
    line,
  );
}

for (
  let y =
    Math.ceil(
      gridBottom,
    );
  y <=
    gridTop;
  y += 1
) {
  if (
    Math.abs(y) <
      1e-10
  ) {
    continue;
  }

  const line =
    createSegment2D({
      name:
        `function-magnifier-grid-y-${y}`,
      start: [
        gridLeft,
        y,
      ],
      end: [
        gridRight,
        y,
      ],
      style: {
        color:
          0x777087,
        opacity:
          0.2,
        width:
          1,
      },
    });

  magnifierGridObjects.push(
    line,
  );
}

const magnifierXAxis =
  createSegment2D({
    name:
      "function-magnifier-x-axis",
    start: [
      gridLeft,
      0,
    ],
    end: [
      gridRight,
      0,
    ],
    style: {
      color:
        0xeee9ff,
      opacity:
        0.9,
      width:
        2.1,
    },
  });

const magnifierYAxis =
  createSegment2D({
    name:
      "function-magnifier-y-axis",
    start: [
      0,
      gridBottom,
    ],
    end: [
      0,
      gridTop,
    ],
    style: {
      color:
        0xeee9ff,
      opacity:
        0.9,
      width:
        2.1,
    },
  });

/*
 * Fixed-domain graph: it does not subscribe to lens-camera view changes, so
 * wheel zooming only changes the camera and never causes graph reconstruction.
 */
const magnifierGraph =
  createFunctionGraph2D({
    name:
      "function-zoom-tangent-graph-inside-lens",

    equation:
      functionDefinition,

    domain: [
      gridLeft,
      gridRight,
    ],

    segments:
      7200,

    style: {
      color:
        HUES.cyan.light,
      width:
        GRAPH_WIDTH_PIXELS,
      opacity:
        0.98,
    },
  });

const magnifierTangentLine =
  createSegment2D({
    name:
      "function-zoom-tangent-line-inside-lens",

    start: [
      0,
      0,
    ],

    end: [
      0,
      0,
    ],

    style: {
      color:
        HUES.gold.light,
      opacity:
        0.96,
      width:
        TANGENT_WIDTH_PIXELS,
    },
  });

magnifierTangentLine.hide();

magnifierScene.add(
  ...magnifierGridObjects,
  magnifierXAxis,
  magnifierYAxis,
  magnifierGraph,
  magnifierTangentLine,
);

const magnifierGeometryObserver =
  new ResizeObserver(
    () => {
      syncMagnifierLayerGeometry();

      if (
        pointerInside &&
          interactionMode ===
            "magnifier"
      ) {
        updatePointer(
          pointerClientX,
          pointerClientY,
        );

        updateMagnifierCamera();
      }
    },
  );

magnifierGeometryObserver.observe(
  canvas,
);

const syncGeometryFromViewport =
  (): void => {
    syncMagnifierLayerGeometry();

    if (
      pointerInside &&
	interactionMode ===
          "magnifier"
    ) {
      updatePointer(
        pointerClientX,
        pointerClientY,
      );

      updateMagnifierCamera();
    }
  };

window.addEventListener(
  "scroll",
  syncGeometryFromViewport,
  {
    passive: true,
    capture: true,
  },
);

window.addEventListener(
  "resize",
  syncGeometryFromViewport,
  {
    passive: true,
  },
);

/* -------------------------------------------------------------------------- */
/* Mode controls                                                              */
/* -------------------------------------------------------------------------- */

let interactionMode:
  InteractionMode =
  "magnifier";

const controls =
  document.createElement(
    "div",
  );

Object.assign(
  controls.style,
  {
    position:
      "absolute",
    top:
      "0.8rem",
    right:
      "0.8rem",
    zIndex:
      "20",
    display:
      "flex",
    gap:
      "0.45rem",
    pointerEvents:
      "auto",
  },
);

function makeModeButton(
  text: string,
): HTMLButtonElement {
  const button =
    document.createElement(
      "button",
    );

  button.type =
    "button";

  button.textContent =
    text;

  Object.assign(
    button.style,
    {
      appearance:
        "none",
      border:
        "1px solid rgba(198, 180, 255, 0.22)",
      borderRadius:
        "0.55rem",
      padding:
        "0.4rem 0.7rem",
      background:
        "rgba(17, 14, 30, 0.88)",
      color:
        "rgba(239, 234, 255, 0.96)",
      fontSize:
        "0.84rem",
      fontWeight:
        "700",
      cursor:
        "pointer",
      boxShadow:
        "0 5px 14px rgba(0, 0, 0, 0.16)",
    },
  );

  return button;
}

const magnifierButton =
  makeModeButton(
    "Magnifier",
  );

const tangentButton =
  makeModeButton(
    "Tangent",
  );

controls.append(
  magnifierButton,
  tangentButton,
);

host.appendChild(
  controls,
);

const readout =
  document.createElement(
    "div",
  );

Object.assign(
  readout.style,
  {
    position:
      "absolute",
    top:
      "3.55rem",
    right:
      "0.8rem",
    zIndex:
      "20",
    maxWidth:
      "19rem",
    padding:
      "0.42rem 0.62rem",
    border:
      "1px solid rgba(198, 180, 255, 0.18)",
    borderRadius:
      "0.55rem",
    background:
      "rgba(17, 14, 30, 0.86)",
    color:
      "rgba(239, 234, 255, 0.92)",
    fontSize:
      "0.8rem",
    fontWeight:
      "650",
    lineHeight:
      "1.35",
    pointerEvents:
      "none",
  },
);

host.appendChild(
  readout,
);

/* -------------------------------------------------------------------------- */
/* Pointer / magnifier state                                                  */
/* -------------------------------------------------------------------------- */

let pointerInside =
  false;

let pointerClientX =
  0;

let pointerClientY =
  0;

let pointerLocalX =
  0;

let pointerLocalY =
  0;

let pointerWorldPoint:
  Vec2Tuple =
  [
    0,
    0,
  ];

let targetMagnification =
  1;

let currentMagnification =
  1;

function updatePointer(
  clientX: number,
  clientY: number,
): void {
  pointerClientX =
    clientX;

  pointerClientY =
    clientY;

  /*
   * Re-sync first because scrolling or responsive layout can move the canvas
   * without changing the pointer's viewport coordinates.
   */
  syncMagnifierLayerGeometry();

  const rectangle =
    canvas.getBoundingClientRect();

  pointerLocalX =
    clientX -
      rectangle.left;

  pointerLocalY =
    clientY -
      rectangle.top;

  pointerWorldPoint =
    scene.clientToWorld(
      clientX,
      clientY,
    );

  /*
   * lensCursor is position: fixed. Its center therefore uses the pointer's
   * raw client coordinates directly. No parent-relative subtraction is
   * involved anywhere.
   */
  lensCursor.style.transform =
    `translate3d(${
      clientX -
	MAGNIFIER_RADIUS_PIXELS
    }px, ${
      clientY -
	MAGNIFIER_RADIUS_PIXELS
    }px, 0)`;

  lensCenterMarker.style.transform =
    `translate3d(${clientX}px, ${clientY}px, 0)`;

  /*
   * The magnified render layer is fixed exactly over the canvas, so its
   * clip-path correctly uses canvas-local coordinates.
   */
  magnifierLayer.style.clipPath =
    `circle(${MAGNIFIER_RADIUS_PIXELS}px at ${pointerLocalX}px ${pointerLocalY}px)`;
}

function showMagnifierCursor(): void {
  if (
    interactionMode !==
      "magnifier" ||
      !pointerInside
  ) {
    return;
  }

  lensCursor.style.opacity =
    "1";

  lensCenterMarker.style.opacity =
    "1";

  canvas.style.cursor =
    "none";
}

function hideMagnifierCursor(): void {
  lensCursor.style.opacity =
    "0";

  lensCenterMarker.style.opacity =
    "0";
}

/*
 * For camera scale S and screen coordinate (px, py):
 *
 *   worldX(px) = centerX + (px - W/2) / S
 *   worldY(py) = centerY + (H/2 - py) / S
 *
 * Solve for center so the world point under the ordinary pointer stays under
 * that EXACT SAME pixel in the magnified scene.
 */
function updateMagnifierCamera(): void {
  const rectangle =
    magnifierCanvas
      .getBoundingClientRect();

  if (
    rectangle.width <= 0 ||
      rectangle.height <= 0
  ) {
    return;
  }

  const scale =
    BASE_UNIT_SIZE_PIXELS *
      currentMagnification;

  const centerX =
    pointerWorldPoint[0] -
      (
	pointerLocalX -
	  rectangle.width / 2
      ) /
	scale;

  const centerY =
    pointerWorldPoint[1] +
      (
	pointerLocalY -
	  rectangle.height / 2
      ) /
	scale;

  magnifierScene.setView({
    unitSizePixels:
      scale,

    center: [
      centerX,
      centerY,
    ],
  });

  /*
   * At magnification 1 the ordinary scene is already exactly what should be
   * visible. Fade the overlay in only as real magnification develops. This
   * also keeps the main CoordinatePlane2D's numeric CSS labels untouched at
   * the zero-magnification state.
   */
  magnifierLayer.style.opacity =
    String(
      clamp01(
        (
          currentMagnification -
            1
        ) /
          0.12,
      ),
    );

  syncMagnifiedTangent();
}

function advanceMagnification(
  deltaTime: number,
): void {
  if (
    interactionMode !==
      "magnifier" ||
      !pointerInside
  ) {
    return;
  }

  const response =
    1 -
      Math.exp(
	-ZOOM_RESPONSE *
	  deltaTime,
      );

  currentMagnification +=
    (
      targetMagnification -
	currentMagnification
    ) *
      response;

  if (
    Math.abs(
      targetMagnification -
	currentMagnification,
    ) <
      1e-4
  ) {
    currentMagnification =
      targetMagnification;
  }

  updateMagnifierCamera();
}

/* -------------------------------------------------------------------------- */
/* Tangent state                                                              */
/* -------------------------------------------------------------------------- */

let displayedTangentX:
  number | null =
  null;

let requestedTangentX:
  number | null =
  null;

let tangentScale =
  0;

let tangentPhase:
  | "idle"
  | "shrinking"
  | "growing" =
  "idle";

function tangentEndpointsForScene(
  targetScene:
    MathScene2D,
  x: number,
  scale: number,
): readonly [
  Vec2Tuple,
  Vec2Tuple,
] {
  const y =
    functionDefinition(
      x,
    );

  const slope =
    derivativeDefinition(
      x,
    );

  /*
   * Overscan the target camera bounds. This is what prevents the tangent from
   * becoming truncated when the magnifier moves or zooms after the tangent was
   * originally created.
   */
  const bounds =
    targetScene.getViewBounds(
      -80,
    );

  const startX =
    bounds.left;

  const endX =
    bounds.right;

  return [
    [
      x +
        (
          startX -
            x
        ) *
          scale,

      y +
        slope *
          (
            startX -
              x
          ) *
          scale,
    ],

    [
      x +
        (
          endX -
            x
        ) *
          scale,

      y +
        slope *
          (
            endX -
              x
          ) *
          scale,
    ],
  ];
}

function syncMainTangent(): void {
  if (
    displayedTangentX ===
      null ||
      tangentScale <=
	1e-4
  ) {
    tangentLine.hide();
    tangentPoint.hide();
    return;
  }

  const [
    start,
    end,
  ] =
    tangentEndpointsForScene(
      scene,
      displayedTangentX,
      tangentScale,
    );

  tangentLine
    .show()
    .setEndpoints(
      start,
      end,
    );

  const y =
    functionDefinition(
      displayedTangentX,
    );

  tangentPoint
    .show()
    .setPoint([
      displayedTangentX,
      y,
    ]);

}

function syncMagnifiedTangent(): void {
  if (
    displayedTangentX ===
      null ||
      tangentScale <=
	1e-4
  ) {
    magnifierTangentLine.hide();
    return;
  }

  const [
    start,
    end,
  ] =
    tangentEndpointsForScene(
      magnifierScene,
      displayedTangentX,
      tangentScale,
    );

  magnifierTangentLine
    .show()
    .setEndpoints(
      start,
      end,
    );
}

function syncTangents(): void {
  syncMainTangent();
  syncMagnifiedTangent();
}

function requestTangent(
  x: number | null,
): void {
  requestedTangentX =
    x;

  if (
    displayedTangentX ===
      null
  ) {
    if (
      requestedTangentX ===
        null
    ) {
      tangentScale =
        0;

      tangentPhase =
        "idle";

      syncTangents();
      return;
    }

    displayedTangentX =
      requestedTangentX;

    tangentScale =
      0;

    tangentPhase =
      "growing";

    return;
  }

  if (
    requestedTangentX ===
      displayedTangentX &&
      tangentPhase ===
	"idle"
  ) {
    return;
  }

  tangentPhase =
    "shrinking";
}

function advanceTangent(
  deltaTime: number,
): void {
  if (
    tangentPhase ===
      "idle"
  ) {
    return;
  }

  if (
    tangentPhase ===
      "shrinking"
  ) {
    tangentScale =
      Math.max(
        0,
        tangentScale -
          deltaTime /
            TANGENT_SHRINK_SECONDS,
      );

    if (
      tangentScale <=
	1e-4
    ) {
      tangentScale =
        0;

      displayedTangentX =
        requestedTangentX;

      tangentPhase =
        displayedTangentX ===
          null
          ? "idle"
          : "growing";
    }

    syncTangents();
    return;
  }

  tangentScale =
    Math.min(
      1,
      tangentScale +
        deltaTime /
          TANGENT_GROW_SECONDS,
    );

  if (
    tangentScale >=
      1 -
	1e-4
  ) {
    tangentScale =
      1;

    tangentPhase =
      "idle";
  }

  syncTangents();
}

/* -------------------------------------------------------------------------- */
/* Picking                                                                    */
/* -------------------------------------------------------------------------- */

function pickFunctionX(
  clientX: number,
  clientY: number,
): number | null {
  const [
    worldX,
  ] =
    scene.clientToWorld(
      clientX,
      clientY,
    );

  const worldY =
    functionDefinition(
      worldX,
    );

  if (
    !Number.isFinite(
      worldY,
    )
  ) {
    return null;
  }

  const [
    ,
    curveClientY,
  ] =
    scene.worldToClient([
      worldX,
      worldY,
    ]);

  if (
    Math.abs(
      curveClientY -
	clientY,
    ) >
      GRAPH_HIT_RADIUS_PIXELS
  ) {
    return null;
  }

  return worldX;
}

/* -------------------------------------------------------------------------- */
/* Mode UI                                                                    */
/* -------------------------------------------------------------------------- */

function refreshUI(): void {
  const magnifierActive =
    interactionMode ===
      "magnifier";

  magnifierButton.style.background =
    magnifierActive
      ? "rgba(37, 86, 99, 0.88)"
      : "rgba(17, 14, 30, 0.88)";

  magnifierButton.style.borderColor =
    magnifierActive
      ? "rgba(117, 231, 255, 0.48)"
      : "rgba(198, 180, 255, 0.22)";

  tangentButton.style.background =
    !magnifierActive
      ? "rgba(86, 65, 22, 0.88)"
      : "rgba(17, 14, 30, 0.88)";

  tangentButton.style.borderColor =
    !magnifierActive
      ? "rgba(255, 219, 121, 0.46)"
      : "rgba(198, 180, 255, 0.22)";

  if (
    magnifierActive
  ) {
    canvas.style.cursor =
      pointerInside
        ? "none"
        : "default";

    readout.textContent =
      `Magnification ×${currentMagnification.toFixed(2)} · scroll over the circular lens`;

    if (
      pointerInside
    ) {
      showMagnifierCursor();
    }
  } else {
    canvas.style.cursor =
      "default";

    hideMagnifierCursor();

    magnifierLayer.style.opacity =
      "0";

    readout.textContent =
      displayedTangentX ===
        null
        ? "Click the curve to draw a tangent · click elsewhere to remove it"
        : `Tangent at x = ${formatNumber(displayedTangentX)} · click elsewhere to move or remove it`;
  }
}

function setMode(
  mode:
    InteractionMode,
): void {
  interactionMode =
    mode;

  if (
    mode ===
      "magnifier" &&
      pointerInside
  ) {
    updateMagnifierCamera();
  }

  refreshUI();
}

magnifierButton.addEventListener(
  "click",
  () => {
    setMode(
      "magnifier",
    );
  },
);

tangentButton.addEventListener(
  "click",
  () => {
    setMode(
      "tangent",
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Input                                                                      */
/* -------------------------------------------------------------------------- */

canvas.addEventListener(
  "pointerenter",
  (
    event,
  ) => {
    pointerInside =
      true;

    updatePointer(
      event.clientX,
      event.clientY,
    );

    if (
      interactionMode ===
	"magnifier"
    ) {
      updateMagnifierCamera();
      showMagnifierCursor();
    }

    refreshUI();
  },
);

canvas.addEventListener(
  "pointermove",
  (
    event,
  ) => {
    updatePointer(
      event.clientX,
      event.clientY,
    );

    if (
      interactionMode ===
	"magnifier"
    ) {
      updateMagnifierCamera();
    }
  },
);

canvas.addEventListener(
  "pointerleave",
  () => {
    pointerInside =
      false;

    hideMagnifierCursor();

    magnifierLayer.style.opacity =
      "0";

    if (
      interactionMode ===
	"magnifier"
    ) {
      canvas.style.cursor =
        "default";
    }
  },
);

canvas.addEventListener(
  "wheel",
  (
    event,
  ) => {
    if (
      interactionMode !==
	"magnifier"
    ) {
      return;
    }

    event.preventDefault();

    updatePointer(
      event.clientX,
      event.clientY,
    );

    const multiplier =
      Math.exp(
        -event.deltaY *
          WHEEL_ZOOM_SENSITIVITY,
      );

    targetMagnification =
      clamp(
        targetMagnification *
          multiplier,

        MIN_MAGNIFICATION,
        MAX_MAGNIFICATION,
      );

    showMagnifierCursor();
  },
  {
    passive:
      false,
  },
);

canvas.addEventListener(
  "pointerdown",
  (
    event,
  ) => {
    if (
      interactionMode !==
	"tangent"
    ) {
      return;
    }

    const x =
      pickFunctionX(
        event.clientX,
        event.clientY,
      );

    requestTangent(
      x,
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Continuous frame loop                                                      */
/* -------------------------------------------------------------------------- */

/*
 * Keep one scene-owned frame loop alive:
 *
 * - tangent shrink / grow happens here;
 * - lens magnification eases continuously toward the wheel-controlled target;
 * - tangent endpoints inside the lens are recomputed AFTER each magnifier
 *   camera update, so the line can never retain stale/cropped geometry.
 */
const stopFrame =
  scene.onFrame(
    ({
      deltaTime,
    }) => {
      advanceTangent(
        deltaTime,
      );

      advanceMagnification(
        deltaTime,
      );

      if (
        interactionMode ===
          "magnifier" &&
          pointerInside
      ) {
        syncMagnifiedTangent();
      }

      refreshUI();
    },
  );

refreshUI();

/* -------------------------------------------------------------------------- */
/* Debug / external controls                                                  */
/* -------------------------------------------------------------------------- */

Object.assign(
  window,
  {
    functionZoomTangentDemo: {
      scene,
      magnifierScene,
      coordinatePlane,
      graph,
      tangentLine,
      tangentPoint,

      setMode,

      setMagnification(
        value: number,
      ) {
        targetMagnification =
          clamp(
            value,
            MIN_MAGNIFICATION,
            MAX_MAGNIFICATION,
          );
      },

      setTangentAt(
        x:
          number | null,
      ) {
        requestTangent(
          x,
        );
      },

      get magnification() {
        return currentMagnification;
      },

      get mode() {
        return interactionMode;
      },
    },
  },
);

/* -------------------------------------------------------------------------- */
/* Cleanup                                                                    */
/* -------------------------------------------------------------------------- */

const destroy =
  (): void => {
    stopFrame();

    magnifierGeometryObserver
      .disconnect();

    window.removeEventListener(
      "scroll",
      syncGeometryFromViewport,
      true,
    );

    window.removeEventListener(
      "resize",
      syncGeometryFromViewport,
    );

    controls.remove();
    readout.remove();
    lensCursor.remove();
    lensCenterMarker.remove();
    magnifierLayer.remove();

    scene.destroy();
    magnifierScene.destroy();
  };

window.addEventListener(
  "pagehide",
  destroy,
  {
    once: true,
  },
);

document.addEventListener(
  "astro:before-swap",
  destroy,
  {
    once: true,
  },
);
