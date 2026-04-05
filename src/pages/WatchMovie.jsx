import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Calendar, Clock, Monitor, Tv, ExternalLink, ShieldCheck, ChevronDown, ChevronRight, Play, Server, Zap } from 'lucide-react';
import { getMovieDetails } from '../services/imdbService';
import { tmdbApi } from '../services/tmdb';
import { arabseedApi } from '../services/arabseed';

const WatchMovie = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const typeParam = location.state?.type;
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedServer, setSelectedServer] = useState(0);

    // TV Show State
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(1);
    const [episodes, setEpisodes] = useState([]);
    const [loadingEpisodes, setLoadingEpisodes] = useState(false);
    const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);

    // ArabSeed State
    const [arabseedServers, setArabseedServers] = useState([]);
    const [loadingArabseed, setLoadingArabseed] = useState(false);

    const getServers = (type, id, s = 1, e = 1) => {
        const isTV = type === 'tv';
        const defaultServers = [
            {
                name: 'Server 1 (Primary)',
                url: isTV ? `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` : `https://vidsrc.cc/v2/embed/movie/${id}`,
                icon: ShieldCheck
            },
            {
                name: 'Server 2 (Rapid)',
                url: isTV ? `https://vidsrc.to/embed/tv/${id}/${s}/${e}` : `https://vidsrc.to/embed/movie/${id}`,
                icon: Zap
            },
            {
                name: 'Server 3 (HD)',
                url: isTV ? `https://vidsrc.pro/embed/tv/${id}/${s}/${e}` : `https://vidsrc.pro/embed/movie/${id}`,
                icon: Monitor
            },
            {
                name: 'Server 4 (XYZ)',
                url: isTV ? `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}` : `https://vidsrc.xyz/embed/movie/${id}`,
                icon: Tv
            },
            {
                name: 'Server 5 (Stream)',
                url: isTV ? `https://autoembed.to/tv/tmdb/${id}-${s}-${e}` : `https://autoembed.to/movie/tmdb/${id}`,
                icon: Play
            },
            {
                name: 'Server 6 (Multi)',
                url: isTV ? `https://embed.su/embed/tv/${id}/${s}/${e}` : `https://embed.su/embed/movie/${id}`,
                icon: ShieldCheck
            },
            {
                name: 'Server 7 (Me)',
                url: isTV ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}` : `https://vidsrc.me/embed/movie?tmdb=${id}`,
                icon: Monitor
            },
            {
                name: 'Server 8 (Super)',
                url: isTV ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}` : `https://multiembed.mov/?video_id=${id}&tmdb=1`,
                icon: Zap
            }
        ];

        // Map arabseed servers to layout format
        const asdServersMapped = arabseedServers.map((s, idx) => ({
            name: s.name || `ArabSeed Pro ${idx + 1}`,
            url: s.url,
            icon: Server
        }));

        return [...asdServersMapped, ...defaultServers];
    };

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            try {
                const data = await getMovieDetails(id, typeParam);
                setContent(data);

                // Start fetching ArabSeed servers in parallel
                fetchArabseedServers(data);

                if (data.Type === 'tv') {
                    // Fetch full TV details to get number of seasons
                    const tvDetails = await tmdbApi.getTVShowDetails(id);
                    const validSeasons = tvDetails.seasons ? tvDetails.seasons.filter(s => s.season_number > 0) : [];
                    setSeasons(validSeasons);
                    // Default to first valid season (usually 1)
                    const firstSeason = validSeasons.length > 0 ? validSeasons[0].season_number : 1;
                    setSelectedSeason(firstSeason);
                    fetchEpisodes(id, firstSeason);
                }
            } catch (err) {
                console.error('Error loading content:', err);
                setError('Could not load content information.');
            } finally {
                setLoading(false);
            }
        };

        const fetchArabseedServers = async (metadata) => {
            setLoadingArabseed(true);
            try {
                const searchParams = new URLSearchParams(location.search);
                const arabseedDirectUrl = searchParams.get('arabseedUrl');

                let servers = [];
                const fetchPromise = async () => {
                    if (arabseedDirectUrl) {
                        return await arabseedApi.getServersFromUrl(arabseedDirectUrl);
                    } else if (metadata?.Title) {
                        return await arabseedApi.getServersForTitle(metadata.Title);
                    }
                    return [];
                };

                // Add a 5 second timeout so the UI doesn't hang forever if proxy is blocked
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('ArabSeed scrape timeout')), 5000);
                });

                servers = await Promise.race([fetchPromise(), timeoutPromise]);

                if (servers && servers.length > 0) {
                    setArabseedServers(servers);
                }
            } catch (error) {
                console.log('Failed to get ArabSeed direct servers (Proxy blocked or timeout)');
            } finally {
                setLoadingArabseed(false);
            }
        };

        fetchContent();
    }, [id, location.search]);

    const fetchEpisodes = async (tvId, seasonNum) => {
        setLoadingEpisodes(true);
        try {
            const data = await tmdbApi.getTVSeasonDetails(tvId, seasonNum);
            setEpisodes(data.episodes || []);
            setSelectedEpisode(1);
        } catch (err) {
            console.error('Error fetching episodes:', err);
        } finally {
            setLoadingEpisodes(false);
        }
    };

    const handleSeasonChange = (seasonNum) => {
        setSelectedSeason(seasonNum);
        fetchEpisodes(id, seasonNum);
        setShowSeasonDropdown(false);
    };

    if (loading) {
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

    const isTV = content?.Type === 'tv';
    const currentServers = getServers(content?.Type, id, selectedSeason, selectedEpisode);

    // Data presence flags
    const hasRating = content?.imdbRating && content.imdbRating !== 'N/A' && content.imdbRating !== '0.0';
    const hasYear = content?.Year && content.Year !== 'N/A';
    const hasPlot = content?.Plot && content.Plot !== 'N/A' && content.Plot !== 'No plot available';

    return (
        <div className="min-h-screen bg-black text-white/90 selection:bg-violet-500/30">
            {/* Top Bar */}
            <motion.div
                className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/5"
                initial={{ y: -60 }}
                animate={{ y: 0 }}
            >
                <div className="container mx-auto px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                        <div className="hidden sm:flex items-center gap-2">
                            <h1 className="font-bold text-sm truncate max-w-[200px] md:max-w-md">{content?.Title}</h1>
                            {isTV && (
                                <span className="text-violet-400 text-[10px] font-bold uppercase tracking-wider bg-violet-400/10 px-1.5 py-0.5 rounded">
                                    S{selectedSeason} E{selectedEpisode}
                                </span>
                            )}
                        </div>
                    </div>
                    <Link
                        to={`/movie/${id}`}
                        className="flex items-center gap-1.5 text-white/30 hover:text-white/80 transition-colors text-xs"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Details
                    </Link>
                </div>
            </motion.div>

            <div className="container mx-auto px-4 py-4 max-w-7xl">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* Main Player Section */}
                    <div className="lg:col-span-3 flex flex-col gap-4">
                        {/* Server Bars & Info */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] p-2 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                                {currentServers.map((server, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedServer(index)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${selectedServer === index
                                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                                            : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        <server.icon className="w-3.5 h-3.5" />
                                        {server.name}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 text-violet-400/80 text-[10px] font-bold uppercase overflow-hidden">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Ad-Clean Mode</span>
                            </div>
                        </div>

                        {/* Iframe Player */}
                        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl group">
                            <iframe
                                key={`${selectedServer}-${selectedSeason}-${selectedEpisode}`}
                                src={currentServers[selectedServer].url}
                                className="absolute inset-0 w-full h-full"
                                frameBorder="0"
                                allowFullScreen
                                allow="autoplay; encrypted-media"
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                title="Player"
                            />
                        </div>

                        {/* Bottom Info Panel */}
                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                            <div className="flex flex-col md:flex-row gap-6">
                                {content?.Poster && (
                                    <img src={content.Poster} alt="Poster" className="w-24 h-36 object-cover rounded-xl border border-white/10 hidden md:block" />
                                )}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-xl font-black">{content?.Title}</h2>
                                        {hasRating && (
                                            <div className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded text-[11px] font-bold">
                                                <Star className="w-3 h-3 fill-amber-400" />
                                                {content.imdbRating}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                        {hasYear && <span>{content.Year}</span>}
                                        {content?.Genre && content.Genre !== 'N/A' && (
                                            <>
                                                <span>•</span>
                                                <span>{content.Genre}</span>
                                            </>
                                        )}
                                        {content?.Type && (
                                            <>
                                                <span>•</span>
                                                <span className="text-violet-400">{content.Type}</span>
                                            </>
                                        )}
                                    </div>
                                    {hasPlot && <p className="text-white/40 text-xs leading-relaxed line-clamp-2 max-w-3xl">{content.Plot}</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Episode/Season Selection */}
                    <div className="lg:col-span-1 flex flex-col gap-4 max-h-[700px]">
                        {isTV ? (
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col h-full overflow-hidden">
                                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                                    <h3 className="text-sm font-black flex items-center gap-2">
                                        <Tv className="w-4 h-4 text-violet-400" />
                                        Episodic Content
                                    </h3>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-violet-600/20 text-violet-400 rounded-lg text-xs font-bold border border-violet-500/20 hover:bg-violet-600/30 transition-all"
                                        >
                                            Season {selectedSeason}
                                            <ChevronDown className={`w-3 h-3 transition-transform ${showSeasonDropdown ? 'rotate-180' : ''}`} />
                                        </button>
                                        <AnimatePresence>
                                            {showSeasonDropdown && (
                                                <motion.div
                                                    className="absolute right-0 top-full mt-2 w-36 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl z-50 py-2"
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                >
                                                    <div className="max-h-60 overflow-y-auto scrollbar-hide py-1">
                                                        {seasons.map((s) => (
                                                            <button
                                                                key={s.id}
                                                                onClick={() => handleSeasonChange(s.season_number)}
                                                                className={`w-full px-4 py-2 text-left text-xs font-bold hover:bg-white/5 transition-colors ${selectedSeason === s.season_number ? 'text-violet-400 bg-violet-400/5' : 'text-white/50'}`}
                                                            >
                                                                {s.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                    {loadingEpisodes ? (
                                        <div className="flex flex-col gap-2">
                                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 w-full bg-white/5 rounded-lg animate-pulse" />)}
                                        </div>
                                    ) : (
                                        episodes.map((ep) => (
                                            <button
                                                key={ep.id}
                                                onClick={() => setSelectedEpisode(ep.episode_number)}
                                                className={`w-full group flex items-center gap-3 p-3 rounded-xl transition-all border ${selectedEpisode === ep.episode_number
                                                    ? 'bg-violet-600/20 border-violet-500/50 text-white'
                                                    : 'bg-white/[0.01] border-white/5 text-white/40 hover:bg-white/5 hover:border-white/10'
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${selectedEpisode === ep.episode_number ? 'bg-violet-500 text-white' : 'bg-white/5 text-white/30 group-hover:bg-white/10'
                                                    }`}>
                                                    {ep.episode_number}
                                                </div>
                                                <div className="flex-1 text-left min-w-0">
                                                    <p className="text-[11px] font-bold truncate">
                                                        {ep.name && !ep.name.toLowerCase().includes(`episode ${ep.episode_number}`)
                                                            ? ep.name
                                                            : `Episode ${ep.episode_number}`}
                                                    </p>
                                                    <p className="text-[9px] opacity-40 uppercase tracking-tighter">Season {selectedSeason} • Ep {ep.episode_number}</p>
                                                </div>
                                                {selectedEpisode === ep.episode_number && (
                                                    <motion.div layoutId="playing-icon">
                                                        <Play className="w-3 h-3 fill-white" />
                                                    </motion.div>
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center flex flex-col items-center justify-center h-full gap-4">
                                <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center">
                                    <Monitor className="w-8 h-8 text-violet-400" />
                                </div>
                                <div>
                                    <h4 className="font-black text-sm mb-1 uppercase tracking-widest">Single Content</h4>
                                    <p className="text-[10px] text-white/30 leading-relaxed uppercase tracking-tighter">Feature film playback active. No episodic data required.</p>
                                </div>
                            </div>
                        )}

                        {/* Adblock Reminder */}
                        <div className="p-4 rounded-2xl bg-amber-400/5 border border-amber-400/10">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheck className="w-4 h-4 text-amber-400" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400">Security Tip</h4>
                            </div>
                            <p className="text-[9px] text-white/40 leading-relaxed">
                                Browsing without ads? We recommend the <a href="https://ublockorigin.com/" className="text-amber-400/80 underline decoration-amber-400/30">uBlock Origin</a> extension.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WatchMovie;
