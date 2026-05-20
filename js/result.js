/**
 * Win/lose feedback banner shown beneath the stopwatch.
 * Defensively no-ops if its DOM nodes aren't present.
 */
import { bus } from "./state.js";
import { formatDelta, formatTime } from "./format.js";

const ICON_WIN = `
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
       stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>`;

const ICON_LOSE = `
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
       stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>`;

let els = {};

function show({ elapsedMs, targetMs, deltaMs, isWin }) {
  if (!els.box) return;
  els.box.hidden = false;
  els.box.classList.toggle("is-win", isWin);
  els.box.classList.toggle("is-lose", !isWin);
  if (els.icon) els.icon.innerHTML = isWin ? ICON_WIN : ICON_LOSE;

  if (isWin) {
    if (els.title) els.title.textContent = "Perfect stop.";
    if (els.msg)
      els.msg.innerHTML =
        `You stopped at <strong>${formatTime(elapsedMs)}</strong> — ` +
        `delta <strong>${formatDelta(deltaMs)}</strong>.`;
  } else {
    if (els.title)
      els.title.textContent = deltaMs > 0 ? "A touch late." : "A touch early.";
    if (els.msg)
      els.msg.innerHTML =
        `Target was <strong>${formatTime(targetMs)}</strong>, ` +
        `you stopped at <strong>${formatTime(elapsedMs)}</strong> ` +
        `(<strong>${formatDelta(deltaMs)}</strong>).`;
  }
}

function hide() {
  if (!els.box) return;
  els.box.hidden = true;
  els.box.classList.remove("is-win", "is-lose");
}

export function initResult() {
  els = {
    box: document.getElementById("result"),
    icon: document.getElementById("resultIcon"),
    title: document.getElementById("resultTitle"),
    msg: document.getElementById("resultMsg"),
  };
  if (!els.box) {
    console.warn("[result] result banner not found in DOM");
    return;
  }

  bus.on("sw:stop", show);
  bus.on("sw:reset", hide);
  bus.on("sw:start", hide);
}
