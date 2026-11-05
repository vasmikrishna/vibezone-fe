import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Snackbar from '@mui/material/Snackbar';
import useMediaQuery from '@mui/material/useMediaQuery';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CameraswitchIcon from '@mui/icons-material/Cameraswitch';
import PauseIcon from '@mui/icons-material/Pause';
import CallEndIcon from '@mui/icons-material/CallEnd';
import SendIcon from '@mui/icons-material/Send';
import PersonAddAlt from '@mui/icons-material/PersonAddAlt';
import HowToRegOutlined from '@mui/icons-material/HowToRegOutlined';
import FlagOutlined from '@mui/icons-material/FlagOutlined';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import FiberManualRecord from '@mui/icons-material/FiberManualRecord';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import Tooltip from '@mui/material/Tooltip';
import { getToken } from './api';
import { usePrefs } from './prefs';
import PreferencesForm from './PreferencesForm';
import './video.css';

const MAX_CHAT_LENGTH = 500;

const REPORT_REASONS = [
  ['nudity', 'Nudity or sexual content'],
  ['harassment', 'Harassment or hate'],
  ['underage', 'Appears to be under 18'],
  ['spam', 'Spam or advertising'],
  ['other', 'Something else'],
];

const QUALITY_COLORS = { High: '#4caf50', Medium: '#ff9800', Low: '#f44336' };

/** Shown instead of the call when the camera or microphone cannot start. */
export function MediaError({ call, onRetry }) {
  return (
    <div className="page" data-testid="media-error">
      <h2>Camera and microphone needed</h2>
      <p>
        {call.mediaError === 'denied'
          ? `Access to your camera or microphone was blocked. Allow it in ${Capacitor.isNativePlatform() ? 'your device Settings, under Vibezone' : 'your browser’s site settings'}, then try again.`
          : call.mediaError === 'nodevice'
            ? 'No camera or microphone was found. Connect one, then try again.'
            : 'Your camera or microphone could not be started. Close other apps using it, then try again.'}
      </p>
      <Button variant="contained" onClick={onRetry} data-testid="media-retry">Try again</Button>
    </div>
  );
}

/** What the screen reader hears when the partner's camera or hold state changes. */
function useAwayAnnouncement(inCall, away, name) {
  const key = inCall ? away : 'out';
  const [last, setLast] = useState({ key, text: '' });
  if (last.key !== key) {
    const text = !inCall ? ''
      : away === 'hold' ? `${name} is on hold`
        : away === 'camera' ? `${name} turned their camera off`
          : last.key === 'hold' ? `${name} is back`
            : last.key === 'camera' ? `${name} turned their camera on` : '';
    setLast({ key, text });
  }
  return last.text;
}

const clock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** The red badge both people see for as long as a recording runs. */
function RecIndicator({ call, name }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = clock(now - call.recordingStartedAt);
  return (
    <div className="rec-indicator" data-testid="rec-indicator">
      <span className="rec-dot" aria-hidden="true" />
      <span aria-hidden="true">{call.recordingBy === 'me' ? `REC ${time}` : `${name} is recording · ${time}`}</span>
      <span className="visually-hidden">Recording</span>
    </div>
  );
}

/** Asks for consent when the partner wants to record; recording starts only after Allow. */
function RecordConsentDialog({ call, name }) {
  return (
    <Dialog
      open={call.recording === 'asked'}
      onClose={call.declineRecording}
      aria-labelledby="record-consent-title"
      aria-describedby="record-consent-text"
      data-testid="record-consent"
    >
      <DialogTitle id="record-consent-title">Allow recording?</DialogTitle>
      <DialogContent>
        <p id="record-consent-text" className="record-consent-text">
          {name} wants to record this call. The recording includes your video and voice and is saved
          only on their device.
        </p>
      </DialogContent>
      <DialogActions>
        <Button onClick={call.declineRecording} data-testid="record-decline">Decline</Button>
        <Button variant="contained" color="error" onClick={call.allowRecording} data-testid="record-allow">Allow</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Screen layout and recording type, quality and format; saved on this device. */
function PreferencesDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="preferences-title" data-testid="preferences">
      <PreferencesBody onClose={onClose} />
    </Dialog>
  );
}

