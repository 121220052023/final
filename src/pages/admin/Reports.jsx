import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Eye, Heart, MessageSquare, Clock, TrendingUp, Activity, Star, Loader2, FileText, FileSpreadsheet } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

const Reports = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const { data: users, error: usersError } = await supabase.rpc('get_all_users')
      if (usersError) throw usersError

      const totalWatchCount = (users || []).reduce((sum, u) => sum + (u.watch_history_count || 0), 0)
      const totalLikedCount = (users || []).reduce((sum, u) => sum + (u.liked_count || 0), 0)
      const totalReviewCount = (users || []).reduce((sum, u) => sum + (u.review_count || 0), 0)
      const totalWatchTime = (users || []).reduce((sum, u) => sum + (u.total_watch_time || 0), 0)

      setStats({
        totalUsers: (users || []).length,
        totalWatchHistory: totalWatchCount,
        totalReviews: totalReviewCount,
        totalLikedMovies: totalLikedCount,
        totalWatchTime,
        avgWatchTimePerUser: (users || []).length ? Math.round(totalWatchTime / (users || []).length) : 0,
        avgReviewsPerUser: (users || []).length ? (totalReviewCount / (users || []).length).toFixed(1) : 0,
        usersData: users || [],
      })
    } catch (err) {
      console.error('Error loading stats:', err)
      toast.error('Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (!stats?.usersData?.length) { toast.error('No data to export'); return }
    const headers = ['Username', 'Email', 'Role', 'Joined', 'Watch History', 'Liked', 'Reviews', 'Watch Time (mins)', 'Suspended']
    const rows = stats.usersData.map(u => [
      u.username || '', u.email || '', u.role || 'user',
      u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : '',
      u.watch_history_count || 0, u.liked_count || 0, u.review_count || 0,
      u.total_watch_time || 0, u.is_suspended ? 'Yes' : 'No',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `reports_${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const exportJSON = () => {
    if (!stats?.usersData?.length) { toast.error('No data to export'); return }
    const data = JSON.stringify(stats.usersData, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `reports_${new Date().toISOString().split('T')[0]}.json`
    a.click(); URL.revokeObjectURL(url)
    toast.success('JSON exported')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Watch History Entries', value: stats?.totalWatchHistory || 0, icon: Eye, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Reviews', value: stats?.totalReviews || 0, icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Liked Movies', value: stats?.totalLikedMovies || 0, icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { label: 'Total Watch Time', value: `${Math.round((stats?.totalWatchTime || 0) / 60)}h`, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Avg Watch Time/User', value: `${Math.round((stats?.avgWatchTimePerUser || 0) / 60)}h`, icon: Activity, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: 'Avg Reviews/User', value: stats?.avgReviewsPerUser || 0, icon: Star, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Engagement Rate', value: stats?.totalUsers ? `${((stats.totalWatchHistory / stats.totalUsers) * 100).toFixed(0)}%` : '0%', icon: TrendingUp, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ]

  return (
    <div className="min-h-screen bg-background pt-28 pb-16">
      <div className="page-shell-wide">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between gap-6">
          <div>
            <div className="section-label">Administration</div>
            <h1 className="display-font mt-3 text-5xl font-bold leading-[0.92] md:text-6xl">
              Reports & Analytics
            </h1>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              Platform-wide metrics and user engagement data
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} disabled={exportLoading} className="btn-ghost h-11 px-4 rounded-xl font-bold flex items-center gap-2">
              <FileText className="w-4 h-4" /> CSV
            </button>
            <button onClick={exportJSON} disabled={exportLoading} className="btn-ghost h-11 px-4 rounded-xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> JSON
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((item, i) => (
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-card rounded-2xl border border-border p-6"
        >
          <h2 className="text-lg font-bold text-foreground mb-2">Data Summary</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Platform has <strong className="text-foreground">{stats?.totalUsers}</strong> registered users
            with <strong className="text-foreground">{stats?.totalWatchHistory}</strong> watch history entries,
            <strong className="text-foreground"> {stats?.totalReviews}</strong> reviews, and
            <strong className="text-foreground"> {stats?.totalLikedMovies}</strong> liked movies.
            Total watch time across all users is <strong className="text-foreground">{Math.round((stats?.totalWatchTime || 0) / 60)} hours</strong>.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default Reports
