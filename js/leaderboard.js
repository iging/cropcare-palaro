/**
 * Leaderboard — records every qualifying attempt and ranks by closeness
 * to target.
 *
 * Sort key: |deltaMs| ASC. Tiebreakers: win > lose, earlier ts first.
 *
 * Qualification rule: an attempt is offered for entry if it would land
 * inside the visible top 10 of the board (or the board has free slots).
 * On qualification we open the name-modal; entries are only persisted
 * when the user submits a name.
 *
 * Persists the top 50 to localStorage.
 */
import { bus } from "./state.js";
import { load, save } from "./storage.js";
import { formatDelta, formatTime } from "./format.js";
import { promptForName } from "./name-modal.js";

const MAX_STORED = 50;
const MAX_VISIBLE = 5;

let elList, elCount, elEmpty, elClearBtn;
/** @type {LbEntry[]} */
let entries = [];
let lastEntryId = null;

/**
 * @typedef {Object} LbEntry
 * @property {string} id
 * @property {string} name
 * @property {string} [location]
 * @property {number} elapsedMs
 * @property {number} targetMs
 * @property {number} toleranceMs
 * @property {number} deltaMs
 * @property {boolean} isWin
 * @property {number} ts
 */

function rankCompare(a, b) {
  const da = Math.abs(a.deltaMs);
  const db = Math.abs(b.deltaMs);
  if (da !== db) return da - db;
  if (a.isWin !== b.isWin) return a.isWin ? -1 : 1;
  return a.ts - b.ts;
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHTML(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

function formatRelative(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} d ago`;
}

function rowHtml(entry, rank) {
  const isNew = entry.id === lastEntryId;
  const cls = isNew ? "lb-row is-new" : "lb-row";
  const targetSec = +(entry.targetMs / 1000).toFixed(2);
  const where = entry.location ? ` · ${escapeHTML(entry.location)}` : "";
  const meta = `${targetSec}s target · ${entry.toleranceMs}ms · ${formatRelative(entry.ts)}`;

  return `
    <li class="${cls}" data-rank="${rank}" data-id="${entry.id}">
      <span class="lb-rank" aria-label="Rank ${rank}">${rank}</span>
      <span class="lb-name">
        ${escapeHTML(entry.name || "Player")}${where}
        <span class="lb-name-meta">${escapeHTML(meta)}</span>
      </span>
      <span class="lb-time" aria-label="Stopped at">
        ${formatTime(entry.elapsedMs)}
      </span>
      <span class="lb-delta ${entry.isWin ? "is-win" : "is-lose"}">
        <span class="lb-delta-dot" aria-hidden="true"></span>
        ${formatDelta(entry.deltaMs)}
      </span>
    </li>`;
}

function render() {
  if (!elList) return;
  const sorted = [...entries].sort(rankCompare).slice(0, MAX_VISIBLE);

  if (sorted.length === 0) {
    elList.innerHTML = "";
    elList.hidden = true;
    if (elEmpty) elEmpty.hidden = false;
  } else {
    elList.hidden = false;
    if (elEmpty) elEmpty.hidden = true;
    elList.innerHTML = sorted.map((e, i) => rowHtml(e, i + 1)).join("");
  }

  if (elCount) {
    const n = entries.length;
    elCount.textContent = `${n} ${n === 1 ? "entry" : "entries"}`;
  }
  if (elClearBtn) elClearBtn.disabled = entries.length === 0;
}

function clearBoard() {
  if (entries.length === 0) return;
  const ok = window.confirm(
    "Clear the leaderboard? This wipes all recorded attempts.",
  );
  if (!ok) return;
  entries = [];
  save("leaderboard", entries);
  lastEntryId = null;
  render();
}

/**
 * Returns the rank a hypothetical entry with this delta would receive,
 * or 0 if it wouldn't make the visible top 10.
 */
function projectRank(deltaMs, isWin) {
  const probe = {
    id: "__probe__",
    deltaMs,
    isWin,
    ts: Date.now(),
  };
  const ranked = [...entries, probe].sort(rankCompare);
  const idx = ranked.findIndex((e) => e.id === "__probe__");
  if (idx < 0) return 0;
  if (idx >= MAX_VISIBLE) return 0;
  return idx + 1;
}

async function onAttempt(payload) {
  const { elapsedMs, targetMs, toleranceMs, deltaMs, isWin } = payload;
  const projectedRank = projectRank(deltaMs, isWin);
  if (projectedRank === 0) return; // didn't make the visible board

  const totalAfter = Math.min(MAX_VISIBLE, entries.length + 1);

  // Ask the user for their name. If they skip, drop the attempt.
  const result = await promptForName({
    elapsedMs,
    targetMs,
    deltaMs,
    isWin,
    projectedRank,
    totalAfter,
  });
  if (!result) return;

  const entry = {
    id: makeId(),
    name: result.name || "Player",
    location: result.location || "",
    elapsedMs,
    targetMs,
    toleranceMs,
    deltaMs,
    isWin,
    ts: Date.now(),
  };
  lastEntryId = entry.id;

  entries.push(entry);
  entries.sort(rankCompare);
  if (entries.length > MAX_STORED) entries.length = MAX_STORED;
  save("leaderboard", entries);
  render();
}

export function initLeaderboard() {
  elList = document.getElementById("lbList");
  elCount = document.getElementById("lbCount");
  elEmpty = document.getElementById("lbEmpty");
  elClearBtn = document.getElementById("btnClearLeaderboard");
  if (!elList) {
    console.warn("[leaderboard] list element not found");
    return;
  }

  entries = load("leaderboard", []) || [];
  // Strip any legacy bad entries.
  entries = entries.filter(
    (e) =>
      e && typeof e.deltaMs === "number" && typeof e.elapsedMs === "number",
  );
  render();

  bus.on("sw:stop", onAttempt);
  elClearBtn?.addEventListener("click", clearBoard);
}
