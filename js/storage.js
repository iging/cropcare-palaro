/**
 * Thin localStorage wrapper. Falls back to in-memory storage if the API
 * is unavailable (private browsing, file://, etc.).
 */

const KEY = "cropcare-stopwatch.v1";

/** @type {Record<string, any>} */
let memCache = null;

function readAll() {
  if (memCache) return memCache;
  try {
    const raw = window.localStorage.getItem(KEY);
    memCache = raw ? JSON.parse(raw) : {};
  } catch {
    memCache = {};
  }
  return memCache;
}

function writeAll(obj) {
  memCache = obj;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(obj));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function load(key, fallback) {
  const all = readAll();
  return key in all ? all[key] : fallback;
}

export function save(key, value) {
  const all = readAll();
  all[key] = value;
  writeAll(all);
}

export function clearAll() {
  memCache = {};
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