/** Mounts with the dialog, so the draft starts from the saved preferences on every open. */
function PreferencesBody({ onClose }) {
  const [saved, savePrefs] = usePrefs();
  const [draft, setDraft] = useState(saved);
  const dirty = Object.keys(draft).some((k) => draft[k] !== saved[k]);
  const save = () => {
    savePrefs(draft);
    onClose();
  };
  return (
    <>
      <DialogTitle id="preferences-title">Preferences</DialogTitle>
      <DialogContent>
        <PreferencesForm value={draft} onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} data-testid="preferences-close">Cancel</Button>
        <Button variant="contained" disableElevation disabled={!dirty} onClick={save} data-testid="preferences-save">Save</Button>
      </DialogActions>
    </>
  );
}

/** The big centred message on the stage while there is no partner video. */
export function StageState({ pulse = false, title, sub, children }) {
  return (
    <div className="stage-state">
      {pulse && <span className="stage-pulse" aria-hidden="true"><span /></span>}
      <p className="stage-title">{title}</p>
      {sub && <p className="stage-sub">{sub}</p>}
      {children}
    </div>
  );
}

/**
 * The call stage: the partner's video fills it, our camera sits in a corner window.
 * center shows while not connected, corner sits top-left while not connected, extra is added to the partner pill.
 */
export function CallVideos({ call, center, corner, extra }) {
  const inCall = call.status === 'connected';
  const name = call.partnerName || 'Your partner';
  const { video, audio, hold } = call.partnerMedia;
  const away = hold ? 'hold' : video ? '' : 'camera';
  const announcement = useAwayAnnouncement(inCall, away, name);
  const recording = inCall && call.recording === 'recording';
  const recordText = !recording ? '' : call.recordingBy === 'me' ? 'Recording' : `${name} is recording`;
  const [prefs] = usePrefs();
  return (
    <div className={`stage${inCall ? ' in-call' : ''}${prefs.layout === 'split' ? ' split' : ''}`} role="region" aria-label="Video call">
      <video ref={call.remoteVideo} autoPlay playsInline className="video" data-testid="remote-video" />
      {!inCall && center}
      {inCall && away === 'hold' && (
        <div className="media-overlay" data-testid="remote-on-hold">
          <span className="media-avatar" aria-hidden="true"><PauseIcon fontSize="large" /></span>
          <p className="media-title">{name} is on hold</p>
          <p className="media-sub">They may be on another call or switched apps. Waiting for them to come back…</p>
        </div>
      )}
      {inCall && away === 'camera' && (
        <div className="media-overlay" data-testid="remote-camera-off">
          <span className="media-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
          <p className="media-title">{name} turned their camera off</p>
        </div>
      )}
      <span className="visually-hidden" aria-live="polite">{announcement}</span>
      <span className="visually-hidden" aria-live="assertive">{recordText}</span>
      {recording && <RecIndicator call={call} name={name} />}
      <RecordConsentDialog call={call} name={name} />
      {inCall ? (
        <div className="stage-pill" data-testid="partner-pill">
          <span
            className="partner-quality"
            style={{ backgroundColor: QUALITY_COLORS[call.partnerQuality] || '#9e9e9e' }}
            role="img"
            aria-label={`Partner network: ${call.partnerQuality}`}
            title={`Partner network: ${call.partnerQuality}`}
          />
          <span className="stage-pill-text">
            <strong>{name}</strong>
            {extra && <span>{extra}</span>}
          </span>
          {!audio && (
            <span className="media-mic-off" role="img" aria-label={`${name} is muted`} data-testid="remote-mic-off">
              <MicOffIcon fontSize="inherit" />
            </span>
          )}
        </div>
      ) : (
        corner && <div className="stage-corner">{corner}</div>
      )}
      <div className="self-view">
        <video ref={call.localVideo} autoPlay playsInline muted className="video local" data-testid="local-video" />
        {!call.localStream ? (
          <div className="media-overlay self-off" data-testid="self-preview-off">
            <VideocamOffIcon aria-hidden="true" />
            <Button size="small" variant="contained" disableElevation onClick={call.preview} data-testid="camera-preview">
              Turn on camera
            </Button>
          </div>
        ) : !call.videoOn && (
          <div className="media-overlay self-off" data-testid="local-camera-off">
            <VideocamOffIcon aria-hidden="true" />
            <p className="media-title">Your camera is off</p>
          </div>
        )}
        {call.localStream && call.cameraCount > 1 && (
          <IconButton
            className="switch-camera"
            onClick={call.switchCamera}
            aria-label="Switch camera"
            data-testid="switch-camera"
          >
            <CameraswitchIcon fontSize="small" />
          </IconButton>
        )}
      </div>
    </div>
  );
}

