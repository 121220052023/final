import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, Clock, Film, Eye } from 'lucide-react'
import { useParentalControls } from '../../context/ParentalControlContext'
import { parentalService } from '../../services/parentalService'

const ParentActivity = () => {
  const { familyGroup, familyMembers } = useParentalControls()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const loadLogs = async () => {
      if (!familyGroup) return
      try {
        const data = await parentalService.getActivityLogs(familyGroup.id, 100)
        setLogs(data)
      } catch (error) {
        console.error('Error loading activity:', error)
      } finally {
        setLoading(false)
      }
    }
    loadLogs()
  }, [familyGroup])

  const children = familyMembers?.filter(m => m.role === 'child') || []
  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.user_id === filter)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 -500 -transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
            <Activity className="w-8 h-8 text-purple-500" />
            Activity Log
          </h1>
          <p className="text-muted-foreground mt-1">Monitor your children&apos;s viewing activity</p>
        </div>

        {children.length > 1 && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === 'all' ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground'}`}
            >
              All
            </button>
            {children.map(child => (
              <button
                key={child.user_id}
                onClick={() => setFilter(child.user_id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === child.user_id ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground'}`}
              >
                {child.profiles?.username || 'Child'}
              </button>
            ))}
          </div>
        )}

        <div className="bg-card rounded-2xl overflow-hidden">
          {filteredLogs.length > 0 ? (
            <div className="divide-y divide-">
              {filteredLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Eye className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{log.action}</p>
                    {log.details && typeof log.details === 'object' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.details.title && `${log.details.title} • `}
                        {JSON.stringify(log.details).slice(0, 100)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.profiles?.username || 'Unknown'} • {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No activity recorded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ParentActivity
