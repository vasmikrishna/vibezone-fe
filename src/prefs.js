// Call preferences kept in localStorage; savePrefs applies a patch and every component using usePrefs sees it at once.
import { useSyncExternalStore } from 'react';

export const DEFAULT_PREFS = { layout: 'focus', recordType: 'video', recordQuality: 'standard', recordFormat: 'auto' };
const ALLOWED = {
  layout: ['focus', 'split'],
  recordType: ['video', 'reel', 'audio'],
  recordQuality: ['low', 'standard', 'high'],
  recordFormat: ['auto', 'webm', 'mp4'],
};
const KEY = 'vibezonePrefs';

function load() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    // private mode or bad JSON: defaults
  }
  const prefs = { ...DEFAULT_PREFS };
  for (const key of Object.keys(ALLOWED)) if (ALLOWED[key].includes(saved[key])) prefs[key] = saved[key];
  return prefs;
}

let current = load();
/** The current preferences (also right in private mode, where localStorage can't save them). */
export const readPrefs = () => current;
const listeners = new Set();
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

function savePrefs(patch) {
  const next = { ...current };
  for (const key of Object.keys(patch)) if (ALLOWED[key]?.includes(patch[key])) next[key] = patch[key];
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // not persisted in private mode; still applies for this visit
  }
  listeners.forEach((fn) => fn());
}

export function usePrefs() {
  return [useSyncExternalStore(subscribe, () => current), savePrefs];
}
