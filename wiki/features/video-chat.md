# Video chat
## What it does
Anonymous 1-to-1 video with strangers: 18+ and terms gate, Start, Skip, Stop, Report, Block, interest tags.
## How it works
`src/VideoPage.jsx` opens one WebSocket on Start, joins with a random device id, and runs WebRTC with the ICE servers the backend sends. Android and iOS wrap the same build with Capacitor.
## Tests
`pnpm test:e2e` with frontend and backend running.
## Limits
No video moderation. Device ids can be reset by clearing app data.
