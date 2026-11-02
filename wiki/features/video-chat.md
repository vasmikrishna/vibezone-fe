# Video chat
## What it does
Anonymous 1-to-1 video with strangers: 18+ and terms gate, Start, Skip, Stop, Report, Block, interest tags (key words), display name and text chat with the partner.
## How it works
`src/VideoPage.jsx` opens one WebSocket on Start, joins with a random device id, and runs WebRTC with the ICE servers the backend sends. Text chat goes over the same socket (`chat`/`chatSent`); messages are rendered as text only and cleared when the call ends. The name is kept in `localStorage` (`vibezoneName`) and sent with `join`. Android and iOS wrap the same build with Capacitor.
## Tests
`pnpm test:e2e` with frontend and backend running: calls, skip, block, report, chat both ways, partner name, chat cleared on skip, HTML shown as text, onboarding tour.
## Limits
No video moderation; the chat word filter is a small list. Device ids can be reset by clearing app data.
