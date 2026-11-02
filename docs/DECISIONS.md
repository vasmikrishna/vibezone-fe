# Decisions

## 2026-11-02 — Stay on JSX + MUI

The workspace standard is TypeScript + Tailwind + shadcn/ui, but this app is small, already built on JSX and MUI, and the launch fixes were about correctness (sockets, WebRTC, safety). A migration would have doubled the diff and risk for no user-facing gain. Revisit if the app grows. `react/prop-types` is turned off in ESLint because the project does not use PropTypes.

## 2026-11-02 — Remove Firebase

Firebase was only used for analytics and push notifications. Analytics conflicted with the privacy promise (anonymous, no trackers), push needed a service worker and a notification prompt on first load, and neither was required for the product. Removing it (with react-ga and GTM) cut the bundle and the data we collect.

## 2026-11-02 — ICE servers come from the server

The client uses only the `iceServers` sent in `ready`, so TURN credentials are never shipped in the bundle and can be rotated server-side.

## 2026-11-02 — Package the web app with Capacitor

Stores need a native app, and the product is one WebRTC page that already works in a browser. Capacitor wraps the existing Vite build in a system webview with no app-logic changes (React Native or Flutter would mean a rewrite). Web assets ship inside the app (no `server.url`), so the bundle is reviewed with the app and works from `capacitor://localhost` (iOS) and `https://localhost` (Android). The config is `capacitor.config.json` to avoid adding TypeScript just for it. iOS uses Swift Package Manager (the CLI default). Icons are generated one-off with `@capacitor/assets` from `assets/`, not added as a dependency.

## 2026-11-02 — Private rooms share the random chat call code

Rooms reuse the same socket messages (`matched`, `offer`, `answer`, `candidate`, `chat`, `partnerLeft`), so the peer connection, media and chat logic moved into one hook, `src/useCall.js`, and the video, controls, chat and report dialog into `src/CallView.jsx`. Pages differ only in the join message, extra messages (`roomState`, `roomClosed`) handled through `onMessage`, and what happens when a call fails (random chat sends `skip`; rooms wait for the host). One implementation keeps the WebRTC fixes in one place.

## 2026-11-02 — iOS ships rooms only

Apple guideline 1.2 rules out random or anonymous chat, so on native iOS (`Capacitor.getPlatform() === 'ios'`) `/` and `/chat` redirect to `/rooms` and the Start button becomes Browse rooms. Rooms need a phone account with an 18+ date of birth, and offer report, block and in-app account deletion, which App Review expects. Android and the web keep random chat.

## 2026-11-02 — Phone login with a token in localStorage

Accounts use phone number + SMS code (no passwords, no Supabase Auth). The backend issues a 30 day JWT, stored as `vibezoneToken` in `localStorage` and sent as a Bearer header; cookies would need cross-site settings for the Capacitor origins. The REST base URL is derived from `VITE_SERVER_URL` (`ws` → `http`), as the API runs on the same server as the socket.
