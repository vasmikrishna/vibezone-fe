import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
import CallEndIcon from '@mui/icons-material/CallEnd';
import SendIcon from '@mui/icons-material/Send';
import Onboarding from './utils/Onboarding';
import StatusWithNumber from './components/activeUsers';
import TagInput from './components/Tags/taginput';
import logo from './assets/vibezone-logo.svg';
import './video.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const MAX_RETRY_MS = 30000;
const REPLACED_CLOSE_CODE = 4000;
const MAX_NAME_LENGTH = 30;
const MAX_CHAT_LENGTH = 500;

const REPORT_REASONS = [
  ['nudity', 'Nudity or sexual content'],
  ['harassment', 'Harassment or hate'],
  ['underage', 'Appears to be under 18'],
  ['spam', 'Spam or advertising'],
  ['other', 'Something else'],
];

const QUALITY_COLORS = { High: '#4caf50', Medium: '#ff9800', Low: '#f44336' };

function getDeviceId() {
  let id = localStorage.getItem('vibezoneDeviceId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('vibezoneDeviceId', id);
  }
  return id;
}

function measureQuality() {
  const connection = navigator.connection;
  if (!connection) return 'Unknown';
  const { effectiveType, downlink } = connection;
  if (downlink >= 5 || effectiveType === '4g') return 'High';
  if (downlink >= 1) return 'Medium';
  return 'Low';
}

