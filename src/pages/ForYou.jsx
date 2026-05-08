import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock3, Heart, Play, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLikedMovies } from '../context/LikedMoviesContext';
import { useWatchlist } from '../context/WatchlistContext';
import { GENRE_MAP, getMoviesByGenre, getTrendingMovies } from '../services/imdbService';
import { watchHistoryService } from '../services/supabaseService';
import { tmdbApi } from '../services/tmdb';
import {
  deriveTopGenres,
  getBackdropUrl,
  getDisplayTitle,
  getGenreList,
  getMediaId,
  getPosterUrl,
  getPrimaryGenre,
  getRatingValue,
  getTypeLabel,
  getYear,
  normalizeMediaItem,
  uniqueById,
} from '../utils/media';

const genreToId = Object.entries(GENRE_MAP).reduce((accumulator, [key, value]) => {
  if (value) accumulator[key.toLowerCase()] = value;
  return accumulator;
}, {});

const extractBaseId = (value) => value?.toString()?.replace(/-S\d+E\d+$/, '');

function ShelfPoster({ item, caption, onOpen, onWatch }) {
  return (
    <article className="movie-card overflow-hidden rounded-[1.4rem]">
      <button onClick={() => onOpen(item)} className="group block w-full text-left">
        <div className="relative aspect-[0.74] overflow-hidden">
          <img
            src={getPosterUrl(item)}
            alt={getDisplayTitle(item)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </button>
      <div className="space-y-3 p-4">
        <div>
          <button onClick={() => onOpen(item)} className="display-font text-left text-lg font-bold text-foreground hover:text-primary">
            {getDisplayTitle(item)}
          </button>
          <p className="mt-1 text-sm text-muted-foreground">
            {caption || `${getPrimaryGenre(item)} • ${getYear(item)}`}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {getTypeLabel(item)}
          </span>
          <button onClick={() => onWatch(item)} className="btn-secondary px-4 py-2 text-sm">
            <Play className="h-4 w-4 fill-current" />
            Watch
          </button>
        </div>
      </div>
    </article>
  );
}

export default function ForYou() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { likedMovies } = useLikedMovies();
  const { watchlist } = useWatchlist();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [movieShelf, setMovieShelf] = useState([]);
  const [seriesShelf, setSeriesShelf] = useState([]);
  const [recommendationShelf, setRecommendationShelf] = useState([]);
  const [moviePage, setMoviePage] = useState(1);
  const [seriesPage, setSeriesPage] = useState(1);
  const [recPage, setRecPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      setLoading(true);
      try {
        const historyData = user && session
          ? await watchHistoryService.get(user.id, session.access_token, 36)
          : [];

        if (cancelled) return;
        setHistory(historyData || []);

        const tasteInput = [
          ...(historyData || []),
          ...likedMovies,
          ...watchlist,
        ];
        const topGenres = deriveTopGenres(tasteInput, 2);

        const mappedGenres = topGenres
          .map((genre) => genreToId[genre.toLowerCase()] || genreToId[genre.toLowerCase().replace(/\s+/g, '-')])
          .filter(Boolean);

        const recentAnchor = historyData?.[0];
        const anchorId = extractBaseId(recentAnchor?.movie_id);
        const anchorType = recentAnchor?.movie_type === 'tv' ? 'tv' : 'movie';

        const [movieData, tvData, recommendationData] = await Promise.all([
          mappedGenres[0] ? getMoviesByGenre(mappedGenres[0], moviePage) : getTrendingMovies(moviePage),
          tmdbApi.getTrendingTVShows('week', seriesPage),
          anchorId
            ? (anchorType === 'tv'
                ? tmdbApi.getTVRecommendations(anchorId)
                : tmdbApi.getMovieRecommendations(anchorId))
            : tmdbApi.getTrendingMovies('week', recPage),
        ]);

        if (cancelled) return;

        const normalizedMovies = (movieData.movies || []).map(normalizeMediaItem);
        const normalizedSeries = (tvData.results || [])
          .filter((item) => {
            if (!mappedGenres.length) return true;
            return item.genre_ids?.some((genreId) => mappedGenres.includes(genreId));
          })
          .slice(0, 8)
          .map(normalizeMediaItem);

        const normalizedRecommendations = (recommendationData.results || [])
          .slice(0, 8)
          .map(normalizeMediaItem);

        setMovieShelf(uniqueById(normalizedMovies).slice(0, 8));
        setSeriesShelf(uniqueById(normalizedSeries).slice(0, 8));
        setRecommendationShelf(uniqueById(normalizedRecommendations).slice(0, 8));
      } catch (error) {
        console.error('Error loading For You page:', error);
        if (!cancelled) {
          setHistory([]);
          setMovieShelf([]);
          setSeriesShelf([]);
          setRecommendationShelf([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [user, session, likedMovies, watchlist, moviePage, seriesPage, recPage]);

  const tasteProfile = useMemo(() => {
    const topGenres = deriveTopGenres([...history, ...likedMovies, ...watchlist], 3);
    return topGenres.length ? topGenres : ['Discovery', 'Character stories', 'Late-night picks'];
  }, [history, likedMovies, watchlist]);

  const heroItem = recommendationShelf[0] || movieShelf[0] || seriesShelf[0] || likedMovies[0] || watchlist[0] || null;

  const openMovie = (item) => {
    const id = getMediaId(item);
    if (!id) return;
    navigate(`/movie/${id}`, { state: { type: item.Type || item.type || 'movie' } });
  };

  const watchMovie = (item) => {
    const id = getMediaId(item);
    if (!id) return;
    navigate(`/watch/${id}`, { state: { type: item.Type || item.type || 'movie' } });
  };

  const continueWatching = history.slice(0, 4);

  return (
    <div className="pb-20 pt-28">
      <div className="page-shell-wide space-y-14">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(24rem,0.8fr)]">
          <div className="editorial-panel relative overflow-hidden rounded-[2rem]">
            <div className="grid min-h-[32rem] lg:grid-cols-[1.05fr_0.95fr]">
              <div className="relative flex flex-col justify-between p-6 sm:p-8 lg:p-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(216,69,39,0.16),transparent_28%)]" />
                <div className="relative z-10">
                  <div className="section-label">For you</div>
                  <h1 className="display-font mt-3 max-w-3xl text-5xl font-bold leading-[0.92] md:text-6xl xl:text-7xl">
                    Recommendations shaped by what you actually watch.
                  </h1>
                  <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
                    This page reads your recent watch history first, then your likes and watchlist, and turns that into shelves of movies and series that match your real taste.
                  </p>
                </div>

                <div className="relative z-10 mt-8 space-y-5">
                  <div className="flex flex-wrap gap-2.5">
                    {tasteProfile.map((genre) => (
                      <span key={genre} className="candy-chip active">
                        {genre}
                      </span>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="stat-tile">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">History items</div>
                      <div className="mt-2 text-3xl font-bold text-foreground">{history.length}</div>
                    </div>
                    <div className="stat-tile">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Liked</div>
                      <div className="mt-2 text-3xl font-bold text-foreground">{likedMovies.length}</div>
                    </div>
                    <div className="stat-tile">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Watch later</div>
                      <div className="mt-2 text-3xl font-bold text-foreground">{watchlist.length}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative min-h-[18rem]">
                <img
                  src={getBackdropUrl(heroItem)}
                  alt={getDisplayTitle(heroItem, 'For You')}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,18,20,0.05)_0%,rgba(17,18,20,0.2)_24%,rgba(17,18,20,0.68)_100%)]" />
              </div>
            </div>
          </div>

          <div className="editorial-panel rounded-[2rem] p-6 sm:p-8">
            <div className="section-label">Current taste map</div>
            <div className="mt-5 space-y-4">
              {[
                { icon: Clock3, label: 'Continue watching', value: `${continueWatching.length} items active` },
                { icon: Heart, label: 'Preference signal', value: tasteProfile.join(' • ') },
                { icon: Sparkles, label: 'Anchor title', value: getDisplayTitle(heroItem, 'Building from your activity') },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.3rem] border border-border bg-muted/50 p-4">
                  <div className="flex items-start gap-3">
                    <item.icon className="mt-1 h-5 w-5 text-primary" />
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">{item.label}</div>
                      <div className="mt-2 text-base font-semibold text-foreground">{item.value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {continueWatching.length > 0 ? (
          <section>
            <div className="section-title mb-6">
              <div>
                <div className="section-label">Continue watching</div>
                <h2 className="section-heading mt-2">Keep moving through the titles you already opened</h2>
              </div>
              <button onClick={() => navigate('/history')} className="btn-quiet">
                Full history
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {continueWatching.map((item) => (
                <button
                  key={item.id}
                  onClick={() => watchMovie({ imdbID: extractBaseId(item.movie_id), Type: item.movie_type })}
                  className="list-row flex items-center gap-4 p-4 text-left"
                >
                  <img
                    src={item.poster_url || 'https://via.placeholder.com/180x260?text=Poster'}
                    alt={item.title}
                    className="h-24 w-16 rounded-[1rem] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="display-font truncate text-xl font-bold text-foreground">{item.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {item.movie_type === 'tv' ? 'Series' : 'Movie'} • {Math.round(item.progress || 0)}% watched
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(item.progress || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className="section-title mb-6">
            <div>
              <div className="section-label">Because you watched</div>
              <h2 className="section-heading mt-2">Closest matches to your recent viewing lane</h2>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {recommendationShelf.slice(0, 4).map((item) => (
              <ShelfPoster key={getMediaId(item)} item={item} onOpen={openMovie} onWatch={watchMovie} />
            ))}
          </div>
        </section>

        <section>
          <div className="section-title mb-6">
            <div>
              <div className="section-label">Movies</div>
              <h2 className="section-heading mt-2">Movie picks aligned with your top genres</h2>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {movieShelf.slice(0, 8).map((item) => (
              <ShelfPoster key={getMediaId(item)} item={item} onOpen={openMovie} onWatch={watchMovie} />
            ))}
          </div>
          <PaginationControls
            currentPage={moviePage}
            onPageChange={(p) => { setMoviePage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        </section>

        <section>
          <div className="section-title mb-6">
            <div>
              <div className="section-label">Series</div>
              <h2 className="section-heading mt-2">Series worth opening next inside the same taste pocket</h2>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {seriesShelf.slice(0, 8).map((item) => (
              <ShelfPoster
                key={getMediaId(item)}
                item={item}
                caption={`${getGenreList(item).slice(0, 2).join(' • ') || getPrimaryGenre(item)} • ${getTypeLabel(item)}`}
                onOpen={openMovie}
                onWatch={watchMovie}
              />
            ))}
          </div>
          <PaginationControls
            currentPage={seriesPage}
            onPageChange={(p) => { setSeriesPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        </section>
      </div>
    </div>
  );
}

function PaginationControls({ currentPage, onPageChange }) {
  const maxPage = 50;
  const pages = [];
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(maxPage, startPage + 4);

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8 py-6">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-3 py-2 rounded-xl font-semibold text-sm bg-muted text-white/70 hover:bg-accent hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </button>

      {pages.map((pageNum) => (
        <button
          key={pageNum}
          onClick={() => onPageChange(pageNum)}
          className={`min-w-[2.5rem] px-3 py-2 rounded-xl font-bold text-sm transition-all ${
            currentPage === pageNum
              ? 'bg-primary text-white'
              : 'bg-muted text-white/70 hover:bg-accent hover:text-white'
          }`}
        >
          {pageNum}
        </button>
      ))}

      <button
        onClick={() => onPageChange(Math.min(maxPage, currentPage + 1))}
        disabled={currentPage === maxPage}
        className="flex items-center gap-1 px-3 py-2 rounded-xl font-semibold text-sm bg-muted text-white/70 hover:bg-accent hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
