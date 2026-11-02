# Changelog

## Unreleased — launch readiness (#35)

- One WebSocket per Start, `join` with a random device id and tags, reconnect with backoff (1s → 30s).
- Handles `ready` (ICE servers from the server), `banned`, `partnerLeft` and `error`; no hardcoded STUN/TURN credentials.
- Calls: single camera/mic acquisition reused across calls, ICE candidate queueing, remote video always mounted, skip on failed/disconnected connections, mute/camera state kept across calls, camera switch via `replaceTrack`.
- Report (with reason) and Block during a call.
- 18+ and Terms/Privacy consent gate; `/terms` and `/privacy` pages.
- Tags are trimmed, lowercased, limited to 10 × 30 chars; shared tags shown on match.
- Mobile-first layout with safe-area insets and status text.
- Removed Firebase, react-ga, Google Tag Manager, early-access form, IP extraction and debug code.
- Android and iOS apps (Capacitor, `in.vibezone.app`): `pnpm mobile:sync`, camera/mic permissions, icons and splash from the logo (`assets/`), native-aware permission-denied message. See `docs/STORE_RELEASE.md`.
- Server URL from `VITE_SERVER_URL`, contact from `VITE_CONTACT_EMAIL` (see `.env.example`).
