import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, CheckCircle } from 'lucide-react'
import { useParentalControls } from '../context/ParentalControlContext'
import { parentalService } from '../services/parentalService'

const WatchRequestButton = ({ movie }) => {
  const { familyGroup, requiresApproval } = useParentalControls()
  const [requesting, setRequesting] = useState(false)
  const [requested, setRequested] = useState(false)

  if (!requiresApproval()) return null

  const handleRequest = async () => {
    if (!familyGroup || requesting || requested) return
    setRequesting(true)
    try {
      await parentalService.createWatchRequest(movie, familyGroup.id)
      setRequested(true)
    } catch (error) {
      console.error('Error creating watch request:', error)
    } finally {
      setRequesting(false)
    }
  }

  if (requested) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-4 py-3 bg-primary/10 -500/20 rounded-xl text-primary text-sm font-medium"
      >
        <CheckCircle className="w-5 h-5" />
        Request Sent to Parent
      </motion.div>
    )
  }

  return (
    <motion.button
      onClick={handleRequest}
      disabled={requesting}
      className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 -500/20 rounded-xl text-amber-500 text-sm font-medium hover:bg-amber-500/20 transition-all disabled:opacity-50"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Clock className="w-5 h-5" />
      {requesting ? 'Sending...' : 'Request to Watch'}
    </motion.button>
  )
}

export default WatchRequestButton
