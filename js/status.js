/**
 * Topbar status pill — reflects the current stopwatch phase.
 * Optional component: silently no-ops if its nodes are absent.
 */
import { bus, state } from "./state.js";

const TEXT = {
  idle: "Ready",
  running: "Running",
  won: "Win",
  lost: "Missed",
};

const DOT_STATE = {
  idle: "idle",
  running: "running",
  won: "win",
  lost: "lose",
};

let elText, elDot;

function render() {
  if (elText) elText.textContent = TEXT[state.phase] ?? "Ready";
  if (elDot) elDot.dataset.state = DOT_STATE[state.phase] ?? "idle";
}

export function initStatus() {
  elText = document.getElementById("statusText");
  elDot = document.querySelector("#statusPill .status-dot");
  if (!elText && !elDot) return;

  bus.on("state", render);
  render();
}
