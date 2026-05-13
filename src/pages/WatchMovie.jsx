import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Star, Monitor, Tv, ExternalLink, ShieldCheck, ChevronDown, Play, Zap, Globe, AlertCircle } from 'lucide-react';
import { getMovieDetails } from '../services/imdbService';
import { tmdbApi } from '../services/tmdb';
import ContentFilter from '../components/ContentFilter';
import ParentalGate from '../components/ParentalGate';
import { useAuth } from '../context/AuthContext';
import { useParentalControls } from '../context/ParentalControlContext';
import { watchHistoryService } from '../services/supabaseService';

const WatchMovie = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const typeParam = location.state?.type;
    const { user, session } = useAuth();
    const { isChild, incrementWatchTime } = useParentalControls();
    
    // UI State
    const [selectedServer, setSelectedServer] = useState(0);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(1);
    const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
    const [isPlayerLoading, setIsPlayerLoading] = useState(true);
    const [isTheaterMode, setIsTheaterMode] = useState(false);
    const playerContainerRef = useRef(null);

    // Watch time tracking refs
    const watchStartTime = useRef(null);
    const intervalRef = useRef(null);
    const watchedSeconds = useRef(0);

    // 1. Fetch Core Content (Movie/Show)
    const { data: content, isLoading: isContentLoading } = useQuery({
        queryKey: ['movieDetails', id, typeParam],
        queryFn: () => getMovieDetails(id, typeParam),
        enabled: !!id,
    });

    const isTV = typeParam === 'tv' || content?.Type === 'tv';

    // 2. Fetch TV Show Details (for seasons)
    const { data: tvDetails } = useQuery({
        queryKey: ['tvDetails', id],
        queryFn: () => tmdbApi.getTVShowDetails(id),
        enabled: !!id && isTV,
    });

    const seasons = useMemo(() => {
        return tvDetails?.seasons ? tvDetails.seasons.filter(s => s.season_number > 0) : [];
    }, [tvDetails]);

    // 3. Fetch Episodes for current season
    const { data: episodesData, isLoading: isLoadingEpisodes } = useQuery({
        queryKey: ['tvEpisodes', id, selectedSeason],
        queryFn: () => tmdbApi.getTVSeasonDetails(id, selectedSeason),
        enabled: !!id && isTV,
    });

    const episodes = episodesData?.episodes || [];

    // History Mutation
    const updateHistoryMutation = useMutation({
        mutationFn: async ({ progressPercent, watchedSec, uniqueId, title }) => {
            if (!user) return;
            const movieData = {
                imdbID: uniqueId,
                Title: title,
                Year: content.Year,
                Type: content.Type,
                Genre: content.Genre,
                Poster: content.Poster !== 'N/A' ? content.Poster : null,
                season: isTV ? selectedSeason : null,
                episode: isTV ? selectedEpisode : null,
                showId: isTV ? id : null,
            };

            return watchHistoryService.addOrUpdate(
                movieData,
                user.id,
                session.access_token,
                progressPercent,
                watchedSec,
                content.Genre
            );
        }
    });

    const saveWatchHistory = useCallback(async () => {
        if (!user || !session || !content || watchedSeconds.current < 10) return;

        const estimatedDuration = isTV ? 2700 : 7200;
        const progressPercent = Math.min((watchedSeconds.current / estimatedDuration) * 100, 100);
        const uniqueId = isTV ? `${id}-S${selectedSeason}E${selectedEpisode}` : id;
        const title = isTV ? `${content.Title} - S${selectedSeason}E${selectedEpisode}` : content.Title;

        updateHistoryMutation.mutate({
            progressPercent,
            watchedSec: watchedSeconds.current,
            uniqueId,
            title
        });
    }, [user, session, content, id, selectedSeason, selectedEpisode, isTV, updateHistoryMutation]);

    // Tracking Effects
    useEffect(() => {
        if (!isContentLoading && content && user && session) {
            watchStartTime.current = Date.now();
            intervalRef.current = setInterval(() => {
                watchedSeconds.current += 1;
                
                // If user is a child, increment their daily watch time every minute
                if (isChild && watchedSeconds.current % 60 === 0) {
                    incrementWatchTime(1).catch(err => console.error("Failed to increment watch time:", err));
                }
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            saveWatchHistory();
            watchedSeconds.current = 0;
            watchStartTime.current = null;
        };
    }, [isContentLoading, content, user, session, saveWatchHistory]);

    const handleSeasonChange = (seasonNum) => {
        setSelectedSeason(seasonNum);
        setSelectedEpisode(1);
        setShowSeasonDropdown(false);
        setIsPlayerLoading(true);
    };

    const handleServerChange = (index) => {
        setSelectedServer(index);
        setIsPlayerLoading(true);
    };

    const handleEpisodeChange = (epNum) => {
        setSelectedEpisode(epNum);
        setIsPlayerLoading(true);
    };

    const [refreshKey, setRefreshKey] = useState(0);

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
        setIsPlayerLoading(true);
    };

    // Safety timeout for player loading
    useEffect(() => {
        let timer;
        if (isPlayerLoading) {
            timer = setTimeout(() => {
                setIsPlayerLoading(false);
            }, 8000); // 8 seconds safety timeout
        }
        return () => clearTimeout(timer);
    }, [isPlayerLoading]);

    const getServers = (type, tmdbId, imdbId, s = 1, e = 1) => {
        const isTV = type === 'tv' || type === 'Series';
        const finalImdbId = imdbId && imdbId.startsWith('tt') ? imdbId : null;
        
        return [
            { 
                name: 'Vidsrc.me', 
                url: isTV ? `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${s}&episode=${e}` : `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`, 
                icon: Monitor 
            },
            { 
                name: 'VidSrc.cc', 
                url: isTV ? `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${s}/${e}` : `https://vidsrc.cc/v2/embed/movie/${tmdbId}`, 
                icon: Zap 
            },
            { 
                name: 'Embed.su', 
                url: isTV ? `https://embed.su/embed/tv/${tmdbId}/${s}/${e}` : `https://embed.su/embed/movie/${tmdbId}`, 
                icon: Tv 
            },
            { 
                name: 'Vidsrc.xyz', 
                url: isTV ? `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${s}&episode=${e}` : `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`, 
                icon: Play 
            },
            {
                name: '2Embed',
                url: isTV ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${s}&e=${e}` : `https://www.2embed.cc/embed/${tmdbId}`,
                icon: Globe
            }
        ];
    };

    const toggleFullscreen = () => {
        if (!playerContainerRef.current) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            playerContainerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        }
    };

    if (isContentLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <motion.div className="flex flex-col items-center gap-4">
                    <motion.div
                        className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <p className="text-white/50 text-sm font-medium tracking-widest uppercase">Loading Theater Experience...</p>
                </motion.div>
            </div>
        );
    }

    const currentServers = getServers(content?.Type, id, content?.imdbID, selectedSeason, selectedEpisode);
    const hasRating = content?.imdbRating && content.imdbRating !== 'N/A' && content.imdbRating !== '0.0';
    const hasYear = content?.Year && content.Year !== 'N/A';
    const hasPlot = content?.Plot && content.Plot !== 'N/A' && content.Plot !== 'No plot available';

    return (
        <ContentFilter movie={content}>
            <div className="pb-20 pt-24 bg-background text-foreground min-h-screen">
                <div className="page-shell-wide">
                    {/* Header Section */}
                    <motion.div 
                        className="editorial-panel rounded-[2rem] p-6 sm:p-8 mb-8" 
                        initial={{ y: 20, opacity: 0 }} 
                        animate={{ y: 0, opacity: 1 }}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div className="flex items-start gap-5">
                                <button onClick={() => navigate(-1)} className="btn-secondary group">
                                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                                    Back
                                </button>
                                <div>
                                    <h1 className="display-font text-2xl sm:text-3xl font-black text-foreground leading-none">{content?.Title}</h1>
                                    <div className="flex items-center gap-3 mt-2">
                                        {isTV ? (
                                            <span className="text-violet-400 text-[10px] font-black uppercase tracking-[0.2em] bg-violet-400/10 px-2.5 py-1 rounded-md border border-violet-400/20">
                                                Season {selectedSeason} • Episode {selectedEpisode}
                                            </span>
                                        ) : (
                                            <span className="text-violet-400 text-[10px] font-black uppercase tracking-[0.2em] bg-violet-400/10 px-2.5 py-1 rounded-md border border-violet-400/20">
                                                Feature Film
                                            </span>
                                        )}
                                        {hasYear && <span className="text-sm text-muted-foreground font-medium">• {content.Year}</span>}
                                        {hasRating && (
                                            <div className="flex items-center gap-1.5 ml-1">
                                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                                                <span className="text-sm font-bold">{content.imdbRating}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Link to={`/movie/${id}`} className="btn-quiet self-start sm:self-center">
                                <ExternalLink className="w-4 h-4" />
                                Movie Details
                            </Link>
                        </div>
                    </motion.div>

                    <div className="grid gap-8 lg:grid-cols-4">
                        {/* Main Player Area */}
                        <div className="lg:col-span-3 space-y-8">
                            {/* Server Selection Bar */}
                            <motion.div 
                                className="editorial-panel rounded-[1.5rem] p-4 bg-muted/30 border border-border/50" 
                                initial={{ y: 20, opacity: 0 }} 
                                animate={{ y: 0, opacity: 1 }} 
                                transition={{ delay: 0.1 }}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-2">Servers:</div>
                                        {currentServers.map((server, index) => (
                                            <button
                                                key={server.name}
                                                onClick={() => handleServerChange(index)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                                    selectedServer === index 
                                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 ring-2 ring-violet-500/20' 
                                                    : 'bg-background/50 text-muted-foreground border border-border/50 hover:bg-accent'
                                                }`}
                                            >
                                                <server.icon className="w-3 h-3" />
                                                {server.name}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setIsTheaterMode(!isTheaterMode)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isTheaterMode ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-background/50 text-muted-foreground border border-border/50 hover:bg-accent'}`}
                                        >
                                            {isTheaterMode ? 'Exit Theater' : 'Theater Mode'}
                                        </button>
                                        <button 
                                            onClick={toggleFullscreen}
                                            className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                                        >
                                            <Monitor className="w-3.5 h-3.5" />
                                            Fullscreen
                                        </button>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Video Player Container */}
                            <motion.div 
                                ref={playerContainerRef}
                                className={`editorial-panel rounded-[2.5rem] p-2 bg-black shadow-2xl relative overflow-hidden group transition-all duration-500 ${isTheaterMode ? 'lg:-mx-24' : ''}`} 
                                initial={{ y: 20, opacity: 0 }} 
                                animate={{ y: 0, opacity: 1 }} 
                                transition={{ delay: 0.2 }}
                            >
                                <div className="relative aspect-video w-full rounded-[2rem] overflow-hidden bg-black shadow-inner">
                                    <AnimatePresence>
                                        {isPlayerLoading && (
                                            <motion.div 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl"
                                            >
                                                <div className="relative">
                                                    <motion.div
                                                        className="w-24 h-24 border-4 border-violet-500/10 border-t-violet-500 rounded-full"
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Play className="w-10 h-10 text-violet-500 animate-pulse" />
                                                    </div>
                                                </div>
                                                <div className="mt-10 text-center space-y-3">
                                                    <h3 className="text-white text-xl font-black tracking-tighter uppercase italic leading-none">Initializing Stream</h3>
                                                    <div className="flex items-center gap-3 justify-center">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                                        <p className="text-white/50 text-[11px] font-bold uppercase tracking-[0.3em]">Connecting to Secure Server</p>
                                                    </div>
                                                </div>
                                                <div className="absolute bottom-12 px-8 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.25em]">Bypassing External Ads...</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    
                                    <iframe 
                                        key={`${selectedServer}-${selectedSeason}-${selectedEpisode}-${refreshKey}`} 
                                        src={currentServers[selectedServer].url} 
                                        className="absolute inset-0 w-full h-full z-10" 
                                        frameBorder="0" 
                                        allowFullScreen 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" 
                                        title="Player"
                                        referrerPolicy="no-referrer"
                                        onLoad={() => {
                                            setTimeout(() => setIsPlayerLoading(false), 1000);
                                        }}
                                    />
                                    
                                    {/* Ambient overlay */}
                                    <div className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-tr from-white/5 to-transparent opacity-20" aria-hidden="true" />
                                </div>
                            </motion.div>

                            {/* Info Section */}
                            <motion.div 
                                className="editorial-panel rounded-[2rem] p-8" 
                                initial={{ y: 20, opacity: 0 }} 
                                animate={{ y: 0, opacity: 1 }} 
                                transition={{ delay: 0.3 }}
                            >
                                <div className="flex flex-col md:flex-row gap-8">
                                    {content?.Poster && content.Poster !== 'N/A' && (
                                        <div className="shrink-0">
                                            <img 
                                                src={content.Poster} 
                                                alt={content.Title} 
                                                className="w-32 aspect-[2/3] object-cover rounded-2xl shadow-xl border border-border/50 hidden md:block" 
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-6">
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-violet-400 mb-3">Plot Summary</h3>
                                            <p className="text-sm leading-relaxed text-muted-foreground font-medium italic">
                                                "{hasPlot ? content.Plot : 'No description available for this title.'}"
                                            </p>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Content Rating</div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center">
                                                        <Star className="w-5 h-5 text-yellow-400 fill-current" />
                                                    </div>
                                                    <span className="text-xl font-black">{content?.imdbRating || 'N/A'}<span className="text-xs text-muted-foreground ml-1">/10</span></span>
                                                </div>
                                            </div>
                                            {content?.Genre && (
                                                <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Genre Classification</div>
                                                    <div className="text-sm font-bold text-foreground">
                                                        {content.Genre.split(', ').slice(0, 3).join(' • ')}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-1 space-y-8">
                            {isTV && (
                                <motion.div 
                                    className="editorial-panel rounded-[2rem] p-6 flex flex-col lg:h-[700px] h-[500px] overflow-hidden bg-background/50 backdrop-blur-sm" 
                                    initial={{ x: 20, opacity: 0 }} 
                                    animate={{ x: 0, opacity: 1 }} 
                                    transition={{ delay: 0.4 }}
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-sm font-black flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                                <Tv className="w-4 h-4 text-violet-400" />
                                            </div>
                                            Episodes
                                        </h3>
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
                                                className="btn-secondary text-[11px] font-black uppercase tracking-widest px-4 py-2 bg-muted/50"
                                            >
                                                S{selectedSeason}
                                                <ChevronDown className={`w-3.5 h-3.5 ml-2 transition-transform duration-300 ${showSeasonDropdown ? 'rotate-180' : ''}`} />
                                            </button>
                                            <AnimatePresence>
                                                {showSeasonDropdown && (
                                                    <motion.div
                                                        className="absolute right-0 top-full mt-3 w-44 bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 py-3 z-50 overflow-hidden"
                                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                    >
                                                        <div className="max-h-64 overflow-y-auto scrollbar-hide px-2 space-y-1">
                                                            {seasons.map((s) => (
                                                                <button
                                                                    key={s.id}
                                                                    onClick={() => handleSeasonChange(s.season_number)}
                                                                    className={`w-full px-4 py-2.5 text-left text-[11px] font-bold rounded-xl transition-all ${selectedSeason === s.season_number ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                                                                >
                                                                    Season {s.season_number}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 scrollbar-hide">
                                        {isLoadingEpisodes ? (
                                            <div className="space-y-4">
                                                {[1, 2, 3, 4, 5, 6].map(i => (
                                                    <div key={i} className="h-16 rounded-2xl bg-muted/30 animate-pulse" />
                                                ))}
                                            </div>
                                        ) : (
                                            episodes.map((ep) => (
                                                <button
                                                    key={ep.id}
                                                    onClick={() => handleEpisodeChange(ep.episode_number)}
                                                    className={`w-full group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${selectedEpisode === ep.episode_number ? 'bg-violet-600/10 border-violet-500/30 text-violet-400' : 'bg-muted/30 hover:bg-accent border-transparent'}`}
                                                >
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-all duration-300 ${selectedEpisode === ep.episode_number ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/40' : 'bg-muted text-muted-foreground group-hover:bg-violet-500/20'}`}>
                                                        {ep.episode_number}
                                                    </div>
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <p className="text-[13px] font-black truncate leading-tight">
                                                            {ep.name && !ep.name.toLowerCase().includes(`episode ${ep.episode_number}`) ? ep.name : `Episode ${ep.episode_number}`}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-60">
                                                            S{selectedSeason} E{ep.episode_number}
                                                        </p>
                                                    </div>
                                                    {selectedEpisode === ep.episode_number && (
                                                        <motion.div layoutId="playing-indicator" className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {!isTV && (
                                <motion.div 
                                    className="editorial-panel rounded-[2rem] p-8 text-center bg-violet-500/5 border border-violet-500/10" 
                                    initial={{ x: 20, opacity: 0 }} 
                                    animate={{ x: 0, opacity: 1 }} 
                                    transition={{ delay: 0.4 }}
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-5 shadow-inner">
                                        <Monitor className="w-8 h-8 text-violet-400" />
                                    </div>
                                    <h4 className="font-black text-sm uppercase tracking-widest mb-3">Cinema Mode</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium italic">
                                        Content optimized for widescreen streaming. Enjoy the show!
                                    </p>
                                </motion.div>
                            )}

                            <motion.div 
                                className="editorial-panel rounded-[2rem] p-6 bg-amber-500/5 border border-amber-500/10" 
                                initial={{ x: 20, opacity: 0 }} 
                                animate={{ x: 0, opacity: 1 }} 
                                transition={{ delay: 0.5 }}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                        <ShieldCheck className="w-4 h-4 text-amber-500" />
                                    </div>
                                    <h4 className="text-sm font-black uppercase tracking-tighter text-amber-600 dark:text-amber-400">Stream Safety</h4>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                    Running in native mode for maximum compatibility. For zero distractions, use{' '}
                                    <a
                                        href="https://ublockorigin.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-amber-600 dark:text-amber-400 hover:underline font-bold"
                                    >
                                        uBlock Origin
                                    </a>{' '}
                                    on your browser.
                                </p>
                            </motion.div>
                        </div>
                    </div>

                    {/* Troubleshooting Panel */}
                    <div className="mt-8 rounded-2xl bg-muted/30 p-6 border border-white/5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">Troubleshooting</h3>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <p className="text-sm text-white/70 font-medium">Player not loading?</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Try switching to a different server above. Each server uses a different streaming source.
                                </p>
                                <button 
                                    onClick={handleRefresh}
                                    className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-all border border-white/10"
                                >
                                    <Zap className="w-3.5 h-3.5" />
                                    Force Refresh Player
                                </button>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-white/70 font-medium">Ad Blockers & Popups</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Some servers may show ads. We block most of them, but using an ad-blocker like uBlock Origin is recommended for the best experience.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ContentFilter>
    );
};

export default WatchMovie;
