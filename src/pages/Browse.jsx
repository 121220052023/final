import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MinusCircle, PlusCircle, Search, Filter } from 'lucide-react';
import { tmdbApi } from '../services/tmdb';
import { useWatchlist } from '../context/WatchlistContext';
import { useLikedMovies } from '../context/LikedMoviesContext';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import { toast } from 'sonner';

const categories = [
  { id: 'popular', label: 'Popular' },
  { id: 'top_rated', label: 'Top Rated' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'now_playing', label: 'Now Playing' },
];

const genres = [
  { id: 28, label: 'Action' },
  { id: 12, label: 'Adventure' },
  { id: 16, label: 'Animation' },
  { id: 35, label: 'Comedy' },
  { id: 80, label: 'Crime' },
  { id: 99, label: 'Documentary' },
  { id: 18, label: 'Drama' },
  { id: 10751, label: 'Family' },
  { id: 14, label: 'Fantasy' },
  { id: 36, label: 'History' },
  { id: 27, label: 'Horror' },
  { id: 10402, label: 'Music' },
  { id: 9648, label: 'Mystery' },
  { id: 10749, label: 'Romance' },
  { id: 878, label: 'Sci-Fi' },
  { id: 53, label: 'Thriller' },
  { id: 10752, label: 'War' },
  { id: 37, label: 'Western' },
];

function normalizeMovie(movie) {
  if (!movie || !movie.id) return null;
  return {
    imdbID: movie.id.toString(),
    Title: movie.title,
    Year: movie.release_date?.split('-')[0] || 'N/A',
    Poster: movie.poster_path ? `https://image.tmdb.org/t/p/w780${movie.poster_path}` : '',
    Plot: movie.overview || 'No plot available',
    rating: movie.vote_average,
  };
}

