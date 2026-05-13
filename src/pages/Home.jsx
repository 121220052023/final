import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Globe, Play, Shuffle, Sparkles, Star } from 'lucide-react';
import { toast } from 'sonner';
import {
  GENRE_MAP,
  getMoviesByGenre,
  getPopularMoviesForSlider,
  getTrendingMovies,
  getUpcomingMovies,
  searchMovies,
} from '../services/imdbService';
import { getSurpriseMovie } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import { useParentalControls } from '../context/ParentalControlContext';
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

const genreFilters = [
  { id: 'all', label: 'All picks' },
  { id: 'action', label: 'Action' },
  { id: 'drama', label: 'Drama' },
  { id: 'thriller', label: 'Thriller' },
  { id: 'sci-fi', label: 'Sci-Fi' },
  { id: 'romance', label: 'Romance' },
];

const regionFilters = [
  { id: 'all', label: 'Global' },
  { id: 'USA', label: 'United States' },
  { id: 'UK', label: 'United Kingdom' },
  { id: 'France', label: 'France' },
  { id: 'Japan', label: 'Japan' },
  { id: 'India', label: 'India' },
];

function PosterCard({ item, badge, onOpen, onWatch }) {
  if (!item) return null;
  const rating = getRatingValue(item);

  return (
    <article className="movie-card overflow-visible rounded-2xl">
      <button onClick={() => onOpen(item)} className="group block w-full text-left">
        <div className="relative aspect-[0.74] overflow-hidden rounded-t-2xl bg-surface-container">
          <img
            src={getPosterUrl(item)}
            alt={getDisplayTitle(item)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { e.target.src = 'https://via.placeholder.com/300x450?text=No+Poster'; }}
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            {badge ? (
              <span className="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">{badge}</span>
            ) : null}
            <span className="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">{getTypeLabel(item)}</span>
          </div>
        </div>
      </button>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <button onClick={() => onOpen(item)} className="display-font text-left text-xl font-bold text-foreground transition-colors hover:text-primary">
              {getDisplayTitle(item)}
            </button>
            <p className="mt-1 text-sm text-muted-foreground">{getPrimaryGenre(item)} • {getYear(item)}</p>
          </div>
          {rating ? (
            <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm font-semibold text-foreground">
              <Star className="h-4 w-4 fill-current text-yellow-400" />
              {rating.toFixed(1)}
            </div>
          ) : null}
        </div>
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{getDisplayCopy(item)}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.info('Watch feature is temporarily disabled for fixes');
            }}
            className="btn-secondary flex-1 justify-center px-4 py-2 text-sm"
          >
            <Play className="h-4 w-4" />
            Watch
          </button>
          <button
            onClick={() => onOpen(item)}
            className="btn-primary flex-1 justify-center px-4 py-2 text-sm whitespace-nowrap"
          >
            Details
          </button>
        </div>
      </div>
    </article>
  );
}

function StoryCard({ item, onOpen, className = '' }) {
  if (!item) return null;
  return (
    <button onClick={() => onOpen(item)} className={`movie-card group relative overflow-hidden rounded-2xl text-left ${className}`}>
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
        <div className="text-white/80 text-xs font-semibold uppercase tracking-wider">{getPrimaryGenre(item)}</div>
        <h3 className="display-font mt-2 max-w-lg text-2xl font-bold text-white">{getDisplayTitle(item)}</h3>
        <p className="mt-2 line-clamp-2 max-w-lg text-sm leading-6 text-white/75">{getDisplayCopy(item)}</p>
      </div>
    </button>
  );
}

