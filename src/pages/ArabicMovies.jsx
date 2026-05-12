import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { tmdbApi } from '../services/tmdb';
import { Star, Heart, PlusCircle, MinusCircle, Monitor, Tv, Search, Flame, Clapperboard, MonitorPlay, Globe, Film, Flag, Moon, CirclePlay, Swords } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import { useLikedMovies } from '../context/LikedMoviesContext';

const ArabicMovies = () => {
    const [category, setCategory] = useState('trending');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const navigate = useNavigate();
    const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
    const { likedMovies, addToLikedMovies, removeFromLikedMovies } = useLikedMovies();

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['arabicContent', category, searchQuery, page],
        queryFn: async () => {
            if (searchQuery.trim()) {
                return await tmdbApi.searchArabicContent(searchQuery, page);
            }
            switch (category) {
                case 'trending': return await tmdbApi.getTrendingArabic(page);
                case 'popular_movies': return await tmdbApi.getArabicMovies(page);
                case 'arabic_series': return await tmdbApi.getArabicTVShows(page);
                case 'foreign_movies': return await tmdbApi.getPopularMovies(page);
                case 'foreign_series': return await tmdbApi.getPopularTVShows(page);
                case 'turkish': return await tmdbApi.getTurkishSeries(page);
                case 'ramadan': return await tmdbApi.getRamadanSeries(page);
                case 'netflix': return await tmdbApi.getNetflixContent(page);
                case 'wwe': return await tmdbApi.getWWEShows(page);
                default: return await tmdbApi.getTrendingArabic(page);
            }
        },
        placeholderData: (previousData) => previousData,
    });

    const content = data?.results || [];
    const totalPages = Math.min(data?.total_pages || 1, 500);
    const loading = isLoading;

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

    const handleCategoryClick = (catId) => {
        setCategory(catId);
        setSearchQuery('');
        setPage(1);
    };

    const handleSearch = () => {
        setPage(1);
    };

    const convertToFormat = (item) => ({
        id: item.id.toString(),
        imdbID: item.id.toString(),
        title: item.title || item.name || item.original_title || item.original_name,
        Title: item.title || item.name || item.original_title || item.original_name,
        year: (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A',
        Year: (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A',
        poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        Poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'N/A',
        overview: item.overview || '',
        Plot: item.overview || '',
        type: item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie',
        Type: item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie',
    });

    const isInWatchlist = (id) => watchlist.some(m => m.id === id.toString() || m.imdbID === id.toString());
    const isLiked = (id) => likedMovies.some(m => m.id === id.toString() || m.imdbID === id.toString());

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

        return (
            <div className="flex items-center justify-center gap-2 mt-12 py-8">
                <button
                    onClick={() => {
                        setPage(p => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-xl font-semibold text-sm bg-muted text-foreground/70 hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                    Previous
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                        pageNum = i + 1;
                    } else if (page <= 3) {
                        pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                    } else {
                        pageNum = page - 2 + i;
                    }

                    return (
                        <button
                            key={pageNum}
                            onClick={() => {
                                setPage(pageNum);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                page === pageNum
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-foreground/70 hover:bg-accent hover:text-foreground'
                            }`}
                        >
                            {pageNum}
                        </button>
                    );
                })}

                <button
                    onClick={() => {
                        setPage(p => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={page === totalPages}
                    className="px-4 py-2 rounded-xl font-semibold text-sm bg-muted text-foreground/70 hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                    Next
                </button>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Premium Hero Banner */}
            <div className="relative overflow-hidden py-24 px-4">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
                <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03] pointer-events-none" />

                <div className="relative container mx-auto text-center z-10">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-6"
                    >
                        <Moon className="w-3.5 h-3.5" /> Premium Catalog
                    </motion.div>

                    <motion.h1
                        className="text-5xl md:text-7xl font-black mb-6 tracking-tight text-foreground"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        Arabic & <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Ramadan</span>
                    </motion.h1>
                    <motion.p
                        className="text-muted-foreground text-lg max-w-2xl mx-auto font-medium"
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
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                            <div className="relative flex gap-2 bg-card rounded-2xl p-1.5 backdrop-blur-xl">
                                <div className="flex-1 relative flex items-center">
                                    <Search className="absolute left-4 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search titles, actors, or genres..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className="w-full bg-transparent pl-12 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 font-medium"
                                    />
                                </div>
                                <button
                                    onClick={handleSearch}
                                    className="px-8 py-3 rounded-xl font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all"
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
                            className={`group relative px-5 py-3 rounded-2xl font-bold transition-all duration-300 flex items-center gap-2.5 text-sm overflow-hidden ${
                                category === cat.id
                                    ? 'bg-surface-container-high text-foreground shadow-lg'
                                    : 'bg-surface text-muted-foreground hover:bg-surface-container-high hover:text-foreground'
                            }`}
                        >
                            {category === cat.id && (
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10" />
                            )}
                            <div className={`relative z-10 p-1.5 rounded-lg transition-colors ${category === cat.id ? 'bg-primary/20 text-primary' : 'bg-muted group-hover:bg-accent'}`}>
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
                            <div key={i} className="aspect-[2/3] rounded-2xl bg-muted animate-pulse" />
                        ))}
                    </div>
                ) : content.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-32 bg-card/50 rounded-3xl"
                    >
                        <Film className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-foreground mb-2">No Content Found</h3>
                        <p className="text-muted-foreground font-medium">Try checking a different category or refining your search.</p>
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
                                    className="group relative rounded-2xl overflow-hidden bg-surface transition-all duration-500 cursor-pointer hover:shadow-xl"
                                    onClick={() => navigate(`/movie/${item.id}`)}
                                >
                                    {/* Action Buttons */}
                                    <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <button
                                            onClick={(e) => handleLikeToggle(e, item)}
                                            className="bg-card/90 backdrop-blur p-2 rounded-xl hover:bg-primary/20 transition-all"
                                        >
                                            <Heart className={`w-4 h-4 ${isLiked(item.id) ? 'text-red-500 fill-red-500' : 'text-foreground'}`} />
                                        </button>
                                        <button
                                            onClick={(e) => handleWatchlistToggle(e, item)}
                                            className="bg-card/90 backdrop-blur p-2 rounded-xl hover:bg-primary/20 transition-all"
                                        >
                                            {isInWatchlist(item.id) ? <MinusCircle className="w-4 h-4 text-foreground" /> : <PlusCircle className="w-4 h-4 text-foreground" />}
                                        </button>
                                    </div>

                                    {/* Type Badge */}
                                    {isTV(item) && (
                                        <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-primary/90 backdrop-blur-sm text-primary-foreground flex items-center gap-1.5">
                                            <Tv className="w-3 h-3" /> Series
                                        </div>
                                    )}

                                    {/* Poster */}
                                    <div className="relative aspect-[2/3] overflow-hidden bg-surface-container-high">
                                        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent z-10 opacity-60" />
                                        <img
                                            src={item.poster_path ? (item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w500${item.poster_path}`) : 'https://via.placeholder.com/500x750/111/fff?text=No+Poster'}
                                            alt={item.title || item.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            loading="lazy"
                                        />

                                        {/* Play Overlay */}
                                        <div className="absolute inset-0 z-20 bg-card/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-500">
                                                <Monitor className="w-5 h-5 ml-0.5" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-4 relative z-20 bg-gradient-to-t from-card to-surface">
                                        <div className="flex items-center gap-2 mb-1">
                                            {item.vote_average > 0 && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                                                    <Star className="w-3 h-3 fill-amber-400" />
                                                    {item.vote_average?.toFixed(1)}
                                                </span>
                                            )}
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                {(item.release_date || item.first_air_date || '').split('-')[0]}
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{item.title || item.name}</h3>
                                        {(item.original_title || item.original_name) &&
                                            (item.original_title || item.original_name) !== (item.title || item.name) && (
                                                <p className="text-muted-foreground text-[11px] font-medium truncate mt-0.5" dir="auto">
                                                    {item.original_title || item.original_name}
                                                </p>
                                            )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {renderPagination()}
                    </>
                )}
            </div>
        </div>
    );
};

export default ArabicMovies;
