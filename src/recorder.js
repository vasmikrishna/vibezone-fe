// Records a call on this device only: both videos side by side on a canvas, stacked 9:16 for a reel, or audio only; plus both voices mixed.
const QUALITY = {
  low: { width: 640, height: 240, video: 1_000_000, reel: { width: 540, height: 960 } },
  standard: { width: 1280, height: 480, video: 2_500_000, reel: { width: 720, height: 1280 } },
  high: { width: 1920, height: 720, video: 5_000_000, reel: { width: 1080, height: 1920 } },
};
const MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4'];
const AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
const AudioCtx = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : undefined;

const canCheck = typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function';
const supported = (t) => canCheck && MediaRecorder.isTypeSupported(t);
const mimeType = MIME_TYPES.find(supported) || '';

export const supportedFormats = { webm: supported('video/webm'), mp4: supported('video/mp4') };

/** The first supported type in the chosen format, else the first supported one at all. */
function pickMime(list, format) {
  const inFormat = format === 'auto' ? [] : list.filter((t) => t.includes(format));
  return inFormat.find(supported) || list.find(supported) || '';
}

export const recordingSupported = Boolean(mimeType && AudioCtx
  && typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype);

const pad = (n) => String(n).padStart(2, '0');
function fileName(date, ext) {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `vibezone-call-${day}-${pad(date.getHours())}${pad(date.getMinutes())}.${ext}`;
}

/** Draws a video into a tile like object-fit: cover, or a dark tile with the person's initial. */
function drawTile(ctx, x, y, w, h, video, on, name) {
  const k = h / 480; // fonts and circle scale with the tile
  const vw = video?.videoWidth;
  const vh = video?.videoHeight;
  if (on && vw && vh) {
    const scale = Math.max(w / vw, h / vh);
    const sw = w / scale;
    const sh = h / scale;
    ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, x, y, w, h);
  } else {
    ctx.fillStyle = '#1b1530';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#8f47ff';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, 56 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(56 * k)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((name.charAt(0) || '?').toUpperCase(), x + w / 2, y + h / 2 + 2 * k);
  }
  ctx.font = `600 ${Math.round(18 * k)}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const labelWidth = ctx.measureText(name).width + 20 * k;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x + 12 * k, y + h - 44 * k, labelWidth, 30 * k);
  ctx.fillStyle = '#fff';
  ctx.fillText(name, x + 22 * k, y + h - 23 * k);
}

/**
 * Starts recording. partner/me: { video: HTMLVideoElement, stream: MediaStream, name, videoOn: () => boolean }.
 * type 'video' | 'reel' (vertical 9:16, partner on top, MP4 preferred) | 'audio', quality 'low' | 'standard' | 'high', format 'auto' | 'webm' | 'mp4' (falls back to auto).
 * Returns { finish() } which stops, downloads the file and resolves with its size in bytes. Throws if it cannot start.
 */
export function startRecorder({ partner, me, type = 'video', quality = 'standard', format = 'auto' }) {
  const startedAt = new Date();
  const audioOnly = type === 'audio';
  const reel = type === 'reel';
  const mime = audioOnly ? pickMime(AUDIO_TYPES, format)
    : pickMime(MIME_TYPES, reel && format === 'auto' ? 'mp4' : format); // Instagram takes MP4 as is

  const audio = new AudioCtx();
  audio.resume().catch(() => {});
  const mix = audio.createMediaStreamDestination();
  for (const stream of [partner.stream, me.stream]) {
    const tracks = stream?.getAudioTracks() ?? [];
    if (tracks.length) audio.createMediaStreamSource(new MediaStream(tracks)).connect(mix);
  }

  const q = QUALITY[quality] || QUALITY.standard;
  const size = reel ? q.reel : q;
  const stopDrawing = audioOnly ? () => {} : drawCanvas(partner, me, size, reel);
  const stream = audioOnly ? mix.stream
    : new MediaStream([...stopDrawing.stream.getVideoTracks(), ...mix.stream.getAudioTracks()]);

  const cleanup = () => {
    stopDrawing();
    stream.getTracks().forEach((t) => t.stop());
    audio.close().catch(() => {});
  };

  const chunks = [];
  let recorder;
  try {
    recorder = new MediaRecorder(stream, {
      mimeType: mime, audioBitsPerSecond: 128_000, ...(audioOnly ? {} : { videoBitsPerSecond: q.video }),
    });
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
          const blob = new Blob(chunks, { type: recorder.mimeType || mime });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const ext = (recorder.mimeType || mime).includes('mp4') ? (audioOnly ? 'm4a' : 'mp4') : 'webm';
          link.download = fileName(startedAt, ext);
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

/** Draws both tiles onto a canvas every frame; returns a stop function with the canvas stream on it. */
function drawCanvas(partner, me, { width, height }, reel) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const draw = () => {
    if (reel) {
      drawTile(ctx, 0, 0, width, height / 2, partner.video, partner.videoOn(), partner.name);
      drawTile(ctx, 0, height / 2, width, height / 2, me.video, me.videoOn(), me.name);
    } else {
      drawTile(ctx, 0, 0, width / 2, height, partner.video, partner.videoOn(), partner.name);
      drawTile(ctx, width / 2, 0, width / 2, height, me.video, me.videoOn(), me.name);
    }
    const k = reel ? width / 720 : height / 480;
    ctx.font = `600 ${Math.round(16 * k)}px system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('Recorded on Vibezone', width - 16 * k, 30 * k);
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

  const stop = () => {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibility);
  };
  stop.stream = canvas.captureStream(30);
  return stop;
}
