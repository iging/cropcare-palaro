/**
 * Time formatting helpers. Pure functions, no DOM.
 */

/** Pads a number with leading zeros. */
const pad = (n, w = 2) => String(Math.trunc(n)).padStart(w, "0");

/**
 * Format ms → "MM:SS.mmm".
 * @param {number} ms
 * @returns {string}
 */
export function formatTime(ms) {
  ms = Math.max(0, ms);
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const millis = Math.floor(ms % 1000);
  return `${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
}

/**
 * Splits formatted time into the integer portion and a milliseconds suffix
 * (handy for styling the tail differently in the dial readout).
 * @param {number} ms
 * @returns {{ head: string, ms: string }}
 */
export function splitTime(ms) {
  const full = formatTime(ms);
  const [head, tail] = full.split(".");
  return { head, ms: "." + tail };
}

/**
 * Format a signed delta in milliseconds, e.g. "+12 ms" / "−24 ms".
 * @param {number} deltaMs
 */
export function formatDelta(deltaMs) {
  const sign = deltaMs > 0 ? "+" : deltaMs < 0 ? "\u2212" : "\u00B1";
  return `${sign}${Math.abs(Math.round(deltaMs))} ms`;
}
