import { motion } from 'framer-motion'
import { Moon, Clock } from 'lucide-react'

const BedtimeScreen = ({ bedtimeEnd }) => {
  const formatTime = (time) => {
    if (!time) return 'morning'
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 || 12
    return `${displayH}:${minutes} ${ampm}`
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black flex items-center justify-center p-4"
    >
      <div className="text-center max-w-md">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-8"
        >
          <Moon className="w-24 h-24 text-purple-300 mx-auto mb-4" />
        </motion.div>

        <h1 className="text-4xl font-black text-white mb-4">Bedtime</h1>
        <p className="text-lg text-purple-200/80 mb-8">
          It&apos;s time to rest! Content viewing is not allowed during bedtime hours.
        </p>

        <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-2xl">
          <Clock className="w-5 h-5 text-purple-300" />
          <p className="text-purple-200">
            Viewing resumes at <span className="font-bold text-white">{formatTime(bedtimeEnd)}</span>
          </p>
        </div>

        <p className="text-sm text-purple-300/50 mt-8">
          Sweet dreams! See you tomorrow for more movies.
        </p>
      </div>
    </motion.div>
  )
}

export default BedtimeScreen
