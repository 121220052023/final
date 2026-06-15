import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Shield, Crown, Clock, Lock, Unlock, Trash2,
  Ban, Search, Mail, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Sparkles, MoreHorizontal, Heart, Eye, MessageSquare, Plus, X, RotateCcw,
  EyeOff, User
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

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
      const { data, error: invokeError } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      })
      if (invokeError) throw new Error(invokeError.message || 'Edge function error')
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

      // Fetch child_profiles for lock status
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
    } catch (err) {
      console.error('Error loading users:', err)
      toast.error('Failed to load users. Check RLS permissions.')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSuspend = async (userId, reason = '') => {
    setActionLoading(userId)
    try {
      const { error } = await supabase
        .rpc('admin_update_profile', {
          target_user_id: userId,
          updates: { is_suspended: true, suspended_at: new Date().toISOString(), suspended_reason: reason || 'Violated terms of service' }
        })
      if (error) throw error
      toast.success('Account suspended')
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
          updates: { is_suspended: false, suspended_at: null, suspended_reason: null }
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
      // Check if row exists first
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
        // Create a standalone row (no family group - admin override)
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
    // Verify admin password
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
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email: createForm.email,
            password: createForm.password,
            role: createForm.role,
            full_name: createForm.full_name,
          }),
        }
      )
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
      admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      parent: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      child: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      user: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[role] || styles.user}`}>
        {role || 'user'}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-16">
      <div className="page-shell-wide">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between gap-6">
          <div>
            <div className="section-label">Administration</div>
            <h1 className="display-font mt-3 text-5xl font-bold leading-[0.92] md:text-6xl">
              Admin Dashboard
            </h1>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              Manage users, accounts, and platform settings
            </p>
          </div>
          <button
            onClick={() => { setShowCreateModal(true); setModalKey(k => k + 1) }}
            className="btn-primary h-11 px-5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Create User
          </button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          {[
            { label: 'Total Users', value: stats.total, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Admins', value: stats.admins, icon: Shield, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { label: 'Parents', value: stats.parents, icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Users', value: stats.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Children', value: stats.children, icon: Sparkles, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
            { label: 'Suspended', value: stats.suspended, icon: Ban, color: 'text-red-500', bg: 'bg-red-500/10' },
            { label: 'Watch Time', value: `${(stats.totalWatchTime / 60).toFixed(0)}h`, icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Total Likes', value: stats.totalLikes, icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-5 border border-border"
            >
              <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div className="text-2xl font-black text-foreground">{item.value}</div>
              <div className="text-xs font-medium text-muted-foreground mt-1">{item.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Parent Role Requests */}
        {parentRequests.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-foreground">Parent Role Requests ({parentRequests.length})</h3>
            </div>
            <div className="space-y-2">
              {parentRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                      {req.profiles?.avatar_url ? (
                        <img src={req.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-500">
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
                    <button onClick={() => handleApproveParent(req.id, req.user_id)} disabled={actionLoading === req.id} className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 text-xs font-bold hover:bg-green-500/20 transition-all disabled:opacity-50">
                      {actionLoading === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Approve'}
                    </button>
                    <button onClick={() => handleDenyParent(req.id)} disabled={actionLoading === req.id} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold hover:bg-red-500/20 transition-all disabled:opacity-50">
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, username, or role..."
            className="auth-input pl-11"
          />
        </div>

        {/* Users Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Watched</th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Liked</th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Reviews</th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Plan</th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Joined</th>
                  <th className="text-right px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <Users className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No users found</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, i) => (
                    <motion.tr
                      key={u.user_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full overflow-hidden flex-shrink-0">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold text-foreground">
                                {(u.full_name || u.username || u.email || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-foreground truncate max-w-[160px]">
                              {u.full_name || u.username || 'Unnamed'}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[160px] flex items-center gap-1">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              {u.email || 'no-email'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {roleBadge(u.role)}
                          {u.role === 'child' && childLockMap[u.user_id] && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-red-500/10 text-red-500 border-red-500/20">
                              Locked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground font-medium">{u.watch_history_count || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-pink-500" />
                          <span className="text-sm text-foreground font-medium">{u.liked_count || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground font-medium">{u.review_count || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-sm text-foreground font-medium">{u.plan_name || 'Free'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-muted-foreground">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {u.role === 'admin' ? (
                            <span className="w-9 h-9 flex items-center justify-center">
                              <Shield className="w-4 h-4 text-purple-500/50" />
                            </span>
                          ) : u.is_suspended ? (
                            <button
                              onClick={() => handleUnsuspend(u.user_id)}
                              disabled={actionLoading === u.user_id}
                              className="p-2 rounded-lg hover:bg-green-500/10 text-red-400 transition-all disabled:opacity-50"
                              title="Restore"
                            >
                              {actionLoading === u.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const reason = prompt('Reason for suspension:')
                                if (reason !== null) handleSuspend(u.user_id, reason || 'Violated terms of service')
                              }}
                              disabled={actionLoading === u.user_id}
                              className={`p-2 rounded-lg transition-all disabled:opacity-50 ${
                                u.role === 'child' && childLockMap[u.user_id]
                                  ? 'text-red-500/50 hover:bg-red-500/10'
                                  : 'hover:bg-red-500/10 text-red-400'
                              }`}
                              title={u.role === 'child' && childLockMap[u.user_id] ? 'Parent-locked (suspend to override)' : 'Suspend'}
                            >
                              {actionLoading === u.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                            </button>
                          )}
                          <div className="relative group">
                            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-all">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            <div className="absolute right-0 top-full mt-1 min-w-[160px] bg-card border border-border rounded-xl p-1.5 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                              {u.role !== 'admin' && (
                                <button
                                  onClick={() => openMakeAdminModal(u.user_id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-all"
                                >
                                  <Shield className="w-4 h-4 text-purple-500" />
                                  <span>Make Admin</span>
                                </button>
                              )}
                              {u.role !== 'parent' && u.role !== 'admin' && (
                                <button
                                  onClick={() => handleSetRole(u.user_id, 'parent')}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-amber-500/10 hover:text-amber-500 transition-all"
                                >
                                  <Crown className="w-4 h-4 text-amber-500" />
                                  <span>Make Parent</span>
                                </button>
                              )}
                            <button
                              onClick={() => navigate(`/admin/user/${u.user_id}`)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-all"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View Details</span>
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(u.user_id)
                                toast.success('User ID copied')
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
                            >
                              <Users className="w-4 h-4" />
                              <span>Copy User ID</span>
                            </button>
                            {u.user_id !== user?.id && u.role !== 'admin' && (
                              <button
                                onClick={() => handleSoftDelete(u.user_id)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Soft Delete</span>
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
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        )}

        {/* Deleted Users */}
        {deletedUsers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              Soft Deleted Users ({deletedUsers.length})
            </h3>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="divide-y divide-border">
                {deletedUsers.map(u => (
                  <div key={u.user_id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-sm font-bold text-red-400">
                        {(u.full_name || u.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{u.full_name || u.username || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{u.email} • {u._role}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestoreUser(u.user_id)}
                        disabled={actionLoading === u.user_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 text-xs font-bold hover:bg-green-500/20 transition-all disabled:opacity-50"
                      >
                        {actionLoading === u.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        Restore
                      </button>
                      {u._role !== 'admin' && (
                        <button
                          onClick={() => handlePermanentDelete(u.user_id)}
                          disabled={actionLoading === u.user_id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
                        >
                          {actionLoading === u.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Delete Forever
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div key={modalKey} className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Create User</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-5">
              {formReady ? (<>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="email@example.com"
                    className="auth-input pl-11"
                    required
                    autoComplete="off"
                    readOnly={!formUnlocked}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="auth-input pl-11 pr-12"
                    minLength={6}
                    required
                    autoComplete="new-password"
                    readOnly={!formUnlocked}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                    placeholder="Name"
                    className="auth-input pl-11"
                    autoComplete="off"
                    required
                    readOnly={!formUnlocked}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Role</label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="auth-input pl-11 appearance-none bg-white dark:bg-black"
                    style={{ backgroundImage: 'none' }}
                  >
                    <option value="user">User</option>
                    <option value="parent">Parent</option>
                    <option value="child">Child</option>
                  </select>
                </div>
              </div>
              </>) : (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40 mx-auto" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-ghost flex-1 h-11 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1 h-11 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Make Admin Modal */}
      {showMakeAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowMakeAdminModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Promote to Admin</h2>
                <p className="text-xs text-muted-foreground">This action is irreversible</p>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 mb-5">
              <p className="text-sm text-red-400 font-semibold mb-1">⚠ Irreversible Action</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Once promoted to admin, this user cannot be demoted back to a normal role. 
                Admins cannot be suspended, soft deleted, or permanently deleted. 
                They will have full platform control permanently.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Your Password *</label>
                <input
                  type="password"
                  value={makeAdminPassword}
                  onChange={(e) => setMakeAdminPassword(e.target.value)}
                  placeholder="Enter your password to confirm"
                  className="auth-input"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Type CONFIRM *</label>
                <input
                  type="text"
                  value={makeAdminConfirm}
                  onChange={(e) => setMakeAdminConfirm(e.target.value)}
                  placeholder='Type "CONFIRM" to acknowledge'
                  className="auth-input"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-5">
              <button
                onClick={() => setShowMakeAdminModal(false)}
                className="btn-ghost flex-1 h-11 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMakeAdmin}
                disabled={actionLoading === makeAdminTargetId}
                className="btn-primary flex-1 h-11 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 bg-red-500 hover:bg-red-600 text-white"
              >
                {actionLoading === makeAdminTargetId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {actionLoading === makeAdminTargetId ? 'Processing...' : 'Make Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
