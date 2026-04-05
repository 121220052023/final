import React, { createContext, useState, useContext, useEffect } from 'react';

const LikedMoviesContext = createContext();

const STORAGE_KEY = 'ocean_movies_liked';

export const LikedMoviesProvider = ({ children }) => {
  const [likedMovies, setLikedMovies] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage whenever liked movies change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(likedMovies));
  }, [likedMovies]);

  const addToLikedMovies = (movie) => {
    setLikedMovies((prev) => {
      if (!prev.some((item) => item.imdbID === movie.imdbID)) {
        return [...prev, movie];
      }
      return prev;
    });
  };

  const removeFromLikedMovies = (imdbID) => {
    setLikedMovies((prev) => prev.filter((movie) => movie.imdbID !== imdbID));
  };

  const clearLikedMovies = () => {
    setLikedMovies([]);
  };

  return (
    <LikedMoviesContext.Provider
      value={{ likedMovies, addToLikedMovies, removeFromLikedMovies, clearLikedMovies }}
    >
      {children}
    </LikedMoviesContext.Provider>
  );
};

export const useLikedMovies = () => {
  const context = useContext(LikedMoviesContext);
  if (!context) {
    throw new Error('useLikedMovies must be used within a LikedMoviesProvider');
  }
  return context;
};
