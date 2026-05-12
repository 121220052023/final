import { supabase } from '../lib/supabase';

export const reviewService = {
  getMovieReviews: async (movieId, movieType = 'movie', page = 1, limit = 10) => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('movie_id', movieId)
      .eq('movie_type', movieType)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.warn('getMovieReviews:', error.message);
      return { reviews: [], total: 0 };
    }

    const reviews = data || [];
    if (reviews.length === 0) return { reviews: [], total: count || 0 };

    const userIds = [...new Set(reviews.map(r => r.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    const enriched = reviews.map(r => ({
      ...r,
      profiles: profileMap[r.user_id] || null,
    }));

    return { reviews: enriched, total: count || 0 };
  },

  createReview: async (movieId, movieType, title, rating, content) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('reviews')
      .insert({ user_id: user.id, movie_id: movieId, movie_type: movieType, title, rating, content })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateReview: async (reviewId, updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', reviewId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteReview: async (reviewId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  likeReview: async (reviewId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error: likeError } = await supabase
      .from('review_likes')
      .insert({ review_id: reviewId, user_id: user.id });

    if (likeError && likeError.code !== '23505') {
      if (likeError.code === '42P01') return;
      throw likeError;
    }

    // The database keeps reviews.likes in sync through review_likes triggers.
  },

  unlikeReview: async (reviewId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('review_likes')
      .delete()
      .eq('review_id', reviewId)
      .eq('user_id', user.id);

    if (error && error.code !== '42P01') throw error;
    // The database keeps reviews.likes in sync through review_likes triggers.
  },

  getUserReviewForMovie: async (movieId, movieType = 'movie') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('movie_id', movieId)
      .eq('movie_type', movieType)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('getUserReviewForMovie:', error.message);
    }
    return data;
  },

  getAverageRating: async (movieId, movieType = 'movie') => {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('movie_id', movieId)
      .eq('movie_type', movieType);

    if (error) throw error;
    if (!data || data.length === 0) return { average: 0, count: 0 };

    const average = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
    return { average: Math.round(average * 10) / 10, count: data.length };
  },
};
