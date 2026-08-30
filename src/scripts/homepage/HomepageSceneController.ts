import type { ManagedAnimationHandle } from "../math-graphics/animation/ManagedAnimationHandle";

export type HomepageSceneFactory = (
  canvas: HTMLCanvasElement,
) => Promise<ManagedAnimationHandle> | ManagedAnimationHandle;

/**
 * Load code/assets only. The controller invokes the returned factory after it
 * has re-checked that the scene is still wanted. This split is what prevents a
 * stale dynamic import from mounting a renderer after a fast scroll/hover.
 */
export type HomepageSceneLoader = () =>
  | Promise<HomepageSceneFactory>
  | HomepageSceneFactory;

export interface HomepageSceneRegistration {
  key: string;
  canvas: HTMLCanvasElement;
  load: HomepageSceneLoader;
}

export interface HomepageSceneControllerOptions {
  maxMounted?: number;
  idleDestroyMs?: number;
}

interface SceneEntry extends HomepageSceneRegistration {
  handle: ManagedAnimationHandle | null;
  loading: Promise<ManagedAnimationHandle | null> | null;
  wanted: boolean;
  generation: number;
  lastUsed: number;
  destroyTimer: number | null;
}

/**
 * Owns expensive homepage scene lifetimes.
 *
 * Key invariants:
 * - imports and scene construction are two separate phases;
 * - generation tokens cancel stale work between those phases;
 * - inactive scenes are paused immediately;
 * - idle/LRU eviction releases Three.js resources and label layers;
 * - destroyAll() invalidates work still resolving during Astro navigation.
 */
export class HomepageSceneController {
  private readonly entries = new Map<string, SceneEntry>();
  private readonly maxMounted: number;
  private readonly idleDestroyMs: number;
  private disposed = false;

  constructor(options: HomepageSceneControllerOptions = {}) {
    this.maxMounted = Math.max(1, options.maxMounted ?? 2);
    this.idleDestroyMs = Math.max(0, options.idleDestroyMs ?? 20_000);
  }

  register(registration: HomepageSceneRegistration): void {
    if (this.disposed) return;

    if (this.entries.has(registration.key)) {
      this.destroy(registration.key);
    }

    registration.canvas.dataset.homepageManagedScene = "true";

    this.entries.set(registration.key, {
      ...registration,
      handle: null,
      loading: null,
      wanted: false,
      generation: 0,
      lastUsed: performance.now(),
      destroyTimer: null,
    });
  }

  isMounted(key: string): boolean {
    return this.entries.get(key)?.handle !== null;
  }

  async activate(key: string): Promise<ManagedAnimationHandle | null> {
    const entry = this.entries.get(key);
    if (!entry || this.disposed) return null;

    /*
     * Entries may deliberately share one physical canvas (the six featured
     * article previews do). A canvas can have only one owning scene at a time,
     * so evict every other registration for that canvas BEFORE importing or
     * constructing the requested scene.
     */
    for (const other of this.entries.values()) {
      if (
        other.key !== key &&
        other.canvas === entry.canvas &&
        (other.handle !== null || other.loading !== null)
      ) {
        this.destroy(other.key);
      }
    }

    entry.wanted = true;
    entry.lastUsed = performance.now();
    this.clearDestroyTimer(entry);

    if (entry.handle) {
      entry.handle.resume();
      this.enforceBudget(key);
      return entry.handle;
    }

    if (!entry.loading) {
      const generation = entry.generation;

      const loading = Promise.resolve(entry.load())
        .then(async (factory) => {
          /*
           * The dynamic import may have taken long enough for the user to move
           * elsewhere. Do not even construct a WebGLRenderer in that case.
           */
          if (
            this.disposed ||
            generation !== entry.generation ||
            !this.entries.has(key)
          ) {
            return null;
          }

          const handle = await factory(entry.canvas);

          if (
            this.disposed ||
            generation !== entry.generation ||
            !this.entries.has(key)
          ) {
            handle.destroy();
            return null;
          }

          entry.handle = handle;
          entry.lastUsed = performance.now();

          if (entry.wanted) handle.resume();
          else handle.pause();

          this.enforceBudget(key);
          return handle;
        })
        .catch((error) => {
          console.error(`Could not mount homepage scene "${key}".`, error);
          return null;
        })
        .finally(() => {
          if (entry.loading === loading) {
            entry.loading = null;
          }
        });

      entry.loading = loading;
    }

    return entry.loading;
  }

  deactivate(
    key: string,
    options: { destroyAfterMs?: number } = {},
  ): void {
    const entry = this.entries.get(key);
    if (!entry || this.disposed) return;

    entry.wanted = false;
    entry.lastUsed = performance.now();
    entry.handle?.pause();

    const delay = Math.max(
      0,
      options.destroyAfterMs ?? this.idleDestroyMs,
    );

    this.clearDestroyTimer(entry);

    if (delay === 0) {
      this.destroy(key);
      return;
    }

    entry.destroyTimer = window.setTimeout(() => {
      entry.destroyTimer = null;
      if (!entry.wanted) this.destroy(key);
    }, delay);
  }

  destroy(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;

    entry.wanted = false;
    entry.generation += 1;
    this.clearDestroyTimer(entry);

    /*
     * We cannot cancel a dynamic import, but we can stop treating its promise
     * as the current load. Its captured generation will make it self-discard
     * when it resolves, while a rapid re-activation may start fresh work now.
     */
    entry.loading = null;

    entry.handle?.destroy();
    entry.handle = null;
  }

  destroyAll(): void {
    if (this.disposed) return;

    for (const key of this.entries.keys()) {
      this.destroy(key);
    }

    this.disposed = true;
    this.entries.clear();
  }

  private enforceBudget(protectedKey: string): void {
    const mounted = [...this.entries.values()].filter(
      (entry) => entry.handle !== null,
    );

    if (mounted.length <= this.maxMounted) return;

    const candidates = mounted
      .filter((entry) => entry.key !== protectedKey && !entry.wanted)
      .sort((a, b) => a.lastUsed - b.lastUsed);

    let mountedCount = mounted.length;

    while (mountedCount > this.maxMounted && candidates.length > 0) {
      const candidate = candidates.shift();
      if (!candidate) break;
      this.destroy(candidate.key);
      mountedCount -= 1;
    }
  }

  private clearDestroyTimer(entry: SceneEntry): void {
    if (entry.destroyTimer === null) return;
    window.clearTimeout(entry.destroyTimer);
    entry.destroyTimer = null;
  }
}
