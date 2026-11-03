import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import Onboarding from './utils/Onboarding';
import StatusWithNumber from './components/activeUsers';
import TagInput from './components/Tags/taginput';
import { useCall } from './useCall';
import { api, getToken } from './api';
import { MediaError, CallVideos, CallControls, ChatPanel, ReportDialog, Notice } from './CallView';
import logo from './assets/vibezone-logo.svg';
import './video.css';

const MAX_NAME_LENGTH = 30;

function getDeviceId() {
  let id = localStorage.getItem('vibezoneDeviceId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('vibezoneDeviceId', id);
  }
  return id;
}

export default function VideoPage() {
  const call = useCall();
  const [tags, setTags] = useState([]);
  const [name, setName] = useState(() => localStorage.getItem('vibezoneName') || '');
  const [reportOpen, setReportOpen] = useState(false);
  const signedIn = Boolean(getToken());
  const { setStreak } = call;

  useEffect(() => {
    if (!signedIn) return;
    api('/me').then((me) => me?.streak && setStreak(me.streak)).catch(() => {});
  }, [signedIn, setStreak]);

  const changeName = (value) => {
    setName(value);
    localStorage.setItem('vibezoneName', value);
  };

  const start = () => call.start({
    type: 'join', deviceId: getDeviceId(), tags, name: name.trim(), ...(getToken() && { token: getToken() }),
  });

  const submitReport = (reason) => {
    call.leaveCall({ type: 'report', reason });
    setReportOpen(false);
    call.setNotice("Report sent. You won't be matched with this person again.");
  };

  const block = () => {
    call.leaveCall({ type: 'block' });
    call.setNotice("Blocked. You won't be matched with this person again.");
  };

  if (call.mediaError) return <MediaError call={call} onRetry={start} />;

  const { status } = call;
  const inCall = status === 'connected';
  const idle = status === 'idle' || status === 'banned';
  const statusText = {
    idle: 'Press Connect to meet someone.',
    connecting: 'Connecting…',
    searching: 'Looking for someone…',
    connected: 'Connected',
    reconnecting: `Connection lost. Reconnecting in ${call.retrySeconds}s…`,
    banned: `You are banned until ${call.bannedUntil ? new Date(call.bannedUntil).toLocaleString() : 'later'}.`,
  }[status];

  return (
    <div className="video-page">
      <Onboarding />
      <header className="top-bar">
        <img src={logo} className="logo" alt="Vibezone" />
        <div className="top-fields">
          <input
            type="text"
            value={name}
            onChange={(e) => changeName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Enter Name"
            aria-label="Your display name"
            className="name-input"
            data-testid="name-input"
          />
          <TagInput onTagsChange={setTags} />
          <Button
            className="start-button"
            variant="contained"
            disableElevation
            color={idle ? 'primary' : 'error'}
            onClick={idle ? start : call.stop}
            data-testid="start-stop"
          >
            {idle ? 'Connect' : 'Stop'}
          </Button>
        </div>
        <div className="top-bar-info">
          <StatusWithNumber number={call.activeUsers} />
          {signedIn ? (
            <span className="streak-chip" role="img" aria-label={`${call.streak?.count ?? 0}-day streak`} data-testid="streak-chip">
              🔥 {call.streak?.count ?? 0}
            </span>
          ) : (
            <Link to="/login" className="streak-link" data-testid="streak-sign-in">Sign in to keep a streak</Link>
          )}
        </div>
      </header>
      {!idle && <p className="hint">Name and key word changes apply the next time you press Connect.</p>}

      <main className="call-layout">
        <section className="call-column" aria-label="Video call">
          <CallVideos call={call} waiting={!idle} />

          <p className="status" role="status" data-testid="status">
            {statusText}
            {inCall && call.sharedTags.length > 0 && ` · You both like: ${call.sharedTags.join(', ')}`}
          </p>

          <CallControls call={call} idle={idle} onHangUp={call.stop} onReport={() => setReportOpen(true)} onBlock={block}>
            <Button
              className="skip-button"
              variant="contained"
              disableElevation
              disabled={!inCall}
              onClick={() => call.leaveCall({ type: 'skip' })}
              data-testid="skip"
            >
              Skip
            </Button>
          </CallControls>
        </section>

        <ChatPanel call={call} />
      </main>

      <footer className="footer">
        <Link to="/terms" data-testid="footer-terms">Terms</Link>
        <Link to="/privacy" data-testid="footer-privacy">Privacy</Link>
      </footer>

      <ReportDialog open={reportOpen} inCall={inCall} onClose={() => setReportOpen(false)} onSubmit={submitReport} />
      <Notice call={call} />
    </div>
  );
}
