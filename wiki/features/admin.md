# Admin console
## What it does
Moderation and stats for the team, under `/admin` in the app layout (sidebar "Admin" group).
- **Overview** `/admin`: KPI cards (total users and new this week, online now in random chat and rooms with how many are in a call, calls today / 7 days / average length, open reports — highlighted and linking to Reports, active bans, upcoming / live rooms), a 14-day SVG bar chart of calls and signups (with a hidden table for screen readers) and the 5 latest open reports. Refreshes every 30 s while the tab is visible, plus a Refresh button with the last update time.
- **Reports** `/admin/reports`: Open / Resolved / Dismissed / All tabs, table of reports; a row or "Review" opens a drawer with the details, the attached chat as a transcript (reporter vs reported), Resolve / Dismiss / Reopen and "Ban reported" (24 h, 7 days, 30 days, permanent) that bans the reported device or user id and then offers "Mark resolved".
- **Users** `/admin/users`: search by name, email or phone (300 ms debounce), table with joined date, calls, streak, reports against them and status chips (Admin, Adult / No DOB / Under 18, Banned until …). A row opens details with recent reports against them and Ban / Lift ban.
- **Bans** `/admin/bans`: active bans with Lift ban, and a form to ban a device UUID or a 24-hex user id.
- **Rooms** `/admin/rooms`: Scheduled / Ended / Cancelled / All, seats sold, Live chip, Cancel room for scheduled rooms.
Every ban, lift and cancel asks for confirmation. Lists page 25 at a time.
## How it works
- Admins are chosen on the server: a signed-in user whose email is in `ADMIN_EMAILS` (comma-separated, backend env). `/api/me` returns `admin: true` for them; the shell shows the Admin group and `RequireAuth admin` sends everyone else to `/dashboard`. The API (`/api/admin/*`, backend `src/routes/admin.js`) checks again and answers 403, which the pages show as "You don't have access".
- Pages live in `src/admin/` (Overview, Reports, Users, Bans, Rooms); shared pieces (`useApi`, snackbar, confirm dialog, ban-duration select, pagination, drawer, loading / empty / error states, relative dates) are in `src/admin/common.jsx`. Styles are the `admin-*` rules in `src/app.css`.
- Tables scroll sideways inside their card on phones; drawers are full-width below 600 px.
## Tests
Manual Playwright run against local data (screens, 390 px no page scroll, resolve / reopen, ban + mark resolved, lift ban, cancel room, keyboard open of a report). No automated admin e2e yet.
## Limits
Report tab counts appear for tabs you have opened. A ban from a report targets the reported device or user id only, not every device of that person.
