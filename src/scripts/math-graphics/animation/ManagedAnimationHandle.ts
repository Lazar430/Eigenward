export interface ManagedAnimationHandle {
  readonly canvas: HTMLCanvasElement;
  pause(): void;
  resume(): void;
  destroy(): void;
}

export interface PausableMathScene {
  readonly canvas: HTMLCanvasElement;
  pause(): unknown;
  resume(): unknown;
  destroy(): void;
}

export interface ManagedAnimationHandleOptions {
  beforeDestroy?: () => void;
  afterDestroy?: () => void;
}

/**
 * Small lifecycle adapter shared by homepage previews and ordinary demos.
 * destroy() is deliberately idempotent because Astro navigation, viewport
 * eviction, and pagehide can race with one another.
 */
export function createManagedAnimationHandle(
  scene: PausableMathScene,
  options: ManagedAnimationHandleOptions = {},
): ManagedAnimationHandle {
  let destroyed = false;

  return {
    canvas: scene.canvas,

    pause() {
      if (destroyed) return;
      scene.pause();
    },

    resume() {
      if (destroyed) return;
      scene.resume();
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;

      options.beforeDestroy?.();
      scene.destroy();
      options.afterDestroy?.();
    },
  };
}

/** Homepage-managed canvases are mounted explicitly by HomepageSceneController. */
export function isHomepageManagedCanvas(canvas: HTMLCanvasElement): boolean {
  return canvas.dataset.homepageManagedScene === "true";
}

export type ManagedAnimationMount = (
  canvas: HTMLCanvasElement,
) => ManagedAnimationHandle | Promise<ManagedAnimationHandle>;

interface AutoMountRegistration {
  selector: string;
  mount: ManagedAnimationMount;
  handle: ManagedAnimationHandle | null;
  generation: number;
  loading: boolean;
}

/*
 * ES modules execute only once, even across Astro client navigation. Keeping
 * auto-mount registrations here means a demo first imported by the homepage
 * can still mount normally if the user later navigates to its dedicated page.
 */
const autoMountRegistrations = new Set<AutoMountRegistration>();
let autoMountListenersInstalled = false;

function destroyAutoMount(registration: AutoMountRegistration): void {
  registration.generation += 1;
  registration.loading = false;
  registration.handle?.destroy();
  registration.handle = null;
}

function tryAutoMount(registration: AutoMountRegistration): void {
  if (registration.handle || registration.loading) return;

  const canvas = document.querySelector<HTMLCanvasElement>(
    registration.selector,
  );

  if (!canvas || isHomepageManagedCanvas(canvas)) return;

  const generation = registration.generation;
  registration.loading = true;

  void Promise.resolve(registration.mount(canvas))
    .then((handle) => {
      registration.loading = false;

      if (
        generation !== registration.generation ||
        !canvas.isConnected ||
        isHomepageManagedCanvas(canvas)
      ) {
        handle.destroy();
        return;
      }

      registration.handle = handle;
    })
    .catch((error) => {
      registration.loading = false;
      console.error(
        `Could not auto-mount managed animation "${registration.selector}".`,
        error,
      );
    });
}

function ensureAutoMountListeners(): void {
  if (autoMountListenersInstalled) return;
  autoMountListenersInstalled = true;

  document.addEventListener("astro:before-swap", () => {
    for (const registration of autoMountRegistrations) {
      destroyAutoMount(registration);
    }
  });

  document.addEventListener("astro:page-load", () => {
    for (const registration of autoMountRegistrations) {
      tryAutoMount(registration);
    }
  });

  window.addEventListener("pagehide", () => {
    for (const registration of autoMountRegistrations) {
      destroyAutoMount(registration);
    }
  });
}

export function installManagedAnimationAutoMount(
  selector: string,
  mount: ManagedAnimationMount,
): void {
  const registration: AutoMountRegistration = {
    selector,
    mount,
    handle: null,
    generation: 0,
    loading: false,
  };

  autoMountRegistrations.add(registration);
  ensureAutoMountListeners();
  tryAutoMount(registration);
}
