import { useCallback, useEffect, useRef } from 'react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const MAX_RETRY_MS = 30000;

/**
 * App socket for friends (messages, read receipts, typing, presence) while signed in.
 * subscribe(fn) gets every server event plus { type: 'reconnect' } after a dropped socket is back,
 * so pages can refetch what they missed. Reconnects with backoff; never after 'unauthorized'.
 */
export function useFriendsSocket(token) {
  const listeners = useRef(new Set());
  const wsRef = useRef(null);

  useEffect(() => {
    if (!token || !SERVER_URL) return undefined;
    let ws;
    let timer;
    let delay = 1000;
    let stopped = false;
    let welcomed = false;
    const emit = (event) => listeners.current.forEach((fn) => fn(event));
    const connect = () => {
      try {
        ws = new WebSocket(SERVER_URL);
      } catch {
        return; // invalid URL: the friends page still works over REST
      }
      wsRef.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', token }));
      ws.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (!data || typeof data.type !== 'string') return;
        if (data.type === 'welcome') {
          delay = 1000;
          if (welcomed) emit({ type: 'reconnect' });
          welcomed = true;
        } else if (data.type === 'error') {
          if (data.message === 'unauthorized') stopped = true;
        } else {
          emit(data);
        }
      };
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        if (stopped) return;
        timer = setTimeout(connect, delay);
        delay = Math.min(delay * 2, MAX_RETRY_MS);
      };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      ws?.close();
      wsRef.current = null;
    };
  }, [token]);

  const subscribe = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);
  const sendTyping = useCallback((to) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'typing', to }));
  }, []);
  return { subscribe, sendTyping };
}
