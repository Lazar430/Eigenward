import type { Object3D } from "three";
import type { DisposableObject3D } from "./types";

/**
 * Dispose every custom math object in a Three.js subtree exactly once.
 *
 * Individual primitives remain responsible for disposing the GPU resources they
 * own. The scene only discovers and calls their public dispose() methods.
 */
export function disposeObjectTree(root: Object3D): void {
  const disposed = new Set<DisposableObject3D>();

  root.traverse((object) => {
    const disposable = object as DisposableObject3D;

    if (disposable.dispose && !disposed.has(disposable)) {
      disposable.dispose();
      disposed.add(disposable);
    }
  });
}
