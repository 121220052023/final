import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Sparkles, Heart, PlusCircle, MinusCircle, Star, Monitor } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import { useLikedMovies } from '../context/LikedMoviesContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const MovieCard = ({ movie, onAISummary = () => {} }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const navigate = useNavigate();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { likedMovies, addToLikedMovies, removeFromLikedMovies } = useLikedMovies();
  const { isAuthenticated } = useAuth();

  const movieId = movie.id || movie.imdbID;
  const isMovieInWatchlist = watchlist.some((item) => (item.id || item.imdbID) === movieId);
  const isMovieLiked = likedMovies.some((item) => (item.id || item.imdbID) === movieId);

  const handleMoreInfo = () => {
    navigate(`/movie/${movieId}`, { state: { type: movie.Type || movie.media_type } });
  };

  const handleWatchNow = (e) => {
    e.stopPropagation();
    navigate(`/watch/${movieId}`, { state: { type: movie.Type || movie.media_type } });
  };

  const handleAISummary = (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please sign in to use AI features');
      navigate('/login');
      return;
    }
    onAISummary(movie);
  };

  const handleWatchlistToggle = (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please sign in to manage your watchlist');
      navigate('/login');
      return;
    }
    if (isMovieInWatchlist) {
      removeFromWatchlist(movieId);
      toast.success('Removed from watchlist');
    } else {
      addToWatchlist(movie);
      toast.success('Added to watchlist');
    }
  };

  const handleLikedToggle = (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please sign in to like movies');
      navigate('/login');
      return;
    }
    if (isMovieLiked) {
      removeFromLikedMovies(movieId);
      toast.success('Removed from liked');
    } else {
      addToLikedMovies(movie);
      toast.success('Added to liked');
    }
  };

  const posterUrl = movie.Poster
    ? (movie.Poster !== 'N/A' ? movie.Poster : '')
    : movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : '';

  const titleText = movie.Title || movie.title || 'Unknown';
  const yearText = movie.Year || (movie.release_date ? movie.release_date.substring(0, 4) : '');

  return (
    <motion.div
      className="group cursor-pointer relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.button
        onClick={handleLikedToggle}
        className="absolute top-3 right-3 z-20 bg-black/70 backdrop-blur-sm p-2.5 rounded-full hover:bg-black/90 transition-all shadow-lg"
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.95 }}
      >
        <Heart className={`w-6 h-6 ${isMovieLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
      </motion.button>

      <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-4 bg-surface-container-low transition-transform duration-500 group-hover:scale-[1.03] group-hover:shadow-[0_20px_40px_rgba(124,58,237,0.15)]">
        {posterUrl && !imgError ? (
          <img
            src={posterUrl}
            alt={titleText}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container text-muted-foreground">
            <Monitor className="h-10 w-10 mb-2 opacity-40" />
            <span className="text-xs font-medium opacity-50">No Poster</span>
          </div>
        )}

        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/60 flex flex-col items-center justify-center gap-3 p-4"
            >
              <motion.button
                onClick={handleWatchNow}
                className="flex items-center gap-2 w-full justify-center text-white font-bold px-4 py-3 rounded-xl glass-immersive"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)' }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Monitor className="w-5 h-5" />
                Watch Now
              </motion.button>
              <motion.button
                onClick={handleMoreInfo}
                className="btn-primary flex items-center gap-2 w-full justify-center glass-immersive"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Info className="w-5 h-5" />
                More Info
              </motion.button>
              <motion.button
                onClick={handleAISummary}
                className="btn-primary flex items-center gap-2 w-full justify-center glass-immersive"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="w-5 h-5" />
                AI Summary
              </motion.button>
              <motion.button
                onClick={handleWatchlistToggle}
                className={`${isMovieInWatchlist ? 'btn-soul' : 'btn-primary'} flex items-center gap-2 w-full justify-center glass-immersive`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isMovieInWatchlist ? <MinusCircle className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                {isMovieInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-5 bg-gradient-to-b from-card to-card/80">
        <h3 className="text-lg font-bold text-foreground truncate mb-1">{titleText}</h3>
        <div className="flex items-center justify-between">
          <p className="text-purple-500 text-sm font-semibold">{yearText}</p>
          {(movie.rating || movie.vote_average) && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-yellow-500 font-bold text-sm">
                {typeof (movie.rating || movie.vote_average) === 'number'
                  ? (movie.rating || movie.vote_average).toFixed(1)
                  : (movie.rating || movie.vote_average)}
              </span>
            </div>
          )}
        </div>
        {(movie.Plot || movie.overview) && (
          <p className="text-muted-foreground text-sm mt-2 line-clamp-2 leading-relaxed">
            {movie.Plot || movie.overview}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default MovieCard;
