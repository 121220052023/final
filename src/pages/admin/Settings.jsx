import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, Loader2, Globe, Shield, RotateCcw, User, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'

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
      <div className="admin-body flex items-center justify-center">
        <AdminSidebar />
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/30" />
      </div>
    )
  }

  return (
    <div className="admin-body">
      <AdminSidebar />
      <div className="admin-main">
        <div className="max-w-2xl">
          <div className="flex items-start justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="admin-glow-line" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Administration</span>
              </div>
              <h1 className="text-4xl font-extrabold text-foreground md:text-5xl">
                Site Settings
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Configure global platform settings
              </p>
            </div>
            <button onClick={handleReset} className="admin-btn-ghost h-10">
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="admin-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-base font-bold text-foreground">General</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Site Name</label>
                  <input type="text" value={settings.site_name} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })} className="admin-input" placeholder="Ocean of Movies" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Site Description</label>
                  <textarea value={settings.site_description} onChange={(e) => setSettings({ ...settings, site_description: e.target.value })} className="admin-input min-h-[80px] resize-none" rows={3} placeholder="Discovery, watch later, and personal taste in one place" />
                </div>
              </div>
            </div>

            <div className="admin-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-amber-500" />
                </div>
                <h2 className="text-base font-bold text-foreground">Access Control</h2>
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
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, [item.key]: !settings[item.key] })}
                      className={`admin-toggle ${settings[item.key] ? 'on' : 'off'}`}
                    >
                      <div className="admin-toggle-knob" />
                    </button>
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Default User Role</label>
                  <select value={settings.default_user_role} onChange={(e) => setSettings({ ...settings, default_user_role: e.target.value })} className="admin-select">
                    <option value="user">User</option>
                    <option value="parent">Parent</option>
                    <option value="child">Child</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Max Free Watch Minutes</label>
                  <input type="number" value={settings.max_free_watch_minutes} onChange={(e) => setSettings({ ...settings, max_free_watch_minutes: parseInt(e.target.value) || 0 })} className="admin-input" min={0} placeholder="120" />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="admin-btn-primary h-10 px-6">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Settings