/** A tooltip that also works on disabled buttons; the button keeps its own aria-label. */
function Tip({ title, children }) {
  return (
    <Tooltip title={title} describeChild>
      <span className="tip">{children}</span>
    </Tooltip>
  );
}

/**
 * Mic, camera and hang-up, then the page's own buttons, then Add friend, Report and Block during a call.
 * hangUpTestId lets random chat use its start-stop button as the hang-up.
 */
export function CallControls({ call, idle, onHangUp, onReport, onBlock, hangUpTestId = 'hang-up', children }) {
  const inCall = call.status === 'connected';
  const [prefsOpen, setPrefsOpen] = useState(false);
  return (
    <div className="controls" role="toolbar" aria-label="Call controls">
      <Tip title={call.micOn ? 'Mute microphone' : 'Unmute microphone'}>
        <IconButton
          className={call.micOn ? 'round mute-button' : 'round mute-button off'}
          onClick={() => call.setMicOn((on) => !on)}
          aria-label={call.micOn ? 'Mute microphone' : 'Unmute microphone'}
          aria-pressed={!call.micOn}
          data-testid="toggle-mic"
        >
          {call.micOn ? <MicIcon /> : <MicOffIcon />}
        </IconButton>
      </Tip>
      <Tip title={call.videoOn ? 'Turn camera off' : 'Turn camera on'}>
        <IconButton
          className={call.videoOn ? 'round video-button' : 'round video-button off'}
          onClick={() => call.setVideoOn((on) => !on)}
          aria-label={call.videoOn ? 'Turn camera off' : 'Turn camera on'}
          aria-pressed={!call.videoOn}
          data-testid="toggle-video"
        >
          {call.videoOn ? <VideocamIcon /> : <VideocamOffIcon />}
        </IconButton>
      </Tip>
      {!idle && (
        <Tip title="Stop">
          <IconButton className="round hang-up" onClick={onHangUp} aria-label="Stop" data-testid={hangUpTestId}>
            <CallEndIcon />
          </IconButton>
        </Tip>
      )}
      {children}
      <Tip title="Preferences">
        <IconButton
          className="round prefs-button"
          onClick={() => setPrefsOpen(true)}
          aria-label="Preferences"
          data-testid="preferences-toggle"
        >
          <SettingsOutlined />
        </IconButton>
      </Tip>
      <PreferencesDialog open={prefsOpen} onClose={() => setPrefsOpen(false)} />
      {inCall && (
        <>
          <RecordButton call={call} />
          {call.canAddFriend && <FriendButton call={call} />}
          <Tip title="Report">
            <IconButton className="round report-button" onClick={onReport} aria-label="Report" data-testid="report">
              <FlagOutlined />
            </IconButton>
          </Tip>
          <Tip title="Block">
            <IconButton className="round block-button" onClick={onBlock} aria-label="Block" data-testid="block">
              <BlockOutlined />
            </IconButton>
          </Tip>
        </>
      )}
    </div>
  );
}

/** Record → Waiting… (partner deciding) → Stop recording; either person can stop. */
function RecordButton({ call }) {
  const { recording } = call;
  const label = !call.recordingSupported ? "Recording isn't supported in this browser"
    : recording === 'requesting' ? 'Waiting…'
      : recording === 'recording' ? 'Stop recording' : 'Record';
  return (
    <Tip title={label}>
      <Button
        className={recording === 'recording' ? 'record-button on' : 'record-button'}
        variant="contained"
        disableElevation
        disabled={!call.recordingSupported || recording === 'requesting' || recording === 'asked'}
        onClick={recording === 'recording' ? call.stopRecording : call.requestRecording}
        aria-label={call.recordingSupported ? label : 'Record'}
        data-testid="record"
      >
        <FiberManualRecord aria-hidden="true" />
        <span className="friend-label">{call.recordingSupported ? label : 'Record'}</span>
      </Button>
    </Tip>
  );
}

