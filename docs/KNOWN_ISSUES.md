# Known issues

- Network quality uses `navigator.connection`, which only Chromium browsers support; others show "Unknown".
- A brief network blip that puts the call in `disconnected` ends the call (the client sends `skip`) instead of waiting for ICE to recover.
- The video bitrate is capped at 300 kbps where `RTCRtpSender.setParameters` is supported.
- Reconnecting after a dropped signalling socket re-joins the queue; any call in progress is ended.

## Launch blockers
- No video moderation; reports and bans are the only safeguards.
- Calls across different networks and real devices are untested until TURN and hosting exist.
- Older commits still contain credentials: rotate them, and purge history if wanted.
- iOS: Apple guideline 1.2 excludes random or anonymous chat, so the current concept is likely to be rejected or removed.
- Android webview camera and calls untested on an emulator or device.
