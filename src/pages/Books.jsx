import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Compass, Library, Search, Sparkles, Star } from 'lucide-react';
import { googleBooksApi } from '../services/googleBooks';
import ContentFilter from '../components/ContentFilter';

const sideLinks = [
  { id: 'trending', label: 'Home', icon: BookOpen },
  { id: 'bestsellers', label: 'Bestsellers', icon: Star },
  { id: 'new', label: 'New Releases', icon: Sparkles },
  { id: 'arabic', label: 'Arabic Shelf', icon: Library },
  { id: 'sci-fi', label: 'Science Fiction', icon: Compass },
];

function BookTile({ book, onOpen, compact = false }) {
  if (!book) return null;

  return (
    <button onClick={() => onOpen(book)} className="group text-left">
      <div className="movie-card overflow-hidden">
        <div className={compact ? 'aspect-[0.75]' : 'aspect-[0.72] overflow-hidden'}>
          <img
            src={book.thumbnail}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="p-4">
          <h3 className="display-font text-sm font-bold text-foreground transition-colors group-hover:text-primary md:text-base">
            {book.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{book.author}</p>
        </div>
      </div>
    </button>
  );
}

export default function Books() {
  const [collections, setCollections] = useState({
    trending: [],
    bestsellers: [],
    newReleases: [],
    arabic: [],
    sciFi: [],
    adaptations: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeShelf, setActiveShelf] = useState('trending');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const loadBooks = async () => {
      setLoading(true);
      try {
        const [trendingResult, bestsellersResult, newReleasesResult, arabicResult, sciFiResult] =
          await Promise.allSettled([
            googleBooksApi.getTrendingBooks(),
            googleBooksApi.getBestSellers(),
            googleBooksApi.getNewReleases(),
            googleBooksApi.getArabicBooks(),
            googleBooksApi.getBooksByCategory('Science Fiction'),
          ]);

        if (cancelled) return;

        // Also load individual adaptation books
        const adaptationPromises = await Promise.allSettled([
          googleBooksApi.searchBooks('Dune').then((r) => r.books[0]),
          googleBooksApi.searchBooks('The Great Gatsby').then((r) => r.books[0]),
          googleBooksApi.searchBooks('Into the Wild').then((r) => r.books[0]),
          googleBooksApi.searchBooks('The Martian').then((r) => r.books[0]),
        ]);

        const trending = trendingResult.status === 'fulfilled' ? trendingResult.value : [];
        const bestsellers = bestsellersResult.status === 'fulfilled' ? bestsellersResult.value : [];
        const newReleases = newReleasesResult.status === 'fulfilled' ? newReleasesResult.value : [];
        const arabic = arabicResult.status === 'fulfilled' ? arabicResult.value.books : [];
        const sciFi = sciFiResult.status === 'fulfilled' ? sciFiResult.value.books : [];
        const adaptations = adaptationPromises.filter(r => r.status === 'fulfilled').map(r => r.value);

        setCollections({
          trending,
          bestsellers,
          newReleases,
          arabic,
          sciFi,
          adaptations,
        });
      } catch (error) {
        console.error('Error loading books page:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadBooks();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeCollection = useMemo(() => {
    if (searchResults?.length) return searchResults;

    switch (activeShelf) {
      case 'bestsellers':
        return collections.bestsellers;
      case 'new':
        return collections.newReleases;
      case 'arabic':
        return collections.arabic;
      case 'sci-fi':
        return collections.sciFi;
      default:
        return collections.trending;
    }
  }, [activeShelf, collections, searchResults]);

  const heroBook = activeCollection[0] || collections.bestsellers[0] || collections.trending[0];
  const newFeature = collections.newReleases[0] || heroBook;

  const openBook = (book) => {
    if (!book?.id) return;
    navigate(`/book/${book.id}`);
  };

  const runSearch = async (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    try {
      const result = await googleBooksApi.searchBooks(trimmed, 20);
      setSearchResults(result.books);
    } catch (error) {
      console.error('Error searching books:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <ContentFilter
      movie={heroBook || { Title: 'Books', Plot: '', Rated: 'PG' }}
      fallback={
        <div className="page-shell pt-32">
          <div className="glass-immersive rounded-[2rem] p-8 text-center">
            <h2 className="display-font text-2xl font-bold text-foreground">This library is restricted</h2>
            <p className="mt-3 text-sm text-muted-foreground">The current parental profile blocks this book collection.</p>
          </div>
        </div>
      }
    >
      <div className="pb-20 pt-28">
        <div className="page-shell-wide grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="glass-immersive sticky top-28 rounded-[1.75rem] p-4">
              <div className="mb-6 px-2">
                <div className="section-label">Editorial Collection</div>
                <h2 className="display-font mt-2 text-2xl font-bold text-foreground">The Cinema</h2>
              </div>

              <div className="space-y-1">
                {sideLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => {
                      setActiveShelf(link.id);
                      setSearchResults(null);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                      activeShelf === link.id && !searchResults
                        ? 'bg-primary/12 text-white'
                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                    }`}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </button>
                ))}
              </div>

              <div className="mt-8 rounded-[1.5rem] bg-white/4 p-4">
                <p className="text-xs leading-6 text-muted-foreground">
                  Build a cleaner reading-first shelf for books that turn into films, series, and major adaptations.
                </p>
                <button className="btn-primary mt-4 w-full justify-center text-sm">My Library</button>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <section className="movie-card relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_right_top,rgba(255,255,255,0.08),transparent_28%),linear-gradient(90deg,rgba(8,9,12,0.94)_0%,rgba(8,9,12,0.82)_56%,rgba(8,9,12,0.2)_100%)]" />
              {heroBook ? (
                <img
                  src={heroBook.thumbnail}
                  alt={heroBook.title}
                  className="absolute inset-y-0 right-0 hidden h-full w-[38%] object-cover opacity-60 md:block"
                />
              ) : null}

              <div className="relative z-10 flex min-h-[24rem] flex-col justify-center px-6 py-8 md:px-10">
                <div className="section-label">Featured Adaptation</div>
                <h1 className="display-font mt-3 max-w-3xl text-4xl font-extrabold leading-[0.92] text-white md:text-6xl">
                  {heroBook?.title || 'Dune: The Prophet'}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 md:text-base">
                  {heroBook?.description || 'Discover cinematic novels, editorial shelves, and adaptation-led reading lists built around how stories move between page and screen.'}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={() => openBook(heroBook)} className="btn-primary">
                    <BookOpen className="h-4 w-4" />
                    Start Reading
                  </button>
                  <button onClick={() => navigate('/browse')} className="btn-secondary">
                    View Adaptations
                  </button>
                </div>
              </div>
            </section>

            <section className="mt-8">
              <form onSubmit={runSearch} className="glass-immersive flex flex-col gap-3 rounded-[1.5rem] p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="section-label">Search the stacks</div>
                  <h2 className="display-font mt-2 text-2xl font-bold text-foreground">Find a title, author, or subject</h2>
                </div>
                <div className="flex w-full max-w-xl items-center gap-3 rounded-full bg-white/4 px-4 py-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      if (!event.target.value.trim()) setSearchResults(null);
                    }}
                    placeholder="Search literary works..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    type="search"
                  />
                  <button className="btn-primary px-4 py-2 text-sm" type="submit">
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </form>
            </section>

            <section className="mt-10">
              <div className="section-title mb-5">
                <div>
                  <div className="section-label">{searchResults ? 'Search Results' : 'Bestsellers'}</div>
                  <h2 className="display-font mt-2 text-3xl font-bold">
                    {searchResults ? `Results for "${query}"` : 'Most-read books across the library'}
                  </h2>
                </div>
                {searchResults ? (
                  <button onClick={() => setSearchResults(null)} className="text-sm font-semibold text-primary">
                    Clear Search
                  </button>
                ) : null}
              </div>

              {loading ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <LoadingBookSkeleton key={index} />
                  ))}
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                  {(searchResults || collections.bestsellers).slice(0, 15).map((book) => (
                    <BookTile key={book.id} book={book} onOpen={openBook} />
                  ))}
                </div>
              )}
            </section>

            {!searchResults ? (
              <>
                <section className="mt-14">
                  <div className="section-title mb-5">
                    <div>
                      <div className="section-label">New Releases</div>
                      <h2 className="display-font mt-2 text-3xl font-bold">Fresh arrivals from the publisher shelves</h2>
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                    <button
                      onClick={() => openBook(newFeature)}
                      className="movie-card group relative min-h-[23rem] overflow-hidden text-left"
                    >
                      <img
                        src={newFeature?.thumbnail || 'https://via.placeholder.com/1000x700?text=Archive'}
                        alt={newFeature?.title || 'Feature book'}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,12,0.94)_0%,rgba(8,9,12,0.72)_48%,rgba(8,9,12,0.08)_100%)]" />
                      <div className="relative z-10 flex h-full flex-col justify-end p-7">
                        <div className="section-label">Archive Story</div>
                        <h3 className="display-font mt-3 max-w-md text-3xl font-bold text-white">
                          {newFeature?.title || 'The Archive of Shadows'}
                        </h3>
                        <p className="mt-3 max-w-md text-sm leading-7 text-white/72">
                          {newFeature?.description || 'A shelf built around dramatic fiction, prestige adaptations, and books that deserve front-row placement.'}
                        </p>
                        <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white">
                          Open Feature
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </button>

                    <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-2">
                      {collections.newReleases.slice(1, 5).map((book) => (
                        <BookTile key={book.id} book={book} onOpen={openBook} compact />
                      ))}
                    </div>
                  </div>
                </section>

                <section className="mt-14">
                  <div className="section-title mb-5">
                    <div>
                      <div className="section-label">Books Turned Into Movies</div>
                      <h2 className="display-font mt-2 text-3xl font-bold">Stories that moved from page to screen</h2>
                    </div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-4">
                    {collections.adaptations.map((book) => (
                      <BookTile key={book.id} book={book} onOpen={openBook} />
                    ))}
                  </div>
                </section>
              </>
            ) : null}
          </main>
        </div>
      </div>
    </ContentFilter>
  );
}

function LoadingBookSkeleton() {
  return (
    <div className="movie-card overflow-hidden">
      <div className="shimmer aspect-[0.72] w-full" />
      <div className="space-y-2 p-4">
        <div className="shimmer h-5 rounded-full" />
        <div className="shimmer h-4 w-2/3 rounded-full" />
      </div>
    </div>
  );
}
