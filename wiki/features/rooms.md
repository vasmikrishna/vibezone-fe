# Accounts and private rooms
## What it does
Google sign-in, a profile with name and date of birth (18+ required to book or create), account deletion, and private rooms: a host sets a start time, duration, time per person and free tickets; ticket holders queue and talk with the host 1-to-1 in turn. On iOS this is the whole app.
## How it works
- `src/api.js`: `fetch` wrapper for `/api` (base URL from `VITE_SERVER_URL`), token in `localStorage` (`vibezoneToken`), a 401 clears it.
- `src/Login.jsx`: Continue with Google (`POST /api/auth/google`); without `VITE_GOOGLE_CLIENT_ID` (native builds, local dev) it shows "Sign-in is not available here yet." New or incomplete users go to `/profile`.
- `src/Profile.jsx`: `GET`/`PATCH`/`DELETE /api/me`. Date of birth is shown only until it is accepted, because it cannot change.
- `src/Rooms.jsx`: list, book, cancel, create dialog, host cancel with confirmation. Join is enabled from 10 minutes before the start.
- `src/RoomPage.jsx`: `useCall` with `roomJoin {token, roomId}`; handles `roomState`, `roomClosed` and join errors. Host: queue, Next (after the start time), End room. Attendee: queue position, then the call with a countdown to `endsAt`.
- Shared with random chat: `src/useCall.js` (socket, WebRTC, chat) and `src/CallView.jsx` (videos, controls, chat, report dialog).
- iOS (`isIOS` in `src/Layout.jsx`): `/` and `/chat` redirect to `/rooms`.
## Tests
`pnpm test:e2e:rooms` (needs MongoDB on 27017 and the frontend on 5273 built with `VITE_SERVER_URL=ws://localhost:3101`). It starts the backend in development mode, signs users in through the dev OTP API (`/api/auth/otp`, `/api/auth/verify`, codes read from its output) and puts the token in `localStorage`.
## Limits
No payments. Date of birth is self-declared. See docs/KNOWN_ISSUES.md.