export default function Browse() {
  const [category, setCategory] = useState('popular');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [showGenreFilter, setShowGenreFilter] = useState(false);
  const navigate = useNavigate();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { likedMovies, addToLikedMovies, removeFromLikedMovies } = useLikedMovies();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const fetchMovies = async () => {
      setLoading(true);
      try {
        let data;
        if (selectedGenre) {
          data = await makeRequest('/discover/movie', {
            with_genres: selectedGenre,
            sort_by: category === 'top_rated' ? 'vote_average.desc' : category === 'upcoming' ? 'release_date.asc' : 'popularity.desc',
            'vote_count.gte': 10,
            page,
          });
        } else {
          switch (category) {
            case 'top_rated':
              data = await tmdbApi.getTopRatedMovies(page);
              break;
            case 'upcoming':
              data = await tmdbApi.getUpcomingMovies(page);
              break;
            case 'now_playing':
              data = await tmdbApi.getNowPlayingMovies(page);
              break;
            default:
              data = await tmdbApi.getPopularMovies(page);
          }
        }

        if (!cancelled) {
          const results = data.results || [];
          const normalized = results.slice(0, 21).map(normalizeMovie).filter(Boolean);
          setMovies(normalized);
          setTotalPages(Math.min(data.total_pages || 1, 500));
        }
      } catch (error) {
        console.error('Error fetching movies:', error);
        if (!cancelled) setMovies([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMovies();
    return () => { cancelled = true; };
  }, [category, page, selectedGenre]);

  const featured = movies[0];

  const isInWatchlist = (id) => watchlist.some((movie) => movie.imdbID === id);
  const isLiked = (id) => likedMovies.some((movie) => movie.imdbID === id);

  const toggleWatchlist = (event, movie) => {
    event.stopPropagation();
    if (!movie) return;
    if (!isAuthenticated) {
      toast.error('Please sign in to manage your watchlist');
      navigate('/login');
      return;
    }
    if (isInWatchlist(movie.imdbID)) {
      removeFromWatchlist(movie.imdbID);
      toast.success('Removed from watchlist');
    } else {
      addToWatchlist(movie);
      toast.success('Added to watchlist');
    }
  };

  const toggleLike = (event, movie) => {
    event.stopPropagation();
    if (!movie) return;
    if (!isAuthenticated) {
      toast.error('Please sign in to like movies');
      navigate('/login');
      return;
    }
    if (isLiked(movie.imdbID)) {
      removeFromLikedMovies(movie.imdbID);
      toast.success('Removed from liked');
    } else {
      addToLikedMovies(movie);
      toast.success('Added to liked');
    }
  };

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    setPage(1);
  };

  const handleGenreChange = (genreId) => {
    setSelectedGenre(genreId === selectedGenre ? null : genreId);
    setPage(1);
    setShowGenreFilter(false);
  };

  return (
    <div className="pb-20 pt-28">
      <div className="page-shell">
        <div className="mb-10">
          <div className="section-label">Browse Movies</div>
          <h1 className="display-font mt-3 text-4xl font-extrabold text-foreground md:text-6xl">
            Explore the catalog
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
            Browse by category and genre. Sign in to like, save, and personalize your experience.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {categories.map((item) => (
            <button
              key={item.id}
              onClick={() => handleCategoryChange(item.id)}
              className={`candy-chip ${category === item.id ? 'active' : ''}`}
            >
              {item.label}
            </button>
          ))}

          <div className="relative ml-auto">
            <button
              onClick={() => setShowGenreFilter(!showGenreFilter)}
              className={`candy-chip ${selectedGenre ? 'active' : ''}`}
            >
              <Filter className="h-3.5 w-3.5" />
              {selectedGenre ? genres.find(g => g.id === selectedGenre)?.label || 'Genre' : 'Genre'}
            </button>

            {showGenreFilter && (
              <div className="absolute right-0 top-full mt-2 z-30 min-w-[240px] max-h-[320px] overflow-y-auto rounded-2xl bg-card border border-border p-3 shadow-2xl">
                <div className="flex flex-wrap gap-2">
                  {genres.map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => handleGenreChange(genre.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        selectedGenre === genre.id
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {genre.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-6">
            <div className="shimmer h-[30rem] rounded-[1.75rem] md:col-span-4" />
            <div className="shimmer h-[30rem] rounded-[1.75rem] md:col-span-2" />
            <div className="shimmer h-[18rem] rounded-[1.75rem] md:col-span-2" />
            <div className="shimmer h-[18rem] rounded-[1.75rem] md:col-span-2" />
            <div className="shimmer h-[18rem] rounded-[1.75rem] md:col-span-2" />
          </div>
        ) : movies.length === 0 ? (
          <div className="glass-immersive rounded-[2rem] p-12 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="display-font mt-5 text-3xl font-bold text-foreground">No movies found</h2>
            <p className="mt-3 text-sm text-muted-foreground">Try a different category or genre.</p>
          </div>
        ) : (
          <>
            {featured && (
              <button
                onClick={() => navigate(`/movie/${featured.imdbID}`)}
                className="movie-card group relative mb-10 overflow-hidden text-left"
              >
                <img
                  src={featured.Poster}
                  alt={featured.Title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,12,0.96)_0%,rgba(8,9,12,0.78)_46%,rgba(8,9,12,0.12)_100%)]" />
                <div className="relative z-10 flex min-h-[28rem] flex-col justify-end p-7">
                  <div className="section-label">Lead Pick</div>
                  <h2 className="display-font mt-3 max-w-2xl text-4xl font-extrabold text-white md:text-5xl">
                    {featured.Title}
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72">
                    {featured.Plot}
                  </p>
                </div>
              </button>
            )}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {movies.slice(1).map((movie) => (
                <button
                  key={movie.imdbID}
                  onClick={() => navigate(`/movie/${movie.imdbID}`)}
                  className="movie-card group relative overflow-hidden text-left"
                >
                  <div className="absolute right-3 top-3 z-20 flex flex-col gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <button
                      onClick={(event) => toggleLike(event, movie)}
                      className="rounded-full bg-black/60 p-2 text-white"
                    >
                      <Heart className={`h-4 w-4 ${isLiked(movie.imdbID) ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                    <button
                      onClick={(event) => toggleWatchlist(event, movie)}
                      className="rounded-full bg-black/60 p-2 text-white"
                    >
                      {isInWatchlist(movie.imdbID) ? <MinusCircle className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="aspect-[0.77] overflow-hidden">
                    <img
                      src={movie.Poster || 'https://via.placeholder.com/700x1050?text=No+Image'}
                      alt={movie.Title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="display-font text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                      {movie.Title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">{movie.Year} • {movie.rating?.toFixed(1) || 'N/A'} rating</p>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{movie.Plot}</p>
                  </div>
                </button>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

async function makeRequest(endpoint, params = {}) {
  const { default: axios } = await import('axios');
  const response = await axios.get(`https://api.themoviedb.org/3${endpoint}`, {
    params: { api_key: '554e4ae2d84e5702e3c5df845cf33f51', ...params },
  });
  return response.data;
}
