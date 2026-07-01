import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Film, Tv, BookOpen, Search, Plus, X, Loader2, Trash2, Pencil, CheckCircle2, Globe, ExternalLink, LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { tmdbApi } from '../../services/tmdb'
import { googleBooksApi } from '../../services/googleBooks'
import AdminSidebar from '../../components/AdminSidebar'

const tabs = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'series', label: 'Series', icon: Tv },
  { id: 'books', label: 'Books', icon: BookOpen },
]

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'

const emptyForm = (type) => {
  if (type === 'movies') return { title: '', description: '', release_year: '', genres: '', poster_url: '', rating: '', runtime: '', director: '', cast_list: '' }
  if (type === 'series') return { title: '', description: '', start_year: '', end_year: '', genres: '', poster_url: '', rating: '', seasons: '', episodes: '' }
  return { title: '', author: '', description: '', isbn: '', page_count: '', published_date: '', publisher: '', cover_url: '', categories: '' }
}

const fieldConfig = {
  movies: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'release_year', label: 'Release Year', type: 'text' },
    { key: 'genres', label: 'Genres (comma-separated)', type: 'text' },
    { key: 'poster_url', label: 'Poster URL', type: 'url' },
    { key: 'rating', label: 'Rating', type: 'text' },
    { key: 'runtime', label: 'Runtime (minutes)', type: 'number' },
    { key: 'director', label: 'Director', type: 'text' },
    { key: 'cast_list', label: 'Cast (comma-separated)', type: 'text' },
  ],
  series: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'start_year', label: 'Start Year', type: 'text' },
    { key: 'end_year', label: 'End Year', type: 'text' },
    { key: 'genres', label: 'Genres (comma-separated)', type: 'text' },
    { key: 'poster_url', label: 'Poster URL', type: 'url' },
    { key: 'rating', label: 'Rating', type: 'text' },
    { key: 'seasons', label: 'Seasons', type: 'number' },
    { key: 'episodes', label: 'Episodes', type: 'number' },
  ],
  books: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'author', label: 'Author', type: 'text' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'isbn', label: 'ISBN', type: 'text' },
    { key: 'page_count', label: 'Page Count', type: 'number' },
    { key: 'published_date', label: 'Published Date', type: 'text' },
    { key: 'publisher', label: 'Publisher', type: 'text' },
    { key: 'cover_url', label: 'Cover URL', type: 'url' },
    { key: 'categories', label: 'Categories (comma-separated)', type: 'text' },
  ],
}

function validateTitle(value) {
  if (!value || !value.trim()) return 'Title is required'
  if (!/^[a-zA-Z]/.test(value.trim())) return 'Title must start with a letter'
  return null
}