export default function VideoPage() {
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const iceServersRef = useRef([]);
  const pendingCandidatesRef = useRef([]);
  const stoppedRef = useRef(true);
  const retryTimerRef = useRef(null);
  const retryDelayRef = useRef(1000);
  const joinTagsRef = useRef([]);
  const joinNameRef = useRef('');
  const chatIdRef = useRef(0);
  const chatListRef = useRef(null);
  const camerasRef = useRef([]);
  const cameraIndexRef = useRef(0);
  const qualityRef = useRef('Unknown');
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);

  // idle | connecting | searching | connected | reconnecting | banned
  const [status, setStatus] = useState('idle');
  const [localStream, setLocalStream] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [cameraCount, setCameraCount] = useState(0);
  const [tags, setTags] = useState([]);
  const [sharedTags, setSharedTags] = useState([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [name, setName] = useState(() => localStorage.getItem('vibezoneName') || '');
  const [partnerName, setPartnerName] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [partnerQuality, setPartnerQuality] = useState('Unknown');
  const [retrySeconds, setRetrySeconds] = useState(0);
  const [bannedUntil, setBannedUntil] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [notice, setNotice] = useState('');

  const send = (message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(message));
  };

  // Attach the local stream after render and keep mic/camera state across calls and camera switches.
  useEffect(() => {
    if (localVideo.current) localVideo.current.srcObject = localStream;
    localStream?.getAudioTracks().forEach((t) => { t.enabled = micOn; });
    localStream?.getVideoTracks().forEach((t) => { t.enabled = videoOn; });
  }, [localStream, micOn, videoOn]);

  useEffect(() => {
    const check = () => {
      const quality = measureQuality();
      if (quality !== qualityRef.current) {
        qualityRef.current = quality;
        if (pcRef.current) send({ type: 'networkQualityUpdate', quality });
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const closePeer = () => {
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidatesRef.current = [];
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    setSharedTags([]);
    setPartnerQuality('Unknown');
    setPartnerName('');
    setMessages([]);
    setChatText('');
  };

  useEffect(() => {
    const list = chatListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const addMessage = (from, text) => {
    if (typeof text !== 'string') return;
    chatIdRef.current += 1;
    setMessages((list) => [...list, { id: chatIdRef.current, from, text }]);
  };

  const sendChat = (e) => {
    e.preventDefault();
    const text = chatText.trim();
    if (!text || status !== 'connected') return;
    send({ type: 'chat', text });
    setChatText('');
  };

  const changeName = (value) => {
    setName(value);
    localStorage.setItem('vibezoneName', value);
  };

  const leaveCall = (message) => {
    send(message);
    closePeer();
    setStatus('searching');
  };

  const flushCandidates = async (pc) => {
    const queued = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // A stale candidate from a previous negotiation; safe to drop.
      }
    }
  };

  const limitBitrate = async (pc) => {
    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
    if (!sender) return;
    const params = sender.getParameters();
    if (!params.encodings?.length) return;
    params.encodings[0].maxBitrate = 300000;
    try {
      await sender.setParameters(params);
    } catch {
      // Not supported by this browser; the default bitrate is used.
    }
  };

  const createPeer = () => {
    closePeer();
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    pcRef.current = pc;
    const stream = streamRef.current;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.ontrack = ({ streams }) => {
      if (remoteVideo.current && streams[0]) remoteVideo.current.srcObject = streams[0];
    };
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) send({ type: 'candidate', candidate });
    };
    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return;
      // 'disconnected' often recovers by itself; a peer that really left arrives as partnerLeft.
      if (pc.connectionState === 'failed') leaveCall({ type: 'skip' });
    };
    limitBitrate(pc);
    return pc;
  };

  const makeOffer = async (pc) => {
    try {
      await pc.setLocalDescription(await pc.createOffer());
      send({ type: 'offer', offer: pc.localDescription });
    } catch {
      if (pcRef.current === pc) leaveCall({ type: 'skip' });
    }
  };

  const handleOffer = async (offer) => {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      await pc.setRemoteDescription(offer);
      await flushCandidates(pc);
      await pc.setLocalDescription(await pc.createAnswer());
      send({ type: 'answer', answer: pc.localDescription });
    } catch {
      if (pcRef.current === pc) leaveCall({ type: 'skip' });
    }
  };

  const handleAnswer = async (answer) => {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      await pc.setRemoteDescription(answer);
      await flushCandidates(pc);
    } catch {
      if (pcRef.current === pc) leaveCall({ type: 'skip' });
    }
  };

  const handleCandidate = async (candidate) => {
    const pc = pcRef.current;
    if (!pc || !candidate) return;
    if (!pc.remoteDescription) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(candidate);
    } catch {
      // A stale candidate from a previous negotiation; safe to drop.
    }
  };

  const handleMessage = (data) => {
    switch (data.type) {
      case 'ready':
        iceServersRef.current = Array.isArray(data.iceServers) ? data.iceServers : [];
        retryDelayRef.current = 1000;
        setStatus('searching');
        break;
      case 'banned':
        stoppedRef.current = true;
        setBannedUntil(data.until);
        setStatus('banned');
        closePeer();
        wsRef.current?.close();
        break;
      case 'activeUsers':
        setActiveUsers(data.value);
        break;
      case 'matched': {
        const pc = createPeer();
        setSharedTags(Array.isArray(data.sharedTags) ? data.sharedTags : []);
        setPartnerName(typeof data.partnerName === 'string' ? data.partnerName : 'Guest');
        setStatus('connected');
        send({ type: 'networkQualityUpdate', quality: qualityRef.current });
        if (data.role === 'caller') makeOffer(pc);
        break;
      }
      case 'offer':
        handleOffer(data.offer);
        break;
      case 'answer':
        handleAnswer(data.answer);
        break;
      case 'candidate':
        handleCandidate(data.candidate);
        break;
      case 'networkQualityUpdate':
        setPartnerQuality(data.quality);
        break;
      case 'chat':
        addMessage('partner', data.text);
        break;
      case 'chatSent':
        addMessage('me', data.text);
        break;
      case 'partnerLeft':
        closePeer();
        setStatus('searching');
        break;
      case 'error':
        setNotice(data.message === 'chat rate limit' ? 'Slow down: at most 2 messages a second.' : `Server error: ${data.message}`);
        break;
      default:
        break;
    }
  };

  const connect = () => {
    if (!SERVER_URL) {
      stoppedRef.current = true;
      setStatus('idle');
      setNotice('Server URL is not configured.');
      return;
    }
    let ws;
    try {
      ws = new WebSocket(SERVER_URL);
    } catch {
      stoppedRef.current = true;
      setStatus('idle');
      setNotice('Server URL is invalid.');
      return;
    }
    wsRef.current = ws;
    setStatus('connecting');
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', deviceId: getDeviceId(), tags: joinTagsRef.current, name: joinNameRef.current }));
    };
    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (wsRef.current === ws && data && typeof data.type === 'string') handleMessage(data);
    };
    ws.onclose = ({ code }) => {
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      closePeer();
      if (code === REPLACED_CLOSE_CODE) {
        stopRef.current();
        setNotice('Vibezone was opened in another tab or window.');
        return;
      }
      if (stoppedRef.current) return;
      const delay = retryDelayRef.current;
      retryDelayRef.current = Math.min(delay * 2, MAX_RETRY_MS);
      setRetrySeconds(delay / 1000);
      setStatus('reconnecting');
      retryTimerRef.current = setTimeout(connect, delay);
    };
  };

  const listCameras = async (stream) => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      camerasRef.current = devices.filter((d) => d.kind === 'videoinput' && d.deviceId);
    } catch {
      camerasRef.current = [];
    }
    const currentId = stream.getVideoTracks()[0]?.getSettings().deviceId;
    cameraIndexRef.current = Math.max(0, camerasRef.current.findIndex((c) => c.deviceId === currentId));
    setCameraCount(camerasRef.current.length);
  };

  const getMedia = async () => {
    if (streamRef.current) return streamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setLocalStream(stream);
      listCameras(stream);
      return stream;
    } catch (err) {
      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
      const missing = err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError';
      setMediaError(denied ? 'denied' : missing ? 'nodevice' : 'other');
      return null;
    }
  };

  const start = async () => {
    setMediaError(null);
    setBannedUntil(null);
    if (!(await getMedia())) return;
    stoppedRef.current = false;
    joinTagsRef.current = tags;
    joinNameRef.current = name.trim();
    retryDelayRef.current = 1000;
    connect();
  };

  const stop = () => {
    stoppedRef.current = true;
    clearTimeout(retryTimerRef.current);
    const ws = wsRef.current;
    wsRef.current = null;
    ws?.close();
    closePeer();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLocalStream(null);
    setStatus('idle');
  };

  const stopRef = useRef(stop);
  stopRef.current = stop;
  useEffect(() => () => stopRef.current(), []);

  const switchCamera = async () => {
    const cameras = camerasRef.current;
    const stream = streamRef.current;
    if (cameras.length < 2 || !stream) return;
    const next = (cameraIndexRef.current + 1) % cameras.length;
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: cameras[next].deviceId } },
      });
      const track = fresh.getVideoTracks()[0];
      const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(track);
      stream.getVideoTracks().forEach((old) => {
        stream.removeTrack(old);
        old.stop();
      });
      stream.addTrack(track);
      cameraIndexRef.current = next;
      setLocalStream(new MediaStream(stream.getTracks()));
    } catch {
      setNotice('Could not switch camera.');
    }
  };

  const submitReport = () => {
    leaveCall({ type: 'report', reason: reportReason });
    setReportOpen(false);
    setReportReason('');
    setNotice("Report sent. You won't be matched with this person again.");
  };

  const block = () => {
    leaveCall({ type: 'block' });
    setNotice("Blocked. You won't be matched with this person again.");
  };

  if (mediaError) {
    return (
      <main className="page" data-testid="media-error">
        <h2>Camera and microphone needed</h2>
        <p>
          {mediaError === 'denied'
            ? `Access to your camera or microphone was blocked. Allow it in ${Capacitor.isNativePlatform() ? 'your device Settings, under Vibezone' : 'your browser’s site settings'}, then try again.`
            : mediaError === 'nodevice'
              ? 'No camera or microphone was found. Connect one, then try again.'
              : 'Your camera or microphone could not be started. Close other apps using it, then try again.'}
        </p>
        <Button variant="contained" onClick={start} data-testid="media-retry">Try again</Button>
      </main>
    );
  }

  const inCall = status === 'connected';
  const idle = status === 'idle' || status === 'banned';
  const statusText = {
    idle: 'Press Connect to meet someone.',
    connecting: 'Connecting…',
    searching: 'Looking for someone…',
    connected: 'Connected',
    reconnecting: `Connection lost. Reconnecting in ${retrySeconds}s…`,
    banned: `You are banned until ${bannedUntil ? new Date(bannedUntil).toLocaleString() : 'later'}.`,
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
            onClick={idle ? start : stop}
            data-testid="start-stop"
          >
            {idle ? 'Connect' : 'Stop'}
          </Button>
        </div>
        <div className="top-bar-info">
          <StatusWithNumber number={activeUsers} />
        </div>
      </header>
      {!idle && <p className="hint">Name and key word changes apply the next time you press Connect.</p>}

      <main className="call-layout">
        <section className="call-column" aria-label="Video call">
          <div className="video-container">
            <div className="video-wrapper">
              <video ref={remoteVideo} autoPlay playsInline className="video" data-testid="remote-video" />
              {inCall ? (
                <span
                  className="partner-quality"
                  style={{ backgroundColor: QUALITY_COLORS[partnerQuality] || '#9e9e9e' }}
                  title={`Partner network: ${partnerQuality}`}
                />
              ) : (
                <div className="loader">
                  {!idle && <CircularProgress sx={{ color: '#8F47FF' }} aria-label="Searching" />}
                </div>
              )}
            </div>
            <div className="video-wrapper">
              <video ref={localVideo} autoPlay playsInline muted className="video local" data-testid="local-video" />
              {cameraCount > 1 && (
                <IconButton
                  className="switch-camera"
                  onClick={switchCamera}
                  aria-label="Switch camera"
                  data-testid="switch-camera"
                >
                  <CameraswitchIcon />
                </IconButton>
              )}
            </div>
          </div>

          <p className="status" role="status" data-testid="status">
            {statusText}
            {inCall && sharedTags.length > 0 && ` · You both like: ${sharedTags.join(', ')}`}
          </p>

          <div className="controls">
            <IconButton
              className="mute-button"
              onClick={() => setMicOn((on) => !on)}
              aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
              aria-pressed={!micOn}
              data-testid="toggle-mic"
            >
              {micOn ? <MicIcon className="icon" /> : <MicOffIcon className="icon" />}
            </IconButton>
            <IconButton
              className="video-button"
              onClick={() => setVideoOn((on) => !on)}
              aria-label={videoOn ? 'Turn camera off' : 'Turn camera on'}
              aria-pressed={!videoOn}
              data-testid="toggle-video"
            >
              {videoOn ? <VideocamIcon className="icon" /> : <VideocamOffIcon className="icon" />}
            </IconButton>
            <IconButton
              className="hang-up"
              disabled={idle}
              onClick={stop}
              aria-label="Stop"
              data-testid="hang-up"
            >
              <CallEndIcon />
            </IconButton>
            <Button
              className="skip-button"
              variant="contained"
              disableElevation
              disabled={!inCall}
              onClick={() => leaveCall({ type: 'skip' })}
              data-testid="skip"
            >
              Skip
            </Button>
            {inCall && (
              <>
                <Button variant="outlined" color="warning" onClick={() => setReportOpen(true)} data-testid="report">
                  Report
                </Button>
                <Button variant="outlined" color="error" onClick={block} data-testid="block">
                  Block
                </Button>
              </>
            )}
          </div>
        </section>

        <aside className="chat-panel" aria-label="Text chat">
          <h2 className="chat-partner" data-testid="partner-name">
            {inCall ? partnerName : 'Chat'}
          </h2>
          <ul className="chat-messages" ref={chatListRef} aria-live="polite" data-testid="chat-messages">
            {messages.length === 0 && (
              <li className="chat-empty">{inCall ? 'Say hello.' : 'Messages appear here during a call.'}</li>
            )}
            {messages.map((m) => (
              <li key={m.id} className={`chat-message ${m.from}`} data-testid="chat-message">
                <span className="visually-hidden">{m.from === 'me' ? 'You: ' : `${partnerName}: `}</span>
                {m.text}
              </li>
            ))}
          </ul>
          <form className="chat-form" onSubmit={sendChat}>
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              maxLength={MAX_CHAT_LENGTH}
              disabled={!inCall}
              placeholder="Type a message"
              aria-label="Type a message"
              className="chat-input"
              data-testid="chat-input"
            />
            <IconButton
              type="submit"
              disabled={!inCall || !chatText.trim()}
              aria-label="Send message"
              className="chat-send"
              data-testid="chat-send"
            >
              <SendIcon />
            </IconButton>
          </form>
        </aside>
      </main>

      <footer className="footer">
        <Link to="/terms" data-testid="footer-terms">Terms</Link>
        <Link to="/privacy" data-testid="footer-privacy">Privacy</Link>
      </footer>

      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} aria-labelledby="report-title">
        <DialogTitle id="report-title">Report this person</DialogTitle>
        <DialogContent>
          <RadioGroup
            aria-labelledby="report-title"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
          >
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
          <Button onClick={() => setReportOpen(false)} data-testid="report-cancel">Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            disabled={!reportReason || !inCall}
            onClick={submitReport}
            data-testid="report-submit"
          >
            Report
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() => setNotice('')}
        message={notice}
        data-testid="notice"
      />
    </div>
  );
}
