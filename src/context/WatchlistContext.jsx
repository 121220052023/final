import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { watchlistService } from '../services/supabaseService';

const WatchlistContext = createContext();

async function fetchWatchlist(userId, token) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/watchlist?select=*&user_id=eq.${encodeURIComponent(userId)}&order=added_at.desc`;

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

export const WatchlistProvider = ({ children }) => {
  const { user, session } = useAuth();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !session) {
      setWatchlist([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchWatchlist(user.id, session.access_token);

        if (!cancelled) {
          if (data && Array.isArray(data)) {
            const items = data.map(item => ({
              imdbID: item.movie_id,
              Title: item.title,
              Year: item.year,
              Poster: item.poster_url || 'N/A',
              Type: item.movie_type,
            }));
            setWatchlist(items);
          } else {
            setWatchlist([]);
          }
        }
      } catch (err) {
        if (!cancelled) setWatchlist([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [user, session]);

  const addToWatchlist = useCallback(async (movie) => {
    setWatchlist(prev => {
      if (prev.some(m => m.imdbID === movie.imdbID)) return prev;
      return [...prev, movie];
    });
    if (user && session) {
      try {
        await watchlistService.add(movie, user.id, session.access_token);
      } catch (error) {
        // Silently handle error
      }
    }
  }, [user, session]);

  const removeFromWatchlist = useCallback(async (imdbID) => {
    setWatchlist(prev => prev.filter(m => m.imdbID !== imdbID));
    if (user && session) {
      try {
        await watchlistService.remove(imdbID, user.id, session.access_token);
      } catch (error) {
        // Silently handle error
      }
    }
  }, [user, session]);

  const clearWatchlist = useCallback(async () => {
    const itemsToDelete = [...watchlist];
    setWatchlist([]);
    if (user && session) {
      try {
        for (const item of itemsToDelete) {
          await watchlistService.remove(item.imdbID, user.id, session.access_token);
        }
      } catch (error) {
        // Silently handle error
      }
    }
  }, [user, session, watchlist]);

  return (
    <WatchlistContext.Provider
      value={{ watchlist, addToWatchlist, removeFromWatchlist, clearWatchlist, loading: false }}
    >
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};
