import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Snackbar from '@mui/material/Snackbar';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CameraswitchIcon from '@mui/icons-material/Cameraswitch';
import PauseIcon from '@mui/icons-material/Pause';
import CallEndIcon from '@mui/icons-material/CallEnd';
import SendIcon from '@mui/icons-material/Send';
import PersonAddAlt from '@mui/icons-material/PersonAddAlt';
import { getToken } from './api';
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

export function CallVideos({ call, waiting }) {
  const inCall = call.status === 'connected';
  const name = call.partnerName || 'Your partner';
  const { video, audio, hold } = call.partnerMedia;
  const away = hold ? 'hold' : video ? '' : 'camera';
  const announcement = useAwayAnnouncement(inCall, away, name);
  return (
    <div className="video-container">
      <div className="video-wrapper">
        <video ref={call.remoteVideo} autoPlay playsInline className="video" data-testid="remote-video" />
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
        {inCall && !audio && (
          <span className="media-mic-off" role="img" aria-label={`${name} is muted`} data-testid="remote-mic-off">
            <MicOffIcon fontSize="small" />
          </span>
        )}
        <span className="visually-hidden" aria-live="polite">{announcement}</span>
        {inCall ? (
          <span
            className="partner-quality"
            style={{ backgroundColor: QUALITY_COLORS[call.partnerQuality] || '#9e9e9e' }}
            title={`Partner network: ${call.partnerQuality}`}
          />
        ) : (
          <div className="loader">
            {waiting && <CircularProgress sx={{ color: '#8F47FF' }} aria-label="Waiting" />}
          </div>
        )}
      </div>
      <div className="video-wrapper">
        <video ref={call.localVideo} autoPlay playsInline muted className="video local" data-testid="local-video" />
        {!call.videoOn && (
          <div className="media-overlay" data-testid="local-camera-off">
            <VideocamOffIcon fontSize="large" aria-hidden="true" />
            <p className="media-title">Your camera is off</p>
          </div>
        )}
        {call.cameraCount > 1 && (
          <IconButton
            className="switch-camera"
            onClick={call.switchCamera}
            aria-label="Switch camera"
            data-testid="switch-camera"
          >
            <CameraswitchIcon />
          </IconButton>
        )}
      </div>
    </div>
  );
}

/** Mic, camera and hang-up, then the page's own buttons, then Report and Block during a call. */
export function CallControls({ call, idle, onHangUp, onReport, onBlock, children }) {
  return (
    <div className="controls">
      <IconButton
        className="mute-button"
        onClick={() => call.setMicOn((on) => !on)}
        aria-label={call.micOn ? 'Mute microphone' : 'Unmute microphone'}
        aria-pressed={!call.micOn}
        data-testid="toggle-mic"
      >
        {call.micOn ? <MicIcon className="icon" /> : <MicOffIcon className="icon" />}
      </IconButton>
      <IconButton
        className="video-button"
        onClick={() => call.setVideoOn((on) => !on)}
        aria-label={call.videoOn ? 'Turn camera off' : 'Turn camera on'}
        aria-pressed={!call.videoOn}
        data-testid="toggle-video"
      >
        {call.videoOn ? <VideocamIcon className="icon" /> : <VideocamOffIcon className="icon" />}
      </IconButton>
      <IconButton className="hang-up" disabled={idle} onClick={onHangUp} aria-label="Stop" data-testid="hang-up">
        <CallEndIcon />
      </IconButton>
      {children}
      {call.status === 'connected' && (
        <>
          {call.canAddFriend && <FriendButton call={call} />}
          <Button variant="outlined" color="warning" onClick={onReport} data-testid="report">
            Report
          </Button>
          <Button variant="outlined" color="error" onClick={onBlock} data-testid="block">
            Block
          </Button>
        </>
      )}
    </div>
  );
}

const FRIEND_BUTTONS = {
  none: ['Add friend', false],
  requested: ['Request sent', true],
  incoming: ['Accept friend', false],
  friends: ['Friends ✓', true],
};

/** Add friend during a call; only shown when both of you are signed in. */
function FriendButton({ call }) {
  const [label, disabled] = FRIEND_BUTTONS[call.friendStatus] || FRIEND_BUTTONS.none;
  return (
    <Button
      variant={call.friendStatus === 'incoming' ? 'contained' : 'outlined'}
      disableElevation
      startIcon={call.friendStatus === 'none' ? <PersonAddAlt /> : null}
      disabled={disabled}
      onClick={call.addFriend}
      data-testid="add-friend"
    >
      {label}
    </Button>
  );
}

export function ChatPanel({ call }) {
  const inCall = call.status === 'connected';
  const { pathname } = useLocation();
  return (
    <aside className="chat-panel" aria-label="Text chat">
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
            <span className="visually-hidden">{m.from === 'me' ? 'You: ' : `${call.partnerName}: `}</span>
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
          placeholder="Type a message"
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
  return (
    <Snackbar
      open={Boolean(call.notice)}
      autoHideDuration={4000}
      onClose={() => call.setNotice('')}
      message={call.notice}
      data-testid="notice"
    />
  );
}
