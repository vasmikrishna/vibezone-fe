# Known issues

- Network quality uses `navigator.connection`, which only Chromium browsers support; others show "Unknown".
- A brief network blip that puts the call in `disconnected` ends the call (the client sends `skip`) instead of waiting for ICE to recover.
- The video bitrate is capped at 300 kbps where `RTCRtpSender.setParameters` is supported.
- Reconnecting after a dropped signalling socket re-joins the queue; any call in progress is ended.

- Rooms: the live room screen gets the room name and start time from the rooms list, so a room that has ended shows "Room" as its title.
- Rooms: leaving a live room (or a dropped connection) puts the attendee at the back of the queue when they rejoin.
- Rooms: date of birth is self-declared; there is no ID check.

## Launch blockers
- SMS login needs `SMS_API_URL` and `SMS_API_KEY` on the backend; without them production returns 503 and nobody can log in.
- No video moderation; reports and bans are the only safeguards.
- Calls across different networks and real devices are untested until TURN and hosting exist.
- Older commits still contain credentials: rotate them, and purge history if wanted.
- iOS: Apple guideline 1.2 excludes random or anonymous chat. The iOS app now offers only private rooms with phone accounts, reporting, blocking and account deletion; still to be confirmed in App Review.
- Android webview camera and calls untested on an emulator or device.
