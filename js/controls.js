/**
 * Wires the contextual primary button + Reset + the Space shortcut.
 *
 * The primary button is one button, never disabled:
 *   - idle / settled  → Start  (begins a new run; clears any prior result)
 *   - running         → Stop   (ends the run, evaluates win/lose)
 */
import { bus, state } from "./state.js";
import * as sw from "./stopwatch.js";

const ICON_PLAY = `
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M8 5.14v13.72a1 1 0 0 0 1.55.83l10.3-6.86a1 1 0 0 0 0-1.66L9.55 4.31A1 1 0 0 0 8 5.14Z" />
  </svg>`;

const ICON_STOP = `
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>`;

let elPrimary, elPrimaryIcon, elPrimaryLabel, elReset;

function syncPrimary() {
  if (!elPrimary) return;
  const running = state.phase === "running";
  const settled = state.phase === "won" || state.phase === "lost";

  // Always interactive — the button morphs instead of disabling.
  elPrimary.disabled = false;

  // Toggle the red "stop" styling so the action reads correctly.
  elPrimary.classList.toggle("is-stop", running);

  if (running) {
    if (elPrimaryIcon) elPrimaryIcon.innerHTML = ICON_STOP;
    if (elPrimaryLabel) elPrimaryLabel.textContent = "Stop";
    elPrimary.setAttribute("aria-label", "Stop stopwatch");
  } else {
    if (elPrimaryIcon) elPrimaryIcon.innerHTML = ICON_PLAY;
    if (elPrimaryLabel)
      elPrimaryLabel.textContent = settled ? "Restart" : "Start";
    elPrimary.setAttribute(
      "aria-label",
      settled ? "Restart stopwatch" : "Start stopwatch",
    );
  }

  if (elReset) {
    elReset.disabled = !running && !settled && state.elapsedMs === 0;
  }
}

function onPrimary() {
  if (state.phase === "running") {
    sw.stop();
  } else {
    if (state.phase !== "idle") sw.reset();
    sw.start();
  }
}

function onKey(e) {
  if (e.code !== "Space") return;
  // Don't fight with form fields or buttons that already received the event.
  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
  e.preventDefault();
  onPrimary();
}

export function initControls() {
  elPrimary = document.getElementById("btnPrimary");
  elPrimaryIcon = document.getElementById("btnPrimaryIcon");
  elPrimaryLabel = document.getElementById("btnPrimaryLabel");
  elReset = document.getElementById("btnReset");
  if (!elPrimary) {
    console.warn("[controls] primary button not found");
    return;
  }

  elPrimary.addEventListener("click", onPrimary);
  elReset?.addEventListener("click", () => sw.reset());
  document.addEventListener("keydown", onKey);

  bus.on("state", syncPrimary);
  syncPrimary();
}
