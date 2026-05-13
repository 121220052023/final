import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Clock, Ban, Send, CheckCircle2, AlertTriangle, ShieldOff } from 'lucide-react'
import { useParentalControls } from '../context/ParentalControlContext'
import { parentalService } from '../services/parentalService'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'

const RestrictedOverlay = ({ movie, reason }) => {
  const { user } = useAuth()
  const { familyGroup, requiresApproval } = useParentalControls()
  const [requesting, setRequesting] = useState(false)
  const [requested, setRequested] = useState(false)
  const [message, setMessage] = useState('')

  const handleRequest = async () => {
    if (!user || !familyGroup) return
    setRequesting(true)
    try {
      await parentalService.createWatchRequest({
        user_id: user.id,
        group_id: familyGroup.id,
        movie_id: movie.id || movie.imdbID,
        movie_title: movie.title || movie.Title,
        movie_poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : movie.Poster,
        movie_year: movie.release_date?.substring(0, 4) || movie.Year,
        movie_genre: movie.Genre || (movie.genres?.map(g => g.name).join(', ')),
        movie_rating: movie.Rated || 'Not Rated',
        status: 'pending',
        child_message: message
      })
      setRequested(true)
      toast.success('Request sent to your parents!')
    } catch (error) {
      console.error('Error creating request:', error)
      toast.error('Failed to send request')
    } finally {
      setRequesting(false)
    }
  }

  const getIcon = () => {
    switch (reason) {
      case 'rating': return <Lock className="w-12 h-12 text-purple-500" />
      case 'genre': return <Ban className="w-12 h-12 text-red-500" />
      case 'keyword': return <AlertTriangle className="w-12 h-12 text-amber-500" />
      case 'bedtime': return <Clock className="w-12 h-12 text-blue-500" />
      case 'limit': return <ShieldOff className="w-12 h-12 text-rose-500" />
      case 'approval': return <Lock className="w-12 h-12 text-indigo-500" />
      default: return <Lock className="w-12 h-12 text-primary" />
    }
  }

  const getTitle = () => {
    switch (reason) {
      case 'rating': return 'Age Restricted'
      case 'genre': return 'Genre Blocked'
      case 'keyword': return 'Content Filtered'
      case 'bedtime': return 'Bedtime Restriction'
      case 'limit': return 'Time Limit Reached'
      case 'approval': return 'Permission Required'
      default: return 'Content Restricted'
    }
  }

  const getDescription = () => {
    switch (reason) {
      case 'rating': return 'This content is rated higher than your allowed limit.'
      case 'genre': return 'This genre has been blocked by your parents.'
      case 'keyword': return 'This content contains keywords blocked by your parents.'
      case 'bedtime': return 'It is past your bedtime. Time to rest!'
      case 'limit': return 'You have used up your daily watch time.'
      case 'approval': return 'Your parents need to approve this content before you can watch it.'
      default: return 'This content is restricted by parental controls.'
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md rounded-[2.5rem] p-6 text-center">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-sm w-full space-y-6"
      >
        <div className="flex justify-center">{getIcon()}</div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-foreground">{getTitle()}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {getDescription()}
          </p>
        </div>

        {requiresApproval() && !['bedtime', 'limit'].includes(reason) && (
          <div className="mt-8 space-y-4">
            {requested ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-2 p-4 bg-primary/10 rounded-2xl border border-primary/20"
              >
                <CheckCircle2 className="w-6 h-6 text-primary" />
                <span className="text-sm font-bold text-primary">Request Pending Approval</span>
                <p className="text-xs text-muted-foreground">We'll notify you once your parents review it.</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask your parents nicely... (optional)"
                  className="w-full p-3 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none"
                />
                <button
                  onClick={handleRequest}
                  disabled={requesting}
                  className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {requesting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {requesting ? 'Sending...' : 'Request Permission'}
                </button>
              </div>
            )}
          </div>
        )}

        {['bedtime', 'limit'].includes(reason) && (
          <p className="text-xs font-bold text-primary uppercase tracking-widest mt-4">
            See you tomorrow!
          </p>
        )}
      </motion.div>
    </div>
  )
}

export default RestrictedOverlay
