import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Calendar, Clock, Sparkles, Lightbulb, Heart, Play, X, Film, Award, Globe, Monitor } from 'lucide-react';
import { getMovieDetails } from '../services/imdbService';
import { getAISummary, getSimilarMovies } from '../services/aiService';
import { tmdbApi } from '../services/tmdb';

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const typeParam = location.state?.type;

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState('');
  const [similarMovies, setSimilarMovies] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [trailer, setTrailer] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [autoPlayedTrailer, setAutoPlayedTrailer] = useState(false);

  useEffect(() => {
    loadMovieDetails();
    loadTrailer();
    checkWatchlist();
    setAutoPlayedTrailer(false);
  }, [id, typeParam]);

  const loadMovieDetails = async () => {
    setLoading(true);
    try {
      const data = await getMovieDetails(id, typeParam);
      setMovie(data);
    } catch (error) {
      console.error('Error loading movie details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrailer = async () => {
    try {
      let videos;
      try {
        videos = await tmdbApi.getMovieVideos(id);
      } catch (err) {
        videos = await tmdbApi.getTVShowVideos(id);
      }

      const trailerVideo = videos.results?.find(
        video => video.type === 'Trailer' && video.site === 'YouTube'
      ) || videos.results?.find(
        video => video.type === 'Teaser' && video.site === 'YouTube'
      );
      setTrailer(trailerVideo);

      // Auto-play trailer after 1 second
      if (trailerVideo && !autoPlayedTrailer) {
        setTimeout(() => {
          setShowTrailer(true);
          setAutoPlayedTrailer(true);
        }, 1000);
      }
    } catch (error) {
      console.error('Error loading trailer:', error);
    }
  };

  const checkWatchlist = () => {
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    setIsInWatchlist(watchlist.some(item => item.imdbID === id));
  };

  const handleAISummary = async () => {
    setLoadingAI(true);
    try {
      const summary = await getAISummary(movie);
      setAiSummary(summary);
    } catch (error) {
      console.error('Error getting AI summary:', error);
      setAiSummary('Failed to generate AI summary. Please try again.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSimilarMovies = async () => {
    setLoadingSimilar(true);
    try {
      const similar = await getSimilarMovies(movie);
      setSimilarMovies(similar);
    } catch (error) {
      console.error('Error getting similar movies:', error);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const toggleWatchlist = () => {
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    if (isInWatchlist) {
      const filtered = watchlist.filter(item => item.imdbID !== id);
      localStorage.setItem('watchlist', JSON.stringify(filtered));
      setIsInWatchlist(false);
    } else {
      watchlist.push(movie);
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      setIsInWatchlist(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="shimmer h-96 w-96 rounded-lg"></div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-xl">Movie not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Trailer Modal */}
      <AnimatePresence>
        {showTrailer && trailer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setShowTrailer(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full max-w-6xl aspect-video"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowTrailer(false)}
                className="absolute -top-12 right-0 text-white hover:text-purple-400 transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
              <iframe
                className="w-full h-full rounded-xl shadow-2xl"
                src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
                title="Movie Trailer"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section with Backdrop */}
      <div className="relative h-[75vh] overflow-hidden">
        {movie?.backdrop ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${movie.backdrop})`,
            }}
          />
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${movie?.Poster !== 'N/A' ? movie?.Poster : 'https://via.placeholder.com/1920x1080'})`,
              filter: 'blur(20px) brightness(0.4)',
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />

        {/* Trailer Button Overlay */}
        {trailer && (
          <motion.button
            onClick={() => setShowTrailer(true)}
            className="absolute inset-0 flex items-center justify-center group"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="w-28 h-28 rounded-full bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 flex items-center justify-center shadow-2xl backdrop-blur-sm bg-opacity-90"
              whileHover={{ boxShadow: "0 0 60px rgba(147, 51, 234, 0.8)" }}
              animate={{
                boxShadow: ["0 0 40px rgba(147, 51, 234, 0.5)", "0 0 60px rgba(59, 130, 246, 0.5)", "0 0 40px rgba(147, 51, 234, 0.5)"],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Play className="w-14 h-14 text-white ml-2" fill="white" />
            </motion.div>
          </motion.button>
        )}
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 -mt-72 relative z-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Poster */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative group">
              <motion.img
                src={movie?.Poster !== 'N/A' ? movie?.Poster : 'https://via.placeholder.com/300x450'}
                alt={movie?.Title}
                className="w-full rounded-3xl shadow-2xl border-4 border-purple-500/20"
                whileHover={{ scale: 1.02, borderColor: 'rgba(147, 51, 234, 0.4)' }}
                transition={{ duration: 0.3 }}
              />
              {trailer && (
                <motion.button
                  onClick={() => setShowTrailer(true)}
                  className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center shadow-xl">
                    <Play className="w-10 h-10 text-white ml-1" fill="white" />
                  </div>
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Details */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.h1
              className="text-5xl md:text-7xl font-bold gradient-header bg-clip-text text-transparent mb-6 leading-tight"
              initial={{ y: -20 }}
              animate={{ y: 0 }}
            >
              {movie?.Title}
            </motion.h1>

            <div className="flex flex-wrap items-center gap-4 mb-8">
              {movie?.imdbRating && movie.imdbRating !== 'N/A' && movie.imdbRating !== '0.0' && (
                <motion.div
                  className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-5 py-3 rounded-full border-2 border-yellow-500/30"
                  whileHover={{ scale: 1.05, borderColor: 'rgba(234, 179, 8, 0.6)' }}
                >
                  <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                  <span className="text-foreground font-bold text-xl">{movie.imdbRating}/10</span>
                  <span className="text-muted-foreground text-sm">({movie.imdbVotes} votes)</span>
                </motion.div>
              )}
              {movie?.Year && movie.Year !== 'N/A' && (
                <motion.div
                  className="flex items-center gap-2 bg-card px-5 py-3 rounded-full border-2 border-purple-500/30"
                  whileHover={{ scale: 1.05, borderColor: 'rgba(147, 51, 234, 0.6)' }}
                >
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <span className="text-foreground font-semibold text-lg">{movie.Year}</span>
                </motion.div>
              )}
              {movie?.Runtime && movie.Runtime !== 'N/A' && (
                <motion.div
                  className="flex items-center gap-2 bg-card px-5 py-3 rounded-full border-2 border-blue-500/30"
                  whileHover={{ scale: 1.05, borderColor: 'rgba(59, 130, 246, 0.6)' }}
                >
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span className="text-foreground font-semibold text-lg">{movie.Runtime}</span>
                </motion.div>
              )}
              {movie?.Rated && movie?.Rated !== 'N/A' && (
                <motion.div
                  className="flex items-center gap-2 bg-card px-5 py-3 rounded-full border-2 border-green-500/30"
                  whileHover={{ scale: 1.05, borderColor: 'rgba(34, 197, 94, 0.6)' }}
                >
                  <Award className="w-5 h-5 text-green-500" />
                  <span className="text-foreground font-semibold text-lg">{movie.Rated}</span>
                </motion.div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mb-8">
              {movie?.Genre?.split(', ').map((genre) => (
                <motion.span
                  key={genre}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-purple-600/20 text-purple-400 rounded-full text-base font-bold border-2 border-purple-500/30"
                  whileHover={{ scale: 1.1, borderColor: 'rgba(147, 51, 234, 0.6)' }}
                  transition={{ duration: 0.2 }}
                >
                  {genre}
                </motion.span>
              ))}
            </div>

            <motion.p
              className="text-muted-foreground text-xl leading-relaxed mb-10 bg-gradient-to-br from-card/80 to-card/50 p-8 rounded-2xl border-2 border-border shadow-xl"
              whileHover={{ scale: 1.01, borderColor: 'rgba(147, 51, 234, 0.2)' }}
            >
              {movie?.Plot}
            </motion.p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mb-10">
              <motion.button
                onClick={() => navigate(`/watch/${id}`, { state: { type: movie?.Type } })}
                className="flex items-center gap-3 px-10 py-4 text-xl rounded-full font-bold text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 50%, #7c3aed 100%)', backgroundSize: '200% auto' }}
                whileHover={{ scale: 1.08, backgroundPosition: 'right center', boxShadow: "0 10px 40px rgba(6, 182, 212, 0.5)" }}
                whileTap={{ scale: 0.95 }}
              >
                <Monitor className="w-6 h-6" />
                {movie?.Type === 'tv' ? 'Watch Series' : 'Watch Movie'}
              </motion.button>
              {trailer && (
                <motion.button
                  onClick={() => setShowTrailer(true)}
                  className="btn-primary flex items-center gap-3 px-10 py-4 text-xl rounded-full shadow-lg"
                  whileHover={{ scale: 1.08, boxShadow: "0 10px 40px rgba(147, 51, 234, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Play className="w-6 h-6" fill="white" />
                  Watch Trailer
                </motion.button>
              )}
              <motion.button
                onClick={toggleWatchlist}
                className={`${isInWatchlist ? 'bg-gradient-to-r from-red-600 to-pink-600' : 'bg-card border-2 border-border'} px-10 py-4 rounded-full font-bold transition-all duration-300 flex items-center gap-3 text-xl shadow-lg`}
                whileHover={{ scale: 1.08, boxShadow: "0 10px 40px rgba(236, 72, 153, 0.4)" }}
                whileTap={{ scale: 0.95 }}
              >
                <Heart className={`w-6 h-6 ${isInWatchlist ? 'fill-white text-white' : 'text-foreground'}`} />
                {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
              </motion.button>
              <motion.button
                onClick={handleAISummary}
                disabled={loadingAI}
                className="btn-secondary px-10 py-4 rounded-full flex items-center gap-3 text-xl shadow-lg"
                whileHover={{ scale: 1.08, boxShadow: "0 10px 40px rgba(59, 130, 246, 0.4)" }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="w-6 h-6" />
                {loadingAI ? 'Generating...' : `AI ${movie?.Type === 'tv' ? 'Series' : 'Movie'} Summary`}
              </motion.button>
              <motion.button
                onClick={handleSimilarMovies}
                disabled={loadingSimilar}
                className="btn-secondary px-10 py-4 rounded-full flex items-center gap-3 text-xl shadow-lg"
                whileHover={{ scale: 1.08, boxShadow: "0 10px 40px rgba(59, 130, 246, 0.4)" }}
                whileTap={{ scale: 0.95 }}
              >
                <Lightbulb className="w-6 h-6" />
                {loadingSimilar ? 'Finding...' : `Similar ${movie?.Type === 'tv' ? 'Series' : 'Movies'}`}
              </motion.button>
            </div>

            {/* Movie Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {movie?.Director && movie.Director !== 'N/A' && (
                <motion.div
                  className="bg-gradient-to-br from-card to-card/50 p-8 rounded-2xl border-2 border-border shadow-lg"
                  whileHover={{ scale: 1.02, borderColor: 'rgba(147, 51, 234, 0.3)' }}
                >
                  <h3 className="text-purple-500 text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Film className="w-4 h-4" />
                    Director
                  </h3>
                  <p className="text-foreground text-xl font-bold">{movie.Director}</p>
                </motion.div>
              )}
              {movie?.Writer && movie.Writer !== 'N/A' && (
                <motion.div
                  className="bg-gradient-to-br from-card to-card/50 p-8 rounded-2xl border-2 border-border shadow-lg"
                  whileHover={{ scale: 1.02, borderColor: 'rgba(147, 51, 234, 0.3)' }}
                >
                  <h3 className="text-blue-500 text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Film className="w-4 h-4" />
                    Writer
                  </h3>
                  <p className="text-foreground text-xl font-bold">{movie.Writer}</p>
                </motion.div>
              )}
              {movie?.Language && movie.Language !== 'N/A' && (
                <motion.div
                  className="bg-gradient-to-br from-card to-card/50 p-8 rounded-2xl border-2 border-border shadow-lg"
                  whileHover={{ scale: 1.02, borderColor: 'rgba(147, 51, 234, 0.3)' }}
                >
                  <h3 className="text-green-500 text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Language
                  </h3>
                  <p className="text-foreground text-xl font-bold">{movie.Language}</p>
                </motion.div>
              )}
              {movie?.BoxOffice && movie.BoxOffice !== 'N/A' && (
                <motion.div
                  className="bg-gradient-to-br from-card to-card/50 p-8 rounded-2xl border-2 border-border shadow-lg"
                  whileHover={{ scale: 1.02, borderColor: 'rgba(147, 51, 234, 0.3)' }}
                >
                  <h3 className="text-yellow-500 text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Box Office
                  </h3>
                  <p className="text-foreground text-xl font-bold">{movie.BoxOffice}</p>
                </motion.div>
              )}
              {movie?.spoken_languages && movie.spoken_languages.length > 0 && (
                <motion.div
                  className="bg-gradient-to-br from-card to-card/50 p-8 rounded-2xl border-2 border-border shadow-lg md:col-span-2"
                  whileHover={{ scale: 1.01, borderColor: 'rgba(147, 51, 234, 0.3)' }}
                >
                  <h3 className="text-purple-400 text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Spoken Languages
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {movie.spoken_languages.map((lang, idx) => (
                      <span key={idx} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm font-medium">
                        {lang}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* AI Summary Section */}
            {loadingAI && (
              <motion.div
                className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-2 border-purple-500/30 rounded-2xl p-8 mb-8 shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-8 h-8 text-purple-500" />
                  </motion.div>
                  <h2 className="text-3xl font-bold gradient-header bg-clip-text text-transparent">AI Summary</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed text-lg">Working on it...</p>
              </motion.div>
            )}
            {aiSummary && !loadingAI && (
              <motion.div
                className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-2 border-purple-500/30 rounded-2xl p-8 mb-8 shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-8 h-8 text-purple-500" />
                  <h2 className="text-3xl font-bold gradient-header bg-clip-text text-transparent">AI Summary</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed text-lg">{aiSummary}</p>
              </motion.div>
            )}

            {/* Similar Movies Section */}
            {similarMovies.length > 0 && (
              <motion.div
                className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 rounded-2xl p-8 mb-8 shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <Lightbulb className="w-8 h-8 text-blue-500" />
                  <h2 className="text-3xl font-bold gradient-header bg-clip-text text-transparent">Similar Movies</h2>
                </div>
                <ul className="space-y-3">
                  {similarMovies.map((movie, index) => (
                    <motion.li
                      key={index}
                      className="text-muted-foreground text-lg flex items-center gap-3 p-3 rounded-lg hover:bg-card/50 transition-colors"
                      whileHover={{ x: 10 }}
                    >
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"></div>
                      {movie}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Cast Section */}
            {movie?.Actors && (
              <div className="mt-10">
                <h2 className="text-3xl font-bold gradient-header bg-clip-text text-transparent mb-6">Cast</h2>
                <div className="flex flex-wrap gap-3">
                  {movie.Actors.split(', ').map((actor) => (
                    <motion.span
                      key={actor}
                      className="px-6 py-3 bg-card border-2 border-border rounded-xl text-foreground font-semibold text-lg shadow-md"
                      whileHover={{ scale: 1.05, borderColor: 'rgba(147, 51, 234, 0.4)' }}
                    >
                      {actor}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Info */}
            {movie?.Country && (
              <motion.div
                className="mt-10 bg-gradient-to-br from-card to-card/50 p-8 rounded-2xl border-2 border-border shadow-lg"
                whileHover={{ scale: 1.01, borderColor: 'rgba(147, 51, 234, 0.3)' }}
              >
                <h3 className="text-xl font-bold text-purple-500 mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Country
                </h3>
                <p className="text-muted-foreground text-lg">{movie.Country}</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetails;

