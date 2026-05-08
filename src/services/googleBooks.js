import axios from 'axios'

const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY || 'AIzaSyCkarnKVlgNzmZGO3WjQbQ4ltDK0gAVgtA'
const BASE_URL = 'https://www.googleapis.com/books/v1'

const makeRequest = async (endpoint, params = {}) => {
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      params: {
        key: GOOGLE_BOOKS_API_KEY,
        ...params,
      },
    })
    return response.data
  } catch (error) {
    console.error('Google Books API Error:', error)
    throw error
  }
}

const formatBook = (volume) => {
  const info = volume.volumeInfo || {}
  const sale = volume.saleInfo || {}
  const access = volume.accessInfo || {}

  return {
    id: volume.id,
    title: info.title || 'Unknown Title',
    subtitle: info.subtitle || '',
    authors: info.authors || ['Unknown Author'],
    author: (info.authors || ['Unknown Author']).join(', '),
    publisher: info.publisher || 'Unknown Publisher',
    publishedDate: info.publishedDate || 'N/A',
    year: info.publishedDate ? info.publishedDate.split('-')[0] : 'N/A',
    description: info.description || 'No description available',
    pageCount: info.pageCount || 0,
    categories: info.categories || [],
    category: (info.categories || ['Unknown'])[0],
    language: info.language || 'en',
    averageRating: info.averageRating || 0,
    ratingsCount: info.ratingsCount || 0,
    thumbnail: info.imageLinks?.thumbnail || 'https://via.placeholder.com/128x196?text=No+Cover',
    smallThumbnail: info.imageLinks?.smallThumbnail || '',
    previewLink: info.previewLink || '',
    infoLink: info.infoLink || '',
    buyLink: sale.buyLink || '',
    isEbook: sale.isEbook || false,
    price: sale.retailPrice?.amount ? `$${sale.retailPrice.amount}` : 'Free',
    pdfAvailable: access.pdf?.isAvailable || false,
    epubAvailable: access.epub?.isAvailable || false,
    webReaderLink: access.webReaderLink || '',
    type: 'book',
  }
}

export const googleBooksApi = {
  searchBooks: async (query, maxResults = 20, startIndex = 0) => {
    const data = await makeRequest('/volumes', {
      q: query,
      maxResults,
      startIndex,
      printType: 'books',
      orderBy: 'relevance',
    })
    return {
      books: (data.items || []).map(formatBook),
      totalItems: data.totalItems || 0,
    }
  },

  getBookDetails: async (bookId) => {
    const data = await makeRequest(`/volumes/${bookId}`)
    return formatBook(data)
  },

  getTrendingBooks: async () => {
    const data = await makeRequest('/volumes', {
      q: 'subject:fiction',
      maxResults: 25,
      orderBy: 'newest',
      printType: 'books',
    })
    return (data.items || []).map(formatBook)
  },

  getBestSellers: async () => {
    const data = await makeRequest('/volumes', {
      q: 'bestseller',
      maxResults: 25,
      orderBy: 'relevance',
      printType: 'books',
    })
    return (data.items || []).map(formatBook)
  },

  getBooksByAuthor: async (author, maxResults = 20) => {
    const data = await makeRequest('/volumes', {
      q: `inauthor:${author}`,
      maxResults,
      orderBy: 'relevance',
      printType: 'books',
    })
    return {
      books: (data.items || []).map(formatBook),
      totalItems: data.totalItems || 0,
    }
  },

  getBooksByCategory: async (category, maxResults = 20) => {
    const data = await makeRequest('/volumes', {
      q: `subject:${category}`,
      maxResults,
      orderBy: 'relevance',
      printType: 'books',
    })
    return {
      books: (data.items || []).map(formatBook),
      totalItems: data.totalItems || 0,
    }
  },

  getNewReleases: async () => {
    const data = await makeRequest('/volumes', {
      q: 'subject:fiction',
      maxResults: 20,
      orderBy: 'newest',
      printType: 'books',
    })
    return (data.items || []).map(formatBook)
  },

  getArabicBooks: async (maxResults = 20) => {
    const data = await makeRequest('/volumes', {
      q: 'lang:ar',
      maxResults,
      orderBy: 'relevance',
      printType: 'books',
    })
    return {
      books: (data.items || []).map(formatBook),
      totalItems: data.totalItems || 0,
    }
  },
}
