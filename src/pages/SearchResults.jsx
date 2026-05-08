import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Clapperboard, Film, Play, Search, Tv } from 'lucide-react';
import { tmdbApi } from '../services/tmdb';
import { googleBooksApi } from '../services/googleBooks';

const filters = [
  { id: 'all', label: 'All Results', icon: Search },
  { id: 'movie', label: 'Movies', icon: Clapperboard },
  { id: 'tv', label: 'TV Shows', icon: Tv },
  { id: 'book', label: 'Books', icon: BookOpen },
];

function toMediaResult(item) {
  const kind = item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie';

  return {
    id: item.id.toString(),
    type: kind,
    title: item.title || item.name || 'Untitled',
    image: item.poster_path
      ? `https://image.tmdb.org/t/p/w780${item.poster_path}`
      : 'https://via.placeholder.com/700x1050?text=No+Image',
    summary: item.overview || 'No description available.',
    badge: kind === 'tv' ? 'TV SHOW' : 'MOVIE',
    meta: [item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0], item.vote_average ? `${item.vote_average.toFixed(1)} rating` : null]
      .filter(Boolean)
      .join(' • '),
    action: kind === 'tv' ? 'Watch Series' : 'Watch Movie',
  };
}

function toBookResult(book) {
  return {
    id: book.id,
    type: 'book',
    title: book.title,
    image: book.thumbnail || 'https://via.placeholder.com/700x1050?text=No+Cover',
    summary: book.description || 'No description available.',
    badge: 'BOOK',
    meta: [book.author, book.year].filter(Boolean).join(' • '),
    action: 'Read Details',
  };
}

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    const currentQuery = searchParams.get('q') || '';
    setQuery(currentQuery);
    if (!currentQuery.trim()) {
      setResults([]);
      return;
    }

    let cancelled = false;

    const runSearch = async () => {
      setLoading(true);
      try {
        const [media, books] = await Promise.all([
          tmdbApi.searchMovies(currentQuery, 1),
          googleBooksApi.searchBooks(currentQuery, 8),
        ]);

        if (cancelled) return;

        const mediaResults = (media.results || [])
          .filter((item) => item.media_type !== 'person')
          .slice(0, 10)
          .map(toMediaResult);
        const bookResults = (books.books || []).slice(0, 8).map(toBookResult);

        setResults([...mediaResults, ...bookResults]);
      } catch (error) {
        console.error('Error searching:', error);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const counts = useMemo(() => ({
    all: results.length,
    movie: results.filter((item) => item.type === 'movie').length,
    tv: results.filter((item) => item.type === 'tv').length,
    book: results.filter((item) => item.type === 'book').length,
  }), [results]);

  const filteredResults = useMemo(
    () => (activeFilter === 'all' ? results : results.filter((item) => item.type === activeFilter)),
    [activeFilter, results],
  );

  const featured = filteredResults[0];
  const supporting = filteredResults.slice(1);

  const submit = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    setSearchParams(trimmed ? { q: trimmed } : {});
  };

  const openResult = (item) => {
    if (!item) return;
    if (item.type === 'book') {
      navigate(`/book/${item.id}`);
      return;
    }
    navigate(`/movie/${item.id}`, { state: { type: item.type } });
  };

  const watchResult = (item) => {
    if (!item) return;
    if (item.type === 'book') {
      navigate(`/book/${item.id}`);
      return;
    }
    navigate(`/watch/${item.id}`, { state: { type: item.type } });
  };

  return (
    <div className="pb-20 pt-28">
      <div className="page-shell">
        <div className="mb-10">
          <div className="section-label">Search Results</div>
          <h1 className="display-font mt-3 text-4xl font-extrabold leading-tight text-foreground md:text-6xl">
            {query ? (
              <>
                Showing results for <span className="italic text-primary">{`"${query}"`}</span>
              </>
            ) : (
              'Search the catalog'
            )}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            {query ? `${counts.all} matches across movies, series, and books.` : 'Find titles, adaptations, and story worlds across the whole app.'}
          </p>
        </div>

        <form onSubmit={submit} className="glass-immersive mb-8 flex flex-col gap-4 rounded-[1.5rem] p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-full bg-white/4 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles, books, authors, or story worlds..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              type="search"
            />
          </div>
          <button className="btn-primary px-5 py-3 text-sm" type="submit">
            Search
          </button>
        </form>

        <div className="mb-10 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`candy-chip ${activeFilter === filter.id ? 'active' : ''}`}
            >
              <filter.icon className="h-3.5 w-3.5" />
              {filter.label} ({counts[filter.id] ?? 0})
            </button>
          ))}
        </div>

        {!query ? (
          <div className="glass-immersive rounded-[2rem] p-12 text-center">
            <Search className="mx-auto h-14 w-14 text-muted-foreground" />
            <h2 className="display-font mt-6 text-3xl font-bold text-foreground">Start with a title or idea</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Search for a film, series, author, or book title and the app will blend results into one editorial-style layout.
            </p>
          </div>
        ) : loading ? (
          <div className="grid gap-5 md:grid-cols-6">
            <div className="shimmer h-[32rem] rounded-[1.75rem] md:col-span-4" />
            <div className="shimmer h-[15.5rem] rounded-[1.75rem] md:col-span-2" />
            <div className="shimmer h-[15.5rem] rounded-[1.75rem] md:col-span-2" />
            <div className="shimmer h-[18rem] rounded-[1.75rem] md:col-span-2" />
            <div className="shimmer h-[18rem] rounded-[1.75rem] md:col-span-2" />
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="glass-immersive rounded-[2rem] p-12 text-center">
            <Film className="mx-auto h-14 w-14 text-muted-foreground" />
            <h2 className="display-font mt-6 text-3xl font-bold text-foreground">No results found</h2>
            <p className="mt-3 text-sm text-muted-foreground">Try a broader keyword or switch back to All Results.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-[4.5rem_minmax(0,1fr)]">
            <aside className="hidden md:block">
              <div className="glass-immersive sticky top-28 rounded-[1.5rem] p-3">
                <div className="space-y-2">
                  {filters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
                      className={`flex w-full items-center justify-center rounded-2xl p-3 transition-colors ${
                        activeFilter === filter.id
                          ? 'bg-primary/15 text-white'
                          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                      }`}
                      title={filter.label}
                    >
                      <filter.icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div className="grid gap-5 md:grid-cols-6">
              <button
                onClick={() => openResult(featured)}
                className="movie-card group relative overflow-hidden text-left md:col-span-4 md:row-span-2"
              >
                <img
                  src={featured.image}
                  alt={featured.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,9,12,0.12)_0%,rgba(8,9,12,0.34)_45%,rgba(8,9,12,0.92)_100%)]" />
                <div className="relative z-10 flex min-h-[32rem] flex-col justify-end p-7">
                  <div className="mb-3 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.28em]">
                    <span className="rounded-full bg-primary/15 px-3 py-1.5 text-primary">{featured.badge}</span>
                    <span className="text-muted-foreground">{featured.meta}</span>
                  </div>
                  <h2 className="display-font max-w-2xl text-4xl font-extrabold text-white md:text-5xl">
                    {featured.title}
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72">
                    {featured.summary}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        watchResult(featured);
                      }}
                      className="btn-primary"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      {featured.action}
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        openResult(featured);
                      }}
                      className="btn-secondary"
                    >
                      Open Details
                    </button>
                  </div>
                </div>
              </button>

              {supporting.slice(0, 2).map((item) => (
                <button
                  key={item.id}
                  onClick={() => openResult(item)}
                  className="movie-card group overflow-hidden text-left md:col-span-2"
                >
                  <div className="aspect-[0.9] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <div className="section-label">{item.badge}</div>
                    <h3 className="display-font mt-2 text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
                  </div>
                </button>
              ))}

              {supporting.slice(2).map((item) => (
                <button
                  key={item.id}
                  onClick={() => openResult(item)}
                  className="movie-card group overflow-hidden text-left md:col-span-2"
                >
                  <div className="aspect-[0.82] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <div className="section-label">{item.badge}</div>
                    <h3 className="display-font mt-2 text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
