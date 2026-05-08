import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Heart, PlusCircle, MinusCircle, Star, ExternalLink } from 'lucide-react'
import { useWatchlist } from '../context/WatchlistContext'
import { useLikedMovies } from '../context/LikedMoviesContext'

const BookCard = ({ book }) => {
  const [isHovered, setIsHovered] = useState(false)
  const navigate = useNavigate()
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist()
  const { likedMovies, addToLikedMovies, removeFromLikedMovies } = useLikedMovies()

  const isInWatchlist = watchlist.some((item) => item.imdbID === book.id)
  const isLiked = likedMovies.some((item) => item.imdbID === book.id)

  const handleDetails = () => {
    navigate(`/book/${book.id}`)
  }

  const handleWatchlistToggle = (e) => {
    e.stopPropagation()
    const bookData = {
      imdbID: book.id,
      Title: book.title,
      Year: book.year,
      Poster: book.thumbnail,
      Type: 'book',
      Plot: book.description?.slice(0, 200),
    }
    if (isInWatchlist) {
      removeFromWatchlist(book.id)
    } else {
      addToWatchlist(bookData)
    }
  }

  const handleLikedToggle = (e) => {
    e.stopPropagation()
    const bookData = {
      imdbID: book.id,
      Title: book.title,
      Year: book.year,
      Poster: book.thumbnail,
      Type: 'book',
    }
    if (isLiked) {
      removeFromLikedMovies(book.id)
    } else {
      addToLikedMovies(bookData)
    }
  }

  return (
    <motion.div
      className="movie-card relative group overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -8 }}
    >
      <motion.button
        onClick={handleLikedToggle}
        className="absolute top-3 right-3 z-20 bg-card backdrop-blur-sm p-2.5 rounded-full hover:bg-card transition-all glass-immersive"
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.95 }}
      >
        <Heart
          className={`w-6 h-6 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`}
        />
      </motion.button>

      <div className="relative h-96 overflow-hidden bg-muted/30 flex items-center justify-center">
        <motion.img
          src={book.thumbnail}
          alt={book.title}
          className="w-full h-full object-contain p-2"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.5 }}
        />

        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/60 flex flex-col items-center justify-center gap-3 p-4"
            >
              <motion.button
                onClick={handleDetails}
                className="btn-primary flex items-center gap-2 w-full justify-center glass-immersive"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <BookOpen className="w-5 h-5" />
                Details
              </motion.button>

              {book.previewLink && (
                <motion.a
                  href={book.previewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full justify-center text-white font-bold px-4 py-3 rounded-xl glass-immersive bg-gradient-to-r from-blue-600 to-cyan-600"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ExternalLink className="w-5 h-5" />
                  Preview
                </motion.a>
              )}

              <motion.button
                onClick={handleWatchlistToggle}
                className={`${isInWatchlist ? 'btn-soul' : 'btn-primary'} flex items-center gap-2 w-full justify-center glass-immersive `}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isInWatchlist ? (
                  <MinusCircle className="w-5 h-5" />
                ) : (
                  <PlusCircle className="w-5 h-5" />
                )}
                {isInWatchlist ? 'Remove from List' : 'Add to List'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-5 bg-gradient-to-b from-card to-card/80">
        <h3 className="text-lg font-bold text-foreground truncate mb-1">{book.title}</h3>
        <p className="text-purple-500 text-sm font-semibold mb-1 truncate">{book.author}</p>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">{book.year}</p>
          {book.averageRating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-yellow-500 font-bold text-sm">{book.averageRating.toFixed(1)}</span>
            </div>
          )}
        </div>
        {book.categories.length > 0 && (
          <p className="text-muted-foreground text-xs mt-2 truncate">{book.categories.slice(0, 2).join(', ')}</p>
        )}
      </div>
    </motion.div>
  )
}

export default BookCard
