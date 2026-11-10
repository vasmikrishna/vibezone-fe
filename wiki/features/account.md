# Account sidebar and badges

## What it does
Signed-in users see an account sidebar on `/profile`, `/rooms` and (900px and wider) `/chat`: letter avatar, name, current streak, phone or email, number of video calls, and links to Video chat (hidden on iOS), Rooms, Profile, Privacy and Security, Badges and Sign out. Below 900px it shrinks to a row with avatar, name and streak plus a horizontally scrollable row of chips; on `/chat` it is hidden below 900px.

The Badges dialog lists all badges with name and description. Earned badges are in colour; the rest are greyed with a "Locked" label. The profile has a "Your badges" row with earned icons and "See all badges".

## How it works
- Profile (`src/Profile.jsx`): photo and bio are saved with `PATCH /api/me`. The photo is decoded with `createImageBitmap` (or an `<img>`), drawn centre-cropped onto a 192×192 canvas and sent as a JPEG data URL (`photo`); `photo: null` removes it. The pending photo lives in state until Save. Bio is a 160-character text field.
- `AppLayout.jsx` renders `me.photo` in the `.app-avatar` spots (`.app-avatar-img`), else the name's initial.
- `src/AccountSidebar.jsx` loads `GET /api/me` itself and renders nothing when signed out or on an error (a 401 also clears the token).
- `SiteLayout` takes `account` to put the sidebar beside `<main>`; `VideoPage` wraps its page in `.video-shell`.
- `src/BadgesDialog.jsx` exports `BadgeIcon` (icon and colour per badge id: `first-call`, `regular`, `certified`, `hot-streak`, `week-warrior`, `royalty`). Missing `badges` from an older server shows none.
- Styles live in `src/site.css` (sidebar, dialog) and `src/video.css` (`.video-shell`).

## Tests
Manual check at 375px and desktop. Test ids: `account-sidebar`, `sidebar-*`, `badges-dialog`, `badges-close`, `badge-{id}`, `profile-badges`, `profile-photo`, `profile-photo-change`, `profile-photo-remove`, `profile-photo-input`, `profile-bio`. `e2e/rooms.mjs` sets a photo and bio for the host and checks they survive a reload.

## Limits
Photos are stored as data URLs on the user (64 KB cap on the server); no Notifications, Billing or Plans (features don't exist). Badges are awarded by the backend only.
