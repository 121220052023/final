import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Film, Tv, BookOpen, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'

const typeIcons = { movie: Film, series: Tv, book: BookOpen }

export default function AdminRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  useEffect(() => { loadRequests() }, [])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('content_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      const profilesMap = {}
      const userIds = [...new Set((data || []).map(r => r.user_id).filter(Boolean))]
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
        if (profiles) profiles.forEach(p => { profilesMap[p.id] = p })
      }
      setRequests((data || []).map(r => ({ ...r, profiles: profilesMap[r.user_id] || null })))
    } catch (err) {
      if (!err.message?.includes('relation') && !err.message?.includes('does not exist')) {
        toast.error('Failed to load requests')
      }
      setRequests([])
    } finally { setLoading(false) }
  }

  const handleApprove = async (req) => {
    setProcessing(req.id)
    try {
      const { error } = await supabase.from('content_requests').update({
        status: 'approved', reviewed_at: new Date().toISOString(),
      }).eq('id', req.id)
      if (error) throw error
      toast.success(`Approved "${req.title}"`)
      loadRequests()
    } catch (err) {
      toast.error(err.message || 'Failed to approve')
    } finally { setProcessing(null) }
  }

  const handleDeny = async (req) => {
    if (!window.confirm(`Deny request for "${req.title}"?`)) { setProcessing(null); return }
    setProcessing(req.id)
    try {
      const { error } = await supabase.from('content_requests').update({
        status: 'denied', reviewed_at: new Date().toISOString(),
      }).eq('id', req.id)
      if (error) throw error
      toast.success('Request denied')
      loadRequests()
    } catch (err) {
      toast.error(err.message || 'Failed to deny')
    } finally { setProcessing(null) }
  }

  const pending = requests.filter(r => r.status === 'pending')
  const done = requests.filter(r => r.status !== 'pending')

  return (
    <div className="admin-body">
      <AdminSidebar />
      <div className="admin-main">
        <div className="max-w-[1200px]">
          <div className="flex items-start justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="admin-glow-line" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Administration</span>
              </div>
              <h1 className="text-4xl font-extrabold text-foreground md:text-5xl">Content Requests</h1>
              <p className="mt-2 text-sm text-muted-foreground">Review user-submitted content suggestions</p>
            </div>
          </div>

          {loading ? (
            <div className="admin-card p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground/20" /></div>
          ) : requests.length === 0 ? (
            <div className="admin-card p-12 text-center">
              <Clock className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No content requests yet</p>
            </div>
          ) : (
            <>
              {pending.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">Pending ({pending.length})</h2>
                  <div className="space-y-2">
                    {pending.map((req, i) => {
                      const Icon = typeIcons[req.content_type] || BookOpen
                      return (
                        <motion.div key={req.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                          className="rounded-xl p-4 bg-muted/30 border border-border"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0 mt-0.5">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-foreground">{req.title}</h3>
                              <p className="text-xs text-muted-foreground capitalize">{req.content_type} &middot; by {req.profiles?.full_name || req.profiles?.email || 'Unknown'}</p>
                              {req.description && <p className="text-xs text-muted-foreground mt-1">{req.description}</p>}
                              {req.reason && <p className="text-xs text-muted-foreground/60 mt-0.5 italic">"{req.reason}"</p>}
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button onClick={() => handleApprove(req)} disabled={processing === req.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all disabled:opacity-50">
                                {processing === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                Approve
                              </button>
                              <button onClick={() => handleDeny(req)} disabled={processing === req.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all disabled:opacity-50">
                                <XCircle className="w-3.5 h-3.5" />
                                Deny
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}

              {done.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">Reviewed ({done.length})</h2>
                  <div className="space-y-2">
                    {done.map(req => {
                      const Icon = typeIcons[req.content_type] || BookOpen
                      return (
                        <div key={req.id} className="rounded-xl p-3 bg-muted/30 border border-border opacity-60">
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground flex-1 truncate">{req.title}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${req.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                              {req.status}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
