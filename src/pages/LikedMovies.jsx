import React, { useState, useEffect } from 'react';
import MovieCard from '../components/MovieCard';
import { motion } from 'framer-motion';
import { HeartCrack } from 'lucide-react';
import { useLikedMovies } from '../context/LikedMoviesContext';

export const LikedMovies = () => {
  const { likedMovies, removeFromLikedMovies, clearLikedMovies } = useLikedMovies();

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <motion.h1
        className="text-4xl font-bold text-foreground mb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        My Liked Movies
      </motion.h1>

      {likedMovies.length === 0 ? (
        <motion.div
          className="text-center py-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <HeartCrack className="w-24 h-24 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-xl">You haven't liked any movies yet.</p>
        </motion.div>
      ) : (
        <>
          <motion.button
            onClick={clearLikedMovies}
            className="btn-destructive flex items-center gap-2 mx-auto mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <HeartCrack className="w-5 h-5" />
            Clear Liked Movies
          </motion.button>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {likedMovies.map((movie) => (
              <MovieCard
                key={movie.imdbID}
                movie={movie}
                // onAISummary is not passed here as it's not relevant for liked movies display
              >
                <button
                  onClick={() => removeFromLikedMovies(movie.imdbID)}
                  className="absolute bottom-2 left-2 z-10 bg-red-600 bg-opacity-90 p-2 rounded-full hover:bg-opacity-100 transition-all text-white"
                >
                  <HeartCrack className="w-5 h-5" />
                </button>
              </MovieCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LikedMovies;
