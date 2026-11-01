import { BIND_ACTIONS, DEFAULT_BINDINGS } from "../core/inputmap.js";

const KEY = "mechpitbrawl.settings.v1";

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeBinding(raw, fallback) {
  const next = { ...fallback };
  if (!raw || typeof raw !== "object") return next;
  for (const action of BIND_ACTIONS) {
    if (typeof raw[action] === "string" && raw[action].length > 0 && raw[action].length < 32) {
      next[action] = raw[action];
    }
  }
  return next;
}

export function defaultSettings() {
  return {
    volume: 0.8,
    muted: false,
    roundCount: 3,
    bindings: DEFAULT_BINDINGS.map((binding) => ({ ...binding })),
  };
}

export function loadSettings() {
  const defaults = defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      volume: clamp(parsed.volume, 0, 1, defaults.volume),
      muted: !!parsed.muted,
      roundCount: Math.round(clamp(parsed.roundCount, 1, 9, defaults.roundCount)),
      bindings: defaults.bindings.map((binding, index) => sanitizeBinding(parsed.bindings?.[index], binding)),
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private browsing can reject storage; the match still runs.
  }
}
