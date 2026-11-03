import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { useCall } from './useCall';
import { MediaError, CallVideos, CallControls, ChatPanel, ReportDialog, Notice } from './CallView';
import { api, getToken, formatDate } from './api';
import { usePageTitle } from './usePageTitle';
import logo from './assets/vibezone-logo.svg';
import './video.css';

const JOIN_ERRORS = {
  unauthorized: 'Your session has expired. Log in again.',
  'invalid room': 'This room does not exist.',
  'room not found': 'This room was cancelled or has ended.',
  'room not open': 'This room is not open. Rooms open 10 minutes before they start.',
  'no ticket': 'You need a ticket to join this room.',
};

function countdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function RoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = getToken();
  const [room, setRoom] = useState(null);
  const [state, setState] = useState(null); // last roomState
  const [sessionEndsAt, setSessionEndsAt] = useState(null);
  const [closed, setClosed] = useState('');
  const [now, setNow] = useState(Date.now());
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const leftRef = useRef('');
  usePageTitle(room ? `${room.name} - Vibezone` : 'Room - Vibezone');

  const call = useCall({
    failMessage: null,
    onMessage: (data) => {
      switch (data.type) {
        case 'roomState':
          setState(data);
          setSessionEndsAt(data.endsAt);
          return true;
        case 'roomClosed':
          call.stop();
          setClosed(leftRef.current || 'This room has ended.');
          return true;
        case 'matched':
          setSessionEndsAt(data.endsAt);
          return false;
        case 'error':
          if (JOIN_ERRORS[data.message]) {
            call.stop();
            setClosed(JOIN_ERRORS[data.message]);
            return true;
          }
          if (data.message === 'room not started') {
            call.setNotice('The room has not started yet.');
            return true;
          }
          return false;
        default:
          return false;
      }
    },
  });

  useEffect(() => {
    if (!token) return;
    api('/rooms')
      .then((list) => setRoom(list.find((r) => r.id === id) || null))
      .catch((err) => err.status === 401 && navigate('/login', { replace: true }));
  }, [token, id, navigate]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!token) return <Navigate to="/login" replace />;

  const join = () => {
    leftRef.current = '';
    setClosed('');
    setState(null);
    call.start({ type: 'roomJoin', token, roomId: id });
  };

  if (call.mediaError) return <MediaError call={call} onRetry={join} />;

  const { status } = call;
  const inCall = status === 'connected';
  const idle = status === 'idle' || status === 'banned';
  const isHost = state ? state.role === 'host' : Boolean(room?.isHost);
  const queue = state?.queue || [];
  const started = room ? now >= new Date(room.startsAt).getTime() : true;
  const timeLeft = inCall && sessionEndsAt ? ` · ${countdown(new Date(sessionEndsAt).getTime() - now)} left` : '';

  const waitingText = isHost
    ? !started
      ? `${queue.length} waiting. You can start at ${formatDate(room.startsAt)}.`
      : queue.length
        ? `${queue.length} waiting. Press Next to talk to the next person.`
        : 'Nobody is waiting yet.'
    : state?.position
      ? `You are number ${state.position} in the queue.`
      : 'Waiting for the host.';
  const statusText = closed && idle
    ? closed
    : {
        idle: 'Press Join room to turn on your camera and enter.',
        connecting: 'Connecting…',
        searching: waitingText,
        connected: `In a call with ${call.partnerName}${timeLeft}`,
        reconnecting: `Connection lost. Reconnecting in ${call.retrySeconds}s…`,
        banned: 'You cannot join right now.',
      }[status];

  const leaveWith = (message, notice) => {
    if (!isHost) leftRef.current = 'You left this room.';
    call.leaveCall(message);
    call.setNotice(notice);
  };
  const removed = isHost
    ? 'They were removed from this room and cannot join your rooms again.'
    : "You left the room and won't be able to join this host's rooms.";

  return (
    <div className="video-page">
      <header className="room-bar">
        <Link to="/rooms" data-testid="room-back" aria-label="Back to rooms">
          <img src={logo} className="logo" alt="" />
        </Link>
        <h1 className="room-title" data-testid="room-title">{room?.name || 'Room'}</h1>
        <Button
          className="start-button"
          variant="contained"
          disableElevation
          color={idle ? 'primary' : 'error'}
          onClick={idle ? join : call.stop}
          data-testid="room-join-leave"
        >
          {idle ? 'Join room' : 'Leave'}
        </Button>
      </header>

      <main className="call-layout">
        <section className="call-column" aria-label="Video call">
          <CallVideos call={call} waiting={!idle} />

          <p className="status" role="status" data-testid="status">{statusText}</p>

          <CallControls
            call={call}
            idle={idle}
            onHangUp={call.stop}
            onReport={() => setReportOpen(true)}
            onBlock={() => leaveWith({ type: 'block' }, `Blocked. ${removed}`)}
          >
            {isHost && !idle && (
              <>
                <Button
                  variant="contained"
                  disableElevation
                  disabled={!started || (!inCall && queue.length === 0)}
                  onClick={() => call.send({ type: 'roomNext' })}
                  data-testid="room-next"
                >
                  Next
                </Button>
                <Button variant="outlined" color="error" onClick={() => setConfirmEnd(true)} data-testid="room-end">
                  End room
                </Button>
              </>
            )}
          </CallControls>

          {isHost && !idle && (
            <section className="room-queue" aria-labelledby="queue-title">
              <h2 id="queue-title">Queue</h2>
              {queue.length === 0 ? (
                <p>Nobody is waiting.</p>
              ) : (
                <ol data-testid="room-queue">
                  {queue.map((q) => <li key={q.userId}>{q.name}</li>)}
                </ol>
              )}
            </section>
          )}
        </section>

        <ChatPanel call={call} />
      </main>

      <footer className="footer">
        <Link to="/terms" data-testid="footer-terms">Terms</Link>
        <Link to="/privacy" data-testid="footer-privacy">Privacy</Link>
      </footer>

      <ReportDialog
        open={reportOpen}
        inCall={inCall}
        onClose={() => setReportOpen(false)}
        onSubmit={(reason) => {
          setReportOpen(false);
          leaveWith({ type: 'report', reason }, `Report sent. ${removed}`);
        }}
      />

      <Dialog open={confirmEnd} onClose={() => setConfirmEnd(false)} aria-labelledby="end-title" aria-describedby="end-text">
        <DialogTitle id="end-title">End this room?</DialogTitle>
        <DialogContent>
          <DialogContentText id="end-text">Everyone still waiting is sent out and the room cannot be reopened.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEnd(false)} data-testid="end-keep">Keep going</Button>
          <Button
            variant="contained"
            color="error"
            disableElevation
            onClick={() => {
              setConfirmEnd(false);
              call.send({ type: 'roomEnd' });
            }}
            data-testid="end-confirm"
          >
            End room
          </Button>
        </DialogActions>
      </Dialog>

      <Notice call={call} />
    </div>
  );
}