const FRIEND_BUTTONS = {
  none: ['Add friend', false],
  requested: ['Request sent', true],
  incoming: ['Accept friend', false],
  friends: ['Friends ✓', true],
};

/** Add friend during a call; only shown when both of you are signed in. On phones the label is hidden. */
function FriendButton({ call }) {
  const [label, disabled] = FRIEND_BUTTONS[call.friendStatus] || FRIEND_BUTTONS.none;
  const done = call.friendStatus === 'requested' || call.friendStatus === 'friends';
  return (
    <Tip title={label}>
      <Button
        className={call.friendStatus === 'incoming' ? 'friend-button incoming' : 'friend-button'}
        variant="contained"
        disableElevation
        disabled={disabled}
        onClick={call.addFriend}
        data-testid="add-friend"
      >
        {done ? <HowToRegOutlined aria-hidden="true" /> : <PersonAddAlt aria-hidden="true" />}
        <span className="friend-label">{label}</span>
      </Button>
    </Tip>
  );
}

/** Side panel on desktop; below 1024px it floats over the bottom-left of the stage, Instagram-Live style. */
export function ChatPanel({ call }) {
  const inCall = call.status === 'connected';
  const { pathname } = useLocation();
  return (
    <aside className={inCall ? 'chat-panel in-call' : 'chat-panel'} aria-label="Text chat">
      <div className="chat-head">
        <h2 className="chat-partner" data-testid="partner-name">
          {inCall ? call.partnerName : 'Chat'}
        </h2>
        {inCall && !getToken() && (
          <Link to={`/login?next=${encodeURIComponent(pathname)}`} className="chat-sign-in" data-testid="friend-sign-in">
            Sign in to add friends
          </Link>
        )}
      </div>
      <ul className="chat-messages" ref={call.chatListRef} aria-live="polite" data-testid="chat-messages">
        {call.messages.length === 0 && (
          <li className="chat-empty">{inCall ? 'Say hello.' : 'Messages appear here during a call.'}</li>
        )}
        {call.messages.map((m) => (
          <li key={m.id} className={`chat-message ${m.from}`} data-testid="chat-message">
            <span className="chat-from">{m.from === 'me' ? 'You: ' : `${call.partnerName}: `}</span>
            {m.text}
          </li>
        ))}
      </ul>
      <form className="chat-form" onSubmit={call.sendChat}>
        <input
          type="text"
          value={call.chatText}
          onChange={(e) => call.setChatText(e.target.value)}
          maxLength={MAX_CHAT_LENGTH}
          disabled={!inCall}
          placeholder="Say something…"
          aria-label="Type a message"
          className="chat-input"
          data-testid="chat-input"
        />
        <IconButton
          type="submit"
          disabled={!inCall || !call.chatText.trim()}
          aria-label="Send message"
          className="chat-send"
          data-testid="chat-send"
        >
          <SendIcon />
        </IconButton>
      </form>
    </aside>
  );
}

export function ReportDialog({ open, inCall, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const submit = () => {
    onSubmit(reason);
    setReason('');
  };
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="report-title">
      <DialogTitle id="report-title">Report this person</DialogTitle>
      <DialogContent>
        <RadioGroup aria-labelledby="report-title" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REPORT_REASONS.map(([value, label]) => (
            <FormControlLabel
              key={value}
              value={value}
              control={<Radio data-testid={`report-reason-${value}`} />}
              label={label}
            />
          ))}
        </RadioGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} data-testid="report-cancel">Cancel</Button>
        <Button variant="contained" color="warning" disabled={!reason || !inCall} onClick={submit} data-testid="report-submit">
          Report
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function Notice({ call }) {
  const phone = useMediaQuery('(max-width: 1023.98px)'); // the controls float at the bottom there
  return (
    <Snackbar
      anchorOrigin={phone ? { vertical: 'top', horizontal: 'center' } : { vertical: 'bottom', horizontal: 'left' }}
      open={Boolean(call.notice)}
      autoHideDuration={4000}
      onClose={() => call.setNotice('')}
      message={call.notice}
      data-testid="notice"
    />
  );
}
