const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';
// The REST API is served by the same backend as the signalling socket.
const API_URL = SERVER_URL.replace(/^ws/, 'http');
const TOKEN_KEY = 'vibezoneToken';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/** JSON request to /api; throws an Error with .status (0 when the server cannot be reached). A 401 signs out. */
export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'content-type': 'application/json' }),
        ...(token && { authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw Object.assign(new Error('Could not reach the server. Check your connection and try again.'), { status: 0 });
  }
  if (res.status === 401) clearToken();
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}

export const formatDate = (iso) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
