import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Shuffle, Film, User, Globe } from 'lucide-react';
import MovieCard from '../components/MovieCard';
import SearchBar from '../components/SearchBar';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Pagination from '../components/ui/pagination';
import HeroSlider from '../components/HeroSlider';
import { searchMovies, getTrendingMovies, getMoviesByGenre, getUpcomingMovies, GENRE_MAP } from '../services/imdbService';
import { getAISummary, getSurpriseMovie } from '../services/aiService';

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [searchType, setSearchType] = useState('movie'); // 'movie', 'actor', 'country'
  const [aiSummaryModal, setAiSummaryModal] = useState(null);
  const [surpriseModal, setSurpriseModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const [surpriseLoading, setSurpriseLoading] = useState(false);

  const genres = [
    { id: 'all', name: 'All Movies', icon: '🎬' },
    { id: 'action', name: 'Action', icon: '💥' },
    { id: 'comedy', name: 'Comedy', icon: '😂' },
    { id: 'drama', name: 'Drama', icon: '🎭' },
    { id: 'thriller', name: 'Thriller', icon: '😱' },
    { id: 'sci-fi', name: 'Sci-Fi', icon: '🚀' },
    { id: 'horror', name: 'Horror', icon: '👻' },
    { id: 'romance', name: 'Romance', icon: '💕' },
    { id: 'adventure', name: 'Adventure', icon: '🗺️' },
  ];

  const countries = [
    { id: 'all', name: 'All Countries', flag: '🌍' },
    { id: 'USA', name: 'United States', flag: '🇺🇸' },
    { id: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
    { id: 'France', name: 'France', flag: '🇫🇷' },
    { id: 'Japan', name: 'Japan', flag: '🇯🇵' },
    { id: 'South Korea', name: 'South Korea', flag: '🇰🇷' },
    { id: 'India', name: 'India', flag: '🇮🇳' },
    { id: 'Germany', name: 'Germany', flag: '🇩🇪' },
    { id: 'Spain', name: 'Spain', flag: '🇪🇸' },
  ];

  const searchTypes = [
    { id: 'movie', name: 'Movies', icon: Film },
    { id: 'actor', name: 'Actors', icon: User },
    { id: 'country', name: 'By Country', icon: Globe },
  ];

  const loadMovies = async (page = 1) => {
    setLoading(true);
    try {
      let data;
      if (selectedGenre === 'all') {
        data = await getUpcomingMovies(page);
      } else {
        const genreId = GENRE_MAP[selectedGenre];
        data = await getMoviesByGenre(genreId, page);
      }
      setMovies(data.movies);
      setTotalPages(data.totalPages);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies(currentPage);
  }, [currentPage, selectedGenre]);

  const handleSearch = async (query, page = 1, type = searchType) => {
    setLoading(true);
    try {
      const { movies, totalPages } = await searchMovies(query, page, type);
      setMovies(movies);
      setTotalPages(totalPages);
      setCurrentPage(page);
      setCurrentSearchQuery(query);
    } catch (error) {
      console.error('Error searching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAISummary = async (movie) => {
    try {
      const summary = await getAISummary(movie);
      setAiSummaryModal({ movie, summary });
    } catch (error) {
      console.error('Error getting AI summary:', error);
      setAiSummaryModal({ movie, summary: 'Failed to generate AI summary. Please try again.' });
    }
  };

  const handleSurpriseMe = async () => {
    setSurpriseLoading(true);
    try {
      const surprise = await getSurpriseMovie(movies);
      setSurpriseModal(surprise);
    } catch (error) {
      console.error('Error getting surprise movie:', error);
    } finally {
      setSurpriseLoading(false);
    }
  };

  const handleGenreChange = (genre) => {
    setSelectedGenre(genre);
    setCurrentPage(1);
  };

  const handleCountryChange = (country) => {
    setSelectedCountry(country);
    setCurrentPage(1);
    if (country !== 'all') {
      handleSearch(country, 1, 'country');
    } else {
      loadMovies(1);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (currentSearchQuery) {
      handleSearch(currentSearchQuery, page);
    } else {
      loadMovies(page);
    }
  };

  const filteredMovies = movies;

  return (
    <div className="min-h-screen">
      {/* Hero Slider */}
      <HeroSlider />

      {/* Search Bar with Type Selector */}
      <section className="container mx-auto px-4 py-8">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {/* Search Type Tabs */}
          <div className="flex items-center justify-center gap-3">
            {searchTypes.map((type) => (
              <motion.button
                key={type.id}
                onClick={() => setSearchType(type.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all duration-300 ${searchType === type.id
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-xl'
                    : 'bg-card/50 backdrop-blur-sm border-2 border-white/10 text-foreground hover:border-purple-500/50'
                  }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <type.icon className="w-5 h-5" />
                {type.name}
              </motion.button>
            ))}
          </div>

          <SearchBar onSearch={handleSearch} searchType={searchType} />
        </div>
      </section>

      {/* Genre Filters - Modern Card Design */}
      <section className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Genre Section */}
          <div>
            <h2 className="text-2xl font-bold gradient-header bg-clip-text text-transparent mb-6 flex items-center gap-2">
              <Film className="w-6 h-6 text-purple-500" />
              Browse by Genre
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-3">
              {genres.map((genre) => (
                <motion.button
                  key={genre.id}
                  onClick={() => handleGenreChange(genre.id)}
                  className={`relative overflow-hidden p-4 rounded-2xl font-bold transition-all duration-300 ${selectedGenre === genre.id
                      ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-xl scale-105'
                      : 'bg-card/50 backdrop-blur-sm border-2 border-white/10 text-foreground hover:border-purple-500/50'
                    }`}
                  whileHover={{ y: -5, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: genre.id === 'all' ? 0 : genres.findIndex(g => g.id === genre.id) * 0.05 }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">{genre.icon}</span>
                    <span className="text-xs font-bold">{genre.name}</span>
                  </div>
                  {selectedGenre === genre.id && (
                    <motion.div
                      layoutId="genre-indicator"
                      className="absolute inset-0 border-4 border-white/30 rounded-2xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Country Filter */}
          <div>
            <h2 className="text-2xl font-bold gradient-header bg-clip-text text-transparent mb-6 flex items-center gap-2">
              <Globe className="w-6 h-6 text-blue-500" />
              Browse by Country
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-3">
              {countries.map((country) => (
                <motion.button
                  key={country.id}
                  onClick={() => handleCountryChange(country.id)}
                  className={`relative overflow-hidden p-4 rounded-2xl font-bold transition-all duration-300 ${selectedCountry === country.id
                      ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-xl scale-105'
                      : 'bg-card/50 backdrop-blur-sm border-2 border-white/10 text-foreground hover:border-blue-500/50'
                    }`}
                  whileHover={{ y: -5, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: countries.findIndex(c => c.id === country.id) * 0.05 }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">{country.flag}</span>
                    <span className="text-xs font-bold text-center">{country.name}</span>
                  </div>
                  {selectedCountry === country.id && (
                    <motion.div
                      layoutId="country-indicator"
                      className="absolute inset-0 border-4 border-white/30 rounded-2xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center pt-4">
            <motion.button
              onClick={handleSurpriseMe}
              className="btn-primary flex items-center gap-3 px-10 py-4 text-xl rounded-full shadow-xl"
              disabled={surpriseLoading}
              whileHover={{ scale: 1.08, boxShadow: "0 10px 40px rgba(147, 51, 234, 0.4)" }}
              whileTap={{ scale: 0.95 }}
            >
              <Shuffle className="w-6 h-6" />
              {surpriseLoading ? 'Surprising...' : 'Surprise Me!'}
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Movies Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          Array(8).fill(0).map((_, index) => <LoadingSkeleton key={index} />)
        ) : (
          filteredMovies.map((movie) => (
            <MovieCard
              key={movie.imdbID}
              movie={movie}
              onAISummary={handleAISummary}
            />
          ))
        )}
      </div>

      {!loading && filteredMovies.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-xl">No movies found. Try a different search.</p>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}


      {/* AI Summary Modal */}
      {aiSummaryModal && (
        <motion.div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setAiSummaryModal(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gradient-to-br from-card to-card/90 rounded-2xl p-8 max-w-3xl w-full max-h-[85vh] overflow-y-auto border-2 border-purple-500/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-8 h-8 text-purple-500" />
              </motion.div>
              <h2 className="text-3xl font-bold gradient-header bg-clip-text text-transparent">AI Summary</h2>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-6 border-b-2 border-purple-500/30 pb-4">
              {aiSummaryModal.movie.Title}
            </h3>
            <p className="text-muted-foreground leading-relaxed text-lg mb-6">
              {aiSummaryModal.summary}
            </p>
            <motion.button
              onClick={() => setAiSummaryModal(null)}
              className="btn-primary w-full py-4 text-lg rounded-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Close
            </motion.button>
          </motion.div>
        </motion.div>
      )}

      {/* Surprise Me Modal */}
      {surpriseModal && (
        <motion.div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setSurpriseModal(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gradient-to-br from-card to-card/90 rounded-2xl p-8 max-w-3xl w-full border-2 border-blue-500/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Shuffle className="w-8 h-8 text-blue-500" />
              </motion.div>
              <h2 className="text-3xl font-bold gradient-header bg-clip-text text-transparent">Surprise Pick!</h2>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-6 border-b-2 border-blue-500/30 pb-4">
              {surpriseModal.movie.Title}
            </h3>
            <p className="text-muted-foreground leading-relaxed text-lg mb-6">
              {surpriseModal.reason}
            </p>
            <motion.button
              onClick={() => setSurpriseModal(null)}
              className="btn-primary w-full py-4 text-lg rounded-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Close
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Home;

