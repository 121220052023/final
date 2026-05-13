import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Shield, Users, Clock, AlertTriangle, TrendingUp, Settings, Activity, Bell } from 'lucide-react'
import { useParentalControls } from '../../context/ParentalControlContext'
import { parentalService } from '../../services/parentalService'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const ParentDashboard = () => {
  const { familyGroup, familyMembers, parentalSettings, childProfile } = useParentalControls()
  const [pendingRequests, setPendingRequests] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [requests, activity] = await Promise.all([
          parentalService.getWatchRequests('pending'),
          parentalService.getActivityLogs(familyGroup?.id, 10),
        ])
        setPendingRequests(requests)
        setRecentActivity(activity)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (familyGroup) loadData()
  }, [familyGroup])

  const children = familyMembers.filter(m => m.role === 'child')
  const totalWatchTime = children.reduce((sum) => sum + (childProfile?.time_used_today || 0), 0)

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
        <div className="w-12 h-12 -500 -transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
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
                  labelStyle={{ color: 'hsl(var(--foreground))' }}                />
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
      </div>
    </div>
  )
}

export default ParentDashboard
