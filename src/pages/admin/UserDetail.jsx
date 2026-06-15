import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Eye, Heart, MessageSquare, Star, Trash2, Loader2, Calendar, Shield, Crown, Clock, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'

const UserDetail = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [watchHistory, setWatchHistory] = useState([])
  const [reviews, setReviews] = useState([])
  const [likedMovies, setLikedMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [tab, setTab] = useState('watched')

  useEffect(() => {
    loadUserData()
  }, [userId])

  const loadUserData = async () => {
    setLoading(true)
    try {
      const { data: p, error: pe } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (pe) throw pe
      setProfile(p)

      const [wh, rv, lm] = await Promise.all([
        supabase.from('watch_history').select('*').eq('user_id', userId).order('watched_at', { ascending: false }).limit(50),
        supabase.from('reviews').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        supabase.from('liked_movies').select('*').eq('user_id', userId).order('liked_at', { ascending: false }).limit(50),
      ])
      if (wh.error) throw wh.error
      if (rv.error) throw rv.error
      if (lm.error) throw lm.error
      setWatchHistory(wh.data || [])
      setReviews(rv.data || [])
      setLikedMovies(lm.data || [])
    } catch (err) {
      console.error('Error loading user data:', err)
      toast.error('Failed to load user data')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWatchEntry = async (entryId) => {
    setDeleting(entryId)
    try {
      const { error } = await supabase.from('watch_history').delete().eq('id', entryId)
      if (error) throw error
      setWatchHistory(prev => prev.filter(e => e.id !== entryId))
      toast.success('Watch entry deleted')
    } catch (err) {
      toast.error(err.message || 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteReview = async (reviewId) => {
    setDeleting(reviewId)
    try {
      const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
      if (error) throw error
      setReviews(prev => prev.filter(r => r.id !== reviewId))
      toast.success('Review deleted')
    } catch (err) {
      toast.error(err.message || 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteLiked = async (likeId) => {
    setDeleting(likeId)
    try {
      const { error } = await supabase.from('liked_movies').delete().eq('id', likeId)
      if (error) throw error
      setLikedMovies(prev => prev.filter(l => l.id !== likeId))
      toast.success('Like removed')
    } catch (err) {
      toast.error(err.message || 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  const tabs = [
    { id: 'watched', label: 'Watched', count: watchHistory.length, icon: Eye },
    { id: 'reviews', label: 'Reviews', count: reviews.length, icon: MessageSquare },
    { id: 'liked', label: 'Liked', count: likedMovies.length, icon: Heart },
  ]

  return (
    <div className="min-h-screen bg-background pt-28 pb-16">
      <div className="page-shell-wide max-w-5xl">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className="flex items-start gap-6 mb-8">
          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-3xl font-bold text-foreground">
                {(profile?.full_name || profile?.username || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-foreground">{profile?.full_name || profile?.username || 'Unnamed'}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{profile?.email || 'No email'}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              {profile?.role === 'admin' ? <Shield className="w-4 h-4 text-purple-500" /> : profile?.role === 'parent' ? <Crown className="w-4 h-4 text-amber-500" /> : profile?.role === 'child' ? <Star className="w-4 h-4 text-blue-500" /> : <User className="w-4 h-4 text-zinc-400" />}
              <span className="text-sm font-bold uppercase tracking-wider text-foreground">{profile?.role || 'user'}</span>
              {profile?.is_suspended && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">SUSPENDED</span>}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-card text-muted-foreground hover:text-foreground border border-border'}`}>
              <t.icon className="w-4 h-4" />
              {t.label}
              <span className="text-xs opacity-60">({t.count})</span>
            </button>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {tab === 'watched' && (
            watchHistory.length === 0 ? (
              <div className="p-12 text-center"><Eye className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No watch history</p></div>
            ) : (
              <div className="divide-y divide-border">
                {watchHistory.map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors">
                    {entry.poster_url ? (
                      <img src={entry.poster_url} alt="" className="w-10 h-14 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-14 rounded bg-muted flex items-center justify-center"><Eye className="w-4 h-4 text-muted-foreground" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{entry.title || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(entry.watched_at || entry.created_at).toLocaleString()}</p>
                    </div>
                    {entry.progress > 0 && <span className="text-xs text-muted-foreground">{Math.round(entry.progress)}m</span>}
                    <button onClick={() => handleDeleteWatchEntry(entry.id)} disabled={deleting === entry.id} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-all disabled:opacity-50">
                      {deleting === entry.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'reviews' && (
            reviews.length === 0 ? (
              <div className="p-12 text-center"><MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No reviews</p></div>
            ) : (
              <div className="divide-y divide-border">
                {reviews.map(review => (
                  <div key={review.id} className="p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{review.movie_title || review.title || 'Unknown'}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < (review.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`} />)}
                        </div>
                        {review.content && <p className="text-sm text-muted-foreground mt-2">{review.content}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{new Date(review.created_at).toLocaleString()}</p>
                      </div>
                      <button onClick={() => handleDeleteReview(review.id)} disabled={deleting === review.id} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-all disabled:opacity-50 ml-3">
                        {deleting === review.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'liked' && (
            likedMovies.length === 0 ? (
              <div className="p-12 text-center"><Heart className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No liked movies</p></div>
            ) : (
              <div className="divide-y divide-border">
                {likedMovies.map(like => (
                  <div key={like.id} className="flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors">
                    {like.poster_url ? (
                      <img src={like.poster_url} alt="" className="w-10 h-14 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-14 rounded bg-muted flex items-center justify-center"><Heart className="w-4 h-4 text-pink-500" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{like.title || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(like.liked_at || like.created_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleDeleteLiked(like.id)} disabled={deleting === like.id} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-all disabled:opacity-50">
                      {deleting === like.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default UserDetail
