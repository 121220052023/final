import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Eye,
  Heart,
  Languages,
  MessageSquare,
  Plus,
  Sparkles,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { getMovieDetails } from '../services/imdbService';
import { getAISummary } from '../services/aiService';
import { tmdbApi } from '../services/tmdb';
import { reviewService } from '../services/reviewService';
import { watchTimeService } from '../services/watchTimeService';
import ContentFilter from '../components/ContentFilter';
import { useWatchlist } from '../context/WatchlistContext';
import { useLikedMovies } from '../context/LikedMoviesContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
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

function SimilarCard({ item, onOpen }) {
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
        <button
          onClick={() => onOpen(item)}
          className="btn-primary w-full justify-center px-4 py-2 text-sm"
        >
          Details
        </button>
      </div>
    </article>
  );
}

export default function MovieDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const rawType = location.state?.type;
  const typeParam = rawType === 'series' ? 'tv' : rawType;
  const { user, isAuthenticated } = useAuth();
  const { isProOrAbove, plan } = useSubscription();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { likedMovies, addToLikedMovies, removeFromLikedMovies } = useLikedMovies();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trailer, setTrailer] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [cast, setCast] = useState([]);
  const [showAISummary, setShowAISummary] = useState(false);
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
  const [likedReviewIds, setLikedReviewIds] = useState(new Set());
  const [watchProviders, setWatchProviders] = useState(null);
  const [watched, setWatched] = useState(false);
  const [dailyUsedSeconds, setDailyUsedSeconds] = useState(0);
  const [showPlayer, setShowPlayer] = useState(false);

  const isInWatchlist = watchlist.some((item) => item.imdbID === id);
  const isLiked = likedMovies.some((item) => item.imdbID === id);
  const isFreeUser = plan === 'free';
  const limitReached = watchTimeService.isLimitReached(plan, dailyUsedSeconds);
  const remainingMin = watchTimeService.getRemainingMinutes(plan, dailyUsedSeconds);
  const showLimitIndicator = plan !== 'ultimate' && dailyUsedSeconds > 0;
  const tmdbId = parseInt(id);

  useEffect(() => {
    if (!user || !id) return;
    supabase.from('watch_history').select('id').eq('user_id', user.id).eq('movie_id', id).maybeSingle().then(({ data }) => {
      if (data) setWatched(true);
    });
  }, [user, id]);

  useEffect(() => {
    if (!user || plan === 'ultimate') return;
    watchTimeService.getDailyUsage(user.id).then(setDailyUsedSeconds);
  }, [user, plan]);

  useEffect(() => {
    if (!user || plan === 'ultimate') return;
    if (!showPlayer) return;
    const interval = setInterval(() => {
      watchTimeService.addWatchTime(user.id, 5);
      setDailyUsedSeconds(prev => prev + 5);
    }, 5000);
    return () => clearInterval(interval);
  }, [user, showPlayer, plan]);

  const handleMarkAsWatched = async () => {
    if (!user) {
      toast.error('Please sign in to track what you watch');
      return;
    }
    if (!watched && limitReached) {
      toast.error(`Daily watch limit reached. You have ${remainingMin} minutes left.`);
      return;
    }
    try {
      if (watched) {
        await supabase.from('watch_history').delete().eq('user_id', user.id).eq('movie_id', id);
        setWatched(false);
        toast.success('Removed from watch history');
      } else {
        await supabase.from('watch_history').insert({
          user_id: user.id,
          movie_id: id,
          movie_title: movie?.title || '',
          movie_type: typeParam || 'movie',
          poster_url: movie?.poster || null,
          progress: 0,
          completed: true,
          watched_at: new Date().toISOString(),
        });
        setWatched(true);
        toast.success('Marked as watched');
      }
    } catch {
      toast.error('Failed to update watch history');
    }
  };

  const handleWatchNow = () => {
    if (!user) {
      toast.error('Please sign in to watch');
      return;
    }
    if (limitReached) {
      toast.error(`Daily watch limit reached. ${plan === 'free' ? 'Upgrade to Pro for 4h or Ultimate for unlimited.' : 'Upgrade to Ultimate for unlimited.'}`);
      return;
    }
    setShowPlayer(true);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    let cancelled = false;

    const loadMovie = async () => {
      setLoading(true);

      try {
        const tmdbId = parseInt(id)
        const localTable = typeParam === 'tv' || typeParam === 'series' ? 'series' : 'movies'
        const { data: localMovie } = await supabase.from(localTable).select('*').eq('tmdb_id', tmdbId).maybeSingle()
        let details
        if (localMovie) {
          details = {
            id: localMovie.tmdb_id.toString(),
            imdbID: localMovie.tmdb_id.toString(),
            tmdbID: localMovie.tmdb_id.toString(),
            title: localMovie.title,
            year: localMovie.release_year || '',
            rated: 'N/A',
            released: localMovie.release_year || 'N/A',
            runtime: localMovie.runtime ? `${localMovie.runtime} min` : 'N/A',
            genre: Array.isArray(localMovie.genres) ? localMovie.genres.join(', ') : 'N/A',
            director: localMovie.director || 'N/A',
            writer: 'N/A',
            actors: Array.isArray(localMovie.cast_list) ? localMovie.cast_list.slice(0, 5).join(', ') : 'N/A',
            overview: localMovie.description || 'No description available',
            language: localMovie.language?.toUpperCase() || null,
            country: null,
            awards: 'N/A',
            poster_url: localMovie.poster_url || null,
            ratings: [{ Source: 'Admin', Value: localMovie.rating ? `${localMovie.rating}/10` : 'N/A' }],
            metascore: 'N/A',
            imdbRating: localMovie.rating || '0.0',
            imdbVotes: '0',
            type: 'movie',
            dvd: 'N/A',
            boxOffice: 'N/A',
            production: 'N/A',
            website: 'N/A',
            response: 'True',
            backdrop: null,
            spoken_languages: [],
            Title: localMovie.title,
            Year: localMovie.release_year || 'N/A',
            Rated: 'N/A',
            Released: localMovie.release_year || 'N/A',
            Runtime: localMovie.runtime ? `${localMovie.runtime} min` : 'N/A',
            Genre: Array.isArray(localMovie.genres) ? localMovie.genres.join(', ') : 'N/A',
            Director: localMovie.director || 'N/A',
            Writer: 'N/A',
            Actors: Array.isArray(localMovie.cast_list) ? localMovie.cast_list.slice(0, 5).join(', ') : 'N/A',
            Plot: localMovie.description || 'No description available',
            Language: localMovie.language?.toUpperCase() || null,
            Country: null,
            Awards: 'N/A',
            Poster: localMovie.poster_url || null,
            Ratings: [{ Source: 'Admin', Value: localMovie.rating ? `${localMovie.rating}/10` : 'N/A' }],
            Metascore: 'N/A',
            Type: 'movie',
            DVD: 'N/A',
            BoxOffice: 'N/A',
            Production: 'N/A',
            Website: 'N/A',
            Response: 'True',
            isLocalOverride: true,
          }
        } else {
          details = await getMovieDetails(id, typeParam);
          const { data: localOverride } = await supabase
            .from(localTable)
            .select('*')
            .eq('tmdb_id', tmdbId)
            .maybeSingle();
          if (localOverride) {
            if (localOverride.title) details.Title = localOverride.title;
            if (localOverride.release_year) {
              details.year = localOverride.release_year;
              details.Year = localOverride.release_year;
              details.released = localOverride.release_year;
              details.Released = localOverride.release_year;
            }
            if (localOverride.description) {
              details.overview = localOverride.description;
              details.Plot = localOverride.description;
            }
            if (localOverride.poster_url) {
              details.poster_url = localOverride.poster_url;
              details.Poster = localOverride.poster_url;
            }
            if (localOverride.rating) {
              details.imdbRating = localOverride.rating;
              details.ratings = [{ Source: 'Admin', Value: `${localOverride.rating}/10` }];
              details.Ratings = [{ Source: 'Admin', Value: `${localOverride.rating}/10` }];
            }
            if (localOverride.genres) {
              const genreStr = Array.isArray(localOverride.genres) ? localOverride.genres.join(', ') : localOverride.genres;
              details.genre = genreStr;
              details.Genre = genreStr;
            }
            if (localOverride.director) {
              details.director = localOverride.director;
              details.Director = localOverride.director;
            }
            if (localOverride.cast_list) {
              const castStr = Array.isArray(localOverride.cast_list) ? localOverride.cast_list.join(', ') : localOverride.cast_list;
              details.actors = castStr;
              details.Actors = castStr;
            }
            if (localOverride.runtime) {
              details.runtime = `${localOverride.runtime} min`;
              details.Runtime = `${localOverride.runtime} min`;
            }
            if (localOverride.language) {
              details.language = localOverride.language.toUpperCase();
              details.Language = localOverride.language.toUpperCase();
            }
            details.isLocalOverride = true;
          }
        }
        if (cancelled) return;
        setMovie(details);

        const isTV = details.Type === 'tv';

        const [videos, credits, recommendations, providers] = await Promise.allSettled([
          isTV ? tmdbApi.getTVShowVideos(id) : tmdbApi.getMovieVideos(id),
          isTV ? tmdbApi.getTVCredits(id) : tmdbApi.getMovieCredits(id),
          isTV ? tmdbApi.getTVRecommendations(id) : tmdbApi.getMovieRecommendations(id),
          tmdbApi.getWatchProviders(id, isTV ? 'tv' : 'movie'),
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

        if (providers.status === 'fulfilled') {
          setWatchProviders(providers.value.results || null);
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

        if (isAuthenticated) {
          const reviewIds = (reviewsData.reviews || []).map(r => r.id);
          if (reviewIds.length > 0) {
            const { data: likes } = await supabase
              .from('review_likes')
              .select('review_id')
              .in('review_id', reviewIds)
              .eq('user_id', user.id);
            if (!cancelled && likes) {
              setLikedReviewIds(new Set(likes.map(l => l.review_id)));
            }
          }
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
  }, [movie, id, isAuthenticated, user?.id]);

  

  const averageRating = useMemo(() => {
    if (!reviews.length) return null;
    return (reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length).toFixed(1);
  }, [reviews]);

  const openMovie = (item) => {
    const itemId = getMediaId(item);
    if (!itemId) return;
    navigate(`/movie/${itemId}`, { state: { type: item.Type || item.type || 'movie' } });
  };

  const handleAISummary = async () => {
    if (!movie) return;
    if (!isAuthenticated) {
      toast.error('Please sign in to use AI features');
      navigate('/login');
      return;
    }
    if (!isProOrAbove) {
      toast.error('AI summaries are available on Pro and above');
      navigate('/pricing');
      return;
    }
    setLoadingAI(true);
    try {
      const summary = await getAISummary(movie);
      console.log('AI Summary received:', summary);
      setAiSummary(summary);
      setShowAISummary(true);
      toast.success('AI summary generated');
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setAiSummary('AI summary could not be generated right now.');
      toast.error('Failed to generate AI summary');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewTitle.trim() || !reviewContent.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!isAuthenticated) {
      toast.error('Please sign in to write a review');
      navigate('/login');
      return;
    }

    setSubmittingReview(true);
    try {
      const movieType = movie?.Type === 'tv' ? 'tv' : 'movie';
      if (userReview) {
        await reviewService.updateReview(userReview.id, {
          title: reviewTitle,
          content: reviewContent,
          rating: reviewRating,
        });
        toast.success('Review updated');
      } else {
        await reviewService.createReview(id, movieType, reviewTitle, reviewRating, reviewContent);
        toast.success('Review posted');
      }

      const updatedReviews = await reviewService.getMovieReviews(id, movieType, 1, 20);
      const updatedUserReview = await reviewService.getUserReviewForMovie(id, movieType);
      setReviews(updatedReviews.reviews || []);
      setUserReview(updatedUserReview);
      setShowReviewForm(false);
    } catch (error) {
      console.error('Error saving review:', error);
      toast.error('Failed to save review: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleLikeReview = async (reviewId) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to like reviews');
      navigate('/login');
      return;
    }
    const alreadyLiked = likedReviewIds.has(reviewId);
    try {
      if (alreadyLiked) {
        await reviewService.unlikeReview(reviewId);
        setLikedReviewIds(prev => { const next = new Set(prev); next.delete(reviewId); return next; });
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, likes: Math.max((r.likes || 0) - 1, 0) } : r));
      } else {
        await reviewService.likeReview(reviewId);
        setLikedReviewIds(prev => new Set(prev).add(reviewId));
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, likes: (r.likes || 0) + 1 } : r));
      }
    } catch (error) {
      console.error('Error toggling review like:', error);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await reviewService.deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setUserReview(null);
      toast.success('Review deleted');
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  const handleToggleWatchlist = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to manage your watchlist');
      navigate('/login');
      return;
    }
    if (isInWatchlist) {
      removeFromWatchlist(id);
      toast.success('Removed from watchlist');
    } else {
      addToWatchlist(movie);
      toast.success('Added to watchlist');
    }
  };

  const handleToggleLike = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to like movies');
      navigate('/login');
      return;
    }
    if (isLiked) {
      removeFromLikedMovies(id);
      toast.success('Removed from liked');
    } else {
      addToLikedMovies(movie);
      toast.success('Added to liked');
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
    <ContentFilter movie={movie}>
      <div className="pb-20 pt-24">
        {showPlayer && (
          <div className="fixed inset-0 z-[60] bg-black p-0">
            <div className="relative h-full w-full">
              <button
                onClick={() => setShowPlayer(false)}
                className="absolute right-4 top-4 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <iframe
                className="h-full w-full"
                src={`https://vidsrc.to/embed/${typeParam === 'tv' || movie?.Type === 'series' ? 'tv' : 'movie'}/${tmdbId}`}
                title="Video player"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        )}
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
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,11,13,0.35)_0%,rgba(9,11,13,0.75)_58%,rgba(9,11,13,0.96)_100%)] dark:bg-[linear-gradient(180deg,rgba(9,11,13,0.4)_0%,rgba(9,11,13,0.8)_58%,rgba(9,11,13,1)_100%)]" />

          <div className="page-shell-wide relative z-10 py-16 md:py-20">
            <div className="grid gap-8 xl:grid-cols-[20rem_minmax(0,1fr)_22rem] xl:items-end">
              <div className="editorial-panel overflow-hidden rounded-[1.8rem]">
                <img
                  src={getPosterUrl(movie)}
                  alt={getDisplayTitle(movie)}
                  className="aspect-[0.72] w-full object-cover"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/300x450?text=No+Poster'; }}
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
                  {trailer ? (
                    <button onClick={() => setShowTrailer(true)} className="btn-secondary border-white/20 bg-black/30 px-4 sm:px-6 py-3 text-white">
                      Trailer
                    </button>
                  ) : null}
                  <button
                    onClick={handleWatchNow}
                    disabled={limitReached}
                    className={`${limitReached ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'} flex-1 justify-center px-4 sm:px-6 py-3 text-sm sm:text-base`}
                  >
                    {limitReached ? 'Limit reached' : 'Watch Now'}
                  </button>
                  <button
                    onClick={handleToggleWatchlist}
                    className={`${isInWatchlist ? 'btn-soul' : 'btn-secondary border-white/20 bg-black/30 text-white'} px-3 sm:px-5 py-3 text-sm`}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{isInWatchlist ? 'Saved for later' : 'Watch later'}</span>
                    <span className="sm:hidden">{isInWatchlist ? 'Saved' : 'Later'}</span>
                  </button>
                  <button
                    onClick={handleToggleLike}
                    className={`${isLiked ? 'btn-primary' : 'btn-secondary border-white/20 bg-black/30 text-white'} px-3 sm:px-5 py-3 text-sm`}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? 'fill-white' : ''}`} />
                    <span className="hidden sm:inline">{isLiked ? 'Liked' : 'Like'}</span>
                  </button>
                  <button
                    onClick={handleMarkAsWatched}
                    disabled={!watched && limitReached}
                    title={watched ? 'Remove from watch history' : 'Mark as watched'}
                    className={`${watched ? 'btn-accent' : 'btn-secondary border-white/20 bg-black/30 text-white'} px-3 py-3`}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>

                {showLimitIndicator && (
                  <div className={`mt-3 flex items-center gap-2 text-xs font-semibold ${limitReached ? 'text-red-400' : 'text-amber-400'}`}>
                    <Clock className="h-3.5 w-3.5" />
                    {limitReached
                      ? 'Daily watch limit reached. Upgrade to Pro for 4h or Ultimate for unlimited.'
                      : `${remainingMin}m of daily watch time remaining (${plan === 'free' ? '1h' : '4h'} limit)`}
                  </div>
                )}
              </div>

              <div className="editorial-panel rounded-[1.8rem] p-6 text-foreground">
                <div className="space-y-4">
                  <div className="stat-tile">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Rating</div>
                    <div className="mt-2 flex items-center gap-2 text-3xl font-bold text-foreground">
                      <Star className="h-6 w-6 fill-current text-yellow-400" />
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
              <p className="mt-4 text-sm leading-7 text-foreground">
                {aiSummary || 'Generate a summary to get a compact take on the film, themes, and what makes it worth watching.'}
              </p>
              {aiSummary && (
                <button onClick={() => setShowAISummary(true)} className="btn-primary mt-4">
                  View Summary
                </button>
              )}
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
                  <SimilarCard
                    key={getMediaId(item)}
                    item={item}
                    onOpen={openMovie}
                  />
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

            {isAuthenticated && !userReview && !showReviewForm && (
              <div className="mb-6">
                <button onClick={() => { setReviewTitle(''); setReviewContent(''); setReviewRating(7); setShowReviewForm(true); }} className="btn-secondary">
                  <MessageSquare className="h-4 w-4" />
                  Write a review
                </button>
              </div>
            )}

            {showReviewForm && (
              <div className="mb-8 rounded-[1.4rem] border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground">{userReview ? 'Edit your review' : 'Write a review'}</h3>
                  <button onClick={() => setShowReviewForm(false)} className="btn-ghost text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-foreground">Title</label>
                    <input value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} className="text-input" placeholder="Give your review a title" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-foreground">Rating</label>
                    <input type="range" min="1" max="10" value={reviewRating} onChange={(e) => setReviewRating(parseInt(e.target.value, 10))} className="w-full accent-primary" />
                    <div className="mt-2 text-sm font-semibold text-muted-foreground">{reviewRating}/10</div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-foreground">Review</label>
                    <textarea value={reviewContent} onChange={(e) => setReviewContent(e.target.value)} className="text-input min-h-32 resize-none" placeholder="Share what worked and what did not." />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button onClick={handleSubmitReview} disabled={submittingReview} className="btn-primary px-6 py-3">
                    {submittingReview ? 'Saving...' : userReview ? 'Update review' : 'Post review'}
                  </button>
                  <button onClick={() => setShowReviewForm(false)} className="btn-secondary px-6 py-3">Cancel</button>
                </div>
              </div>
            )}

            {reviews.length === 0 ? (
              <div className="rounded-[1.3rem] border border-border bg-muted/40 p-8 text-center">
                <UserRound className="mx-auto h-12 w-12 text-primary" />
                <p className="mt-4 text-sm leading-7 text-muted-foreground">No reviews yet. Be the first to add one.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => {
                  const isOwn = user && review.user_id === user.id;
                  return (
                    <article key={review.id} className={`rounded-[1.3rem] border p-5 ${isOwn ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            {(review.profiles?.full_name || review.profiles?.username || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">
                              {review.profiles?.full_name || review.profiles?.username || 'Anonymous'}
                            </div>
                            <div className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="rounded-full bg-muted px-3 py-1 text-sm font-semibold text-foreground">{review.rating}/10</div>
                          {isOwn && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">You</span>
                          )}
                        </div>
                      </div>

                      {review.title && <h3 className="display-font mt-3 text-lg font-bold text-foreground">{review.title}</h3>}
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{review.content}</p>

                        <div className="mt-4 flex items-center gap-3">
                        <button
                          onClick={() => handleLikeReview(review.id)}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                            likedReviewIds.has(review.id) ? 'bg-red-500/10 text-red-400' : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Heart className={`h-3.5 w-3.5 ${likedReviewIds.has(review.id) ? 'fill-red-400' : ''}`} />
                          {review.likes || 0}
                        </button>
                        {isOwn && !showReviewForm && (
                          <>
                            <button
                              onClick={() => { setReviewTitle(review.title || ''); setReviewContent(review.content || ''); setReviewRating(review.rating || 7); setShowReviewForm(true); }}
                              className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteReview(review.id)}
                              className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {showAISummary && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAISummary(false)}>
            <div className="editorial-panel max-w-2xl w-full rounded-[1.8rem] p-8 relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowAISummary(false)}
                className="absolute top-4 right-4 rounded-full p-2 hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
              <div className="section-label">AI summary</div>
              <h2 className="section-heading mt-2">{getDisplayTitle(movie)}</h2>
              <p className="mt-5 text-base leading-8 text-foreground">
                {aiSummary}
              </p>
              <div className="mt-8 flex gap-3">
                <button
                  onClick={handleToggleLike}
                  className={`btn-secondary flex-1 justify-center py-3 ${isLiked ? 'bg-red-500/10 text-red-500 border-red-500/20' : ''}`}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500' : ''}`} />
                  {isLiked ? 'Liked' : 'Like this title'}
                </button>
                <button onClick={() => setShowAISummary(false)} className="btn-primary flex-1 justify-center py-3">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ContentFilter>
  );
}
