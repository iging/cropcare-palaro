/**
 * Name-entry modal for the leaderboard.
 *
 * Public API:
 *   await promptForName({ elapsedMs, targetMs, deltaMs, isWin, projectedRank })
 *
 * Resolves with `{ name, location }` when the user submits, or `null` when
 * they skip / dismiss (Escape, backdrop, X button, "Skip" ghost button).
 *
 * The modal is its own focus trap, restores focus on close, and locks
 * background scroll while open.
 */
import { formatDelta, formatTime } from "./format.js";

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled])," +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let elModal, elPanel, elForm, elName, elLocation;
let elElapsed, elTarget, elDelta, elRank, elTitle, elSub, elEyebrow;
let lastFocused = null;
let pending = null; // { resolve }
let lastName = "";

function getFocusable() {
  return Array.from(elPanel.querySelectorAll(FOCUSABLE)).filter(
    (n) => !n.hasAttribute("hidden") && n.offsetParent !== null,
  );
}

function onKey(e) {
  if (!isOpen()) return;
  if (e.key === "Escape") {
    e.preventDefault();
    resolveAndClose(null);
    return;
  }
  if (e.key === "Tab") {
    const items = getFocusable();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

function onClick(e) {
  if (e.target.closest("[data-modal-close]")) {
    resolveAndClose(null);
  }
}

function isOpen() {
  return elModal && !elModal.hidden;
}

function open() {
  if (!elModal) return;
  lastFocused = document.activeElement;
  elModal.hidden = false;
  elModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => elName?.focus());
}

function close() {
  if (!elModal) return;
  elModal.hidden = true;
  elModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (lastFocused && typeof lastFocused.focus === "function") {
    lastFocused.focus();
  }
}

function resolveAndClose(value) {
  const p = pending;
  pending = null;
  close();
  p?.resolve(value);
}

function paintRank(rank, totalAfter) {
  if (rank === 1) return "1st — leader";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank} of ${totalAfter}`;
}

function paintSummary({
  elapsedMs,
  targetMs,
  deltaMs,
  isWin,
  projectedRank,
  totalAfter,
}) {
  if (elElapsed) elElapsed.textContent = formatTime(elapsedMs);
  if (elTarget) elTarget.textContent = formatTime(targetMs);
  if (elDelta) {
    elDelta.textContent = formatDelta(deltaMs);
    elDelta.classList.toggle("is-win", !!isWin);
    elDelta.classList.toggle("is-lose", !isWin);
  }
  if (elRank) elRank.textContent = paintRank(projectedRank, totalAfter);

  // Tone the headline differently for top-3 vs further-down placements.
  if (elEyebrow) {
    elEyebrow.textContent =
      projectedRank === 1
        ? "New leader"
        : projectedRank <= 3
          ? "Podium finish"
          : "Leaderboard entry";
  }
  if (elTitle) {
    elTitle.textContent =
      projectedRank === 1
        ? "You took the top spot."
        : isWin
          ? "Perfect stop. You made the board."
          : "Close enough — you made the board.";
  }
  if (elSub) {
    elSub.textContent =
      "Add your name to claim the spot. Skip to keep this attempt private.";
  }
}

/**
 * Show the modal and return a Promise.
 * @param {{ elapsedMs:number, targetMs:number, deltaMs:number,
 *           isWin:boolean, projectedRank:number, totalAfter:number }} info
 * @returns {Promise<{ name:string, location:string }|null>}
 */
export function promptForName(info) {
  if (!elModal) {
    console.warn("[name-modal] not initialized");
    return Promise.resolve(null);
  }
  if (pending) {
    // If something is already pending, resolve it as null first.
    resolveAndClose(null);
  }

  paintSummary(info);
  if (elName) elName.value = lastName; // recall previous entry within session
  if (elLocation) elLocation.value = "";

  return new Promise((resolve) => {
    pending = { resolve };
    open();
  });
}

export function initNameModal() {
  elModal = document.getElementById("nameModal");
  elPanel = elModal?.querySelector(".modal-panel");
  elForm = document.getElementById("nameModalForm");
  elName = document.getElementById("nmName");
  elLocation = document.getElementById("nmLocation");

  elElapsed = document.getElementById("nmElapsed");
  elTarget = document.getElementById("nmTarget");
  elDelta = document.getElementById("nmDelta");
  elRank = document.getElementById("nmRank");
  elTitle = document.getElementById("nameModalTitle");
  elSub = document.getElementById("nameModalSub");
  elEyebrow = document.getElementById("nameModalEyebrow");

  if (!elModal || !elForm || !elName) {
    console.warn("[name-modal] markup missing — leaderboard prompt disabled");
    return;
  }

  elModal.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);

  elForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = (elName.value || "").trim().slice(0, 20);
    const location = (elLocation?.value || "").trim().slice(0, 32);
    if (!name) {
      elName.focus();
      return;
    }
    lastName = name;
    resolveAndClose({ name, location });
  });
}
