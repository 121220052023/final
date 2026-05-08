import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, Clapperboard, History, Play, Sparkles, Tv2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const formatTime = (totalSeconds) => {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const extractBaseId = (value) => value?.toString()?.replace(/-S\d+E\d+$/, '');

export default function WatchHistory() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user || !session) return;

    let cancelled = false;

    const loadHistory = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/watch_history?select=*&user_id=eq.${encodeURIComponent(user.id)}&order=watched_at.desc&limit=100`;
        const response = await fetch(url, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok || cancelled) return;
        const data = await response.json();
        if (!cancelled) setHistory(data);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [user, session]);

  const clearAllHistory = async () => {
    if (!user || !session) return;
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/watch_history?user_id=eq.${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      setHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const filteredHistory = useMemo(() => {
    if (filter === 'all') return history;
    return history.filter((item) => item.movie_type === filter);
  }, [history, filter]);

  const stats = useMemo(() => ({
    totalWatched: history.length,
    totalSeconds: history.reduce((sum, item) => sum + (item.last_position || 0), 0),
    movies: history.filter((item) => item.movie_type === 'movie').length,
    series: history.filter((item) => item.movie_type === 'tv').length,
  }), [history]);

  if (loading) {
    return (
      <div className="pb-20 pt-28">
        <div className="page-shell-wide space-y-6">
          <div className="shimmer h-64 rounded-[2rem]" />
          <div className="shimmer h-24 rounded-[1.5rem]" />
          <div className="shimmer h-24 rounded-[1.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 pt-28">
      <div className="page-shell-wide space-y-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(23rem,0.72fr)]">
          <div className="editorial-panel rounded-[2rem] p-6 sm:p-8 lg:p-10">
            <div className="section-label">History</div>
            <h1 className="display-font mt-3 text-5xl font-bold leading-[0.92] md:text-6xl">
              Your viewing history, rebuilt as a usable library.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground">
              Use this page to resume unfinished titles, inspect what you actually spent time on, and feed the For You page with better personal signals.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="stat-tile">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Watched items</div>
                <div className="mt-2 text-3xl font-bold text-foreground">{stats.totalWatched}</div>
              </div>
              <div className="stat-tile">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Total time</div>
                <div className="mt-2 text-3xl font-bold text-foreground">{formatTime(stats.totalSeconds)}</div>
              </div>
              <div className="stat-tile">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Movies</div>
                <div className="mt-2 text-3xl font-bold text-foreground">{stats.movies}</div>
              </div>
              <div className="stat-tile">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Series</div>
                <div className="mt-2 text-3xl font-bold text-foreground">{stats.series}</div>
              </div>
            </div>
          </div>

          <div className="editorial-panel rounded-[2rem] p-6 sm:p-8">
            <div className="section-label">Filters</div>
            <div className="mt-5 grid gap-3">
              {[
                { id: 'all', label: 'All activity', icon: History },
                { id: 'movie', label: 'Movies only', icon: Clapperboard },
                { id: 'tv', label: 'Series only', icon: Tv2 },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  className={`flex items-center gap-3 rounded-[1.15rem] border px-4 py-3 text-left transition-colors ${
                    filter === item.id
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-card text-foreground'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm font-semibold">{item.label}</span>
                </button>
              ))}
            </div>

            {history.length > 0 ? (
              <button onClick={clearAllHistory} className="btn-secondary mt-5 w-full justify-center py-3 text-red-400">
                Clear all history
              </button>
            ) : null}

            <button onClick={() => navigate('/for-you')} className="btn-primary mt-3 w-full justify-center py-3">
              <Sparkles className="h-4 w-4" />
              Open For You
            </button>
          </div>
        </section>

        {filteredHistory.length === 0 ? (
          <section className="editorial-panel rounded-[2rem] p-10 text-center">
            <Clock3 className="mx-auto h-16 w-16 text-primary" />
            <h2 className="display-font mt-6 text-3xl font-bold text-foreground">No watch history yet</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-muted-foreground">
              Start watching movies or series and they will appear here with progress, dates, and a resume path.
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            {filteredHistory.map((item) => (
              <article key={item.id} className="list-row flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <img
                  src={item.poster_url || 'https://via.placeholder.com/180x260?text=Poster'}
                  alt={item.title}
                  className="h-32 w-24 rounded-[1.15rem] object-cover"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <button
                        onClick={() => navigate(`/movie/${extractBaseId(item.movie_id)}`, { state: { type: item.movie_type } })}
                        className="display-font truncate text-left text-2xl font-bold text-foreground hover:text-primary"
                      >
                        {item.title}
                      </button>
                      <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span>{item.movie_type === 'tv' ? 'Series' : 'Movie'}</span>
                        <span>•</span>
                        <span>{Math.round(item.progress || 0)}% watched</span>
                        <span>•</span>
                        <span>{formatDate(item.watched_at)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/watch/${extractBaseId(item.movie_id)}`, { state: { type: item.movie_type } })}
                      className="btn-primary px-5 py-2.5 text-sm"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      Resume
                    </button>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      <span>Progress</span>
                      <span>{formatTime(item.last_position || 0)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(item.progress || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
