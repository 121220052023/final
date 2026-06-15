import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Shield, Clock, Ban, Save, Loader2, User, Lock, Unlock } from 'lucide-react'
import { useParentalControls } from '../../context/ParentalControlContext'
import { parentalService } from '../../services/parentalService'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

const RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17']
const GENRES = ['Action', 'Horror', 'Thriller', 'Drama', 'Comedy', 'Romance', 'Sci-Fi', 'Fantasy', 'Animation', 'Documentary', 'Crime', 'Mystery']

const ChildProfile = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { familyGroup, familyMembers, updateChildProfile } = useParentalControls()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [childData, setChildData] = useState({
    custom_max_rating: '',
    custom_blocked_genres: [],
    custom_daily_limit_minutes: '',
    custom_bedtime_start: '',
    custom_bedtime_end: '',
    pin: '',
    max_watch_count: -1,
  })
  const [activityLogs, setActivityLogs] = useState([])
  const [watchRequests, setWatchRequests] = useState([])

  const [childProfileData, setChildProfileData] = useState(null)
  const [accountLocked, setAccountLocked] = useState(false)
  const [togglingLock, setTogglingLock] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!familyGroup || !userId) return
      try {
        const [logs, requests, profile] = await Promise.all([
          parentalService.getActivityLogs(familyGroup.id),
          parentalService.getWatchRequests(familyGroup.id, 'all'),
          supabase.from('child_profiles').select('*').eq('user_id', userId).eq('family_group_id', familyGroup.id).maybeSingle()
        ])
        setActivityLogs(logs.filter(l => l.user_id === userId))
        setWatchRequests(requests.filter(r => r.child_user_id === userId))
        if (profile.data) {
          setChildProfileData(profile.data)
          setAccountLocked(profile.data.account_locked || false)
          setChildData({
            custom_max_rating: profile.data.custom_max_rating || '',
            custom_blocked_genres: profile.data.custom_blocked_genres || [],
            custom_daily_limit_minutes: profile.data.custom_daily_limit_minutes?.toString() || '',
            custom_bedtime_start: profile.data.custom_bedtime_start || '',
            custom_bedtime_end: profile.data.custom_bedtime_end || '',
            pin: profile.data.pin || '',
            max_watch_count: profile.data.max_watch_count ?? -1,
          })
        }
      } catch (error) {
        console.error('Error loading child data:', error?.message || error)
        if (error?.details) console.error('Details:', error.details)
        if (error?.hint) console.error('Hint:', error.hint)
        if (error?.code) console.error('Code:', error.code)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [familyGroup, userId])

  const child = familyMembers?.find(m => m.user_id === userId)
  const childProfile = child?.profiles

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateChildProfile(userId, {
        custom_max_rating: childData.custom_max_rating || null,
        custom_blocked_genres: childData.custom_blocked_genres,
        custom_daily_limit_minutes: childData.custom_daily_limit_minutes ? parseInt(childData.custom_daily_limit_minutes) : null,
        custom_bedtime_start: childData.custom_bedtime_start || null,
        custom_bedtime_end: childData.custom_bedtime_end || null,
        pin: childData.pin || null,
        max_watch_count: childData.max_watch_count !== '' ? parseInt(childData.max_watch_count) : -1,
      })
      toast.success('Child settings saved')
    } catch (error) {
      console.error('Error saving child profile:', error?.message || error)
      if (error?.details) console.error('Details:', error.details)
      if (error?.hint) console.error('Hint:', error.hint)
      if (error?.code) console.error('Code:', error.code)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleLock = async () => {
    setTogglingLock(true)
    try {
      const newLocked = !accountLocked
      const { error } = await supabase
        .from('child_profiles')
        .upsert({
          family_group_id: familyGroup.id,
          user_id: userId,
          account_locked: newLocked,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'family_group_id,user_id' })
      if (error) throw error
      setAccountLocked(newLocked)
      toast.success(newLocked ? 'Account locked' : 'Account unlocked')
    } catch (error) {
      console.error('Error toggling lock:', error?.message || error)
      toast.error('Failed to update lock status')
    } finally {
      setTogglingLock(false)
    }
  }

  const toggleGenre = (genre) => {
    setChildData(prev => ({
      ...prev,
      custom_blocked_genres: prev.custom_blocked_genres.includes(genre)
        ? prev.custom_blocked_genres.filter(g => g !== genre)
        : [...prev.custom_blocked_genres, genre],
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 -500 -transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center">
              <User className="w-8 h-8 text-purple-500" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-foreground">{childProfile?.username || 'Child Profile'}</h1>
                <button
                  onClick={handleToggleLock}
                  disabled={togglingLock}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    accountLocked
                      ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {togglingLock ? <Loader2 className="w-4 h-4 animate-spin" /> : accountLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  {accountLocked ? 'Locked' : 'Lock Account'}
                </button>
              </div>
              <p className="text-muted-foreground mt-1">Manage settings and monitor activity</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-500" />
              Content Rating Override
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setChildData(prev => ({ ...prev, custom_max_rating: '' }))}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  !childData.custom_max_rating
                    ? 'bg-muted text-muted-foreground  '
                    : 'bg-muted text-muted-foreground hover:bg-muted/80  '
                }`}
              >
                Use Group Default
              </button>
              {RATINGS.map((rating) => (
                <button
                  key={rating}
                  onClick={() => setChildData(prev => ({ ...prev, custom_max_rating: rating }))}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                    childData.custom_max_rating === rating
                      ? 'bg-purple-600 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              Additional Blocked Genres
            </h3>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    childData.custom_blocked_genres.includes(genre)
                      ? 'bg-red-500/20 text-red-500  -500/30'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80  '
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Custom Time Limits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Daily Limit (minutes)</label>
                <input
                  type="number"
                  value={childData.custom_daily_limit_minutes}
                  onChange={(e) => setChildData(prev => ({ ...prev, custom_daily_limit_minutes: e.target.value }))}
                  className="w-full p-3 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground"
                  placeholder="Use Group Default"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Bedtime Start</label>
                <input
                  type="time"
                  value={childData.custom_bedtime_start}
                  onChange={(e) => setChildData(prev => ({ ...prev, custom_bedtime_start: e.target.value }))}
                  className="w-full p-3 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Bedtime End</label>
                <input
                  type="time"
                  value={childData.custom_bedtime_end}
                  onChange={(e) => setChildData(prev => ({ ...prev, custom_bedtime_end: e.target.value }))}
                  className="w-full p-3 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Max Videos (-1 = unlimited)</label>
                <input
                  type="number"
                  value={childData.max_watch_count}
                  onChange={(e) => setChildData(prev => ({ ...prev, max_watch_count: e.target.value }))}
                  className="w-full p-3 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground"
                  placeholder="-1 = Unlimited"
                  min={-1}
                />
              </div>
            </div>
          </motion.div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl glass-immersive transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Child Settings
            </button>
          </div>

          {watchRequests.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Watch Requests</h3>
              <div className="space-y-3">
                {watchRequests.slice(0, 5).map((req) => (
                  <div key={req.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                    {req.movie_poster && (
                      <img src={req.movie_poster} alt={req.movie_title} className="w-10 h-14 object-cover rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{req.movie_title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(req.requested_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      req.status === 'approved' ? 'bg-primary/10 text-primary' :
                      req.status === 'denied' ? 'bg-red-500/10 text-red-500' :
                      'bg-amber-500/10 text-amber-500'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activityLogs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Recent Activity</h3>
              <div className="space-y-2">
                {activityLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChildProfile
