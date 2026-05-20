/**
 * Renders the SVG dial:
 *   - tick marks (60 minor, 12 major)
 *   - center time readout
 *
 * No progress arc and no tolerance band — the dial deliberately gives no
 * timing hints while the stopwatch runs. The result paints the ring color
 * (green for win, red for lose) via a `data-phase` attribute on the dial.
 */
import { bus, state } from "./state.js";
import { splitTime, formatTime } from "./format.js";

let els = null;

function $(id) {
  return document.getElementById(id);
}

function buildTicks(group) {
  const cx = 110;
  const cy = 110;
  const inner = 80;
  const outer = 88;
  const outerMajor = 92;

  const frag = document.createDocumentFragment();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const isMajor = i % 5 === 0;
    const o = isMajor ? outerMajor : outer;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", cx + Math.cos(a) * inner);
    line.setAttribute("y1", cy + Math.sin(a) * inner);
    line.setAttribute("x2", cx + Math.cos(a) * o);
    line.setAttribute("y2", cy + Math.sin(a) * o);
    if (isMajor) line.classList.add("major");
    frag.appendChild(line);
  }
  group.replaceChildren(frag);
}

function paintReadout(ms) {
  const { head, ms: tail } = splitTime(ms);
  els.time.firstChild.nodeValue = head;
  els.timeMs.textContent = tail;
}

function paintTargetLabel() {
  els.targetLabel.textContent = formatTime(state.settings.targetMs);
}

function applyMode() {
  els.dial.classList.toggle("is-blind", state.settings.mode === "blind");
}

function setPhase(phase) {
  els.dial.dataset.phase = phase;
}

export function initDial() {
  els = {
    dial: $("dial"),
    ticks: $("ringTicks"),
    time: $("timeDisplay"),
    timeMs: document.querySelector("#timeDisplay .time-ms"),
    targetLabel: $("targetLabel"),
  };
  if (!els.dial || !els.ticks || !els.time || !els.timeMs || !els.targetLabel) {
    console.warn("[dial] missing one or more dial nodes — dial disabled");
    return;
  }

  buildTicks(els.ticks);
  paintReadout(0);
  paintTargetLabel();
  applyMode();
  setPhase("idle");

  bus.on("sw:start", () => {
    setPhase("running");
    paintReadout(0);
  });

  bus.on("sw:tick", (ms) => {
    paintReadout(ms);
  });

  bus.on("sw:stop", ({ elapsedMs, isWin }) => {
    paintReadout(elapsedMs);
    setPhase(isWin ? "won" : "lost");
  });

  bus.on("sw:reset", () => {
    paintReadout(0);
    setPhase("idle");
  });

  bus.on("settings:changed", () => {
    paintTargetLabel();
    applyMode();
  });
}
