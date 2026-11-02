# Decisions

## 2026-11-02 — Stay on JSX + MUI

The workspace standard is TypeScript + Tailwind + shadcn/ui, but this app is small, already built on JSX and MUI, and the launch fixes were about correctness (sockets, WebRTC, safety). A migration would have doubled the diff and risk for no user-facing gain. Revisit if the app grows. `react/prop-types` is turned off in ESLint because the project does not use PropTypes.

## 2026-11-02 — Remove Firebase

Firebase was only used for analytics and push notifications. Analytics conflicted with the privacy promise (anonymous, no trackers), push needed a service worker and a notification prompt on first load, and neither was required for the product. Removing it (with react-ga and GTM) cut the bundle and the data we collect.

## 2026-11-02 — ICE servers come from the server

The client uses only the `iceServers` sent in `ready`, so TURN credentials are never shipped in the bundle and can be rotated server-side.
