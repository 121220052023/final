import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Shield, Crown, Clock, Lock, Unlock, Trash2,
  Ban, Search, Mail, Loader2, Sparkles, MoreHorizontal, Heart, MessageSquare, Plus, X, RotateCcw,
  Eye, EyeOff, AlertTriangle, CalendarDays, Gift
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import AdminSidebar from '../../components/AdminSidebar'

const AdminDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [parentRequests, setParentRequests] = useState([])
  const [deletedUsers, setDeletedUsers] = useState([])
  const [childLockMap, setChildLockMap] = useState({})
  const [formReady, setFormReady] = useState(false)
  const [formUnlocked, setFormUnlocked] = useState(false)
  const [modalKey, setModalKey] = useState(0)
  const [createForm, setCreateForm] = useState({ email: '', password: '', full_name: '', role: 'user' })
  const [creating, setCreating] = useState(false)
  const [showMakeAdminModal, setShowMakeAdminModal] = useState(false)
  const [makeAdminTargetId, setMakeAdminTargetId] = useState(null)
  const [makeAdminPassword, setMakeAdminPassword] = useState('')
  const [makeAdminConfirm, setMakeAdminConfirm] = useState('')
  const [showChangePlanModal, setShowChangePlanModal] = useState(false)
  const [changePlanTarget, setChangePlanTarget] = useState(null)
  const [changePlanTargetName, setChangePlanTargetName] = useState('')
  const [changePlanNewPlan, setChangePlanNewPlan] = useState('free')
  const [changePlanLoading, setChangePlanLoading] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailTarget, setEmailTarget] = useState(null)
  const [emailTargetName, setEmailTargetName] = useState('')
  const [emailForm, setEmailForm] = useState({ subject: '', message: '' })
  const [emailLoading, setEmailLoading] = useState(false)
  const [notifyInactiveLoading, setNotifyInactiveLoading] = useState(false)
  const [lastLoginMap, setLastLoginMap] = useState({})
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspendTarget, setSuspendTarget] = useState(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendDuration, setSuspendDuration] = useState('permanent')
  const [suspendCustomDays, setSuspendCustomDays] = useState(7)
  const [stats, setStats] = useState({
    total: 0, admins: 0, parents: 0, users: 0, children: 0, suspended: 0,
    totalWatchTime: 0, totalLikes: 0,
  })

  useEffect(() => {
    loadUsers()
    loadParentRequests()
    loadDeletedUsers()
  }, [])

  const loadParentRequests = async () => {
    try {
      const { data, error } = await supabase.from('parent_role_requests').select('*, profiles:user_id(id, email, username, full_name, avatar_url)').eq('status', 'pending').order('created_at', { ascending: false })
      if (error) throw error
      setParentRequests(data || [])
    } catch (err) {
      console.error('Error loading parent requests:', err)
    }
  }

  const loadDeletedUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_deleted_users')
      if (error) throw error
      setDeletedUsers(data || [])
    } catch (err) {
      console.error('Error loading deleted users:', err)
      toast.error('Failed to load deleted users')
    }
  }

  const handleApproveParent = async (requestId, userId) => {
    setActionLoading(requestId)
    try {
      const { error: e1 } = await supabase.from('parent_role_requests').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', requestId)
      if (e1) throw e1
      const { error: e2 } = await supabase.rpc('admin_update_profile', { target_user_id: userId, updates: { role: 'parent' } })
      if (e2) throw e2
      toast.success('Parent role approved')
      loadParentRequests()
      loadUsers()
    } catch (err) {
      toast.error(err.message || 'Failed to approve')
    } finally { setActionLoading(null) }
  }

  const handleDenyParent = async (requestId) => {
    setActionLoading(requestId)
    try {
      const { error } = await supabase.from('parent_role_requests').update({ status: 'denied', reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', requestId)
      if (error) throw error
      toast.success('Request denied')
      loadParentRequests()
    } catch (err) {
      toast.error(err.message || 'Failed to deny')
    } finally { setActionLoading(null) }
  }

  const handleRestoreUser = async (userId) => {
    setActionLoading(userId)
    try {
      const { error } = await supabase.rpc('admin_update_profile', {
        target_user_id: userId,
        updates: { deleted_at: null, is_suspended: false, suspended_reason: null }
      })
      if (error) throw error
      toast.success('User restored')
      loadDeletedUsers()
      loadUsers()
    } catch (err) {
      toast.error(err.message || 'Failed to restore')
    } finally { setActionLoading(null) }
  }

  const handlePermanentDelete = async (userId) => {
    if (!window.confirm('Permanently delete this user? This removes all data including auth record. Cannot be undone.')) return
    setActionLoading(userId)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      const delRes = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await delRes.json()
      if (!delRes.ok) throw new Error(data.error || 'Failed to delete user')
      if (data?.error) throw new Error(data.error)
      toast.success('Account permanently deleted')
      loadDeletedUsers()
      loadUsers()
    } catch (err) {
      toast.error(err.message || 'Failed to permanently delete')
    } finally { setActionLoading(null) }
  }

  useEffect(() => {
    if (showCreateModal) {
      setFormReady(false)
      setFormUnlocked(false)
      setCreateForm({ email: '', password: '', full_name: '', role: 'user' })
      const t1 = setTimeout(() => setFormReady(true), 400)
      const t2 = setTimeout(() => setFormUnlocked(true), 700)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [showCreateModal])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_all_users')
      if (error) throw error
      setUsers(data || [])

      const childIds = (data || []).filter(u => u.role === 'child').map(u => u.user_id)
      let childLockMap = {}
      if (childIds.length > 0) {
        const { data: profiles } = await supabase
          .from('child_profiles')
          .select('user_id, account_locked')
          .in('user_id', childIds)
        if (profiles) {
          profiles.forEach(p => { childLockMap[p.user_id] = p.account_locked })
        }
      }
      setChildLockMap(childLockMap)

      const s = { total: 0, admins: 0, parents: 0, users: 0, children: 0, suspended: 0, totalWatchTime: 0, totalLikes: 0 }
      for (const u of data || []) {
        s.total++
        if (u.role === 'admin') s.admins++
        else if (u.role === 'parent') s.parents++
        else if (u.role === 'child') s.children++
        else s.users++
        if (u.is_suspended) s.suspended++
        s.totalWatchTime += u.total_watch_time || 0
        s.totalLikes += u.liked_count || 0
      }
      setStats(s)

      const lastLoginData = {}
      for (const u of data || []) {
        if (u.last_sign_in_at) {
          lastLoginData[u.user_id] = u.last_sign_in_at
        }
      }
      setLastLoginMap(lastLoginData)
    } catch (err) {
      console.error('Error loading users:', err)
      toast.error('Failed to load users. Check RLS permissions.')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSuspend = async (userId, reason = '', duration = 'permanent', customDays = 7) => {
    setActionLoading(userId)
    try {
      const updates = {
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspended_reason: reason || 'Violated terms of service',
      }
      if (duration === 'permanent') {
        updates.suspended_until = null
      } else {
        const days = duration === 'custom' ? customDays : parseInt(duration)
        const until = new Date()
        until.setDate(until.getDate() + days)
        updates.suspended_until = until.toISOString()
      }
      const { error } = await supabase
        .rpc('admin_update_profile', {
          target_user_id: userId,
          updates,
        })
      if (error) throw error
      toast.success(duration === 'permanent' ? 'Account suspended permanently' : `Account suspended for ${duration === 'custom' ? customDays : duration} days`)
      loadUsers()
    } catch (err) {
      toast.error(err.message || 'Failed to suspend account')
    } finally { setActionLoading(null) }
  }

  const handleUnsuspend = async (userId) => {
    setActionLoading(userId)
    try {
      const { error } = await supabase
        .rpc('admin_update_profile', {
          target_user_id: userId,
          updates: { is_suspended: false, suspended_at: null, suspended_reason: null, suspended_until: null }
        })
      if (error) throw error
      toast.success('Account restored')
      loadUsers()
    } catch (err) {
      toast.error(err.message || 'Failed to restore account')
    } finally { setActionLoading(null) }
  }

  const handleSoftDelete = async (userId) => {
    if (!window.confirm('Soft delete this user? Their data will be hidden. They can be restored later.')) return
    setActionLoading(userId)
    try {
      const { error } = await supabase
        .rpc('admin_update_profile', {
          target_user_id: userId,
          updates: { deleted_at: new Date().toISOString(), is_suspended: true, suspended_reason: 'Account deleted by admin' }
        })
      if (error) throw error
      toast.success('Account soft deleted')
      loadUsers()
      loadDeletedUsers()
    } catch (err) {
      toast.error(err.message || 'Failed to delete account')
    } finally { setActionLoading(null) }
  }

  const handleSetRole = async (userId, newRole) => {
    setActionLoading(userId)
    try {
      const { error } = await supabase.rpc('admin_update_profile', {
        target_user_id: userId,
        updates: { role: newRole }
      })
      if (error) throw error
      toast.success(`Role updated to ${newRole}`)
      loadUsers()
    } catch (err) {
      toast.error(err.message || 'Failed to update role')
    } finally { setActionLoading(null) }
  }

  const handleAdminToggleLock = async (userId, currentlyLocked) => {
    setActionLoading(userId)
    try {
      const { data: existing } = await supabase
        .from('child_profiles')
        .select('id, family_group_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('child_profiles')
          .update({
            account_locked: !currentlyLocked,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('child_profiles')
          .insert({
            user_id: userId,
            account_locked: !currentlyLocked,
            last_active_date: new Date().toISOString().slice(0, 10),
            updated_at: new Date().toISOString(),
          })
        if (error) throw error
      }
      toast.success(!currentlyLocked ? 'Account locked by admin' : 'Account unlocked by admin')
      loadUsers()
    } catch (err) {
      toast.error(err.message || 'Failed to toggle lock')
    } finally { setActionLoading(null) }
  }

  const openMakeAdminModal = (userId) => {
    setMakeAdminTargetId(userId)
    setMakeAdminPassword('')
    setMakeAdminConfirm('')
    setShowMakeAdminModal(true)
  }

  const handleConfirmMakeAdmin = async () => {
    if (!makeAdminPassword) {
      toast.error('Enter your password to confirm')
      return
    }
    if (makeAdminConfirm !== 'CONFIRM') {
      toast.error('Type CONFIRM to acknowledge')
      return
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: makeAdminPassword,
    })
    if (signInError) {
      toast.error('Wrong password')
      return
    }
    setActionLoading(makeAdminTargetId)
    try {
      const { error } = await supabase.rpc('admin_update_profile', {
        target_user_id: makeAdminTargetId,
        updates: { role: 'admin' }
      })
      if (error) throw error
      toast.success('User promoted to admin permanently')
      setShowMakeAdminModal(false)
      loadUsers()
    } catch (err) {
      toast.error(err.message || 'Failed to update role')
    } finally { setActionLoading(null) }
  }

  const handleChangePlan = async () => {
    if (!changePlanTarget) return
    setChangePlanLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      const res = await fetch('/api/stripe/admin-change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: changePlanTarget,
          newPlan: changePlanNewPlan,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to change plan')
      toast.success(`Plan changed to ${changePlanNewPlan}`)
      setShowChangePlanModal(false)
      loadUsers()
    } catch (err) {
      toast.error(err.message || 'Failed to change plan')
    } finally {
      setChangePlanLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!createForm.email || !createForm.password || !createForm.full_name) {
      toast.error('Email, password, and full name are required')
      return
    }
    setCreating(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: createForm.email,
          password: createForm.password,
          role: createForm.role,
          full_name: createForm.full_name,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      if (body.error) throw new Error(body.error)
      toast.success('User created successfully')
      setShowCreateModal(false)
      setCreateForm({ email: '', password: '', full_name: '', role: 'user' })
      loadUsers()
    } catch (err) {
      toast.error(err.message || 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  const handleSendEmail = async () => {
    if (!emailForm.subject || !emailForm.message) {
      toast.error('Subject and message are required')
      return
    }
    setEmailLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: emailTarget,
          subject: emailForm.subject,
          message: emailForm.message,
        }),
      })
      const bodyText = await res.text()
      let body
      try { body = JSON.parse(bodyText) } catch { body = {} }
      if (!res.ok) throw new Error(body?.error || 'Failed to send email (API not available in dev mode — deploy to Vercel)')
      toast.success(`Email sent to ${emailTargetName}`)
      setShowEmailModal(false)
      setEmailForm({ subject: '', message: '' })
    } catch (err) {
      toast.error(err.message || 'Failed to send email')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleNotifyInactive = async () => {
    const days = prompt('Notify users inactive for how many days?', '30')
    if (!days || isNaN(days)) return
    setNotifyInactiveLoading(true)
    try {
      const now = new Date()
      const cutoff = new Date(now.getTime() - parseInt(days) * 24 * 60 * 60 * 1000)
      const inactiveUsers = users.filter(u => {
        const lastLogin = lastLoginMap[u.user_id]
        if (!lastLogin) return false
        return new Date(lastLogin) < cutoff
      })
      if (inactiveUsers.length === 0) {
        toast.info('No inactive users found')
        setNotifyInactiveLoading(false)
        return
      }
      if (!confirm(`Send reminder email to ${inactiveUsers.length} inactive users?`)) {
        setNotifyInactiveLoading(false)
        return
      }
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      let sent = 0
      for (const u of inactiveUsers) {
        try {
          const res = await fetch('/api/email/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: u.user_id,
              subject: 'We miss you at Oceanic!',
              message: `Hi ${u.full_name || u.username || 'there'},

We noticed you haven't logged into Oceanic for a while. We've added new movies, series, and books since your last visit.

Come back and explore what's new!

- The Oceanic Team`,
            }),
          })
          const body = await res.json()
          if (res.ok) sent++
        } catch (e) {
          console.error('Failed to notify', u.email, e)
        }
      }
      toast.success(`Sent ${sent} of ${inactiveUsers.length} reminder emails`)
    } catch (err) {
      toast.error(err.message || 'Failed to send notifications')
    } finally {
      setNotifyInactiveLoading(false)
    }
  }

  const handleSendWelcomeEmail = async (userId, userName) => {
    setActionLoading(userId)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          subject: 'Welcome to Oceanic!',
          message: `Hi ${userName || 'there'}!

Welcome to Oceanic! We're thrilled to have you on board.

You now have access to thousands of movies, TV series, and books all in one place. Here's what you can do:

- Browse and search for your favorite movies and shows
- Create watchlists to keep track of what you want to watch
- Rate and review content you've enjoyed
- Discover personalized recommendations

If you ever need help, just reach out. Enjoy your journey!

- The Oceanic Team`,
        }),
      })
      const bodyText = await res.text()
      let body
      try { body = JSON.parse(bodyText) } catch { body = {} }
      if (!res.ok) throw new Error(body?.error || 'Failed to send email (API not available in dev mode — deploy to Vercel)')
      toast.success(`Welcome email sent to ${userName}`)
    } catch (err) {
      toast.error(err.message || 'Failed to send welcome email')
    } finally { setActionLoading(null) }
  }

  const openSuspendModal = (userId) => {
    setSuspendTarget(userId)
    setSuspendReason('')
    setSuspendDuration('permanent')
    setSuspendCustomDays(7)
    setShowSuspendModal(true)
  }

  const handleConfirmSuspend = () => {
    if (!suspendTarget) return
    handleSuspend(suspendTarget, suspendReason, suspendDuration, suspendCustomDays)
    setShowSuspendModal(false)
  }

  const filteredUsers = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (u.email || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    )
  })

  const roleBadge = (role) => {
    const styles = {
      admin: 'admin-badge border-purple-500/30 text-purple-500',
      parent: 'admin-badge border-amber-500/30 text-amber-500',
      child: 'admin-badge border-blue-500/30 text-blue-500',
      user: 'admin-badge border-border text-muted-foreground',
    }
    return (
      <span className={styles[role] || styles.user}>
        {role || 'user'}
      </span>
    )
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
          <div className="flex items-start justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="admin-glow-line" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Administration
                </span>
              </div>
              <h1 className="text-4xl font-extrabold text-foreground md:text-5xl">
                Dashboard
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage users, accounts, and platform settings
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNotifyInactive}
                disabled={notifyInactiveLoading}
                className="admin-btn-secondary h-10"
              >
                {notifyInactiveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {notifyInactiveLoading ? 'Sending...' : 'Notify Inactive'}
              </button>
              <button onClick={() => { setShowCreateModal(true); setModalKey(k => k + 1) }} className="admin-btn-primary h-10">
                <Plus className="w-4 h-4" />
                Create User
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Total Users', value: stats.total, icon: Users },
              { label: 'Admins', value: stats.admins, icon: Shield },
              { label: 'Parents', value: stats.parents, icon: Crown },
              { label: 'Users', value: stats.users, icon: Users },
              { label: 'Children', value: stats.children, icon: Sparkles },
              { label: 'Suspended', value: stats.suspended, icon: Ban },
              { label: 'Watch Time', value: `${(stats.totalWatchTime / 60).toFixed(0)}h`, icon: Clock },
              { label: 'Likes', value: stats.totalLikes, icon: Heart },
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
                <div className="mono-num text-2xl text-foreground">{item.value}</div>
                <div className="text-xs mt-0.5 text-muted-foreground">{item.label}</div>
              </motion.div>
            ))}
          </div>

          {parentRequests.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="admin-card p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-foreground">Parent Role Requests ({parentRequests.length})</h3>
              </div>
              <div className="space-y-2">
                {parentRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                        {req.profiles?.avatar_url ? (
                          <img src={req.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-amber-500/15 flex items-center justify-center text-sm font-bold text-amber-500">
                            {(req.profiles?.username || req.profiles?.full_name || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{req.profiles?.username || req.profiles?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{req.profiles?.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApproveParent(req.id, req.user_id)} disabled={actionLoading === req.id} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-500 text-xs font-bold transition-all disabled:opacity-50">
                        {actionLoading === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Approve'}
                      </button>
                      <button onClick={() => handleDenyParent(req.id)} disabled={actionLoading === req.id} className="px-3 py-1.5 rounded-lg bg-destructive/15 text-destructive text-xs font-bold transition-all disabled:opacity-50">
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <div className="relative mb-6 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="admin-search"
            />
          </div>

          <div className="admin-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Watched</th>
                    <th>Liked</th>
                    <th>Reviews</th>
                    <th>Plan</th>
                    <th>Joined</th>
                    <th>Last Login</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center">
                        <Users className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No users found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, i) => (
                      <motion.tr
                        key={u.user_id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.015 }}
                      >
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                                  {(u.full_name || u.username || u.email || '?').charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                                {u.full_name || u.username || 'Unnamed'}
                              </div>
                              <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                                {u.email || 'no-email'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            {roleBadge(u.role)}
                            {u.role === 'child' && childLockMap[u.user_id] && (
                              <span className="admin-badge border-destructive/30 text-destructive">Locked</span>
                            )}
                            {u.is_suspended && u.suspended_until && (
                              <span className="admin-badge border-amber-500/30 text-amber-500 text-[10px]">
                                {Math.ceil((new Date(u.suspended_until) - new Date()) / (1000 * 60 * 60 * 24))}d left
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm text-foreground font-medium">{u.watch_history_count || 0}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <Heart className="w-3.5 h-3.5 text-primary" />
                            <span className="text-sm text-foreground font-medium">{u.liked_count || 0}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm text-foreground font-medium">{u.review_count || 0}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-sm text-foreground font-medium">{u.plan_name || 'Free'}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-sm text-muted-foreground">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm text-muted-foreground" title={lastLoginMap[u.user_id] || ''}>
                            {lastLoginMap[u.user_id]
                              ? new Date(lastLoginMap[u.user_id]).toLocaleDateString() + ' ' + new Date(lastLoginMap[u.user_id]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-0.5">
                            {u.role === 'admin' ? (
                              <span className="w-8 h-8 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-purple-500/40" />
                              </span>
                            ) : u.is_suspended ? (
                              <button onClick={() => handleUnsuspend(u.user_id)} disabled={actionLoading === u.user_id} className="admin-btn-ghost p-1.5" title="Restore">
                                {actionLoading === u.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 text-emerald-500" />}
                              </button>
                            ) : (
                              <button onClick={() => openSuspendModal(u.user_id)} disabled={actionLoading === u.user_id} className="admin-btn-ghost p-1.5" title="Suspend">
                                {actionLoading === u.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4 text-destructive" />}
                              </button>
                            )}
                            <div className="relative group">
                              <button className="admin-btn-ghost p-1.5">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              <div className="absolute right-0 top-full mt-1 min-w-[160px] z-50 p-1.5 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all bg-card border border-border shadow-xl">
                                {u.role !== 'admin' && (
                                  <button onClick={() => openMakeAdminModal(u.user_id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 transition-all">
                                    <Shield className="w-4 h-4 text-purple-500" />
                                    Make Admin
                                  </button>
                                )}
                                {u.role !== 'parent' && u.role !== 'admin' && (
                                  <button onClick={() => handleSetRole(u.user_id, 'parent')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-all">
                                    <Crown className="w-4 h-4 text-amber-500" />
                                    Make Parent
                                  </button>
                                )}
                                <button onClick={() => navigate(`/admin/user/${u.user_id}`)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </button>
                                <button onClick={() => { navigator.clipboard.writeText(u.user_id); toast.success('User ID copied') }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                                  <Users className="w-4 h-4" />
                                  Copy User ID
                                </button>
                                <button onClick={() => handleSendWelcomeEmail(u.user_id, u.full_name || u.username || u.email || 'User')} disabled={actionLoading === u.user_id} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-all">
                                  {actionLoading === u.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" /> : <Gift className="w-4 h-4 text-emerald-500" />}
                                  Send Welcome Email
                                </button>
                                <button onClick={() => { setEmailTarget(u.user_id); setEmailTargetName(u.full_name || u.username || u.email || 'User'); setEmailForm({ subject: '', message: '' }); setShowEmailModal(true) }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                                  <Mail className="w-4 h-4 text-primary" />
                                  Send Email
                                </button>
                                <button onClick={() => { setChangePlanTarget(u.user_id); setChangePlanTargetName(u.full_name || u.username || u.email || 'User'); setChangePlanNewPlan((u.plan_name || 'free').toLowerCase()); setShowChangePlanModal(true) }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-all">
                                  <Crown className="w-4 h-4 text-amber-500" />
                                  Change Plan
                                </button>
                                {u.user_id !== user?.id && u.role !== 'admin' && (
                                  <button onClick={() => handleSoftDelete(u.user_id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                    Soft Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!loading && users.length > 0 && (
            <p className="text-xs mt-3 text-center text-muted-foreground">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          )}

          {deletedUsers.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-destructive" />
                Soft Deleted Users ({deletedUsers.length})
              </h3>
              <div className="admin-card overflow-hidden">
                {deletedUsers.map(u => (
                  <div key={u.user_id} className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center text-sm font-bold text-destructive">
                        {(u.full_name || u.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{u.full_name || u.username || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{u.email} • {u._role}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRestoreUser(u.user_id)} disabled={actionLoading === u.user_id} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-500 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5">
                        {actionLoading === u.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        Restore
                      </button>
                      {u._role !== 'admin' && (
                        <button onClick={() => handlePermanentDelete(u.user_id)} disabled={actionLoading === u.user_id} className="px-3 py-1.5 rounded-lg bg-destructive/15 text-destructive text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5">
                          {actionLoading === u.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Delete Forever
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="admin-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div key={modalKey} className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Create User</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="admin-btn-ghost p-1.5">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {formReady ? (<>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Email *</label>
                <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="email@example.com" className="admin-input" required autoComplete="off" readOnly={!formUnlocked} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Password *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Min 6 characters" className="admin-input pr-10" minLength={6} required autoComplete="new-password" readOnly={!formUnlocked} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Full Name *</label>
                <input type="text" value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} placeholder="Name" className="admin-input" autoComplete="off" required readOnly={!formUnlocked} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Role</label>
                <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className="admin-select">
                  <option value="user">User</option>
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                </select>
              </div>
              </>) : (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground/30" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="admin-btn-secondary flex-1 h-10">Cancel</button>
                <button type="submit" disabled={creating} className="admin-btn-primary flex-1 h-10">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showChangePlanModal && (
        <div className="admin-modal-overlay" onClick={() => setShowChangePlanModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Change Plan</h2>
                  <p className="text-xs text-muted-foreground">{changePlanTargetName}</p>
                </div>
              </div>
              <button onClick={() => setShowChangePlanModal(false)} className="admin-btn-ghost p-1.5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { id: 'free', label: 'Free', desc: 'Basic access, no subscription', color: 'text-muted-foreground' },
                { id: 'pro', label: 'Pro', desc: '$9.99/mo — Premium features', color: 'text-purple-500' },
                { id: 'ultimate', label: 'Ultimate', desc: '$19.99/mo — All features', color: 'text-amber-500' },
              ].map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setChangePlanNewPlan(plan.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                    changePlanNewPlan === plan.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    changePlanNewPlan === plan.id ? 'border-primary' : 'border-muted-foreground/40'
                  }`}>
                    {changePlanNewPlan === plan.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${plan.color}`}>{plan.label}</div>
                    <div className="text-xs text-muted-foreground">{plan.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowChangePlanModal(false)} className="admin-btn-secondary flex-1 h-10">Cancel</button>
              <button onClick={handleChangePlan} disabled={changePlanLoading} className="admin-btn-primary flex-1 h-10">
                {changePlanLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                {changePlanLoading ? 'Changing...' : `Change to ${changePlanNewPlan.charAt(0).toUpperCase() + changePlanNewPlan.slice(1)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMakeAdminModal && (
        <div className="admin-modal-overlay" onClick={() => setShowMakeAdminModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-destructive/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Promote to Admin</h2>
                <p className="text-xs text-muted-foreground">This action is irreversible</p>
              </div>
            </div>

            <div className="rounded-xl p-4 mb-5 bg-destructive/5 border border-destructive/15">
              <p className="text-sm font-semibold text-destructive mb-1">⚠ Irreversible Action</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Once promoted to admin, this user cannot be demoted back to a normal role. 
                Admins cannot be suspended, soft deleted, or permanently deleted. 
                They will have full platform control permanently.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Your Password *</label>
                <input type="password" value={makeAdminPassword} onChange={(e) => setMakeAdminPassword(e.target.value)} placeholder="Enter your password to confirm" className="admin-input" autoComplete="off" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Type CONFIRM *</label>
                <input type="text" value={makeAdminConfirm} onChange={(e) => setMakeAdminConfirm(e.target.value)} placeholder='Type "CONFIRM" to acknowledge' className="admin-input" autoComplete="off" />
              </div>
            </div>

            <div className="flex gap-3 pt-5">
              <button onClick={() => setShowMakeAdminModal(false)} className="admin-btn-secondary flex-1 h-10">Cancel</button>
              <button onClick={handleConfirmMakeAdmin} disabled={actionLoading === makeAdminTargetId} className="admin-btn-primary flex-1 h-10">
                {actionLoading === makeAdminTargetId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {actionLoading === makeAdminTargetId ? 'Processing...' : 'Make Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div className="admin-modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Send Email</h2>
                  <p className="text-xs text-muted-foreground">{emailTargetName}</p>
                </div>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="admin-btn-ghost p-1.5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Subject *</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  placeholder="Email subject"
                  className="admin-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Message *</label>
                <textarea
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                  placeholder="Write your message here..."
                  className="admin-input min-h-[160px] resize-y"
                  rows={6}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowEmailModal(false)} className="admin-btn-secondary flex-1 h-10">Cancel</button>
              <button onClick={handleSendEmail} disabled={emailLoading} className="admin-btn-primary flex-1 h-10">
                {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {emailLoading ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuspendModal && (
        <div className="admin-modal-overlay" onClick={() => setShowSuspendModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Ban className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Suspend Account</h2>
                  <p className="text-xs text-muted-foreground">Temporary or permanent suspension</p>
                </div>
              </div>
              <button onClick={() => setShowSuspendModal(false)} className="admin-btn-ghost p-1.5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 mb-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Reason</label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Why is this account being suspended?"
                  className="admin-input min-h-[80px] resize-y"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Duration</label>
                <div className="space-y-2">
                  {[
                    { id: 'permanent', label: 'Permanent', desc: 'Manual unsuspension required', icon: Ban },
                    { id: '3', label: '3 Days', desc: 'Auto-unsuspend after 3 days', icon: CalendarDays },
                    { id: '7', label: '7 Days', desc: 'Auto-unsuspend after 7 days', icon: CalendarDays },
                    { id: '30', label: '30 Days', desc: 'Auto-unsuspend after 30 days', icon: CalendarDays },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSuspendDuration(opt.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        suspendDuration === opt.id
                          ? 'border-destructive bg-destructive/5'
                          : 'border-border hover:border-destructive/30'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        suspendDuration === opt.id ? 'border-destructive' : 'border-muted-foreground/40'
                      }`}>
                        {suspendDuration === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-destructive" />}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <opt.icon className={`w-4 h-4 ${suspendDuration === opt.id ? 'text-destructive' : 'text-muted-foreground'}`} />
                        <div>
                          <div className={`text-sm font-bold ${suspendDuration === opt.id ? 'text-destructive' : 'text-foreground'}`}>{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => setSuspendDuration('custom')}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      suspendDuration === 'custom'
                        ? 'border-destructive bg-destructive/5'
                        : 'border-border hover:border-destructive/30'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      suspendDuration === 'custom' ? 'border-destructive' : 'border-muted-foreground/40'
                    }`}>
                      {suspendDuration === 'custom' && <div className="w-2.5 h-2.5 rounded-full bg-destructive" />}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock className={`w-4 h-4 ${suspendDuration === 'custom' ? 'text-destructive' : 'text-muted-foreground'}`} />
                      <div>
                        <div className={`text-sm font-bold ${suspendDuration === 'custom' ? 'text-destructive' : 'text-foreground'}`}>Custom</div>
                        <div className="text-xs text-muted-foreground">Set your own duration</div>
                      </div>
                    </div>
                  </button>
                  {suspendDuration === 'custom' && (
                    <div className="flex items-center gap-2 pl-9">
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={suspendCustomDays}
                        onChange={(e) => setSuspendCustomDays(parseInt(e.target.value) || 1)}
                        className="admin-input w-24"
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowSuspendModal(false)} className="admin-btn-secondary flex-1 h-10">Cancel</button>
              <button onClick={handleConfirmSuspend} disabled={actionLoading === suspendTarget} className="admin-btn-primary flex-1 h-10 bg-destructive hover:bg-destructive/90">
                {actionLoading === suspendTarget ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                {actionLoading === suspendTarget ? 'Suspending...' : 'Suspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard