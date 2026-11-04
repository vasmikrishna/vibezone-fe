import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TuneIcon from '@mui/icons-material/Tune';
import Onboarding from './utils/Onboarding';
import StatusWithNumber from './components/activeUsers';
import TagInput from './components/Tags/taginput';
import { useCall } from './useCall';
import { getToken } from './api';
import { AppPage, useApp } from './AppLayout';
import { MediaError, CallVideos, CallControls, StageState, ChatPanel, ReportDialog, Notice } from './CallView';
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
  const call = useCall({ preview: true });
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  if (call.mediaError) return <AppPage title="Video chat" actions={actions}><MediaError call={call} onRetry={call.preview} /></AppPage>;

  const { status } = call;
  const inCall = status === 'connected';
  const idle = status === 'idle' || status === 'banned';
  const bannedText = `You are banned until ${call.bannedUntil ? new Date(call.bannedUntil).toLocaleString() : 'later'}.`;
  const statusText = {
    idle: 'Press Connect to meet someone.',
    connecting: 'Connecting…',
    searching: 'Looking for someone…',
    connected: 'Connected',
    reconnecting: `Connection lost. Reconnecting in ${call.retrySeconds}s…`,
    banned: bannedText,
  }[status];
  const shared = inCall && call.sharedTags.length > 0 ? `You both like: ${call.sharedTags.join(', ')}` : '';

  const connect = () => {
    setSettingsOpen(false);
    start();
  };
  const online = `${call.activeUsers.toLocaleString()} online`;
  const center = idle ? (
    <StageState
      title={status === 'banned' ? 'You are banned' : 'Ready when you are'}
      sub={status === 'banned' ? bannedText : 'Press Connect to meet someone new'}
    >
      <Button className="start-button" variant="contained" disableElevation size="large" onClick={connect} data-testid="start-stop">
        Connect
      </Button>
    </StageState>
  ) : status === 'reconnecting' ? (
    <StageState pulse title="Connection lost" sub={`Reconnecting in ${call.retrySeconds}s…`} />
  ) : (
    <StageState
      pulse
      title={call.partnerLeft ? 'They left. Finding someone new…' : 'Looking for someone…'}
      sub={online}
    >
      <Button className="stage-stop" variant="outlined" onClick={call.stop} data-testid="search-stop">Stop</Button>
    </StageState>
  );
  const tune = (
    <IconButton
      className="stage-tune"
      onClick={() => setSettingsOpen((o) => !o)}
      aria-label="Name and key words"
      aria-expanded={settingsOpen}
      aria-controls="call-settings"
      data-testid="settings-toggle"
    >
      <TuneIcon />
    </IconButton>
  );

  return (
    <AppPage title="Video chat" actions={actions} wide>
      <div className={idle ? 'video-page' : 'video-page immersive'}>
        <Onboarding />
        <div
          id="call-settings"
          className={settingsOpen ? 'call-settings open' : 'call-settings'}
          role="group"
          aria-label="Call settings"
          onKeyDown={(e) => e.key === 'Escape' && setSettingsOpen(false)}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => changeName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Your name"
            aria-label="Your display name"
            className="name-input"
            data-testid="name-input"
          />
          <TagInput onTagsChange={setTags} />
          {!idle && <p className="hint">Name and key word changes apply the next time you press Connect.</p>}
        </div>

        <div className={inCall ? 'call-layout in-call' : 'call-layout'}>
          <CallVideos call={call} center={center} corner={idle && tune} extra={shared} />
          <p className="visually-hidden" role="status" data-testid="status">
            {statusText}
            {shared && ` · ${shared}`}
          </p>

          <CallControls
            call={call}
            idle={idle}
            onHangUp={call.stop}
            onReport={() => setReportOpen(true)}
            onBlock={block}
            hangUpTestId="start-stop"
          >
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

          <ChatPanel call={call} />
        </div>

        <ReportDialog open={reportOpen} inCall={inCall} onClose={() => setReportOpen(false)} onSubmit={submitReport} />
        <Notice call={call} />
      </div>
    </AppPage>
  );
}
