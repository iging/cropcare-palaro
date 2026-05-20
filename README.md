# CropCare Palaro

A precision-timing stopwatch game where you stop the clock at the exact target moment, with no on-screen hints while it runs.

## Project Overview

CropCare Palaro is a browser-based reflex game built as a fully static single-page app. A player configures a target time and a tolerance, starts the stopwatch, and tries to stop it within `target ± tolerance` purely from their internal sense of timing — the dial deliberately shows no progress arc, no tolerance band, and an optional "Blind" mode hides the live readout entirely. Wins paint the dial green and trigger a confetti burst; misses paint it red. Qualifying attempts open a name-entry modal and earn a slot on a persistent local leaderboard.

The app is intended for in-person events and casual practice: it has zero build step, zero runtime dependencies, runs from a tiny Node static server, and stores all state on the player's device via `localStorage`. It is suitable for kiosks, booth demos, classroom challenges, and anyone who wants to drop a self-contained timing game on a laptop without a toolchain.

## Key Features

- Sub-millisecond timing engine driven by `performance.now()` and `requestAnimationFrame` (`js/stopwatch.js`).
- Configurable target time (1 to 600 s) and tolerance (0 to 500 ms) with `localStorage` persistence (`js/settings.js`).
- "Visible" and "Blind" display modes — Blind hides the live time for a sharper challenge.
- Hand-drawn SVG dial with 60 minor and 12 major tick marks, win/lose color states, and a centered time readout (`js/dial.js`).
- Win celebration: lightweight canvas confetti, anchored on the dial, that respects `prefers-reduced-motion` (`js/confetti.js`).
- Stats tiles: Wins, Best Delta, Last Delta, Attempts — with reset action and self-healing backfill from the leaderboard for upgrades from older versions (`js/stats.js`).
- Local leaderboard, top-5 visible / top-50 stored, ranked by closest delta with win-over-loss and earlier-timestamp tiebreakers (`js/leaderboard.js`).
- Name-entry modal that only opens when an attempt would actually make the visible board, with focus trap, Escape/backdrop dismiss, and skip-to-keep-private flow (`js/name-modal.js`).
- Settings modal with focus trap, Tab cycling, Escape to close, backdrop click to dismiss, and a global `S` keyboard shortcut (`js/modal.js`).
- Single-key gameplay: `Space` toggles Start / Stop globally (suppressed inside form fields) (`js/controls.js`).
- Status pill in the topbar that mirrors the stopwatch phase (Ready / Running / Win / Missed) (`js/status.js`).
- Resilient storage adapter with in-memory fallback for private-browsing, `file://`, or quota-blocked environments (`js/storage.js`).
- Modular HTML composition: every UI region is fetched as an HTML partial and injected into a `data-mount` slot, with multi-pass support for nested mount points (`js/partials.js`).
- Zero-cache dev server (`serve.cjs`) and `?v=` cache-busting on the CSS/JS entry points so edits show up on every refresh.

## Tech Stack

Runtime

- HTML5, CSS3, ES Modules (no transpiler, no bundler).
- Vanilla JavaScript across 16 single-responsibility modules under `js/`.
- SVG for the dial, Canvas 2D for confetti.
- `localStorage` (with in-memory fallback) for settings, stats, and leaderboard persistence.
- Google Fonts: Inter (400–800), JetBrains Mono (500–700).

Tooling

- Node.js (18+) only as a dev-time static file server. The repo has no production dependencies and no `dependencies` / `devDependencies` block in `package.json`.
- A 36-line zero-dependency Node HTTP server (`serve.cjs`) that serves files relative to the repo root, sets `Cache-Control: no-store`, and listens on port 5173.

State and architecture

- Custom pub/sub bus + shared state object (`js/state.js`) — no Redux, no Context, no framework.
- Partial loader with a 6-pass nesting resolver (`js/partials.js`).

## Installation & Setup

Prerequisites: Node.js 18 or newer. The app uses ES modules and `fetch()` to load HTML partials, so it must be served over HTTP — opening `index.html` directly via `file://` will fail (the boot handler renders a friendly error pointing to this README).

```bash
# 1. Clone the repository
git clone https://github.com/<your-org>/cropcare-palaro.git
cd cropcare-palaro

# 2. There is nothing to install. The repo has no dependencies.
#    Optional sanity check:
node --version    # should print v18 or higher

# 3. Start the dev server
npm start
# or, equivalently:
node serve.cjs
```

