import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Book, Bookmark, Heart, Shuffle, Sparkles, Star, Tv, Play, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { GENRE_MAP } from '../services/imdbService';
import { contentService } from '../services/contentService';
import { tmdbApi } from '../services/tmdb';
import { googleBooksApi } from '../services/googleBooks';
import { getSurpriseMovie } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useParentalControls } from '../context/ParentalControlContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useLikedMovies } from '../context/LikedMoviesContext';
import { supabase } from '../lib/supabase';
import {
  getBackdropUrl,
  getDisplayCopy,
  getDisplayTitle,
  getMediaId,
  getPosterUrl,
  getPrimaryGenre,
  getRatingValue,
  getTypeLabel,
  getYear,
  normalizeMediaItem,
} from '../utils/media';

function PosterCard({ item, badge, onOpen, size = 'normal' }) {
  if (!item) return null;
  const rating = getRatingValue(item);
  return (
    <article className={`movie-card overflow-visible rounded-2xl ${size === 'small' ? 'min-w-[160px] w-[160px]' : ''}`}>
      <button onClick={() => onOpen(item)} className="group block w-full text-left">
        <div className={`relative overflow-hidden rounded-t-2xl bg-surface-container ${size === 'small' ? 'aspect-[0.7]' : 'aspect-[0.74]'}`}>
          <img
            src={getPosterUrl(item)}
            alt={getDisplayTitle(item)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { e.target.src = 'https://via.placeholder.com/300x450?text=No+Poster'; }}
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
          {badge && (
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">{badge}</span>
            </div>
          )}
        </div>
      </button>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <button onClick={() => onOpen(item)} className="display-font text-left text-base font-bold text-foreground transition-colors hover:text-primary line-clamp-1">
              {getDisplayTitle(item)}
            </button>
            <p className="mt-0.5 text-xs text-muted-foreground">{getPrimaryGenre(item)} • {getYear(item)}</p>
          </div>
          {rating ? (
            <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground shrink-0">
              <Star className="h-3 w-3 fill-current text-yellow-400" />
              {rating.toFixed(1)}
            </div>
          ) : null}
        </div>
        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{getDisplayCopy(item)}</p>
        <button onClick={() => onOpen(item)} className="btn-primary w-full justify-center py-2 text-xs">Details</button>
      </div>
    </article>
  );
}

function StoryCard({ item, onOpen, className = '' }) {
  if (!item) return null;
  const rating = getRatingValue(item);
  return (
    <button onClick={() => onOpen(item)} className={`group relative overflow-hidden rounded-2xl text-left ${className}`}>
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={getBackdropUrl(item)}
          alt={getDisplayTitle(item)}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => { e.target.src = 'https://via.placeholder.com/800x450?text=No+Image'; }}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
      <div className="relative z-10 flex h-full flex-col justify-end p-5">
        <div className="flex items-center gap-2">
          <div className="text-white/80 text-xs font-semibold uppercase tracking-wider">{getPrimaryGenre(item)}</div>
          {rating ? (
            <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs font-semibold text-white">
              <Star className="h-3 w-3 fill-current text-yellow-400" />
              {rating.toFixed(1)}
            </div>
          ) : null}
        </div>
        <h3 className="mt-2 max-w-lg text-xl font-bold text-white">{getDisplayTitle(item)}</h3>
        <p className="mt-1 line-clamp-2 max-w-lg text-sm leading-6 text-white/75">{getDisplayCopy(item)}</p>
      </div>
    </button>
  );
}

function BookCard({ book, onOpen }) {
  return (
    <button onClick={() => onOpen(book)} className="group flex gap-4 p-3 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all text-left">
      <div className="w-16 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
        <img
          src={book.thumbnail || book.smallThumbnail || 'https://via.placeholder.com/128x192?text=No+Cover'}
          alt={book.title}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = 'https://via.placeholder.com/128x192?text=No+Cover'; }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{book.title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-2">{book.description}</p>
        {book.averageRating > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <Star className="w-3 h-3 fill-current text-yellow-400" />
            <span className="text-xs font-semibold text-foreground">{book.averageRating}</span>
          </div>
        )}
      </div>
    </button>
  );
}

