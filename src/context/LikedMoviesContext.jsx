import { createContext, useContext, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { likedMoviesService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';

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

function mapLikedItem(item) {
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

export const LikedMoviesProvider = ({ children }) => {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  const { data: likedMovies = [], isLoading } = useQuery({
    queryKey: ['likedMovies', user?.id],
    queryFn: async () => {
      if (!user || !session) return [];
      const data = await fetchLikedMovies(user.id, session.access_token);
      return (data || []).map(mapLikedItem);
    },
    enabled: !!user && !!session,
  });

  useEffect(() => {
    if (!user?.id || !session?.access_token) return;

    const channel = supabase
      .channel(`liked_movies:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'liked_movies',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.setQueryData(['likedMovies', user.id], (old = []) => {
            if (payload.eventType === 'INSERT') {
              const newItem = mapLikedItem(payload.new);
              if (old.some(m => m.id === newItem.id)) return old;
              return [newItem, ...old];
            }
            if (payload.eventType === 'DELETE') {
              return old.filter(m => m.id !== payload.old.movie_id);
            }
            if (payload.eventType === 'UPDATE') {
              return old.map(m => m.id === payload.old.movie_id ? mapLikedItem(payload.new) : m);
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
    mutationFn: (movie) => likedMoviesService.add(movie, user.id, session.access_token),
    onMutate: async (newMovie) => {
      await queryClient.cancelQueries({ queryKey: ['likedMovies', user?.id] });
      const previousLiked = queryClient.getQueryData(['likedMovies', user?.id]);
      queryClient.setQueryData(['likedMovies', user?.id], (old) => {
        const movieId = newMovie.id?.toString() || newMovie.imdbID?.toString();
        if (old?.some(m => m.id === movieId || m.imdbID === movieId)) return old;
        return [newMovie, ...(old || [])];
      });
      return { previousLiked };
    },
    onError: (err, newMovie, context) => {
      queryClient.setQueryData(['likedMovies', user?.id], context.previousLiked);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['likedMovies', user?.id] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (movieId) => likedMoviesService.remove(movieId, user.id, session.access_token),
    onMutate: async (movieId) => {
      await queryClient.cancelQueries({ queryKey: ['likedMovies', user?.id] });
      const previousLiked = queryClient.getQueryData(['likedMovies', user?.id]);
      queryClient.setQueryData(['likedMovies', user?.id], (old) => (old || []).filter(m => m.id !== movieId && m.imdbID !== movieId));
      return { previousLiked };
    },
    onError: (err, movieId, context) => {
      queryClient.setQueryData(['likedMovies', user?.id], context.previousLiked);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['likedMovies', user?.id] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const itemsToDelete = [...likedMovies];
      for (const item of itemsToDelete) {
        await likedMoviesService.remove(item.id || item.imdbID, user.id, session.access_token);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['likedMovies', user?.id] });
      const previousLiked = queryClient.getQueryData(['likedMovies', user?.id]);
      queryClient.setQueryData(['likedMovies', user?.id], []);
      return { previousLiked };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['likedMovies', user?.id], context.previousLiked);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['likedMovies', user?.id] });
    },
  });

  const addToLikedMovies = useCallback((movie) => addMutation.mutate(movie), [addMutation]);
  const removeFromLikedMovies = useCallback((movieId) => removeMutation.mutate(movieId), [removeMutation]);
  const clearLikedMovies = useCallback(() => clearMutation.mutate(), [clearMutation]);

  return (
    <LikedMoviesContext.Provider
      value={{ likedMovies, addToLikedMovies, removeFromLikedMovies, clearLikedMovies, loading: isLoading }}
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
