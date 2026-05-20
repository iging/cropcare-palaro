/**
 * Settings modal: open/close + focus trap + Escape + backdrop dismiss.
 * The settings form itself is a separate partial mounted inside the modal.
 */

let elModal,
  elPanel,
  lastFocused = null;

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled])," +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable() {
  return Array.from(elPanel.querySelectorAll(FOCUSABLE)).filter(
    (n) => !n.hasAttribute("hidden") && n.offsetParent !== null,
  );
}

function onKey(e) {
  if (!isOpen()) return;
  if (e.key === "Escape") {
    e.preventDefault();
    close();
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
    close();
  }
}

export function isOpen() {
  return elModal && !elModal.hidden;
}

export function open() {
  if (!elModal || isOpen()) return;
  lastFocused = document.activeElement;
  elModal.hidden = false;
  elModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  // Focus the first interactive control inside the panel.
  requestAnimationFrame(() => {
    const items = getFocusable();
    if (items.length > 0) items[0].focus();
  });
}

export function close() {
  if (!elModal || !isOpen()) return;
  elModal.hidden = true;
  elModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (lastFocused && typeof lastFocused.focus === "function") {
    lastFocused.focus();
  }
}

export function toggle() {
  isOpen() ? close() : open();
}

export function initModal() {
  elModal = document.getElementById("settingsModal");
  elPanel = elModal?.querySelector(".modal-panel");
  const opener = document.getElementById("btnSettings");
  if (!elModal || !elPanel) {
    console.warn("[modal] settings modal not found");
    return;
  }

  opener?.addEventListener("click", open);
  elModal.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);

  // Global "S" shortcut to open settings (when not typing in a field).
  document.addEventListener("keydown", (e) => {
    if (e.key !== "s" && e.key !== "S") return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    toggle();
  });

  // After a successful settings submit we auto-close for a smoother flow.
  document.getElementById("settingsForm")?.addEventListener("submit", () => {
    // settings.js handles the actual apply on submit; we just close shortly after.
    setTimeout(close, 60);
  });
}
