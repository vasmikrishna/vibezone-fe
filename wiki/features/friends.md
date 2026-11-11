# Friends and messages

## What it does
Signed-in users see their friends on `/friends` with three tabs: Friends, Requests and Sent. Requests can be accepted or declined and sent requests cancelled. Friends are added from a video call, or by inviting someone with your link (see Invites below).

Each friend row shows the photo or initial with an online dot (hollow grey when offline), the name, and a second line: "typing…" while they type, else the last message ("You: …" for yours), else their status ("Online", "Online · in a call", "Last seen 2 hours ago") and streak. The right side shows the time of the last message and an unread count. A search box filters the list by name. Friends with the newest message come first.

Tapping a friend opens the chat at `/friends/:id`: a header with a back link (below 1024px), the online status and a More options menu with Remove friend; day dividers (Today, Yesterday, then dates); bubbles grouped per sender within five minutes; Delivered or Seen under your last message of a group; a typing indicator; "Load earlier messages"; and a composer (500 characters, Enter sends). Opening a chat marks its messages as read while the page is visible.

Below 1024px the list and the chat are separate screens. From 1024px they sit side by side, with "Select a friend to start chatting" until one is chosen. A chat with someone who is not a friend shows "You are not friends with this person" and a link back.

The sidebar Friends item, the menu button and the bottom Friends tab show unread messages plus friend requests. Signed-in users get the Friends tab in place of Settings; signed-out users keep Settings.

## How it works
- `src/useFriendsSocket.js` (used once in `AppLayout`): while a token exists it opens a WebSocket to `VITE_SERVER_URL`, sends `{ type: 'hello', token }`, and reconnects with backoff from 1 s up to 30 s, but never after an `unauthorized` error. It closes on sign-out. `useApp()` exposes `subscribe(fn)` (server events `message`, `read`, `typing`, `presence`, plus `{ type: 'reconnect' }` after a dropped socket is back) and `sendTyping(to)`.
- `AppLayout` reads `{ incoming, unread }` from `GET /api/friends/count` on each route change, each minute while visible, and on `message` or `read` events; `useApp()` gives `friendRequests` and `unread`.
- `src/Friends.jsx` owns the list (`GET /api/friends`), the search, the typing state (shown for 4 s after the last `typing` event) and the live updates: `message` moves the friend to the top with the preview and unread count, `read` clears the unread count when you were the reader, `presence` updates the dot, `reconnect` refetches.
- `src/FriendThread.jsx` owns one chat: `GET /api/friends/:id/messages` (with `?before=` for earlier pages), `POST /api/friends/:id/messages` (the reply and the socket event are de-duplicated by id; on failure the text stays and the error shows in a snackbar), `POST /api/friends/:id/read`, and `typing` at most once every 2 s. The message list is a polite `role="log"`; text is plain React text.
- Styles: the friends block of `src/app.css` (`.friends`, `.friend-row`, `.thread-*`).

## Invites
- `src/invite.js` (imported first in `main.jsx`) stores a valid `?ref=` (10 hex characters) from any URL in `localStorage` (`vibezoneRef`) and builds the link `<origin>/login?ref=<code>` (origin is `https://vibezone.varchas.store` in the native app).
- `src/Login.jsx` fetches `GET /api/invite/:code` and shows "<name> invited you…" (`login-invite`); a 400 or 404 forgets the code. The code goes in the `/api/auth/google` body as `ref` and is cleared after sign-in. For a new account the backend makes the two friends.
- `src/InviteCard.jsx`: the dashboard card (link `invite-link`, `invite-copy`, `invite-share` only where `navigator.share` exists, `invite-feedback`, `invite-count` from `me.referrals`) and the empty-list `friends-invite` button, both from `GET /api/me/invite`.
- Badges `invite-1`, `invite-5` and `invite-25` count invited friends who finished a first 1-minute call.

## Tests
`e2e/friends.mjs`: two users become friends in random chat; A messages B; B sees the preview, unread pill and tab count; B opens the chat and A sees Seen; A sees B typing and then the reply without a reload; no horizontal scroll at 390px on the list and the chat; at 1280px the list and chat show together; tabs update `?tab=`. Screenshots with `SHOT_DIR`: `friends-390.png`, `thread-390.png`, `friends-desktop.png`. Test ids: `friend-card`, `friend-name`, `friend-line`, `friend-unread`, `friend-presence`, `friend-search`, `friends-tab-*`, `friends-list-*`, `thread`, `thread-back`, `thread-more`, `friend-remove`, `thread-log`, `thread-message`, `thread-seen`, `thread-delivered`, `thread-typing`, `thread-earlier`, `thread-input`, `thread-send`, `thread-empty`, `thread-not-friends`, `tab-friends`, `tab-friends-count`, `app-nav-friends-count`.

## Limits
No audio or video calls between friends yet (a later phase), no emoji picker, no message editing or deletion. Messages are deleted when the friendship is removed. Keeping the view still while earlier messages load relies on browser scroll anchoring (not in older Safari).
