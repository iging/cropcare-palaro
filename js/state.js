/**
 * Tiny pub/sub bus + shared state.
 * Modules import `bus` and `state` instead of referencing each other directly,
 * so adding or removing a feature never cascades into other files.
 */

/** @typedef {(payload?: any) => void} Listener */

/** @type {Map<string, Set<Listener>>} */
const listeners = new Map();

export const bus = {
  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => bus.off(event, fn);
  },
  off(event, fn) {
    listeners.get(event)?.delete(fn);
  },
  emit(event, payload) {
    listeners.get(event)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error(err);
      }
    });
  },
};

/** Application-wide reactive-ish state. Mutate via `setState`. */
export const state = {
  /** Stopwatch phase: 'idle' | 'running' | 'won' | 'lost'. */
  phase: "idle",
  /** Current elapsed time, milliseconds. */
  elapsedMs: 0,
  /** Settings */
  settings: {
    targetMs: 10_000,
    toleranceMs: 50,
    mode: "visible", // 'visible' | 'blind'
  },
  /** Aggregate game stats. */
  stats: {
    attempts: 0,
    wins: 0,
    streak: 0,
    bestDeltaMs: null,
  },
};

/**
 * Shallow-merge into `state` and notify subscribers via 'state' event.
 * @param {Partial<typeof state>} patch
 */
export function setState(patch) {
  Object.assign(state, patch);
  bus.emit("state", state);
}
