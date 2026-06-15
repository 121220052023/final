import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Clock, MessageSquare } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useParentalControls } from '../../context/ParentalControlContext'
import { parentalService } from '../../services/parentalService'

const ParentRequests = () => {
  const { user } = useAuth()
  const { familyGroup } = useParentalControls()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState(null)
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const data = await parentalService.getWatchRequests(familyGroup.id, filter)
        setRequests(data)
      } catch (error) {
        console.error('Error loading requests:', error)
      } finally {
        setLoading(false)
      }
    }
    if (familyGroup?.id) loadRequests()
  }, [familyGroup?.id, filter])

  const handleReview = async (requestId, status) => {
    try {
      await parentalService.reviewWatchRequest(requestId, status, user.id, message)
      setRequests(prev => prev.filter(r => r.id !== requestId))
      setReviewingId(null)
      setMessage('')
    } catch (error) {
      console.error('Error reviewing request:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-foreground">Watch Requests</h1>
          <p className="text-muted-foreground mt-1">Review and manage your children&apos;s watch requests</p>
        </div>

        <div className="flex gap-2 mb-6">
          {['pending', 'approved', 'denied', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                filter === f ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {requests.length > 0 ? requests.map((request) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-6"
            >
              <div className="flex items-start gap-4">
                {request.movie_poster && (
                  <img src={request.movie_poster} alt={request.movie_title} className="w-16 h-24 object-cover rounded-xl" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground">{request.movie_title}</h3>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                    {request.movie_year && <span>{request.movie_year}</span>}
                    {request.movie_genre && <span>{request.movie_genre}</span>}
                    {request.movie_rating && <span className="px-2 py-0.5 bg-purple-500/10 text-purple-500 rounded">{request.movie_rating}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Requested {new Date(request.requested_at).toLocaleString()}
                  </p>

                  {request.status === 'pending' && reviewingId === request.id && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Add a message (optional)"
                          className="flex-1 p-2 bg-background rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReview(request.id, 'approved')}
                          className="flex items-center gap-2 px-4 py-2 btn-soul text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReview(request.id, 'denied')}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium"
                        >
                          <X className="w-4 h-4" />
                          Deny
                        </button>
                        <button
                          onClick={() => { setReviewingId(null); setMessage('') }}
                          className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {request.status === 'pending' && reviewingId !== request.id && (
                    <button
                      onClick={() => setReviewingId(request.id)}
                      className="mt-3 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-medium"
                    >
                      <Clock className="w-4 h-4" />
                      Review Request
                    </button>
                  )}

                  {request.status !== 'pending' && (
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        request.status === 'approved' ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {request.status === 'approved' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                      {request.parent_message && (
                        <p className="text-xs text-muted-foreground mt-1">Message: {request.parent_message}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="bg-card rounded-2xl p-12 text-center">
              <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No {filter} requests</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ParentRequests
