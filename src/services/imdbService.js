import axios from 'axios';

// TMDB API Configuration
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const TMDB_BEARER_TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN;

// Helper function to make API calls
const makeRequest = async (endpoint, params = {}, page = 1) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
      params: {
        api_key: TMDB_API_KEY,
        page,
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

// Convert TMDB movie to our format
const convertMovie = (movie) => {
  let type = 'movie'; // Default to movie
  if (movie.media_type) {
    type = movie.media_type;
  } else if (movie.first_air_date) {
    type = 'tv';
  }

  return {
    id: movie.id.toString(),
    title: movie.title || movie.name,
    year: movie.release_date ? movie.release_date.split('-')[0] : movie.first_air_date?.split('-')[0] || 'N/A',
    poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
    overview: movie.overview || 'No plot available',
    genre: movie.genre_ids?.join(', ') || 'N/A',
    type: type,
    rating: movie.vote_average,
    backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null,
    // Legacy fields for backward compatibility
    imdbID: movie.id.toString(),
    Title: movie.title || movie.name,
    Year: movie.release_date ? movie.release_date.split('-')[0] : movie.first_air_date?.split('-')[0] || 'N/A',
    Poster: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : 'N/A',
    Plot: movie.overview || 'No plot available',
    Genre: movie.genre_ids?.join(', ') || 'N/A',
    Type: type,
  };
};

// Search movies by title, actor, or country
export const searchMovies = async (query, page = 1, type = 'movie') => {
  try {
    let data;

    if (type === 'actor') {
      const personData = await makeRequest('/search/person', { query, language: 'en-US' }, 1);
      if (personData.results && personData.results.length > 0) {
        const personId = personData.results[0].id;
        data = await makeRequest('/discover/movie', { with_cast: personId, language: 'en-US' }, page);
      } else {
        return { movies: [], totalPages: 0 };
      }
    } else if (type === 'country') {
      const COUNTRY_MAP = {
        'usa': 'US', 'united states': 'US', 'america': 'US', 'us': 'US',
        'uk': 'GB', 'united kingdom': 'GB', 'britain': 'GB', 'england': 'GB', 'gb': 'GB',
        'france': 'FR', 'fr': 'FR',
        'japan': 'JP', 'jp': 'JP',
        'korea': 'KR', 'south korea': 'KR', 'kr': 'KR',
        'india': 'IN',
        'germany': 'DE',
        'spain': 'ES',
        'italy': 'IT',
        'china': 'CN',
        'canada': 'CA',
        'australia': 'AU',
        'egypt': 'EG',
      };
      const q = query.toLowerCase().trim();
      const countryCode = COUNTRY_MAP[q] || (q.length === 2 ? q.toUpperCase() : null);

      if (countryCode) {
        data = await makeRequest('/discover/movie', { with_origin_country: countryCode, language: 'en-US' }, page);
      } else {
        return { movies: [], totalPages: 0 };
      }
    } else {
      data = await makeRequest('/search/multi', { query, language: 'en-US' }, page);
    }

    if (data && data.results && data.results.length > 0) {
      // Filter out people from multi-search
      const filteredResults = data.results.filter(item => item.media_type !== 'person');
      return { movies: filteredResults.slice(0, 20).map(convertMovie), totalPages: data.total_pages };
    }

    return { movies: [], totalPages: 0 };
  } catch (error) {
    console.error(`Error searching movies by ${type}:`, error);
    return { movies: [], totalPages: 0 };
  }
};

// Get trending movies
export const getTrendingMovies = async (page = 1) => {
  try {
    // Get a mix of trending, popular, and top-rated movies
    const [trending, popular, topRated] = await Promise.all([
      makeRequest('/trending/movie/week', { language: 'en-US' }, page),
      makeRequest('/movie/popular', { language: 'en-US' }, page),
      makeRequest('/movie/top_rated', { language: 'en-US' }, page),
    ]);

    // Combine and shuffle movies for variety
    const allMovies = [
      ...(trending.results || []),
      ...(popular.results || []),
      ...(topRated.results || []),
    ];

    // Remove duplicates based on ID
    const uniqueMovies = allMovies.filter(
      (movie, index, self) => index === self.findIndex(m => m.id === movie.id)
    );

    return { movies: uniqueMovies.slice(0, 20).map(convertMovie), totalPages: trending.total_pages };
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    return { movies: [], totalPages: 0 };
  }
};

// Get movie or TV show details by ID
export const getMovieDetails = async (id, paramType = null) => {
  try {
    let details, credits, externalIds;
    let type = paramType || 'movie';

    if (type === 'tv') {
      [details, credits, externalIds] = await Promise.all([
        makeRequest(`/tv/${id}`, { language: 'en-US' }),
        makeRequest(`/tv/${id}/credits`, { language: 'en-US' }),
        makeRequest(`/tv/${id}/external_ids`, { language: 'en-US' }),
      ]);
    } else {
      // Try as movie first, then fallback to tv
      try {
        [details, credits, externalIds] = await Promise.all([
          makeRequest(`/movie/${id}`, { language: 'en-US' }),
          makeRequest(`/movie/${id}/credits`, { language: 'en-US' }),
          makeRequest(`/movie/${id}/external_ids`, { language: 'en-US' }),
        ]);
        type = 'movie'; // confirm it worked as movie
      } catch {
        [details, credits, externalIds] = await Promise.all([
          makeRequest(`/tv/${id}`, { language: 'en-US' }),
          makeRequest(`/tv/${id}/credits`, { language: 'en-US' }),
          makeRequest(`/tv/${id}/external_ids`, { language: 'en-US' }),
        ]);
        type = 'tv';
      }
    }

    const imdb_id = externalIds?.imdb_id || details?.imdb_id || null;

    return {
      id: details.id.toString(),
      imdbID: imdb_id || details.id.toString(), // Use real IMDb ID if available
      tmdbID: details.id.toString(),
      year: (details.release_date || details.first_air_date) ? (details.release_date || details.first_air_date).split('-')[0] : 'N/A',
      rated: details.adult ? 'R' : 'PG-13',
      released: details.release_date || details.first_air_date || 'N/A',
      runtime: details.runtime ? `${details.runtime} min` : (details.episode_run_time?.[0] ? `${details.episode_run_time[0]} min` : 'N/A'),
      genre: details.genres?.map(g => g.name).join(', ') || 'N/A',
      director: credits.crew?.find(c => c.job === 'Director' || c.job === 'Executive Producer')?.name || 'N/A',
      writer: credits.crew?.filter(c => c.job === 'Writer' || c.job === 'Screenplay' || c.job === 'Story').slice(0, 2).map(w => w.name).join(', ') || 'N/A',
      actors: credits.cast?.slice(0, 5).map(a => a.name).join(', ') || 'N/A',
      overview: details.overview || 'No plot available',
      language: details.original_language?.toUpperCase() || null,
      country: details.production_countries?.map(c => c.name).join(', ') || null,
      awards: 'N/A',
      poster_url: details.poster_path ? `${TMDB_IMAGE_BASE_URL}${details.poster_path}` : null,
      ratings: [
        {
          Source: 'TMDB',
          Value: `${details.vote_average?.toFixed(1) || '0.0'}/10`,
        },
      ],
      metascore: details.vote_average ? Math.round(details.vote_average * 10).toString() : 'N/A',
      imdbRating: details.vote_average?.toFixed(1) || '0.0',
      imdbVotes: details.vote_count?.toLocaleString() || '0',
      type: type,
      dvd: 'N/A',
      boxOffice: details.revenue ? `$${(details.revenue / 1000000).toFixed(1)}M` : 'N/A',
      production: details.production_companies?.map(c => c.name).join(', ') || 'N/A',
      website: details.homepage || 'N/A',
      response: 'True',
      backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : null,
      spoken_languages: details.spoken_languages?.map(l => l.english_name) || [],
      // Legacy fields for backward compatibility
      imdbID: details.id.toString(),
      Title: details.title || details.name,
      Year: (details.release_date || details.first_air_date) ? (details.release_date || details.first_air_date).split('-')[0] : 'N/A',
      Rated: details.adult ? 'R' : 'PG-13',
      Released: details.release_date || details.first_air_date || 'N/A',
      Runtime: details.runtime ? `${details.runtime} min` : (details.episode_run_time?.[0] ? `${details.episode_run_time[0]} min` : 'N/A'),
      Genre: details.genres?.map(g => g.name).join(', ') || 'N/A',
      Director: credits.crew?.find(c => c.job === 'Director' || c.job === 'Executive Producer')?.name || 'N/A',
      Writer: credits.crew?.filter(c => c.job === 'Writer' || c.job === 'Screenplay' || c.job === 'Story').slice(0, 2).map(w => w.name).join(', ') || 'N/A',
      Actors: credits.cast?.slice(0, 5).map(a => a.name).join(', ') || 'N/A',
      Plot: details.overview || 'No plot available',
      Language: details.original_language?.toUpperCase() || null,
      Country: details.production_countries?.map(c => c.name).join(', ') || null,
      Awards: 'N/A',
      Poster: details.poster_path ? `${TMDB_IMAGE_BASE_URL}${details.poster_path}` : 'N/A',
      Ratings: [
        {
          Source: 'TMDB',
          Value: `${details.vote_average?.toFixed(1) || '0.0'}/10`,
        },
      ],
      Metascore: details.vote_average ? Math.round(details.vote_average * 10).toString() : 'N/A',
      Type: type,
      DVD: 'N/A',
      BoxOffice: details.revenue ? `$${(details.revenue / 1000000).toFixed(1)}M` : 'N/A',
      Production: details.production_companies?.map(c => c.name).join(', ') || 'N/A',
      Website: details.homepage || 'N/A',
      Response: 'True',
    };
  } catch (error) {
    console.error('Error fetching details:', error);
    throw new Error('Content not found');
  }
};

// Get movies by genre
export const getMoviesByGenre = async (genreId, page = 1) => {
  try {
    const data = await makeRequest('/discover/movie', {
      with_genres: genreId,
      language: 'en-US',
      sort_by: 'popularity.desc',
    }, page);

    if (data.results && data.results.length > 0) {
      return { movies: data.results.slice(0, 20).map(convertMovie), totalPages: data.total_pages };
    }

    return { movies: [], totalPages: 0 };
  } catch (error) {
    console.error('Error fetching movies by genre:', error);
    return { movies: [], totalPages: 0 };
  }
};

// Genre mapping
export const GENRE_MAP = {
  all: null,
  action: 28,
  comedy: 35,
  drama: 18,
  thriller: 53,
  'sci-fi': 878,
  horror: 27,
  romance: 10749,
  animation: 16,
  documentary: 99,
  fantasy: 14,
};

export const getPopularMoviesForSlider = async () => {
  try {
    const data = await makeRequest('/movie/popular', { language: 'en-US' });
    if (data.results && data.results.length > 0) {
      return data.results.slice(0, 5).map((movie) => {
        const converted = convertMovie(movie);

        return {
          ...converted,
          id: movie.id,
          title: converted.Title,
          overview: converted.Plot,
          type: converted.Type,
        };
      });
    }
    return [];
  } catch (error) {
    console.error('Error fetching popular movies for slider:', error);
    return [];
  }
};

export const getUpcomingMovies = async (page = 1) => {
  try {
    const data = await makeRequest('/movie/upcoming', { language: 'en-US' }, page);
    if (data.results && data.results.length > 0) {
      return { movies: data.results.slice(0, 16).map(convertMovie), totalPages: data.total_pages };
    }
    return { movies: [], totalPages: 0 };
  } catch (error) {
    console.error('Error fetching upcoming movies:', error);
    return { movies: [], totalPages: 0 };
  }
};