export default function Home() {
  const [heroEntries, setHeroEntries] = useState([]);
  const [curatedMovies, setCuratedMovies] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [books, setBooks] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState('all');
  const [activeRegion, setActiveRegion] = useState('all');
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isProOrAbove } = useSubscription();
  const { isContentAllowed, isChild } = useParentalControls();
  const { watchlist } = useWatchlist();
  const { likedMovies } = useLikedMovies();

  useEffect(() => {
    let cancelled = false;
    const loadHome = async () => {
      setLoading(true);
      try {
        const [heroRaw, curatedRaw, upcomingRaw, tvRaw, booksRaw, historyRaw] = await Promise.all([
          contentService.getPopularForSlider(),
          activeRegion !== 'all'
            ? import('../services/imdbService').then(m => m.searchMovies(activeRegion, 1, 'country'))
            : activeGenre === 'all'
              ? contentService.getTrendingMovies()
              : contentService.getMoviesByGenre(GENRE_MAP[activeGenre]),
          contentService.getUpcomingMovies(),
          tmdbApi.getPopularTVShows(1),
          googleBooksApi.getNewReleases(),
          user ? supabase.from('watch_history').select('movie_id, movie_title, watched_at').eq('user_id', user.id).order('watched_at', { ascending: false }).limit(10) : Promise.resolve({ data: [] }),
        ]);
        if (cancelled) return;

        const isNotMature = (m) => {
          if (m?.adult) return false;
          const rated = (m?.Rated || m?.rated || '').toUpperCase();
          if (rated === 'NC-17' || rated === 'X' || rated === 'XXX') return false;
          const genreIds = m?.genre_ids || m?.genreIds || [];
          if (genreIds.includes(10749)) return false;
          return true;
        };

        let filteredHero = (heroRaw || []).filter(isNotMature);
        let filteredCurated = (curatedRaw.movies || []).filter(isNotMature);
        let filteredUpcoming = (upcomingRaw.movies || []).filter(isNotMature);

        const tvResults = (tvRaw?.results || []).map(t => normalizeMediaItem({ ...t, Type: 'series', type: 'series' }));
        const filteredTv = tvResults.filter(isNotMature);

        if (isChild) {
          filteredHero = filteredHero.filter(m => isContentAllowed(m));
          filteredCurated = filteredCurated.filter(m => isContentAllowed(m));
          filteredUpcoming = filteredUpcoming.filter(m => isContentAllowed(m));
        }

        setHeroEntries(filteredHero.map(normalizeMediaItem));
        setCuratedMovies(filteredCurated.map(normalizeMediaItem));
        setUpcomingMovies(filteredUpcoming.map(normalizeMediaItem));
        setTvShows(filteredTv);
        setBooks(booksRaw || []);
        setWatchHistory(historyRaw?.data || []);
      } catch (error) {
        console.error('Error loading home page:', error);
        if (!cancelled) {
          setHeroEntries([]);
          setCuratedMovies([]);
          setUpcomingMovies([]);
          setTvShows([]);
          setBooks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadHome();
    return () => { cancelled = true; };
  }, [activeGenre, activeRegion, user]);

  const featuredMovie = useMemo(() => heroEntries[0] || curatedMovies[0] || upcomingMovies[0] || null, [heroEntries, curatedMovies, upcomingMovies]);
  const sideFeature = heroEntries[1] || curatedMovies[1] || upcomingMovies[1] || null;
  const sideFeatureTwo = heroEntries[2] || curatedMovies[2] || upcomingMovies[2] || null;
  const railItems = curatedMovies.slice(0, 6);
  const releaseItems = upcomingMovies.slice(0, 4);
  const featuredRating = getRatingValue(featuredMovie);

  const openMovie = (movie) => {
    const id = getMediaId(movie);
    if (!id) return;
    navigate(`/movie/${id}`, { state: { type: movie.Type || movie.type || 'movie' } });
  };

  const openBook = (book) => {
    navigate(`/book/${book.id}`);
  };

  const handleSurpriseMe = async () => {
    if (!user) {
      toast.error('Please sign in to use Surprise Me');
      navigate('/login');
      return;
    }
    if (!isProOrAbove) {
      toast.error('Surprise Me is available on Pro and above');
      navigate('/pricing');
      return;
    }
    setSurpriseLoading(true);
    try {
      const pick = await getSurpriseMovie(curatedMovies);
      if (pick?.movie) {
        navigate(`/movie/${pick.movie.imdbID || pick.movie.id}`, {
          state: { type: pick.movie.Type || pick.movie.type || 'movie' },
        });
      }
    } catch (error) {
      console.error('Error generating surprise pick:', error);
      toast.error('Could not generate a surprise pick');
    } finally {
      setSurpriseLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pb-20 pt-28">
        <div className="page-shell-wide space-y-6">
          <div className="shimmer h-[28rem] rounded-[2rem]" />
          <div className="grid gap-5 lg:grid-cols-4">
            {[1,2,3,4].map(i => <div key={i} className="shimmer h-64 rounded-[1.5rem]" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 pt-20">
      <div className="page-shell-wide space-y-14">

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_24rem]">
          <div className="editorial-panel grid min-h-[26rem] overflow-hidden rounded-2xl lg:grid-cols-[1fr_1fr]">
            <div className="relative flex flex-col justify-between overflow-hidden bg-surface-container-low p-6 sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(216,69,39,0.14),transparent_28%),linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.08)_100%)]" />
              <div className="relative z-10">
                <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">Lead story</span>
                  <span>{getPrimaryGenre(featuredMovie)}</span>
                  {featuredRating ? <span>{featuredRating.toFixed(1)} rating</span> : null}
                </div>
                <h1 className="display-font max-w-3xl text-3xl font-bold leading-[0.9] text-foreground sm:text-4xl md:text-5xl">
                  {getDisplayTitle(featuredMovie, 'Featured Tonight')}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                  {getDisplayCopy(featuredMovie, 'A hand-selected front page for the next thing worth opening.')}
                </p>
              </div>
              <div className="relative z-10 mt-8 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openMovie(featuredMovie)} className="btn-primary flex items-center gap-2 px-6 py-3 text-sm">Details</button>
                  <button onClick={handleSurpriseMe} className="btn-secondary px-5 py-3 text-sm flex items-center gap-2">
                    {surpriseLoading ? <Sparkles className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
                    Surprise me
                  </button>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{getTypeLabel(featuredMovie)}</span>
                  <span>{getYear(featuredMovie)}</span>
                  <span>{activeRegion === 'all' ? 'Global' : activeRegion}</span>
                </div>
              </div>
            </div>
            <div className="relative min-h-[28rem] overflow-hidden bg-surface-container">
              <img
                src={getBackdropUrl(featuredMovie)}
                alt={getDisplayTitle(featuredMovie)}
                className="h-full w-full object-cover object-center"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/1200x675?text=No+Image'; }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,18,20,0.05)_0%,rgba(17,18,20,0.18)_22%,rgba(17,18,20,0.62)_100%)]" />
            </div>
          </div>
          <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {sideFeature && <StoryCard item={sideFeature} onOpen={openMovie} className="min-h-[13rem]" />}
            {sideFeatureTwo && <StoryCard item={sideFeatureTwo} onOpen={openMovie} className="min-h-[13rem]" />}
          </aside>
        </section>

        <section className="editorial-panel rounded-[1.9rem] p-6 sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,18rem)_1fr] xl:items-start">
            <div>
              <div className="section-label">Refine</div>
              <h2 className="section-heading mt-2 text-2xl">Browse by genre and origin</h2>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[{ id: 'all', label: 'All picks' },{ id: 'action', label: 'Action' },{ id: 'drama', label: 'Drama' },{ id: 'thriller', label: 'Thriller' },{ id: 'sci-fi', label: 'Sci-Fi' }].map(g => (
                  <button key={g.id} onClick={() => setActiveGenre(g.id)} className={`candy-chip ${activeGenre === g.id ? 'active' : ''}`}>{g.label}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {[{ id: 'all', label: 'Global' },{ id: 'USA', label: 'USA' },{ id: 'UK', label: 'UK' },{ id: 'France', label: 'France' },{ id: 'Japan', label: 'Japan' }].map(r => (
                  <button key={r.id} onClick={() => setActiveRegion(r.id)} className={`candy-chip ${activeRegion === r.id ? 'active' : ''}`}>{r.label}</button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {watchHistory.length > 0 && (
          <section>
            <div className="section-title mb-6">
              <div>
                <div className="section-label flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  From your watch history
                </div>
                <h2 className="section-heading mt-1 text-2xl">Continue where you left off</h2>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {watchHistory.slice(0, 8).map((entry, i) => (
                <div key={entry.movie_id || i} className="bg-card border border-border/40 rounded-2xl p-4 flex items-center gap-4 hover:border-primary/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Play className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate">{entry.movie_title || `Movie #${entry.movie_id}`}</p>
                    <p className="text-xs text-muted-foreground">{new Date(entry.watched_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/movie/${entry.movie_id}`)}
                    className="text-xs font-bold text-primary hover:underline shrink-0"
                  >
                    Resume
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tvShows.length > 0 && (
          <section>
            <div className="section-title mb-6">
              <div>
                <div className="section-label flex items-center gap-2"><Tv className="w-3.5 h-3.5" /> Series</div>
                <h2 className="section-heading mt-1 text-2xl">Popular TV series</h2>
              </div>
              <button onClick={() => navigate('/tv-shows')} className="btn-quiet text-sm">All series <ArrowRight className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tvShows.slice(0, 4).map((item) => (
                <StoryCard key={getMediaId(item)} item={item} onOpen={openMovie} className="min-h-[20rem]" />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="section-title mb-6">
            <div>
              <div className="section-label">Now on the shelf</div>
              <h2 className="section-heading mt-1 text-2xl">Movies with momentum</h2>
            </div>
            <button onClick={() => navigate('/trending')} className="btn-quiet text-sm">Trending <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {railItems.map((item, i) => (
              <PosterCard key={getMediaId(item)} item={item} badge={i === 0 ? 'Top pick' : i === 1 ? 'Fresh' : undefined} onOpen={openMovie} />
            ))}
          </div>
        </section>

        <section>
          <div className="section-title mb-6">
            <div>
              <div className="section-label flex items-center gap-2"><Book className="w-3.5 h-3.5" /> Books</div>
              <h2 className="section-heading mt-1 text-2xl">New releases in fiction</h2>
            </div>
            <button onClick={() => navigate('/books')} className="btn-quiet text-sm">All books <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.slice(0, 8).map((book) => (
              <BookCard key={book.id} book={book} onOpen={openBook} />
            ))}
          </div>
        </section>

        {watchlist.length > 0 && (
          <section>
            <div className="section-title mb-6">
              <div>
                <div className="section-label flex items-center gap-2"><Bookmark className="w-3.5 h-3.5 text-emerald-500" /> Saved shelves</div>
                <h2 className="section-heading mt-1 text-2xl">From your watchlist</h2>
              </div>
              <button onClick={() => navigate('/watchlist')} className="btn-quiet text-sm">Full watchlist <ArrowRight className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {watchlist.slice(0, 4).map((movie) => (
                <PosterCard key={movie.imdbID} item={movie} onOpen={openMovie} />
              ))}
            </div>
          </section>
        )}

        {releaseItems.length > 0 && (
          <section>
            <div className="section-title mb-6">
              <div>
                <div className="section-label">New releases</div>
                <h2 className="section-heading mt-1 text-2xl">Latest additions</h2>
              </div>
              <button onClick={() => navigate('/browse')} className="btn-quiet text-sm">Browse all <ArrowRight className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {releaseItems.map((item) => (
                <StoryCard key={getMediaId(item)} item={item} onOpen={openMovie} className="min-h-[20rem]" />
              ))}
            </div>
          </section>
        )}

        {likedMovies.length > 0 && (
          <section>
            <div className="section-title mb-6">
              <div>
                <div className="section-label flex items-center gap-2"><Heart className="w-3.5 h-3.5 text-pink-500" /> Your favorites</div>
                <h2 className="section-heading mt-1 text-2xl">Movies you liked</h2>
              </div>
              <button onClick={() => navigate('/liked-movies')} className="btn-quiet text-sm">All favorites <ArrowRight className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {likedMovies.slice(0, 4).map((movie) => (
                <PosterCard key={movie.imdbID} item={movie} onOpen={openMovie} />
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
          {upcomingMovies[0] && <StoryCard item={upcomingMovies[0]} onOpen={openMovie} className="min-h-[22rem]" />}
          <div className="editorial-panel flex h-full flex-col justify-between rounded-[1.9rem] p-6 sm:p-8">
            <div>
              <div className="section-label flex items-center gap-2"><TrendingUp className="w-4 h-4" /> For you</div>
              <h2 className="section-heading mt-2 text-2xl">A personal lane based on your taste</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Your reviews, ratings, watch history, watchlist, and likes build a recommendation lane unique to you.
              </p>
            </div>
            <div className="mt-6 space-y-3">
              <div className="rounded-[1.35rem] border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                {user
                  ? 'Open For You to see your personally curated shelves.'
                  : 'Sign in to make the For You page learn from your reviews and watch history.'}
              </div>
              <button onClick={() => navigate('/for-you')} className="btn-primary w-full justify-between px-5 py-3">
                Open For You <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
