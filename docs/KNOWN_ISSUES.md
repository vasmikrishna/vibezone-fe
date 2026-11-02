# Known issues

- Network quality uses `navigator.connection`, which only Chromium browsers support; others show "Unknown".
- A brief network blip that puts the call in `disconnected` ends the call (the client sends `skip`) instead of waiting for ICE to recover.
- The video bitrate is capped at 300 kbps where `RTCRtpSender.setParameters` is supported.
- Reconnecting after a dropped signalling socket re-joins the queue; any call in progress is ended.
