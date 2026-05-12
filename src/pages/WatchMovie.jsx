import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Star, Monitor, Tv, ExternalLink, ShieldCheck, ChevronDown, Play, Zap } from 'lucide-react';
import { getMovieDetails } from '../services/imdbService';
import { tmdbApi } from '../services/tmdb';
import ContentFilter from '../components/ContentFilter';
import ParentalGate from '../components/ParentalGate';
import { useAuth } from '../context/AuthContext';
import { watchHistoryService } from '../services/supabaseService';

const WatchMovie = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const typeParam = location.state?.type;
    const { user, session } = useAuth();
    
    // UI State
    const [selectedServer, setSelectedServer] = useState(0);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(1);
    const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);

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

    const isTV = content?.Type === 'tv';

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
    };

    const getServers = (type, id, s = 1, e = 1) => {
        const isTV = type === 'tv';
        return [
            { name: 'VidLink (Multi)', url: isTV ? `https://vidlink.pro/tv/${id}/${s}/${e}` : `https://vidlink.pro/movie/${id}`, icon: ShieldCheck },
            { name: 'AutoEmbed (Fast)', url: isTV ? `https://autoembed.co/tv/tmdb/${id}-${s}-${e}` : `https://autoembed.co/movie/tmdb/${id}`, icon: Zap },
            { name: 'Embed.su (HD)', url: isTV ? `https://embed.su/embed/tv/${id}/${s}/${e}` : `https://embed.su/embed/movie/${id}`, icon: Monitor },
            { name: 'Vidsrc.net', url: isTV ? `https://vidsrc.net/embed/tv?tmdb=${id}&season=${s}&episode=${e}` : `https://vidsrc.net/embed/movie?tmdb=${id}`, icon: Tv },
            { name: 'Vidsrc.cc', url: isTV ? `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` : `https://vidsrc.cc/v2/embed/movie/${id}`, icon: Play },
        ];
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
                    <p className="text-white/50 text-sm font-medium">Loading player...</p>
                </motion.div>
            </div>
        );
    }

    const currentServers = getServers(content?.Type, id, selectedSeason, selectedEpisode);
    const hasRating = content?.imdbRating && content.imdbRating !== 'N/A' && content.imdbRating !== '0.0';
    const hasYear = content?.Year && content.Year !== 'N/A';
    const hasPlot = content?.Plot && content.Plot !== 'N/A' && content.Plot !== 'No plot available';

    return (
        <ContentFilter movie={content} fallback={<ParentalGate />}>
            <div className="min-h-screen bg-black text-white/90 selection:bg-violet-500/30">
                {/* Top Bar */}
                <motion.div className="sticky top-0 z-50 bg-card backdrop-blur-xl" initial={{ y: -60 }} animate={{ y: 0 }}>
                    <div className="container mx-auto px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-accent transition-all text-xs font-medium">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            <div className="hidden sm:flex items-center gap-2">
                                <h1 className="font-bold text-sm truncate max-w-[200px] md:max-w-md">{content?.Title}</h1>
                                {isTV && <span className="text-violet-400 text-[10px] font-bold uppercase tracking-wider bg-violet-400/10 px-1.5 py-0.5 rounded">S{selectedSeason} E{selectedEpisode}</span>}
                            </div>
                        </div>
                        <Link to={`/movie/${id}`} className="flex items-center gap-1.5 text-white/30 hover:text-white/80 transition-colors text-xs">
                            <ExternalLink className="w-3.5 h-3.5" /> Details
                        </Link>
                    </div>
                </motion.div>

                <div className="container mx-auto px-4 py-4 max-w-7xl">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-3 flex flex-col gap-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] p-2 rounded-xl">
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                                    {currentServers.map((server, index) => (
                                        <button key={index} onClick={() => setSelectedServer(index)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${selectedServer === index ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'bg-muted text-white/40 hover:bg-accent'}`}>
                                            <server.icon className="w-3.5 h-3.5" /> {server.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 text-violet-400/80 text-[10px] font-bold uppercase overflow-hidden">
                                    <ShieldCheck className="w-3.5 h-3.5" /> <span>Ad-Clean Mode</span>
                                </div>
                            </div>

                            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl group">
                                <iframe key={`${selectedServer}-${selectedSeason}-${selectedEpisode}`} src={currentServers[selectedServer].url} className="absolute inset-0 w-full h-full" frameBorder="0" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" title="Player" />
                            </div>

                            <div className="p-6 rounded-2xl bg-white/[0.02]">
                                <div className="flex flex-col md:flex-row gap-6">
                                    {content?.Poster && <img src={content.Poster} alt="Poster" className="w-24 h-36 object-cover rounded-xl hidden md:block" />}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-xl font-black">{content?.Title}</h2>
                                            {hasRating && <div className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded text-[11px] font-bold"><Star className="w-3 h-3 fill-amber-400" /> {content.imdbRating}</div>}
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                            {hasYear && <span>{content.Year}</span>}
                                            {content?.Genre && content.Genre !== 'N/A' && <><span>•</span><span>{content.Genre}</span></>}
                                            {content?.Type && <><span>•</span><span className="text-violet-400">{content.Type}</span></>}
                                        </div>
                                        {hasPlot && <p className="text-white/40 text-xs leading-relaxed line-clamp-2 max-w-3xl">{content.Plot}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1 flex flex-col gap-4 max-h-[700px]">
                            {isTV ? (
                                <div className="bg-white/[0.02] rounded-2xl flex flex-col h-full overflow-hidden">
                                    <div className="p-4 flex items-center justify-between bg-white/[0.01]">
                                        <h3 className="text-sm font-black flex items-center gap-2"><Tv className="w-4 h-4 text-violet-400" /> Episodic Content</h3>
                                        <div className="relative">
                                            <button onClick={() => setShowSeasonDropdown(!showSeasonDropdown)} className="flex items-center gap-1.5 px-3 py-1 bg-violet-600/20 text-violet-400 rounded-lg text-xs font-bold hover:bg-violet-600/30 transition-all">Season {selectedSeason} <ChevronDown className={`w-3 h-3 transition-transform ${showSeasonDropdown ? 'rotate-180' : ''}`} /></button>
                                            <AnimatePresence>
                                                {showSeasonDropdown && (
                                                    <motion.div className="absolute right-0 top-full mt-2 w-36 bg-neutral-900 rounded-xl shadow-2xl z-50 py-2 border border-white/5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                                                        <div className="max-h-60 overflow-y-auto scrollbar-hide py-1">
                                                            {seasons.map((s) => (
                                                                <button key={s.id} onClick={() => handleSeasonChange(s.season_number)} className={`w-full px-4 py-2 text-left text-xs font-bold hover:bg-muted transition-colors ${selectedSeason === s.season_number ? 'text-violet-400 bg-violet-400/5' : 'text-white/50'}`}>{s.name}</button>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                        {isLoadingEpisodes ? (
                                            <div className="flex flex-col gap-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 w-full bg-muted rounded-lg animate-pulse" />)}</div>
                                        ) : (
                                            episodes.map((ep) => (
                                                <button key={ep.id} onClick={() => setSelectedEpisode(ep.episode_number)} className={`w-full group flex items-center gap-3 p-3 rounded-xl transition-all ${selectedEpisode === ep.episode_number ? 'bg-violet-600/20 text-white border border-violet-500/20' : 'bg-white/[0.01] text-white/40 hover:bg-muted'}`}>
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${selectedEpisode === ep.episode_number ? 'bg-violet-500 text-white' : 'bg-muted text-white/30 group-hover:bg-accent'}`}>{ep.episode_number}</div>
                                                    <div className="flex-1 text-left min-w-0">
                                                        <p className="text-[11px] font-bold truncate">{ep.name && !ep.name.toLowerCase().includes(`episode ${ep.episode_number}`) ? ep.name : `Episode ${ep.episode_number}`}</p>
                                                        <p className="text-[9px] opacity-40 uppercase tracking-tighter">Season {selectedSeason} • Ep {ep.episode_number}</p>
                                                    </div>
                                                    {selectedEpisode === ep.episode_number && <motion.div layoutId="playing-icon"><Play className="w-3 h-3 fill-white" /></motion.div>}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white/[0.02] rounded-2xl p-6 text-center flex flex-col items-center justify-center h-full gap-4">
                                    <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center"><Monitor className="w-8 h-8 text-violet-400" /></div>
                                    <div><h4 className="font-black text-sm mb-1 uppercase tracking-widest">Single Content</h4><p className="text-[10px] text-white/30 leading-relaxed uppercase tracking-tighter">Feature film playback active. No episodic data required.</p></div>
                                </div>
                            )}

                            <div className="p-4 rounded-2xl bg-amber-400/5 border border-amber-400/10">
                                <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-amber-400" /><h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400">Security Tip</h4></div>
                                <p className="text-[9px] text-white/40 leading-relaxed">Browsing without ads? We recommend the <a href="https://ublockorigin.com/" className="text-amber-400/80 underline decoration-amber-400/30">uBlock Origin</a> extension.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ContentFilter>
    );
};

export default WatchMovie;
