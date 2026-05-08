import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Calendar,
  Heart,
  Languages,
  MessageSquare,
  Play,
  Plus,
  Sparkles,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import { getMovieDetails } from '../services/imdbService';
import { getAISummary } from '../services/aiService';
import { tmdbApi } from '../services/tmdb';
import { reviewService } from '../services/reviewService';
import ContentFilter from '../components/ContentFilter';
import ParentalGate from '../components/ParentalGate';
import { useWatchlist } from '../context/WatchlistContext';
import { useLikedMovies } from '../context/LikedMoviesContext';
import { useAuth } from '../context/AuthContext';
import { usePlaybackSettings } from '../hooks/useSettings';
import {
  getBackdropUrl,
  getDisplayCopy,
  getDisplayTitle,
  getGenreList,
  getMediaId,
  getPosterUrl,
  getRatingValue,
  normalizeMediaItem,
} from '../utils/media';

function SimilarCard({ item, onOpen, onWatch }) {
  return (
    <article className="movie-card overflow-hidden rounded-[1.4rem]">
      <button onClick={() => onOpen(item)} className="group block w-full text-left">
        <div className="aspect-[0.74] overflow-hidden">
          <img
            src={getPosterUrl(item)}
            alt={getDisplayTitle(item)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </button>
      <div className="space-y-3 p-4">
        <button onClick={() => onOpen(item)} className="display-font text-left text-lg font-bold text-foreground hover:text-primary">
          {getDisplayTitle(item)}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => onWatch(item)} className="btn-primary flex-1 justify-center px-4 py-2 text-sm">
            Watch
          </button>
          <button onClick={() => onOpen(item)} className="btn-secondary px-4 py-2 text-sm">
            Open
          </button>
        </div>
      </div>
    </article>
  );
}

