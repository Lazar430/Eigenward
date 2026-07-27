type Edge = [string, string];

type NodeState = {
  id: string;
  element: HTMLElement;
  baseXPercent: number;
  baseYPercent: number;
  x: number;
  y: number;
  phase: number;
  speedX: number;
  speedY: number;
  ampX: number;
  ampY: number;
};

const EDGES: Edge[] = [
  ["logic", "sets"],
  ["logic", "algebra"],
  ["logic", "geometry"],

  ["sets", "analysis"],
  ["algebra", "topology"],
  ["algebra", "number"],
  ["geometry", "combinatorics"],

  ["analysis", "topology"],
  ["topology", "computing"],
  ["number", "computing"],
  ["number", "combinatorics"],

  ["algebra", "physics"],
  ["geometry", "physics"],
  ["physics", "computing"]
];

const SVG_NS = "http://www.w3.org/2000/svg";

function hashString(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }

  return Math.abs(hash);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function createLine(): SVGLineElement {
  return document.createElementNS(SVG_NS, "line");
}

function numberFromDataset(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function initializeGraph(graph: HTMLElement) {
  if (graph.dataset.branchGraphReady === "true") {
    return;
  }

  const svg = graph.querySelector<SVGSVGElement>("[data-branch-graph-lines]");
  const nodeElements = Array.from(
    graph.querySelectorAll<HTMLElement>("[data-branch-node]")
  );

  if (!svg || nodeElements.length === 0) {
    return;
  }

  graph.dataset.branchGraphReady = "true";

  const reducedMotion = prefersReducedMotion();

  const nodes: NodeState[] = nodeElements.map((element) => {
    const id = element.dataset.branchNode ?? "";
    const hash = hashString(id);

    const baseXPercent = numberFromDataset(element.dataset.nodeX, 50);
    const baseYPercent = numberFromDataset(element.dataset.nodeY, 50);

    return {
      id,
      element,
      baseXPercent,
      baseYPercent,

      x: 0,
      y: 0,

      phase: (hash % 6283) / 1000,
      speedX: 0.18 + (hash % 7) * 0.018,
      speedY: 0.16 + (hash % 9) * 0.015,

      ampX: reducedMotion ? 0 : 7 + (hash % 5),
      ampY: reducedMotion ? 0 : 5 + (hash % 4)
    };
  });

  const nodeMap = new Map<string, NodeState>();

  for (const node of nodes) {
    nodeMap.set(node.id, node);

    node.element.style.left = `${node.baseXPercent}%`;
    node.element.style.top = `${node.baseYPercent}%`;
  }

  const lineMap = EDGES.map(([from, to]) => {
    const line = createLine();

    line.dataset.from = from;
    line.dataset.to = to;

    svg.appendChild(line);

    return {
      from,
      to,
      line
    };
  });

  let graphWidth = 0;
  let graphHeight = 0;

  function measureGraph() {
    const rect = graph.getBoundingClientRect();

    graphWidth = rect.width;
    graphHeight = rect.height;

    svg.setAttribute("viewBox", `0 0 ${graphWidth} ${graphHeight}`);
    svg.setAttribute("preserveAspectRatio", "none");
  }

  function updateNodes(time: number) {
    const t = time / 1000;

    for (const node of nodes) {
      const x = Math.sin(t * node.speedX + node.phase) * node.ampX;
      const y = Math.cos(t * node.speedY + node.phase * 1.73) * node.ampY;

      node.x = (node.baseXPercent / 100) * graphWidth + x;
      node.y = (node.baseYPercent / 100) * graphHeight + y;

      node.element.style.setProperty("--float-x", `${x}px`);
      node.element.style.setProperty("--float-y", `${y}px`);
    }
  }

  function updateLines() {
    for (const item of lineMap) {
      const from = nodeMap.get(item.from);
      const to = nodeMap.get(item.to);

      if (!from || !to) continue;

      item.line.setAttribute("x1", `${from.x}`);
      item.line.setAttribute("y1", `${from.y}`);
      item.line.setAttribute("x2", `${to.x}`);
      item.line.setAttribute("y2", `${to.y}`);
    }
  }

  function frame(time: number) {
    updateNodes(time);
    updateLines();

    if (!reducedMotion) {
      requestAnimationFrame(frame);
    }
  }

  measureGraph();
  requestAnimationFrame(frame);

  window.addEventListener("resize", () => {
    measureGraph();
    updateNodes(performance.now());
    updateLines();
  });
}

export function startBranchGraph() {
  const graphs = document.querySelectorAll<HTMLElement>("[data-branch-graph]");

  graphs.forEach(initializeGraph);
}