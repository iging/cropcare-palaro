/**
 * Loads HTML fragments from /partials and injects them at every
 * `[data-mount="<name>"]` slot. Supports nested mount points: any partial
 * may itself contain `data-mount` slots which are filled in a second pass.
 */
const PARTIALS = {
  topbar: "partials/topbar.html",
  hero: "partials/hero.html",
  stopwatch: "partials/stopwatch.html",
  stats: "partials/stats.html",
  leaderboard: "partials/leaderboard.html",
  settings: "partials/settings.html",
  footer: "partials/footer.html",
  modal: "partials/modal.html",
  nameModal: "partials/name-modal.html",
};

async function fetchPartial(url) {
  // Cache-bust so live-reload servers always serve the latest fragment.
  const bust = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
  const res = await fetch(bust, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.text();
}

async function fillSlots(root) {
  const mounts = Array.from(root.querySelectorAll("[data-mount]"));
  if (mounts.length === 0) return false;

  await Promise.all(
    mounts.map(async (el) => {
      // Mark as processed before fetch so it isn't re-picked in a later pass.
      const name = el.dataset.mount;
      el.removeAttribute("data-mount");
      el.dataset.mounted = name;

      const url = PARTIALS[name];
      if (!url) {
        console.warn(`[partials] No URL for mount "${name}"`);
        return;
      }

      try {
        el.innerHTML = await fetchPartial(url);
      } catch (err) {
        console.error(err);
        el.innerHTML = `<div role="alert" style="padding:12px;color:#c83a2c">
            Failed to load ${name}.
          </div>`;
      }
    }),
  );

  return true;
}

export async function mountPartials(root = document) {
  // Iterate until no new mount points appear (handles nesting, e.g. modal → settings).
  let safety = 6;
  while (safety-- > 0) {
    const filled = await fillSlots(root);
    if (!filled) break;
  }
}