Then open http://localhost:5173/ in any modern browser.

Stop the server with `Ctrl+C`.

VS Code Live Server also works, but keep DevTools open with **Network → Disable cache** ticked, otherwise the browser may serve stale modules while you iterate. The bundled `serve.cjs` already sends `Cache-Control: no-store` on every response.

## Usage

Playing a round

1. Click the gear icon in the topbar, or press `S`, to open Settings.
2. Set **Target time** (1 – 600 s) and **Tolerance** (0 – 500 ms), pick **Visible** or **Blind**, then click **Apply settings**. Values are validated, clamped, and persisted to `localStorage`.
3. Click **Start**, or press `Space`, to begin the run.
4. Click **Stop**, or press `Space` again, when you believe the target moment has arrived.

Outcome

- An attempt is a **win** when `|elapsed − target| ≤ tolerance`. The dial turns green, the result banner reads "Perfect stop.", and confetti fires.
- Otherwise the dial turns red and the banner reads "A touch early." or "A touch late." based on the sign of the delta.
- The stats tiles update on every stop. Best Delta tracks the smallest absolute miss across all attempts.

Leaderboard

- After every stop, the app projects where this attempt would land. If it would appear in the visible top 5, the name-entry modal opens.
- Submit a name (and optional location) to claim the slot, or press Escape / click outside / use **Skip** to discard the attempt without saving.
- Up to 50 entries are stored locally; only the top 5 are rendered, ranked by `|deltaMs|` ascending, with wins beating losses on ties and earlier timestamps breaking further ties.
- **Clear leaderboard** (with confirmation) wipes all stored entries.

Keyboard shortcuts

- `Space` — Start / Stop (ignored inside `<input>` and `<textarea>`).
- `S` — Toggle the Settings modal (ignored when typing or when modifier keys are held).
- `Esc` — Close any open modal.
- `Tab` / `Shift+Tab` — Cycle focus inside an open modal (focus is trapped).

Snippet — programmatic access to the state bus from the browser console:

```js
// All state changes flow through one bus. You can subscribe from devtools:
import("./js/state.js").then(({ bus, state }) => {
  console.log("current phase:", state.phase);
  bus.on("sw:stop", (r) => console.log("stop result", r));
});
```

## Architecture Brief

Folder layout

```
cropcare-palaro/
├── index.html              # Shell with empty data-mount slots only
├── serve.cjs               # 36-line static dev server, port 5173
├── package.json            # No deps; just `start` / `dev` scripts
├── partials/               # Nine HTML fragments, one per UI region
│   ├── topbar.html
│   ├── hero.html
│   ├── stopwatch.html      # Dial, primary/reset buttons, result banner
│   ├── stats.html          # Wins / Best / Last / Attempts tiles
│   ├── leaderboard.html
│   ├── settings.html       # Form lives inside settings, mounted into modal
│   ├── modal.html          # Settings dialog frame (nests settings.html)
│   ├── name-modal.html     # Leaderboard name-entry dialog
│   └── footer.html
├── css/
│   ├── main.css            # Single import entry
│   ├── tokens.css          # Design tokens (colors, fonts, spacing)
│   ├── base.css
│   ├── layout.css
│   ├── responsive.css
│   └── components/         # 13 self-contained component stylesheets
└── js/                     # 16 ES modules, one concern per file
```

Boot flow (data flow from `index.html` to interactivity)

1. `index.html` loads `css/main.css` and the single ES module entry point `js/main.js`. The shell contains nothing but `<div data-mount="...">` slots inside an `.app > .main > .stage` skeleton.
2. `js/main.js#boot` first awaits `mountPartials()` from `js/partials.js`. That function fetches every HTML fragment listed in its `PARTIALS` map, injects each into its matching slot, and re-scans for newly revealed slots up to 6 times so nested mounts (for example `modal` → `settings`) resolve correctly. Each fetch is cache-busted with `?t=Date.now()`.
3. With the DOM stable, `boot()` initializes feature modules in a deliberate order: `initSettings()` first to hydrate state from `localStorage` before the dial paints, then `initStatus`, `initDial`, `initStats`, `initNameModal`, `initLeaderboard`, `initResult`, `initControls`, `initModal`, and `initConfetti`.
4. If anything throws during boot, the `.catch` handler renders a styled inline error pointing the user back to the `npm start` flow.

State management — the system that replaces a framework

