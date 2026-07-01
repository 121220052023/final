import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Film, Tv, BookOpen, Eye, Heart, Loader2, Search, Star, Clock, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'

const TABS = [
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'series', label: 'Series', icon: Tv },
  { id: 'books', label: 'Books', icon: BookOpen },
]

export default function AdminLibrary() {
  const [activeTab, setActiveTab] = useState('movies')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ movies: [], series: [], books: [] })
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [likedRes, watchRes, booksRes, readRes] = await Promise.allSettled([
        supabase.from('liked_movies').select('movie_id, movie_type, title, poster_url, liked_at').limit(2000),
        supabase.from('watch_history').select('movie_id, movie_type, title, poster_url, progress, completed, watched_at').limit(2000),
        supabase.from('books').select('*').order('created_at', { ascending: false }),
        supabase.from('read_books').select('book_id, user_id, progress, finished'),
      ])

      const likedMovies = likedRes.status === 'fulfilled' ? likedRes.value.data || [] : []
      const watchHistory = watchRes.status === 'fulfilled' ? watchRes.value.data || [] : []
      const books = booksRes.status === 'fulfilled' ? booksRes.value.data || [] : []
      const readBooks = readRes.status === 'fulfilled' ? readRes.value.data || [] : []

      const readCountMap = {}
      readBooks.forEach(rb => {
        readCountMap[rb.book_id] = (readCountMap[rb.book_id] || 0) + 1
      })

      const finishCountMap = {}
      readBooks.forEach(rb => {
        if (rb.finished) finishCountMap[rb.book_id] = (finishCountMap[rb.book_id] || 0) + 1
      })

      const watchCountMap = {}
      const watchUserMap = {}
      watchHistory.forEach(wh => {
        const key = `${wh.movie_type}_${wh.movie_id}`
        watchCountMap[key] = (watchCountMap[key] || 0) + 1
        if (!watchUserMap[key]) watchUserMap[key] = new Set()
        watchUserMap[key].add(wh.user_id)
      })

      const likeCountMap = {}
      likedMovies.forEach(lm => {
        const key = `${lm.movie_type}_${lm.movie_id}`
        likeCountMap[key] = (likeCountMap[key] || 0) + 1
      })

      const movieSeen = new Set()
      const seriesSeen = new Set()
      const movieMap = {}
      const seriesMap = {}

      likedMovies.forEach(lm => {
        const key = `${lm.movie_type}_${lm.movie_id}`
        const entry = { movie_id: lm.movie_id, title: lm.title, poster_url: lm.poster_url, type: lm.movie_type }
        if (lm.movie_type === 'movie') {
          if (!movieSeen.has(lm.movie_id)) {
            movieSeen.add(lm.movie_id)
            movieMap[lm.movie_id] = { ...entry, like_count: 0, watch_count: 0, unique_watchers: 0 }
          }
          movieMap[lm.movie_id].like_count = (movieMap[lm.movie_id].like_count || 0) + 1
        } else {
          if (!seriesSeen.has(lm.movie_id)) {
            seriesSeen.add(lm.movie_id)
            seriesMap[lm.movie_id] = { ...entry, like_count: 0, watch_count: 0, unique_watchers: 0 }
          }
          seriesMap[lm.movie_id].like_count = (seriesMap[lm.movie_id].like_count || 0) + 1
        }
      })

      watchHistory.forEach(wh => {
        const key = `${wh.movie_type}_${wh.movie_id}`
        if (wh.movie_type === 'movie') {
          if (!movieSeen.has(wh.movie_id)) {
            movieSeen.add(wh.movie_id)
            movieMap[wh.movie_id] = { movie_id: wh.movie_id, title: wh.title, poster_url: wh.poster_url, type: 'movie', like_count: 0, watch_count: 0, unique_watchers: 0 }
          }
          movieMap[wh.movie_id].watch_count = (movieMap[wh.movie_id].watch_count || 0) + 1
          if (!movieMap[wh.movie_id].unique_watchers) movieMap[wh.movie_id].unique_watchers = new Set()
          movieMap[wh.movie_id].unique_watchers.add(wh.user_id)
        } else {
          if (!seriesSeen.has(wh.movie_id)) {
            seriesSeen.add(wh.movie_id)
            seriesMap[wh.movie_id] = { movie_id: wh.movie_id, title: wh.title, poster_url: wh.poster_url, type: 'tv', like_count: 0, watch_count: 0, unique_watchers: 0 }
          }
          seriesMap[wh.movie_id].watch_count = (seriesMap[wh.movie_id].watch_count || 0) + 1
          if (!seriesMap[wh.movie_id].unique_watchers) seriesMap[wh.movie_id].unique_watchers = new Set()
          seriesMap[wh.movie_id].unique_watchers.add(wh.user_id)
        }
      })

      const movies = Object.values(movieMap).map(m => ({
        ...m,
        unique_watchers: m.unique_watchers instanceof Set ? m.unique_watchers.size : (m.unique_watchers || 0),
      }))
      const series = Object.values(seriesMap).map(s => ({
        ...s,
        unique_watchers: s.unique_watchers instanceof Set ? s.unique_watchers.size : (s.unique_watchers || 0),
      }))

      const booksWithStats = books.map(b => ({
        ...b,
        read_count: readCountMap[b.id] || 0,
        finished_count: finishCountMap[b.id] || 0,
      }))

      setData({ movies, series, books: booksWithStats })
    } catch (err) {
      console.error('Error loading library data:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredData = () => {
    const items = data[activeTab] || []
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter(i => (i.title || '').toLowerCase().includes(q))
  }

  const sortKey = activeTab === 'books' ? 'read_count' : 'watch_count'

  const sorted = [...filteredData()].sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0) || (b.like_count || 0) - (a.like_count || 0))

  const totalStats = {
    movies: data.movies.length,
    series: data.series.length,
    books: data.books.length,
    totalWatches: data.movies.reduce((s, m) => s + (m.watch_count || 0), 0) + data.series.reduce((s, m) => s + (m.watch_count || 0), 0),
    totalLikes: data.movies.reduce((s, m) => s + (m.like_count || 0), 0) + data.series.reduce((s, m) => s + (m.like_count || 0), 0),
    totalReads: data.books.reduce((s, b) => s + (b.read_count || 0), 0),
  }

  if (loading) {
    return (
      <div className="admin-body flex items-center justify-center">
        <AdminSidebar />
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="admin-body">
      <AdminSidebar />
      <div className="admin-main">
        <div className="max-w-[1400px]">
          <div className="flex items-start justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="admin-glow-line" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Content Library
                </span>
              </div>
              <h1 className="text-4xl font-extrabold text-foreground md:text-5xl">Library</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Browse all movies, series, and books — see what's most watched and liked
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Movies', value: totalStats.movies, icon: Film },
              { label: 'Series', value: totalStats.series, icon: Tv },
              { label: 'Total Watches', value: totalStats.totalWatches, icon: Eye },
              { label: 'Total Likes', value: totalStats.totalLikes, icon: Heart },
              { label: 'Total Books', value: totalStats.books, icon: BookOpen },
              { label: 'Total Reads', value: totalStats.totalReads, icon: BookOpen },
              { label: 'Most Watched', value: sorted[0]?.title?.slice(0, 20) || '—', icon: TrendingUp },
              { label: 'Top Likes', value: [...data.movies, ...data.series].sort((a, b) => (b.like_count || 0) - (a.like_count || 0))[0]?.title?.slice(0, 20) || '—', icon: Star },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="admin-card p-4"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mb-2.5">
                  <item.icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="mono-num text-xl text-foreground truncate">{item.value}</div>
                <div className="text-xs mt-0.5 text-muted-foreground">{item.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-6">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-on-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className={`text-xs ml-1 ${activeTab === tab.id ? 'text-on-primary/60' : 'text-muted-foreground/50'}`}>
                  ({data[tab.id]?.length || 0})
                </span>
              </button>
            ))}
          </div>

          <div className="relative mb-6 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="admin-search"
            />
          </div>

          <div className="admin-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    {activeTab === 'books' ? (
                      <>
                        <th>Author</th>
                        <th>Read Count</th>
                        <th>Finished</th>
                        <th>Categories</th>
                      </>
                    ) : (
                      <>
                        <th>Watches</th>
                        <th>Unique Viewers</th>
                        <th>Likes</th>
                        <th>Type</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center">
                        <BookOpen className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No {activeTab} found</p>
                      </td>
                    </tr>
                  ) : (
                    sorted.slice(0, 100).map((item, i) => (
                      <motion.tr
                        key={item.movie_id || item.id || i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.008 }}
                      >
                        <td>
                          <div className="flex items-center gap-3">
                            {item.poster_url || item.cover_url ? (
                              <img
                                src={item.poster_url || item.cover_url}
                                alt=""
                                className="w-10 h-14 rounded-lg object-cover flex-shrink-0"
                                onError={(e) => { e.target.style.display = 'none' }}
                              />
                            ) : (
                              <div className="w-10 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                {activeTab === 'books' ? <BookOpen className="w-4 h-4 text-muted-foreground" /> : <Film className="w-4 h-4 text-muted-foreground" />}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-foreground truncate max-w-[250px]">
                                {item.title || item.author || 'Untitled'}
                              </div>
                              {item.author && activeTab === 'books' && (
                                <div className="text-xs text-muted-foreground truncate">{item.author}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        {activeTab === 'books' ? (
                          <>
                            <td><span className="text-sm text-foreground">{item.author || '—'}</span></td>
                            <td>
                              <div className="flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-sm text-foreground font-medium">{item.read_count || 0}</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-sm text-foreground font-medium">{item.finished_count || 0}</span>
                              </div>
                            </td>
                            <td>
                              <span className="text-sm text-muted-foreground">
                                {item.categories?.slice(0, 2).join(', ') || '—'}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>
                              <div className="flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-primary" />
                                <span className="text-sm text-foreground font-medium">{item.watch_count || 0}</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center gap-1.5">
                                <UsersIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-sm text-foreground font-medium">{item.unique_watchers || 0}</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center gap-1.5">
                                <Heart className="w-3.5 h-3.5 text-destructive" />
                                <span className="text-sm text-foreground font-medium">{item.like_count || 0}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`admin-badge text-xs ${item.type === 'tv' ? 'border-blue-500/30 text-blue-500' : 'border-emerald-500/30 text-emerald-500'}`}>
                                {item.type === 'tv' ? 'Series' : 'Movie'}
                              </span>
                            </td>
                          </>
                        )}
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {sorted.length > 100 && (
            <p className="text-xs mt-3 text-center text-muted-foreground">
              Showing top 100 of {sorted.length} {activeTab}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function UsersIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
