import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import Onboarding from './utils/Onboarding';
import StatusWithNumber from './components/activeUsers';
import TagInput from './components/Tags/taginput';
import { useCall } from './useCall';
import { getToken } from './api';
import { AppPage, useApp } from './AppLayout';
import { MediaError, CallVideos, CallControls, ChatPanel, ReportDialog, Notice } from './CallView';
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
  const { me } = useApp();
  const { setStreak } = call;

  useEffect(() => {
    if (me?.streak) setStreak(me.streak);
  }, [me, setStreak]);

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

  const actions = (
    <>
      <StatusWithNumber number={call.activeUsers} />
      {signedIn ? (
        <span className="streak-chip" role="img" aria-label={`${call.streak?.count ?? 0}-day streak`} data-testid="streak-chip">
          🔥 {call.streak?.count ?? 0}
        </span>
      ) : (
        <Link to="/login" className="streak-link" data-testid="streak-sign-in">Sign in to keep a streak</Link>
      )}
    </>
  );

  if (call.mediaError) return <AppPage title="Video chat" actions={actions}><MediaError call={call} onRetry={start} /></AppPage>;

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
    <AppPage title="Video chat" actions={actions} wide>
      <div className="video-page">
        <Onboarding />
        <div className="call-toolbar" role="group" aria-label="Call settings">
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
        {!idle && <p className="hint">Name and key word changes apply the next time you press Connect.</p>}

        <div className="call-layout">
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
        </div>

        <ReportDialog open={reportOpen} inCall={inCall} onClose={() => setReportOpen(false)} onSubmit={submitReport} />
        <Notice call={call} />
      </div>
    </AppPage>
  );
}
