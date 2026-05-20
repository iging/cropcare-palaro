/**
 * Stats counters: wins, best delta, last delta, attempts.
 * Listens for 'sw:stop' results and persists. Includes a "reset attempts"
 * action that wipes counters back to zero (with a confirm prompt).
 */
import { bus, state, setState } from "./state.js";
import { load, save } from "./storage.js";
import { formatDelta } from "./format.js";

const EMPTY_STATS = Object.freeze({
  attempts: 0,
  wins: 0,
  streak: 0, // tracked internally for resilience even if not shown
  bestDeltaMs: null,
  lastDeltaMs: null,
  lastIsWin: null,
});

let els = {};

function setText(node, value) {
  if (node) node.textContent = value;
}

function setHintTone(node, tone) {
  if (!node) return;
  node.classList.remove("is-win", "is-lose");
  if (tone) node.classList.add(tone === "win" ? "is-win" : "is-lose");
}

function bestHint(bestDeltaMs) {
  if (bestDeltaMs == null) return "Closest to target";
  const abs = Math.abs(bestDeltaMs);
  if (abs === 0) return "Dead-on the target";
  if (abs < 25) return "Razor sharp";
  if (abs < 75) return "Excellent timing";
  if (abs < 150) return "Solid attempt";
  return "Closest to target";
}

function lastHint(lastDeltaMs, lastIsWin) {
  if (lastDeltaMs == null) return "No attempts yet";
  if (lastIsWin) return "Within tolerance — win";
  return lastDeltaMs > 0 ? "Stopped late" : "Stopped early";
}

function render() {
  const { attempts, wins, bestDeltaMs, lastDeltaMs, lastIsWin } = state.stats;

  setText(els.wins, String(wins ?? 0));
  setText(els.best, bestDeltaMs == null ? "—" : formatDelta(bestDeltaMs));
  setText(els.last, lastDeltaMs == null ? "—" : formatDelta(lastDeltaMs));
  setText(els.attempts, String(attempts ?? 0));

  setText(
    els.winsHint,
    !wins
      ? "No wins yet"
      : wins === 1
        ? "1 perfect stop"
        : `${wins} perfect stops`,
  );
  setText(els.bestHint, bestHint(bestDeltaMs));
  setText(els.lastHint, lastHint(lastDeltaMs, lastIsWin));
  setText(
    els.attemptsHint,
    !attempts
      ? "Total tries"
      : attempts === 1
        ? "1 attempt"
        : `${attempts} attempts`,
  );

  setHintTone(
    els.lastHint,
    lastIsWin == null ? null : lastIsWin ? "win" : "lose",
  );

  setText(els.attemptBadge, `Attempt ${(attempts ?? 0) + 1}`);

  if (els.resetBtn) {
    const empty =
      !attempts && !wins && bestDeltaMs == null && lastDeltaMs == null;
    els.resetBtn.disabled = empty;
  }
}

function resetStats() {
  const ok = window.confirm(
    "Reset all attempts, wins, and deltas back to zero?",
  );
  if (!ok) return;
  setState({ stats: { ...EMPTY_STATS } });
  save("stats", { ...EMPTY_STATS });
  render();
}

/**
 * Pre-existing localStorage entries (from earlier versions) may not include
 * `lastDeltaMs`. If we have a leaderboard with attempts, derive the most
 * recent one to keep the "Last Delta" tile meaningful right after upgrade.
 */
function backfillLast(stored) {
  if (stored?.lastDeltaMs != null) return stored;
  const board = load("leaderboard", []) || [];
  if (!Array.isArray(board) || board.length === 0) return stored;
  // Most recent by timestamp.
  const latest = board.reduce((a, b) => (a && a.ts >= b.ts ? a : b), null);
  if (!latest) return stored;
  return {
    ...stored,
    lastDeltaMs: latest.deltaMs,
    lastIsWin: !!latest.isWin,
  };
}

export function initStats() {
  els = {
    wins: document.getElementById("statWins"),
    best: document.getElementById("statBest"),
    last: document.getElementById("statLast"),
    attempts: document.getElementById("statAttempts"),
    winsHint: document.getElementById("statWinsHint"),
    bestHint: document.getElementById("statBestHint"),
    lastHint: document.getElementById("statLastHint"),
    attemptsHint: document.getElementById("statAttemptsHint"),
    attemptBadge: document.getElementById("attemptBadge"),
    resetBtn: document.getElementById("btnResetStats"),
  };

  for (const [key, node] of Object.entries(els)) {
    if (!node) console.warn(`[stats] missing element: ${key}`);
  }

  const stored = backfillLast(load("stats", null));
  setState({ stats: { ...EMPTY_STATS, ...(stored ?? {}) } });
  // Persist the backfilled record so we don't keep recomputing on each load.
  save("stats", state.stats);
  render();

  bus.on("sw:stop", ({ deltaMs, isWin }) => {
    const next = { ...state.stats };
    next.attempts = (next.attempts ?? 0) + 1;

    if (isWin) {
      next.wins = (next.wins ?? 0) + 1;
      next.streak = (next.streak ?? 0) + 1;
    } else {
      next.streak = 0;
    }

    const absDelta = Math.abs(deltaMs);
    if (next.bestDeltaMs == null || absDelta < Math.abs(next.bestDeltaMs)) {
      next.bestDeltaMs = deltaMs;
    }

    next.lastDeltaMs = deltaMs;
    next.lastIsWin = !!isWin;

    setState({ stats: next });
    save("stats", next);
    render();
  });

  bus.on("sw:reset", render);
  bus.on("settings:changed", render);
  bus.on("state", render);

  els.resetBtn?.addEventListener("click", resetStats);
}
