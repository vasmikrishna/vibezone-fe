// Records a call on this device only: both videos side by side on a canvas plus both voices mixed.
const WIDTH = 1280;
const HEIGHT = 480;
const TILE = WIDTH / 2;
const MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
const AudioCtx = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : undefined;

const mimeType = typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function'
  ? MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || '' : '';

export const recordingSupported = Boolean(mimeType && AudioCtx
  && typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype);

const pad = (n) => String(n).padStart(2, '0');
function fileName(date, ext) {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `vibezone-call-${day}-${pad(date.getHours())}${pad(date.getMinutes())}.${ext}`;
}

/** Draws a video into a tile like object-fit: cover, or a dark tile with the person's initial. */
function drawTile(ctx, x, video, on, name) {
  const vw = video?.videoWidth;
  const vh = video?.videoHeight;
  if (on && vw && vh) {
    const scale = Math.max(TILE / vw, HEIGHT / vh);
    const sw = TILE / scale;
    const sh = HEIGHT / scale;
    ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, x, 0, TILE, HEIGHT);
  } else {
    ctx.fillStyle = '#1b1530';
    ctx.fillRect(x, 0, TILE, HEIGHT);
    ctx.fillStyle = '#8f47ff';
    ctx.beginPath();
    ctx.arc(x + TILE / 2, HEIGHT / 2, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((name.charAt(0) || '?').toUpperCase(), x + TILE / 2, HEIGHT / 2 + 2);
  }
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const width = ctx.measureText(name).width + 20;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x + 12, HEIGHT - 44, width, 30);
  ctx.fillStyle = '#fff';
  ctx.fillText(name, x + 22, HEIGHT - 23);
}

/**
 * Starts recording. partner/me: { video: HTMLVideoElement, stream: MediaStream, name, videoOn: () => boolean }.
 * Returns { finish() } which stops, downloads the file and resolves with its size in bytes. Throws if it cannot start.
 */
export function startRecorder({ partner, me }) {
  const startedAt = new Date();
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const draw = () => {
    drawTile(ctx, 0, partner.video, partner.videoOn(), partner.name);
    drawTile(ctx, TILE, me.video, me.videoOn(), me.name);
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('Recorded on Vibezone', WIDTH - 16, 30);
  };

  // requestAnimationFrame pauses in a hidden tab, so fall back to a timer there.
  let raf = 0;
  let timer = 0;
  const schedule = () => {
    if (document.visibilityState === 'hidden') timer = setTimeout(loop, 1000 / 30);
    else raf = requestAnimationFrame(loop);
  };
  const loop = () => {
    draw();
    schedule();
  };
  const onVisibility = () => {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    schedule();
  };
  draw();
  schedule();
  document.addEventListener('visibilitychange', onVisibility);

  const audio = new AudioCtx();
  audio.resume().catch(() => {});
  const mix = audio.createMediaStreamDestination();
  for (const stream of [partner.stream, me.stream]) {
    const tracks = stream?.getAudioTracks() ?? [];
    if (tracks.length) audio.createMediaStreamSource(new MediaStream(tracks)).connect(mix);
  }
  const videoStream = canvas.captureStream(30);
  const stream = new MediaStream([...videoStream.getVideoTracks(), ...mix.stream.getAudioTracks()]);

  const cleanup = () => {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    stream.getTracks().forEach((t) => t.stop());
    audio.close().catch(() => {});
  };

  const chunks = [];
  let recorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.start(1000);
  } catch (err) {
    cleanup();
    throw err;
  }

  let finished;
  return {
    finish() {
      finished ??= new Promise((resolve) => {
        recorder.onstop = () => {
          cleanup();
          const blob = new Blob(chunks, { type: recorder.mimeType || mimeType });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName(startedAt, mimeType.includes('mp4') ? 'mp4' : 'webm');
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000); // give the download time to start
          resolve(blob.size);
        };
        if (recorder.state === 'inactive') recorder.onstop();
        else recorder.stop();
      });
      return finished;
    },
  };
}
