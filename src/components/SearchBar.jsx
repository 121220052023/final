import { useState } from 'react';
import { Search, Sparkles, User, Film, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

const SearchBar = ({ onSearch, searchType = 'movie' }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query, 1, searchType);
    }
  };

  const getPlaceholder = () => {
    switch (searchType) {
      case 'actor':
        return 'Search for actors like Tom Hanks, Scarlett Johansson...';
      case 'country':
        return 'Search movies by country like USA, Japan, France...';
      default:
        return 'Search for your favorite movies, series...';
    }
  };

  const getIcon = () => {
    switch (searchType) {
      case 'actor':
        return User;
      case 'country':
        return Globe;
      default:
        return Film;
    }
  };

  const Icon = getIcon();

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto mb-12">
      <motion.div 
        className="relative group"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Glow Effect */}
        <div className={`absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-3xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-500 ${isFocused ? 'opacity-40' : ''}`} />
        
        {/* Search Input Container */}
        <div className="relative">
          <motion.div
            className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2"
            animate={{ rotate: isFocused ? 360 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <Icon className={`w-6 h-6 transition-colors ${isFocused ? 'text-purple-500' : 'text-muted-foreground'}`} />
          </motion.div>
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={getPlaceholder()}
            className="w-full pl-16 pr-32 py-6 bg-card/50 backdrop-blur-xl text-foreground border-2 border-white/10 rounded-3xl focus:outline-none focus:border-purple-500/50 transition-all duration-300 text-lg font-medium placeholder:text-muted-foreground/60 shadow-xl"
          />
          
          <motion.button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-8 py-3 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white rounded-2xl font-bold transition-all duration-300 hover:shadow-xl hover:shadow-purple-600/50 flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="w-5 h-5" />
            Search
          </motion.button>
        </div>
        
        {/* Decorative Elements */}
        {isFocused && (
          <motion.div
            className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-full"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.div>
    </form>
  );
};

export default SearchBar;

