import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, Heart, Info, MinusCircle, Play, PlusCircle, TrendingUp } from 'lucide-react';
import { contentService } from '../services/contentService';
import { useWatchlist } from '../context/WatchlistContext';
import { useLikedMovies } from '../context/LikedMoviesContext';
import { useAuth } from '../context/AuthContext';
import ContentFilter from '../components/ContentFilter';
import Pagination from '../components/Pagination';
import { toast } from 'sonner';

const windows = [
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'This Week' },
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

export default function Trending() {
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState('week');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { likedMovies, addToLikedMovies, removeFromLikedMovies } = useLikedMovies();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const fetchTrending = async () => {
      setLoading(true);
      try {
        const data = await contentService.getTrendingMoviesTMDB(timeWindow, page);
        if (!cancelled) {
          setTrendingMovies((data.results || []).slice(0, 21).map(normalizeMovie).filter(Boolean));
          setTotalPages(Math.min(data.total_pages || 1, 500));
        }
      } catch (error) {
        console.error('Error fetching trending movies:', error);
        if (!cancelled) setTrendingMovies([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrending();
    return () => { cancelled = true; };
  }, [timeWindow, page]);

  const normalizedMovies = trendingMovies;
  const featured = normalizedMovies[0];

  const isInWatchlist = (id) => watchlist.some((movie) => movie.imdbID === id);
  const isLiked = (id) => likedMovies.some((movie) => movie.imdbID === id);

  const toggleWatchlist = (event, movie) => {
    event.stopPropagation();
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

  const handleTimeWindowChange = (window) => {
    setTimeWindow(window);
    setPage(1);
  };

  return (
    <ContentFilter
      movie={featured || { Title: 'Trending', Plot: '', Rated: 'PG' }}
      fallback={
        <div className="page-shell pt-32">
          <div className="glass-immersive rounded-[2rem] p-8 text-center">
            <h2 className="display-font text-2xl font-bold text-foreground">Trending is unavailable</h2>
            <p className="mt-3 text-sm text-muted-foreground">This shelf is hidden by the current parental controls.</p>
          </div>
        </div>
      }
    >
      <div className="pb-20 pt-28">
        <div className="page-shell">
          <div className="mb-10">
            <div className="section-label">Trending Movies</div>
            <h1 className="display-font mt-3 text-4xl font-extrabold text-foreground md:text-6xl">
              Ranked with more hierarchy
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              The top result leads the page, and everything after that cascades in a stronger order.
            </p>
          </div>

          <div className="mb-8 flex flex-wrap gap-2">
            {windows.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTimeWindowChange(item.id)}
                className={`candy-chip ${timeWindow === item.id ? 'active' : ''}`}
              >
                <Clock3 className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>

          {loading && normalizedMovies.length === 0 ? (
            <div className="grid gap-5 md:grid-cols-6">
              <div className="shimmer h-[30rem] rounded-[1.75rem] md:col-span-4" />
              <div className="shimmer h-[30rem] rounded-[1.75rem] md:col-span-2" />
              <div className="shimmer h-[18rem] rounded-[1.75rem] md:col-span-2" />
              <div className="shimmer h-[18rem] rounded-[1.75rem] md:col-span-2" />
              <div className="shimmer h-[18rem] rounded-[1.75rem] md:col-span-2" />
            </div>
          ) : normalizedMovies.length === 0 || !featured ? (
            <div className="glass-immersive rounded-[2rem] p-12 text-center">
              <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="display-font mt-5 text-3xl font-bold text-foreground">No trending titles found</h2>
            </div>
          ) : (
            <>
              {featured && (
                <button
                  onClick={() => navigate(`/movie/${featured.imdbID}`)}
                  className="movie-card group relative mb-10 overflow-hidden text-left"
                >
                  <img
                    src={featured.Poster || 'https://via.placeholder.com/700x1050?text=No+Image'}
                    alt={featured.Title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,12,0.96)_0%,rgba(8,9,12,0.78)_46%,rgba(8,9,12,0.12)_100%)]" />
                  <div className="relative z-10 flex min-h-[28rem] flex-col justify-between p-7">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/18 text-primary">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="section-label">Top Ranked</div>
                      <h2 className="display-font mt-3 max-w-2xl text-4xl font-extrabold text-white md:text-5xl">
                        {featured.Title}
                      </h2>
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72">
                        {featured.Plot}
                      </p>
                      <div className="mt-6 flex gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/movie/${featured.imdbID}`, { state: { type: featured.type || 'movie', autoplay: true } });
                          }}
                          className="btn-primary px-6 py-2.5"
                        >
                          <Play className="h-4 w-4" />
                          Watch Now
                        </button>
                        <button
                          onClick={() => navigate(`/movie/${featured.imdbID}`)}
                          className="btn-secondary px-6 py-2.5"
                        >
                          <Info className="h-4 w-4" />
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                </button>
              )}

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {normalizedMovies.slice(1).map((movie, index) => (
                  <button
                    key={movie.imdbID}
                    onClick={() => navigate(`/movie/${movie.imdbID}`)}
                    className="movie-card group relative overflow-hidden text-left"
                  >
                    <div className="absolute left-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-sm font-bold text-white">
                      #{index + 2}
                    </div>
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
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/movie/${movie.imdbID}`, { state: { type: movie.type || 'movie', autoplay: true } });
                          }}
                          className="btn-secondary flex-1 justify-center py-2 text-xs"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Watch
                        </button>
                        <button
                          onClick={() => navigate(`/movie/${movie.imdbID}`)}
                          className="btn-primary flex-1 justify-center py-2 text-xs whitespace-nowrap"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
    </ContentFilter>
  );
}
