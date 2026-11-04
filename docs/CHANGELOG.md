# Changelog

## Unreleased — camera off and on hold (#44)

- Calls now tell the partner when your camera or mic is off and when you are on hold (tab hidden, or the OS took the camera/mic, e.g. a phone call). The partner sees "… turned their camera off" with your initial, "… is on hold" with a pause icon, or a muted-mic badge instead of a black or frozen video, announced to screen readers; your own preview shows "Your camera is off". A remote video track with no frames counts as camera off for older clients.

## Unreleased — friends (#42)

- Add friend in calls (random chat and rooms): when both people are signed in, the call controls show Add friend → Request sent, Accept friend when they asked first, and Friends ✓. The other person gets a "… sent you a friend request" notice. Signed-out users see a "Sign in to add friends" link in the chat header; nothing is shown for guests. Friend errors (rate limit, blocked, guest) get readable notices.
- Friends page `/friends` (signed in): Friends / Requests / Sent tabs with counts and `?tab=requests|sent`; cards with avatar, name, streak and "Friends since"; Remove (confirmed), Accept / Decline and Cancel update at once and roll back with a snackbar if the server refuses. Empty states explain how to add friends.
- Sidebar: Friends in the Main group with an incoming-requests badge (refreshed on route change and every 60 s while visible); on phones the menu button shows the badge.
- Dashboard: Friends card with friends and pending-request counts and a Review requests link.
- `e2e/friends.mjs`: two signed-in users (token files in `TOKEN_A_FILE` / `TOKEN_B_FILE`) match, become friends and see each other on /friends; the friendship is removed afterwards.

## Unreleased — app shell and dashboard (#41)

- New app layout (`src/AppLayout.jsx`) for /dashboard, /chat, /rooms, /rooms/:id, /profile and /admin/*: dark 256px sidebar on desktop (Main / Account / Admin groups, Badges count, user card menu with Profile, Privacy, Help, Back to website, Sign out) that collapses to a 72px icon rail (remembered); below 1024px a top bar with a menu drawer and a bottom tab bar. `/api/me` loads once and is shared. Replaces `AccountSidebar.jsx`.
- New Dashboard (`src/Dashboard.jsx`): greeting, streak / best streak / calls / badges stats, Start a video chat card, your upcoming rooms, badges strip and a date-of-birth banner for users who have not added it.
- Video chat, Rooms, a room and Profile render inside the app layout with a page title; VideoPage's logo header is now a compact name / key words / Connect toolbar, and on phones the videos fill the screen between the top bar and the tabs.
- Marketing header: phones get a menu drawer instead of a wrapped row of links; signed-in visitors see "Open app" and their avatar. Login honours a same-site `?next=` path and defaults to /dashboard; signed-out visits to /dashboard, /profile, /rooms and /admin go to `/login?next=…`.
- Admin nav for admins (users in the server's `ADMIN_EMAILS`); everyone else is sent to /dashboard.
- Admin console (`src/admin/`): Overview with KPI cards, a 14-day calls / signups chart, latest open reports and 30 s auto-refresh; Reports with status tabs and a review drawer (chat transcript, Resolve / Dismiss / Reopen, Ban reported then Mark resolved); Users with debounced search, status chips and a details drawer with Ban / Lift ban; Bans with Lift ban and a ban-by-id form; Rooms with status tabs, Live chip and Cancel room. Bans, lifts and cancels are confirmed; results and API errors show in a snackbar.

## Unreleased — account sidebar and badges (#39)

- Signed-in account sidebar (`src/AccountSidebar.jsx`) on Profile, Rooms and, from 900px wide, beside video chat: letter avatar, name, streak, phone or email, call count, and links to Video chat (not on iOS), Rooms, Profile, Privacy and Security, Badges and Sign out. Below 900px it is a compact block with a scrollable row of chips.
- Badges dialog (`src/BadgesDialog.jsx`) lists every badge from `/api/me`; earned ones in colour, the rest greyed and marked Locked. The profile shows earned badge icons and "See all badges".

## Unreleased — Google sign-in, streaks, new home page (#37)

- "Continue with Google" on `/login` (web only, shown when `VITE_GOOGLE_CLIENT_ID` is set); phone login stays below it.
- Daily streaks: signed-in users send their token with random chat; a streak chip in the chat top bar, a "🔥 N-day streak!" notice, and a streak card on the profile.
- New dark home page: hero, features, how it works, streak teaser, FAQ, call to action.
- Hosted at vibezone.varchas.store on Cloudflare (`wrangler.jsonc`).

## Unreleased — accounts and private rooms (#36)

- Accounts: `/login` (phone with +91 default, 6 digit SMS code, resend after 30 s, Terms and Privacy accepted first) and `/profile` (name, date of birth with an 18+ check before booking or creating, Delete account with a confirmation dialog, Sign out). The token is kept in `localStorage` as `vibezoneToken`; a 401 signs out.
- Private rooms: `/rooms` lists upcoming and live rooms (name, host, date, duration, time per person, tickets left) with Book, Cancel booking, Join and Cancel room (host); Create room dialog with name, description, start, duration, time per person and tickets. No payments.
- Live room `/rooms/:id`: the host sees the queue with Next and End room; attendees see their queue position, then the call with a countdown. Report and Block end the call and remove the attendee.
- Call logic moved from `VideoPage.jsx` into `src/useCall.js` and the call UI into `src/CallView.jsx`, shared by random chat and rooms; random chat behaviour is unchanged.
- iOS app: `/` and `/chat` redirect to `/rooms` and no link leads to random chat. Android and the web keep `/chat`. The site header gains Rooms.
- Terms and Privacy cover accounts, phone number, date of birth, rooms and account deletion; `CONSENT_VERSION` is 2, so the random chat consent is asked again.
- `e2e/rooms.mjs` (`pnpm test:e2e:rooms`) starts its own backend and covers login, profiles, create, book, join, Next, video, chat, session end, End room, under-18 refusal and Delete account.

## Unreleased — launch readiness (#35)

- Stage 2 site: public home at `/` (hero, About, What do I want today, Why choose us, Features, Join us, FAQ), `/about`, `/contact` (email from `VITE_CONTACT_EMAIL`), shared header and footer. Video chat with the 18+ consent gate moved to `/chat`; the native Capacitor app redirects `/` to `/chat`. Per-page titles and meta description. e2e updated for `/chat`.

- Light redesign: white page, #8F47FF accents, self-hosted Poppins (`@fontsource/poppins`), light MUI theme; dark background image removed so Consent and Legal pages stay readable.
- New layout: top bar with logo, Enter Name, Key Words (Enter or comma adds), Connect/Stop and live count; videos with mic, camera, red hang-up, Skip, Report and Block on the left, chat on the right; stacked on phones with 44px touch targets.
- Text chat during calls (filtered by the server, text only, cleared when the call ends, Enter sends). Partner display name shown; your name is saved in `localStorage` as `vibezoneName`.
- Removed the network speed text; the partner quality dot stays.
- Terms and Privacy cover text chat filtering and chat stored only with a report.
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
