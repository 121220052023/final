import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MinusCircle, PlusCircle, Search } from 'lucide-react';
import { tmdbApi } from '../services/tmdb';
import { useWatchlist } from '../context/WatchlistContext';
import { useLikedMovies } from '../context/LikedMoviesContext';

const categories = [
  { id: 'popular', label: 'Popular' },
  { id: 'top_rated', label: 'Top Rated' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'now_playing', label: 'Now Playing' },
];

function normalizeMovie(movie) {
  if (!movie || !movie.id) return null;
  
  return {
    imdbID: movie.id.toString(),
    Title: movie.title,
    Year: movie.release_date?.split('-')[0] || 'N/A',
    Poster: movie.poster_path ? `https://image.tmdb.org/t/p/w780${movie.poster_path}` : 'https://via.placeholder.com/700x1050?text=No+Image',
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
  const navigate = useNavigate();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { likedMovies, addToLikedMovies, removeFromLikedMovies } = useLikedMovies();

  useEffect(() => {
    let cancelled = false;

    const fetchMovies = async () => {
      setLoading(true);
      try {
        let data;
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

        if (!cancelled) {
          // Request 21 results so featured takes 1 and grid gets 20 (5 full rows of 4)
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
    return () => {
      cancelled = true;
    };
  }, [category, page]);

  const featured = movies[0];

  const isInWatchlist = (id) => watchlist.some((movie) => movie.imdbID === id);
  const isLiked = (id) => likedMovies.some((movie) => movie.imdbID === id);

  const toggleWatchlist = (event, movie) => {
    event.stopPropagation();
    if (!movie) return;
    if (isInWatchlist(movie.imdbID)) {
      removeFromWatchlist(movie.imdbID);
    } else {
      addToWatchlist(movie);
    }
  };

  const toggleLike = (event, movie) => {
    event.stopPropagation();
    if (!movie) return;
    if (isLiked(movie.imdbID)) {
      removeFromLikedMovies(movie.imdbID);
    } else {
      addToLikedMovies(movie);
    }
  };

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    setPage(1);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-2 mt-12 py-8">
        <button
          onClick={() => {
            setPage(p => Math.max(1, p - 1));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          disabled={page === 1}
          className="px-4 py-2 rounded-xl font-semibold text-sm bg-muted text-white/70 hover:bg-accent hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          Previous
        </button>

        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (page <= 3) {
            pageNum = i + 1;
          } else if (page >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = page - 2 + i;
          }

          return (
            <button
              key={pageNum}
              onClick={() => {
                setPage(pageNum);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                page === pageNum
                  ? 'bg-primary text-white'
                  : 'bg-muted text-white/70 hover:bg-accent hover:text-white'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={() => {
            setPage(p => Math.min(totalPages, p + 1));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          disabled={page === totalPages}
          className="px-4 py-2 rounded-xl font-semibold text-sm bg-muted text-white/70 hover:bg-accent hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="pb-20 pt-28">
      <div className="page-shell">
        <div className="mb-10">
          <div className="section-label">Browse Movies</div>
          <h1 className="display-font mt-3 text-4xl font-extrabold text-foreground md:text-6xl">
            Explore the catalog with stronger curation
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
            Each shelf now starts with a lead title and then opens into a cleaner discovery grid instead of a plain list.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item.id}
              onClick={() => handleCategoryChange(item.id)}
              className={`candy-chip ${category === item.id ? 'active' : ''}`}
            >
              {item.label}
            </button>
          ))}
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
                      src={movie.Poster}
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

            {renderPagination()}
          </>
        )}
      </div>
    </div>
  );
}
