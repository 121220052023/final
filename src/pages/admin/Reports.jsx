import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Eye, Heart, MessageSquare, Clock, TrendingUp, Activity, Star, Loader2, FileText, FileSpreadsheet } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import AdminSidebar from '../../components/AdminSidebar'

const Reports = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

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
      <div className="admin-body flex items-center justify-center">
        <AdminSidebar />
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users },
    { label: 'Watch History', value: stats?.totalWatchHistory || 0, icon: Eye },
    { label: 'Total Reviews', value: stats?.totalReviews || 0, icon: MessageSquare },
    { label: 'Liked Movies', value: stats?.totalLikedMovies || 0, icon: Heart },
    { label: 'Total Watch Time', value: `${Math.round((stats?.totalWatchTime || 0) / 60)}h`, icon: Clock },
    { label: 'Avg Watch/User', value: `${Math.round((stats?.avgWatchTimePerUser || 0) / 60)}h`, icon: Activity },
    { label: 'Avg Reviews/User', value: stats?.avgReviewsPerUser || 0, icon: Star },
    { label: 'Engagement Rate', value: stats?.totalUsers ? `${((stats.totalWatchHistory / stats.totalUsers) * 100).toFixed(0)}%` : '0%', icon: TrendingUp },
  ]

  return (
    <div className="admin-body">
      <AdminSidebar />
      <div className="admin-main">
        <div className="max-w-[1400px]">
          <div className="flex items-start justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="admin-glow-line" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Administration</span>
              </div>
              <h1 className="text-4xl font-extrabold text-foreground md:text-5xl">
                Reports & Analytics
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Platform-wide metrics and user engagement data
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="admin-btn-secondary h-10">
                <FileText className="w-4 h-4" /> CSV
              </button>
              <button onClick={exportJSON} className="admin-btn-secondary h-10">
                <FileSpreadsheet className="w-4 h-4" /> JSON
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {cards.map((item, i) => (
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

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="admin-card p-6"
          >
            <h2 className="text-base font-bold text-foreground mb-2">Data Summary</h2>
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
    </div>
  )
}

export default Reports