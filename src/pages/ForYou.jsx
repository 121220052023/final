import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock3, Heart, Play, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLikedMovies } from '../context/LikedMoviesContext';
import { useWatchlist } from '../context/WatchlistContext';
import { GENRE_MAP, getMoviesByGenre, getTrendingMovies } from '../services/imdbService';
import { watchHistoryService } from '../services/supabaseService';
import { tmdbApi } from '../services/tmdb';
import { settingsService } from '../services/settingsService';
import {
  deriveTopGenres,
  getBackdropUrl,
  getDisplayTitle,
  getGenreList,
  getMediaId,
  getPosterUrl,
  getPrimaryGenre,
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
const ITEMS_PER_PAGE = 8;

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

  // 1. Fetch User Preferences
  const { data: userPrefs = { genres: [], types: [] } } = useQuery({
    queryKey: ['userSettings', user?.id],
    queryFn: async () => {
      const data = await settingsService.get();
      if (!data) return { genres: [], types: [] };
      return {
        genres: data.preferred_genres ? JSON.parse(data.preferred_genres) : [],
        types: data.preferred_types ? JSON.parse(data.preferred_types) : []
      };
    },
    enabled: !!user,
  });

  // 2. Fetch History
  const { data: history = [] } = useQuery({
    queryKey: ['watchHistory', user?.id, 36],
    queryFn: () => watchHistoryService.get(user.id, session.access_token, 36),
    enabled: !!user && !!session,
  });

  // Derived Taste Logic
  const tasteProfile = useMemo(() => {
    const tasteInput = [...history, ...likedMovies, ...watchlist];
    const historyGenres = deriveTopGenres(tasteInput, 3);
    const combined = [...new Set([...(userPrefs.genres || []), ...historyGenres])];
    return combined.length ? combined.slice(0, 5) : ['Discovery', 'Character stories', 'Late-night picks'];
  }, [history, likedMovies, watchlist, userPrefs]);

  const mappedGenres = useMemo(() => {
    return tasteProfile
      .map((genre) => genreToId[genre.toLowerCase()] || genreToId[genre.toLowerCase().replace(/\s+/g, '-')])
      .filter(Boolean);
  }, [tasteProfile]);

  const anchor = history?.[0];
  const anchorId = extractBaseId(anchor?.movie_id);
  const anchorType = anchor?.movie_type === 'tv' ? 'tv' : 'movie';

  // 3. Shelf Queries
  const { data: movieShelf = [], isLoading: isMovieLoading } = useQuery({
    queryKey: ['movieShelf', mappedGenres[0], 1],
    queryFn: async () => {
      const wantsMovies = userPrefs.types.length === 0 || userPrefs.types.includes('movies');
      if (!wantsMovies) return [];
      const data = mappedGenres[0] ? await getMoviesByGenre(mappedGenres[0], 1) : await getTrendingMovies(1);
      return uniqueById((data.movies || []).map(normalizeMediaItem)).slice(0, ITEMS_PER_PAGE);
    },
  });

  const { data: seriesShelf = [], isLoading: isSeriesLoading } = useQuery({
    queryKey: ['seriesShelf', mappedGenres, 1],
    queryFn: async () => {
      const wantsSeries = userPrefs.types.length === 0 || userPrefs.types.includes('tv') || userPrefs.types.includes('anime');
      if (!wantsSeries) return [];
      const data = await tmdbApi.getTrendingTVShows('week', 1);
      return uniqueById((data.results || [])
        .filter(item => !mappedGenres.length || item.genre_ids?.some(gid => mappedGenres.includes(gid)))
        .map(normalizeMediaItem)).slice(0, ITEMS_PER_PAGE);
    },
  });

  const { data: recommendationShelf = [], isLoading: isRecLoading } = useQuery({
    queryKey: ['recommendationShelf', anchorId, anchorType],
    queryFn: async () => {
      const data = anchorId
        ? (anchorType === 'tv' ? await tmdbApi.getTVRecommendations(anchorId) : await tmdbApi.getMovieRecommendations(anchorId))
        : await tmdbApi.getTrendingMovies('week', 1);
      return uniqueById((data.results || []).map(normalizeMediaItem)).slice(0, ITEMS_PER_PAGE);
    },
  });

  const isLoading = isMovieLoading || isSeriesLoading || isRecLoading;

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

  if (isLoading && !heroItem) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );
  }

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
                    This page reads your preferences, watch history, likes, and watchlist to build shelves of movies and series that match your real taste.
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
            <div className="section-label">Your taste profile</div>
            <div className="mt-5 space-y-4">
              {[
                { icon: Clock3, label: 'Continue watching', value: `${continueWatching.length} items active` },
                { icon: Heart, label: 'Preferred genres', value: tasteProfile.slice(0, 3).join(' • ') || 'Set your preferences' },
                { icon: Sparkles, label: 'Content types', value: userPrefs.types.length ? userPrefs.types.join(', ') : 'Movies & Series' },
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
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {recommendationShelf.slice(0, 4).map((item) => (
              <ShelfPoster key={getMediaId(item)} item={item} onOpen={openMovie} onWatch={watchMovie} />
            ))}
          </div>
        </section>

        {movieShelf.length > 0 && (
          <section>
            <div className="section-title mb-6">
              <div>
                <div className="section-label">Movies for you</div>
                <h2 className="section-heading mt-2">Movie picks aligned with your preferred genres</h2>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {movieShelf.map((item) => (
                <ShelfPoster key={getMediaId(item)} item={item} onOpen={openMovie} onWatch={watchMovie} />
              ))}
            </div>
          </section>
        )}

        {seriesShelf.length > 0 && (
          <section>
            <div className="section-title mb-6">
              <div>
                <div className="section-label">Series for you</div>
                <h2 className="section-heading mt-2">Series worth opening next inside the same taste pocket</h2>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {seriesShelf.map((item) => (
                <ShelfPoster
                  key={getMediaId(item)}
                  item={item}
                  caption={`${getGenreList(item).slice(0, 2).join(' • ') || getPrimaryGenre(item)} • ${getTypeLabel(item)}`}
                  onOpen={openMovie}
                  onWatch={watchMovie}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
