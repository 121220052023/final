import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, Calendar, Users, FileText, Star, ExternalLink, Globe, ShoppingCart, BookMarked, Quote } from 'lucide-react'
import { googleBooksApi } from '../services/googleBooks'

const BookDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchBook = async () => {
      setLoading(true)
      try {
        const data = await googleBooksApi.getBookDetails(id)
        setBook(data)
      } catch (err) {
        console.error('Error loading book:', err)
        setError('Could not load book information.')
      } finally {
        setLoading(false)
      }
    }
    fetchBook()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">Loading book details...</p>
        </div>
      </div>
    )
  }

  if (error || !book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Book Not Found</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:col-span-1"
          >
            <div className="sticky top-24">
              <img
                src={book.thumbnail}
                alt={book.title}
                className="w-full max-w-sm mx-auto rounded-2xl glass-immersive"
              />
              <div className="flex gap-3 mt-4">
                {book.previewLink && (
                  <a
                    href={book.previewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl glass-immersive transition-all"
                  >
                    <BookOpen className="w-5 h-5" />
                    Preview
                  </a>
                )}
                {book.infoLink && (
                  <a
                    href={book.infoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-card rounded-xl hover:bg-muted transition-all text-foreground"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:col-span-2 space-y-6"
          >
            <div>
              <h1 className="text-4xl font-black text-foreground">{book.title}</h1>
              {book.subtitle && <p className="text-xl text-muted-foreground mt-1">{book.subtitle}</p>}
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-5 h-5 text-purple-500" />
                <span>{book.author}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-5 h-5 text-blue-500" />
                <span>{book.publishedDate}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-5 h-5 text-primary" />
                <span>{book.pageCount} pages</span>
              </div>
              {book.averageRating > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span>{book.averageRating.toFixed(1)} ({book.ratingsCount} ratings)</span>
                </div>
              )}
            </div>

            {book.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {book.categories.map((cat, i) => (
                  <span key={i} className="px-3 py-1 bg-purple-500/10 text-purple-500 rounded-full text-sm font-medium">
                    {cat}
                  </span>
                ))}
              </div>
            )}

            <div className="bg-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <Quote className="w-5 h-5 text-purple-500" />
                Description
              </h3>
              <div
                className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: book.description }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  <h4 className="font-semibold text-foreground">Language</h4>
                </div>
                <p className="text-muted-foreground text-sm">{book.language.toUpperCase()}</p>
              </div>
              <div className="bg-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookMarked className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Publisher</h4>
                </div>
                <p className="text-muted-foreground text-sm">{book.publisher}</p>
              </div>
              <div className="bg-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-5 h-5 text-amber-500" />
                  <h4 className="font-semibold text-foreground">Price</h4>
                </div>
                <p className="text-muted-foreground text-sm">{book.price}</p>
              </div>
              <div className="bg-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-purple-500" />
                  <h4 className="font-semibold text-foreground">Formats</h4>
                </div>
                <div className="flex gap-2 text-xs">
                  {book.pdfAvailable && <span className="px-2 py-1 bg-primary/10 text-primary rounded">PDF</span>}
                  {book.epubAvailable && <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded">EPUB</span>}
                  {book.isEbook && <span className="px-2 py-1 bg-purple-500/10 text-purple-500 rounded">eBook</span>}
                </div>
              </div>
            </div>

            {book.buyLink && (
              <a
                href={book.buyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold rounded-xl glass-immersive transition-all"
              >
                <ShoppingCart className="w-5 h-5" />
                Buy Now - {book.price}
              </a>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default BookDetails
