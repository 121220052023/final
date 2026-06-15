import axios from 'axios';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_BEARER_TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN;
const makeRequest = async (endpoint, params = {}) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
      params: {
        api_key: TMDB_API_KEY,
        include_adult: true,
        ...params,
      },
      headers: {
        'Authorization': `Bearer ${TMDB_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('TMDB API Error:', error);
    throw error;
  }
};

export const tmdbApi = {
  // ===== MOVIES =====
  getPopularMovies: async (page = 1) => {
    return makeRequest('/movie/popular', { language: 'en-US', page });
  },
  getTopRatedMovies: async (page = 1) => {
    return makeRequest('/movie/top_rated', { language: 'en-US', page });
  },
  getUpcomingMovies: async (page = 1) => {
    return makeRequest('/movie/upcoming', { language: 'en-US', page });
  },
  getNowPlayingMovies: async (page = 1) => {
    return makeRequest('/movie/now_playing', { language: 'en-US', page });
  },
  getTrendingMovies: async (timeWindow = 'week', page = 1) => {
    return makeRequest(`/trending/movie/${timeWindow}`, { language: 'en-US', page });
  },
  searchMovies: async (query, page = 1) => {
    return makeRequest('/search/multi', { query, language: 'en-US', page });
  },
  getMovieDetails: async (movieId) => {
    return makeRequest(`/movie/${movieId}`, { language: 'en-US' });
  },
  getMovieVideos: async (movieId) => {
    return makeRequest(`/movie/${movieId}/videos`, { language: 'en-US' });
  },
  getMovieCredits: async (movieId) => {
    return makeRequest(`/movie/${movieId}/credits`, { language: 'en-US' });
  },
  getSimilarMovies: async (movieId) => {
    return makeRequest(`/movie/${movieId}/similar`, { language: 'en-US' });
  },
  getMovieRecommendations: async (movieId) => {
    return makeRequest(`/movie/${movieId}/recommendations`, { language: 'en-US' });
  },

  // ===== TV SHOWS =====
  getPopularTVShows: async (page = 1) => {
    return makeRequest('/tv/popular', { language: 'en-US', page });
  },
  getTopRatedTVShows: async (page = 1) => {
    return makeRequest('/tv/top_rated', { language: 'en-US', page });
  },
  getOnTheAirTVShows: async (page = 1) => {
    return makeRequest('/tv/on_the_air', { language: 'en-US', page });
  },
  getAiringTodayTVShows: async (page = 1) => {
    return makeRequest('/tv/airing_today', { language: 'en-US', page });
  },
  getTrendingTVShows: async (timeWindow = 'week', page = 1) => {
    return makeRequest(`/trending/tv/${timeWindow}`, { language: 'en-US', page });
  },
  searchTVShows: async (query, page = 1) => {
    return makeRequest('/search/tv', { query, language: 'en-US', page });
  },
  getTVShowDetails: async (tvId) => {
    return makeRequest(`/tv/${tvId}`, { language: 'en-US' });
  },
  getTVShowVideos: async (tvId) => {
    return makeRequest(`/tv/${tvId}/videos`, { language: 'en-US' });
  },
  getTVSeasonDetails: async (tvId, seasonNumber) => {
    return makeRequest(`/tv/${tvId}/season/${seasonNumber}`, { language: 'en-US' });
  },
  getTVCredits: async (tvId) => {
    return makeRequest(`/tv/${tvId}/credits`, { language: 'en-US' });
  },
  getSimilarTVShows: async (tvId) => {
    return makeRequest(`/tv/${tvId}/similar`, { language: 'en-US' });
  },
  getTVRecommendations: async (tvId) => {
    return makeRequest(`/tv/${tvId}/recommendations`, { language: 'en-US' });
  },
  getExternalIds: async (id, type = 'movie') => {
    return makeRequest(`/${type}/${id}/external_ids`, { language: 'en-US' });
  },

  getWatchProviders: async (id, type = 'movie') => {
    return makeRequest(`/${type}/${id}/watch/providers`, { language: 'en-US' });
  },

  // ===== ARABIC & RAMADAN =====
  getArabicMovies: async (page = 1) => {
    return makeRequest('/discover/movie', {
      with_original_language: 'ar',
      sort_by: 'popularity.desc',
      'vote_count.gte': 5,
      page,
    });
  },

  getArabicTVShows: async (page = 1) => {
    return makeRequest('/discover/tv', {
      with_original_language: 'ar',
      sort_by: 'popularity.desc',
      'vote_count.gte': 2,
      page,
    });
  },

  getArabicDramas: async (page = 1) => {
    return makeRequest('/discover/tv', {
      with_original_language: 'ar',
      with_genres: 18,
      sort_by: 'popularity.desc',
      page,
    });
  },

  getTopRatedArabicMovies: async (page = 1) => {
    return makeRequest('/discover/movie', {
      with_original_language: 'ar',
      sort_by: 'vote_average.desc',
      'vote_count.gte': 20,
      page,
    });
  },

  getTurkishSeries: async (page = 1) => {
    return makeRequest('/discover/tv', {
      with_original_language: 'tr',
      sort_by: 'popularity.desc',
      page,
    });
  },

  getNetflixContent: async (page = 1) => {
    const [movies, tv] = await Promise.allSettled([
      makeRequest('/discover/movie', { with_networks: 213, sort_by: 'popularity.desc', page }),
      makeRequest('/discover/tv', { with_networks: 213, sort_by: 'popularity.desc', page })
    ]);

    const allResults = [];
    if (movies.status === 'fulfilled' && movies.value.results) allResults.push(...movies.value.results);
    if (tv.status === 'fulfilled' && tv.value.results) allResults.push(...tv.value.results);

    return { results: allResults.sort((a, b) => b.popularity - a.popularity).slice(0, 20) };
  },

  getWWEShows: async (page = 1) => {
    return makeRequest('/search/tv', { query: 'WWE', page });
  },

  getRamadanSeries: async (page = 1) => {
    const searches = await Promise.allSettled([
      makeRequest('/search/tv', { query: 'مسلسلات رمضان 2026', page }),
      makeRequest('/search/tv', { query: 'رمضان 2026', page }),
      makeRequest('/search/tv', { query: 'ramadan 2026', page }),
      makeRequest('/search/tv', { query: 'ramadan', page }),
      makeRequest('/search/tv', { query: 'مسلسل', page }),
      makeRequest('/search/movie', { query: 'ramadan', page }),
    ]);

    const allResults = [];
    const seenIds = new Set();

    for (const result of searches) {
      if (result.status === 'fulfilled' && result.value.results) {
        for (const item of result.value.results) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            allResults.push(item);
          }
        }
      }
    }

    return { results: allResults.slice(0, 20), total_results: allResults.length };
  },

  getArabicComedy: async (page = 1) => {
    return makeRequest('/discover/movie', {
      with_original_language: 'ar',
      with_genres: 35,
      sort_by: 'popularity.desc',
      'vote_count.gte': 3,
      page,
    });
  },

  getEgyptianMovies: async (page = 1) => {
    return makeRequest('/discover/movie', {
      region: 'EG',
      with_original_language: 'ar',
      sort_by: 'popularity.desc',
      page,
    });
  },

  searchArabicContent: async (query, page = 1) => {
    const [arResults, enResults] = await Promise.allSettled([
      makeRequest('/search/multi', { query, language: 'ar', page }),
      makeRequest('/search/multi', { query, page }),
    ]);

    const allResults = [];
    const seenIds = new Set();

    for (const result of [arResults, enResults]) {
      if (result.status === 'fulfilled' && result.value.results) {
        for (const item of result.value.results) {
          if (!seenIds.has(item.id) && (item.media_type === 'movie' || item.media_type === 'tv')) {
            seenIds.add(item.id);
            allResults.push(item);
          }
        }
      }
    }

    return { results: allResults, total_results: allResults.length };
  },

  getTrendingArabic: async (page = 1) => {
    const [trending, popular] = await Promise.allSettled([
      makeRequest('/trending/movie/week', { language: 'ar', page }),
      makeRequest('/movie/popular', { language: 'ar', region: 'EG', page }),
    ]);

    const allResults = [];
    const seenIds = new Set();

    for (const result of [trending, popular]) {
      if (result.status === 'fulfilled' && result.value.results) {
        for (const item of result.value.results) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            allResults.push(item);
          }
        }
      }
    }

    return { results: allResults.slice(0, 20), total_results: allResults.length };
  },
};
