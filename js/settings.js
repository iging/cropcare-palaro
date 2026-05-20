/**
 * Settings form: target time, tolerance, display mode.
 * Persists to localStorage and emits 'settings:changed' on apply.
 *
 * Player name is NOT collected here — the name-modal prompts at the moment
 * an attempt qualifies for the leaderboard.
 */
import { bus, setState } from "./state.js";
import { load, save } from "./storage.js";

const DEFAULTS = Object.freeze({
  targetMs: 10_000,
  toleranceMs: 50,
  mode: "visible",
});

let elForm, elTarget, elTol, elSeg, elDefaults;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function readForm() {
  const targetSec = parseFloat(elTarget.value);
  const tolerance = parseInt(elTol.value, 10);
  const mode =
    elSeg.querySelector(".seg-btn.is-active")?.dataset.mode || "visible";
  return {
    targetMs: clamp(Number.isFinite(targetSec) ? targetSec : 10, 1, 600) * 1000,
    toleranceMs: clamp(Number.isFinite(tolerance) ? tolerance : 50, 0, 500),
    mode,
  };
}

function writeForm(s) {
  elTarget.value = +(s.targetMs / 1000).toFixed(2);
  elTol.value = s.toleranceMs;
  elSeg.querySelectorAll(".seg-btn").forEach((b) => {
    const active = b.dataset.mode === s.mode;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-checked", String(active));
  });
}

function apply(settings) {
  setState({ settings });
  save("settings", settings);
  bus.emit("settings:changed", settings);
}

function onSegClick(e) {
  const btn = e.target.closest(".seg-btn");
  if (!btn) return;
  elSeg.querySelectorAll(".seg-btn").forEach((b) => {
    const active = b === btn;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-checked", String(active));
  });
}

export function initSettings() {
  elForm = document.getElementById("settingsForm");
  elTarget = document.getElementById("inpTargetSec");
  elTol = document.getElementById("inpTolerance");
  elSeg = elForm?.querySelector(".seg");
  elDefaults = document.getElementById("btnDefaults");
  if (!elForm || !elTarget || !elTol || !elSeg || !elDefaults) {
    console.warn("[settings] settings form not found — using defaults");
    apply(DEFAULTS);
    return;
  }

  // Hydrate from storage (or defaults) before the first paint.
  const stored = load("settings", null);
  // Drop any legacy keys (e.g. playerName from earlier versions).
  const initial = {
    targetMs: stored?.targetMs ?? DEFAULTS.targetMs,
    toleranceMs: stored?.toleranceMs ?? DEFAULTS.toleranceMs,
    mode: stored?.mode ?? DEFAULTS.mode,
  };
  writeForm(initial);
  apply(initial);

  elForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const next = readForm();
    writeForm(next); // normalize displayed values
    apply(next);
  });

  elSeg.addEventListener("click", onSegClick);

  elDefaults.addEventListener("click", () => {
    writeForm(DEFAULTS);
    apply({ ...DEFAULTS });
  });
}
