import { useCallback, useEffect, useRef, useState } from 'react';
import { recordingSupported, startRecorder } from './recorder';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const MAX_RETRY_MS = 30000;
const REPLACED_CLOSE_CODE = 4000;
const MEDIA_ON = { video: true, audio: true, hold: false };
const liveTrack = (t) => Boolean(t) && t.readyState === 'live' && !t.muted;
const FRIEND_STATUSES = ['none', 'requested', 'incoming', 'friends'];
const RECORD_ASK_MS = 30000;
const RECORD_IDLE = { state: 'idle', by: null, startedAt: null };
const ERRORS = {
  'chat rate limit': 'Slow down: at most 2 messages a second.',
  'too many friend requests, try later': 'Too many friend requests. Try again later.',
  'sign in to add friends': 'Sign in to add friends.',
  'partner is a guest': 'Your partner is not signed in, so you cannot add them.',
  blocked: 'You cannot add this person.',
};

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
 * preview: open the camera on mount so the self-view shows before connecting.
 */
export function useCall({ onMessage, failMessage = { type: 'skip' }, preview: autoPreview = false } = {}) {
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const mediaPromiseRef = useRef(null); // a getUserMedia request in flight, shared by preview and start
  const mediaGenRef = useRef(0); // bumped by stop() so a request that finishes afterwards is dropped
  const partnerLeftTimerRef = useRef(null);
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
  const [partnerLeft, setPartnerLeft] = useState(false); // briefly true after the partner hangs up
  const [friendStatus, setFriendStatus] = useState('none'); // none | requested | incoming | friends
  const [canAddFriend, setCanAddFriend] = useState(false); // both of you signed in
  const friendStatusRef = useRef('none');
  friendStatusRef.current = friendStatus;
  const [partnerMedia, setPartnerMedia] = useState(MEDIA_ON); // what the partner said they send
  const [remoteVideoMuted, setRemoteVideoMuted] = useState(false); // no frames arriving (older clients)
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden');
  const [, setTrackTick] = useState(0); // re-render when a local track is muted, unmuted or ends
  const mediaRef = useRef(MEDIA_ON);
  const [streak, setStreakState] = useState(null); // { count, best } for a signed-in user
  // Recording needs the partner's consent: idle | requesting | asked (partner asked us) | recording.
  const [record, setRecord] = useState(RECORD_IDLE); // { state, by: 'me' | 'partner', startedAt }
  const recordRef = useRef('idle');
  const recorderRef = useRef(null); // only on the side that asked
  const recordTimerRef = useRef(null);
  const partnerNameRef = useRef('');
  partnerNameRef.current = partnerName || 'Your partner';
  const partnerVideoRef = useRef(true);
  partnerVideoRef.current = partnerMedia.video && !partnerMedia.hold && !remoteVideoMuted;
  const streakRef = useRef(null);

  const setStreak = useCallback((value) => {
    streakRef.current = value;
    setStreakState(value);
  }, []);

  const send = (message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(message));
  };

  // Attach the local stream after render and keep mic/camera state across calls and camera switches.
  useEffect(() => {
    if (localVideo.current) localVideo.current.srcObject = localStream;
    localStream?.getAudioTracks().forEach((t) => { t.enabled = micOn; });
    localStream?.getVideoTracks().forEach((t) => { t.enabled = videoOn; });
  }, [localStream, micOn, videoOn]);

  // Our camera/mic state as the partner sees it; hold = page hidden or the OS took a track (e.g. a phone call).
  const camTrack = localStream?.getVideoTracks()[0];
  const micTrack = localStream?.getAudioTracks()[0];
  const tracks = localStream?.getTracks() ?? [];
  const media = {
    video: videoOn && liveTrack(camTrack),
    audio: micOn && liveTrack(micTrack),
    hold: hidden || tracks.some((t) => t.muted || t.readyState === 'ended'),
  };
  mediaRef.current = media;

  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!localStream) return undefined;
    const bump = () => setTrackTick((n) => n + 1);
    const list = localStream.getTracks();
    const events = ['mute', 'unmute', 'ended'];
    list.forEach((t) => events.forEach((e) => t.addEventListener(e, bump)));
    return () => list.forEach((t) => events.forEach((e) => t.removeEventListener(e, bump)));
  }, [localStream]);

  // Tell the partner whenever it changes; matched sends it once for each new partner.
  useEffect(() => {
    if (pcRef.current) send({ type: 'mediaState', ...mediaRef.current });
  }, [media.video, media.audio, media.hold]);

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

  const setRecording = (state, by = null) => {
    clearTimeout(recordTimerRef.current);
    recordRef.current = state;
    setRecord(state === 'idle' ? RECORD_IDLE : { state, by, startedAt: state === 'recording' ? Date.now() : null });
  };

  /** Stops our recorder, if any, and downloads what was recorded. */
  const finishRecording = () => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    recorder?.finish().then(
      () => setNotice('Recording saved to your downloads'),
      () => setNotice('Could not save the recording.'),
    );
  };

  const beginRecording = () => {
    try {
      recorderRef.current = startRecorder({
        partner: {
          video: remoteVideo.current, stream: remoteVideo.current?.srcObject, name: partnerNameRef.current,
          videoOn: () => partnerVideoRef.current,
        },
        me: { video: localVideo.current, stream: streamRef.current, name: 'You', videoOn: () => mediaRef.current.video },
      });
    } catch {
      send({ type: 'recordStop' });
      setRecording('idle');
      setNotice('Could not start recording.');
      return;
    }
    setRecording('recording', 'me');
    setNotice('Recording started');
  };

  const requestRecording = () => {
    if (!recordingSupported || !pcRef.current || recordRef.current !== 'idle') return;
    send({ type: 'recordRequest' });
    setRecording('requesting');
    recordTimerRef.current = setTimeout(() => {
      if (recordRef.current !== 'requesting') return;
      send({ type: 'recordStop' }); // withdraws the request so a late Allow does nothing
      setRecording('idle');
      setNotice('No answer to your recording request');
    }, RECORD_ASK_MS);
  };

  const answerRecording = (allow) => {
    if (recordRef.current !== 'asked') return;
    send({ type: allow ? 'recordAccept' : 'recordDecline' });
    setRecording(allow ? 'recording' : 'idle', allow ? 'partner' : null);
  };

  const stopRecording = () => {
    if (recordRef.current !== 'recording') return;
    send({ type: 'recordStop' });
    finishRecording();
    setRecording('idle');
  };

  const handleRecordMessage = (type) => {
    const state = recordRef.current;
    const name = partnerNameRef.current;
    if (type === 'recordRequest') {
      if (state === 'idle') setRecording('asked');
      else send({ type: 'recordDecline' }); // already asking or recording
    } else if (type === 'recordAccept') {
      if (state === 'requesting') beginRecording();
      else send({ type: 'recordStop' }); // too late: tell them we are not recording
    } else if (type === 'recordDecline') {
      if (state === 'requesting') {
        setRecording('idle');
        setNotice(`${name} declined recording`);
      }
    } else if (type === 'recordStop' && state !== 'idle') {
      if (state === 'recording') setNotice(`${name} stopped recording`);
      finishRecording();
      setRecording('idle');
    }
  };

  const closePeer = () => {
    finishRecording(); // the call ended: keep what was recorded
    setRecording('idle');
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidatesRef.current = [];
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    setSharedTags([]);
    setPartnerQuality('Unknown');
    setPartnerMedia(MEDIA_ON);
    setRemoteVideoMuted(false);
    setPartnerName('');
    setFriendStatus('none');
    setCanAddFriend(false);
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
    pc.ontrack = ({ track, streams }) => {
      if (remoteVideo.current && streams[0]) remoteVideo.current.srcObject = streams[0];
      if (track.kind !== 'video') return;
      // Fallback for partners that never send mediaState: a muted remote track means no frames.
      track.onmute = () => pcRef.current === pc && setRemoteVideoMuted(true);
      track.onunmute = () => pcRef.current === pc && setRemoteVideoMuted(false);
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
        clearTimeout(partnerLeftTimerRef.current);
        setPartnerLeft(false);
        const pc = createPeer();
        setSharedTags(Array.isArray(data.sharedTags) ? data.sharedTags : []);
        setPartnerName(typeof data.partnerName === 'string' ? data.partnerName : 'Guest');
        setCanAddFriend(data.canAddFriend === true);
        setFriendStatus(FRIEND_STATUSES.includes(data.friendStatus) ? data.friendStatus : 'none');
        setStatus('connected');
        send({ type: 'networkQualityUpdate', quality: qualityRef.current });
        send({ type: 'mediaState', ...mediaRef.current });
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
      case 'mediaState':
        if ([data.video, data.audio, data.hold].every((v) => typeof v === 'boolean')) {
          setPartnerMedia({ video: data.video, audio: data.audio, hold: data.hold });
        }
        break;
      case 'recordRequest':
      case 'recordAccept':
      case 'recordDecline':
      case 'recordStop':
        handleRecordMessage(data.type);
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
        setPartnerLeft(true);
        clearTimeout(partnerLeftTimerRef.current);
        partnerLeftTimerRef.current = setTimeout(() => setPartnerLeft(false), 2500);
        break;
      case 'friendStatus':
        if (FRIEND_STATUSES.includes(data.status)) setFriendStatus(data.status);
        break;
      case 'friendRequestReceived': {
        const who = typeof data.name === 'string' && data.name ? data.name : 'Your partner';
        // Both of you asked at once: the server accepts it, so you are friends.
        if (friendStatusRef.current === 'requested') {
          setFriendStatus('friends');
          setNotice(`You and ${who} are now friends.`);
        } else {
          setFriendStatus('incoming');
          setNotice(`${who} sent you a friend request. Accept it in Friends.`);
        }
        break;
      }
      case 'streak': {
        if (!Number.isFinite(data.count)) break;
        if (data.count > (streakRef.current?.count ?? 0)) setNotice(`🔥 ${data.count}-day streak!`);
        setStreak({ count: data.count, best: Number.isFinite(data.best) ? data.best : data.count });
        break;
      }
      case 'error':
        setNotice(ERRORS[data.message] || `Server error: ${data.message}`);
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

  const getMedia = () => {
    if (streamRef.current) return Promise.resolve(streamRef.current);
    if (mediaPromiseRef.current) return mediaPromiseRef.current;
    const gen = mediaGenRef.current;
    const request = (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (gen !== mediaGenRef.current) { // stopped or unmounted while the prompt was open
          stream.getTracks().forEach((t) => t.stop());
          return null;
        }
        streamRef.current = stream;
        setLocalStream(stream);
        listCameras(stream);
        return stream;
      } catch (err) {
        if (gen !== mediaGenRef.current) return null;
        const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
        const missing = err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError';
        setMediaError(denied ? 'denied' : missing ? 'nodevice' : 'other');
        return null;
      } finally {
        if (mediaPromiseRef.current === request) mediaPromiseRef.current = null;
      }
    })();
    mediaPromiseRef.current = request;
    return request;
  };

  /** Opens the camera and mic for the self-view without connecting. */
  const preview = () => {
    setMediaError(null);
    return getMedia();
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
    mediaGenRef.current += 1;
    mediaPromiseRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLocalStream(null);
    clearTimeout(partnerLeftTimerRef.current);
    setPartnerLeft(false);
    setStatus('idle');
  };

  const stopRef = useRef(stop);
  stopRef.current = stop;
  const previewRef = useRef(preview);
  previewRef.current = preview;
  useEffect(() => {
    if (autoPreview) previewRef.current();
    return () => stopRef.current();
  }, [autoPreview]);

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
    streak, setStreak, friendStatus, canAddFriend, localStream, partnerLeft,
    recording: record.state, recordingBy: record.by, recordingStartedAt: record.startedAt, recordingSupported,
    requestRecording, stopRecording, allowRecording: () => answerRecording(true),
    declineRecording: () => answerRecording(false),
    partnerMedia: { ...partnerMedia, video: partnerMedia.video && !remoteVideoMuted },
    localVideo, remoteVideo, chatListRef,
    send, start, stop, preview, leaveCall, sendChat, switchCamera,
    addFriend: () => send({ type: 'friendRequest' }),
  };
}
