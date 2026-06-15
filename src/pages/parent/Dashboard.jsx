import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Shield, Users, Clock, AlertTriangle, TrendingUp, Settings, Activity, Bell, Loader2, User, ChevronRight, Shield as ShieldIcon, Lock, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useParentalControls } from '../../context/ParentalControlContext'
import { parentalService } from '../../services/parentalService'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import InvitationManager from '../../components/InvitationManager'

const ParentDashboard = () => {
  const { user } = useAuth()
  const { familyGroup, familyMembers, parentalSettings } = useParentalControls()
  const [creating, setCreating] = useState(false)
  const [pendingRequests, setPendingRequests] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [childProfiles, setChildProfiles] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const childIds = familyMembers?.filter(m => m.role === 'child').map(c => c.user_id) || []
        const [requests, activity] = await Promise.all([
          parentalService.getWatchRequests(familyGroup?.id, 'pending'),
          parentalService.getActivityLogs(familyGroup?.id),
        ])
        setPendingRequests(requests)
        setRecentActivity(activity)

        if (childIds.length > 0) {
          const { data: profiles } = await supabase
            .from('child_profiles')
            .select('user_id, account_locked')
            .in('user_id', childIds)
          if (profiles) {
            const map = {}
            profiles.forEach(p => { map[p.user_id] = p })
            setChildProfiles(map)
          }
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error?.message || error)
        if (error?.details) console.error('Details:', error.details)
        if (error?.hint) console.error('Hint:', error.hint)
        if (error?.code) console.error('Code:', error.code)
      } finally {
        setLoading(false)
      }
    }
    if (familyGroup) loadData(); else setLoading(false)
  }, [familyGroup])

  const children = familyMembers?.filter(m => m.role === 'child') || []
  const totalWatchTime = children.reduce((sum) => sum + (0), 0)

  const watchTimeData = [
    { day: 'Mon', minutes: 45 },
    { day: 'Tue', minutes: 60 },
    { day: 'Wed', minutes: 30 },
    { day: 'Thu', minutes: 90 },
    { day: 'Fri', minutes: 75 },
    { day: 'Sat', minutes: 120 },
    { day: 'Sun', minutes: 50 },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-foreground">Parent Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your family&apos;s viewing experience</p>
          </div>
          <div className="flex gap-2">
            <Link to="/parent/settings" className="flex items-center gap-2 px-4 py-2 bg-card rounded-xl hover:bg-muted transition-all text-sm font-medium text-foreground">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <Link to="/parent/requests" className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all text-sm font-medium relative">
              <Bell className="w-4 h-4" />
              Requests
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </Link>
          </div>
        </div>

        {!familyGroup ? (
          <div className="bg-card rounded-2xl p-12 text-center">
            <Shield className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Family Group Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create a family group to manage your children&apos;s viewing experience, set content filters, and review watch requests.
            </p>
            <button
              onClick={async () => {
                setCreating(true)
                try {
                  const { data: group, error: groupError } = await supabase
                    .from('family_groups')
                    .insert({ name: 'My Family', created_by: user.id })
                    .select().single()
                  if (groupError) throw groupError

                  const { error: memberError } = await supabase
                    .from('family_members')
                    .insert({ family_group_id: group.id, user_id: user.id, role: 'parent' })
                  if (memberError) throw memberError

                  toast.success('Family group created!')
                  window.location.reload()
                } catch (err) {
                  toast.error(err.message || 'Failed to create family group')
                } finally {
                  setCreating(false)
                }
              }}
              disabled={creating}
              className="mx-auto flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
              {creating ? 'Creating...' : 'Create Family Group'}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl">
                    <Users className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground">{children.length}</h3>
                <p className="text-muted-foreground text-sm">Children in Family</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl">
                    <Clock className="w-6 h-6 text-blue-500" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground">{Math.round(totalWatchTime / 60)}h</h3>
                <p className="text-muted-foreground text-sm">Watch Time Today</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-amber-500/10 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground">{pendingRequests.length}</h3>
                <p className="text-muted-foreground text-sm">Pending Requests</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground">{parentalSettings?.max_rating || 'PG-13'}</h3>
                <p className="text-muted-foreground text-sm">Max Rating</p>
              </motion.div>
            </div>

            {children.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  Your Children
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {children.map((child) => {
                    const profile = child.profiles
                    const cp = childProfiles[child.user_id]
                    const isLocked = cp?.account_locked === true
                    return (
                      <Link
                        key={child.user_id}
                        to={`/parent/child/${child.user_id}`}
                        className="bg-card rounded-2xl p-5 border border-border/60 hover:border-primary/40 hover:bg-muted/30 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {profile?.username || profile?.full_name || 'Child'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {profile?.email || 'No email'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                          {isLocked ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
                              <Lock className="w-3.5 h-3.5" />
                              Locked
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-500">
                              <Unlock className="w-3.5 h-3.5" />
                              Active
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-2xl p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  Weekly Watch Time
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={watchTimeData}>
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="minutes" fill="hsl(270, 70%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card rounded-2xl p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {recentActivity.length > 0 ? recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-sm text-center py-8">No recent activity</p>
                  )}
                </div>
              </div>
            </div>

            {pendingRequests.length > 0 && (
              <div className="bg-card rounded-2xl p-6 mt-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Pending Watch Requests
                </h3>
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                      {request.movie_poster && (
                        <img src={request.movie_poster} alt={request.movie_title} className="w-12 h-16 object-cover rounded-lg" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{request.movie_title}</p>
                        <p className="text-xs text-muted-foreground">{request.movie_year} • {request.movie_genre}</p>
                      </div>
                      <Link
                        to={`/parent/requests`}
                        className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-all"
                      >
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {familyGroup && (
          <div className="bg-card rounded-2xl p-6 mt-6">
            <InvitationManager />
          </div>
        )}
      </div>
    </div>
  )
}

export default ParentDashboard