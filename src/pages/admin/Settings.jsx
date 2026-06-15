import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, Loader2, Globe, Shield, RotateCcw, User, Lock, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'

const Settings = () => {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({
    site_name: 'Ocean of Movies',
    site_description: 'Discovery, watch later, and personal taste in one place',
    maintenance_mode: false,
    allow_new_signups: true,
    require_email_verification: true,
    default_user_role: 'user',
    max_free_watch_minutes: 120,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('*').maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      if (data) {
        setSettings({
          site_name: data.site_name || 'Ocean of Movies',
          site_description: data.site_description || '',
          maintenance_mode: data.maintenance_mode || false,
          allow_new_signups: data.allow_new_signups ?? true,
          require_email_verification: data.require_email_verification ?? true,
          default_user_role: data.default_user_role || 'user',
          max_free_watch_minutes: data.max_free_watch_minutes ?? 120,
        })
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('site_settings').upsert({
        id: (await supabase.from('site_settings').select('id').maybeSingle()).data?.id || undefined,
        site_name: settings.site_name,
        site_description: settings.site_description,
        maintenance_mode: settings.maintenance_mode,
        allow_new_signups: settings.allow_new_signups,
        require_email_verification: settings.require_email_verification,
        default_user_role: settings.default_user_role,
        max_free_watch_minutes: settings.max_free_watch_minutes,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      toast.success('Settings saved successfully')
    } catch (err) {
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSettings({
      site_name: 'Ocean of Movies',
      site_description: 'Discovery, watch later, and personal taste in one place',
      maintenance_mode: false,
      allow_new_signups: true,
      require_email_verification: true,
      default_user_role: 'user',
      max_free_watch_minutes: 120,
    })
    toast.success('Settings reset to defaults')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-16">
      <div className="page-shell-wide max-w-3xl">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between gap-6">
          <div>
            <div className="section-label">Administration</div>
            <h1 className="display-font mt-3 text-5xl font-bold leading-[0.92] md:text-6xl">
              Site Settings
            </h1>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              Configure global platform settings
            </p>
          </div>
          <button onClick={handleReset} className="btn-ghost h-11 px-4 rounded-xl font-bold flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </motion.div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">General</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Site Name</label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    type="text" 
                    value={settings.site_name} 
                    onChange={(e) => setSettings({ ...settings, site_name: e.target.value })} 
                    className="auth-input pl-11" 
                    placeholder="Ocean of Movies"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Site Description</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <textarea 
                    value={settings.site_description} 
                    onChange={(e) => setSettings({ ...settings, site_description: e.target.value })} 
                    className="auth-input pl-11 min-h-[80px] resize-none pr-4" 
                    placeholder="Discovery, watch later, and personal taste in one place"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-amber-500" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Access Control</h2>
            </div>
            <div className="space-y-4">
              {[
                { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Block all user access to the platform' },
                { key: 'allow_new_signups', label: 'Allow New Signups', desc: 'Let new users create accounts' },
                { key: 'require_email_verification', label: 'Require Email Verification', desc: 'Users must verify their email before accessing content' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                  <button type="button" onClick={() => setSettings({ ...settings, [item.key]: !settings[item.key] })} className={`relative w-11 h-6 rounded-full transition-all ${settings[item.key] ? 'bg-primary' : 'bg-muted'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all ${settings[item.key] ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Default User Role</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select 
                    value={settings.default_user_role} 
                    onChange={(e) => setSettings({ ...settings, default_user_role: e.target.value })} 
                    className="auth-input pl-11 appearance-none bg-white dark:bg-black"
                    style={{ backgroundImage: 'none' }}
                  >
                    <option value="user">User</option>
                    <option value="parent">Parent</option>
                    <option value="child">Child</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Max Free Watch Minutes</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    type="number" 
                    value={settings.max_free_watch_minutes} 
                    onChange={(e) => setSettings({ ...settings, max_free_watch_minutes: parseInt(e.target.value) || 0 })} 
                    className="auth-input pl-11" 
                    min={0}
                    placeholder="120"
                  />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary h-12 px-8 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 ml-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Settings
