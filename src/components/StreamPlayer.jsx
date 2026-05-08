import { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize2, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

const StreamPlayer = ({ channel, onError }) => {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [hasVideo, setHasVideo] = useState(false);
    const controlsTimeoutRef = useRef(null);

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        setHasVideo(false);

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        if (!channel) return;

        if (channel.type === 'youtube' || channel.type === 'embed') {
            setTimeout(() => setIsLoading(false), 500);
            return;
        }

        if (channel.type === 'hls' && videoRef.current) {
            initHlsPlayer();
            return;
        }

        if (channel.type === 'ts' && videoRef.current) {
            initTsPlayer();
            return;
        }

        setIsLoading(false);
    }, [channel]);

    const initHlsPlayer = () => {
        if (!Hls.isSupported()) {
            if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
                videoRef.current.src = channel.url;
                videoRef.current.load();
                videoRef.current.play().catch(() => {});
            } else {
                setError('HLS not supported in this browser');
            }
            setIsLoading(false);
            return;
        }

        const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 30,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
        });

        hls.loadSource(channel.url);
        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            setIsLoading(false);
            setHasVideo(true);
            videoRef.current?.play().then(() => {
                setIsPlaying(true);
            }).catch(() => {
                setIsPlaying(false);
            });
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, () => {
            setIsLoading(false);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        setError('Network error - check your connection');
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        setError('Media error - attempting recovery');
                        hls.recoverMediaError();
                        break;
                    default:
                        setError('Stream unavailable');
                        hls.destroy();
                        break;
                }
            }
            setIsLoading(false);
        });

        hlsRef.current = hls;
    };

    const initTsPlayer = () => {
        if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: false,
            });

            const tsUrl = channel.url.replace('.ts', '.m3u8');
            hls.loadSource(tsUrl);
            hls.attachMedia(videoRef.current);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setIsLoading(false);
                setHasVideo(true);
                videoRef.current?.play().catch(() => {});
            });

            hls.on(Hls.Events.ERROR, () => {
                setError('Direct TS streams may not work in browser');
                setIsLoading(false);
            });

            hlsRef.current = hls;
        } else {
            setError('TS streams require HLS support');
            setIsLoading(false);
        }
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 3000);
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const toggleFullscreen = () => {
        const container = document.getElementById('stream-container');
        if (!container) return;

        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            container.requestFullscreen();
        }
    };

    const handleRetry = () => {
        setIsLoading(true);
        setError(null);
        setTimeout(() => {
            initHlsPlayer();
        }, 500);
    };

    if (!channel) {
        return (
            <div className="aspect-video bg-black rounded-2xl flex items-center justify-center">
                <p className="text-muted-foreground">Select a channel to watch</p>
            </div>
        );
    }

    return (
        <div
            id="stream-container"
            className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-border"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
        >
            {isLoading && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-white text-sm font-medium mt-3">Loading stream...</p>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
                    <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                    <p className="text-red-500 text-sm font-medium mb-4">{error}</p>
                    <button
                        onClick={handleRetry}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            )}

            {(channel.type === 'youtube' || channel.type === 'embed') ? (
                <iframe
                    key={channel.id}
                    src={channel.url}
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    allowFullscreen
                    referrerPolicy="no-referrer"
                    title={channel.name}
                />
            ) : (
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full"
                    controls={false}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onWaiting={() => setIsLoading(true)}
                    onCanPlay={() => {
                        setIsLoading(false);
                        setHasVideo(true);
                    }}
                    onError={() => {
                        setError('Video playback error');
                        setIsLoading(false);
                    }}
                />
            )}

            <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-lg bg-red-600/90 backdrop-blur-md flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">LIVE</span>
            </div>

            {hasVideo && (
                <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="relative p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={togglePlay}
                                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                            >
                                {isPlaying ? (
                                    <Pause className="w-5 h-5 text-white" />
                                ) : (
                                    <Play className="w-5 h-5 text-white" />
                                )}
                            </button>
                            <button
                                onClick={toggleMute}
                                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                            >
                                {isMuted ? (
                                    <VolumeX className="w-5 h-5 text-white" />
                                ) : (
                                    <Volume2 className="w-5 h-5 text-white" />
                                )}
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRetry}
                                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                            >
                                <RefreshCw className="w-5 h-5 text-white" />
                            </button>
                            <button
                                onClick={toggleFullscreen}
                                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                            >
                                <Maximize2 className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StreamPlayer;