export default function MovieDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const typeParam = location.state?.type;
  const { user, isAuthenticated } = useAuth();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { likedMovies, addToLikedMovies, removeFromLikedMovies } = useLikedMovies();
  const playbackSettings = usePlaybackSettings();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trailer, setTrailer] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [cast, setCast] = useState([]);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [reviewRating, setReviewRating] = useState(7);

  const isInWatchlist = watchlist.some((item) => item.imdbID === id);
  const isLiked = likedMovies.some((item) => item.imdbID === id);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    let cancelled = false;

    const loadMovie = async () => {
      setLoading(true);

      try {
        const details = await getMovieDetails(id, typeParam);
        if (cancelled) return;
        setMovie(details);

        const isTV = details.Type === 'tv';

        const [videos, credits, recommendations] = await Promise.allSettled([
          isTV ? tmdbApi.getTVShowVideos(id) : tmdbApi.getMovieVideos(id),
          isTV ? tmdbApi.getTVCredits(id) : tmdbApi.getMovieCredits(id),
          isTV ? tmdbApi.getTVRecommendations(id) : tmdbApi.getMovieRecommendations(id),
        ]);

        if (cancelled) return;

        if (videos.status === 'fulfilled') {
          const trailerVideo =
            videos.value.results?.find((video) => video.type === 'Trailer' && video.site === 'YouTube') ||
            videos.value.results?.find((video) => video.type === 'Teaser' && video.site === 'YouTube');
          setTrailer(trailerVideo || null);
        }

        if (credits.status === 'fulfilled') {
          setCast((credits.value.cast || []).slice(0, 10));
        }

        if (recommendations.status === 'fulfilled') {
          setSimilarMovies((recommendations.value.results || []).slice(0, 8).map(normalizeMediaItem));
        }
      } catch (error) {
        console.error('Error loading movie details:', error);
        if (!cancelled) setMovie(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMovie();

    return () => {
      cancelled = true;
    };
  }, [id, typeParam]);

  useEffect(() => {
    let cancelled = false;

    const loadReviews = async () => {
      if (!movie?.imdbID) return;
      
      try {
        const movieType = movie?.Type === 'tv' ? 'tv' : 'movie';
        const [allReviews, existingReview] = await Promise.allSettled([
          reviewService.getMovieReviews(id, movieType, 1, 20).catch(() => ({ reviews: [] })),
          isAuthenticated ? reviewService.getUserReviewForMovie(id, movieType).catch(() => null) : Promise.resolve(null),
        ]);

        if (cancelled) return;
        
        const reviewsData = allReviews.status === 'fulfilled' ? allReviews.value : { reviews: [] };
        const userReviewData = existingReview.status === 'fulfilled' ? existingReview.value : null;
        
        setReviews(reviewsData.reviews || []);
        setUserReview(userReviewData);

        if (userReviewData) {
          setReviewTitle(userReviewData.title || '');
          setReviewContent(userReviewData.content || '');
          setReviewRating(userReviewData.rating || 7);
        }
      } catch (error) {
        console.error('Error loading reviews:', error);
        if (!cancelled) {
          setReviews([]);
          setUserReview(null);
        }
      }
    };

    if (movie) {
      loadReviews();
    }

    return () => {
      cancelled = true;
    };
  }, [movie, id, isAuthenticated]);

  const averageRating = useMemo(() => {
    if (!reviews.length) return null;
    return (reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length).toFixed(1);
  }, [reviews]);

  const openMovie = (item) => {
    const itemId = getMediaId(item);
    if (!itemId) return;
    navigate(`/movie/${itemId}`, { state: { type: item.Type || item.type || 'movie' } });
  };

  const watchMovie = (item) => {
    const itemId = getMediaId(item);
    if (!itemId) return;
    navigate(`/watch/${itemId}`, { state: { type: item.Type || item.type || 'movie' } });
  };

  const handleAISummary = async () => {
    if (!movie) return;
    setLoadingAI(true);
    try {
      const summary = await getAISummary(movie);
      setAiSummary(summary);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setAiSummary('AI summary could not be generated right now.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewTitle.trim() || !reviewContent.trim()) return;

    setSubmittingReview(true);
    try {
      const movieType = movie?.Type === 'tv' ? 'tv' : 'movie';
      if (userReview) {
        await reviewService.updateReview(userReview.id, {
          title: reviewTitle,
          content: reviewContent,
          rating: reviewRating,
        });
      } else {
        await reviewService.createReview(id, movieType, reviewTitle, reviewRating, reviewContent);
      }

      const updatedReviews = await reviewService.getMovieReviews(id, movieType, 1, 20);
      const updatedUserReview = await reviewService.getUserReviewForMovie(id, movieType);
      setReviews(updatedReviews.reviews || []);
      setUserReview(updatedUserReview);
      setShowReviewForm(false);
    } catch (error) {
      console.error('Error saving review:', error);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="pb-20 pt-28">
        <div className="page-shell-wide space-y-6">
          <div className="shimmer h-[32rem] rounded-[2rem]" />
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="shimmer h-80 rounded-[1.5rem]" />
            <div className="shimmer h-80 rounded-[1.5rem]" />
            <div className="shimmer h-80 rounded-[1.5rem]" />
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="pb-20 pt-28">
        <div className="page-shell-wide">
          <div className="editorial-panel rounded-[2rem] p-10 text-center">
            <h1 className="display-font text-4xl font-bold text-foreground">Title not found</h1>
            <p className="mt-4 text-muted-foreground">This movie or series could not be loaded.</p>
          </div>
        </div>
      </div>
    );
  }

  const rating = getRatingValue(movie);

  return (
    <ContentFilter movie={movie} fallback={<ParentalGate />}>
      <div className="pb-20 pt-24">
        {showTrailer && trailer ? (
          <div className="fixed inset-0 z-[60] bg-black/82 p-4 backdrop-blur-md">
            <div className="page-shell-wide flex h-full items-center justify-center">
              <div className="relative aspect-video w-full max-w-6xl overflow-hidden rounded-[1.8rem] border border-white/10 bg-black">
                <button
                  onClick={() => setShowTrailer(false)}
                  className="absolute right-4 top-4 z-10 rounded-full bg-black/70 p-2 text-white"
                >
                  <X className="h-5 w-5" />
                </button>
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
                  title="Trailer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        ) : null}

        <section className="relative overflow-hidden border-b border-border">
          <img
            src={getBackdropUrl(movie)}
            alt={getDisplayTitle(movie)}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,11,13,0.35)_0%,rgba(9,11,13,0.75)_58%,rgba(9,11,13,0.96)_100%)] dark:bg-[linear-gradient(180deg,rgba(9,11,13,0.4)_0%,rgba(9,11,13,0.8)_58%,rgba(9,11,13,1)_100%)]" />

          <div className="page-shell-wide relative z-10 py-16 md:py-20">
            <div className="grid gap-8 xl:grid-cols-[20rem_minmax(0,1fr)_22rem] xl:items-end">
              <div className="editorial-panel overflow-hidden rounded-[1.8rem]">
                <img
                  src={getPosterUrl(movie)}
                  alt={getDisplayTitle(movie)}
                  className="aspect-[0.72] w-full object-cover"
                />
              </div>

              <div className="text-white">
                <div className="section-label text-white/75">{movie.Type === 'tv' ? 'Series detail' : 'Movie detail'}</div>
                <h1 className="display-font mt-3 max-w-4xl text-5xl font-bold leading-[0.92] md:text-6xl xl:text-7xl">
                  {getDisplayTitle(movie)}
                </h1>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  {getGenreList(movie).map((genre) => (
                    <span key={genre} className="rounded-full border border-white/12 bg-black/26 px-3 py-1.5 text-sm font-semibold text-white/86">
                      {genre}
                    </span>
                  ))}
                </div>

                <p className="mt-6 max-w-3xl text-base leading-8 text-white/76">
                  {getDisplayCopy(movie)}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button onClick={() => watchMovie(movie)} className="btn-primary px-6 py-3.5">
                    <Play className="h-4 w-4 fill-white" />
                    {movie.Type === 'tv' ? 'Watch series' : 'Watch movie'}
                  </button>
                  {trailer ? (
                    <button onClick={() => setShowTrailer(true)} className="btn-secondary border-white/20 bg-black/30 px-6 py-3.5 text-white">
                      Trailer
                    </button>
                  ) : null}
                  <button
                    onClick={() => (isInWatchlist ? removeFromWatchlist(id) : addToWatchlist(movie))}
                    className={`${isInWatchlist ? 'btn-soul' : 'btn-secondary border-white/20 bg-black/30 text-white'} px-6 py-3.5`}
                  >
                    <Plus className="h-4 w-4" />
                    {isInWatchlist ? 'Saved for later' : 'Watch later'}
                  </button>
                  <button
                    onClick={() => (isLiked ? removeFromLikedMovies(id) : addToLikedMovies(movie))}
                    className={`${isLiked ? 'btn-primary' : 'btn-secondary border-white/20 bg-black/30 text-white'} px-6 py-3.5`}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? 'fill-white' : ''}`} />
                    {isLiked ? 'Liked' : 'Like'}
                  </button>
                </div>
              </div>

              <div className="editorial-panel rounded-[1.8rem] p-6 text-foreground">
                <div className="space-y-4">
                  <div className="stat-tile">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Rating</div>
                    <div className="mt-2 flex items-center gap-2 text-3xl font-bold text-foreground">
                      <Star className="h-6 w-6 fill-current text-secondary" />
                      {rating ? rating.toFixed(1) : movie.imdbRating || 'N/A'}
                    </div>
                  </div>

                  <div className="stat-tile">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Year</div>
                    <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-foreground">
                      <Calendar className="h-4 w-4 text-primary" />
                      {movie.Year || 'N/A'}
                    </div>
                  </div>

                  <div className="stat-tile">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Language</div>
                    <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-foreground">
                      <Languages className="h-4 w-4 text-primary" />
                      {movie.Language || 'N/A'}
                    </div>
                  </div>

                  <button onClick={handleAISummary} className="btn-secondary w-full justify-center py-3">
                    <Sparkles className={`h-4 w-4 ${loadingAI ? 'animate-spin' : ''}`} />
                    {loadingAI ? 'Generating AI summary' : 'Generate AI summary'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="page-shell-wide space-y-12 pt-12">
          <section className="grid gap-5 lg:grid-cols-4">
            {[
              { label: 'Director', value: movie.Director || 'N/A' },
              { label: 'Writer', value: movie.Writer || 'N/A' },
              { label: 'Country', value: movie.Country || 'N/A' },
              { label: 'Runtime', value: movie.Runtime || 'N/A' },
            ].map((item) => (
              <div key={item.label} className="stat-tile">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">{item.label}</div>
                <div className="mt-3 text-lg font-semibold text-foreground">{item.value}</div>
              </div>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.85fr)]">
            <div className="editorial-panel rounded-[1.8rem] p-6 sm:p-8">
              <div className="section-label">AI summary</div>
              <h2 className="section-heading mt-2">A faster read on the title</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {aiSummary || 'Generate a summary to get a compact take on the film, themes, and what makes it worth watching.'}
              </p>
            </div>

            <div className="editorial-panel rounded-[1.8rem] p-6 sm:p-8">
              <div className="section-label">Cast</div>
              <h2 className="section-heading mt-2">Lead people in the title</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {cast.length > 0 ? cast.slice(0, 6).map((person) => (
                  <div key={person.id} className="rounded-[1.2rem] border border-border bg-card p-4">
                    <div className="display-font text-lg font-bold text-foreground">{person.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{person.character}</div>
                  </div>
                )) : (
                  <p className="text-sm leading-7 text-muted-foreground">
                    {movie.Actors || 'Cast information is not available.'}
                  </p>
                )}
              </div>
            </div>
          </section>

          {similarMovies.length > 0 ? (
            <section>
              <div className="section-title mb-6">
                <div>
                  <div className="section-label">Similar titles</div>
                  <h2 className="section-heading mt-2">Keep exploring in the same lane</h2>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {similarMovies.slice(0, 4).map((item) => (
                  <SimilarCard key={getMediaId(item)} item={item} onOpen={openMovie} onWatch={watchMovie} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="editorial-panel rounded-[1.8rem] p-6 sm:p-8">
            <div className="section-title mb-6">
              <div>
                <div className="section-label">Reviews</div>
                <h2 className="section-heading mt-2">What people thought</h2>
              </div>
              <div className="rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground">
                {averageRating ? `${averageRating}/10 average` : `${reviews.length} reviews`}
              </div>
            </div>

            {isAuthenticated ? (
              <div className="mb-6">
                <button onClick={() => setShowReviewForm((state) => !state)} className="btn-secondary">
                  <MessageSquare className="h-4 w-4" />
                  {userReview ? 'Edit your review' : 'Write a review'}
                </button>
              </div>
            ) : null}

            {showReviewForm ? (
              <div className="mb-8 rounded-[1.4rem] border border-border bg-card p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-foreground">Title</label>
                    <input
                      value={reviewTitle}
                      onChange={(event) => setReviewTitle(event.target.value)}
                      className="text-input"
                      placeholder="Give your review a title"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-foreground">Rating</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={reviewRating}
                      onChange={(event) => setReviewRating(parseInt(event.target.value, 10))}
                      className="w-full accent-primary"
                    />
                    <div className="mt-2 text-sm font-semibold text-muted-foreground">{reviewRating}/10</div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-foreground">Review</label>
                    <textarea
                      value={reviewContent}
                      onChange={(event) => setReviewContent(event.target.value)}
                      className="text-input min-h-32 resize-none"
                      placeholder="Share what worked and what did not."
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button onClick={handleSubmitReview} disabled={submittingReview} className="btn-primary px-6 py-3">
                    {submittingReview ? 'Saving...' : 'Save review'}
                  </button>
                  <button onClick={() => setShowReviewForm(false)} className="btn-secondary px-6 py-3">
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {reviews.length === 0 ? (
              <div className="rounded-[1.3rem] border border-border bg-muted/40 p-8 text-center">
                <UserRound className="mx-auto h-12 w-12 text-primary" />
                <p className="mt-4 text-sm leading-7 text-muted-foreground">No reviews yet. Be the first to add one.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-[1.3rem] border border-border bg-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {(review.profiles?.username || review.user_name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{review.profiles?.username || review.user_name || 'Anonymous'}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-full bg-muted px-3 py-1 text-sm font-semibold text-foreground">
                        {review.rating}/10
                      </div>
                    </div>

                    {review.title ? (
                      <h3 className="display-font mt-4 text-xl font-bold text-foreground">{review.title}</h3>
                    ) : null}
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{review.content}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </ContentFilter>
  );
}
