# Changelog

## Unreleased — preferences Save button (#58)

- Preferences on the Settings page and in the in-call dialog now apply only when you press Save; the Settings page confirms with a "Preferences saved" message.
- Cancel in the in-call dialog drops unsaved changes; the dialog starts from the saved preferences each time it opens.

## Unreleased — consent screen (#56)

- Signed-in adults skip the 18+ and terms screen before video chat; login already asks for both.
- Redesigned consent card: icon header, three short points (random match, staying safe, recording asks first) and a full-width Continue button.

## Unreleased — Instagram Reel recording (#55)

- New recording output "Instagram Reel": a vertical 9:16 video (540×960, 720×1280 or 1080×1920 by quality) with the partner on top and you below.
- Reels prefer MP4 (H.264 + AAC when the browser can) so they upload to Instagram as is; WebM when MP4 is not supported.

## Unreleased — settings page (#53)

- New Settings page at `/settings` (sidebar, user menu and phone tabs; no account needed) with the same call preferences as the in-call dialog: screen layout and recording output, quality and format.
- The form is shared (`src/PreferencesForm.jsx`) by the page and the dialog, so both stay in sync through `src/prefs.js`.
- Preferences are icon option cards with a short description each; the in-call dialog uses the same cards.
- `e2e/two-users.mjs`: checks the page saves a choice, keeps it after a reload, and takes phone and desktop screenshots when `REC_SHOT_DIR` is set.

## Unreleased — call preferences (#51)

- A Preferences button (gear icon) in the call controls, on the video chat and room pages, idle or in a call, opens a dialog. On phones the gear is hidden while in a call (the floating bar is full), so set preferences before connecting; on desktop they can be changed mid-call. Choices are saved on this device (`src/prefs.js`, `localStorage.vibezonePrefs`; bad or unknown values fall back to the defaults).
- Screen layout: Focus (partner full screen, you in a corner, the default) or Split (partner on top and you below on phones and tablets, side by side on desktop). It switches live during a call (`.stage.split` in `src/video.css`).
- Recording output (video and audio, or audio only), quality (Low 640×240 at 1 Mbps, Standard 1280×480 at 2.5 Mbps, High 1920×720 at 5 Mbps) and format (Automatic, WebM, MP4). Formats the browser can't record are disabled with "Not supported in this browser", and an unsupported choice falls back to Automatic. Audio only records both voices mixed to `.webm` or `.m4a`. The settings apply the next time you press Record (`src/recorder.js` `startRecorder({ type, quality, format })`).
- Phones: the in-call control bar keeps its seven buttons on one row at 375px (40px rounds, Record and Add friend as rounds too), and notices ("Recording saved…") pop at the top instead of over the bar.
- `e2e/two-users.mjs`: switches to Split and checks your video sits below the partner at 375px and beside it at 1280px, switches back to Focus, then records audio-only WebM and checks the download.

## Unreleased — call recording with consent (#48)

- Record button in the call controls (random chat and rooms, only while connected): Record → Waiting… → Stop recording. Recording starts only after the partner taps Allow in a consent dialog ("{name} wants to record this call…"); Decline or no answer in 30 s cancels it with a notice. Either person can stop.
- Both people see a red pulsing REC badge on the stage with the elapsed time ("{name} is recording" for the partner), announced to screen readers.
- The recorder (`src/recorder.js`, only on the side that asked) draws both videos side by side on a 1280×480 canvas (partner left, you right, name labels, "Recorded on Vibezone" watermark, an initial on a dark tile when a camera is off), mixes both voices with Web Audio and records with MediaRecorder (WebM VP9/VP8, or MP4 on Safari). Stopping, the partner stopping or skipping, hang-up, leaving or a lost connection downloads `vibezone-call-YYYY-MM-DD-HHMM.webm|mp4`. Nothing is uploaded. Browsers without MediaRecorder get a disabled button with "Recording isn't supported in this browser".
- Terms, Privacy and the home FAQ explain recording with consent; consent version bumped to 3 so everyone sees the consent screen again.

## Unreleased — call stage and overlay chat (#46)

- Video chat and rooms now use one dark video stage: the partner fills it (16:9 on desktop, full height on phones) and your own camera is a mirrored picture-in-picture window (bottom-right on desktop, top-right on phones) with the camera-switch button and "Your camera is off" overlay.
- Camera preview: the chat page opens your camera after the consent screen (`useCall({ preview: true })` / `preview()`), and Connect reuses it. Stop still releases the camera; the self-view then offers "Turn on camera". If the camera can't start, the existing camera error screen still appears, and its "Try again" now turns the camera back on without connecting.
- The stage always shows one clear state: "Ready when you are" with the Connect button, "Looking for someone…" with a pulse ring, the online count and Stop, "They left. Finding someone new…" after a partner leaves, "Connection lost / Reconnecting in Ns…", or the ban text. During a call a top-left pill shows the partner name, shared tags, the network dot and a muted-mic badge. The `status` element is now visually hidden with unchanged wording.
- Call controls are round icon buttons with tooltips (mic, camera, hang up/Stop, Skip, Add friend, Report, Block). On desktop they sit in a toolbar under the stage. On phones they float at the bottom of the stage, and Add friend shows as an icon only, with its label kept in the button text. In random chat, the `start-stop` button is the Connect button on the stage while idle and the red hang-up button once you connect.
- Phones/tablets (< 1024px): the stage fills the screen between the top bar and the bottom tabs. The tabs are hidden while searching or in a call. Chat messages float over the bottom-left of the video Instagram-Live style ("Name: text" pills, faded top, scrolling inside a box at most 40% of the stage's height), and the "Say something…" input sits above the controls. The page itself never scrolls. Name and key words move to a sheet opened by a tune button on the stage. Desktop keeps them in a row above the stage, with the chat panel on the right.
- Rooms: same stage. The status, queue position and closed messages show in the stage centre; the countdown appears in the partner pill. On phones the host's queue floats over the stage.
- `e2e/two-users.mjs`: opens the settings sheet (`settings-toggle`) before filling `name-input` at 375px, then closes it.

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
