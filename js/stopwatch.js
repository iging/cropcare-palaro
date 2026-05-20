/**
 * Stopwatch timing engine.
 * Uses `performance.now()` for sub-millisecond accuracy and rAF to drive
 * UI updates without spinning the timer faster than the display can paint.
 *
 * Emits:
 *   - 'sw:start'                     when the timer starts
 *   - 'sw:tick',  elapsedMs          on every animation frame while running
 *   - 'sw:stop',  { elapsedMs, ... } when the user stops
 *   - 'sw:reset'                     when the timer is reset
 */
import { bus, state, setState } from "./state.js";

let startedAt = 0; // performance.now() at start
let rafId = 0;
let running = false;

function tick() {
  if (!running) return;
  const now = performance.now();
  const elapsed = now - startedAt;
  state.elapsedMs = elapsed; // hot path; skip setState() to avoid churn
  bus.emit("sw:tick", elapsed);
  rafId = requestAnimationFrame(tick);
}

export function start() {
  if (running) return;
  running = true;
  startedAt = performance.now();
  setState({ phase: "running", elapsedMs: 0 });
  bus.emit("sw:start");
  rafId = requestAnimationFrame(tick);
}

export function stop() {
  if (!running) return;
  running = false;
  cancelAnimationFrame(rafId);

  const elapsed = performance.now() - startedAt;
  const { targetMs, toleranceMs } = state.settings;
  const deltaMs = elapsed - targetMs;
  const isWin = Math.abs(deltaMs) <= toleranceMs;

  state.elapsedMs = elapsed;
  setState({ phase: isWin ? "won" : "lost" });

  bus.emit("sw:stop", {
    elapsedMs: elapsed,
    targetMs,
    toleranceMs,
    deltaMs,
    isWin,
  });
}

export function reset() {
  running = false;
  cancelAnimationFrame(rafId);
  setState({ phase: "idle", elapsedMs: 0 });
  bus.emit("sw:reset");
}

export const isRunning = () => running;
