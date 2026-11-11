import { Capacitor } from '@capacitor/core';

const KEY = 'vibezoneRef';

// Runs at import (from main.jsx), before any route redirect drops the query string.
const ref = new URLSearchParams(window.location.search).get('ref');
if (ref && /^[0-9a-f]{10}$/.test(ref)) {
  try { localStorage.setItem(KEY, ref); } catch { /* storage blocked: the invite is just not remembered */ }
}

export function getRef() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function clearRef() {
  try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
}

const ORIGIN = Capacitor.isNativePlatform() ? 'https://vibezone.varchas.store' : window.location.origin;
export const inviteLink = (code) => `${ORIGIN}/login?ref=${code}`;
