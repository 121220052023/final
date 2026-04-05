import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { tmdbApi } from '../services/tmdb';
import { arabseedApi } from '../services/arabseed';
import { Star, Heart, PlusCircle, MinusCircle, Monitor, Tv, Search, Flame, Clapperboard, MonitorPlay, Globe, Film, Flag, Moon, CirclePlay, Swords, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import { useLikedMovies } from '../context/LikedMoviesContext';

const ArabicMovies = () => {
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('trending');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const navigate = useNavigate();
    const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
    const { likedMovies, addToLikedMovies, removeFromLikedMovies } = useLikedMovies();

    const categories = [
        { id: 'trending', label: 'Trending', sublabel: 'رائج', icon: <Flame className="w-4 h-4" /> },
        { id: 'popular_movies', label: 'Arabic Movies', sublabel: 'أفلام عربي', icon: <Clapperboard className="w-4 h-4" /> },
        { id: 'arabic_series', label: 'Arabic Series', sublabel: 'مسلسلات عربي', icon: <MonitorPlay className="w-4 h-4" /> },
        { id: 'foreign_movies', label: 'Foreign Movies', sublabel: 'أفلام أجنبي', icon: <Globe className="w-4 h-4" /> },
        { id: 'foreign_series', label: 'Foreign Series', sublabel: 'مسلسلات أجنبي', icon: <Film className="w-4 h-4" /> },
        { id: 'turkish', label: 'Turkish Series', sublabel: 'مسلسلات تركية', icon: <Flag className="w-4 h-4" /> },
        { id: 'ramadan', label: 'Ramadan 2026', sublabel: 'رمضان 2026', icon: <Moon className="w-4 h-4" /> },
        { id: 'netflix', label: 'Netflix', sublabel: 'نتفلكس', icon: <CirclePlay className="w-4 h-4" /> },
        { id: 'wwe', label: 'WWE Shows', sublabel: 'مصارعة', icon: <Swords className="w-4 h-4" /> },
    ];

    useEffect(() => {
        fetchContent(category, page);
        // Scroll to top on page change
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [category, page]);

    const fetchContent = async (type, currentPage) => {
        setLoading(true);
        try {
            let data;
            // Handle search
            if (searchQuery.trim()) {
                data = await tmdbApi.searchArabicContent(searchQuery, currentPage);
            } else {
                switch (type) {
                    case 'trending':
                        data = await tmdbApi.getTrendingArabic(currentPage);
                        break;
                    case 'popular_movies':
                        data = await tmdbApi.getArabicMovies(currentPage);
                        break;
                    case 'arabic_series':
                        data = await tmdbApi.getArabicTVShows(currentPage);
                        break;
                    case 'foreign_movies':
                        data = await tmdbApi.getPopularMovies(currentPage);
                        break;
                    case 'foreign_series':
                        data = await tmdbApi.getPopularTVShows(currentPage);
                        break;
                    case 'turkish':
                        data = await tmdbApi.getTurkishSeries(currentPage);
                        break;
                    case 'ramadan':
                        // Fallback to TMDB for Ramadan as ArabSeed proxy blocks requests
                        data = await tmdbApi.getRamadanSeries(currentPage);
                        break;
                    case 'netflix':
                        data = await tmdbApi.getNetflixContent(currentPage);
                        break;
                    case 'wwe':
                        data = await tmdbApi.getWWEShows(currentPage);
                        break;
                    default:
                        data = await tmdbApi.getTrendingArabic(currentPage);
                }
            }

            setContent(data.results || []);
            // Use TMDB total pages, clamp to max 500 to avoid API limits. ArabSeed returns total_pages accurately.
            setTotalPages(Math.min(data.total_pages || data.total_pages || 1, 500));
        } catch (error) {
            console.error('Error fetching content:', error);
            setContent([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        fetchContent(category, 1);
    };

    const handleCategoryClick = (catId) => {
        setCategory(catId);
        setSearchQuery('');
        setPage(1);
    };

    const convertToFormat = (item) => ({
        imdbID: item.id.toString(),
        Title: item.title || item.name || item.original_title || item.original_name,
        Year: (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A',
        Poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'N/A',
        Plot: item.overview || '',
    });

    const isInWatchlist = (id) => watchlist.some(m => m.imdbID === id.toString());
    const isLiked = (id) => likedMovies.some(m => m.imdbID === id.toString());

    const handleWatchlistToggle = (e, item) => {
        e.stopPropagation();
        const formatted = convertToFormat(item);
        if (isInWatchlist(item.id)) {
            removeFromWatchlist(item.id.toString());
        } else {
            addToWatchlist(formatted);
        }
    };

    const handleLikeToggle = (e, item) => {
        e.stopPropagation();
        const formatted = convertToFormat(item);
        if (isLiked(item.id)) {
            removeFromLikedMovies(item.id.toString());
        } else {
            addToLikedMovies(formatted);
        }
    };

    const isTV = (item) => item.media_type === 'tv' || item.first_air_date;

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        // Generate page numbers to show (e.g. 1 2 3 ... 10)
        let pages = [];
        const maxVisible = 5;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) pages.push(i);

        return (
            <div className="flex items-center justify-center gap-2 mt-12 py-8 border-t border-white/5">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                {start > 1 && (
                    <>
                        <button onClick={() => setPage(1)} className="px-4 py-2 rounded-xl font-bold text-sm bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white transition-all">1</button>
                        {start > 2 && <span className="text-white/30 px-2">...</span>}
                    </>
                )}

                {pages.map(p => (
                    <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg ${page === p
                            ? 'bg-violet-600 text-white border border-violet-500 shadow-violet-500/20'
                            : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {p}
                    </button>
                ))}

                {end < totalPages && (
                    <>
                        {end < totalPages - 1 && <span className="text-white/30 px-2">...</span>}
                        <button onClick={() => setPage(totalPages)} className="px-4 py-2 rounded-xl font-bold text-sm bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white transition-all">{totalPages}</button>
                    </>
                )}

                <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#050505]">
            {/* Premium Hero Banner */}
            <div className="relative overflow-hidden py-24 px-4 border-b border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-900/20 via-background to-black" />
                <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03] pointer-events-none" />

                <div className="relative container mx-auto text-center z-10">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold uppercase tracking-widest mb-6"
                    >
                        <Moon className="w-3.5 h-3.5" /> Premium Catalog
                    </motion.div>

                    <motion.h1
                        className="text-5xl md:text-7xl font-black mb-6 tracking-tight text-white"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        Arabic & <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Ramadan</span>
                    </motion.h1>
                    <motion.p
                        className="text-white/50 text-lg max-w-2xl mx-auto font-medium"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Discover the finest Arabic cinema, thrilling Turkish series, and exclusive Ramadan specials mapped locally for you.
                    </motion.p>

                    {/* Premium Search Box */}
                    <motion.div
                        className="max-w-xl mx-auto mt-10"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                            <div className="relative flex gap-2 bg-[#0a0a0a] border border-white/10 rounded-2xl p-1.5 backdrop-blur-xl">
                                <div className="flex-1 relative flex items-center">
                                    <Search className="absolute left-4 w-5 h-5 text-white/30" />
                                    <input
                                        type="text"
                                        placeholder="Search titles, actors, or genres..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className="w-full bg-transparent pl-12 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-0 font-medium"
                                    />
                                </div>
                                <button
                                    onClick={handleSearch}
                                    className="px-8 py-3 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-500 transition-all"
                                >
                                    Search
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="container mx-auto px-4 pb-20">
                {/* Premium Category Tabs */}
                <motion.div
                    className="flex flex-wrap justify-center gap-3 mb-12 -mt-6 relative z-20"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat.id)}
                            className={`group relative px-5 py-3 rounded-2xl font-bold transition-all duration-300 flex items-center gap-2.5 text-sm overflow-hidden border ${category === cat.id
                                ? 'bg-[#1a1a1a] border-violet-500/50 text-white shadow-2xl shadow-violet-900/40 transform -translate-y-1'
                                : 'bg-[#111] border-white/5 text-white/50 hover:bg-[#151515] hover:border-white/10 hover:text-white/90'
                                }`}
                        >
                            {category === cat.id && (
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10" />
                            )}
                            <div className={`relative z-10 p-1.5 rounded-lg transition-colors ${category === cat.id ? 'bg-violet-500/20 text-violet-400' : 'bg-white/5 group-hover:bg-white/10'}`}>
                                {cat.icon}
                            </div>
                            <span className="relative z-10">{cat.label}</span>
                        </button>
                    ))}
                </motion.div>

                {/* Loading State */}
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {[...Array(15)].map((_, i) => (
                            <div key={i} className="aspect-[2/3] rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : content.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-32 bg-white/[0.02] border border-white/5 rounded-3xl"
                    >
                        <Film className="w-16 h-16 text-white/10 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-white mb-2">No Content Found</h3>
                        <p className="text-white/40 font-medium">Try checking a different category or refining your search.</p>
                    </motion.div>
                ) : (
                    <>
                        {/* Content Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {content.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4) }}
                                    className="group relative rounded-2xl overflow-hidden bg-[#111] border border-white/5 hover:border-violet-500/30 transition-all duration-500 cursor-pointer hover:shadow-2xl hover:shadow-violet-900/20"
                                    onClick={() => navigate(item.is_arabseed_direct ? `/watch/${item.id}?arabseedUrl=${encodeURIComponent(item.arabseed_link)}` : `/movie/${item.id}`)}
                                >
                                    {/* Action Buttons */}
                                    <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <button
                                            onClick={(e) => handleLikeToggle(e, item)}
                                            className="bg-black/80 backdrop-blur border border-white/10 p-2 rounded-xl hover:bg-violet-600 hover:border-violet-500 transition-all"
                                        >
                                            <Heart className={`w-4 h-4 ${isLiked(item.id) ? 'text-red-500 fill-red-500' : 'text-white'}`} />
                                        </button>
                                        <button
                                            onClick={(e) => handleWatchlistToggle(e, item)}
                                            className="bg-black/80 backdrop-blur border border-white/10 p-2 rounded-xl hover:bg-violet-600 hover:border-violet-500 transition-all"
                                        >
                                            {isInWatchlist(item.id) ? <MinusCircle className="w-4 h-4 text-white" /> : <PlusCircle className="w-4 h-4 text-white" />}
                                        </button>
                                    </div>

                                    {/* Type Badge */}
                                    {isTV(item) && (
                                        <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-violet-600/90 backdrop-blur-sm text-white border border-violet-500/50 flex items-center gap-1.5">
                                            <Tv className="w-3 h-3" /> Series
                                        </div>
                                    )}

                                    {/* Poster */}
                                    <div className="relative aspect-[2/3] overflow-hidden bg-[#1a1a1a]">
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent z-10 opacity-60" />
                                        <img
                                            src={item.poster_path ? (item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w500${item.poster_path}`) : 'https://via.placeholder.com/500x750/111/fff?text=No+Poster'}
                                            alt={item.title || item.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            loading="lazy"
                                        />

                                        {/* Play Overlay */}
                                        <div className="absolute inset-0 z-20 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                            <div className="w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-500 shadow-xl shadow-violet-900/50">
                                                <Monitor className="w-5 h-5 ml-0.5" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-4 relative z-20 bg-gradient-to-t from-[#0a0a0a] to-[#111]">
                                        <div className="flex items-center gap-2 mb-1">
                                            {item.vote_average > 0 && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                                                    <Star className="w-3 h-3 fill-amber-400" />
                                                    {item.vote_average?.toFixed(1)}
                                                </span>
                                            )}
                                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                                {(item.release_date || item.first_air_date || '').split('-')[0]}
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-bold text-white truncate group-hover:text-violet-400 transition-colors">{item.title || item.name}</h3>
                                        {(item.original_title || item.original_name) &&
                                            (item.original_title || item.original_name) !== (item.title || item.name) && (
                                                <p className="text-white/40 text-[11px] font-medium truncate mt-0.5" dir="auto">
                                                    {item.original_title || item.original_name}
                                                </p>
                                            )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Pagination Component */}
                        {renderPagination()}
                    </>
                )}
            </div>
        </div>
    );
};

export default ArabicMovies;
