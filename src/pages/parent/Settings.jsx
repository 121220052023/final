import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Clock, Ban, Eye, Save, Loader2, AlertTriangle } from 'lucide-react'
import { useParentalControls } from '../../context/ParentalControlContext'

const RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17']
const GENRES = ['Action', 'Horror', 'Thriller', 'Drama', 'Comedy', 'Romance', 'Sci-Fi', 'Fantasy', 'Animation', 'Documentary', 'Crime', 'Mystery', 'War', 'Western']

const ParentSettings = () => {
  const { parentalSettings, updateParentalSettings, familyMembers, updateChildProfile } = useParentalControls()
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    max_rating: parentalSettings?.max_rating || 'PG-13',
    blocked_genres: parentalSettings?.blocked_genres || [],
    blocked_keywords: (parentalSettings?.blocked_keywords || []).join(', '),
    daily_watch_limit_minutes: parentalSettings?.daily_watch_limit_minutes || 120,
    bedtime_start: parentalSettings?.bedtime_start || '22:00',
    bedtime_end: parentalSettings?.bedtime_end || '07:00',
    require_approval: parentalSettings?.require_approval || false,
    block_adult_content: parentalSettings?.block_adult_content ?? true,
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateParentalSettings({
        ...settings,
        blocked_keywords: settings.blocked_keywords.split(',').map(k => k.trim()).filter(Boolean),
      })
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleGenre = (genre) => {
    setSettings(prev => ({
      ...prev,
      blocked_genres: prev.blocked_genres.includes(genre)
        ? prev.blocked_genres.filter(g => g !== genre)
        : [...prev.blocked_genres, genre],
    }))
  }

  const children = familyMembers?.filter(m => m.role === 'child') || []

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-foreground">Parental Controls</h1>
          <p className="text-muted-foreground mt-1">Configure content filters and restrictions for your family</p>
        </div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-500" />
              Content Rating
            </h3>
            <div className="flex gap-2">
              {RATINGS.map((rating) => (
                <button
                  key={rating}
                  onClick={() => setSettings(prev => ({ ...prev, max_rating: rating }))}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                    settings.max_rating === rating
                      ? 'bg-purple-600 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Content rated higher than {settings.max_rating} will be blocked
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              Blocked Genres
            </h3>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    settings.blocked_genres.includes(genre)
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
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Blocked Keywords
            </h3>
            <textarea
              value={settings.blocked_keywords}
              onChange={(e) => setSettings(prev => ({ ...prev, blocked_keywords: e.target.value }))}
              className="w-full p-3 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground text-sm"
              placeholder="Enter keywords separated by commas (e.g., violence, gore, explicit)"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Content with these keywords in the title or description will be blocked
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Time Limits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Daily Limit (minutes)</label>
                <input
                  type="number"
                  value={settings.daily_watch_limit_minutes}
                  onChange={(e) => setSettings(prev => ({ ...prev, daily_watch_limit_minutes: parseInt(e.target.value) || 0 }))}
                  className="w-full p-3 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Bedtime Start</label>
                <input
                  type="time"
                  value={settings.bedtime_start}
                  onChange={(e) => setSettings(prev => ({ ...prev, bedtime_start: e.target.value }))}
                  className="w-full p-3 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Bedtime End</label>
                <input
                  type="time"
                  value={settings.bedtime_end}
                  onChange={(e) => setSettings(prev => ({ ...prev, bedtime_end: e.target.value }))}
                  className="w-full p-3 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-foreground"
                />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Approval & Restrictions
            </h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-foreground">Require Approval</p>
                  <p className="text-xs text-muted-foreground">Children must request permission before watching new content</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.require_approval}
                  onChange={(e) => setSettings(prev => ({ ...prev, require_approval: e.target.checked }))}
                  className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500"
                />
              </label>
              {/* Adult content toggle removed as per discovery catalog policy */}
            </div>
          </motion.div>

          {children.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Child-Specific Settings</h3>
              <div className="space-y-4">
                {children.map((child) => (
                  <div key={child.id} className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-sm font-semibold text-foreground">{child.profiles?.username || 'Child'}</p>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Custom Max Rating</label>
                        <select
                          className="w-full p-2 bg-background rounded-lg text-sm text-foreground"
                          onChange={(e) => updateChildProfile(child.user_id, { custom_max_rating: e.target.value || null })}
                        >
                          <option value="">Use Group Default</option>
                          {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Custom Daily Limit (min)</label>
                        <input
                          type="number"
                          className="w-full p-2 bg-background rounded-lg text-sm text-foreground"
                          placeholder="Use Group Default"
                          onChange={(e) => updateChildProfile(child.user_id, { custom_daily_limit_minutes: parseInt(e.target.value) || null })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl glass-immersive transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ParentSettings