export default function Home() {
  const [heroEntries, setHeroEntries] = useState([]);
  const [curatedMovies, setCuratedMovies] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState('all');
  const [activeRegion, setActiveRegion] = useState('all');
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const [surprisePick, setSurprisePick] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isContentAllowed, isChild } = useParentalControls();

  useEffect(() => {
    let cancelled = false;
    const loadHome = async () => {
      setLoading(true);
      try {
        const [heroRaw, curatedRaw, upcomingRaw] = await Promise.all([
          getPopularMoviesForSlider(),
          activeRegion !== 'all'
            ? searchMovies(activeRegion, 1, 'country')
            : activeGenre === 'all'
              ? getTrendingMovies()
              : getMoviesByGenre(GENRE_MAP[activeGenre]),
          getUpcomingMovies(),
        ]);
        if (cancelled) return;

        // Apply parental filters if user is a child
        let filteredHero = heroRaw || [];
        let filteredCurated = curatedRaw.movies || [];
        let filteredUpcoming = upcomingRaw.movies || [];

        if (isChild) {
          filteredHero = filteredHero.filter(m => isContentAllowed(m));
          filteredCurated = filteredCurated.filter(m => isContentAllowed(m));
          filteredUpcoming = filteredUpcoming.filter(m => isContentAllowed(m));
        }

        setHeroEntries(filteredHero.map(normalizeMediaItem));
        setCuratedMovies(filteredCurated.map(normalizeMediaItem));
        setUpcomingMovies(filteredUpcoming.map(normalizeMediaItem));
      } catch (error) {
        console.error('Error loading home page:', error);
        if (!cancelled) {
          setHeroEntries([]);
          setCuratedMovies([]);
          setUpcomingMovies([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadHome();
    return () => { cancelled = true; };
  }, [activeGenre, activeRegion]);

  const featuredMovie = useMemo(() => heroEntries[0] || curatedMovies[0] || upcomingMovies[0] || null, [heroEntries, curatedMovies, upcomingMovies]);
  const sideFeature = heroEntries[1] || curatedMovies[1] || upcomingMovies[1] || null;
  const sideFeatureTwo = heroEntries[2] || curatedMovies[2] || upcomingMovies[2] || null;
  const spotlight = upcomingMovies[0] || curatedMovies[3] || featuredMovie;
  const railItems = curatedMovies.slice(0, 8);
  const releaseItems = upcomingMovies.slice(1, 9);
  const featuredRating = getRatingValue(featuredMovie);

  const openMovie = (movie) => {
    const id = getMediaId(movie);
    if (!id) return;
    navigate(`/movie/${id}`, { state: { type: movie.Type || movie.type || 'movie' } });
  };



  const handleSurpriseMe = async () => {
    if (!user) {
      toast.error('Please sign in to use Surprise Me');
      navigate('/login');
      return;
    }
    setSurpriseLoading(true);
    try {
      const pick = await getSurpriseMovie(curatedMovies);
      setSurprisePick(pick?.movie ? normalizeMediaItem(pick.movie) : null);
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
          <div className="shimmer h-[32rem] rounded-[2rem]" />
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="shimmer h-72 rounded-[1.5rem]" />
            <div className="shimmer h-72 rounded-[1.5rem]" />
            <div className="shimmer h-72 rounded-[1.5rem]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 pt-20">
      <div className="page-shell-wide space-y-12">
        {/* Hero Section */}
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_27rem]">
          <div className="editorial-panel grid min-h-[28rem] overflow-hidden rounded-2xl lg:grid-cols-[1fr_1fr]">
            <div className="relative flex flex-col justify-between overflow-hidden bg-surface-container-low p-6 sm:p-8 lg:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(216,69,39,0.14),transparent_28%),linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.08)_100%)]" />
              <div className="relative z-10">
                <div className="mb-6 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">Lead story</span>
                  <span>{getPrimaryGenre(featuredMovie)}</span>
                  {featuredRating ? <span>{featuredRating.toFixed(1)} rating</span> : null}
                </div>
                <h1 className="display-font max-w-3xl text-3xl font-bold leading-[0.9] text-foreground sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
                  {getDisplayTitle(featuredMovie, 'Featured Tonight')}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base md:text-lg">
                  {getDisplayCopy(featuredMovie, 'A hand-selected front page for the next thing worth opening.')}
                </p>
              </div>
              <div className="relative z-10 mt-10 space-y-6">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      toast.info('Watch feature is temporarily disabled for fixes');
                    }}
                    className="btn-primary flex items-center gap-2 px-8 py-3.5"
                  >
                    <Play className="h-5 w-5 fill-current" />
                    Watch Now
                  </button>
                  <button onClick={() => openMovie(featuredMovie)} className="btn-secondary px-6 py-3.5">Details</button>
                  <button onClick={handleSurpriseMe} className="btn-secondary px-6 py-3.5">
                    {surpriseLoading ? <Sparkles className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
                    {surpriseLoading ? 'Finding one' : 'Surprise me'}
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Format', value: getTypeLabel(featuredMovie) },
                    { label: 'Year', value: getYear(featuredMovie) },
                    { label: 'Picked for', value: activeRegion === 'all' ? 'Global front page' : activeRegion },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.35rem] border border-border bg-card/70 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">{item.label}</div>
                      <div className="mt-2 text-lg font-semibold text-foreground">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="relative min-h-[32rem] overflow-hidden bg-surface-container">
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
            <StoryCard item={sideFeature} onOpen={openMovie} className="min-h-[15rem]" />
            {sideFeatureTwo ? <StoryCard item={sideFeatureTwo} onOpen={openMovie} className="min-h-[15rem]" /> : null}
          </aside>
        </section>

        {/* Genre & Region Filters */}
        <section className="editorial-panel rounded-[1.9rem] p-6 sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_1fr] xl:items-start">
            <div>
              <div className="section-label">Refine the front page</div>
              <h2 className="section-heading mt-3">Browse by genre and origin</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Switch the editorial mix by mood and country.
              </p>
            </div>
            <div className="space-y-5">
              <div>
                <div className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  <span>Genres</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {genreFilters.map((genre) => (
                    <button key={genre.id} onClick={() => setActiveGenre(genre.id)} className={`candy-chip ${activeGenre === genre.id ? 'active' : ''}`}>
                      {genre.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  <span>Origins</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {regionFilters.map((region) => (
                    <button key={region.id} onClick={() => setActiveRegion(region.id)} className={`candy-chip ${activeRegion === region.id ? 'active' : ''}`}>
                      <Globe className="h-3.5 w-3.5" />
                      {region.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Current Movies Rail */}
        <section>
          <div className="section-title mb-6">
            <div>
              <div className="section-label">Now on the shelf</div>
              <h2 className="section-heading mt-2">Current movies and series with momentum</h2>
            </div>
            <button onClick={() => navigate('/trending')} className="btn-quiet">
              Open trending
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {railItems.map((item, index) => (
              <PosterCard
                key={getMediaId(item)}
                item={item}
                badge={index === 0 ? 'Top pick' : index === 1 ? 'Fresh' : undefined}
                onOpen={openMovie}
              />
            ))}
          </div>
        </section>

        {/* For You Section */}
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.28fr)_minmax(22rem,0.72fr)]">
          <StoryCard item={spotlight} onOpen={openMovie} className="min-h-[24rem]" />
          <div className="editorial-panel flex h-full flex-col justify-between rounded-[1.9rem] p-6 sm:p-8">
            <div>
              <div className="section-label">For you</div>
              <h2 className="section-heading mt-3">A personal lane based on your curation</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                The recommendation page reads your reviews, ratings, watchlist, and likes to build shelves around your real habits.
              </p>
            </div>
            <div className="mt-8 space-y-4">
              <div className="rounded-[1.35rem] border border-border bg-muted/40 p-4 text-sm leading-7 text-muted-foreground">
                {user
                  ? surprisePick
                    ? `Latest surprise detour: ${getDisplayTitle(surprisePick)}`
                    : 'Your personal lane is ready to use from the new navigation.'
                  : 'Sign in to make the For You page learn from your reviews and curation habits.'}
              </div>
              <button onClick={() => navigate('/for-you')} className="btn-primary w-full justify-between px-5 py-3.5">
                Open For You
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* New Releases */}
        <section>
          <div className="section-title mb-6">
            <div>
              <div className="section-label">New releases</div>
              <h2 className="section-heading mt-2">Latest additions with a cleaner full-width layout</h2>
            </div>
            <button onClick={() => navigate('/browse')} className="btn-quiet">
              Browse all
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {releaseItems.map((item, index) => (
              <StoryCard
                key={getMediaId(item)}
                item={item}
                onOpen={openMovie}
                className={index === 0 ? 'min-h-[24rem] lg:col-span-2' : 'min-h-[24rem]'}
              />
            ))}
          </div>
        </section>

        {/* More to Explore */}
        {curatedMovies.length > 8 && (
          <section>
            <div className="section-title mb-6">
              <div>
                <div className="section-label">More to explore</div>
                <h2 className="section-heading mt-2">Keep discovering great picks from our editors</h2>
              </div>
              <button onClick={() => navigate('/browse')} className="btn-quiet">
                See more
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {curatedMovies.slice(8, 16).map((item) => (
                <PosterCard key={getMediaId(item)} item={item} onOpen={openMovie} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
