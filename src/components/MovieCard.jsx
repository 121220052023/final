import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Sparkles, Heart, PlusCircle, MinusCircle, Star, Monitor } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import { useLikedMovies } from '../context/LikedMoviesContext';

const MovieCard = ({ movie, onAISummary = () => { } }) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { likedMovies, addToLikedMovies, removeFromLikedMovies } = useLikedMovies();

  const isMovieInWatchlist = watchlist.some((item) => item.imdbID === movie.imdbID);
  const isMovieLiked = likedMovies.some((item) => item.imdbID === movie.imdbID);

  const handleMoreInfo = () => {
    navigate(`/movie/${movie.imdbID}`, { state: { type: movie.Type } });
  };

  const handleWatchNow = (e) => {
    e.stopPropagation();
    navigate(`/watch/${movie.imdbID}`, { state: { type: movie.Type } });
  };

  const handleAISummary = (e) => {
    e.stopPropagation();
    onAISummary(movie);
  };

  const handleWatchlistToggle = (e) => {
    e.stopPropagation();
    if (isMovieInWatchlist) {
      removeFromWatchlist(movie.imdbID);
    } else {
      addToWatchlist(movie);
    }
  };

  const handleLikedToggle = (e) => {
    e.stopPropagation();
    if (isMovieLiked) {
      removeFromLikedMovies(movie.imdbID);
    } else {
      addToLikedMovies(movie);
    }
  };

  return (
    <motion.div
      className="movie-card relative group overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -8 }}
    >
      {/* Favorite Button */}
      <motion.button
        onClick={handleLikedToggle}
        className="absolute top-3 right-3 z-20 bg-black/70 backdrop-blur-sm p-2.5 rounded-full hover:bg-black/90 transition-all shadow-lg"
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.95 }}
      >
        <Heart
          className={`w-6 h-6 ${isMovieLiked ? 'text-red-500 fill-red-500' : 'text-white'}`}
        />
      </motion.button>

      {/* Movie Poster */}
      <div className="relative h-96 overflow-hidden">
        <motion.img
          src={movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450?text=No+Poster'}
          alt={movie.Title}
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Hover Overlay */}
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
                className="flex items-center gap-2 w-full justify-center text-white font-bold px-4 py-3 rounded-xl shadow-xl"
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
                className="btn-primary flex items-center gap-2 w-full justify-center shadow-xl"
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
                className="btn-primary flex items-center gap-2 w-full justify-center shadow-xl"
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
                className={`${isMovieInWatchlist ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'btn-primary'} flex items-center gap-2 w-full justify-center shadow-xl`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isMovieInWatchlist ? (
                  <MinusCircle className="w-5 h-5" />
                ) : (
                  <PlusCircle className="w-5 h-5" />
                )}
                {isMovieInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Movie Info */}
      <div className="p-5 bg-gradient-to-b from-card to-card/80">
        <h3 className="text-lg font-bold text-foreground truncate mb-1">{movie.Title}</h3>
        <div className="flex items-center justify-between">
          <p className="text-purple-500 text-sm font-semibold">{movie.Year}</p>
          {movie.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-yellow-500 font-bold text-sm">{typeof movie.rating === 'number' ? movie.rating.toFixed(1) : movie.rating}</span>
            </div>
          )}
        </div>
        {movie.Plot && (
          <p className="text-muted-foreground text-sm mt-2 line-clamp-2 leading-relaxed">
            {movie.Plot}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default MovieCard;
