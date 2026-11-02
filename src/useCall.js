import { useEffect, useRef, useState } from 'react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const MAX_RETRY_MS = 30000;
const REPLACED_CLOSE_CODE = 4000;

function measureQuality() {
  const connection = navigator.connection;
  if (!connection) return 'Unknown';
  const { effectiveType, downlink } = connection;
  if (downlink >= 5 || effectiveType === '4g') return 'High';
  if (downlink >= 1) return 'Medium';
  return 'Low';
}

/**
 * Camera, signalling socket, peer connection and text chat shared by random chat and rooms.
 * start(joinMessage) opens the camera and connects, resending joinMessage on every reconnect.
 * onMessage(data) sees every server message first; returning true skips the default handling.
 * failMessage is sent when a call fails (random chat skips; rooms pass null and wait for the host).
 */
export function useCall({ onMessage, failMessage = { type: 'skip' } } = {}) {
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const iceServersRef = useRef([]);
  const pendingCandidatesRef = useRef([]);
  const stoppedRef = useRef(true);
  const retryTimerRef = useRef(null);
  const retryDelayRef = useRef(1000);
  const joinRef = useRef(null);
  const chatIdRef = useRef(0);
  const chatListRef = useRef(null);
  const camerasRef = useRef([]);
  const cameraIndexRef = useRef(0);
  const qualityRef = useRef('Unknown');
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const optionsRef = useRef(null);
  optionsRef.current = { onMessage, failMessage };

  // idle | connecting | searching | connected | reconnecting | banned
  const [status, setStatus] = useState('idle');
  const [localStream, setLocalStream] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [cameraCount, setCameraCount] = useState(0);
  const [sharedTags, setSharedTags] = useState([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [partnerName, setPartnerName] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [partnerQuality, setPartnerQuality] = useState('Unknown');
  const [retrySeconds, setRetrySeconds] = useState(0);
  const [bannedUntil, setBannedUntil] = useState(null);
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

  const leaveCall = (message) => {
    if (message) send(message);
    closePeer();
    setStatus('searching');
  };

  const fail = (pc) => {
    if (pcRef.current === pc) leaveCall(optionsRef.current.failMessage);
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
      if (pc.connectionState === 'failed') fail(pc);
    };
    limitBitrate(pc);
    return pc;
  };

  const makeOffer = async (pc) => {
    try {
      await pc.setLocalDescription(await pc.createOffer());
      send({ type: 'offer', offer: pc.localDescription });
    } catch {
      fail(pc);
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
      fail(pc);
    }
  };

  const handleAnswer = async (answer) => {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      await pc.setRemoteDescription(answer);
      await flushCandidates(pc);
    } catch {
      fail(pc);
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
    if (optionsRef.current.onMessage?.(data)) return;
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
      ws.send(JSON.stringify(joinRef.current));
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

  const start = async (joinMessage) => {
    setMediaError(null);
    setBannedUntil(null);
    if (!(await getMedia())) return;
    stoppedRef.current = false;
    joinRef.current = joinMessage;
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

  return {
    status, mediaError, micOn, setMicOn, videoOn, setVideoOn, cameraCount, sharedTags, activeUsers,
    partnerName, messages, chatText, setChatText, partnerQuality, retrySeconds, bannedUntil, notice, setNotice,
    localVideo, remoteVideo, chatListRef,
    send, start, stop, leaveCall, sendChat, switchCamera,
  };
}
