import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Search, Star, Film, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Actors = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActor, setSelectedActor] = useState(null);
  const navigate = useNavigate();

  // Popular actors data (you can replace this with real API data)
  const popularActors = [
    { id: 1, name: 'Tom Hanks', image: 'https://image.tmdb.org/t/p/w500/eKF1sGJRrZJbfBG1KirPt1cfNd3.jpg', movies: 95, rating: 8.9 },
    { id: 2, name: 'Scarlett Johansson', image: 'https://image.tmdb.org/t/p/w500/6NsMbJXRlDZuDzatN2akFdGuTvx.jpg', movies: 68, rating: 8.7 },
    { id: 3, name: 'Leonardo DiCaprio', image: 'https://image.tmdb.org/t/p/w500/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg', movies: 52, rating: 9.1 },
    { id: 4, name: 'Meryl Streep', image: 'https://image.tmdb.org/t/p/w500/emAAzyK1rJ6aiMi0wsWYp51EC3h.jpg', movies: 89, rating: 9.0 },
    { id: 5, name: 'Denzel Washington', image: 'https://image.tmdb.org/t/p/w500/jj2Gcobpopokal0YstuCQW0ldJ4.jpg', movies: 71, rating: 8.8 },
    { id: 6, name: 'Emma Stone', image: 'https://image.tmdb.org/t/p/w500/wqEypkRUUZEcFmPV4O4JpZznmNk.jpg', movies: 45, rating: 8.6 },
    { id: 7, name: 'Robert Downey Jr.', image: 'https://image.tmdb.org/t/p/w500/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg', movies: 78, rating: 8.9 },
    { id: 8, name: 'Jennifer Lawrence', image: 'https://image.tmdb.org/t/p/w500/k6l8BWX1yqfGt95enzEkHoPvON4.jpg', movies: 42, rating: 8.5 },
  ];

  const filteredActors = popularActors.filter(actor =>
    actor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-7xl font-black gradient-header bg-clip-text text-transparent mb-4">
            Discover Actors
          </h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Explore your favorite actors and their filmography
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto mb-16"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
            <div className="relative flex items-center">
              <Search className="absolute left-5 w-6 h-6 text-purple-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for actors..."
                className="w-full pl-16 pr-6 py-6 bg-card/50 backdrop-blur-xl text-foreground rounded-3xl focus:outline-none -500/50 transition-all duration-300 text-lg font-medium placeholder:text-muted-foreground/60 glass-immersive"
              />
            </div>
          </div>
        </motion.div>

        {/* Actors Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-6">
          {filteredActors.map((actor, index) => (
            <motion.div
              key={actor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group cursor-pointer"
              whileHover={{ y: -10 }}
            >
              <div className="relative overflow-hidden rounded-3xl bg-card/50 backdrop-blur-sm -500/50 transition-all duration-300 glass-immersive -500/20">
                {/* Actor Image */}
                <div className="relative aspect-[2/3] overflow-hidden">
                  <img
                    src={actor.image}
                    alt={actor.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Hover Info */}
                  <div className="absolute inset-0 flex items-end p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="space-y-2 w-full">
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-2">
                          <Film className="w-4 h-4" />
                          <span className="text-sm font-bold">{actor.movies} Movies</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-bold">{actor.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actor Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-purple-500 transition-colors">
                    {actor.name}
                  </h3>
                  <div className="flex items-center justify-between text-muted-foreground text-sm">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-500" />
                      <span>Top Rated</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-bold">{actor.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* No Results */}
        {filteredActors.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <User className="w-24 h-24 text-muted-foreground mx-auto mb-6 opacity-50" />
            <h3 className="text-2xl font-bold text-foreground mb-2">No actors found</h3>
            <p className="text-muted-foreground">Try searching for a different name</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Actors;
