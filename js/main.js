/**
 * Entry point.
 * Loads HTML partials first (handles nested mounts), then wires up
 * every feature module against the now-stable DOM.
 */
import { mountPartials } from "./partials.js";
import { initStatus } from "./status.js";
import { initSettings } from "./settings.js";
import { initDial } from "./dial.js";
import { initControls } from "./controls.js";
import { initStats } from "./stats.js";
import { initResult } from "./result.js";
import { initModal } from "./modal.js";
import { initConfetti } from "./confetti.js";
import { initLeaderboard } from "./leaderboard.js";
import { initNameModal } from "./name-modal.js";

async function boot() {
  await mountPartials();

  // Settings first — it hydrates state used by the dial paint.
  initSettings();
  initStatus();
  initDial();
  initStats();
  initNameModal();
  initLeaderboard();
  initResult();
  initControls();
  initModal();
  initConfetti();
}

boot().catch((err) => {
  console.error("[cropcare-palaro] failed to boot", err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="margin:24px;padding:16px;border:1px solid #f4cfc8;
                 background:#fbe7e3;border-radius:12px;color:#7a1f15;
                 font:12px ui-monospace,monospace">
       CropCare Palaro failed to start. If you're opening this directly
       via file://, serve it over HTTP instead — see README.md.
     </pre>`,
  );
});