`js/state.js` exports three things:

- `bus` — a `Map<string, Set<Listener>>` pub/sub object with `on`, `off`, `emit`. Listener errors are swallowed and logged so a broken subscriber cannot break the chain.
- `state` — a single shared object holding `phase`, `elapsedMs`, `settings`, and `stats`.
- `setState(patch)` — shallow-merges a patch into `state` and emits a `'state'` event.

Two event families flow over the bus:

- Stopwatch lifecycle: `sw:start`, `sw:tick` (per frame, payload `elapsedMs`), `sw:stop` (payload `{ elapsedMs, targetMs, toleranceMs, deltaMs, isWin }`), `sw:reset`.
- Cross-cutting: `state` (any merged patch), `settings:changed` (payload is the new settings object).

The hot path inside `stopwatch.js#tick` mutates `state.elapsedMs` directly and emits `sw:tick` rather than calling `setState`, to avoid notifying every `'state'` subscriber on every animation frame.

Module interactions

| Module              | Reads                                         | Subscribes to                                                    | Emits                                                                  |
| ------------------- | --------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `js/main.js`        | —                                             | —                                                                | —                                                                      |
| `js/partials.js`    | `partials/*.html`                             | —                                                                | —                                                                      |
| `js/state.js`       | —                                             | —                                                                | `state`                                                                |
| `js/stopwatch.js`   | `state.settings`                              | —                                                                | `sw:start`, `sw:tick`, `sw:stop`, `sw:reset`, `state` (via `setState`) |
| `js/controls.js`    | `state.phase`, `state.elapsedMs`              | `state`                                                          | calls `sw.start` / `sw.stop` / `sw.reset`                              |
| `js/dial.js`        | `state.settings`                              | `sw:start`, `sw:tick`, `sw:stop`, `sw:reset`, `settings:changed` | —                                                                      |
| `js/settings.js`    | `localStorage`                                | —                                                                | `settings:changed`, `state`                                            |
| `js/stats.js`       | `localStorage`, leaderboard backfill          | `sw:stop`, `sw:reset`, `settings:changed`, `state`               | `state`                                                                |
| `js/leaderboard.js` | `localStorage`                                | `sw:stop`                                                        | —                                                                      |
| `js/name-modal.js`  | DOM only                                      | —                                                                | resolves a Promise consumed by leaderboard                             |
| `js/result.js`      | —                                             | `sw:stop`, `sw:start`, `sw:reset`                                | —                                                                      |
| `js/status.js`      | `state.phase`                                 | `state`                                                          | —                                                                      |
| `js/confetti.js`    | DOM rect of `#dial`                           | `sw:stop`                                                        | —                                                                      |
| `js/modal.js`       | DOM only                                      | —                                                                | —                                                                      |
| `js/storage.js`     | `localStorage` (key: `cropcare-stopwatch.v1`) | —                                                                | —                                                                      |
| `js/format.js`      | —                                             | —                                                                | —                                                                      |

This means each module can be removed or replaced in isolation: `confetti.js` could be deleted without touching any other file, `leaderboard.js` could be swapped for a remote-API variant by re-implementing only the `onAttempt` handler, and the dial could be re-skinned by editing `js/dial.js` and `css/components/dial.css` alone.

Persistence model

A single `localStorage` key (`cropcare-stopwatch.v1`) holds a JSON object whose top-level fields are `settings`, `stats`, and `leaderboard`. `js/storage.js` mediates all reads/writes, caches the parsed object in memory, and silently falls back to memory-only mode when storage throws (private browsing, `file://`, quota). `js/leaderboard.js` caps stored entries at 50 and visible at 5; `js/settings.js` clamps ranges and drops legacy keys (e.g. an older `playerName`) on load; `js/stats.js` backfills `lastDeltaMs` from the leaderboard if the stats record predates that field.

Cache strategy for development

Because there is no bundler, browsers must always pick up the latest source. Three layers cooperate:

- `serve.cjs` sets `Cache-Control: no-store` on every response.
- `index.html` versions both entry points (`css/main.css?v=5`, `js/main.js?v=6`); `css/main.css` versions every imported stylesheet the same way.
- `js/partials.js` appends `?t=<timestamp>` to every partial fetch and passes `cache: "no-store"` to `fetch`.

Bumping the `?v=` numbers is the standard workflow when shipping a CSS/JS change behind a CDN that ignores `Cache-Control`.