export default function ContentManager() {
  const [activeTab, setActiveTab] = useState('movies')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editingTmdbData, setEditingTmdbData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(emptyForm('movies'))
  const [localIds, setLocalIds] = useState(new Set())
  const [tmdbPage, setTmdbPage] = useState(1)
  const [tmdbTotalPages, setTmdbTotalPages] = useState(1)
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState('')
  const [loadingTmdb, setLoadingTmdb] = useState(false)
  const [viewMode, setViewMode] = useState('tmdb')
  const [dataLoaded, setDataLoaded] = useState(false)
  const [googlePage, setGooglePage] = useState(1)
  const [googleTotalItems, setGoogleTotalItems] = useState(0)
  const [googleSearchQuery, setGoogleSearchQuery] = useState('')
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [editingGoogleData, setEditingGoogleData] = useState(null)
  const [genreFilter, setGenreFilter] = useState('all')

  const GENRES = [
    { id: 'all', label: 'All', tmdb: null, book: 'fiction' },
    { id: 'action', label: 'Action', tmdb: 28, book: 'action' },
    { id: 'comedy', label: 'Comedy', tmdb: 35, book: 'comedy' },
    { id: 'drama', label: 'Drama', tmdb: 18, book: 'drama' },
    { id: 'horror', label: 'Horror', tmdb: 27, book: 'horror' },
    { id: 'sci-fi', label: 'Sci-Fi', tmdb: 878, book: 'science+fiction' },
    { id: 'romance', label: 'Romance', tmdb: 10749, book: 'romance' },
    { id: 'thriller', label: 'Thriller', tmdb: 53, book: 'thriller' },
    { id: 'animation', label: 'Animation', tmdb: 16, book: 'animation' },
    { id: 'fantasy', label: 'Fantasy', tmdb: 14, book: 'fantasy' },
    { id: 'crime', label: 'Crime', tmdb: 80, book: 'crime' },
    { id: 'mystery', label: 'Mystery', tmdb: 9648, book: 'mystery' },
  ]

  const isLocalContent = viewMode === 'local'

  const searchTimer = useRef(null)

  const loadLocalIds = useCallback(async () => {
    if (activeTab === 'books') {
      const { data } = await supabase.from('books').select('google_books_id')
      if (data) setLocalIds(new Set(data.map(i => i.google_books_id).filter(Boolean)))
    } else {
      const table = activeTab === 'series' ? 'series' : 'movies'
      const { data } = await supabase.from(table).select('tmdb_id')
      if (data) setLocalIds(new Set(data.map(i => i.tmdb_id)))
    }
  }, [activeTab])

  const loadLocalItems = useCallback(async () => {
    setLoading(true)
    try {
      if (activeTab === 'books') {
        const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false })
        if (error) throw error
        setItems(data || [])
      } else {
        const table = activeTab === 'series' ? 'series' : 'movies'
        const { data, error } = await supabase.from(table).select('*').order('updated_at', { ascending: false })
        if (error) throw error
        setItems(data || [])
      }
    } catch (err) {
      if (!err.message?.includes('relation')) toast.error(`Failed to load ${activeTab}`)
      setItems([])
    } finally { setLoading(false); setDataLoaded(true) }
  }, [activeTab])

  const loadGoogleBooks = useCallback(async (page = 1, query = '') => {
    setLoadingGoogle(true)
    try {
      const startIndex = (page - 1) * 20
      if (query.trim()) {
        const data = await googleBooksApi.searchBooks(query, 20, startIndex)
        setItems(data.books || [])
        setGoogleTotalItems(data.totalItems || 0)
      } else {
        const data = await googleBooksApi.searchBooks('subject:fiction', 20, startIndex)
        setItems(data.books || [])
        setGoogleTotalItems(data.totalItems || 0)
      }
    } catch (err) {
      toast.error('Failed to load from Google Books')
      setItems([])
    } finally { setLoadingGoogle(false); setDataLoaded(true) }
  }, [])

  const loadTmdbItems = useCallback(async (page = 1, query = '') => {
    setLoadingTmdb(true)
    try {
      let results, totalPages
      if (query.trim()) {
        const data = await tmdbApi.searchMovies(query, page)
        results = (data.results || []).filter(r => {
          if (activeTab === 'series') return r.media_type === 'tv'
          if (activeTab === 'movies') return r.media_type === 'movie' || !r.media_type
          return false
        })
        totalPages = data.total_pages || 1
      } else {
        if (activeTab === 'series') {
          const data = await tmdbApi.getPopularTVShows(page)
          results = data.results || []
          totalPages = data.total_pages || 1
        } else {
          const data = await tmdbApi.getPopularMovies(page)
          results = data.results || []
          totalPages = data.total_pages || 1
        }
      }
      setItems(results)
      setTmdbTotalPages(totalPages)
    } catch (err) {
      toast.error('Failed to load from TMDB')
      setItems([])
    } finally { setLoadingTmdb(false); setDataLoaded(true) }
  }, [activeTab])

  const loadAllItems = useCallback(async () => {
    setLoading(true)
    setViewMode('all')
    const genre = GENRES.find(g => g.id === genreFilter)
    try {
      const moviePromise = genreFilter === 'all'
        ? tmdbApi.getPopularMovies(1)
        : tmdbApi.discoverMovies({ with_genres: genre.tmdb, page: 1 })
      const seriesPromise = genreFilter === 'all'
        ? tmdbApi.getPopularTVShows(1)
        : tmdbApi.discoverTV({ with_genres: genre.tmdb, page: 1 })
      const bookPromise = googleBooksApi.searchBooks(`subject:${genre.book}`, 20, 0)

      const [moviesRes, seriesRes, booksRes] = await Promise.allSettled([moviePromise, seriesPromise, bookPromise])
      const movies = moviesRes.status === 'fulfilled' ? (moviesRes.value.results || []).map(m => ({ ...m, _source: 'movie' })) : []
      const series = seriesRes.status === 'fulfilled' ? (seriesRes.value.results || []).map(s => ({ ...s, _source: 'tv' })) : []
      const books = booksRes.status === 'fulfilled' ? (booksRes.value.books || []).map(b => ({ ...b, _source: 'book' })) : []
      setItems([...movies, ...series, ...books])
    } catch (err) {
      toast.error('Failed to load items')
      setItems([])
    } finally { setLoading(false); setDataLoaded(true) }
  }, [genreFilter])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (activeTab === 'all') {
      loadLocalIds()
      loadAllItems()
    } else if (activeTab === 'books') {
      loadLocalIds()
      loadGoogleBooks(1, '')
      setViewMode('google')
      setGooglePage(1)
      setGoogleSearchQuery('')
    } else {
      loadLocalIds()
      loadTmdbItems(1, '')
      setViewMode('tmdb')
    }
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [activeTab, genreFilter, loadLocalItems, loadLocalIds, loadTmdbItems, loadGoogleBooks, loadAllItems])

  const tmdbSearch = (query) => {
    setTmdbSearchQuery(query)
    setTmdbPage(1)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => loadTmdbItems(1, query), 400)
  }

  const tmdbPageChange = (dir) => {
    const next = tmdbPage + dir
    if (next < 1 || next > tmdbTotalPages) return
    setTmdbPage(next)
    loadTmdbItems(next, tmdbSearchQuery)
  }

  const googleSearch = (query) => {
    setGoogleSearchQuery(query)
    setGooglePage(1)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => loadGoogleBooks(1, query), 400)
  }

  const googlePageChange = (dir) => {
    const next = googlePage + dir
    if (next < 1 || next * 20 > googleTotalItems + 20) return
    setGooglePage(next)
    loadGoogleBooks(next, googleSearchQuery)
  }

  const switchView = (mode) => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    setViewMode(mode)
    setItems([])
    setDataLoaded(false)
    if (mode === 'local') loadLocalItems()
    else if (mode === 'all') { loadLocalIds(); loadTmdbItems(tmdbPage, tmdbSearchQuery) }
    else if (activeTab === 'books') loadGoogleBooks(googlePage, googleSearchQuery)
    else loadTmdbItems(tmdbPage, tmdbSearchQuery)
  }

  const openEditFromTmdb = (item) => {
    setEditingTmdbData(item)
    setEditing(null)
    const title = item.title || item.name || ''
    const year = (item.release_date || item.first_air_date || '').split('-')[0]
    const genres = item.genres?.map(g => g.name || g).join(', ') || ''
    const cast = item.cast_list?.join(', ') || ''
    setForm({
      title,
      description: item.overview || '',
      release_year: year,
      genres,
      poster_url: item.poster_path ? `${TMDB_IMG}${item.poster_path}` : '',
      rating: item.vote_average?.toString() || '',
      runtime: item.runtime?.toString() || '',
      director: '',
      cast_list: cast,
    })
    setShowModal(true)
  }

  const openEditFromGoogle = (item) => {
    setEditingGoogleData(item)
    setEditingTmdbData(null)
    setEditing(null)
    setForm({
      title: item.title || '',
      author: item.author || item.authors?.join(', ') || '',
      description: item.description || '',
      isbn: item.isbn || '',
      page_count: item.pageCount?.toString() || '',
      published_date: item.publishedDate || item.year || '',
      publisher: item.publisher || '',
      cover_url: item.thumbnail || item.cover_url || '',
      categories: item.categories?.join(', ') || item.category || '',
    })
    setShowModal(true)
  }

  const openEditLocal = (item) => {
    setEditingTmdbData(null)
    setEditing(item)
    const f = { ...emptyForm(activeTab) }
    for (const key of Object.keys(f)) {
      const val = item[key]
      f[key] = val !== null && val !== undefined ? (Array.isArray(val) ? val.join(', ') : String(val)) : ''
    }
    setForm(f)
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const titleErr = validateTitle(form.title)
    if (titleErr) { toast.error(titleErr); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (activeTab === 'books') {
        if (editingGoogleData) {
          const payload = {
            google_books_id: editingGoogleData.id,
            title: form.title,
            author: form.author || null,
            description: form.description || null,
            isbn: form.isbn || null,
            page_count: form.page_count ? parseInt(form.page_count) || null : null,
            published_date: form.published_date || null,
            publisher: form.publisher || null,
            categories: form.categories ? form.categories.split(',').map(s => s.trim()).filter(Boolean) : [],
            cover_url: form.cover_url || null,
            added_by: user.id,
          }
          const existing = await supabase.from('books').select('id').eq('google_books_id', editingGoogleData.id).maybeSingle()
          if (existing.data?.id) {
            const { error } = await supabase.from('books').update(payload).eq('id', existing.data.id)
            if (error) throw error
            toast.success('Book updated')
          } else {
            const { error } = await supabase.from('books').insert(payload)
            if (error) throw error
            toast.success('Book saved to local')
          }
          await loadLocalIds()
        } else {
          const payload = { ...form }
          for (const key of Object.keys(payload)) {
            if (key === 'categories') {
              payload[key] = payload[key] ? payload[key].split(',').map(s => s.trim()).filter(Boolean) : []
            }
            if (key === 'page_count' && payload[key]) payload[key] = parseInt(payload[key]) || null
            if (!payload[key] || payload[key] === '') payload[key] = null
          }
          if (payload.title === null) payload.title = form.title
          if (editing) {
            const { error } = await supabase.from('books').update(payload).eq('id', editing.id)
            if (error) throw error
            toast.success('Book updated')
          } else {
            const { error } = await supabase.from('books').insert({ ...payload, added_by: user.id })
            if (error) throw error
            toast.success('Book added')
          }
        }
      } else if (editingTmdbData) {
        const table = activeTab === 'series' ? 'series' : 'movies'
        const payload = {
          tmdb_id: editingTmdbData.id,
          title: form.title,
          description: form.description || null,
          release_year: form.release_year || null,
          genres: form.genres ? form.genres.split(',').map(s => s.trim()).filter(Boolean) : [],
          poster_url: form.poster_url || null,
          rating: form.rating || null,
          runtime: form.runtime ? parseInt(form.runtime) : null,
          director: form.director || null,
          cast_list: form.cast_list ? form.cast_list.split(',').map(s => s.trim()).filter(Boolean) : [],
          language: 'en',
          added_by: user.id,
        }
        const existing = await supabase.from(table).select('id').eq('tmdb_id', editingTmdbData.id).maybeSingle()
        if (existing.data?.id) {
          const { error } = await supabase.from(table).update(payload).eq('id', existing.data.id)
          if (error) throw error
          toast.success(`${activeTab.slice(0, -1)} updated`)
        } else {
          const { error } = await supabase.from(table).insert(payload)
          if (error) throw error
          toast.success(`${activeTab.slice(0, -1)} saved to local`)
        }
        await loadLocalIds()
      } else {
        const table = activeTab === 'series' ? 'series' : 'movies'
        const payload = { ...form }
        for (const key of Object.keys(payload)) {
          if (key === 'genres' || key === 'cast_list') {
            payload[key] = payload[key] ? payload[key].split(',').map(s => s.trim()).filter(Boolean) : []
          }
          if ((key === 'runtime' || key === 'seasons' || key === 'episodes') && payload[key]) {
            payload[key] = parseInt(payload[key]) || null
          }
          if (!payload[key] || payload[key] === '') payload[key] = null
        }
        if (payload.title === null) payload.title = form.title
        if (editing) {
          const { error } = await supabase.from(table).update(payload).eq('id', editing.id)
          if (error) throw error
          toast.success(`${activeTab.slice(0, -1)} updated`)
        } else {
          const { error } = await supabase.from(table).insert({ ...payload, added_by: user.id })
          if (error) throw error
          toast.success(`${activeTab.slice(0, -1)} added`)
        }
      }
      setShowModal(false)
      if (isLocalContent || viewMode === 'local') loadLocalItems()
      else if (activeTab === 'books') loadGoogleBooks(googlePage, googleSearchQuery)
      else loadTmdbItems(tmdbPage, tmdbSearchQuery)
    } catch (err) {
      toast.error(err.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete this ${activeTab.slice(0, -1)} permanently?`)) return
    setDeleting(id)
    try {
      const table = activeTab === 'books' ? 'books' : (activeTab === 'series' ? 'series' : 'movies')
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      if (table !== 'books') await loadLocalIds()
      if (isLocalContent || viewMode === 'local') {
        setItems(prev => prev.filter(i => i.id !== id))
      } else if (activeTab === 'books') {
        await loadGoogleBooks(googlePage, googleSearchQuery)
      } else {
        await loadTmdbItems(tmdbPage, tmdbSearchQuery)
      }
      toast.success(`${activeTab.slice(0, -1)} deleted`)
    } catch (err) {
      toast.error(err.message || 'Failed to delete')
    } finally { setDeleting(null) }
  }

  const filtered = activeTab === 'all' || isLocalContent
    ? items.filter(item => {
        if (!search) return true
        const q = search.toLowerCase()
        return (item.title || item.name || '').toLowerCase().includes(q) || (item.author || item.director || '').toLowerCase().includes(q)
      })
    : items

  const renderCard = (item) => {
    const isAllMode = activeTab === 'all'
    const isTmdbItem = !isAllMode && !isLocalContent && activeTab !== 'books' && !item.id?.toString().includes('-')
    const isGoogleItem = !isAllMode && !isLocalContent && activeTab === 'books'
    const hasLocalEdit = !isLocalContent && (localIds.has(item.id) || localIds.has(item.id?.toString()) || item.isLocalOverride)

    const title = item.title || item.name || item.original_title || ''
    const subtitle = item.author || item.director || (item.release_date || '').split('-')[0] || item.release_year || item.start_year || ''
    const poster = item.poster_url || item.cover_url || item.thumbnail || (item.poster_path ? `${TMDB_IMG}${item.poster_path}` : null)
    const itemId = item.id?.toString() || ''

    const meta = []
    const genres = item.genres || item.genre_ids || []
    if (genres.length) {
      meta.push(...genres.slice(0, 2).map(g => typeof g === 'object' ? g.name : g))
    }
    if (item.page_count) meta.push(`${item.page_count}p`)
    if (item.runtime) meta.push(`${item.runtime}min`)
    if (item.seasons) meta.push(`${item.seasons} seasons`)
    if (item.published_date) meta.push(item.published_date)
    if (item.release_year || (item.release_date || '').split('-')[0]) meta.push(item.release_year || (item.release_date || '').split('-')[0])

    return (
      <motion.div key={itemId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-3 bg-muted/30 border border-border hover:border-primary/30 transition-all relative">
        {hasLocalEdit && !isAllMode && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-semibold border border-green-500/30">
            <CheckCircle2 className="w-2.5 h-2.5" /> Edited
          </div>
        )}
        {isAllMode && !hasLocalEdit && item._source === 'movie' && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-semibold border border-blue-500/30">
            <Film className="w-2.5 h-2.5" /> Movie
          </div>
        )}
        {isAllMode && !hasLocalEdit && item._source === 'tv' && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 text-[10px] font-semibold border border-purple-500/30">
            <Tv className="w-2.5 h-2.5" /> Series
          </div>
        )}
        {isAllMode && !hasLocalEdit && item._source === 'book' && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-semibold border border-amber-500/30">
            <BookOpen className="w-2.5 h-2.5" /> Book
          </div>
        )}
        {!isAllMode && isTmdbItem && !hasLocalEdit && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-semibold border border-blue-500/30">
            <Globe className="w-2.5 h-2.5" /> TMDB
          </div>
        )}
        {!isAllMode && isGoogleItem && !hasLocalEdit && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-semibold border border-amber-500/30">
            <BookOpen className="w-2.5 h-2.5" /> Google Books
          </div>
        )}
        <div className="flex gap-3">
          {poster ? (
            <img src={poster} alt={title} className="w-14 h-20 rounded-lg object-cover flex-shrink-0" onError={(e) => { e.target.style.display = 'none' }} />
          ) : (
            <div className="w-14 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              {item._source === 'tv' ? <Tv className="w-5 h-5 text-muted-foreground/40" /> : item._source === 'book' ? <BookOpen className="w-5 h-5 text-muted-foreground/40" /> : <Film className="w-5 h-5 text-muted-foreground/40" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            {meta.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {meta.map((m, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">{m}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 self-start">
            {isAllMode ? (
              <a href={item._source === 'book' ? (item.infoLink || item.previewLink || `https://books.google.com/books?id=${item.id}`) : `https://www.themoviedb.org/${item._source === 'tv' ? 'tv' : 'movie'}/${item.id}`} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-all">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <>
                <button onClick={() => isTmdbItem ? openEditFromTmdb(item) : isGoogleItem ? openEditFromGoogle(item) : openEditLocal(item)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => {
                  if (hasLocalEdit) {
                    const localId = items.find(i => i.tmdb_id === item.id || i.google_books_id === item.id || i.id === item.id)?.id
                    if (localId) handleDelete(localId)
                  } else if (isLocalContent) {
                    handleDelete(item.id)
                  } else {
                    toast.error('No local edit to delete — edit this item first')
                  }
                }} disabled={deleting === item.id}
                  className="p-1.5 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50">
                  {deleting === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
                {isTmdbItem && (
                  <a href={`https://www.themoviedb.org/${activeTab === 'series' ? 'tv' : 'movie'}/${item.id}`} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-all">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {isGoogleItem && (
                  <a href={item.infoLink || item.previewLink || `https://books.google.com/books?id=${item.id}`} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-all">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="admin-body">
      <AdminSidebar />
      <div className="admin-main">
        <div className="max-w-[1400px]">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="admin-glow-line" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Administration</span>
              </div>
              <h1 className="text-4xl font-extrabold text-foreground md:text-5xl">Content Manager</h1>
              <p className="mt-2 text-sm text-muted-foreground">Browse TMDB, edit & save to local database</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${activeTab === tab.id ? 'bg-primary text-on-primary border-primary' : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:bg-muted'}`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
            <div className="flex-1" />
            {activeTab !== 'all' && (
              <div className="flex rounded-xl border border-border overflow-hidden">
                {activeTab === 'books' ? (
                  <>
                    <button onClick={() => switchView('google')}
                      className={`px-3 py-2 text-xs font-semibold transition-all ${viewMode === 'google' ? 'bg-primary text-on-primary' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}>
                      Google Books
                    </button>
                    <button onClick={() => switchView('local')}
                      className={`px-3 py-2 text-xs font-semibold transition-all ${viewMode === 'local' ? 'bg-primary text-on-primary' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}>
                      Edited
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => switchView('tmdb')}
                      className={`px-3 py-2 text-xs font-semibold transition-all ${viewMode === 'tmdb' ? 'bg-primary text-on-primary' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}>
                      TMDB
                    </button>
                    <button onClick={() => switchView('local')}
                      className={`px-3 py-2 text-xs font-semibold transition-all ${viewMode === 'local' ? 'bg-primary text-on-primary' : 'bg-transparent text-muted-foreground hover:bg-muted'}`}>
                      Edited
                    </button>
                  </>
                )}
              </div>
            )}
            {activeTab === 'all' ? (
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search all..." className="admin-search pl-10" />
              </div>
            ) : viewMode === 'local' ? (
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="admin-search pl-10" />
              </div>
            ) : activeTab === 'books' ? (
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={googleSearchQuery} onChange={(e) => googleSearch(e.target.value)} placeholder="Search Google Books..." className="admin-search pl-10" />
              </div>
            ) : (
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={tmdbSearchQuery} onChange={(e) => tmdbSearch(e.target.value)} placeholder="Search TMDB..." className="admin-search pl-10" />
              </div>
            )}
            {activeTab !== 'all' && (
              <button onClick={() => {
                setEditingTmdbData(null)
                setEditingGoogleData(null)
                setEditing(null)
                setForm(emptyForm(activeTab))
                setShowModal(true)
              }} className="admin-btn-primary h-10">
                <Plus className="w-4 h-4" />
                Add {activeTab.slice(0, -1)}
              </button>
            )}
          </div>

          {activeTab === 'all' && (
            <div className="flex flex-wrap gap-2 mb-4">
              {GENRES.map(g => (
                <button key={g.id} onClick={() => { setGenreFilter(g.id); setSearch('') }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${genreFilter === g.id ? 'bg-primary text-on-primary border-primary' : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:bg-muted'}`}>
                  {g.label}
                </button>
              ))}
            </div>
          )}

          <div className="admin-card overflow-hidden">
            {(!dataLoaded && (loading || loadingTmdb || loadingGoogle)) ? (
              <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground/20" /></div>
            ) : filtered.length === 0 && dataLoaded ? (
              <div className="p-12 text-center">
                {React.createElement(tabs.find(t => t.id === activeTab).icon, { className: "w-8 h-8 text-muted-foreground/20 mx-auto mb-2" })}
                <p className="text-sm text-muted-foreground">{viewMode === 'local' ? 'No edited content yet' : (tmdbSearchQuery || googleSearchQuery ? 'No results found' : `No ${activeTab} found`)}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
                {filtered.map(item => renderCard(item))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-muted-foreground">
              {filtered.length} {activeTab}
              {activeTab === 'all' ? ' (all sources)' : viewMode === 'tmdb' ? ' (from TMDB)' : viewMode === 'google' ? ' (from Google Books)' : viewMode === 'local' ? ' (edited)' : ''} total
            </p>
            {activeTab !== 'books' && !isLocalContent && tmdbTotalPages > 1 && (
              <div className="flex items-center gap-2">
                <button onClick={() => tmdbPageChange(-1)} disabled={tmdbPage <= 1 || loadingTmdb}
                  className="px-3 py-1 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30">
                  Prev
                </button>
                <span className="text-xs text-muted-foreground">{tmdbPage} / {tmdbTotalPages}</span>
                <button onClick={() => tmdbPageChange(1)} disabled={tmdbPage >= tmdbTotalPages || loadingTmdb}
                  className="px-3 py-1 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30">
                  Next
                </button>
              </div>
            )}
            {activeTab === 'books' && googleTotalItems > 20 && (
              <div className="flex items-center gap-2">
                <button onClick={() => googlePageChange(-1)} disabled={googlePage <= 1 || loadingGoogle}
                  className="px-3 py-1 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30">
                  Prev
                </button>
                <span className="text-xs text-muted-foreground">{googlePage} / {Math.ceil(googleTotalItems / 20)}</span>
                <button onClick={() => googlePageChange(1)} disabled={googlePage * 20 >= googleTotalItems || loadingGoogle}
                  className="px-3 py-1 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30">
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="admin-modal-overlay" onClick={() => { setShowModal(false); setEditingGoogleData(null) }}>
          <div className="admin-modal max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">
                {editing ? 'Edit' : editingTmdbData ? 'Edit (from TMDB)' : editingGoogleData ? 'Edit (from Google Books)' : 'Add'} {activeTab.slice(0, -1)}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingGoogleData(null) }} className="admin-btn-ghost p-1.5"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {fieldConfig[activeTab].map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    {field.label} {field.required && '*'}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea value={form[field.key] || ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} className="admin-input min-h-[80px] resize-none" rows={3} required={field.required} />
                  ) : (
                    <input type={field.type} value={form[field.key] || ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} className="admin-input" required={field.required} />
                  )}
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingGoogleData(null) }} className="admin-btn-secondary flex-1 h-10">Cancel</button>
                <button type="submit" disabled={saving} className="admin-btn-primary flex-1 h-10">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing || editingTmdbData || editingGoogleData ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                  {saving ? 'Saving...' : editing || editingTmdbData || editingGoogleData ? 'Update' : `Add ${activeTab.slice(0, -1)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
