import { createContext, useContext, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { watchlistService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';

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

function mapWatchlistItem(item) {
  return {
    id: item.movie_id,
    imdbID: item.movie_id,
    title: item.title,
    Title: item.title,
    year: item.year,
    Year: item.year,
    poster_url: item.poster_url,
    Poster: item.poster_url || 'N/A',
    type: item.movie_type,
    Type: item.movie_type,
  };
}

export const WatchlistProvider = ({ children }) => {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  const { data: watchlist = [] } = useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: async () => {
      if (!user || !session) return [];
      const data = await fetchWatchlist(user.id, session.access_token);
      return (data || []).map(mapWatchlistItem);
    },
    enabled: !!user && !!session,
  });

  useEffect(() => {
    if (!user?.id || !session?.access_token) return;

    const channel = supabase
      .channel(`watchlist:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watchlist',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.setQueryData(['watchlist', user.id], (old = []) => {
            if (payload.eventType === 'INSERT') {
              const newItem = mapWatchlistItem(payload.new);
              if (old.some(m => m.id === newItem.id)) return old;
              return [newItem, ...old];
            }
            if (payload.eventType === 'DELETE') {
              return old.filter(m => m.id !== payload.old.movie_id);
            }
            if (payload.eventType === 'UPDATE') {
              return old.map(m => m.id === payload.old.movie_id ? mapWatchlistItem(payload.new) : m);
            }
            return old;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, session?.access_token, queryClient]);

  const addMutation = useMutation({
    mutationFn: (movie) => watchlistService.add(movie, user.id, session.access_token),
    onMutate: async (newMovie) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist', user?.id] });
      const previousWatchlist = queryClient.getQueryData(['watchlist', user?.id]);
      queryClient.setQueryData(['watchlist', user?.id], (old) => {
        const movieId = newMovie.id?.toString() || newMovie.imdbID?.toString();
        if (old?.some(m => m.id === movieId || m.imdbID === movieId)) return old;
        return [newMovie, ...(old || [])];
      });
      return { previousWatchlist };
    },
    onError: (err, newMovie, context) => {
      queryClient.setQueryData(['watchlist', user?.id], context.previousWatchlist);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (movieId) => watchlistService.remove(movieId, user.id, session.access_token),
    onMutate: async (movieId) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist', user?.id] });
      const previousWatchlist = queryClient.getQueryData(['watchlist', user?.id]);
      queryClient.setQueryData(['watchlist', user?.id], (old) => (old || []).filter(m => m.id !== movieId && m.imdbID !== movieId));
      return { previousWatchlist };
    },
    onError: (err, movieId, context) => {
      queryClient.setQueryData(['watchlist', user?.id], context.previousWatchlist);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const itemsToDelete = [...watchlist];
      for (const item of itemsToDelete) {
        await watchlistService.remove(item.id || item.imdbID, user.id, session.access_token);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['watchlist', user?.id] });
      const previousWatchlist = queryClient.getQueryData(['watchlist', user?.id]);
      queryClient.setQueryData(['watchlist', user?.id], []);
      return { previousWatchlist };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['watchlist', user?.id], context.previousWatchlist);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] });
    },
  });

  const addToWatchlist = useCallback((movie) => addMutation.mutate(movie), [addMutation]);
  const removeFromWatchlist = useCallback((movieId) => removeMutation.mutate(movieId), [removeMutation]);
  const clearWatchlist = useCallback(() => clearMutation.mutate(), [clearMutation]);

  return (
    <WatchlistContext.Provider value={{ watchlist, addToWatchlist, removeFromWatchlist, clearWatchlist }}>
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (!context) throw new Error('useWatchlist must be used within a WatchlistProvider');
  return context;
};
