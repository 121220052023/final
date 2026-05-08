import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { likedMoviesService } from '../services/supabaseService';

const LikedMoviesContext = createContext();

async function fetchLikedMovies(userId, token) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/liked_movies?select=*&user_id=eq.${encodeURIComponent(userId)}&order=liked_at.desc`;

  const response = await fetch(url, {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase fetch failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data;
}

export const LikedMoviesProvider = ({ children }) => {
  const { user, session } = useAuth();
  const [likedMovies, setLikedMovies] = useState([]);

  useEffect(() => {
    if (!user || !session) {
      setLikedMovies([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchLikedMovies(user.id, session.access_token);

        if (!cancelled) {
          if (data && Array.isArray(data)) {
            const items = data.map(item => ({
              imdbID: item.movie_id,
              Title: item.title,
              Year: item.year,
              Poster: item.poster_url || 'N/A',
              Type: item.movie_type,
            }));
            setLikedMovies(items);
          } else {
            setLikedMovies([]);
          }
        }
      } catch {
        if (!cancelled) setLikedMovies([]);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [user, session]);

  const addToLikedMovies = useCallback(async (movie) => {
    setLikedMovies(prev => {
      if (prev.some(m => m.imdbID === movie.imdbID)) return prev;
      return [...prev, movie];
    });
    if (user && session) {
      try {
        await likedMoviesService.add(movie, user.id, session.access_token);
      } catch {
        // Silently handle error
      }
    }
  }, [user, session]);

  const removeFromLikedMovies = useCallback(async (imdbID) => {
    setLikedMovies(prev => prev.filter(m => m.imdbID !== imdbID));
    if (user && session) {
      try {
        await likedMoviesService.remove(imdbID, user.id, session.access_token);
      } catch {
        // Silently handle error
      }
    }
  }, [user, session]);

  const clearLikedMovies = useCallback(async () => {
    const itemsToDelete = [...likedMovies];
    setLikedMovies([]);
    if (user && session) {
      try {
        for (const item of itemsToDelete) {
          await likedMoviesService.remove(item.imdbID, user.id, session.access_token);
        }
      } catch {
        // Silently handle error
      }
    }
  }, [user, session, likedMovies]);

  return (
    <LikedMoviesContext.Provider
      value={{ likedMovies, addToLikedMovies, removeFromLikedMovies, clearLikedMovies, loading: false }}
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
