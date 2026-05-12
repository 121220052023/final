import { useEffect, useRef, useState, useCallback } from 'react';

// ── Stream type detection ─────────────────────────────────────────────────────
const getStreamType = (url) => {
  if (!url) return 'none';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('.m3u8') || url.includes('/playlist/') || url.includes('.smil')) return 'hls';
  return 'embed';
};

// ── Spinner overlay ──────────────────────────────────────────────────────────
const LoadingOverlay = ({ text = 'Connecting to stream…' }) => (
  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
    <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mb-4" />
    <p className="text-white/60 text-sm font-medium animate-pulse">{text}</p>
  </div>
);

// ── Blocked / error fallback UI ───────────────────────────────────────────────
const BlockedOverlay = ({ url, title, onRetry }) => (
  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/95 text-white p-8 text-center">
    <div className="text-6xl mb-4">📡</div>
    <p className="text-lg font-bold mb-2">Stream Blocked in Browser</p>
    <p className="text-sm text-white/50 mb-6 max-w-sm">
      This channel blocks embedded playback. Open it directly in a new tab to watch.
    </p>
    <div className="flex flex-col sm:flex-row gap-3">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors flex items-center gap-2"
      >
        ↗ Watch in New Tab
      </a>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors"
        >
          ↺ Try Again
        </button>
      )}
    </div>
    <p className="text-xs text-white/30 mt-4">Switch servers above — another source may embed correctly.</p>
  </div>
);

// ── "Open in New Tab" persistent pill ────────────────────────────────────────
const ExternalButton = ({ url }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black text-white/80 hover:text-white text-xs font-semibold backdrop-blur transition-all border border-white/10"
    title="Open stream in a new tab"
  >
    ↗ New Tab
  </a>
);

// ── YouTube player ────────────────────────────────────────────────────────────
const YoutubePlayer = ({ url, title }) => {
  const [loading, setLoading] = useState(true);
  return (
    <div className="relative w-full h-full bg-black">
      {loading && <LoadingOverlay text="Loading YouTube Live…" />}
      <ExternalButton url={url} />
      <iframe
        key={url}
        src={url}
        className="absolute inset-0 w-full h-full"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        title={title}
        onLoad={() => setLoading(false)}
      />
    </div>
  );
};

// ── Embed iframe player (DaddyLive, bosscast, etc.) ──────────────────────────
const EmbedPlayer = ({ url, title }) => {
  const [phase, setPhase] = useState('loading'); // loading | live | blocked
  const timers = useRef([]);

  const clearTimers = () => timers.current.forEach(clearTimeout);

  const start = useCallback(() => {
    clearTimers();
    timers.current = [];
    setPhase('loading');

    // After 5s assume the iframe has either loaded or been silently blocked
    timers.current.push(setTimeout(() => setPhase('live'), 5000));

    // After 20s with no visible content, show blocked state
    timers.current.push(setTimeout(() => setPhase('blocked'), 20000));
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    start();
    return clearTimers;
  }, [start]);

  const retry = () => start();

  return (
    <div className="relative w-full h-full bg-black">
      {phase === 'loading' && <LoadingOverlay text="Connecting to stream…" />}
      {phase === 'blocked' && <BlockedOverlay url={url} title={title} onRetry={retry} />}
      {/* Always render the iframe — some embeds load after the spinner hides */}
      <ExternalButton url={url} />
      <iframe
        key={url}
        src={url}
        className="absolute inset-0 w-full h-full"
        frameBorder="0"
        scrolling="no"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        title={title}
        onLoad={() => {
          clearTimers();
          // Keep the "live" phase once loaded; BlockedOverlay was already prevented
          setPhase('live');
        }}
        onError={() => setPhase('blocked')}
      />
    </div>
  );
};

// ── HLS.js player ─────────────────────────────────────────────────────────────
const HLSPlayer = ({ url, title }) => {
  const videoRef = useRef(null);
  const hlsRef   = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    if (!url || !videoRef.current) return;
    setLoading(true);
    setError(null);

    const Hls = (await import('hls.js')).default;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false, maxBufferLength: 30 });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        videoRef.current?.play().catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
          }
        });
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) { setError('Stream unavailable'); setLoading(false); }
      });
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = url;
      videoRef.current.addEventListener('loadedmetadata', () => setLoading(false));
      videoRef.current.addEventListener('error', () => { setError('Stream unavailable'); setLoading(false); });
    } else {
      setError('HLS not supported in this browser');
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [load]);

  if (error) return <BlockedOverlay url={url} title={title} onRetry={load} />;

  return (
    <div className="relative w-full h-full bg-black">
      {loading && <LoadingOverlay text="Loading HLS stream…" />}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted
        controls
      />
    </div>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────
const HybridPlayer = ({ url, title }) => {
  const type = getStreamType(url);
  if (type === 'youtube') return <YoutubePlayer url={url} title={title} />;
  if (type === 'hls')     return <HLSPlayer     url={url} title={title} />;
  return                         <EmbedPlayer    url={url} title={title} />;
};

export default HybridPlayer;
