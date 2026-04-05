import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { motion } from 'framer-motion';
import { Play, Info, Monitor } from 'lucide-react';
import { getPopularMoviesForSlider } from '../services/imdbService';
import LoadingSkeleton from './LoadingSkeleton';

const HeroSlider = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const data = await getPopularMoviesForSlider();
        setMovies(data);
      } catch (error) {
        console.error('Error fetching popular movies for slider:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  // Autoplay logic
  useEffect(() => {
    if (!emblaApi) return;

    const autoplay = () => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        emblaApi.scrollTo(0);
      }
    };

    const interval = setInterval(autoplay, 5000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  if (loading) {
    return (
      <section className="relative h-screen bg-gray-800 flex items-center justify-center overflow-hidden">
        <LoadingSkeleton />
      </section>
    );
  }

  if (movies.length === 0) {
    return (
      <section className="relative h-screen bg-gray-800 flex items-center justify-center overflow-hidden">
        <p className="text-white text-xl">No movies available for the slider.</p>
      </section>
    );
  }

  return (
    <section className="relative h-screen overflow-hidden">
      <div className="embla h-full" ref={emblaRef}>
        <div className="embla__container h-full flex">
          {movies.map((movie) => (
            <div className="embla__slide relative flex-none w-full h-full" key={movie.id}>
              <img
                src={movie.backdrop}
                alt={movie.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 text-white z-10">
                <motion.h2
                  className="text-4xl md:text-6xl font-bold mb-4 max-w-3xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  {movie.title}
                </motion.h2>
                <motion.p
                  className="text-lg md:text-xl max-w-2xl mb-6 text-gray-200"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  {movie.overview.substring(0, 150)}...
                </motion.p>
                <motion.div
                  className="flex flex-wrap gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  <button
                    onClick={() => navigate(`/watch/${movie.id}`, { state: { type: movie.type || 'movie' } })}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-white text-lg shadow-xl transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)' }}
                  >
                    <Monitor className="w-5 h-5" />
                    Watch Now
                  </button>
                  <button
                    onClick={() => navigate(`/movie/${movie.id}`, { state: { type: movie.type || 'movie' } })}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-white text-lg shadow-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all hover:scale-105"
                  >
                    <Info className="w-5 h-5" />
                    Details
                  </button>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSlider;
